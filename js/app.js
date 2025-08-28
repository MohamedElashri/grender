// Main application initialization and event handlers

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initTheme();
    
    // Load saved file limit
    loadSavedFileLimit();
    
    // Adjust pagination for screen size
    adjustFilesPerPageForScreen();
    
    // Initialize footer visibility handler
    initFooterVisibility();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    console.log('Git Render application initialized');
});

// Window resize handler for responsive layout
window.addEventListener('resize', debounce(() => {
    adjustFilesPerPageForScreen();
}, 250));

// Footer visibility on scroll
function initFooterVisibility() {
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const footer = document.querySelector('.footer');
        if (!footer) return;
        
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Show footer when near bottom or scrolling up
        const nearBottom = scrollY + windowHeight >= documentHeight - 100;
        const scrollingUp = scrollY < lastScrollY;
        
        if (nearBottom || scrollingUp) {
            footer.classList.add('show');
        } else {
            footer.classList.remove('show');
        }
        
        lastScrollY = scrollY;
    });
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to render repository
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const repoInput = document.getElementById('repo-input');
            if (repoInput && document.activeElement === repoInput) {
                e.preventDefault();
                renderRepository();
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) {
                clearSearch();
            }
        }
        
        // Arrow keys for pagination (when not in input fields)
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            if (e.key === 'ArrowLeft' && currentPage > 1) {
                e.preventDefault();
                goToPage(currentPage - 1);
            }
            if (e.key === 'ArrowRight' && currentPage < totalPages) {
                e.preventDefault();
                goToPage(currentPage + 1);
            }
        }
        
        // Toggle theme with Ctrl/Cmd + D
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleTheme();
        }
    });
}

// Handle clicks on file tree links for smooth navigation
document.addEventListener('click', (e) => {
    if (e.target.matches('.file-tree a[href^="#file-"]') || 
        e.target.matches('.directory-tree a[href^="#file-"]')) {
        e.preventDefault();
        const fileName = e.target.getAttribute('href').replace('#file-', '');
        navigateToFile(fileName);
    }
});

// Error boundary for unhandled errors
window.addEventListener('error', (e) => {
    console.error('Unhandled error:', e.error);
    // Could show user-friendly error message here
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Could show user-friendly error message here
});

// Utility function to check if we're in development mode
function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('dev');
}

// Export for use in other modules if needed
window.GitRender = {
    utils: {
        formatBytes,
        isMarkdownFile,
        isJupyterNotebook,
        truncateText,
        validateRepoUrl,
        storage,
        urlUtils,
        errorUtils,
        domUtils
    },
    api: {
        getGitHubHeaders,
        checkRateLimit,
        parseRepoUrl,
        fetchSingleFileContent,
        fetchBranchesAndTags,
        fetchCommitInfo
    },
    theme: {
        toggleTheme,
        initTheme
    },
    views: {
        showView,
        refreshApp
    },
    pagination: {
        goToPage,
        changeFilesPerPage,
        updatePagination
    }
};