import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import UserService from '../lib/user-api';

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
    isCollaborative: false,
    setIsCollaborative: () => {},
    currentVersionId: null,
    setCurrentVersionId: () => {},
    basedOnVersionId: null,
    setBasedOnVersionId: () => {},
    isLoadingProject: false,
    setIsLoadingProject: () => {},
    resetProject: () => {},
    setTeacherRole: () => {},
    setAdminRole: () => {},
    collaborativeProjectId: null,
    setCollaborativeProjectId: () => {},
    setIsCollaborative: () => {},
    isCollaborative: true
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
    const [collaborativeProjectId, setCollaborativeProjectId] = useState(true);
    const [isCollaborative, setIsCollaborative] = useState(true);

    // User role state
    const [isTeacher, setIsTeacher] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Check for auth callback on initial load
    useEffect(() => {
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
                
                const isValid = await UserService.validateSession();
                
                if (isValid) {
                    const userData = await UserService.getCurrentUser();
                    
                    if (userData) {
                        setCurrentUser(userData);
                        if (userData.role) {
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

    const resetProject = useCallback(() => {
        console.log('[UserContext] Resetting project data');
        setProjectId(null);
        setProjectTitle('Untitled Project');
        setProjectChanged(false);
        setIsCollaborative(false);
        setCollaborativeProjectId(null);
        
        const resetTime = new Date().toISOString();
        localStorage.setItem('project_reset_time', resetTime);

    }, []);

    // Listen for project loaded from file event
    useEffect(() => {
        const handleProjectLoadedFromFile = (event) => {
            console.log('[UserContext] Project loaded from file, resetting project state');
            // Use the same resetProject function for consistency
            resetProject();
            // Then update the title if provided
            const title = event.detail?.title;
            if (title) {
                setProjectTitle(title);
            }
        };

        document.addEventListener('projectLoadedFromFile', handleProjectLoadedFromFile);

        return () => {
            document.removeEventListener('projectLoadedFromFile', handleProjectLoadedFromFile);
        };
    }, [resetProject]);

    const login = useCallback(() => {
        setLoading(true);
        UserService.loginWithOAuth();
    }, []);  

    const logout = useCallback(async () => {
        try {
            setLoading(true);
            await UserService.logout();
            
            setCurrentUser(null);
            setIsTeacher(false);
            setIsAdmin(false);
            
            resetProject();
        } catch (err) {
            console.error('[UserContext] Logout error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [resetProject]);

    const isLoggedIn = UserService.isLoggedIn() && !!currentUser;

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
        resetProject,
        setCollaborativeProjectId,
        collaborativeProjectId,
        setIsCollaborative,
        isCollaborative
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