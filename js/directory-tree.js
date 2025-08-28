// Directory tree structure functionality

function addDirectoryTreeView() {
    if (!repositoryData || !repositoryData.treeStructure) {
        console.log('DEBUG: Directory tree data not available');
        return;
    }
    
    // Find the sidebar and add tree view before file list
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.log('DEBUG: Sidebar not found');
        return;
    }
    
    const existingTree = document.getElementById('directory-tree');
    if (existingTree) {
        existingTree.remove();
    }
    
    console.log('DEBUG: Creating directory tree view');
    
    const treeSection = document.createElement('div');
    treeSection.id = 'directory-tree';
    treeSection.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="showExpandedDirectoryTree()">
            📁 Directory Structure
            <span style="font-size: 0.8rem; color: var(--text-muted);">↗️</span>
        </h3>
        <div id="directory-tree-preview" style="
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.8rem;
            line-height: 1.2;
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
            cursor: pointer;
        " onclick="showExpandedDirectoryTree()" title="Click to view full directory structure">${formatDirectoryTreeWithHighlights(repositoryData.treeStructure)}</div>
    `;
    
    // Insert before the file list
    const fileTreeContainer = document.querySelector('.sidebar h3');
    if (fileTreeContainer) {
        sidebar.insertBefore(treeSection, fileTreeContainer);
    } else {
        // If no file tree header found, insert at the beginning
        sidebar.insertBefore(treeSection, sidebar.firstChild);
    }
}

function formatDirectoryTreeWithHighlights(treeText) {
    if (!treeText) return '';
    
    const lines = treeText.split('\n');
    const highlightedLines = lines.map(line => {
        if (!line.trim()) return '<div class="tree-line empty-line"></div>';
        
        // Calculate indentation level
        const indentMatch = line.match(/^(\s*)/);
        const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
        
        // Check if it's a directory (ends with /) or file
        const isDirectory = line.endsWith('/');
        const hasTreePrefix = line.includes('├──') || line.includes('└──');
        
        let className = 'tree-line';
        let content = escapeHtml(line);
        
        if (isDirectory) {
            className += ` tree-directory level-${Math.min(indentLevel, 5)}`;
            
            // Add folder icon
            const folderIcon = indentLevel === 0 ? '📁' : '📂';
            content = content.replace(/([├└]──\s*)(.+\/)$/, `$1${folderIcon} $2`);
            if (!hasTreePrefix && line.trim().endsWith('/')) {
                content = content.replace(/^(\s*)(.+\/)$/, `$1${folderIcon} $2`);
            }
        } else {
            className += ` tree-file level-${Math.min(indentLevel, 5)}`;
            
            // Add file type styling and icon based on extension
            const fileExtension = getFileExtensionFromLine(line);
            if (fileExtension) {
                className += ` file-${fileExtension}`;
                
                // Add file icon based on type
                const fileIcon = getFileIcon(fileExtension);
                content = content.replace(/([├└]──\s*)(.+)$/, `$1${fileIcon} $2`);
                if (!hasTreePrefix && line.trim() && !line.trim().endsWith('/')) {
                    content = content.replace(/^(\s*)(.+)$/, `$1${fileIcon} $2`);
                }
            }
        }
        
        // Highlight tree structure characters
        if (hasTreePrefix) {
            content = content.replace(/(├──|└──|│\s+)/g, '<span class="tree-structure">$1</span>');
        }
        
        // Highlight indentation
        content = content.replace(/^(\s+)/, '<span class="tree-indent">$1</span>');
        
        return `<div class="${className}">${content}</div>`;
    });
    
    return `<div class="directory-tree-highlighted">${highlightedLines.join('')}</div>`;
}

function getFileIcon(fileType) {
    const iconMap = {
        'js': '📜',
        'ts': '📘',
        'jsx': '⚛️',
        'tsx': '⚛️',
        'vue': '💚',
        'svelte': '🔥',
        'py': '🐍',
        'java': '☕',
        'kt': '🟣',
        'cpp': '⚙️',
        'c': '⚙️',
        'hpp': '⚙️',
        'h': '⚙️',
        'rs': '🦀',
        'go': '🐹',
        'php': '🐘',
        'rb': '💎',
        'swift': '🐦',
        'css': '🎨',
        'html': '🌐',
        'json': '📋',
        'yaml': '📄',
        'md': '📝',
        'config': '⚙️',
        'special': '⭐',
        'unknown': '📄'
    };
    
    return iconMap[fileType] || '📄';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileExtensionFromLine(line) {
    // Extract filename from tree line
    const match = line.match(/[├└]──\s*(.+)$|^([^├└│\s].+)$/);
    const filename = match ? (match[1] || match[2] || '').trim() : '';
    
    if (!filename || filename.endsWith('/')) return null;
    
    const lastDot = filename.lastIndexOf('.');
    if (lastDot > 0 && lastDot < filename.length - 1) {
        const ext = filename.slice(lastDot + 1).toLowerCase();
        
        // Group similar extensions
        if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'js';
        if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) return 'ts';
        if (['css', 'scss', 'sass', 'less', 'stylus'].includes(ext)) return 'css';
        if (['html', 'htm', 'xhtml'].includes(ext)) return 'html';
        if (['json', 'json5'].includes(ext)) return 'json';
        if (['yaml', 'yml'].includes(ext)) return 'yaml';
        if (['md', 'markdown', 'mdx'].includes(ext)) return 'md';
        if (['py', 'pyw', 'pyi'].includes(ext)) return 'py';
        if (['java', 'class', 'jar'].includes(ext)) return 'java';
        if (['cpp', 'cxx', 'cc', 'c++'].includes(ext)) return 'cpp';
        if (['c', 'h'].includes(ext)) return 'c';
        if (['hpp', 'hxx', 'h++'].includes(ext)) return 'hpp';
        if (['rs'].includes(ext)) return 'rs';
        if (['go'].includes(ext)) return 'go';
        if (['php', 'phtml'].includes(ext)) return 'php';
        if (['rb', 'ruby'].includes(ext)) return 'rb';
        if (['swift'].includes(ext)) return 'swift';
        if (['kt', 'kts'].includes(ext)) return 'kt';
        if (['vue'].includes(ext)) return 'vue';
        if (['svelte'].includes(ext)) return 'svelte';
        
        return ext;
    }
    
    // Special cases for files without extensions
    const lowerName = filename.toLowerCase();
    if (['readme', 'makefile', 'dockerfile', 'license', 'licence', 'changelog', 'contributing', 'authors'].some(name => lowerName.includes(name))) {
        return 'special';
    }
    
    if (['package.json', 'tsconfig.json', 'composer.json', 'cargo.toml'].includes(lowerName)) {
        return 'config';
    }
    
    return 'unknown';
}

function showExpandedDirectoryTree() {
    if (!repositoryData || !repositoryData.treeStructure) {
        console.warn('No directory structure available');
        return;
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'directory-tree-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(4px);
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 80%;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
    `;
    
    // Modal header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-primary);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary);
    `;
    
    header.innerHTML = `
        <h2 style="margin: 0; color: var(--text-primary); font-size: 1.25rem;">
            📁 Directory Structure - ${repositoryData.repoInfo.full_name}
        </h2>
        <button onclick="closeExpandedDirectoryTree()" style="
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        " onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='none'">×</button>
    `;
    
    // Modal body
    const body = document.createElement('div');
    body.style.cssText = `
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
    `;
    
    const treeContent = document.createElement('div');
    treeContent.style.cssText = `
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 0.9rem;
        line-height: 1.4;
        background: var(--bg-secondary);
        border: 1px solid var(--border-secondary);
        border-radius: 8px;
        padding: 1.5rem;
        margin: 0;
        overflow-x: auto;
        overflow-y: auto;
        max-height: 60vh;
        white-space: nowrap;
    `;
    treeContent.innerHTML = formatDirectoryTreeWithHighlights(repositoryData.treeStructure);
    
    // Modal footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-primary);
        background: var(--bg-secondary);
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const stats = repositoryData.allFiles ? repositoryData.allFiles.length : 0;
    const binaryFiles = repositoryData.categorizedFiles?.binary?.length || 0;
    footer.innerHTML = `
        <span style="color: var(--text-muted); font-size: 0.9rem;">
            📊 Total files: ${stats} (${binaryFiles} binary files excluded from tree)
        </span>
        <button onclick="copyDirectoryTree()" style="
            background: var(--accent-primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
        " onmouseover="this.style.background='var(--accent-hover)'" onmouseout="this.style.background='var(--accent-primary)'">
            📋 Copy Tree
        </button>
    `;
    
    // Assemble modal
    body.appendChild(treeContent);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeExpandedDirectoryTree();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeExpandedDirectoryTree();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeExpandedDirectoryTree() {
    const modal = document.getElementById('directory-tree-modal');
    if (modal) {
        modal.remove();
    }
}

function copyDirectoryTree() {
    if (!repositoryData || !repositoryData.treeStructure) {
        return;
    }
    
    // Use the plain text version for copying
    navigator.clipboard.writeText(repositoryData.treeStructure).then(() => {
        // Show temporary success feedback
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = 'var(--accent-primary)';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy directory tree:', err);
        // Fallback: create a temporary textarea with plain text
        const textarea = document.createElement('textarea');
        textarea.value = repositoryData.treeStructure;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // Show success feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.style.background = '#28a745';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = 'var(--accent-primary)';
            }, 2000);
        } catch (e) {
            document.body.removeChild(textarea);
            console.error('Fallback copy failed:', e);
        }
    });
}

// Make functions globally available for onclick handlers
window.showExpandedDirectoryTree = showExpandedDirectoryTree;
window.closeExpandedDirectoryTree = closeExpandedDirectoryTree;
window.copyDirectoryTree = copyDirectoryTree;

function generateDirectoryTreeHtml(structure, level = 0, prefix = '') {
    let html = '';
    
    if (!structure || typeof structure !== 'object') return html;
    
    const entries = Object.entries(structure);
    entries.sort(([a], [b]) => a.localeCompare(b));
    
    entries.forEach(([name, item], index) => {
        const isLast = index === entries.length - 1;
        const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        
        if (item.type === 'directory') {
            html += `<div class="tree-item tree-directory">
                <span class="tree-indent">${currentPrefix}</span>📁 ${escapeHtml(name)}/
            </div>`;
            
            if (item.children) {
                html += generateDirectoryTreeHtml(item.children, level + 1, nextPrefix);
            }
        } else {
            // This is a file
            const icon = getFileIcon(name);
            html += `<div class="tree-item tree-file">
                <span class="tree-indent">${currentPrefix}</span><a href="#file-${item.path}" onclick="navigateToFile('${item.path}')">${icon} ${escapeHtml(name)}</a>
            </div>`;
        }
    });
    
    return html;
}

// Enhanced navigation function that works across pages
function navigateToFile(fileName) {
    if (!repositoryData || !repositoryData.files) return;
    
    // Find the file and its position
    const availableFiles = getAvailableFiles();
    const sortedFiles = sortFilesByStructure(availableFiles);
    
    const fileIndex = sortedFiles.findIndex(file => file.path === fileName);
    if (fileIndex === -1) {
        console.warn('File not found:', fileName);
        return;
    }
    
    // Calculate which page the file is on
    const targetPage = Math.ceil((fileIndex + 1) / filesPerPage);
    
    if (targetPage !== currentPage) {
        // Navigate to the correct page first
        goToPage(targetPage);
        
        // Wait for page to load, then scroll to file
        setTimeout(() => {
            scrollToFile(fileName);
        }, 300);
    } else {
        // File is on current page, just scroll to it
        scrollToFile(fileName);
    }
}

function scrollToFile(fileName) {
    const fileElement = document.getElementById(`file-${fileName}`);
    if (fileElement) {
        // Smooth scroll to file
        fileElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // Add highlight effect
        fileElement.style.transition = 'background-color 0.3s ease';
        fileElement.style.backgroundColor = 'rgba(9, 105, 218, 0.1)';
        fileElement.style.border = '2px solid var(--accent-primary)';
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            fileElement.style.backgroundColor = '';
            fileElement.style.border = '';
        }, 3000);
    } else {
        console.warn('File element not found in DOM:', fileName);
    }
}