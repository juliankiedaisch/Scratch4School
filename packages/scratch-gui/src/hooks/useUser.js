import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

/**
 * Custom hook for accessing user and project data
 * 
 * @returns {Object} User and project context data and functions
 */
const useUser = () => {
    const context = useContext(UserContext);
    
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    
    return context;
};

export default useUser;