// File sections generation with lazy loading and pagination

/**
 * Generate paginated file sections with enhanced features
 */
function generateEnhancedFileSections() {
    const filesContainer = document.getElementById('files-container');
    if (!filesContainer) return;
    
    filesContainer.innerHTML = '';
    
    if (!repositoryData || !repositoryData.files) return;
    
    // Use helper function to get available files and sort them by structure
    const availableFiles = getAvailableFiles();
    const sortedFiles = sortFilesByStructure([...availableFiles]);
    
    // Calculate pagination based on sorted files
    const totalFiles = sortedFiles.length;
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = Math.min(startIndex + filesPerPage, totalFiles);
    const filesToShow = sortedFiles.slice(startIndex, endIndex);
    
    filesToShow.forEach((file, index) => {
        const globalIndex = startIndex + index; // Global index across all files
        const section = document.createElement('div');
        section.className = 'file-section';
        const fileId = file.path.replace(/[^a-zA-Z0-9-_]/g, '-');
        section.id = `file-${fileId}`;
        
        const header = document.createElement('div');
        header.className = 'file-header';
        header.innerHTML = `
            <h3>
                <span style="color: var(--text-muted);">${globalIndex + 1}.</span>
                ${file.path}
            </h3>
            <span class="file-size">
                ${formatBytes(file.size)} • 
                ${isJupyterNotebook(file.path) ? 'NOTEBOOK' : (getFileExtension(file.path).toUpperCase() || 'TXT')} • 
                ${globalIndex + 1} of ${totalFiles}
            </span>
        `;
        
        const content = document.createElement('div');
        content.className = 'file-content';
        
        // Add lazy loading for file content
        if (file.content) {
            // Content already loaded
            try {
                content.innerHTML = renderFileContent(file.content, file.path);
            } catch (error) {
                content.innerHTML = `<pre class="error">Error rendering file: ${error.message}</pre>`;
            }
        } else {
            // Add placeholder and lazy load
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
        
        // Add back to top link
        const backToTop = document.createElement('div');
        backToTop.className = 'back-top';
        backToTop.innerHTML = '<a href="#top" style="color: var(--accent-primary); text-decoration: none;">↑ Back to top</a>';
        backToTop.style.textAlign = 'right';
        backToTop.style.marginTop = '1rem';
        backToTop.style.padding = '0.5rem 0';
        backToTop.style.borderTop = '1px solid var(--border-secondary)';
        backToTop.style.fontSize = '0.9rem';
        
        section.appendChild(header);
        section.appendChild(content);
        section.appendChild(backToTop);
        filesContainer.appendChild(section);
    });
    
    // Update pagination after generating sections
    updatePagination();
}

/**
 * Lazy load file content when section comes into view
 */
async function loadFileContentLazy(section, fileInfo) {
    const contentDiv = section.querySelector('.file-content');
    const lazyDiv = contentDiv.querySelector('.lazy-content');
    
    if (!lazyDiv) return;
    
    try {
        // Check cache first
        if (filesContentCache.has(fileInfo.path)) {
            const cachedContent = filesContentCache.get(fileInfo.path);
            contentDiv.innerHTML = renderFileContent(cachedContent, fileInfo.path);
            return;
        }
        
        // Check if request is already pending
        if (pendingFileRequests.has(fileInfo.path)) {
            const content = await pendingFileRequests.get(fileInfo.path);
            contentDiv.innerHTML = renderFileContent(content, fileInfo.path);
            return;
        }
        
        // Create new request
        const requestPromise = fetchSingleFileContent(fileInfo);
        pendingFileRequests.set(fileInfo.path, requestPromise);
        
        const content = await requestPromise;
        
        // Cache the content
        filesContentCache.set(fileInfo.path, content);
        pendingFileRequests.delete(fileInfo.path);
        
        // Update the file object with loaded content
        const fileIndex = repositoryData.files.findIndex(f => f.path === fileInfo.path);
        if (fileIndex >= 0) {
            repositoryData.files[fileIndex].content = content;
        }
        
        // Render the content
        contentDiv.innerHTML = renderFileContent(content, fileInfo.path);
        
    } catch (error) {
        console.error(`Failed to load ${fileInfo.path}:`, error);
        contentDiv.innerHTML = `<pre class="error">Failed to load file: ${error.message}</pre>`;
        pendingFileRequests.delete(fileInfo.path);
    }
}

/**
 * Fetch single file content using multiple methods
 */
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

/**
 * Add skipped files summary
 */
function addSkippedFilesSummary() {
    if (!repositoryData.categorizedFiles) return;
    
    const { binary, large, ignored, failed, truncated } = repositoryData.categorizedFiles;
    // Don't count ignored files in the summary - they should be completely hidden
    const totalSkipped = binary.length + large.length + (failed ? failed.length : 0) + (truncated ? truncated.length : 0);
    
    if (totalSkipped === 0) return;
    
    // Find where to insert the summary (after repo info)
    const repoInfo = document.getElementById('repo-info');
    let summaryElement = document.getElementById('skipped-summary');
    
    if (!summaryElement) {
        summaryElement = document.createElement('div');
        summaryElement.id = 'skipped-summary';
        summaryElement.className = 'skipped-summary';
        summaryElement.style.cssText = `
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
        `;
        repoInfo.parentNode.insertBefore(summaryElement, repoInfo.nextSibling);
    }
    
    let summaryHTML = `
        <h3 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1rem;">
            📊 Skipped Files Summary (${totalSkipped})
        </h3>
    `;
    
    if (binary.length > 0) {
        summaryHTML += `
            <details style="margin-bottom: 0.5rem;">
                <summary style="cursor: pointer; color: var(--text-secondary);">
                    🔒 Binary files (${binary.length})
                </summary>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                    ${binary.slice(0, 10).map(f => `<li><code>${f.path}</code> (${formatBytes(f.size)})</li>`).join('')}
                    ${binary.length > 10 ? `<li><em>... and ${binary.length - 10} more</em></li>` : ''}
                </ul>
            </details>
        `;
    }
    
    if (large.length > 0) {
        summaryHTML += `
            <details style="margin-bottom: 0.5rem;">
                <summary style="cursor: pointer; color: var(--text-secondary);">
                    📦 Large files (${large.length}) - Over 100KB limit
                </summary>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                    ${large.slice(0, 10).map(f => `<li><code>${f.path}</code> (${formatBytes(f.size)})</li>`).join('')}
                    ${large.length > 10 ? `<li><em>... and ${large.length - 10} more</em></li>` : ''}
                </ul>
                <p style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.8rem; font-style: italic;">
                    💡 Note: Jupyter notebooks (.ipynb) are exempt from size limits and will always be processed.
                </p>
            </details>
        `;
    }
    
    if (failed && failed.length > 0) {
        summaryHTML += `
            <details style="margin-bottom: 0.5rem;">
                <summary style="cursor: pointer; color: var(--error-primary);">
                    ❌ Failed to load (${failed.length})
                </summary>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                    ${failed.slice(0, 10).map(f => `<li><code>${f.path}</code> (${formatBytes(f.size)})</li>`).join('')}
                    ${failed.length > 10 ? `<li><em>... and ${failed.length - 10} more</em></li>` : ''}
                </ul>
            </details>
        `;
    }
    
    if (truncated && truncated.length > 0) {
        summaryHTML += `
            <details style="margin-bottom: 0.5rem;">
                <summary style="cursor: pointer; color: var(--text-secondary);">
                    ✂️ Truncated due to file limit (${truncated.length})
                </summary>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
                    ${truncated.slice(0, 10).map(f => `<li><code>${f.path}</code> (${formatBytes(f.size)})</li>`).join('')}
                    ${truncated.length > 10 ? `<li><em>... and ${truncated.length - 10} more</em></li>` : ''}
                </ul>
            </details>
        `;
    }
    
    summaryElement.innerHTML = summaryHTML;
}

// Global variables for lazy loading
let filesContentCache = new Map();
let pendingFileRequests = new Map();

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateEnhancedFileSections,
        loadFileContentLazy,
        fetchSingleFileContent,
        addSkippedFilesSummary,
        filesContentCache,
        pendingFileRequests
    };
}