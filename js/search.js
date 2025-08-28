// Search functionality

// Global search state
let searchResults = [];
let isSearchActive = false;
let searchTimeout = null;

// Handle search input with debouncing
function handleSearchInput(event) {
    clearTimeout(searchTimeout);
    
    if (event.key === 'Enter') {
        performSearch();
        return;
    }
    
    // Debounce search for 300ms
    searchTimeout = setTimeout(() => {
        const query = event.target.value.trim();
        if (query.length >= 2) {
            performSearch();
        } else if (query.length === 0) {
            clearSearch();
        }
    }, 300);
}

// Perform search across files
async function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value.trim();
    
    if (!query || !repositoryData || !repositoryData.files) return;
    
    const searchBtn = document.getElementById('search-btn');
    searchBtn.disabled = true;
    searchBtn.textContent = '🔄 Searching...';
    
    try {
        // Get search options
        const searchFilenames = document.getElementById('filter-filenames')?.checked ?? true;
        const searchContent = document.getElementById('filter-content')?.checked ?? true;
        const isRegex = document.getElementById('regex-search')?.checked ?? false;
        const caseSensitive = document.getElementById('case-sensitive')?.checked ?? false;
        const codeOnly = document.getElementById('filter-code')?.checked ?? false;
        
        searchResults = [];
        
        // Prepare search pattern
        let searchPattern;
        if (isRegex) {
            try {
                searchPattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
            } catch (e) {
                throw new Error(`Invalid regex pattern: ${e.message}`);
            }
        } else {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            searchPattern = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
        }
        
        // Define file type filters
        const codeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'];
        
        for (const file of repositoryData.files) {
            const ext = getFileExtension(file.path);
            
            // Apply file type filters
            if (codeOnly && !codeExtensions.includes(ext)) continue;
            
            const matches = [];
            
            // Search in filename
            if (searchFilenames) {
                const filenameMatches = [...file.path.matchAll(searchPattern)];
                if (filenameMatches.length > 0) {
                    matches.push({
                        type: 'filename',
                        text: file.path,
                        matches: filenameMatches.map(m => ({ index: m.index, text: m[0] }))
                    });
                }
            }
            
            // Search in content
            if (searchContent && file.content) {
                const lines = file.content.split('\n');
                lines.forEach((line, lineNum) => {
                    const lineMatches = [...line.matchAll(searchPattern)];
                    if (lineMatches.length > 0) {
                        matches.push({
                            type: 'content',
                            lineNumber: lineNum + 1,
                            text: line.trim(),
                            matches: lineMatches.map(m => ({ index: m.index, text: m[0] }))
                        });
                    }
                });
            }
            
            // If content is not loaded yet, try to load it for search
            if (searchContent && !file.content && matches.length === 0) {
                try {
                    await loadFileContentForSearch(file);
                    if (file.content) {
                        const lines = file.content.split('\n');
                        lines.forEach((line, lineNum) => {
                            const lineMatches = [...line.matchAll(searchPattern)];
                            if (lineMatches.length > 0) {
                                matches.push({
                                    type: 'content',
                                    lineNumber: lineNum + 1,
                                    text: line.trim(),
                                    matches: lineMatches.map(m => ({ index: m.index, text: m[0] }))
                                });
                            }
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load content for search: ${file.path}`, error);
                }
            }
            
            if (matches.length > 0) {
                searchResults.push({
                    file,
                    matches,
                    totalMatches: matches.reduce((sum, match) => sum + match.matches.length, 0)
                });
            }
        }
        
        // Sort by relevance (filename matches first, then by number of matches)
        searchResults.sort((a, b) => {
            const aHasFilename = a.matches.some(m => m.type === 'filename');
            const bHasFilename = b.matches.some(m => m.type === 'filename');
            
            if (aHasFilename && !bHasFilename) return -1;
            if (!aHasFilename && bHasFilename) return 1;
            
            return b.totalMatches - a.totalMatches;
        });
        
        displaySearchResults(query, searchResults);
        isSearchActive = true;
        
    } catch (error) {
        console.error('Search error:', error);
        alert(`Search error: ${error.message}`);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = '🔍 Search';
    }
}

// Clear search and reset view
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResultsDiv = document.getElementById('search-results');
    
    if (searchInput) searchInput.value = '';
    if (searchResultsDiv) searchResultsDiv.style.display = 'none';
    
    searchResults.length = 0;
    isSearchActive = false;
    
    clearActiveFileTypeFilters();
    resetFileView();
}

// Display search results
function displaySearchResults(query, results) {
    const searchResultsDiv = document.getElementById('search-results');
    const searchResultsList = document.getElementById('search-results-list');
    const searchResultsCount = document.getElementById('search-results-count');
    
    if (!searchResultsDiv || !searchResultsList || !searchResultsCount) return;
    
    const totalMatches = results.reduce((sum, result) => sum + result.totalMatches, 0);
    searchResultsCount.textContent = `Found ${totalMatches} matches in ${results.length} files`;
    
    searchResultsList.innerHTML = '';
    
    results.forEach(result => {
        const resultElement = createSearchResultElement(result, query);
        searchResultsList.appendChild(resultElement);
    });
    
    searchResultsDiv.style.display = 'block';
}

// Create search result element
function createSearchResultElement(result, query) {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    
    const header = document.createElement('div');
    header.className = 'search-result-header';
    header.innerHTML = `
        <a href="#file-${result.file.path}" onclick="navigateToFile('${result.file.path}')" style="color: var(--accent-primary); text-decoration: none;">${escapeHtml(result.file.path)}</a>
        <span class="search-result-matches">${result.totalMatches} matches</span>
    `;
    
    div.appendChild(header);
    
    // Show preview of matches
    const preview = document.createElement('div');
    preview.className = 'search-result-preview';
    
    const previewMatches = result.matches.slice(0, 3); // Show first 3 matches
    previewMatches.forEach(match => {
        const matchDiv = document.createElement('div');
        if (match.type === 'filename') {
            matchDiv.innerHTML = `📄 ${highlightMatches(match.text, query)}`;
        } else {
            matchDiv.innerHTML = `Line ${match.lineNumber}: ${highlightMatches(match.text, query)}`;
        }
        preview.appendChild(matchDiv);
    });
    
    if (result.matches.length > 3) {
        const more = document.createElement('div');
        more.innerHTML = `... and ${result.matches.length - 3} more matches`;
        more.style.color = 'var(--text-muted)';
        preview.appendChild(more);
    }
    
    div.appendChild(preview);
    return div;
}

// Highlight search matches in text
function highlightMatches(text, query) {
    const escapedText = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${escapedQuery})`, 'gi');
    
    return escapedText.replace(pattern, '<span class="search-highlight">$1</span>');
}

// Load file content specifically for search
async function loadFileContentForSearch(file) {
    if (!file || file.content !== null) {
        return;
    }
    
    try {
        const content = await loadFileContentLazy(file);
        file.content = content;
    } catch (error) {
        console.warn(`Failed to load content for search: ${file.path}`, error);
        file.content = '[Content not available for search]';
    }
}

// Clear search results
function clearSearchResults() {
    searchResults = [];
    isSearchActive = false;
    const searchResultsDiv = document.getElementById('search-results');
    if (searchResultsDiv) {
        searchResultsDiv.style.display = 'none';
    }
}

// Reset file view to show all files
function resetFileView() {
    // This will be handled by the file sections module
    if (typeof generateEnhancedFileSections === 'function') {
        generateEnhancedFileSections();
    }
}

// Clear active file type filters - placeholder for now
function clearActiveFileTypeFilters() {
    // This will be implemented in the filtering module
    console.log('Clearing file type filters...');
}