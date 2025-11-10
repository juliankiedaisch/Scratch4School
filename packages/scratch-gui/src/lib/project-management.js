/**
 * Unified Project Management
 * Handles ALL backend communication for projects (normal, collaborative, shared)
 */

const API_BASE = '/backend/api';
const PROJECTS_BASE = `${API_BASE}/projects`;
const COLLAB_BASE = `${API_BASE}/collaboration`;

// ============================================================
// AUTHENTICATION & SESSION
// ============================================================

const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('session_id')}`
});

const getAuthHeadersJSON = () => ({
    'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
    'Content-Type': 'application/json'
});

// ============================================================
// PROJECT FETCHING
// ============================================================

/**
 * Fetch ALL user's collaborative projects
 * Backend returns only collaborative projects user has access to
 */
export const fetchAllUserProjects = async () => {
    const response = await fetch(`${PROJECTS_BASE}/all-with-collaborative`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Fetched user projects:', data);
    
    return data.projects || [];
};

/**
 * Fetch projects owned by the current user
 */
export const fetchOwnedProjects = async () => {
    const response = await fetch(`${PROJECTS_BASE}/owned`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch owned projects: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Fetched owned projects:', data);
    
    return data.projects || [];
};

/**
 * Fetch collaboration projects (write/admin permission, not owner)
 */
export const fetchCollaborationProjects = async () => {
    const response = await fetch(`${PROJECTS_BASE}/collaboration`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch collaboration projects: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Fetched collaboration projects:', data);
    
    return data.projects || [];
};

/**
 * Fetch projects shared with the current user (READ permission only)
 */
export const fetchSharedProjects = async () => {
    const response = await fetch(`${PROJECTS_BASE}/shared`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch shared projects: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Fetched shared projects:', data);
    
    return data.projects || [];
};


export const fetchAvailableUsers = async (collabProjectId) => {

    const response = await fetch(`/backend/api/users?collab_id=${collabProjectId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
            
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
            
    const data = await response.json();
    return data.users || [];
};

/**
 * Fetch recent project metadata
 */
export const fetchRecentProject = async () => {
    const response = await fetch(`${PROJECTS_BASE}/recent`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (response.status === 404) {
        return null;
    }
    
    if (!response.ok) {
        throw new Error(`Failed to fetch recent project: ${response.status}`);
    }
    
    const data = await response.json();
    return data.project || null;
};

// ============================================================
// PROJECT METADATA & DOWNLOAD
// ============================================================

/**
 * Fetch project metadata by ID
 * Works for: normal projects, commits, working copies, collaborative projects
 * Automatically detects if the ID is for a collaborative project or a regular project
 */
export const fetchProjectMetadata = async (projectId, isCollaborative = null) => {
    // If isCollaborative is explicitly set, use the appropriate endpoint
    if (isCollaborative === true) {
        return await fetchCollaborativeProjectMetadata(projectId);
    }
    
    // Try regular project metadata first
    const response = await fetch(`${PROJECTS_BASE}/${projectId}/metadata`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    // If regular project metadata fails with 404, try collaborative project metadata
    if (!response.ok && response.status === 404) {
        console.log(`[ProjectManager] Project ${projectId} not found as regular project, trying collaborative...`);
        try {
            return await fetchCollaborativeProjectMetadata(projectId);
        } catch (collabError) {
            console.error(`[ProjectManager] Failed to fetch as collaborative project:`, collabError);
            throw new Error(`Failed to fetch metadata for project ${projectId}`);
        }
    }
    
    if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    
    const metadata = await response.json();
    console.log('[ProjectManager] Metadata:', metadata);
    
    return metadata;
};

/**
 * Download project SB3 file
 * Works for: normal projects, commits, working copies, collaborative projects
 * Automatically detects if the ID is for a collaborative project or a regular project
 */
export const downloadProjectSB3 = async (projectId, isCollaborative = null) => {
    // If isCollaborative is explicitly set, use the appropriate endpoint
    if (isCollaborative === true) {
        return await downloadCollaborativeProject(projectId);
    }
    
    // Try regular project download first
    const response = await fetch(`${PROJECTS_BASE}/${projectId}/download`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    // If regular project download fails with 404, try collaborative project download
    if (!response.ok && response.status === 404) {
        console.log(`[ProjectManager] Project ${projectId} not found as regular project, trying collaborative...`);
        try {
            return await downloadCollaborativeProject(projectId);
        } catch (collabError) {
            console.error(`[ProjectManager] Failed to download as collaborative project:`, collabError);
            throw new Error(`Failed to download project ${projectId}`);
        }
    }
    
    if (!response.ok) {
        throw new Error(`Failed to download project: ${response.status}`);
    }
    
    const sb3Data = await response.arrayBuffer();
    console.log(`[ProjectManager] Downloaded SB3 (${sb3Data.byteLength} bytes)`);
    
    return sb3Data;
};


/**
 * Download plain project SB3 file
 */
export const downloadPlainSB3 = async () => {
  
    // Try regular project download first
    const response = await fetch(`${PROJECTS_BASE}/plain_project`, {
        method: 'GET',
    });
    
    if (!response.ok) {
        throw new Error(`Failed to download plain project: ${response.status}`);
    }
    
    const sb3Data = await response.arrayBuffer();
    console.log(`[ProjectManager] Downloaded SB3 (${sb3Data.byteLength} bytes)`);
    
    return sb3Data;
};

/**
 * Download collaborative project (latest commit)
 * For shared projects accessed via groups
 */
export const downloadCollaborativeProject = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/download`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to download collaborative project: ${response.status}`);
    }
    
    const sb3Data = await response.arrayBuffer();
    console.log(`[ProjectManager] Downloaded collaborative project (${sb3Data.byteLength} bytes)`);
    
    return sb3Data;
};

/**
 * Fetch collaborative project metadata
 * For shared projects accessed via groups
 */
export const fetchCollaborativeProjectMetadata = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/metadata`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch collaborative metadata: ${response.status}`);
    }
    
    const metadata = await response.json();
    console.log('[ProjectManager] Collaborative metadata:', metadata);
    
    return metadata;
};

// ============================================================
// PROJECT LOADING (VM Integration)
// ============================================================

/**
 * Load a project into the VM
 * Works for: normal projects, commits, working copies
 */
export const loadProject = async (projectId, vm, options = {}) => {
    if (!vm) {
        throw new Error('VM not available');
    }
    
    // Ensure projectId is a number for consistency with save operations
    const numericProjectId = Number(projectId);
    
    console.log('[ProjectManager] Loading project:', numericProjectId);
    
    // 1. Fetch metadata
    let metadata;
    if (projectId === null || projectId == 0 || projectId === '0') {
        metadata = {
            id: 0,
            title: 'Untitled Project',
            isCollaborative: false,
            isCommit: false,
            isWorkingCopy: false,
            isReadOnly: false
        };
    } else {
        metadata = await fetchProjectMetadata(numericProjectId);
    }
    
    // 2. Download SB3
    let sb3Data;
    if (projectId === null || projectId == 0 || projectId === '0') {
        sb3Data = await downloadPlainSB3();
    } else {
        sb3Data = await downloadProjectSB3(numericProjectId);
    }
    
    const title = metadata.title || 'Untitled Project';
    
    // 3. Update VM metadata BEFORE loading project so it's available in PROJECT_LOADED event
    if (vm.runtime) {
        vm.runtime.projectMetadata = {
            id: numericProjectId,
            title: title,
            isCollaborative: metadata.is_collaborative,
            isCommit: metadata.is_commit,
            isWorkingCopy: metadata.is_working_copy,
            isReadOnly: metadata.is_read_only || false
        };
    }
    
    // 4. Load into VM (this will fire PROJECT_LOADED event with metadata already set)
    await vm.loadProject(sb3Data);
    
    // 5. Update UserContext
    if (options.userContext) {
        const userContext = options.userContext;
        
        userContext.setProjectId(numericProjectId);
        userContext.setProjectTitle(title);
        userContext.setProjectChanged(false);
        
        if (metadata.is_collaborative) {
            userContext.setIsCollaborative(true);
            
            if (metadata.collaborative_project) {
                userContext.setCollaborativeProjectId(metadata.collaborative_project.id);
            }
        } else {
            userContext.setIsCollaborative(false);
            userContext.setCollaborativeProjectId(null);
        }
    }
    
    // 6. Callbacks
    if (options.onUpdateMetadata) {
        options.onUpdateMetadata(numericProjectId, title);
    }
    
    if (options.onUpdateTitle) {
        options.onUpdateTitle(title);
    }
    
    // 7. Player mode for read-only
    if ((options.playerOnly || metadata.is_read_only) && options.onSetPlayer) {
        options.onSetPlayer(true);
    }
    
    console.log('[ProjectManager] Project loaded successfully');
    
    return metadata;
};

/**
 * Load recent project
 */
export const loadRecentProject = async (vm, options = {}) => {
    const recentProject = await fetchRecentProject();
    
    if (!recentProject) {
        return null;
    }
    
    return await loadProject(recentProject.id, vm, options);
};

// ============================================================
// COLLABORATION DATA
// ============================================================

/**
 * Fetch all collaboration data for a project
 * Returns: { commits, collaborators, working_copies, user_permission }
 */
export const fetchCollaborationData = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/data`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch collaboration data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Collaboration data:', data);
    
    return data;
};

/**
 * Update collaborative project properties (name, description)
 * Only owner or admin can update
 */
export const updateCollaborativeProject = async (collabProjectId, updates) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}`, {
        method: 'PUT',
        headers: getAuthHeadersJSON(),
        body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
        throw new Error(`Failed to update collaborative project: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ProjectManager] Updated collaborative project:', data);
    
    return data;
};

/**
 * Fetch commit history
 */
export const fetchCommits = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch commits');
    }
    
    const data = await response.json();
    return data.commits || [];
};

/**
 * Fetch specific commit
 */
export const fetchCommit = async (collabProjectId, commitNumber) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits/${commitNumber}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch commit');
    }
    
    return response.json();
};

// ============================================================
// WORKING COPY MANAGEMENT
// ============================================================

/**
 * Load working copy into editor
 */
export const loadWorkingCopy = async (collabProjectId, vm, userContext) => {
    console.log('[ProjectManager] Loading working copy for:', collabProjectId);
    
    // Get working copy metadata
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/working-copy/info`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch working copy info');
    }
    
    const wcInfo = await response.json();
    
    if (!wcInfo.has_working_copy) {
        throw new Error('No working copy found');
    }
    
    const projectId = wcInfo.project_id;
    
    // Load using unified loadProject
    const metadata = await loadProject(projectId, vm, {
        userContext: userContext,
        onUpdateMetadata: (id, title) => {
            if (userContext) {
                userContext.setProjectId(id);
                userContext.setProjectTitle(title);
                userContext.setProjectChanged(false);
            }
        }
    });
    
    return {
        projectId: projectId,
        collaborativeProjectId: collabProjectId,
        metadata: metadata
    };
};

/**
 * Load specific commit (read-only)
 */
export const loadCommit = async (collabProjectId, commitNumber, vm, userContext, options = {}) => {
    console.log('[ProjectManager] Loading commit:', { collabProjectId, commitNumber });
    
    // Get commit info
    const commit = await fetchCommit(collabProjectId, commitNumber);
    const projectId = commit.commit.project_id;
    
    // Load using unified loadProject (read-only)
    const metadata = await loadProject(projectId, vm, {
        userContext: userContext,
        playerOnly: true,
        onUpdateTitle: options.onUpdateTitle,
        onUpdateMetadata: options.onUpdateMetadata || ((id, title) => {
            if (userContext) {
                userContext.setProjectId(id);
                userContext.setProjectTitle(title);
                userContext.setProjectChanged(false);
            }
        }),
        onSetPlayer: options.onSetPlayer
    });
    
    return {
        projectId: projectId,
        collaborativeProjectId: collabProjectId,
        commitNumber: commitNumber,
        metadata: metadata
    };
};

/**
 * Load working copy by commit ID
 */
export const loadWorkingCopyByCommit = async (collabProjectId, commitId, vm, userContext, options = {}) => {
    console.log('[ProjectManager] Loading working copy for commit:', commitId);
    
    // Get all working copies
    const data = await fetchCollaborationData(collabProjectId);
    
    // Find working copy for this commit
    const workingCopy = Object.values(data.working_copies || {}).find(
        wc => wc.based_on_commit_id === commitId
    );
    
    if (!workingCopy) {
        throw new Error('Working copy not found for this commit');
    }
    
    const projectId = workingCopy.project_id;
    
    // Load using unified loadProject, forwarding all callbacks
    const metadata = await loadProject(projectId, vm, {
        userContext: userContext,
        onUpdateTitle: options.onUpdateTitle,
        onUpdateMetadata: options.onUpdateMetadata,
        onSetPlayer: options.onSetPlayer
    });
    
    return {
        projectId: projectId,
        collaborativeProjectId: collabProjectId,
        basedOnCommitId: commitId,
        metadata: metadata
    };
};

/**
 * Create working copy from commit
 */
export const createWorkingCopyFromCommit = async (collabProjectId, commitNumber) => {
    console.log('[ProjectManager] Creating working copy from commit:', commitNumber);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits/${commitNumber}/load`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create working copy');
    }
    
    return response.json();
};

/**
 * Commit working copy
 */
export const commitWorkingCopy = async (collabProjectId, commitMessage) => {
    console.log('[ProjectManager] Committing changes:', commitMessage);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commit`, {
        method: 'POST',
        headers: getAuthHeadersJSON(),
        body: JSON.stringify({
            message: commitMessage || 'Update'
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to commit');
    }
    
    return response.json();
};

/**
 * Delete working copy for specific commit
 */
export const deleteWorkingCopy = async (collabProjectId, commitId) => {
    console.log('[ProjectManager] Deleting working copy for commit:', commitId);
    
    // Get commit number
    const commits = await fetchCommits(collabProjectId);
    const commit = commits.find(c => c.project_id === commitId);
    
    if (!commit) {
        throw new Error('Commit not found');
    }
    
    const response = await fetch(
        `${COLLAB_BASE}/${collabProjectId}/commits/${commit.commit_number}/working-copy`,
        {
            method: 'DELETE',
            headers: getAuthHeaders()
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete working copy');
    }
    
    return response.json();
};

// ============================================================
// PERMISSIONS MANAGEMENT
// ============================================================

/**
 * Fetch permissions for a collaborative project
 */
export const fetchPermissions = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/permissions`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch permissions');
    }
    
    const data = await response.json();
    return data;
};

/**
 * Grant permission to user or group
 * @param {number} collabProjectId - Collaborative project ID
 * @param {Object} params - { user_id OR group_id, permission: 'admin'|'write'|'read' }
 */
export const grantPermission = async (collabProjectId, params) => {
    console.log('[ProjectManager] Granting permission:', params);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/permissions`, {
        method: 'POST',
        headers: getAuthHeadersJSON(),
        body: JSON.stringify(params)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to grant permission');
    }
    
    return response.json();
};

/**
 * Revoke permission
 */
export const revokePermission = async (collabProjectId, permissionId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to revoke permission');
    }
    
    return response.json();
};

// ============================================================
// PROJECT ACTIONS
// ============================================================

/**
 * Copy project (for shared projects)
 */
export const copyProject = async (projectId) => {
    const response = await fetch(`${COLLAB_BASE}/${projectId}/copy`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy project');
    }
    
    return response.json();
};

/**
 * Delete or leave collaborative project
 * - Owner: Deletes entire project
 * - Collaborator: Leaves project, keeps working copies as standalone
 */
export const deleteOrLeaveProject = async (collabProjectId) => {
    console.log('[ProjectManager] Deleting/leaving project:', collabProjectId);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete/leave project');
    }
    
    return response.json();
};

// ============================================================
// GROUPS
// ============================================================

/**
 * Fetch user's groups
 */
export const fetchUserGroups = async () => {
    const response = await fetch(`${API_BASE}/groups`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch groups');
    }
    
    const data = await response.json();
    return data.groups || [];
};

// ============================================================
// THUMBNAILS
// ============================================================

/**
 * Capture project thumbnail from VM
 */
export const captureProjectThumbnail = async (vm) => {
    if (!vm || !vm.renderer || !vm.renderer.canvas) {
        console.warn('[ProjectManager] VM renderer not available');
        return null;
    }
    
    try {
        // Force render
        if (vm.renderer && typeof vm.renderer.draw === 'function') {
            vm.renderer.draw();
            
            for (let i = 0; i < 2; i++) {
                vm.renderer.draw();
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = vm.renderer.canvas;
        
        if (canvas.width === 0 || canvas.height === 0) {
            console.warn('[ProjectManager] Canvas has zero dimensions');
            return null;
        }
        
        vm.renderer.draw();
        
        const dataURL = canvas.toDataURL('image/png', 1.0);
        
        // Check for empty image
        if (dataURL.length < 1000) {
            console.warn('[ProjectManager] Captured image appears empty');
            
            // Fallback method
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
            
            const tempDataURL = tempCanvas.toDataURL('image/png', 1.0);
            
            if (tempDataURL.length > 1000) {
                return tempDataURL.split(',')[1];
            }
        }
        
        return dataURL.split(',')[1];
    } catch (error) {
        console.error('[ProjectManager] Failed to capture thumbnail:', error);
        return null;
    }
};

/**
 * Convert base64 to Blob
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
        console.error('[ProjectManager] Error converting base64 to Blob:', error);
        return null;
    }
};


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
 * Share project with groups
 * This will grant READ permission to the specified groups
 * and revoke permissions from groups not in the list
 */
export const shareProject = async (projectId, groupIds) => {
    try {
        console.log('[ProjectManager] Sharing project with groups:', { projectId, groupIds });
        
        // First, get current permissions to find which groups already have access
        const permissionsData = await fetchPermissions(projectId);
        const currentGroupPermissions = permissionsData.permissions?.filter(p => p.group) || [];
        
        // Determine which groups to add and which to remove
        const currentGroupIds = currentGroupPermissions.map(p => p.group.id);
        const groupsToAdd = groupIds.filter(id => !currentGroupIds.includes(id));
        const groupsToRemove = currentGroupPermissions.filter(p => !groupIds.includes(p.group.id));
        
        // Grant permissions to new groups
        for (const groupId of groupsToAdd) {
            await grantPermission(projectId, {
                group_id: groupId,
                permission: 'read'
            });
        }
        
        // Revoke permissions from removed groups
        for (const permission of groupsToRemove) {
            await revokePermission(projectId, permission.id);
        }
        
        return {
            success: true,
            added: groupsToAdd.length,
            removed: groupsToRemove.length
        };
    } catch (error) {
        console.error('[ProjectManager] Error sharing project:', error);
        throw error;
    }
};