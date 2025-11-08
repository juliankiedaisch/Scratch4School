const API_BASE = '/backend/api';
const COLLAB_BASE = `${API_BASE}/collaborative`;

import * as ProjectManager from './project-management';

/**
 * Fetch ALL user-owned projects (collaborative + normal)
 * Backend filters out commits and working copies automatically
 */
export const fetchAllUserProjects = async () => {
    const response = await fetch(`${API_BASE}/projects/all-with-collaborative`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    
    const data = await response.json();
    return data.projects || [];
};

/**
 * Fetch all collaborative projects user has access to
 * (For backward compatibility - use fetchAllUserProjects instead)
 */
export const fetchMyCollaborativeProjects = async () => {
    const response = await fetch(`${COLLAB_BASE}/my-projects`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch collaborative projects');
    }
    
    const data = await response.json();
    return data.collaborative_projects || [];
};

/**
 * Fetch normal projects only (for backward compatibility)
 */
export const fetchAllProjects = async () => {
    const response = await fetch(`${API_BASE}/projects`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch projects');
    }
    
    return response.json();
};

/**
 * Fetch all collaboration data for a project in one call
 * Returns: { commits, collaborators, working_copy_info }
 */
export const fetchCollaborationData = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/data`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch collaboration data');
    }
    
    return response.json();
};

/**
 * Fetch available users for adding as collaborators
 * Backend filters out owner and existing collaborators
 * @param {number} collabProjectId - The collaborative project ID
 * @param {string} searchQuery - Optional search query
 */
export const fetchAvailableCollaborators = async (collabProjectId, searchQuery = '') => {
    const url = new URL(`${window.location.origin}${COLLAB_BASE}/${collabProjectId}/available-collaborators`);
    if (searchQuery) {
        url.searchParams.append('search', searchQuery);
    }
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch available collaborators');
    }
    
    const data = await response.json();
    return data.users || [];
};

/**
 * Convert a normal project to collaborative
 * @param {number} projectId - The project to convert
 * @param {number|null} groupId - Optional group ID
 * @param {string} initialMessage - Initial commit message
 */
export const convertToCollaborative = async (projectId, groupId, initialMessage) => {
    console.log('[convertToCollaborative] Converting project:', {
        projectId,
        groupId,
        initialMessage
    });
    
    const requestBody = {
        initial_message: initialMessage || 'Initial version'
    };
    
    if (groupId) {
        requestBody.group_id = groupId;
    }
    
    const response = await fetch(`${COLLAB_BASE}/convert/${projectId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert project to collaborative');
    }
    
    const result = await response.json();
    
    console.log('[convertToCollaborative] Conversion successful:', result);
    
    return result;
};

/**
 * Create a NEW collaborative project from scratch
 * (Not used in modal, but available for future use)
 */
export const createCollaborativeProject = async (name, projectFile, options = {}) => {
    console.log('[createCollaborativeProject] Creating new collaborative project:', name);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('project_file', projectFile);
    
    if (options.description) {
        formData.append('description', options.description);
    }
    
    if (options.groupId) {
        formData.append('group_id', options.groupId);
    }
    
    if (options.initialMessage) {
        formData.append('initial_message', options.initialMessage);
    }
    
    if (options.thumbnail) {
        formData.append('thumbnail', options.thumbnail);
    }
    
    const response = await fetch(`${COLLAB_BASE}/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collaborative project');
    }
    
    const result = await response.json();
    
    console.log('[createCollaborativeProject] Created successfully:', result);
    
    return result;
};

/**
 * Fetch collaborators for a collaborative project
 * (For backward compatibility - use fetchCollaborationData instead)
 */
export const fetchCollaborators = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/collaborators`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
    }
    
    return response.json();
};

/**
 * Add a collaborator to a collaborative project (individual invitation)
 */
export const addCollaborator = async (collabProjectId, userId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/collaborators`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add collaborator');
    }
    
    return response.json();
};

/**
 * Remove a collaborator from a collaborative project
 */
export const removeCollaborator = async (collabProjectId, userId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to remove collaborator');
    }
    
    return response.json();
};

/**
 * Fetch all commits for a collaborative project
 * (For backward compatibility - use fetchCollaborationData instead)
 */
export const fetchCommits = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch commits');
    }
    
    return response.json();
};

/**
 * Fetch working copy info for current user
 * (For backward compatibility - use fetchCollaborationData instead)
 */
export const fetchWorkingCopyInfo = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/working-copy/info`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch working copy info');
    }
    
    return response.json();
};

/**
 * Load working copy into editor
 * Uses ProjectManager.loadProject() internally
 */
export const loadWorkingCopy = async (collabProjectId, vm, userContext) => {
    console.log('[loadWorkingCopy] Loading working copy for collab project:', collabProjectId);
    
    try {
        // Get working copy info to find the project_id
        const wcInfo = await fetchWorkingCopyInfo(collabProjectId);
        
        if (!wcInfo.has_working_copy) {
            throw new Error('No working copy found');
        }
        
        const projectId = wcInfo.project_id;
        
        console.log('[loadWorkingCopy] Found working copy project ID:', projectId);
        
        // Use ProjectManager to load it
        const metadata = await ProjectManager.loadProject(projectId, vm, {
            userContext: userContext,
            onUpdateMetadata: (id, title) => {
                if (userContext) {
                    userContext.setProjectId(id);
                    userContext.setProjectTitle(title);
                    userContext.setProjectChanged(false);
                }
            }
        });
        
        console.log('[loadWorkingCopy] Working copy loaded successfully');
        
        return {
            projectId: projectId,
            collaborativeProjectId: collabProjectId,
            metadata: metadata
        };
        
    } catch (error) {
        console.error('[loadWorkingCopy] Error:', error);
        throw error;
    }
};

/**
 * Load specific commit into editor (read-only)
 * Uses ProjectManager.loadProject() internally
 */
export const loadCommit = async (collabProjectId, commitNumber, vm, userContext) => {
    console.log('[loadCommit] Loading commit:', { collabProjectId, commitNumber });
    
    try {
        // Get commit info to find the project_id
        const commit = await fetchCommit(collabProjectId, commitNumber);
        const projectId = commit.commit.project_id;
        
        console.log('[loadCommit] Found commit project ID:', projectId);
        
        // Use ProjectManager to load it
        const metadata = await ProjectManager.loadProject(projectId, vm, {
            userContext: userContext,
            playerOnly: true,  // ✅ Commits are read-only
            onUpdateMetadata: (id, title) => {
                if (userContext) {
                    userContext.setProjectId(id);
                    userContext.setProjectTitle(title);
                    userContext.setProjectChanged(false);
                }
            }
        });
        
        console.log('[loadCommit] Commit loaded successfully (read-only)');
        
        return {
            projectId: projectId,
            collaborativeProjectId: collabProjectId,
            commitNumber: commitNumber,
            metadata: metadata
        };
        
    } catch (error) {
        console.error('[loadCommit] Error:', error);
        throw error;
    }
};

/**
 * Load working copy by commit ID
 * Uses ProjectManager.loadProject() internally
 */
export const loadWorkingCopyByCommit = async (collabProjectId, commitId, vm, userContext) => {
    console.log('[loadWorkingCopyByCommit] Loading WC for commit:', commitId);
    
    try {
        // Get all working copies
        const data = await fetchCollaborationData(collabProjectId);
        
        // Find the working copy for this commit
        const workingCopy = Object.values(data.working_copies || {}).find(
            wc => wc.based_on_commit_id === commitId
        );
        
        if (!workingCopy) {
            throw new Error('Working copy not found for this commit');
        }
        
        const projectId = workingCopy.project_id;
        
        console.log('[loadWorkingCopyByCommit] Found WC project ID:', projectId);
        
        // Use ProjectManager to load it
        const metadata = await ProjectManager.loadProject(projectId, vm, {
            userContext: userContext,
            onUpdateMetadata: (id, title) => {
                if (userContext) {
                    userContext.setProjectId(id);
                    userContext.setProjectTitle(title);
                    userContext.setProjectChanged(false);
                }
            }
        });
        
        console.log('[loadWorkingCopyByCommit] WC loaded successfully');
        
        return {
            projectId: projectId,
            collaborativeProjectId: collabProjectId,
            basedOnCommitId: commitId,
            metadata: metadata
        };
        
    } catch (error) {
        console.error('[loadWorkingCopyByCommit] Error:', error);
        throw error;
    }
};

/**
 * Create working copy from a specific commit
 * (Replaces current working copy if exists)
 */
export const loadCommitAsWorkingCopy = async (collabProjectId, commitNumber) => {
    console.log('[loadCommitAsWorkingCopy] Creating working copy from commit:', {
        collabProjectId,
        commitNumber
    });
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits/${commitNumber}/load`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create working copy from commit');
    }
    
    const result = await response.json();
    
    console.log('[loadCommitAsWorkingCopy] Working copy created:', result);
    
    return result;
};

/**
 * Commit working copy to create new public version
 */
export const commitWorkingCopy = async (collabProjectId, commitMessage) => {
    console.log('[commitWorkingCopy] Committing changes:', {
        collabProjectId,
        commitMessage
    });
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commit`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: commitMessage || 'Update'
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to commit working copy');
    }
    
    const result = await response.json();
    
    console.log('[commitWorkingCopy] Commit successful:', result);
    
    return result;
};

/**
 * Fetch all users (for adding collaborators)
 * @deprecated Use fetchAvailableCollaborators instead
 */
export const fetchAllUsers = async () => {
    const response = await fetch(`${API_BASE}/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    
    const data = await response.json();
    return data.users || [];
};

/**
 * Fetch user's groups (for converting to collaborative)
 */
export const fetchUserGroups = async () => {
    const response = await fetch(`${API_BASE}/groups`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch groups');
    }
    
    const data = await response.json();
    return data.groups || [];
};

/**
 * Get details of a specific collaborative project
 */
export const fetchCollaborativeProject = async (collabProjectId) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch collaborative project');
    }
    
    return response.json();
};

/**
 * Get specific commit details
 */
export const fetchCommit = async (collabProjectId, commitNumber) => {
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits/${commitNumber}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch commit');
    }
    
    return response.json();
};

/**
 * Reset working copy (delete it)
 */
export const resetWorkingCopy = async (collabProjectId) => {
    console.log('[resetWorkingCopy] Resetting working copy for:', collabProjectId);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}/working-copy/reset`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset working copy');
    }
    
    const result = await response.json();
    
    console.log('[resetWorkingCopy] Working copy reset:', result);
    
    return result;
};

export const deleteWorkingCopy = async (collabProjectId, commitId) => {
    console.log('[deleteWorkingCopy] Deleting WC for commit:', commitId);
    
    try {
        // Find commit number
        const commitsResponse = await fetch(`${COLLAB_BASE}/${collabProjectId}/commits`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_id')}`
            }
        });
        
        const commitsData = await commitsResponse.json();
        const commit = commitsData.commits.find(c => c.project_id === commitId);
        
        if (!commit) {
            throw new Error('Commit not found');
        }
        
        const response = await fetch(
            `${COLLAB_BASE}/${collabProjectId}/commits/${commit.commit_number}/working-copy`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('session_id')}`
                }
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete working copy');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('[deleteWorkingCopy] Error:', error);
        throw error;
    }
};

/**
 * Delete or leave a collaborative project
 * - If owner: Deletes entire project for everyone
 * - If collaborator: Leaves project, keeps working copies as standalone
 */
export const deleteOrLeaveProject = async (collabProjectId) => {
    console.log('[deleteOrLeaveProject] Deleting/leaving project:', collabProjectId);
    
    const response = await fetch(`${COLLAB_BASE}/${collabProjectId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('session_id')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete/leave project');
    }
    
    const result = await response.json();
    
    console.log('[deleteOrLeaveProject] Result:', result);
    
    return result;
};