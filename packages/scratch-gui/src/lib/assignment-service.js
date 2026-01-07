/**
 * Assignment API Service
 * Handles all assignment-related API calls
 */

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

const API_BASE = '/backend';

class AssignmentService {
    /**
     * Create a new assignment
     * @param {Object} data - Assignment data
     * @returns {Promise<Object>} Created assignment
     */
    async createAssignment(data) {
        const response = await fetch(`${API_BASE}/api/assignments`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create assignment');
        }

        return response.json();
    }

    /**
     * Get all assignments (for current user)
     * @param {Object} options - Query options
     * @param {boolean} options.forSubmission - If true, only return assignments user can submit to
     * @returns {Promise<Array>} List of assignments
     */
    async getAssignments(options = {}) {
        const queryParams = new URLSearchParams();
        if (options.forSubmission) {
            queryParams.append('for_submission', 'true');
        }
        
        const url = `${API_BASE}/api/assignments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch assignments');
        }

        return response.json();
    }

    /**
     * Get a specific assignment
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Object>} Assignment details
     */
    async getAssignment(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch assignment');
        }

        return response.json();
    }

    /**
     * Update an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated assignment
     */
    async updateAssignment(assignmentId, data) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}`, {
            method: 'PUT',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update assignment');
        }

        return response.json();
    }

    /**
     * Delete an assignment
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Object>} Success message
     */
    async deleteAssignment(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete assignment');
        }

        return response.json();
    }

    /**
     * Assign to a user
     * @param {number} assignmentId - Assignment ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Success message
     */
    async assignToUser(assignmentId, userId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/assign-user`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to assign user');
        }

        return response.json();
    }

    /**
     * Assign to a group
     * @param {number} assignmentId - Assignment ID
     * @param {number} groupId - Group ID
     * @returns {Promise<Object>} Success message
     */
    async assignToGroup(assignmentId, groupId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/assign-group`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify({ group_id: groupId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to assign group');
        }

        return response.json();
    }

    /**
     * Submit a project to an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} collaborativeProjectId - Collaborative project ID
     * @returns {Promise<Object>} Submission details
     */
    async submitAssignment(assignmentId, collaborativeProjectId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/submit`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify({ collaborative_project_id: collaborativeProjectId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit assignment');
        }

        return response.json();
    }

    /**
     * Withdraw a project submission from an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} collaborativeProjectId - Collaborative project ID
     * @returns {Promise<Object>} Response
     */
    async withdrawSubmission(assignmentId, collaborativeProjectId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/withdraw`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify({ collaborative_project_id: collaborativeProjectId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to withdraw submission');
        }

        return response.json();
    }

    /**
     * Get all submissions for an assignment
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Array>} List of submissions
     */
    async getSubmissions(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/submissions`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch submissions');
        }

        return response.json();
    }

    /**
     * Freeze a submitted project
     * @param {number} submissionId - Submission ID
     * @returns {Promise<Object>} Success message
     */
    async freezeSubmission(submissionId) {
        const response = await fetch(`${API_BASE}/api/assignments/submissions/${submissionId}/freeze`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to freeze submission');
        }

        return response.json();
    }

    /**
     * Unfreeze a submitted project
     * @param {number} submissionId - Submission ID
     * @returns {Promise<Object>} Success message
     */
    async unfreezeSubmission(submissionId) {
        const response = await fetch(`${API_BASE}/api/assignments/submissions/${submissionId}/unfreeze`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to unfreeze submission');
        }

        return response.json();
    }

    /**
     * Freeze all submissions for an assignment
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Object>} Success message with count
     */
    async freezeAllSubmissions(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/freeze-all`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to freeze all submissions');
        }

        return response.json();
    }

    /**
     * Unfreeze all submissions for an assignment
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Object>} Success message with count
     */
    async unfreezeAllSubmissions(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/unfreeze-all`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to unfreeze all submissions');
        }

        return response.json();
    }

    /**
     * Get available users to assign
     * @param {number} assignmentId - Assignment ID
     * @param {string} search - Search query
     * @returns {Promise<Array>} List of available users
     */
    async getAvailableUsers(assignmentId, search = '') {
        let url = `${API_BASE}/api/assignments/${assignmentId}/available-users`;
        if (search) {
            url += `?search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch available users');
        }

        return response.json();
    }

    /**
     * Get available groups to assign
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Array>} List of available groups
     */
    async getAvailableGroups(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/available-groups`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch available groups');
        }

        return response.json();
    }

    /**
     * Add an organizer to an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} userId - User ID to add as organizer
     * @returns {Promise<Object>} Updated assignment details
     */
    async addOrganizer(assignmentId, userId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/add-organizer`, {
            method: 'POST',
            headers: getAuthHeadersJSON(),
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add organizer');
        }

        return response.json();
    }

    /**
     * Remove an organizer from an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} organizerId - Organizer user ID to remove
     * @returns {Promise<Object>} Updated assignment details
     */
    async removeOrganizer(assignmentId, organizerId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/remove-organizer/${organizerId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove organizer');
        }

        return response.json();
    }

    /**
     * Get available teachers/admins to add as organizers
     * @param {number} assignmentId - Assignment ID
     * @returns {Promise<Array>} List of available teachers/admins
     */
    async getAvailableOrganizers(assignmentId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/available-organizers`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch available organizers');
        }

        return response.json();
    }

    /**
     * Remove a user from an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} userId - User ID to remove
     * @returns {Promise<Object>} Updated assignment details
     */
    async removeUserAssignment(assignmentId, userId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/remove-user/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove user');
        }

        return response.json();
    }

    /**
     * Remove a group from an assignment
     * @param {number} assignmentId - Assignment ID
     * @param {number} groupId - Group ID to remove
     * @returns {Promise<Object>} Updated assignment details
     */
    async removeGroupAssignment(assignmentId, groupId) {
        const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}/remove-group/${groupId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove group');
        }

        return response.json();
    }

    /**
     * Get all groups for teacher
     * @returns {Promise<Array>} List of groups
     */
    async getGroups() {
        const response = await fetch(`${API_BASE}/api/groups`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch groups');
        }

        return response.json();
    }

    /**
     * Get project details (versions and working copies) for a collaborative project
     * @param {number} collabProjectId - Collaborative project ID
     * @returns {Promise<Object>} Project details including commits and working copies
     */
    async getProjectDetails(collabProjectId) {
        const response = await fetch(`${API_BASE}/api/collaboration/${collabProjectId}/data`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to load project details (${response.status})`);
        }

        return response.json();
    }
}

export default new AssignmentService();
