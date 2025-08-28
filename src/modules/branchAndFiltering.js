// Branch/tag management and file type filtering functions

// Global variables for branch and filtering
let availableBranches = [];
let availableTags = [];
let currentBranch = 'main';
let fileTypeStats = {};
let activeFileTypeFilter = null;

/**
 * Fetch available branches and tags for repository
 */
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

/**
 * Populate branch/tag selector dropdown
 */
function populateBranchSelector() {
    const branchSelect = document.getElementById('branch-select');
    if (!branchSelect) return;
    
    branchSelect.innerHTML = '';
    
    // Add branches
    if (availableBranches.length > 0) {
        const branchGroup = document.createElement('optgroup');
        branchGroup.label = '📂 Branches';
        availableBranches.forEach(branch => {
            const option = document.createElement('option');
            option.value = `branch:${branch.name}`;
            option.textContent = `${branch.name}${branch.protected ? ' 🔒' : ''}`;
            option.selected = branch.name === currentBranch;
            branchGroup.appendChild(option);
        });
        branchSelect.appendChild(branchGroup);
    }
    
    // Add tags
    if (availableTags.length > 0) {
        const tagGroup = document.createElement('optgroup');
        tagGroup.label = '🏷️ Tags';
        availableTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = `tag:${tag.name}`;
            option.textContent = tag.name;
            tagGroup.appendChild(option);
        });
        branchSelect.appendChild(tagGroup);
    }
    
    // If no branches or tags found, show default branch
    if (availableBranches.length === 0 && availableTags.length === 0) {
        const option = document.createElement('option');
        option.value = `branch:${currentBranch}`;
        option.textContent = currentBranch;
        option.selected = true;
        branchSelect.appendChild(option);
    }
}

/**
 * Switch to selected branch or tag
 */
async function switchBranchOrTag() {
    const branchSelect = document.getElementById('branch-select');
    if (!branchSelect || !repositoryData) return;
    
    const selectedValue = branchSelect.value;
    if (!selectedValue) return;
    
    const [type, name] = selectedValue.split(':');
    
    try {
        // Show loading state
        const loading = document.getElementById('loading');
        loading.style.display = 'flex';
        
        // Build the repository URL
        const repoUrl = `https://github.com/${repositoryData.repoInfo.owner.login}/${repositoryData.repoInfo.name}`;
        
        // Render repository with new branch/tag
        await renderRepositoryWithBranch(repoUrl, name);
        
    } catch (error) {
        console.error('Error switching branch/tag:', error);
        alert(`Failed to switch to ${type} "${name}": ${error.message}`);
    }
}

/**
 * Generate file type filter badges
 */
function generateFileTypeFilters() {
    if (!repositoryData || !repositoryData.files) return;
    
    fileTypeStats = {};
    
    repositoryData.files.forEach(file => {
        const ext = getFileExtension(file.path);
        const type = ext || 'no-extension';
        fileTypeStats[type] = (fileTypeStats[type] || 0) + 1;
    });
    
    const fileTypeFilters = document.getElementById('file-type-filters');
    if (!fileTypeFilters) return;
    
    fileTypeFilters.innerHTML = '';
    
    // Sort by frequency
    const sortedTypes = Object.entries(fileTypeStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15); // Show top 15 file types
    
    sortedTypes.forEach(([type, count]) => {
        const badge = document.createElement('span');
        badge.className = 'file-type-badge';
        badge.dataset.fileType = type;
        badge.textContent = `${type === 'no-extension' ? '📄' : type} (${count})`;
        badge.onclick = () => toggleFileTypeFilter(type);
        fileTypeFilters.appendChild(badge);
    });
}

/**
 * Toggle file type filter
 */
function toggleFileTypeFilter(fileType) {
    if (activeFileTypeFilter === fileType) {
        // Clear filter
        clearFileTypeFilter();
    } else {
        // Apply filter
        activeFileTypeFilter = fileType;
        
        // Update badge styles
        document.querySelectorAll('.file-type-badge').forEach(badge => {
            if (badge.dataset.fileType === fileType) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        });
        
        // Filter files
        filterFilesByType(fileType);
    }
}

/**
 * Filter files by type
 */
function filterFilesByType(fileType) {
    const filteredFiles = repositoryData.files.filter(file => {
        const ext = getFileExtension(file.path);
        const type = ext || 'no-extension';
        return type === fileType;
    });
    
    displayFilteredFiles(filteredFiles, `${fileType === 'no-extension' ? 'Files without extension' : `${fileType.toUpperCase()} files`}`);
}

/**
 * Clear active file type filter
 */
function clearFileTypeFilter() {
    activeFileTypeFilter = null;
    
    // Remove active styles from badges
    document.querySelectorAll('.file-type-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    
    // Reset to show all files
    resetFileView();
}

/**
 * Clear all active file type filters
 */
function clearActiveFileTypeFilters() {
    if (activeFileTypeFilter) {
        clearFileTypeFilter();
    }
}

/**
 * Display filtered files
 */
function displayFilteredFiles(files, title) {
    const filesContainer = document.getElementById('files-container');
    if (!filesContainer) return;
    
    filesContainer.innerHTML = '';
    
    // Add filter header
    const filterHeader = document.createElement('div');
    filterHeader.className = 'filter-header';
    filterHeader.style.cssText = `
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    filterHeader.innerHTML = `
        <div>
            <h3 style="margin: 0; color: var(--text-primary);">
                🔍 ${title} (${files.length})
            </h3>
            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                Showing files matching the selected filter
            </p>
        </div>
        <button onclick="clearFileTypeFilter()" style="
            background: var(--accent-primary);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            font-size: 0.9rem;
        ">Clear Filter</button>
    `;
    
    filesContainer.appendChild(filterHeader);
    
    // Display filtered files
    files.forEach((file, index) => {
        const section = document.createElement('div');
        section.className = 'file-section';
        const fileId = file.path.replace(/[^a-zA-Z0-9-_]/g, '-');
        section.id = `file-${fileId}`;
        
        const header = document.createElement('div');
        header.className = 'file-header';
        header.innerHTML = `
            <h3>
                <span style="color: var(--text-muted);">${index + 1}.</span>
                ${file.path}
            </h3>
            <span class="file-size">
                ${formatBytes(file.size)} • 
                ${isJupyterNotebook(file.path) ? 'NOTEBOOK' : (getFileExtension(file.path).toUpperCase() || 'TXT')}
            </span>
        `;
        
        const content = document.createElement('div');
        content.className = 'file-content';
        
        if (file.content) {
            try {
                content.innerHTML = renderFileContent(file.content, file.path);
            } catch (error) {
                content.innerHTML = `<pre class="error">Error rendering file: ${error.message}</pre>`;
            }
        } else {
            content.innerHTML = `
                <div class="lazy-content" data-file-path="${file.path}" data-file-sha="${file.sha}">
                    <div class="loading">
                        <div class="spinner"></div>
                        Loading ${file.path}...
                    </div>
                </div>
            `;
            
            // Load content when section comes into view
            const observer = new IntersectionObserver(async (entries) => {
                entries.forEach(async (entry) => {
                    if (entry.isIntersecting) {
                        observer.unobserve(entry.target);
                        await loadFileContentLazy(entry.target, file);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(section);
        }
        
        section.appendChild(header);
        section.appendChild(content);
        filesContainer.appendChild(section);
    });
}

/**
 * Reset file view to show all files
 */
function resetFileView() {
    // Regenerate the enhanced file sections
    generateEnhancedFileSections();
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchBranchesAndTags,
        populateBranchSelector,
        switchBranchOrTag,
        generateFileTypeFilters,
        toggleFileTypeFilter,
        filterFilesByType,
        clearFileTypeFilter,
        clearActiveFileTypeFilters,
        displayFilteredFiles,
        resetFileView,
        availableBranches,
        availableTags,
        currentBranch,
        fileTypeStats,
        activeFileTypeFilter
    };
}