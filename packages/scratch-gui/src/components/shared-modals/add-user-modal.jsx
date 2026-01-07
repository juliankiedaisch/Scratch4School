import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './shared-modals.css';

/**
 * Unified Add User Modal Component
 * 
 * This modal can be used for both:
 * - Collaboration Manager: Adding users to projects with READ permission
 * - Teacher/Assignment: Assigning users to assignments
 * 
 * The modal handles its own state and provides a clean API for parent components.
 */
const AddUserModal = ({ 
    users, 
    onAdd, 
    onClose, 
    intl,
    messages,
    title = 'Add User',
    headerText = null,
    searchPlaceholder = 'Search users...',
    noUsersMessage = 'No users found',
    addButtonText = 'Add',
    cancelButtonText = 'Cancel',
    showPermissionInfo = true
}) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filter users based on search query
    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = () => {
        if (selectedUser) {
            onAdd(selectedUser.id, 'READ');
            setSelectedUser(null);
            setSearchQuery('');
        }
    };

    const handleCancel = () => {
        setSelectedUser(null);
        setSearchQuery('');
        onClose();
    };

    return (
        <div className={styles.dialogOverlay} onClick={handleCancel}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <div className={styles.dialogHeader}>
                    <h3>
                        {headerText ? headerText : 
                            (messages?.addMember ? 
                                <FormattedMessage {...messages.addMember} /> : 
                                title
                            )
                        }
                    </h3>
                    <button className={styles.dialogClose} onClick={handleCancel}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={
                            messages?.searchUsers ? 
                                intl.formatMessage(messages.searchUsers) : 
                                searchPlaceholder
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <div className={styles.userList}>
                        {filteredUsers.length === 0 && (
                            <div className={styles.noUsers}>
                                {messages?.noUsersFound ? 
                                    <FormattedMessage {...messages.noUsersFound} /> : 
                                    noUsersMessage
                                }
                            </div>
                        )}
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`${styles.userItem} ${selectedUser?.id === user.id ? styles.userItemSelected : ''}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className={styles.userAvatar}>
                                    {user.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className={styles.userName}>{user.username}</div>
                            </div>
                        ))}
                    </div>
                    {selectedUser && showPermissionInfo && (
                        <div className={styles.permissionInfo}>
                            <p>
                                <strong>{selectedUser.username}</strong> wird mit <strong>Leseberechtigung</strong> hinzugefügt.
                                Die Berechtigung kann später geändert werden.
                            </p>
                        </div>
                    )}
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={handleCancel}>
                        {messages?.cancel ? 
                            <FormattedMessage {...messages.cancel} /> : 
                            cancelButtonText
                        }
                    </button>
                    <button
                        className={styles.confirmButton}
                        disabled={!selectedUser}
                        onClick={handleAdd}
                    >
                        {messages?.save || messages?.add ? 
                            <FormattedMessage {...(messages.save || messages.add)} /> : 
                            addButtonText
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

AddUserModal.propTypes = {
    users: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        username: PropTypes.string.isRequired
    })).isRequired,
    onAdd: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    messages: PropTypes.object,
    title: PropTypes.string,
    headerText: PropTypes.node,
    searchPlaceholder: PropTypes.string,
    noUsersMessage: PropTypes.string,
    addButtonText: PropTypes.string,
    cancelButtonText: PropTypes.string,
    showPermissionInfo: PropTypes.bool
};

export default AddUserModal;
