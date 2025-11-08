import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './collaboration-manager-modal.css';
import userIcon from './icons/icon--user.svg';
import versionIcon from './icons/icon--version.svg';

/**
 * My Projects Tab - Shows projects owned by the user
 */
const MyProjectsTab = ({
    projects,
    loading,
    error,
    selectedProject,
    onProjectSelect,
    collaborationData,
    loadingCollabData,
    onDeleteProject,
    onUpdateProjectName,
    formatDate,
    getProjectBadges,
    handleLoadWorkingCopy,
    handleWorkOnCommit,
    handleShowCommitDialog,
    handleShowResetConfirm,
    handleChangeUserPermission,
    handleRevokePermission,
    handleChangeGroupPermission,
    handleShowAddMember,
    handleShowAddGroup,
    fetchAvailableUsers,
    fetchAvailableGroups,
    intl,
    messages
}) => {
    const commits = collaborationData?.commits || [];
    const collaborators = collaborationData?.collaborators || [];
    const sharedGroups = collaborationData?.groups || [];
    
    // State for inline title editing
    // Note: This logic is duplicated in collaboration-projects-tab.jsx
    // TODO: Consider extracting to a custom hook for better maintainability
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [editedTitle, setEditedTitle] = React.useState('');
    
    const handleStartEditTitle = () => {
        setEditedTitle(selectedProject.name || '');
        setIsEditingTitle(true);
    };
    
    const handleSaveTitle = () => {
        if (editedTitle.trim() && editedTitle !== selectedProject.name) {
            onUpdateProjectName(editedTitle.trim());
        }
        setIsEditingTitle(false);
    };
    
    const handleCancelEditTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle('');
    };
    
    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            handleCancelEditTitle();
        }
    };

    return (
        <>
            {/* Left Side: Project List */}
            <div className={styles.projectList}>
                {loading && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                        <FormattedMessage {...messages.loading} />
                    </div>
                )}
                
                {!loading && error && (
                    <div className={styles.errorContainer}>
                        <FormattedMessage {...messages.error} />
                    </div>
                )}
                
                {!loading && !error && projects.length === 0 && (
                    <div className={styles.emptyContainer}>
                        <FormattedMessage {...messages.noProjects} />
                    </div>
                )}
                
                {!loading && !error && projects.map(project => {
                    const badges = getProjectBadges(project);
                    
                    return (
                        <div
                            key={project.id}
                            className={`${styles.projectItem} ${
                                selectedProject?.id === project.id ? styles.projectItemSelected : ''
                            }`}
                            onClick={() => onProjectSelect(project)}
                        >
                            <div className={styles.projectItemThumbnail}>
                                <img 
                                    src={project.thumbnail_url || '/static/images/default-project.png'}
                                    alt={project.name || 'Project'}
                                    onError={(e) => {
                                        e.target.src = '/static/default-thumbnail.png';
                                        e.target.onerror = null;
                                    }}
                                />
                            </div>
                            
                            <div className={styles.projectItemContent}>
                                <div className={styles.projectItemTitle}>
                                    {project.name || 'Untitled'}
                                </div>
                                
                                <div className={styles.projectItemMeta}>
                                    {badges.map((badge, index) => (
                                        <span 
                                            key={index}
                                            className={`${styles.projectBadge} ${styles[`badge${badge.type.charAt(0).toUpperCase() + badge.type.slice(1)}`]}`}
                                        >
                                            {badge.icon} {badge.text}
                                        </span>
                                    ))}
                                    
                                    {project.has_working_copy && (
                                        <span className={styles.workingCopyBadge} title="Änderungen vorhanden">
                                            ⚙️
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right Side: Content Area */}
            <div className={styles.contentArea}>
                {/* Project Actions - Only project owners can delete */}
                {selectedProject && selectedProject.access_via === 'owner' && (
                    <div className={styles.projectActions}>
                        <button
                            className={styles.deleteProjectButton}
                            onClick={onDeleteProject}
                        >
                            🗑️ <FormattedMessage {...messages.deleteProject} />
                        </button>
                    </div>
                )}
                
                {!selectedProject && (
                    <div className={styles.emptyContent}>
                        Klicke auf ein Projekt um mehr Informationen zu erhalten.
                    </div>
                )}
                
                {/* Project Content */}
                {selectedProject && (
                    <>
                        {/* Project Header with Large Thumbnail */}
                        <div className={styles.projectHeader}>
                            <div className={styles.projectThumbnailLarge}>
                                <img 
                                    src={selectedProject.thumbnail_url || '/static/images/default-project.png'}
                                    alt={selectedProject.name || 'Project'}
                                    onError={(e) => {
                                        e.target.src = '/static/default-thumbnail.png';
                                        e.target.onerror = null;
                                    }}
                                />
                            </div>
                            <div className={styles.projectHeaderInfo}>
                                <div className={styles.projectHeaderTitleContainer}>
                                    {!isEditingTitle ? (
                                        <>
                                            <h2 className={styles.projectHeaderTitle}>
                                                {selectedProject.name || 'Untitled Project'}
                                            </h2>
                                            {/* Show edit button for owners and admins */}
                                            {(selectedProject.access_via === 'owner' || selectedProject.permission === 'admin') && (
                                                <button
                                                    className={styles.editTitleButton}
                                                    onClick={handleStartEditTitle}
                                                    title="Titel bearbeiten"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles.editTitleContainer}>
                                            <input
                                                type="text"
                                                className={styles.editTitleInput}
                                                value={editedTitle}
                                                onChange={(e) => setEditedTitle(e.target.value)}
                                                onKeyDown={handleTitleKeyDown}
                                                onBlur={handleSaveTitle}
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>
                                {selectedProject.description && (
                                    <p className={styles.projectHeaderDescription}>
                                        {selectedProject.description}
                                    </p>
                                )}
                                <div className={styles.projectHeaderMeta}>
                                    <span className={styles.metaBadge}>
                                        {commits.length} {commits.length === 1 ? 'Version' : 'Versionen'}
                                    </span>
                                    <span className={styles.metaBadge}>
                                        {collaborators.length} {collaborators.length === 1 ? 'Mitglied' : 'Mitglieder'}
                                    </span>
                                    {selectedProject.shared_with_groups && selectedProject.shared_with_groups.length > 0 && (
                                        <>
                                            <span className={styles.metaBadgeSeparator}>•</span>
                                            <span className={styles.metaBadgeLabel}>
                                                <FormattedMessage {...messages.sharedWith} />:
                                            </span>
                                            {selectedProject.shared_with_groups.map(group => (
                                                <span 
                                                    key={group.id} 
                                                    className={styles.groupBadge}
                                                    title={`Shared with ${group.name}`}
                                                >
                                                    👥 {group.name}
                                                </span>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Members Section (Users with Direct Permissions) */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <img src={userIcon} alt="Members" className={styles.sectionIcon} />
                                    <FormattedMessage {...messages.members} />
                                    <span className={styles.badge}>
                                        {collaborators.filter(c => c.access_via !== 'owner' && !c.access_via.startsWith('group:')).length}
                                    </span>
                                </div>
                                {/* Admins can add members */}
                                {selectedProject.permission === 'admin' && (
                                    <button
                                        className={styles.addButton}
                                        onClick={() => {
                                            fetchAvailableUsers();
                                            handleShowAddMember(true);
                                        }}
                                    >
                                        + <FormattedMessage {...messages.addCollaborator} />
                                    </button>
                                )}
                            </div>
                            
                            <div className={styles.membersList}>
                                {/* Owner */}
                                {collaborators
                                    .filter(c => c.access_via === 'owner')
                                    .map((collab, index) => (
                                        <div key={`owner-${index}`} className={styles.memberItem}>
                                            <div className={styles.memberAvatar}>
                                                {collab.user?.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberName}>
                                                    {collab.user?.username || 'Unknown'}
                                                </div>
                                                <div className={styles.memberRole}>
                                                    <FormattedMessage {...messages.owner} /> • Admin
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                }
                                
                                {/* Direct User Permissions */}
                                {collaborators
                                    .filter(c => c.access_via === 'direct')
                                    .map((collab, index) => (
                                        <div key={`user-${collab.user?.id || index}`} className={styles.memberItem}>
                                            <div className={styles.memberAvatar}>
                                                {collab.user?.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberName}>
                                                    {collab.user?.username || 'Unknown'}
                                                </div>
                                                <div className={styles.memberRole}>
                                                    <FormattedMessage {...messages.invited} />
                                                </div>
                                            </div>
                                            
                                            {/* Permission Selector */}
                                            {selectedProject.permission === 'admin' && (
                                                <div className={styles.permissionControls}>
                                                    <select
                                                        className={styles.permissionSelect}
                                                        value={collab.permission || 'read'}
                                                        onChange={(e) => handleChangeUserPermission(
                                                            collab.user.id,
                                                            e.target.value
                                                        )}
                                                    >
                                                        <option value="read">
                                                            {intl.formatMessage(messages.permissionRead)}
                                                        </option>
                                                        <option value="write">
                                                            {intl.formatMessage(messages.permissionWrite)}
                                                        </option>
                                                        <option value="admin">
                                                            {intl.formatMessage(messages.permissionAdmin)}
                                                        </option>
                                                    </select>
                                                    <button
                                                        className={styles.removeButton}
                                                        onClick={() => handleRevokePermission(collab.permission_id)}
                                                        title={collab.permission_id || 'unknown'}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Read-only permission display */}
                                            {selectedProject.permission !== 'admin' && (
                                                <div className={styles.permissionBadge}>
                                                    {collab.permission === 'admin' && '👑 Admin'}
                                                    {collab.permission === 'write' && '✏️ Schreiben'}
                                                    {collab.permission === 'read' && '👁️ Lesen'}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Groups Section */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <span className={styles.sectionIcon}>👥</span>
                                    <FormattedMessage {...messages.groups} />
                                    <span className={styles.badge}>
                                        {sharedGroups.length}
                                    </span>
                                </div>
                                {/* Admins can add groups */}
                                {selectedProject.permission === 'admin' && (
                                    <button
                                        className={styles.addButton}
                                        onClick={() => {
                                            fetchAvailableGroups();
                                            handleShowAddGroup(true);
                                        }}
                                    >
                                        + <FormattedMessage {...messages.addGroup} />
                                    </button>
                                )}
                            </div>
                            
                            <div className={styles.membersList}>
                                {sharedGroups
                                    .map((collab, index) => {
                                        return (
                                            <div key={`group-${index}`} className={styles.memberItem}>
                                                <div className={styles.groupAvatar}>
                                                    👥
                                                </div>
                                                <div className={styles.memberInfo}>
                                                    <div className={styles.memberName}>
                                                        {collab.group?.name}
                                                    </div>
                                                    <div className={styles.memberRole}>
                                                        <FormattedMessage {...messages.viaGroup} />
                                                    </div>
                                                </div>
                                                
                                                {/* Permission Selector */}
                                                {selectedProject.permission === 'admin' && (
                                                    <div className={styles.permissionControls}>
                                                        <select
                                                            className={styles.permissionSelect}
                                                            value={collab.permission || 'read'}
                                                            onChange={(e) => handleChangeGroupPermission(
                                                                collab.group.id,
                                                                e.target.value
                                                            )}
                                                        >
                                                            <option value="read">
                                                                {intl.formatMessage(messages.permissionRead)}
                                                            </option>
                                                            <option value="write">
                                                                {intl.formatMessage(messages.permissionWrite)}
                                                            </option>
                                                            <option value="admin">
                                                                {intl.formatMessage(messages.permissionAdmin)}
                                                            </option>
                                                        </select>
                                                        
                                                        <button
                                                            className={styles.removeButton}
                                                            onClick={() => handleRevokePermission(collab.permission_id)}
                                                            title="Remove group"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Read-only permission display */}
                                                {selectedProject.permission !== 'admin' && (
                                                    <div className={styles.permissionBadge}>
                                                        {collab.permission === 'admin' && '👑 Admin'}
                                                        {collab.permission === 'write' && '✏️ Schreiben'}
                                                        {collab.permission === 'read' && '👁️ Lesen'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                
                                {collaborators.filter(c => c.access_via.startsWith('group:')).length === 0 && (
                                    <div className={styles.emptyMessage}>
                                        Keine Gruppen haben Zugriff auf dieses Projekt
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Commits Section */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <img src={versionIcon} alt="Commits" className={styles.sectionIcon} />
                                    <FormattedMessage {...messages.commits} />
                                    <span className={styles.badge}>
                                        {commits.length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className={styles.versionsList}>
                                {loadingCollabData && (
                                    <div className={styles.loadingContainer}>
                                        <div className={styles.spinner} />
                                    </div>
                                )}
                                
                                {!loadingCollabData && commits.map(commit => {
                                    const workingCopyForCommit = collaborationData?.working_copies?.[commit.project_id];
                                    const hasWorkingCopy = !!workingCopyForCommit;
                                    const hasUnsavedChanges = hasWorkingCopy && workingCopyForCommit.has_changes;
                                    
                                    return (
                                        <div 
                                            key={commit.id} 
                                            className={`${styles.versionItem} ${
                                                hasUnsavedChanges ? styles.versionItemWithWorkingCopy : ''
                                            }`}
                                        >
                                            <div className={styles.versionThumbnail}>
                                                <img 
                                                    src={commit.thumbnail_url || '/static/images/default-project.png'}
                                                    alt={`Version ${commit.commit_number}`}
                                                    onError={(e) => {
                                                        e.target.src = '/static/default-thumbnail.png';
                                                        e.target.onerror = null;
                                                    }}
                                                />
                                            </div>

                                            <div className={styles.versionContent}>
                                                <div className={styles.versionHeader}>
                                                    <div className={styles.versionTitle}>
                                                        ✓ #{commit.commit_number}: {commit.commit_message || 'No message'}
                                                    </div>
                                                    <div className={styles.versionMeta}>
                                                        {commit.committed_by} • {formatDate(commit.committed_at)}
                                                    </div>
                                                </div>
                                                
                                                {hasUnsavedChanges && (
                                                    <div className={styles.unsavedChangesNotice}>
                                                        <span className={styles.warningIcon}>⚠️</span>
                                                        <FormattedMessage {...messages.unsavedChanges} />
                                                        <span className={styles.lastSavedTime}>
                                                            • <FormattedMessage {...messages.lastSaved} />: {' '}
                                                            {formatDate(workingCopyForCommit.updated_at)}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className={styles.versionActions}>
                                                    {!hasWorkingCopy ? (
                                                        <button
                                                            className={styles.actionButtonPrimary}
                                                            onClick={() => handleWorkOnCommit(commit.commit_number)}
                                                        >
                                                            🔨 <FormattedMessage {...messages.workHere} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={styles.actionButton}
                                                                onClick={() => handleLoadWorkingCopy(commit.project_id)}
                                                            >
                                                                📂 <FormattedMessage {...messages.open} />
                                                            </button>
                                                            
                                                            {hasUnsavedChanges && (
                                                                <button
                                                                    className={styles.actionButtonPrimary}
                                                                    onClick={() => handleShowCommitDialog(true)}
                                                                >
                                                                    ✅ <FormattedMessage {...messages.commit} />
                                                                </button>
                                                            )}
                                                            
                                                            <button
                                                                className={styles.actionButtonDanger}
                                                                onClick={() => handleShowResetConfirm(commit.project_id)}
                                                            >
                                                                🗑️ <FormattedMessage {...messages.deleteWorkingCopy} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

MyProjectsTab.propTypes = {
    projects: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    selectedProject: PropTypes.object,
    onProjectSelect: PropTypes.func.isRequired,
    collaborationData: PropTypes.object,
    loadingCollabData: PropTypes.bool.isRequired,
    onDeleteProject: PropTypes.func.isRequired,
    onUpdateProjectName: PropTypes.func.isRequired,
    formatDate: PropTypes.func.isRequired,
    getProjectBadges: PropTypes.func.isRequired,
    handleLoadWorkingCopy: PropTypes.func.isRequired,
    handleWorkOnCommit: PropTypes.func.isRequired,
    handleShowCommitDialog: PropTypes.func.isRequired,
    handleShowResetConfirm: PropTypes.func.isRequired,
    handleChangeUserPermission: PropTypes.func.isRequired,
    handleRevokePermission: PropTypes.func.isRequired,
    handleChangeGroupPermission: PropTypes.func.isRequired,
    handleShowAddMember: PropTypes.func.isRequired,
    handleShowAddGroup: PropTypes.func.isRequired,
    fetchAvailableUsers: PropTypes.func.isRequired,
    fetchAvailableGroups: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    messages: PropTypes.object.isRequired
};

export default MyProjectsTab;
