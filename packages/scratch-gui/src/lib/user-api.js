/**
 * OAuth-based User service API
 */
const API_BASE_URL = '';
const LOGIN_ROUTES = `${API_BASE_URL}/backend`;
const API_ROUTES = `${API_BASE_URL}/backend/api`;

class UserService {
    /**
     * Start OAuth login process by redirecting to login page
     */
    static loginWithOAuth() {
        // Store current location to return after auth
        localStorage.setItem('auth_redirect', window.location.href);
        console.log('[UserService] Redirecting to OAuth login page');
        window.location.href = `${LOGIN_ROUTES}/login`;
    }
     /**
     * Process response from OAuth server
     * Called when returning from OAuth provider
     */
    static handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const error = urlParams.get('error');
        
        // Clear query parameters from URL
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, document.title, url);
        
        if (error) {
            console.error('[UserService] Authentication error:', error);
            return { error };
        }
        
        if (sessionId) {
            console.log('[UserService] Session ID received from OAuth callback');
            localStorage.setItem('session_id', sessionId);
            
            // Try to redirect back to original location
            const redirectUrl = localStorage.getItem('auth_redirect');
            localStorage.removeItem('auth_redirect');
            
            //if (redirectUrl) {
            //    window.location.href = redirectUrl;
            //}
            
            return { sessionId };
        }
        
        return null;
    }
    
    /**
     * Get current user information from the API
     */
    static async getCurrentUser() {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                return null;
            }
            
            const response = await fetch(`${API_ROUTES}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired or invalid
                    localStorage.removeItem('session_id');
                }
                throw new Error('Failed to get user information');
            }
            
            const data = await response.json();
            return data.user;
        } catch (error) {
            console.error('[UserService] Get user error:', error);
            return null;
        }
    }
    
    /**
     * Validate session with backend
     */
    static async validateSession() {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                return false;
            }
            
            const response = await fetch(`${LOGIN_ROUTES}/session?session_id=${sessionId}`);
            
            if (!response.ok) {
                // Session expired or invalid
                localStorage.removeItem('session_id');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[UserService] Session validation error:', error);
            return false;
        }
    }
    
    /**
     * Log the user out
     */
    static async logout() {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                return true;
            }
            
            const response = await fetch(`${LOGIN_ROUTES}/logout`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            
            // Clear local storage regardless of response
            localStorage.removeItem('session_id');
            
            if (!response.ok) {
                console.warn('[UserService] Logout API call failed, but local session was cleared');
            }
            
            return true;
        } catch (error) {
            console.error('[UserService] Logout error:', error);
            // Still remove local session data
            localStorage.removeItem('session_id');
            return true;
        }
    }
    
    /**
     * Check if user is logged in
     */
    static isLoggedIn() {
        return !!localStorage.getItem('session_id');
    }
}

export default UserService;