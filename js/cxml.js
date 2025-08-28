// CXML generation for LLM consumption

async function generateCXML(files) {
    if (!files || !Array.isArray(files)) {
        return 'No files available for CXML generation.';
    }
    
    const availableFiles = getAvailableFiles();
    const sortedFiles = sortFilesByStructure(availableFiles);
    
    let cxml = `<CXML>\n<Repository>\n<Name>${repositoryData.repoInfo.full_name}</Name>\n<Description>${repositoryData.repoInfo.description || 'No description'}</Description>\n<Language>${repositoryData.repoInfo.language || 'Mixed'}</Language>\n<Stars>${repositoryData.repoInfo.stargazers_count || 0}</Stars>\n<Forks>${repositoryData.repoInfo.forks_count || 0}</Forks>\n</Repository>\n\n`;
    
    // Add directory structure if available
    if (repositoryData.treeStructure) {
        cxml += `<DirectoryStructure>\n<![CDATA[\n${repositoryData.treeStructure}\n]]>\n</DirectoryStructure>\n\n`;
    }
    
    // Add repository statistics
    const stats = {
        totalFiles: repositoryData.allFiles ? repositoryData.allFiles.length : 0,
        processedFiles: sortedFiles.length,
        totalSize: repositoryData.totalSize || 0
    };
    
    cxml += `<Statistics>\n<TotalFiles>${stats.totalFiles}</TotalFiles>\n<ProcessedFiles>${stats.processedFiles}</ProcessedFiles>\n<TotalSize>${formatBytes(stats.totalSize)}</TotalSize>\n</Statistics>\n\n`;
    
    // Add files
    cxml += `<Files>\n`;
    
    let processedCount = 0;
    const maxFiles = Math.min(sortedFiles.length, 100); // Limit for CXML to avoid huge output
    
    for (const file of sortedFiles.slice(0, maxFiles)) {
        try {
            cxml += `<File>\n<Path>${escapeXml(file.path)}</Path>\n<Size>${file.size || 0}</Size>\n`;
            
            // Load content if not already loaded
            let content = file.content;
            if (content === null) {
                try {
                    content = await loadFileContentLazy(file);
                } catch (error) {
                    content = `[Error loading content: ${error.message}]`;
                }
            }
            
            if (content && !content.startsWith('[Error loading file:') && content !== '[Content not available]') {
                // For CXML, we want the raw content, not rendered HTML
                const truncatedContent = content.length > 10000 ? 
                    content.substring(0, 10000) + '\n... [Content truncated for CXML]' : 
                    content;
                
                cxml += `<Content><![CDATA[${truncatedContent}]]></Content>\n`;
            } else {
                cxml += `<Content><![CDATA[${content || 'Content not available'}]]></Content>\n`;
            }
            
            cxml += `</File>\n\n`;
            processedCount++;
            
        } catch (error) {
            console.error(`Error processing file ${file.path} for CXML:`, error);
            cxml += `<File>\n<Path>${escapeXml(file.path)}</Path>\n<Size>${file.size || 0}</Size>\n<Content><![CDATA[[Error processing file: ${error.message}]]]></Content>\n</File>\n\n`;
        }
    }
    
    if (sortedFiles.length > maxFiles) {
        cxml += `<!-- Note: Only showing first ${maxFiles} files out of ${sortedFiles.length} total files for CXML size management -->\n`;
    }
    
    cxml += `</Files>\n</CXML>`;
    
    return cxml;
}

function escapeXml(text) {
    if (typeof text !== 'string') return '';
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}