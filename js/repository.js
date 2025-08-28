// Repository management and processing functionality

// File extension sets for categorization
const BINARY_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dmg', 'pkg', 'deb', 'rpm',
    'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac',
    'ttf', 'otf', 'woff', 'woff2', 'eot'
]);

const TEXT_EXTENSIONS = new Set([
    'txt', 'md', 'markdown', 'rst', 'asciidoc',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte',
    'py', 'rb', 'php', 'go', 'rs', 'java', 'kt', 'scala',
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx',
    'cs', 'fs', 'vb',
    'html', 'htm', 'xml', 'xhtml', 'svg',
    'css', 'scss', 'sass', 'less', 'stylus',
    'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'sql', 'graphql', 'gql',
    'r', 'm', 'swift', 'dart', 'elm', 'clj', 'cljs',
    'dockerfile', 'makefile', 'gradle', 'cmake',
    'ipynb', 'rmd', 'tex', 'bib',
    'gitignore', 'gitattributes', 'gitmodules',
    'editorconfig', 'prettierrc', 'eslintrc',
    'LICENSE', 'README', 'CHANGELOG', 'TODO'
]);

// Global variables for file processing - moved to config.js

function getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

function getFileLimit() {
    const fileLimitInput = document.getElementById('file-limit');
    const githubToken = document.getElementById('github-token').value.trim();
    
    // Check if user has specified a custom limit
    if (fileLimitInput && fileLimitInput.value && fileLimitInput.value.trim()) {
        const customLimit = parseInt(fileLimitInput.value.trim());
        
        if (!isNaN(customLimit) && customLimit > 0 && customLimit <= 2000) {
            // Save to localStorage for persistence
            localStorage.setItem('git-render-file-limit', customLimit.toString());
            return customLimit;
        }
    }
    
    // Return default limits based on token availability
    return githubToken ? 200 : 50;
}

function getAvailableFiles() {
    if (!repositoryData || !repositoryData.files) return [];
    
    return repositoryData.files.filter(file => {
        // Include files that:
        // 1. Have content === null (not yet loaded, available for lazy loading)
        // 2. Have actual content (successfully loaded)
        // Exclude files that failed to load (have error messages)
        return file.content === null || 
               (file.content && 
                !file.content.startsWith('[Error loading file:') && 
                !file.content.startsWith('Failed to load') && 
                file.content !== '[Content not available]');
    });
}

function sortFilesByStructure(files) {
    return files.sort((a, b) => {
        // Only root README.md comes first (no slash in path)
        const aIsRootReadme = a.path.toLowerCase() === 'readme.md';
        const bIsRootReadme = b.path.toLowerCase() === 'readme.md';
        
        if (aIsRootReadme && !bIsRootReadme) return -1;
        if (!aIsRootReadme && bIsRootReadme) return 1;
        
        // For all other files (including non-root README.md), sort by directory structure
        const aParts = a.path.split('/');
        const bParts = b.path.split('/');
        
        // Compare directory depth (root files first)
        if (aParts.length !== bParts.length) {
            return aParts.length - bParts.length;
        }
        
        // Compare path components
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            const comparison = aParts[i].localeCompare(bParts[i]);
            if (comparison !== 0) return comparison;
        }
        
        return 0;
    });
}

function categorizeFile(filename, size) {
    // First, check for explicit git and repository metadata files that should NEVER be included
    const basename = filename.split('/').pop().toLowerCase();
    
    // Explicit list of files to ignore (case-insensitive)
    const explicitIgnoreList = [
        '.gitignore', '.gitattributes', '.gitmodules',
        'license', 'license.md', 'license.txt', 'licence', 'licence.md', 'licence.txt',
        'contributors.md', 'contributing.md', 'code_of_conduct.md', 'security.md', 'funding.yml',
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'pipfile.lock',
        '.ds_store', 'thumbs.db', 'desktop.ini'
    ];
    
    if (explicitIgnoreList.includes(basename)) {
        return { include: false, reason: 'ignored', category: 'ignored' };
    }
    
    // Check if it's in a git directory
    if (filename.includes('/.git/') || filename.startsWith('.git/')) {
        return { include: false, reason: 'ignored', category: 'ignored' };
    }
    
    // Check directory patterns to ignore
    const ignoredDirPatterns = [
        '/.github/', '/.vscode/', '/.idea/', '/.vs/',
        '/node_modules/', '/__pycache__/', '/.pytest_cache/', '/.mypy_cache/',
        '/vendor/', '/deps/', '/target/', '/build/', '/dist/',
        '/.devcontainer/', '/.devenv/', '/.anthropic/', '/.openai/'
    ];
    
    if (ignoredDirPatterns.some(pattern => filename.includes(pattern)) ||
        filename.startsWith('.github/') ||
        filename.startsWith('.vscode/') ||
        filename.startsWith('node_modules/') ||
        filename.startsWith('__pycache__/')) {
        return { include: false, reason: 'ignored', category: 'ignored' };
    }
    
    // Check file size (except for Jupyter notebooks which should always be processed)
    const maxSize = 100 * 1024; // 100KB limit
    const ext = getFileExtension(filename);
    if (size > maxSize && ext !== 'ipynb') {
        return { include: false, reason: 'too_large', category: 'large' };
    }
    
    // Check if it's a known binary file
    if (BINARY_EXTENSIONS.has(ext)) {
        return { include: false, reason: 'binary', category: 'binary' };
    }
    
    // Check if it's a known text file
    if (TEXT_EXTENSIONS.has(ext)) {
        return { include: true, reason: 'ok', category: 'text' };
    }
    
    // Check for files without extensions that are commonly text
    if (!ext) {
        if (TEXT_EXTENSIONS.has(basename) || 
            basename.includes('readme') || 
            basename.includes('makefile') ||
            basename.includes('dockerfile') ||
            basename.includes('changelog') ||
            basename.includes('todo')) {
            return { include: true, reason: 'ok', category: 'text' };
        }
    }
    
    // For unknown extensions, assume text but be cautious
    return { include: true, reason: 'ok', category: 'text' };
}

function shouldSkipFile(filename, size) {
    return !categorizeFile(filename, size).include;
}

async function fetchRepositoryContents(owner, repo) {
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
        
        // Fetch repository tree
        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`, { headers });
        if (!treeResponse.ok) {
            if (treeResponse.status === 403) {
                const resetTime = treeResponse.headers.get('X-RateLimit-Reset');
                const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'unknown';
                throw new Error(`API rate limit exceeded while fetching repository tree. Rate limit resets at ${resetDate}. Consider adding a GitHub token.`);
            }
            throw new Error('Failed to fetch repository contents');
        }
        const treeData = await treeResponse.json();
        
        // Categorize all files - filter out ignored files immediately
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
                
                // Only add to allFiles if not ignored
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
        
        // Apply file limits
        const maxFiles = getFileLimit();
        
        if (totalFilesToProcess > maxFiles) {
            categorizedFiles.rendered = sortFilesByStructure(categorizedFiles.rendered);
            
            const truncatedFiles = categorizedFiles.rendered.splice(maxFiles);
            if (!categorizedFiles.truncated) categorizedFiles.truncated = [];
            categorizedFiles.truncated.push(...truncatedFiles);
            
            totalFilesToProcess = categorizedFiles.rendered.length;
        }
        
        if (totalFilesToProcess === 0) {
            return {
                repoInfo,
                files: [],
                categorizedFiles,
                allFiles,
                totalSize: 0,
                treeStructure: await generateTreeStructure(treeData.tree),
                treeStructureObject: await generateTreeStructureObject(treeData.tree)
            };
        }
        
        // Store file metadata without content for lazy loading
        const filesList = categorizedFiles.rendered.map(fileInfo => ({
            path: fileInfo.path,
            size: fileInfo.size,
            sha: fileInfo.sha,
            content: null
        }));
        
        const treeStructure = await generateTreeStructure(treeData.tree);
        const treeStructureObject = await generateTreeStructureObject(treeData.tree);
        
        return {
            repoInfo,
            files: filesList,
            categorizedFiles,
            allFiles,
            totalSize: categorizedFiles.rendered.reduce((sum, file) => sum + (file.size || 0), 0),
            treeStructure: treeStructure,
            treeStructureObject: treeStructureObject
        };
        
    } catch (error) {
        throw error;
    } finally {
        loading.style.display = 'none';
        renderBtn.disabled = false;
    }
}

async function renderRepository() {
    const repoUrl = document.getElementById('repo-input').value.trim();
    if (!repoUrl) {
        alert('Please enter a GitHub repository URL');
        return;
    }
    
    if (!validateRepoUrl(repoUrl)) {
        alert('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)');
        return;
    }
    
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
        alert('Could not parse repository information from URL');
        return;
    }
    
    try {
        // Update loading message
        const loading = document.getElementById('loading');
        const loadingText = loading ? loading.querySelector('span') : null;
        const currentLimit = getFileLimit();
        const isCustomLimit = document.getElementById('file-limit').value.trim() !== '';
        const githubToken = document.getElementById('github-token').value.trim();
        
        if (loadingText) {
            const limitType = isCustomLimit ? 'custom' : (githubToken ? 'with token' : 'no token');
            loadingText.textContent = `Processing repository... (limit: ${currentLimit} files, ${limitType})`;
        }
        
        // Check rate limit
        await checkRateLimit();
        
        // Reset progress
        processedFiles = 0;
        totalFilesToProcess = 0;
        
        // Fetch repository data
        repositoryData = await fetchRepositoryContents(repoInfo.owner, repoInfo.repo);
        
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
        
    } catch (error) {
        const errorMessage = handleApiError(error, 'Repository rendering');
        alert(errorMessage);
    }
}

function updateRepositoryUI() {
    if (!repositoryData) return;
    
    // Update repo info
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
    
    // Update statistics
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
    
    // Update stats display
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
    
    // Update UI components
    generateFileTree();
    generateEnhancedFileSections();
    
    // Generate CXML for LLM view
    if (repositoryData && repositoryData.files) {
        generateCXML(repositoryData.files).then(cxml => {
            const llmTextarea = document.getElementById('llm-textarea');
            if (llmTextarea) {
                llmTextarea.value = cxml;
            }
        }).catch(error => {
            console.error('Error generating CXML:', error);
        });
    }
}

async function generateTreeStructure(tree) {
    if (!tree || !Array.isArray(tree)) {
        return '';
    }
    
    // Build a proper hierarchical tree structure
    const fileTree = {};
    
    // First, collect all files (excluding binary files)
    const validFiles = [];
    for (const item of tree) {
        if (item.type === 'blob') {
            const category = categorizeFile(item.path, item.size || 0);
            if (category.category !== 'binary') {
                validFiles.push(item.path);
            }
        }
    }
    
    // Build the tree structure
    validFiles.forEach(filePath => {
        const parts = filePath.split('/');
        let current = fileTree;
        
        // Navigate/create the directory structure
        for (let i = 0; i < parts.length - 1; i++) {
            const dirName = parts[i];
            if (!current[dirName]) {
                current[dirName] = {};
            }
            current = current[dirName];
        }
        
        // Add the file
        const fileName = parts[parts.length - 1];
        current[fileName] = null; // null indicates it's a file
    });
    
    // Generate the tree representation
    function generateTreeLines(node, prefix = '', isLast = true, isRoot = true) {
        const lines = [];
        
        if (!node || typeof node !== 'object') return lines;
        
        const entries = Object.keys(node).sort((a, b) => {
            // Directories first (objects), then files (null values)
            const aIsDir = node[a] !== null;
            const bIsDir = node[b] !== null;
            
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });
        
        entries.forEach((name, index) => {
            const isLastItem = index === entries.length - 1;
            const isDirectory = node[name] !== null;
            
            if (isRoot) {
                // Root level items
                if (isDirectory) {
                    lines.push(`${name}/`);
                    lines.push(...generateTreeLines(node[name], '', isLastItem, false));
                } else {
                    lines.push(name);
                }
            } else {
                // Non-root items with tree connectors
                const connector = isLastItem ? '└── ' : '├── ';
                const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
                
                if (isDirectory) {
                    lines.push(`${prefix}${connector}${name}/`);
                    lines.push(...generateTreeLines(node[name], newPrefix, isLastItem, false));
                } else {
                    lines.push(`${prefix}${connector}${name}`);
                }
            }
        });
        
        return lines;
    }
    
    const treeLines = generateTreeLines(fileTree, '', true, true);
    return treeLines.join('\n');
}

async function generateTreeStructureObject(tree) {
    const structure = {};
    
    if (!tree || !Array.isArray(tree)) {
        return structure;
    }
    
    // Build directory structure from tree data
    tree.forEach(item => {
        if (item.type === 'blob') {
            const parts = item.path.split('/');
            let current = structure;
            
            // Create directory structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {
                        type: 'directory',
                        children: {}
                    };
                }
                current = current[part].children;
            }
            
            // Add file
            const fileName = parts[parts.length - 1];
            current[fileName] = {
                type: 'file',
                path: item.path,
                size: item.size
            };
        }
    });
    
    return structure;
}

function validateRepoUrl(url) {
    return /^https?:\/\/github\.com\/[^\/]+\/[^\/\?#]+/i.test(url);
}