// Pagination and UI control functions

// Global pagination variables
let currentPage = 1;
let filesPerPage = 10;
let totalPages = 1;

/**
 * Change the number of files displayed per page
 */
function changeFilesPerPage() {
    const select = document.getElementById('files-per-page-select');
    if (!select || !repositoryData) return;
    
    filesPerPage = parseInt(select.value);
    if (filesPerPage === -1) {
        filesPerPage = repositoryData.files.length; // Show all files
    }
    currentPage = 1;
    updatePagination();
    generateEnhancedFileSections();
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    generateEnhancedFileSections();
    updatePagination();
    
    // Scroll to top of files container
    const filesContainer = document.getElementById('files-container');
    if (filesContainer) {
        filesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Update pagination controls and information
 */
function updatePagination() {
    if (!repositoryData || !repositoryData.files) return;
    
    // Use helper function to get available files and count them
    const availableFiles = getAvailableFiles();
    const totalFiles = availableFiles.length;
    totalPages = Math.ceil(totalFiles / filesPerPage);
    
    // Get both top and bottom pagination elements
    const paginationContainers = [
        document.getElementById('pagination-container-top'),
        document.getElementById('pagination-container')
    ];
    const paginationInfos = [
        document.getElementById('pagination-info-top'),
        document.getElementById('pagination-info')
    ];
    const paginations = [
        document.getElementById('pagination-top'),
        document.getElementById('pagination')
    ];
    
    // Process both top and bottom pagination
    for (let i = 0; i < 2; i++) {
        const paginationContainer = paginationContainers[i];
        const paginationInfo = paginationInfos[i];
        const pagination = paginations[i];
        
        if (!paginationContainer || !paginationInfo || !pagination) {
            console.warn(`Pagination elements not found for index ${i}`);
            continue;
        }
        
        // Show/hide pagination based on whether it's needed
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            continue;
        } else {
            paginationContainer.style.display = 'flex';
        }
        
        // Update pagination info
        const startFile = (currentPage - 1) * filesPerPage + 1;
        const endFile = Math.min(currentPage * filesPerPage, totalFiles);
        paginationInfo.textContent = `Showing ${startFile}-${endFile} of ${totalFiles} files`;
        
        // Generate pagination buttons
        pagination.innerHTML = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '‹ Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => goToPage(currentPage - 1);
        pagination.appendChild(prevBtn);
        
        // Page numbers
        const maxVisiblePages = window.innerWidth < 768 ? 3 : 7; // Fewer pages on mobile
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page and ellipsis
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '1';
            firstBtn.onclick = () => goToPage(1);
            pagination.appendChild(firstBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
        }
        
        // Page number buttons
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = pageNum.toString();
            pageBtn.className = pageNum === currentPage ? 'active' : '';
            pageBtn.onclick = () => goToPage(pageNum);
            pagination.appendChild(pageBtn);
        }
        
        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPages.toString();
            lastBtn.onclick = () => goToPage(totalPages);
            pagination.appendChild(lastBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next ›';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => goToPage(currentPage + 1);
        pagination.appendChild(nextBtn);
    }
}

/**
 * Toggle advanced controls visibility
 */
function toggleAdvancedControls() {
    const branchControls = document.getElementById('branch-controls');
    const searchControls = document.getElementById('search-controls');
    const toggleBtn = document.getElementById('toggle-advanced-btn');
    
    const isVisible = branchControls.classList.contains('show');
    
    if (isVisible) {
        branchControls.classList.remove('show');
        searchControls.classList.remove('show');
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = '⚙️ Advanced Controls';
    } else {
        branchControls.classList.add('show');
        searchControls.classList.add('show');
        toggleBtn.classList.add('active');
        toggleBtn.textContent = '⚙️ Hide Advanced Controls';
    }
}

/**
 * Adjust files per page based on screen size
 */
function adjustFilesPerPageForScreen() {
    const select = document.getElementById('files-per-page-select');
    if (!select) return;
    
    const screenWidth = window.innerWidth;
    let defaultValue;
    
    if (screenWidth < 768) {
        defaultValue = 5; // Mobile
    } else if (screenWidth < 1200) {
        defaultValue = 10; // Tablet
    } else {
        defaultValue = 15; // Desktop
    }
    
    // Only change if user hasn't manually selected a value
    if (select.value === '' || select.value === filesPerPage.toString()) {
        filesPerPage = defaultValue;
        select.value = defaultValue.toString();
        if (repositoryData) {
            currentPage = 1;
            updatePagination();
            generateEnhancedFileSections();
        }
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        changeFilesPerPage,
        goToPage,
        updatePagination,
        toggleAdvancedControls,
        adjustFilesPerPageForScreen,
        currentPage,
        filesPerPage,
        totalPages
    };
}