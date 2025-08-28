// Markdown rendering configuration and custom renderers

// Configure marked renderer for better GitHub compatibility
const renderer = new marked.Renderer();

// Custom table rendering with GitHub classes
renderer.table = function(header, body) {
    return `<div class="table-wrapper"><table class="markdown-table">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
    </table></div>`;
};

// Custom code block rendering with syntax highlighting
renderer.code = function(code, language) {
    if (language && hljs.getLanguage(language)) {
        try {
            const highlighted = hljs.highlight(code, { language: language });
            return `<div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-language">${language}</span>
                </div>
                <pre class="hljs-container"><code class="hljs language-${language}">${highlighted.value}</code></pre>
            </div>`;
        } catch (error) {
            console.warn('Syntax highlighting failed for language:', language, error);
        }
    }
    // Fallback to auto-detection or plain text
    try {
        const highlighted = hljs.highlightAuto(code);
        const detectedLanguage = highlighted.language || 'text';
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-language">${detectedLanguage}</span>
            </div>
            <pre class="hljs-container"><code class="hljs">${highlighted.value}</code></pre>
        </div>`;
    } catch (error) {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre class="code-block-wrapper"><code>${escapedCode}</code></pre>`;
    }
};

// Custom checkbox rendering for task lists
renderer.listitem = function(text) {
    const isTaskList = /^\s*\[[ xX]\]\s+/.test(text);
    if (isTaskList) {
        const isChecked = /^\s*\[[xX]\]\s+/.test(text);
        const cleanText = text.replace(/^\s*\[[ xX]\]\s+/, '');
        return `<li class="task-list-item">
            <input type="checkbox" class="task-list-item-checkbox" ${isChecked ? 'checked' : ''} disabled>
            ${cleanText}
        </li>`;
    }
    return `<li>${text}</li>`;
};

// Custom link rendering for better security
renderer.link = function(href, title, text) {
    const titleAttr = title ? ` title="${title}"` : '';
    const target = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
};

// Apply the custom renderer
marked.setOptions({ renderer: renderer });