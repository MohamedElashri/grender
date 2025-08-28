// Theme management functionality

// Theme management
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
    
    // Update highlight.js theme
    const lightLink = document.getElementById('highlight-light');
    const darkLink = document.getElementById('highlight-dark');
    
    if (lightLink && darkLink) {
        if (currentTheme === 'dark') {
            lightLink.disabled = true;
            darkLink.disabled = false;
        } else {
            lightLink.disabled = false;
            darkLink.disabled = true;
        }
    }
    
    localStorage.setItem('git-render-theme', currentTheme);
}

// Initialize theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('git-render-theme');
    if (savedTheme && savedTheme !== currentTheme) {
        toggleTheme();
    }
}