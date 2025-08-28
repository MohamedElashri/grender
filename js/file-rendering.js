// File content rendering functionality

// Cache for file content to avoid re-fetching
const filesContentCache = new Map();
const pendingFileRequests = new Map();

function renderFileContent(file, fileContent) {
    if (isMarkdownFile(file.path)) {
        try {
            const processedContent = processGitHubFeatures(fileContent);
            return `<div class="markdown-content">${marked.parse(processedContent)}</div>`;
        } catch (error) {
            console.error('Markdown rendering error:', error);
            return `<pre><code>${escapeHtml(fileContent)}</code></pre>`;
        }
    } else if (isJupyterNotebook(file.path)) {
        try {
            return parseJupyterNotebook(fileContent, file.path);
        } catch (error) {
            console.error('Jupyter notebook parsing error:', error);
            return `<pre><code>${escapeHtml(fileContent)}</code></pre>`;
        }
    } else {
        // Regular code file with syntax highlighting
        const ext = getFileExtension(file.path);
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'sh': 'bash',
            'yml': 'yaml',
            'yaml': 'yaml'
        };
        
        const language = languageMap[ext] || ext;
        
        try {
            if (language && hljs.getLanguage(language)) {
                const highlighted = hljs.highlight(fileContent, { language });
                return `<pre class="hljs-container"><code class="hljs language-${language}">${highlighted.value}</code></pre>`;
            } else {
                const highlighted = hljs.highlightAuto(fileContent);
                return `<pre class="hljs-container"><code class="hljs">${highlighted.value}</code></pre>`;
            }
        } catch (error) {
            console.error('Syntax highlighting error:', error);
            return `<pre><code>${escapeHtml(fileContent)}</code></pre>`;
        }
    }
}

function parseJupyterNotebook(content, filename) {
    try {
        const notebook = JSON.parse(content);
        let html = `<div class="jupyter-notebook">
            <div class="notebook-header">
                <span>📓</span>
                <span>Jupyter Notebook</span>
            </div>`;
        
        if (notebook.cells && Array.isArray(notebook.cells)) {
            notebook.cells.forEach((cell, index) => {
                if (!cell.source || !Array.isArray(cell.source)) return;
                
                const source = cell.source.join('');
                if (!source.trim()) return;
                
                html += `<div class="notebook-cell cell-${cell.cell_type}">`;
                
                if (cell.cell_type === 'markdown') {
                    try {
                        html += `<div class="markdown-content">${marked.parse(source)}</div>`;
                    } catch (e) {
                        html += `<pre>${escapeHtml(source)}</pre>`;
                    }
                } else if (cell.cell_type === 'code') {
                    try {
                        const highlighted = hljs.highlight(source, { language: 'python' });
                        html += `<div class="code-block-wrapper">
                            <div class="code-block-header">
                                <span class="code-language">python (cell ${index + 1})</span>
                            </div>
                            <pre class="hljs-container"><code class="hljs language-python">${highlighted.value}</code></pre>
                        </div>`;
                    } catch (e) {
                        html += `<pre><code>${escapeHtml(source)}</code></pre>`;
                    }
                    
                    // Add outputs if they exist
                    if (cell.outputs && Array.isArray(cell.outputs) && cell.outputs.length > 0) {
                        html += '<div class="notebook-output">';
                        cell.outputs.forEach(output => {
                            if (output.output_type === 'stream' && output.text) {
                                html += `<pre class="output-stream">${escapeHtml(Array.isArray(output.text) ? output.text.join('') : output.text)}</pre>`;
                            } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                                if (output.data && output.data['text/plain']) {
                                    html += `<pre class="output-result">${escapeHtml(Array.isArray(output.data['text/plain']) ? output.data['text/plain'].join('') : output.data['text/plain'])}</pre>`;
                                }
                            }
                        });
                        html += '</div>';
                    }
                } else {
                    html += `<pre>${escapeHtml(source)}</pre>`;
                }
                
                html += '</div>';
            });
        }
        
        html += '</div>';
        return html;
        
    } catch (error) {
        console.error('Error parsing Jupyter notebook:', error);
        return `<div class="jupyter-notebook">
            <p>Error parsing Jupyter notebook: ${error.message}</p>
            <pre><code>${escapeHtml(content.substring(0, 1000))}${content.length > 1000 ? '...' : ''}</code></pre>
        </div>`;
    }
}

function processGitHubFeatures(content) {
    // Process @mentions
    content = content.replace(/@([a-zA-Z0-9-_]+)/g, '<span class="mention">@$1</span>');
    
    // Process issue/PR references
    content = content.replace(/#(\d+)/g, '<span class="issue-reference">#$1</span>');
    
    // Process commit SHAs
    content = content.replace(/\b([a-f0-9]{7,40})\b/g, '<span class="commit-sha">$1</span>');
    
    return content;
}

async function loadFileContentLazy(file) {
    if (!file || file.content !== null) {
        return file.content || 'Content not available';
    }
    
    // Check if we already have this content cached
    if (filesContentCache.has(file.path)) {
        return filesContentCache.get(file.path);
    }
    
    // Check if we already have a pending request for this file
    if (pendingFileRequests.has(file.path)) {
        return await pendingFileRequests.get(file.path);
    }
    
    // Create a new request promise
    const requestPromise = fetchSingleFileContent(file)
        .then(content => {
            filesContentCache.set(file.path, content);
            pendingFileRequests.delete(file.path);
            return content;
        })
        .catch(error => {
            console.error(`Failed to load content for ${file.path}:`, error);
            const errorContent = `[Error loading file: ${error.message}]`;
            filesContentCache.set(file.path, errorContent);
            pendingFileRequests.delete(file.path);
            return errorContent;
        });
    
    pendingFileRequests.set(file.path, requestPromise);
    return await requestPromise;
}