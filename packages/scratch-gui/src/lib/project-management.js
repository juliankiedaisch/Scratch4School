/**
 * Project management utilities for loading, saving, and managing projects
 */

/**
 * Fetch projects for the current user
 * @returns {Promise<Array>} - List of projects
 */
export const fetchProjects = async () => {
    const response = await fetch('/backend/api/projects', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    //console.log('[ProjectManagement] Fetched projects:', data);
    
    return Array.isArray(data.projects) ? data.projects : [];
};

/**
 * Fetch the most recent project for the current user
 * @returns {Promise<Object|null>} - Project metadata or null if no projects
 */
export const fetchRecentProject = async () => {
    const response = await fetch('/backend/api/projects/recent', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (response.status === 404) {
        //console.log('[ProjectManagement] No recent projects found');
        return null;
    }
    
    if (!response.ok) {
        throw new Error(`Failed to fetch recent project: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.project || !data.project.id) {
        //console.log('[ProjectManagement] No recent project data available');
        return null;
    }
    
    //console.log('[ProjectManagement] Found recent project:', data.project.id);
    return data.project;
};

/**
 * Fetch project metadata by ID
 * @param {string|number} projectId - Project ID
 * @returns {Promise<Object>} - Project metadata
 */
export const fetchProjectMetadata = async (projectId) => {
    const response = await fetch(`/backend/api/projects/${projectId}/metadata`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch project metadata: ${response.status}`);
    }
    
    const metadata = await response.json();
    //console.log('[ProjectManagement] Project metadata:', metadata);
    
    return metadata;
};

/**
 * Download project SB3 file by ID
 * @param {string|number} projectId - Project ID
 * @returns {Promise<ArrayBuffer>} - SB3 file data as ArrayBuffer
 */
export const downloadProjectSB3 = async (projectId) => {
    const response = await fetch(`/backend/api/projects/${projectId}/download`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to download project: ${response.status}`);
    }
    
    const sb3Data = await response.arrayBuffer();
    //console.log(`[ProjectManagement] Successfully downloaded SB3 file (${sb3Data.byteLength} bytes)`);
    
    return sb3Data;
};

/**
 * Delete a project by ID
 * @param {string|number} projectId - Project ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteProject = async (projectId) => {
    const response = await fetch(`/backend/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.status}`);
    }
    
    return true;
};

/**
 * Load a project into the VM
 * @param {string|number} projectId - Project ID
 * @param {Object} vm - Scratch VM instance
 * @param {Object} options - Additional options
 * @param {Function} options.onUpdateMetadata - Callback to update project metadata
 * @param {Function} options.onUpdateTitle - Callback to update project title
 * @returns {Promise<Object>} - Loaded project metadata
 */
export const loadProject = async (projectId, vm, options = {}) => {
    if (!vm) {
        throw new Error('Cannot load project - VM not available');
    }
    
    if (!projectId) {
        throw new Error('Cannot load project - No project ID provided');
    }
    
    console.log(`[ProjectManagement] Loading project ${projectId}${options.playerOnly ? ' in player-only mode' : ''}`);
    
    // 1. Fetch project metadata
    const metadata = await fetchProjectMetadata(projectId);
    
    // 2. Download the SB3 file
    const sb3Data = await downloadProjectSB3(projectId);
    
    // 3. Load the project into VM
    await vm.loadProject(sb3Data);
    
    // Get project title from metadata
    const title = metadata.title || 'Untitled Project';
    
    // 4. Update VM metadata
    if (vm.runtime) {
        vm.runtime.projectMetadata = {
            id: projectId,
            title: title
        };
    }
    
    // 5. Call callbacks if provided
    if (options.onUpdateMetadata) {
        options.onUpdateMetadata(projectId, title);
    }
    
    if (options.onUpdateTitle) {
        options.onUpdateTitle(title);
    }
    
    // 6. Set player-only mode if requested
    if (options.playerOnly && options.onSetPlayer) {
        options.onSetPlayer(true);
    }

    // 7. Set fullviewmode mode if requested
    if (options.onSetFullScreen && options.onSetFullScreen) {
        options.onSetFullScreen(true);
    }
    
    return metadata;
};

/**
 * Load the user's most recent project
 * @param {Object} vm - Scratch VM instance
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} - Loaded project metadata or null if no projects
 */
export const loadRecentProject = async (vm, options = {}) => {
    const recentProject = await fetchRecentProject();
    
    if (!recentProject) {
        return null;
    }
    
    return await loadProject(recentProject.id, vm, options);
};

/**
 * Fetch all groups the current user is a member of
 * @returns {Promise<Array>} - List of user's groups
 */
export const fetchUserGroups = async () => {
    try {
        const response = await fetch('/backend/api/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_id')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        return data.groups || [];
    } catch (error) {
        console.error('[ProjectManagement] Error fetching user groups:', error);
        throw error;
    }
};

/**
 * Fetch sharing information for a specific project
 * @param {string|number} projectId - Project ID
 * @returns {Promise<Array>} - List of groups the project is shared with
 */
export const fetchProjectSharing = async (projectId) => {
    try {
        const response = await fetch(`/backend/api/projects/${projectId}/sharing`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_id')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        return data.shared_with_groups || [];
    } catch (error) {
        console.error('[ProjectManagement] Error fetching project sharing info:', error);
        throw error;
    }
};

/**
 * Share a project with specified groups
 * @param {string|number} projectId - Project ID
 * @param {Array<string|number>} groupIds - Array of group IDs to share with
 * @returns {Promise<Object>} - Updated project sharing information
 */
export const shareProject = async (projectId, groupIds) => {
    try {
        const response = await fetch(`/backend/api/projects/${projectId}/share`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                group_ids: groupIds
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('[ProjectManagement] Error sharing project:', error);
        throw error;
    }
};

/**
 * Get the current sharing state of a project
 * @param {Object} project - Project object
 * @returns {Array<number>} - Array of group IDs the project is shared with
 */
export const getProjectSharingState = (project) => {
    if (project && project.shared_with_groups && Array.isArray(project.shared_with_groups)) {
        return project.shared_with_groups.map(group => group.id);
    }
    return [];
};

/**
 * Capture a screenshot of the current project stage
 * @param {Object} vm - The Scratch VM instance
 * @returns {Promise<string|null>} - Promise resolving to base64 thumbnail data or null if capture failed
 */
export const captureProjectThumbnail = async (vm) => {
    if (!vm || !vm.renderer || !vm.renderer.canvas) {
        console.warn('[captureProjectThumbnail] VM renderer or canvas not available');
        return null;
    }
    
    try {
        // Force the renderer to draw everything fresh
        if (vm.renderer && typeof vm.renderer.draw === 'function') {
            // First clear the renderer
            vm.renderer.draw();
            
            // Force multiple renders to ensure sprites are drawn
            for (let i = 0; i < 2; i++) {
                vm.renderer.draw();
                // Small pause between draws
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        
        // Wait for any pending renders to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the current stage's drawing surface
        const canvas = vm.renderer.canvas;
        
        // Make sure the stage is visible and properly sized
        if (canvas.width === 0 || canvas.height === 0) {
            console.warn('[captureProjectThumbnail] Canvas has zero dimensions');
            return null;
        }
        
        // Force one final render
        vm.renderer.draw();
        
        // Convert canvas to data URL with high quality
        const dataURL = canvas.toDataURL('image/png', 1.0);
        
        // Check for very small data - likely a black/empty image
        if (dataURL.length < 1000) {
            console.warn('[captureProjectThumbnail] Captured image appears to be empty (small data size)');
            
            // Try an alternative capture method
            try {
                // Create a temporary canvas to draw the content
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const ctx = tempCanvas.getContext('2d');
                
                // Draw current canvas to temp canvas to force refresh
                ctx.drawImage(canvas, 0, 0);
                
                // Get data from the temporary canvas
                const tempDataURL = tempCanvas.toDataURL('image/png', 1.0);
                
                if (tempDataURL.length > 1000) {
                    console.log('[captureProjectThumbnail] Fallback method succeeded');
                    return tempDataURL.split(',')[1]; // Return base64 data
                }
            } catch (e) {
                console.error('[captureProjectThumbnail] Alternative capture failed:', e);
            }
        }
        
        // Remove the data URL prefix to get just the base64 data
        const base64Data = dataURL.split(',')[1];
        
        /*console.log('[captureProjectThumbnail] Thumbnail captured successfully', {
            dataSize: dataURL.length,
            canvasSize: `${canvas.width}x${canvas.height}`
        });*/
        
        return base64Data;
    } catch (error) {
        console.error('[captureProjectThumbnail] Failed to capture thumbnail:', error);
        return null;
    }
};

/**
 * Convert base64 data to a Blob with proper type
 * @param {string} base64Data - Base64 encoded data (without data URL prefix)
 * @param {string} contentType - MIME type of the data
 * @returns {Blob} - Blob containing the data
 */
export const base64ToBlob = (base64Data, contentType = 'image/png') => {
    try {
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, { type: contentType });
    } catch (error) {
        console.error('[base64ToBlob] Error converting base64 to Blob:', error);
        return null;
    }
};

/**
 * Fetch projects that have been shared with the current user
 * @returns {Promise<Array>} - List of shared projects
 */
export const fetchSharedProjects = async () => {
    const response = await fetch('/backend/api/projects/shared', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch shared projects: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data.projects) ? data.projects : [];
};

/**
 * Create a copy of a project (useful for copying shared projects)
 * @param {string|number} projectId - ID of the project to copy
 * @returns {Promise<Object>} - The newly created project
 */
export const copyProject = async (projectId) => {
    const response = await fetch(`/backend/api/projects/${projectId}/copy`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to copy project: ${response.status}`);
    }
    
    return await response.json();
};