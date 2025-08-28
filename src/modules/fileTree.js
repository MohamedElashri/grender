// File tree generation and management functions

/**
 * Generate sidebar file tree with directory structure
 */
function generateFileTree() {
    const fileTree = document.getElementById('file-tree');
    if (!fileTree || !repositoryData || !repositoryData.files) return;
    
    // Use helper function to get available files
    const availableFiles = getAvailableFiles();
    
    // Update the sidebar header to show file count
    const sidebarHeader = fileTree.parentElement.querySelector('h3');
    if (sidebarHeader) {
        sidebarHeader.innerHTML = `Files (${availableFiles.length}) <small style="color: var(--text-muted); font-weight: normal;">↕️ scroll</small>`;
    }
    
    fileTree.innerHTML = '';
    
    // Add "Back to top" link
    const backToTop = document.createElement('li');
    backToTop.innerHTML = '<a href="#top" style="color: var(--accent-primary); font-weight: bold;">↑ Back to top</a>';
    fileTree.appendChild(backToTop);
    
    // Sort files by structure with README.md first
    const sortedFiles = sortFilesByStructure([...availableFiles]);
    
    // Group files by directory while maintaining sort order
    const filesByDir = {};
    const dirOrder = [];
    
    sortedFiles.forEach(file => {
        const parts = file.path.split('/');
        const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        const filename = parts[parts.length - 1];
        
        if (!filesByDir[dir]) {
            filesByDir[dir] = [];
            dirOrder.push(dir);
        }
        filesByDir[dir].push({ ...file, filename });
    });
    
    // Display files maintaining the sorted order
    dirOrder.forEach(dir => {
        // Add directory header if not root
        if (dir !== '') {
            const dirLi = document.createElement('li');
            dirLi.style.fontWeight = 'bold';
            dirLi.style.color = 'var(--text-secondary)';
            dirLi.style.marginTop = '0.5rem';
            dirLi.textContent = `📁 ${dir}/`;
            fileTree.appendChild(dirLi);
        }
        
        // Add files in directory (already sorted)
        filesByDir[dir].forEach(file => {
            const li = document.createElement('li');
            li.style.paddingLeft = dir === '' ? '0' : '1rem';
            
            const a = document.createElement('a');
            const fileId = file.path.replace(/[^a-zA-Z0-9-_]/g, '-');
            a.href = `#file-${fileId}`;
            
            // Add icon for different file types
            let icon = '';
            if (isJupyterNotebook(file.filename)) {
                icon = '📓 ';
            } else if (isMarkdownFile(file.filename)) {
                icon = '📝 ';
            } else if (['py', 'js', 'ts', 'java', 'cpp', 'c', 'h'].includes(getFileExtension(file.filename))) {
                icon = '⚡ ';
            } else if (['json', 'xml', 'yaml', 'yml'].includes(getFileExtension(file.filename))) {
                icon = '📋 ';
            } else {
                icon = '📄 ';
            }
            
            a.textContent = icon + file.filename;
            a.title = `${file.path} (${formatBytes(file.size)})`;
            li.appendChild(a);
            
            // Add file size indicator
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'file-size';
            sizeSpan.textContent = ` (${formatBytes(file.size)})`;
            sizeSpan.style.color = 'var(--text-muted)';
            sizeSpan.style.fontSize = '0.8em';
            li.appendChild(sizeSpan);
            
            fileTree.appendChild(li);
        });
    });
}

/**
 * Add directory tree view to sidebar
 */
function addDirectoryTreeView() {
    if (!repositoryData.treeStructure) return;
    
    // Find the sidebar and add tree view before file list
    const sidebar = document.querySelector('.sidebar');
    const existingTree = document.getElementById('directory-tree');
    if (existingTree) {
        existingTree.remove();
    }
    
    const treeSection = document.createElement('div');
    treeSection.id = 'directory-tree';
    treeSection.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1rem;">
            📁 Directory Structure
        </h3>
        <pre style="
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.8rem;
            line-height: 1.2;
            color: var(--text-secondary);
            background: var(--bg-primary);
            border: 1px solid var(--border-secondary);
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
        ">${repositoryData.treeStructure}</pre>
    `;
    
    // Insert before the file list
    const fileTreeContainer = document.querySelector('.sidebar h3');
    if (fileTreeContainer) {
        sidebar.insertBefore(treeSection, fileTreeContainer);
    }
}

/**
 * Generate directory tree structure (only non-ignored files)
 */
async function generateTreeStructure(treeData) {
    const directories = new Set();
    const files = [];
    
    // Collect all directories and files, but filter out ignored files
    for (const item of treeData) {
        if (item.type === 'tree') {
            directories.add(item.path);
        } else if (item.type === 'blob') {
            // Check if this file should be ignored
            const category = categorizeFile(item.path, item.size || 0);
            if (category.category !== 'ignored') {
                files.push(item.path);
                // Add parent directories
                const parts = item.path.split('/');
                for (let i = 1; i < parts.length; i++) {
                    directories.add(parts.slice(0, i).join('/'));
                }
            }
        }
    }
    
    // Sort directories and files
    const sortedDirs = Array.from(directories).sort();
    const sortedFiles = files.sort();
    
    // Build tree representation
    const tree = [];
    const processed = new Set();
    
    function addToTree(path, isFile = false) {
        if (processed.has(path)) return;
        processed.add(path);
        
        const parts = path.split('/');
        const depth = parts.length - 1;
        const name = parts[parts.length - 1];
        const prefix = '  '.repeat(depth);
        
        if (depth === 0) {
            tree.push(`${name}${isFile ? '' : '/'}`);
        } else {
            tree.push(`${prefix}├── ${name}${isFile ? '' : '/'}`);
        }
    }
    
    // Add directories first
    for (const dir of sortedDirs) {
        addToTree(dir, false);
    }
    
    // Add files
    for (const file of sortedFiles) {
        if (!processed.has(file)) {
            addToTree(file, true);
        }
    }
    
    return tree.join('\n');
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFileTree,
        addDirectoryTreeView,
        generateTreeStructure
    };
}