import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './shared-modals.css';

/**
 * Unified Add Group Modal Component
 * 
 * This modal can be used for both:
 * - Collaboration Manager: Adding groups to projects with READ permission
 * - Teacher/Assignment: Assigning groups to assignments
 * 
 * The modal handles its own state and provides a clean API for parent components.
 */
const AddGroupModal = ({ 
    groups, 
    onAdd, 
    onClose, 
    intl, 
    messages,
    title = 'Add Group',
    noGroupsMessage = 'No groups available',
    addButtonText = 'Add',
    cancelButtonText = 'Cancel',
    showMemberCount = true
}) => {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filter groups based on search query
    const filteredGroups = groups.filter(group => 
        group.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = () => {
        if (selectedGroup) {
            onAdd(selectedGroup.id, 'READ');
            setSelectedGroup(null);
            setSearchQuery('');
        }
    };

    const handleCancel = () => {
        setSelectedGroup(null);
        setSearchQuery('');
        onClose();
    };

    return (
        <div className={styles.dialogOverlay} onClick={handleCancel}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <div className={styles.dialogHeader}>
                    <h3>
                        {messages?.addGroup ? 
                            <FormattedMessage {...messages.addGroup} /> : 
                            title
                        }
                    </h3>
                    <button className={styles.dialogClose} onClick={handleCancel}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={
                            messages?.searchGroups ? 
                                intl.formatMessage(messages.searchGroups) : 
                                'Search groups...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <div className={styles.groupList}>
                        {filteredGroups.length === 0 && (
                            <div className={styles.noGroups}>
                                {noGroupsMessage}
                            </div>
                        )}
                        {filteredGroups.map(group => (
                            <div
                                key={group.id}
                                className={`${styles.groupItem} ${selectedGroup?.id === group.id ? styles.groupItemSelected : ''}`}
                                onClick={() => setSelectedGroup(group)}
                            >
                                <div className={styles.groupAvatar}>
                                    👥
                                </div>
                                <div className={styles.groupInfo}>
                                    <div className={styles.groupName}>
                                        {group.name}
                                    </div>
                                    {showMemberCount && group.member_count !== undefined && (
                                        <div className={styles.groupMeta}>
                                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {selectedGroup && (
                        <div className={styles.permissionInfo}>
                            <p>
                                <strong>{selectedGroup.name}</strong> wird mit <strong>Leseberechtigung</strong> hinzugefügt.
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
                        disabled={!selectedGroup}
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

AddGroupModal.propTypes = {
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        member_count: PropTypes.number
    })).isRequired,
    onAdd: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    messages: PropTypes.object,
    title: PropTypes.string,
    noGroupsMessage: PropTypes.string,
    addButtonText: PropTypes.string,
    cancelButtonText: PropTypes.string,
    showMemberCount: PropTypes.bool
};

export default AddGroupModal;
