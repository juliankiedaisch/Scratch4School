import React from 'react';
import PropTypes from 'prop-types';
import { useUser } from '../../contexts/UserContext';
import styles from './user-profile.css';

const UserProfile = ({ onClose }) => {
    const { currentUser, logout, loading } = useUser();
    
    const handleLogout = async () => {
        await logout();
        onClose();
    };
    
    if (!currentUser) return <p>No user information available</p>;
    
    return (
        <div className={styles.profileContainer}>
            <h2>My Profile</h2>
            
            <div className={styles.profileInfo}>
                <div className={styles.profileHeader}>
                    <h3>{currentUser.username}</h3>
                </div>
                
                <div className={styles.profileDetail}>
                    <strong>User ID:</strong> {currentUser.id}
                </div>
                
                {currentUser.email && (
                    <div className={styles.profileDetail}>
                        <strong>Email:</strong> {currentUser.email}
                    </div>
                )}
                
                <div className={styles.buttonGroup}>
                    <button 
                        className={styles.logoutButton}
                        onClick={handleLogout}
                        disabled={loading}
                    >
                        {loading ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </div>
        </div>
    );
};

UserProfile.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default UserProfile;