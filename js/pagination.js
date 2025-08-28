// Pagination functionality

// Pagination functions
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

function updatePagination() {
    if (!repositoryData || !repositoryData.files) return;
    
    // Use helper function to get available files and count them
    const availableFiles = getAvailableFiles(repositoryData.files);
    const totalFiles = availableFiles.length;
    
    if (totalFiles === 0) {
        document.querySelectorAll('.pagination-container').forEach(container => {
            container.style.display = 'none';
        });
        return;
    }
    
    totalPages = Math.ceil(totalFiles / filesPerPage);
    
    // Update pagination info
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = Math.min(startIndex + filesPerPage, totalFiles);
    
    const paginationInfos = document.querySelectorAll('.pagination-info');
    paginationInfos.forEach(info => {
        info.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalFiles} files`;
    });
    
    // Generate pagination buttons
    const paginationContainers = document.querySelectorAll('.pagination');
    paginationContainers.forEach(container => {
        generatePaginationButtons(container);
    });
    
    // Show/hide pagination containers
    const shouldShowPagination = totalPages > 1;
    document.querySelectorAll('.pagination-container').forEach(container => {
        container.style.display = shouldShowPagination ? 'flex' : 'none';
    });
}

function generatePaginationButtons(container) {
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.title = 'Previous page';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    container.appendChild(prevBtn);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => goToPage(1);
        container.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'ellipsis';
            container.appendChild(ellipsis);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i.toString();
        pageBtn.onclick = () => goToPage(i);
        
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        
        container.appendChild(pageBtn);
    }
    
    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'ellipsis';
            container.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages.toString();
        lastBtn.onclick = () => goToPage(totalPages);
        container.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.title = 'Next page';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    container.appendChild(nextBtn);
}

function adjustFilesPerPageForScreen() {
    const select = document.getElementById('files-per-page-select');
    if (!select) return;
    
    const screenWidth = window.innerWidth;
    
    if (screenWidth < 768 && parseInt(select.value) > 20) {
        // On mobile, don't show too many files at once
        select.value = "10";
        changeFilesPerPage();
    } else if (screenWidth >= 768 && screenWidth < 1024 && parseInt(select.value) > 50) {
        // On tablet, moderate number of files
        select.value = "20";
        changeFilesPerPage();
    }
}

// Navigation functions moved to directory-tree.js to avoid duplication