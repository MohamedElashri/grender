// Advanced controls and branch/tag management

// Global branch state - moved to config.js

// Toggle advanced controls visibility
function toggleAdvancedControls() {
    const branchControls = document.getElementById('branch-controls');
    const searchControls = document.getElementById('search-controls');
    const toggleBtn = document.getElementById('toggle-advanced-btn');
    
    if (!branchControls || !searchControls || !toggleBtn) return;
    
    const isVisible = branchControls.classList.contains('show');
    
    if (isVisible) {
        branchControls.classList.remove('show');
        searchControls.classList.remove('show');
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = '⚙️ Advanced Controls';
    } else {
        branchControls.classList.add('show');
        searchControls.classList.add('show');
        toggleBtn.classList.add('active');
        toggleBtn.textContent = '⚙️ Hide Advanced Controls';
    }
}

// Switch branch or tag
async function switchBranchOrTag() {
    const branchSelect = document.getElementById('branch-select');
    if (!branchSelect || !repositoryData) return;
    
    const selectedValue = branchSelect.value;
    if (!selectedValue) return;
    
    const [type, name] = selectedValue.split(':');
    
    if (name === currentBranch) return; // No change needed
    
    try {
        // Update current branch
        currentBranch = name;
        
        // Clear current data
        clearSearchResults();
        resetFileView();
        
        // Show loading
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
        
        // Re-fetch repository with new branch/tag
        const repoUrl = `https://github.com/${repositoryData.repoInfo.owner.login}/${repositoryData.repoInfo.name}`;
        await renderRepositoryWithBranch(repoUrl, name);
        
    } catch (error) {
        console.error('Failed to switch branch/tag:', error);
        alert(`Failed to switch to ${type} "${name}": ${error.message}`);
        
        // Revert selection
        const currentOption = branchSelect.querySelector(`option[value="branch:${currentBranch}"]`);
        if (currentOption) {
            currentOption.selected = true;
        }
    }
}

// Populate branch selector
function populateBranchSelector() {
    const branchSelect = document.getElementById('branch-select');
    if (!branchSelect) return;
    
    branchSelect.innerHTML = '';
    
    // Add default branch first
    if (repositoryData && repositoryData.repoInfo && repositoryData.repoInfo.default_branch) {
        const defaultOption = document.createElement('option');
        defaultOption.value = `branch:${repositoryData.repoInfo.default_branch}`;
        defaultOption.textContent = `${repositoryData.repoInfo.default_branch} (default)`;
        defaultOption.selected = currentBranch === repositoryData.repoInfo.default_branch || !currentBranch;
        branchSelect.appendChild(defaultOption);
    }
    
    // Add other branches
    availableBranches.forEach(branch => {
        if (repositoryData && repositoryData.repoInfo && branch.name !== repositoryData.repoInfo.default_branch) {
            const option = document.createElement('option');
            option.value = `branch:${branch.name}`;
            option.textContent = branch.name;
            if (currentBranch === branch.name) {
                option.selected = true;
            }
            branchSelect.appendChild(option);
        }
    });
    
    // Add separator if we have tags
    if (availableTags.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '--- Tags ---';
        branchSelect.appendChild(separator);
        
        // Add tags
        availableTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = `tag:${tag.name}`;
            option.textContent = `${tag.name} (tag)`;
            if (currentBranch === tag.name) {
                option.selected = true;
            }
            branchSelect.appendChild(option);
        });
    }
}

// Render repository with specific branch/tag
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

// Fetch repository contents with specific branch
async function fetchRepositoryContentsWithBranch(owner, repo, branchOrTag) {
    const loading = document.getElementById('loading');
    const renderBtn = document.getElementById('render-btn');
    
    if (loading) loading.style.display = 'flex';
    if (renderBtn) renderBtn.disabled = true;
    
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
            treeStructure: await generateTreeStructure(treeData.tree),
            treeStructureObject: await generateTreeStructureObject(treeData.tree)
        };
        
    } catch (error) {
        throw error;
    } finally {
        if (loading) loading.style.display = 'none';
        if (renderBtn) renderBtn.disabled = false;
    }
}

// Update commit information display
function updateCommitInfo(commitData) {
    const commitLink = document.getElementById('commit-link');
    const commitMessage = document.getElementById('commit-message');
    
    if (commitLink && commitData) {
        const shortSha = commitData.sha.substring(0, 7);
        commitLink.href = commitData.html_url;
        commitLink.textContent = shortSha;
        commitLink.title = commitData.sha;
    }
    
    if (commitMessage && commitData && commitData.commit) {
        const message = commitData.commit.message.split('\n')[0]; // First line only
        commitMessage.textContent = truncateText(message, 60);
        commitMessage.title = commitData.commit.message; // Full message in tooltip
    }
}

// Generate file type filters
function generateFileTypeFilters() {
    const container = document.getElementById('file-type-filters');
    if (!container || !repositoryData || !repositoryData.files) return;
    
    // Count file types
    const fileTypes = {};
    repositoryData.files.forEach(file => {
        const ext = getFileExtension(file.path);
        const displayExt = ext || 'no-ext';
        fileTypes[displayExt] = (fileTypes[displayExt] || 0) + 1;
    });
    
    // Generate filter badges
    container.innerHTML = '';
    Object.entries(fileTypes)
        .sort(([,a], [,b]) => b - a) // Sort by count
        .slice(0, 10) // Limit to top 10
        .forEach(([ext, count]) => {
            const badge = document.createElement('span');
            badge.className = 'file-type-badge';
            badge.textContent = `${ext} (${count})`;
            badge.onclick = () => toggleFileTypeFilter(ext);
            container.appendChild(badge);
        });
}

// Toggle file type filter - placeholder
function toggleFileTypeFilter(ext) {
    console.log('Toggling filter for:', ext);
}