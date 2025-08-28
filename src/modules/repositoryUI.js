// Repository UI update functions

/**
 * Update repository information display
 */
function updateRepositoryUI() {
    if (!repositoryData) return;
    
    // Update repo info with enhanced statistics
    const repoInfoElement = document.getElementById('repo-info');
    const repoNameElement = document.getElementById('repo-name');
    const repoDescElement = document.getElementById('repo-description');
    
    if (repoNameElement && repositoryData.repoInfo) {
        repoNameElement.innerHTML = `
            <a href="${repositoryData.repoInfo.html_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                ${repositoryData.repoInfo.full_name}
            </a>
        `;
    }
    
    if (repoDescElement && repositoryData.repoInfo) {
        repoDescElement.textContent = repositoryData.repoInfo.description || 'No description available';
    }
    
    // Enhanced statistics
    const totalFiles = repositoryData.allFiles ? repositoryData.allFiles.length : 0;
    const renderedCount = repositoryData.files ? repositoryData.files.length : 0;
    const availableFiles = getAvailableFiles();
    const successfullyLoaded = availableFiles.length;
    const failedToLoad = renderedCount - successfullyLoaded;
    const skippedCount = totalFiles - renderedCount;
    
    const fileCountElement = document.getElementById('file-count');
    const totalSizeElement = document.getElementById('total-size');
    const mainLanguageElement = document.getElementById('main-language');
    
    if (fileCountElement) {
        fileCountElement.textContent = `${successfullyLoaded}/${renderedCount}/${totalFiles}`;
    }
    if (totalSizeElement) {
        totalSizeElement.textContent = formatBytes(repositoryData.totalSize || 0);
    }
    if (mainLanguageElement && repositoryData.repoInfo) {
        mainLanguageElement.textContent = repositoryData.repoInfo.language || 'Mixed';
    }
    
    // Add additional stats
    const statsContainer = document.querySelector('.repo-stats');
    if (statsContainer && repositoryData.repoInfo) {
        let statusText = `Files: <strong>${successfullyLoaded}/${renderedCount}/${totalFiles}</strong>`;
        if (failedToLoad > 0) {
            statusText += ` <span style="color: var(--text-muted);">(${failedToLoad} failed to load)</span>`;
        }
        
        statsContainer.innerHTML = `
            <span class="stat">${statusText}</span>
            <span class="stat">Size: <strong>${formatBytes(repositoryData.totalSize || 0)}</strong></span>
            <span class="stat">Language: <strong>${repositoryData.repoInfo.language || 'Mixed'}</strong></span>
            <span class="stat">Skipped: <strong>${skippedCount}</strong></span>
        `;
    }
    
    if (repoInfoElement) {
        repoInfoElement.style.display = 'block';
    }
    
    // Generate enhanced file tree with directory structure
    generateFileTree();
    
    // Generate file sections with improved navigation
    generateEnhancedFileSections();
    
    // Add directory tree view
    addDirectoryTreeView();
    
    // Add skipped files summary
    addSkippedFilesSummary();
    
    // Generate CXML for LLM view
    if (repositoryData && repositoryData.files) {
        // Generate CXML asynchronously and update when ready
        generateCXML(repositoryData.files).then(cxml => {
            const llmTextarea = document.getElementById('llm-textarea');
            if (llmTextarea) {
                llmTextarea.value = cxml;
            }
        }).catch(error => {
            console.error('Error generating CXML:', error);
            const llmTextarea = document.getElementById('llm-textarea');
            if (llmTextarea) {
                llmTextarea.value = 'Error generating LLM format: ' + error.message;
            }
        });
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateRepositoryUI
    };
}