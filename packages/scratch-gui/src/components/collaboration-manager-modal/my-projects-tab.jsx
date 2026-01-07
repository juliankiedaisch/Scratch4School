import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './collaboration-manager-modal.css';
import userIcon from './icons/icon--user.svg';
import versionIcon from './icons/icon--version.svg';
import AssignmentSubmissionDialog from './assignment-submission-dialog.jsx';
import assignmentService from '../../lib/assignment-service';

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
    onRefreshProjects,
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
    
    // State for assignment submission dialog
    const [showAssignmentDialog, setShowAssignmentDialog] = React.useState(false);
    const [withdrawingSubmission, setWithdrawingSubmission] = React.useState(null);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);
    const [withdrawAssignmentId, setWithdrawAssignmentId] = React.useState(null);
    const [withdrawError, setWithdrawError] = React.useState(null);
    
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
    
    const handleSubmitToAssignment = async (assignmentId) => {
        try {
            await assignmentService.submitAssignment(assignmentId, selectedProject.id);
            // Refresh project data to show new submission
            if (onRefreshProjects) {
                await onRefreshProjects();
            }
        } catch (error) {
            console.error('Error submitting to assignment:', error);
            throw error;
        }
    };
    
    const handleWithdrawSubmission = (assignmentId) => {
        setWithdrawAssignmentId(assignmentId);
        setShowWithdrawConfirm(true);
    };
    
    const confirmWithdrawSubmission = async () => {
        setShowWithdrawConfirm(false);
        
        try {
            setWithdrawingSubmission(withdrawAssignmentId);
            await assignmentService.withdrawSubmission(withdrawAssignmentId, selectedProject.id);
            // Refresh project data to remove submission
            if (onRefreshProjects) {
                await onRefreshProjects();
            }
        } catch (error) {
            console.error('Error withdrawing submission:', error);
            setWithdrawError(error.message || intl.formatMessage(messages.withdrawSubmissionError));
        } finally {
            setWithdrawingSubmission(null);
            setWithdrawAssignmentId(null);
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
                                    
                                    {project.assignment_submissions && project.assignment_submissions.length > 0 && (
                                        <span className={styles.assignmentBadge} title={`Submitted to ${project.assignment_submissions.length} assignment(s)`}>
                                            📝 {project.assignment_submissions.length}
                                        </span>
                                    )}
                                    {project.is_frozen && (
                                        <span className={styles.frozenBadge} title="Project is frozen">
                                            🔒 Frozen
                                        </span>
                                    )}
                                    
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
                {!selectedProject && (
                    <div className={styles.emptyContent}>
                        <FormattedMessage {...messages.selectProjectPrompt} />
                    </div>
                )}
                
                {/* Project Content */}
                {selectedProject && (
                    <>
                        {/* Project Info Container: Header + Permissions */}
                        <div className={styles.projectInfoContainer}>
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
                                            {(selectedProject.access_via === 'owner' || selectedProject.permission === 'ADMIN') && (
                                                <button
                                                    className={styles.editTitleButton}
                                                    onClick={handleStartEditTitle}
                                                    title={intl.formatMessage(messages.editTitle)}
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
                            
                            {/* Project Actions - Only project owners can delete */}
                            {selectedProject.access_via === 'owner' && (
                                <div className={styles.projectActionsColumn}>
                                    <div className={styles.projectActions}>
                                        <button
                                            className={styles.deleteProjectButton}
                                            onClick={onDeleteProject}
                                            disabled={selectedProject.is_frozen}
                                            title={selectedProject.is_frozen ? 'Cannot delete frozen project' : ''}
                                        >
                                            🗑️ <FormattedMessage {...messages.deleteProject} />
                                        </button>
                                        
                                        {/* Show Submit or Withdraw button based on submission status */}
                                        {selectedProject.assignment_submissions && selectedProject.assignment_submissions.length > 0 ? (
                                            <button
                                                className={styles.withdrawAssignmentButton}
                                                onClick={() => handleWithdrawSubmission(selectedProject.assignment_submissions[0].assignment_id)}
                                                disabled={withdrawingSubmission === selectedProject.assignment_submissions[0].assignment_id || selectedProject.is_frozen}
                                                title={selectedProject.is_frozen ? 'Cannot withdraw from frozen project' : ''}
                                            >
                                                {withdrawingSubmission === selectedProject.assignment_submissions[0].assignment_id ? '...' : <FormattedMessage {...messages.withdrawFromAssignment} />}
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.submitToAssignmentButton}
                                                onClick={() => setShowAssignmentDialog(true)}
                                                disabled={selectedProject.is_frozen}
                                                title={selectedProject.is_frozen ? 'Cannot submit frozen project' : ''}
                                            >
                                                📝 <FormattedMessage {...messages.submitToAssignment} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Assignment Submission Info */}
                                    {selectedProject.assignment_submissions && selectedProject.assignment_submissions.length > 0 && (
                                        <div className={styles.assignmentInfoSection}>
                                            <div className={styles.assignmentInfoItem}>
                                                <span className={styles.assignmentInfoLabel}><FormattedMessage {...messages.submittedToLabel} /></span>
                                                <span className={styles.assignmentInfoValue}>{selectedProject.assignment_submissions[0].assignment_name}</span>
                                            </div>
                                            {selectedProject.assignment_submissions[0].organizers && (
                                                <div className={styles.assignmentInfoItem}>
                                                    <span className={styles.assignmentInfoLabel}><FormattedMessage {...messages.organizerLabel} /></span>
                                                    <span className={styles.assignmentInfoValue}>
                                                        {selectedProject.assignment_submissions[0].organizers.map(org => org.username).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedProject.is_frozen && (
                                                <div className={styles.assignmentInfoItem}>
                                                    <span className={styles.assignmentInfoLabel}><FormattedMessage {...messages.statusLabel} /></span>
                                                    <span className={styles.assignmentInfoValue}>
                                                        🔒 <FormattedMessage {...messages.frozenStatus} />
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Permissions Section (Members & Groups combined) */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <img src={userIcon} alt="Permissions" className={styles.sectionIcon} />
                                    <FormattedMessage {...messages.permissions} />
                                    <span className={styles.badge}>
                                        {collaborators.filter(c => c.access_via !== 'owner').length + sharedGroups.length}
                                    </span>
                                </div>
                                {/* Admins can add members and groups */}
                                {selectedProject.permission === 'ADMIN' && (
                                    <div className={styles.addButtonGroup}>
                                        <button
                                            className={styles.addButton}
                                            onClick={() => {
                                                fetchAvailableUsers();
                                                handleShowAddMember(true);
                                            }}
                                            disabled={selectedProject.is_frozen}
                                            title={selectedProject.is_frozen ? 'Cannot modify frozen project' : ''}
                                        >
                                            + <FormattedMessage {...messages.addMember} />
                                        </button>
                                        <button
                                            className={styles.addButton}
                                            onClick={() => {
                                                fetchAvailableGroups();
                                                handleShowAddGroup(true);
                                            }}
                                            disabled={selectedProject.is_frozen}
                                            title={selectedProject.is_frozen ? 'Cannot modify frozen project' : ''}
                                        >
                                            + <FormattedMessage {...messages.addGroup} />
                                        </button>
                                    </div>
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
                                            {selectedProject.permission === 'ADMIN' && (
                                                <div className={styles.permissionControls}>
                                                    <select
                                                        className={styles.permissionSelect}
                                                        value={collab.permission || 'READ'}
                                                        onChange={(e) => handleChangeUserPermission(
                                                            collab.user.id,
                                                            e.target.value
                                                        )}
                                                        disabled={selectedProject.is_frozen}
                                                        title={selectedProject.is_frozen ? 'Cannot modify frozen project' : ''}
                                                    >
                                                        <option value="READ">
                                                            {intl.formatMessage(messages.permissionRead)}
                                                        </option>
                                                        <option value="WRITE">
                                                            {intl.formatMessage(messages.permissionWrite)}
                                                        </option>
                                                        <option value="ADMIN">
                                                            {intl.formatMessage(messages.permissionAdmin)}
                                                        </option>
                                                    </select>
                                                    <button
                                                        className={styles.removeButton}
                                                        onClick={() => handleRevokePermission(collab.permission_id)}
                                                        title={selectedProject.is_frozen ? 'Cannot modify frozen project' : collab.permission_id || 'unknown'}
                                                        disabled={selectedProject.is_frozen}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Read-only permission display */}
                                            {selectedProject.permission !== 'ADMIN' && (
                                                <div className={styles.permissionBadge}>
                                                    {collab.permission === 'ADMIN' && '👑 Admin'}
                                                    {collab.permission === 'WRITE' && '✏️ Schreiben'}
                                                    {collab.permission === 'READ' && '👁️ Lesen'}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }
                                
                                {/* Group Permissions */}
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
                                                {selectedProject.permission === 'ADMIN' && (
                                                    <div className={styles.permissionControls}>
                                                        <select
                                                            className={styles.permissionSelect}
                                                            value={collab.permission || 'READ'}
                                                            onChange={(e) => handleChangeGroupPermission(
                                                                collab.group.id,
                                                                e.target.value
                                                            )}
                                                            disabled={selectedProject.is_frozen}
                                                            title={selectedProject.is_frozen ? 'Cannot modify frozen project' : ''}
                                                        >
                                                            <option value="READ">
                                                                {intl.formatMessage(messages.permissionRead)}
                                                            </option>
                                                            <option value="WRITE">
                                                                {intl.formatMessage(messages.permissionWrite)}
                                                            </option>
                                                            <option value="ADMIN">
                                                                {intl.formatMessage(messages.permissionAdmin)}
                                                            </option>
                                                        </select>
                                                        
                                                        <button
                                                            className={styles.removeButton}
                                                            onClick={() => handleRevokePermission(collab.permission_id)}
                                                            title={selectedProject.is_frozen ? 'Cannot modify frozen project' : 'Remove group'}
                                                            disabled={selectedProject.is_frozen}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Read-only permission display */}
                                                {selectedProject.permission !== 'ADMIN' && (
                                                    <div className={styles.permissionBadge}>
                                                        {collab.permission === 'ADMIN' && '👑 Admin'}
                                                        {collab.permission === 'WRITE' && '✏️ Schreiben'}
                                                        {collab.permission === 'READ' && '👁️ Lesen'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                
                                {collaborators.filter(c => c.access_via !== 'owner').length === 0 && sharedGroups.length === 0 && (
                                    <div className={styles.emptyMessage}>
                                        No members or groups have access to this project
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                        {/* End Project Info Container */}

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
                                                            disabled={selectedProject.is_frozen}
                                                            title={selectedProject.is_frozen ? 'Cannot modify frozen project' : ''}
                                                        >
                                                            🔨 <FormattedMessage {...messages.workHere} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={styles.actionButton}
                                                                onClick={() => handleLoadWorkingCopy(commit.project_id)}
                                                                disabled={selectedProject.is_frozen}
                                                                title={selectedProject.is_frozen ? 'Cannot open frozen project' : ''}
                                                            >
                                                                📂 <FormattedMessage {...messages.open} />
                                                            </button>
                                                            
                                                            {hasUnsavedChanges && (
                                                                <button
                                                                    className={styles.actionButtonPrimary}
                                                                    onClick={() => handleShowCommitDialog(true)}
                                                                    disabled={selectedProject.is_frozen}
                                                                    title={selectedProject.is_frozen ? 'Cannot commit to frozen project' : ''}
                                                                >
                                                                    ✅ <FormattedMessage {...messages.commit} />
                                                                </button>
                                                            )}
                                                            
                                                            <button
                                                                className={styles.actionButtonDanger}
                                                                onClick={() => handleShowResetConfirm(commit.project_id)}
                                                                disabled={selectedProject.is_frozen}
                                                                title={selectedProject.is_frozen ? 'Cannot delete from frozen project' : ''}
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
            
            {/* Assignment Submission Dialog */}
            {showAssignmentDialog && selectedProject && (
                <AssignmentSubmissionDialog
                    projectId={selectedProject.id}
                    currentSubmissions={selectedProject.assignment_submissions || []}
                    onSubmit={handleSubmitToAssignment}
                    onClose={() => setShowAssignmentDialog(false)}
                    intl={intl}
                />
            )}
            
            {/* Withdraw Confirmation Dialog */}
            {showWithdrawConfirm && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <div className={styles.dialogHeader}>
                            <h3>⚠️ <FormattedMessage {...messages.confirm} /></h3>
                            <button className={styles.dialogClose} onClick={() => setShowWithdrawConfirm(false)}>×</button>
                        </div>
                        <div className={styles.dialogBody}>
                            <p style={{fontSize: '1rem', lineHeight: '1.5'}}>
                                <FormattedMessage {...messages.confirmWithdrawSubmission} />
                            </p>
                        </div>
                        <div className={styles.dialogFooter}>
                            <button className={styles.cancelButton} onClick={() => setShowWithdrawConfirm(false)}>
                                <FormattedMessage {...messages.cancel} />
                            </button>
                            <button
                                className={styles.confirmButton}
                                style={{ backgroundColor: '#dc3545' }}
                                onClick={confirmWithdrawSubmission}
                            >
                                <FormattedMessage {...messages.withdrawFromAssignment} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Withdraw Error Dialog */}
            {withdrawError && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <div className={styles.dialogHeader}>
                            <h3>❌ Error</h3>
                            <button className={styles.dialogClose} onClick={() => setWithdrawError(null)}>×</button>
                        </div>
                        <div className={styles.dialogBody}>
                            <p style={{fontSize: '1rem', lineHeight: '1.5'}}>{withdrawError}</p>
                        </div>
                        <div className={styles.dialogFooter}>
                            <button className={styles.cancelButton} onClick={() => setWithdrawError(null)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    onRefreshProjects: PropTypes.func,
    intl: PropTypes.object.isRequired,
    messages: PropTypes.object.isRequired
};

export default MyProjectsTab;
