import log from './log';
import { captureProjectThumbnail, base64ToBlob } from './project-management';

/**
 * Save a project to the project service as an SB3 file.
 * @param {string} projectHost the hostname of the project service.
 * @param {number} projectId the ID of the project, null if a new project.
 * @param {object} vm The Scratch VM instance.
 * @param {object} params the request params.
 * @return {Promise} A promise that resolves when the network request resolves.
 */
export default function (projectHost, projectId, vm, params) {
    /*console.log("[saveProjectToServer] Called with:", {
        projectHost,
        projectId,
        vmType: typeof vm,
        hasVmSaveProjectSb3: vm && typeof vm.saveProjectSb3 === 'function',
        paramsExist: !!params
    });*/
    // Get the session ID from localStorage
    const sessionId = localStorage.getItem('session_id');
    document.dispatchEvent(new CustomEvent('projectSaveStarted'));
    
    if (!sessionId) {
        console.warn('[saveProjectToServer] No session ID found, cannot save project');
        return Promise.reject(new Error('Authentication required to save project'));
    }

    if (!vm || typeof vm.saveProjectSb3 !== 'function') {
        console.error('[saveProjectToServer] Invalid VM or saveProjectSb3 not available');
        return Promise.reject(new Error('Invalid VM instance'));
    }

    // Build query params
    const queryParams = {};
    if (params && params.title) {
        queryParams.title = params.title;
    }
    
    // Add other params
    if (params) {
        if (Object.prototype.hasOwnProperty.call(params, 'originalId')) queryParams.original_id = params.originalId;
        if (Object.prototype.hasOwnProperty.call(params, 'isCopy')) queryParams.is_copy = params.isCopy;
        if (Object.prototype.hasOwnProperty.call(params, 'isRemix')) queryParams.is_remix = params.isRemix;
    }
    
    // Build query string
    let qs = '';
    if (Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams();
        for (const key in queryParams) {
            searchParams.append(key, queryParams[key]);
        }
        qs = `?${searchParams.toString()}`;
    }
    
    // Use /backend prefix
    const creatingProject = projectId === null || typeof projectId === 'undefined' || projectId === '0';
    const url = `${projectHost}${qs}`;
    
    //console.log(`[saveProjectToServer] ${creatingProject ? 'Creating' : 'Updating'} project at: ${url}`);
    
    // First capture thumbnail, then save project data
    return Promise.all([
        captureProjectThumbnail(vm),  // Capture thumbnail first
        vm.saveProjectSb3()           // Save project data in parallel
    ])
    .then(([thumbnailBase64, sb3Data]) => {
        /*console.log('[saveProjectToServer] Got SB3 data:', {
            type: typeof sb3Data,
            isBlob: sb3Data instanceof Blob,
            size: sb3Data instanceof Blob ? sb3Data.size : 'unknown',
            hasThumbnail: !!thumbnailBase64
        });*/
        
        // Verify we got valid SB3 data
        if (!(sb3Data instanceof Blob)) {
            console.error('[saveProjectToServer] VM.saveProjectSb3() did not return a Blob');
            if (sb3Data instanceof ArrayBuffer) {
                // Convert ArrayBuffer to Blob
                sb3Data = new Blob([sb3Data], { type: 'application/x.scratch.sb3' });
                console.log('[saveProjectToServer] Converted ArrayBuffer to Blob');
            } else {
                return Promise.reject(new Error('Invalid SB3 data format'));
            }
        }
        
        // Create FormData object to upload the file
        const formData = new FormData();
        
        // Add the SB3 blob to FormData as a file
        const timestamp = Date.now();
        const filename = `project-${timestamp}.sb3`;
        formData.append('project_file', sb3Data, filename);

        // Add thumbnail if available
        if (thumbnailBase64) {
            //console.log('[saveProjectToServer] Adding thumbnail to form data');
            const thumbnailBlob = base64ToBlob(thumbnailBase64);
            const thumbnailFileName = `thumbnail-${timestamp}.png`;
            formData.append('thumbnail', thumbnailBlob, thumbnailFileName);
        } else {
            console.log('[saveProjectToServer] No thumbnail captured');
        }
        
        //console.log(`[saveProjectToServer] Sending SB3 file "${filename}" to server (${sb3Data.size} bytes)`);
        
        // Send the SB3 file to the server using fetch
        return fetch(url, {
            method: creatingProject ? 'POST' : 'PUT',
            headers: {
                'Authorization': `Bearer ${sessionId}`
                // Don't set Content-Type - fetch will set it automatically with boundary
            },
            body: formData
        });
    })
    .catch(error => {
        console.error('[saveProjectToServer] Error preparing project data:', error);
        document.dispatchEvent(new CustomEvent('projectSaveError', {
            detail: { error }
        }));
        throw new Error(`Failed to prepare project data: ${error.message}`);
    })
    .then(response => {
        if (!response.ok) {
            console.error(`[saveProjectToServer] Save failed with status: ${response.status}`);
            document.dispatchEvent(new CustomEvent('projectSaveError', {
                detail: `${response.status}`
            }));
            return response.text().then(text => {
                console.error('Response body:', text);
                
                // Try to parse as JSON for more detailed error messages
                try {
                    const errorJson = JSON.parse(text);
                    if (errorJson.error) {
                        throw new Error(`HTTP ${response.status}: ${errorJson.error}`);
                    }
                } catch (e) {
                    // If parsing fails, use the raw text
                }
                
                throw new Error(`HTTP ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        //console.log('[saveProjectToServer] Save successful, response:', data);
        document.dispatchEvent(new CustomEvent('projectSaved', {
            detail: { data }
        }));
        // Get the numeric project ID from the response
        if (data.id !== undefined) {
            // Ensure ID is a number
            data.id = Number(data.id);
        } else if (data['content-name'] !== undefined) {
            // Fallback to content-name field
            data.id = Number(data['content-name']);
        }
        
        if (isNaN(data.id)) {
            console.warn('[saveProjectToServer] Non-numeric ID returned:', data.id);
        }
        
        return data;
    });
}