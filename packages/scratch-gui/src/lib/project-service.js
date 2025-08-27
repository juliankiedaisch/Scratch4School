/**
 * Service for project-related API calls and operations
 */
class ProjectService {
    /**
     * Fetch user's most recent project
     * @returns {Promise<Object>} Project metadata or null if none exists
     */
    static async fetchLastProject() {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                console.log('[ProjectService] No session ID, cannot fetch projects');
                return null;
            }
            
            const response = await fetch('/backend/api/projects/recent', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            
            if (response.status === 404) {
                console.log('[ProjectService] No recent projects found');
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch recent projects: ${response.status}`);
            }
            
            const data = await response.json();
            return data.project;
        } catch (error) {
            console.error('[ProjectService] Error fetching recent project:', error);
            return null;
        }
    }
    
    /**
     * Fetch project metadata by ID
     * @param {string|number} projectId - The ID of the project to fetch
     * @returns {Promise<Object>} Project metadata
     */
    static async fetchProjectMetadata(projectId) {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                throw new Error('No session ID available');
            }
            
            const response = await fetch(`/backend/api/projects/${projectId}/metadata`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch project metadata: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`[ProjectService] Error fetching project metadata ${projectId}:`, error);
            throw error;
        }
    }
    
    /**
     * Download SB3 file for a project
     * @param {string|number} projectId - The ID of the project to download
     * @returns {Promise<ArrayBuffer>} - The SB3 file as ArrayBuffer
     */
    static async downloadProjectSB3(projectId) {
        try {
            console.log(`[ProjectService] Downloading SB3 for project ${projectId}`);
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                throw new Error('No session ID available');
            }
            
            const response = await fetch(`/backend/api/projects/${projectId}/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to download project: ${response.status}`);
            }
            
            // Get the response as ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();
            console.log(`[ProjectService] Successfully downloaded SB3 file (${arrayBuffer.byteLength} bytes)`);
            return arrayBuffer;
        } catch (error) {
            console.error(`[ProjectService] Error downloading project ${projectId}:`, error);
            throw error;
        }
    }
    
    /**
     * Load a project into VM using downloaded SB3
     * @param {VM} vm - The Scratch VM instance
     * @param {Object} projectMetadata - Project metadata
     * @returns {Promise<void>}
     */
    static async loadProjectIntoVM(vm, projectMetadata) {
        if (!vm) {
            throw new Error('VM is not available');
        }
        
        if (!projectMetadata || !projectMetadata.id) {
            throw new Error('Invalid project metadata');
        }
        
        try {
            console.log(`[ProjectService] Loading project ${projectMetadata.id} into VM`);
            
            // Download the SB3 file
            const sb3Data = await this.downloadProjectSB3(projectMetadata.id);
            
            // Load the project using VM's built-in function
            await vm.loadProject(sb3Data);
            
            console.log('[ProjectService] Project successfully loaded into VM');
            
            // Update project metadata in VM
            if (vm.runtime) {
                vm.runtime.projectMetadata = {
                    id: projectMetadata.id,
                    title: projectMetadata.title || 'Untitled Project'
                };
            }
            
            return true;
        } catch (error) {
            console.error('[ProjectService] Failed to load project:', error);
            throw error;
        }
    }
}

export default ProjectService;