// Branch and tag handling functions

/**
 * Render repository with specific branch or tag
 */
async function renderRepositoryWithBranch(repoUrl, branchOrTag) {
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
        throw new Error('Invalid repository URL');
    }
    
    // Update the repo input to reflect current URL
    const repoInput = document.getElementById('repo-input');
    if (repoInput) {
        repoInput.value = repoUrl;
    }
    
    try {
        // Fetch repository data with specified branch
        repositoryData = await fetchRepositoryContentsWithBranch(repoInfo.owner, repoInfo.repo, branchOrTag);
        currentBranch = branchOrTag;
        
        // Fetch branches and tags for navigation
        await fetchBranchesAndTags(repoInfo.owner, repoInfo.repo);
        
        // Update UI
        updateRepositoryUI();
        generateFileTypeFilters();
        
        // Show advanced controls
        const advancedToggle = document.getElementById('advanced-controls-toggle');
        if (advancedToggle) {
            advancedToggle.style.display = 'block';
        }
        
        // Show results container
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.classList.add('show');
        }
        
        // Fetch latest commit info for the branch
        await fetchCommitInfo(repoInfo.owner, repoInfo.repo, branchOrTag);
        
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch repository contents with specific branch or tag
 */
async function fetchRepositoryContentsWithBranch(owner, repo, branchOrTag) {
    const loading = document.getElementById('loading');
    const renderBtn = document.getElementById('render-btn');
    
    loading.style.display = 'flex';
    renderBtn.disabled = true;
    
    try {
        const headers = getGitHubHeaders();
        
        // Fetch repository info
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (!repoResponse.ok) {
            if (repoResponse.status === 404) {
                throw new Error('Repository not found or is private');
            } else if (repoResponse.status === 403) {
                const resetTime = repoResponse.headers.get('X-RateLimit-Reset');
                const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'unknown';
                throw new Error(`API rate limit exceeded. Rate limit resets at ${resetDate}. Consider adding a GitHub token.`);
            } else if (repoResponse.status === 401) {
                throw new Error('Invalid GitHub token. Please check your token and try again.');
            } else {
                throw new Error(`Failed to fetch repository: ${repoResponse.status}`);
            }
        }
        const repoInfo = await repoResponse.json();
        
        // Use specified branch or fall back to default
        const targetBranch = branchOrTag || repoInfo.default_branch;
        
        // Fetch repository tree for the target branch
        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers });
        if (!treeResponse.ok) {
            if (treeResponse.status === 403) {
                const resetTime = treeResponse.headers.get('X-RateLimit-Reset');
                const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'unknown';
                throw new Error(`API rate limit exceeded while fetching repository tree. Rate limit resets at ${resetDate}. Consider adding a GitHub token.`);
            }
            throw new Error(`Failed to fetch repository contents for branch/tag: ${targetBranch}`);
        }
        const treeData = await treeResponse.json();
        
        // Process files as before
        const allFiles = [];
        const categorizedFiles = {
            rendered: [],
            binary: [],
            large: [],
            ignored: [],
            failed: []
        };
        
        for (const item of treeData.tree) {
            if (item.type === 'blob') {
                const category = categorizeFile(item.path, item.size || 0);
                
                const fileInfo = {
                    path: item.path,
                    size: item.size || 0,
                    sha: item.sha,
                    category: category
                };
                
                if (category.category !== 'ignored') {
                    allFiles.push(fileInfo);
                }
                
                if (category.include) {
                    categorizedFiles.rendered.push(fileInfo);
                } else {
                    const categoryKey = category.category === 'ignored' ? 'ignored' : 
                                      category.category === 'large' ? 'large' : 'binary';
                    categorizedFiles[categoryKey].push(fileInfo);
                }
            }
        }
        
        totalFilesToProcess = categorizedFiles.rendered.length;
        
        // Use the same file limit logic as the main function
        const maxFiles = getFileLimit();
        
        if (totalFilesToProcess > maxFiles) {
            categorizedFiles.rendered = sortFilesByStructure(categorizedFiles.rendered);
            const truncatedFiles = categorizedFiles.rendered.splice(maxFiles);
            if (!categorizedFiles.truncated) categorizedFiles.truncated = [];
            categorizedFiles.truncated.push(...truncatedFiles);
            totalFilesToProcess = categorizedFiles.rendered.length;
        }
        
        const filesList = categorizedFiles.rendered.map(fileInfo => ({
            path: fileInfo.path,
            size: fileInfo.size,
            sha: fileInfo.sha,
            content: null
        }));
        
        return {
            repoInfo: { ...repoInfo, currentBranch: targetBranch },
            files: filesList,
            categorizedFiles,
            allFiles,
            totalSize: categorizedFiles.rendered.reduce((sum, file) => sum + (file.size || 0), 0),
            treeStructure: await generateTreeStructure(treeData.tree)
        };
        
    } catch (error) {
        throw error;
    } finally {
        loading.style.display = 'none';
        renderBtn.disabled = false;
    }
}

/**
 * Fetch commit information for branch/tag
 */
async function fetchCommitInfo(owner, repo, branchOrTag) {
    try {
        const headers = getGitHubHeaders();
        const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branchOrTag}`, { headers });
        
        if (commitsResponse.ok) {
            const commitData = await commitsResponse.json();
            updateCommitInfo(commitData);
        } else {
            console.warn(`Failed to fetch commit info for ${branchOrTag}`);
        }
    } catch (error) {
        console.warn('Error fetching commit info:', error);
    }
}

/**
 * Update commit information display
 */
function updateCommitInfo(commitData) {
    const commitInfoElement = document.getElementById('commit-info');
    if (commitInfoElement && commitData) {
        const commitDate = new Date(commitData.commit.committer.date);
        const timeAgo = getTimeAgo(commitDate);
        
        commitInfoElement.innerHTML = `
            <div style="font-size: 0.9rem; color: var(--text-secondary); border-top: 1px solid var(--border-secondary); padding-top: 0.5rem; margin-top: 0.5rem;">
                <strong>Latest commit:</strong> 
                <a href="${commitData.html_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                    ${commitData.sha.substring(0, 7)}
                </a>
                by ${commitData.commit.author.name} ${timeAgo}
                <br>
                <em>"${commitData.commit.message.split('\n')[0]}"</em>
            </div>
        `;
    }
}

/**
 * Get human-readable time difference
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return `${diffSec} second${diffSec > 1 ? 's' : ''} ago`;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderRepositoryWithBranch,
        fetchRepositoryContentsWithBranch,
        fetchCommitInfo,
        updateCommitInfo,
        getTimeAgo
    };
}