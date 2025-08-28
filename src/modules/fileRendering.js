// File content rendering functions

/**
 * Render file content with syntax highlighting
 */
function renderFileContent(content, filename) {
    if (isJupyterNotebook(filename)) {
        // Parse Jupyter notebook and extract readable content
        const extractedContent = parseJupyterNotebook(content);
        try {
            // Render the extracted content as markdown
            let html = marked.parse(extractedContent);
            html = processGitHubFeatures(html, extractedContent);
            return `<div class="markdown-content jupyter-notebook">
                <div class="notebook-header" style="background: var(--bg-tertiary); padding: 0.5rem 1rem; margin: -1rem -1.5rem 1rem -1.5rem; border-bottom: 1px solid var(--border-primary); font-size: 0.9rem; color: var(--text-secondary);">
                    📓 Jupyter Notebook - Parsed content (cells and outputs)
                </div>
                ${html}
            </div>`;
        } catch (error) {
            console.warn('Markdown parsing failed for Jupyter notebook:', error);
            // Fallback to escaped content
            const escapedContent = extractedContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<div class="notebook-header" style="background: var(--bg-tertiary); padding: 0.5rem 1rem; margin: -1rem -1.5rem 1rem -1.5rem; border-bottom: 1px solid var(--border-primary); font-size: 0.9rem; color: var(--text-secondary);">
                📓 Jupyter Notebook - Parsed content (fallback)
            </div>
            <pre><code>${escapedContent}</code></pre>`;
        }
    } else if (isMarkdownFile(filename)) {
        try {
            // Process the markdown with our configured marked renderer
            let html = marked.parse(content);
            
            // Post-process for additional GitHub features
            html = processGitHubFeatures(html, content);
            
            return `<div class="markdown-content">${html}</div>`;
        } catch (error) {
            console.warn('Markdown parsing failed:', error);
            // Fallback to plain text if markdown parsing fails
            const escapedContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<pre><code>${escapedContent}</code></pre>`;
        }
    } else {
        try {
            const highlighted = hljs.highlightAuto(content, [getFileExtension(filename)]);
            return `<pre class="hljs-container"><code class="hljs">${highlighted.value}</code></pre>`;
        } catch (error) {
            // Fallback to plain text with proper escaping
            const escapedContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            return `<pre><code>${escapedContent}</code></pre>`;
        }
    }
}

/**
 * Parse Jupyter notebook cells and outputs
 */
function parseJupyterNotebook(content) {
    try {
        const notebook = JSON.parse(content);
        let extractedContent = '';
        
        if (!notebook.cells || !Array.isArray(notebook.cells)) {
            return 'Invalid Jupyter notebook format: no cells found';
        }
        
        // Add notebook metadata as header
        extractedContent += '# Jupyter Notebook\n\n';
        if (notebook.metadata && notebook.metadata.kernelspec) {
            extractedContent += `**Kernel:** ${notebook.metadata.kernelspec.display_name || notebook.metadata.kernelspec.name}\n\n`;
        }
        
        notebook.cells.forEach((cell, index) => {
            const cellType = cell.cell_type;
            const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || '';
            
            if (cellType === 'markdown') {
                // Add markdown cells as-is
                if (source.trim()) {
                    extractedContent += source + '\n\n';
                }
            } else if (cellType === 'code') {
                // Add code cells with proper formatting
                if (source.trim()) {
                    // Determine language from kernel metadata
                    let language = 'python'; // Default to Python
                    if (notebook.metadata && notebook.metadata.kernelspec) {
                        const kernelName = notebook.metadata.kernelspec.name || '';
                        if (kernelName.includes('julia')) language = 'julia';
                        else if (kernelName.includes('r')) language = 'r';
                        else if (kernelName.includes('scala')) language = 'scala';
                        else if (kernelName.includes('javascript') || kernelName.includes('node')) language = 'javascript';
                    }
                    
                    extractedContent += `\`\`\`${language}\n${source}\`\`\`\n\n`;
                }
                
                // Add outputs if they exist and are text-based
                if (cell.outputs && Array.isArray(cell.outputs)) {
                    cell.outputs.forEach(output => {
                        if (output.output_type === 'stream' && output.text) {
                            const outputText = Array.isArray(output.text) ? output.text.join('') : output.text;
                            if (outputText.trim()) {
                                extractedContent += `**Output:**\n\`\`\`\n${outputText}\`\`\`\n\n`;
                            }
                        } else if (output.output_type === 'execute_result' && output.data && output.data['text/plain']) {
                            const outputText = Array.isArray(output.data['text/plain']) ? 
                                output.data['text/plain'].join('') : output.data['text/plain'];
                            if (outputText.trim()) {
                                extractedContent += `**Result:**\n\`\`\`\n${outputText}\`\`\`\n\n`;
                            }
                        } else if (output.output_type === 'error') {
                            const traceback = output.traceback ? output.traceback.join('\n') : '';
                            if (traceback.trim()) {
                                extractedContent += `**Error:**\n\`\`\`\n${traceback}\`\`\`\n\n`;
                            }
                        }
                    });
                }
            } else if (cellType === 'raw') {
                // Add raw cells as code blocks
                if (source.trim()) {
                    extractedContent += `\`\`\`\n${source}\`\`\`\n\n`;
                }
            }
        });
        
        return extractedContent;
    } catch (error) {
        console.warn('Failed to parse Jupyter notebook:', error);
        return `Error parsing Jupyter notebook: ${error.message}\n\nRaw content:\n\`\`\`json\n${content}\`\`\``;
    }
}

/**
 * Process GitHub-specific markdown features
 */
function processGitHubFeatures(html, originalContent) {
    // Handle @mentions (basic styling)
    html = html.replace(/@([a-zA-Z0-9_-]+)/g, '<span class="mention">@$1</span>');
    
    // Handle issue/PR references like #123
    html = html.replace(/#(\d+)/g, '<span class="issue-reference">#$1</span>');
    
    // Handle commit SHA references (basic 7+ char hex)
    html = html.replace(/\b([a-f0-9]{7,40})\b/g, '<code class="commit-sha">$1</code>');
    
    return html;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderFileContent,
        parseJupyterNotebook,
        processGitHubFeatures
    };
}