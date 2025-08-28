// GitHub API functionality

function getGitHubHeaders() {
    const tokenInput = document.getElementById('github-token');
    const token = tokenInput ? tokenInput.value.trim() : '';
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitRender-WebApp'
    };
    
    if (token) {
        // Validate token format (GitHub tokens are usually 40 characters)
        if (token.length < 20) {
            console.warn('GitHub token seems too short, please verify it\'s correct');
        }
        headers['Authorization'] = `token ${token}`;
    }
    
    return headers;
}

async function checkRateLimit() {
    try {
        const headers = getGitHubHeaders();
        const response = await fetch('https://api.github.com/rate_limit', { headers });
        
        if (response.ok) {
            const rateLimit = await response.json();
            const remaining = rateLimit.rate.remaining;
            const resetTime = new Date(rateLimit.rate.reset * 1000);
            
            console.log(`GitHub API: ${remaining} requests remaining, resets at ${resetTime.toLocaleTimeString()}`);
            
            if (remaining < 10) {
                const tokenInput = document.getElementById('github-token');
                const token = tokenInput ? tokenInput.value.trim() : '';
                if (!token) {
                    alert(`Warning: Only ${remaining} API requests remaining. Consider adding a GitHub token to avoid rate limits.`);
                }
            }
            
            return rateLimit;
        }
    } catch (error) {
        console.warn('Could not check rate limit:', error);
    }
    return null;
}

function parseRepoUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) return null;
    
    const owner = match[1];
    let repo = match[2];
    
    // Remove .git suffix if present
    if (repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
    }
    
    return { owner, repo };
}

async function fetchSingleFileContent(fileInfo) {
    const repoInfo = repositoryData.repoInfo;
    const owner = repoInfo.owner.login;
    const repo = repoInfo.name;
    const headers = getGitHubHeaders();
    
    const methods = [
        // Method 1: Raw GitHub content (no rate limit for public repos)
        {
            name: 'raw',
            fetch: () => fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${repoInfo.default_branch}/${fileInfo.path}`)
        },
        // Method 2: Git Blob API (more efficient than Contents API)
        {
            name: 'blob',
            fetch: () => fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileInfo.sha}`, { headers })
        },
        // Method 3: Contents API (fallback)
        {
            name: 'contents',
            fetch: () => fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileInfo.path}`, { headers })
        }
    ];

    for (const method of methods) {
        try {
            const response = await method.fetch();
            
            if (response.ok) {
                let content;
                
                if (method.name === 'raw') {
                    content = await response.text();
                } else if (method.name === 'blob') {
                    const data = await response.json();
                    content = data.encoding === 'base64' ? atob(data.content) : data.content;
                } else { // contents
                    const data = await response.json();
                    content = atob(data.content);
                }
                
                console.log(`✅ Fetched ${fileInfo.path} using ${method.name} method`);
                return content;
            }
        } catch (error) {
            console.warn(`Failed to fetch ${fileInfo.path} using ${method.name}:`, error.message);
            continue;
        }
    }
    
    throw new Error(`All methods failed for ${fileInfo.path}`);
}

async function fetchBranchesAndTags(owner, repo) {
    const headers = getGitHubHeaders();
    
    try {
        // Fetch branches
        const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers });
        if (branchesResponse.ok) {
            const branches = await branchesResponse.json();
            availableBranches = branches.map(branch => ({
                name: branch.name,
                type: 'branch',
                sha: branch.commit.sha,
                protected: branch.protected || false
            }));
        }
        
        // Fetch tags
        const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, { headers });
        if (tagsResponse.ok) {
            const tags = await tagsResponse.json();
            availableTags = tags.slice(0, 20).map(tag => ({ // Limit to 20 most recent tags
                name: tag.name,
                type: 'tag',
                sha: tag.commit.sha
            }));
        }
        
        populateBranchSelector();
        
    } catch (error) {
        console.warn('Failed to fetch branches/tags:', error);
    }
}

async function fetchCommitInfo(owner, repo, branchOrTag) {
    try {
        const headers = getGitHubHeaders();
        const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branchOrTag}`, { headers });
        
        if (commitsResponse.ok) {
            const commitData = await commitsResponse.json();
            updateCommitInfo(commitData);
        }
    } catch (error) {
        console.warn('Failed to fetch commit info:', error);
    }
}

// Add other API-related helper functions that need to be extracted
function handleApiError(error, context = '') {
    let userMessage = 'An unexpected error occurred.';
    
    if (error.message.includes('rate limit')) {
        userMessage = 'GitHub API rate limit exceeded. Please add a GitHub token or try again later.';
    } else if (error.message.includes('404')) {
        userMessage = 'Repository not found. Please check the URL and make sure the repository is public.';
    } else if (error.message.includes('403')) {
        userMessage = 'Access denied. The repository might be private or you need a valid GitHub token.';
    } else if (error.message.includes('401')) {
        userMessage = 'Unauthorized. Please check your GitHub token.';
    } else if (error.message.includes('network')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
    }
    
    console.error(`API Error ${context}:`, error);
    return userMessage;
}