// Utility functions and helpers

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isMarkdownFile(filename) {
    const ext = getFileExtension(filename);
    return ['md', 'markdown', 'mdown', 'mkd', 'mkdn'].includes(ext);
}

function isJupyterNotebook(filename) {
    const ext = getFileExtension(filename);
    return ext === 'ipynb';
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

function loadSavedFileLimit() {
    const fileLimitInput = document.getElementById('file-limit');
    const savedLimit = localStorage.getItem('git-render-file-limit');
    
    if (fileLimitInput && savedLimit) {
        const limit = parseInt(savedLimit);
        if (!isNaN(limit) && limit > 0 && limit <= 2000) {
            fileLimitInput.value = limit.toString();
        }
    }
}

function validateRepoUrl(url) {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_.]+\/?(\?.*)?$/;
    return githubPattern.test(url);
}

function toggleTokenVisibility() {
    const tokenInput = document.getElementById('github-token');
    const toggleBtn = document.getElementById('token-toggle');
    
    if (!tokenInput || !toggleBtn) return;
    
    if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        toggleBtn.textContent = '🙈 Hide Token';
    } else {
        tokenInput.type = 'password';
        toggleBtn.textContent = '👁️ Show Token';
    }
}

function resetFileLimit() {
    const fileLimitInput = document.getElementById('file-limit');
    if (!fileLimitInput) return;
    
    fileLimitInput.value = '';
    localStorage.removeItem('git-render-file-limit');
    
    // Show confirmation
    const resetBtn = document.getElementById('reset-limit-btn');
    if (resetBtn) {
        const originalText = resetBtn.textContent;
        resetBtn.textContent = '✅ Reset';
        resetBtn.style.background = 'var(--accent-primary)';
        resetBtn.style.color = 'white';
        
        setTimeout(() => {
            resetBtn.textContent = originalText;
            resetBtn.style.background = '';
            resetBtn.style.color = '';
        }, 1500);
    }
}

function showFileLimitInfo() {
    const infoDiv = document.getElementById('file-limit-info');
    const infoBtn = document.getElementById('limit-info-btn');
    
    if (!infoDiv || !infoBtn) return;
    
    if (infoDiv.style.display === 'none' || !infoDiv.style.display) {
        infoDiv.style.display = 'block';
        infoBtn.textContent = '❌ Hide';
        infoBtn.style.background = 'var(--accent-primary)';
        infoBtn.style.color = 'white';
    } else {
        infoDiv.style.display = 'none';
        infoBtn.textContent = 'ℹ️ Info';
        infoBtn.style.background = '';
        infoBtn.style.color = '';
    }
}

function getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// Debounce utility for search
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Generate unique ID for elements
function generateId(prefix = 'item') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check if element is visible in viewport
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Smooth scroll to element
function scrollToElement(element, options = {}) {
    if (!element) return;
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
}

// Local storage utilities
const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Error writing to localStorage:', error);
            return false;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Error removing from localStorage:', error);
            return false;
        }
    }
};

// URL utilities
const urlUtils = {
    parseRepoUrl: (url) => {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
        if (!match) return null;
        
        const owner = match[1];
        let repo = match[2];
        
        if (repo.endsWith('.git')) {
            repo = repo.slice(0, -4);
        }
        
        return { owner, repo };
    },
    
    isGitHubUrl: (url) => {
        return /^https?:\/\/(www\.)?github\.com\//.test(url);
    }
};

// Error handling utilities
const errorUtils = {
    handleApiError: (error, context = '') => {
        let userMessage = 'An unexpected error occurred.';
        
        if (error.message.includes('rate limit')) {
            userMessage = 'GitHub API rate limit exceeded. Please add a GitHub token or try again later.';
        } else if (error.message.includes('404')) {
            userMessage = 'Repository not found. Please check the URL and make sure the repository is public.';
        } else if (error.message.includes('403')) {
            userMessage = 'Access denied. The repository might be private or you need a valid GitHub token.';
        } else if (error.message.includes('401')) {
            userMessage = 'Unauthorized. Please check your GitHub token.';
        } else if (error.message.includes('network')) {
            userMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        console.error(`Error ${context}:`, error);
        return userMessage;
    }
};

// DOM utilities
const domUtils = {
    createElement: (tag, attributes = {}, content = '') => {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else {
                element.appendChild(content);
            }
        }
        
        return element;
    },
    
    show: (element) => {
        if (element) element.style.display = 'block';
    },
    
    hide: (element) => {
        if (element) element.style.display = 'none';
    },
    
    toggle: (element) => {
        if (!element) return;
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
};