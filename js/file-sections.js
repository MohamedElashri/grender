// File sections generation and management

async function generateEnhancedFileSections() {
    const filesContainer = document.getElementById('files-container');
    if (!filesContainer || !repositoryData || !repositoryData.files) return;
    
    const availableFiles = getAvailableFiles();
    const sortedFiles = sortFilesByStructure(availableFiles);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = Math.min(startIndex + filesPerPage, sortedFiles.length);
    const filesToShow = sortedFiles.slice(startIndex, endIndex);
    
    filesContainer.innerHTML = '';
    
    if (filesToShow.length === 0) {
        filesContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No files to display</div>';
        return;
    }
    
    // Generate file sections
    for (const file of filesToShow) {
        const fileSection = document.createElement('div');
        fileSection.className = 'file-section';
        fileSection.id = `file-${file.path}`;
        
        const fileHeader = document.createElement('div');
        fileHeader.className = 'file-header';
        fileHeader.innerHTML = `
            <h3>${escapeHtml(file.path)}</h3>
            <span class="file-size">${formatBytes(file.size || 0)}</span>
        `;
        
        const fileContent = document.createElement('div');
        fileContent.className = 'file-content';
        
        // Show loading placeholder initially
        fileContent.innerHTML = '<div style="padding: 1rem; color: var(--text-muted);">Loading content...</div>';
        
        fileSection.appendChild(fileHeader);
        fileSection.appendChild(fileContent);
        filesContainer.appendChild(fileSection);
        
        // Lazy load content when section comes into viewport
        const observer = new IntersectionObserver(async (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    
                    try {
                        const content = await loadFileContentLazy(file);
                        if (content && !content.startsWith('[Error loading file:') && content !== '[Content not available]') {
                            fileContent.innerHTML = renderFileContent(file, content);
                        } else {
                            fileContent.innerHTML = `<div style="padding: 1rem; color: var(--text-muted);">${content || 'Content not available'}</div>`;
                        }
                    } catch (error) {
                        console.error(`Error loading content for ${file.path}:`, error);
                        fileContent.innerHTML = `<div style="padding: 1rem; color: var(--text-muted);">Error loading content: ${error.message}</div>`;
                    }
                    
                    break;
                }
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });
        
        observer.observe(fileSection);
    }
    
    // Update pagination
    updatePagination();
    
    // Add directory structure overview as the first section
    if (currentPage === 1) {
        addDirectoryTreeView();
    }
}

function generateFileTree() {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree || !repositoryData || !repositoryData.files) return;
    
    const availableFiles = getAvailableFiles();
    const sortedFiles = sortFilesByStructure(availableFiles);
    
    // Build directory structure
    const tree = {};
    
    sortedFiles.forEach(file => {
        const parts = file.path.split('/');
        let currentLevel = tree;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (!currentLevel[part]) {
                currentLevel[part] = {
                    type: i === parts.length - 1 ? 'file' : 'directory',
                    children: {},
                    file: i === parts.length - 1 ? file : null,
                    path: parts.slice(0, i + 1).join('/')
                };
            }
            
            if (i < parts.length - 1) {
                currentLevel = currentLevel[part].children;
            }
        }
    });
    
    function renderTreeLevel(level, depth = 0) {
        let html = '';
        const entries = Object.entries(level);
        
        // Sort: directories first, then files
        entries.sort(([aName, aNode], [bName, bNode]) => {
            if (aNode.type === 'directory' && bNode.type === 'file') return -1;
            if (aNode.type === 'file' && bNode.type === 'directory') return 1;
            return aName.localeCompare(bName);
        });
        
        for (const [name, node] of entries) {
            const indent = '&nbsp;'.repeat(depth * 2);
            
            if (node.type === 'directory') {
                html += `<li>${indent}📁 ${escapeHtml(name)}</li>`;
                html += renderTreeLevel(node.children, depth + 1);
            } else {
                const icon = getFileIcon(name);
                html += `<li>${indent}<a href="#file-${node.file.path}" onclick="event.preventDefault(); navigateToFile('${node.file.path}')">${icon} ${escapeHtml(name)}</a></li>`;
            }
        }
        
        return html;
    }
    
    fileTree.innerHTML = renderTreeLevel(tree);
}

function getFileIcon(filename) {
    const ext = getFileExtension(filename);
    const iconMap = {
        'js': '📜',
        'ts': '📘',
        'jsx': '⚛️',
        'tsx': '⚛️',
        'py': '🐍',
        'rb': '💎',
        'go': '🐹',
        'rs': '🦀',
        'php': '🐘',
        'java': '☕',
        'c': '📝',
        'cpp': '📝',
        'cs': '🔷',
        'html': '🌐',
        'css': '🎨',
        'scss': '🎨',
        'sass': '🎨',
        'json': '📋',
        'xml': '📄',
        'yaml': '📄',
        'yml': '📄',
        'md': '📖',
        'txt': '📄',
        'pdf': '📕',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'gif': '🖼️',
        'svg': '🖼️',
        'mp4': '🎬',
        'mp3': '🎵',
        'zip': '📦',
        'tar': '📦',
        'gz': '📦'
    };
    
    return iconMap[ext] || '📄';
}

// generateTreeStructure moved to directory-tree.js

function addSkippedFilesSummary() {
    if (!repositoryData || !repositoryData.categorizedFiles) return;
    
    const { categorizedFiles } = repositoryData;
    const summary = [];
    
    if (categorizedFiles.binary && categorizedFiles.binary.length > 0) {
        summary.push(`${categorizedFiles.binary.length} binary files`);
    }
    if (categorizedFiles.large && categorizedFiles.large.length > 0) {
        summary.push(`${categorizedFiles.large.length} large files`);
    }
    if (categorizedFiles.ignored && categorizedFiles.ignored.length > 0) {
        summary.push(`${categorizedFiles.ignored.length} ignored files`);
    }
    if (categorizedFiles.truncated && categorizedFiles.truncated.length > 0) {
        summary.push(`${categorizedFiles.truncated.length} files due to limit`);
    }
    
    if (summary.length === 0) return;
    
    const filesContainer = document.getElementById('files-container');
    if (!filesContainer) return;
    
    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = `
        margin: 1rem 0;
        padding: 1rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        color: var(--text-secondary);
        font-size: 0.9rem;
    `;
    
    summaryDiv.innerHTML = `
        <strong>Skipped files:</strong> ${summary.join(', ')}
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            These files were excluded from rendering due to size, type, or file limit constraints.
        </div>
    `;
    
    filesContainer.appendChild(summaryDiv);
}