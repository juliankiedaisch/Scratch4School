import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import UserService from '../lib/user-api'; // Import the existing UserService

// Create the context with default values
export const UserContext = createContext({
    currentUser: null,
    isLoggedIn: false,
    loading: true,
    isTeacher: false,
    isAdmin: false,
    error: null,
    login: () => {},
    logout: () => {},
    
    // Project-related properties
    projectId: null,
    setProjectId: () => {},
    projectTitle: '',
    setProjectTitle: () => {},
    projectChanged: false,
    setProjectChanged: () => {},
    resetProject: () => {},
    setTeacherRole: () => {},
    setAdminRole: () => {}
});

export const UserProvider = ({ children }) => {
    // User state
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Project state
    const [projectId, setProjectId] = useState(null);
    const [projectTitle, setProjectTitle] = useState('Untitled Project');
    const [projectChanged, setProjectChanged] = useState(false);

    // User role state
    const [isTeacher, setIsTeacher] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Check for auth callback on initial load
    useEffect(() => {
        // Check if we're returning from OAuth flow
        const authResult = UserService.handleAuthCallback();
        if (authResult && authResult.error) {
            console.error('[UserContext] OAuth error:', authResult.error);
            setError(authResult.error);
        }
    }, []);

    // Load user data on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                
                // Check if session is valid
                const isValid = await UserService.validateSession();
                
                if (isValid) {
                    // Get user data
                    const userData = await UserService.getCurrentUser();
                    
                    if (userData) {
                        //console.log('[UserContext] User loaded:', userData.username || userData.name);
                        //console.log('[UserContext] User:', userData);
                        setCurrentUser(userData);
                        if (userData.role) {
                            //console.log('[UserContext] User role:', userData.role);
                            setIsTeacher(userData.role.includes('teacher'));
                            setIsAdmin(userData.role.includes('admin'));
                        }
                    } else {
                        console.log('[UserContext] No active user session');
                        setCurrentUser(null);
                    }
                } else {
                    console.log('[UserContext] Session invalid or expired');
                    setCurrentUser(null);
                }
            } catch (err) {
                console.error('[UserContext] Error loading user:', err);
                setError(err.message);
                setCurrentUser(null);
            } finally {
                setLoading(false);
            }
        };
        
        fetchUser();
    }, []);

    // Authentication functions
    const login = useCallback(() => {
        //console.log('[UserContext] Initiating login with OAuth');
        setLoading(true);
        UserService.loginWithOAuth();
        // No need to set loading to false as we're redirecting away
    }, []);

    const logout = useCallback(async () => {
        try {
            //console.log('[UserContext] Logging out...');
            setLoading(true);
            
            // Use the UserService logout method
            await UserService.logout();
            
            // Clear user data
            setCurrentUser(null);
            setIsTeacher(false);
            setIsAdmin(false);
            
            // Reset project data
            resetProject();
            
            //console.log('[UserContext] Logout successful');
        } catch (err) {
            console.error('[UserContext] Logout error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Project management functions
    const resetProject = useCallback(() => {
        //console.log('[UserContext] Resetting project data');
        setProjectId(null);
        setProjectTitle('Untitled Project');
        setProjectChanged(false);
        // This helps us track when the project was reset
        const resetTime = new Date().toISOString();
        localStorage.setItem('project_reset_time', resetTime);
        
        // We can also track which project was being edited before the reset
        if (projectId) {
            localStorage.setItem('last_project_id', projectId);
        }
    }, [projectId]);

    // Get login status from UserService
    const isLoggedIn = UserService.isLoggedIn() && !!currentUser;

    // Create the context value object
    const value = {
        currentUser,
        isLoggedIn,
        loading,
        error,
        isTeacher,
        isAdmin,
        login,
        logout,
        
        // Project data
        projectId,
        setProjectId,
        projectTitle,
        setProjectTitle,
        projectChanged,
        setProjectChanged,
        resetProject
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

UserProvider.propTypes = {
    children: PropTypes.node.isRequired
};

export default UserProvider;