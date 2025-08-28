// CXML generation for LLMs

/**
 * Generate CXML format for LLMs with lazy loading support
 */
async function generateCXML(files) {
    let cxml = '<documents>\n';
    
    // Get available files and sort them properly
    const availableFiles = getAvailableFiles();
    if (!availableFiles || availableFiles.length === 0) {
        console.warn('No available files for generateCXML');
        return '<documents>\n</documents>';
    }
    
    // Sort files with README.md first for better LLM context
    const sortedFiles = sortFilesByStructure([...availableFiles]);
    
    let docIndex = 1;
    for (const file of sortedFiles) {
        // Skip binary or ignored files
        const category = categorizeFile(file.path, file.size || 0);
        if (category.category === 'ignored' || category.category === 'binary') {
            continue;
        }
        
        cxml += `<document index="${docIndex}">\n`;
        cxml += `<source>${file.path}</source>\n`;
        cxml += '<document_content>\n';
        
        // Try to get content
        if (file.content && 
            !file.content.startsWith('[Error loading file:') && 
            !file.content.startsWith('Failed to load') && 
            file.content !== '[Content not available]') {
            cxml += file.content;
        } else if (file.sha) {
            try {
                const content = await fetchSingleFileContent(file);
                if (content && 
                    !content.startsWith('[Error loading file:') && 
                    !content.startsWith('Failed to load') && 
                    content !== '[Content not available]') {
                    cxml += content;
                    // Cache the content
                    filesContentCache.set(file.path, content);
                } else {
                    // Skip files with error content
                    continue;
                }
            } catch (error) {
                // Skip files that fail to load
                continue;
            }
        } else {
            // Skip files without content or sha
            continue;
        }
        
        cxml += '\n</document_content>\n';
        cxml += '</document>\n';
        
        docIndex++;
    }
    
    cxml += '</documents>';
    return cxml;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateCXML
    };
}