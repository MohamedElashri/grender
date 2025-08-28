// Configuration and global variables

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    console.error('Error in file:', e.filename, 'at line:', e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// Configure marked.js for GitHub Flavored Markdown
marked.setOptions({
    gfm: true,              // Enable GitHub Flavored Markdown
    breaks: true,           // Enable line breaks
    tables: true,           // Enable tables
    sanitize: false,        // Don't sanitize HTML (we trust GitHub content)
    smartLists: true,       // Use smarter list behavior
    smartypants: false,     // Don't use "smart" typography
    headerIds: true,        // Generate header IDs
    mangle: false,          // Don't mangle header IDs
});

// Global state variables
let currentTheme = 'light';
let currentView = 'human';
let repositoryData = null;

// Pagination variables
let currentPage = 1;
let filesPerPage = 10;
let totalPages = 1;

// File processing variables
let processedFiles = 0;
let totalFilesToProcess = 0;

// Branch/tag management variables
let availableBranches = [];
let availableTags = [];
let currentBranch = null;