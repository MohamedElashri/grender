// View management functionality

// View switching
function showView(view) {
    currentView = view;
    const humanView = document.getElementById('human-view');
    const llmView = document.getElementById('llm-view');
    const humanBtn = document.getElementById('human-btn');
    const llmBtn = document.getElementById('llm-btn');

    if (!humanView || !llmView || !humanBtn || !llmBtn) {
        console.warn('View switching elements not found');
        return;
    }

    if (view === 'human') {
        humanView.style.display = 'block';
        llmView.style.display = 'none';
        humanBtn.classList.add('active');
        llmBtn.classList.remove('active');
    } else {
        humanView.style.display = 'none';
        llmView.style.display = 'block';
        humanBtn.classList.remove('active');
        llmBtn.classList.add('active');
        
        // Auto-select text for easy copying
        setTimeout(() => {
            const textarea = document.getElementById('llm-textarea');
            if (textarea) {
                textarea.focus();
                textarea.select();
            }
        }, 100);
    }
}

// Refresh app
function refreshApp() {
    const repoInput = document.getElementById('repo-input');
    const resultsContainer = document.getElementById('results-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    if (repoInput) repoInput.value = '';
    if (resultsContainer) resultsContainer.classList.remove('show');
    repositoryData = null;
    currentPage = 1;
    if (paginationContainer) paginationContainer.style.display = 'none';
}