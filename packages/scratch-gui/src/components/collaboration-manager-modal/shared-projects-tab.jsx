import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './collaboration-manager-modal.css';

/**
 * Shared Projects Tab - Shows projects with read-only permission
 */
const SharedProjectsTab = ({
    sharedProjects,
    loadingShared,
    errorShared,
    selectedOwner,
    groupedSharedProjects,
    onOwnerSelect,
    handleViewInPlayer,
    handleCopySharedProject,
    formatDate,
    intl,
    messages
}) => {
    return (
        <>
            {/* Left Side: Owner List */}
            <div className={styles.projectList}>
                {loadingShared && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                        <FormattedMessage {...messages.loadingSharedProjects} />
                    </div>
                )}
                
                {!loadingShared && errorShared && (
                    <div className={styles.errorContainer}>
                        <FormattedMessage {...messages.error} />
                    </div>
                )}
                
                {!loadingShared && !errorShared && Object.keys(groupedSharedProjects).length === 0 && (
                    <div className={styles.emptyContainer}>
                        <FormattedMessage {...messages.noSharedProjects} />
                    </div>
                )}
                
                {!loadingShared && !errorShared && Object.keys(groupedSharedProjects).length > 0 && (
                    <div className={styles.ownersList}>
                        {Object.values(groupedSharedProjects).map(({ owner, projects }) => (
                            <div
                                key={owner.id}
                                className={`${styles.projectItem} ${
                                    selectedOwner?.id === owner.id ? styles.projectItemSelected : ''
                                }`}
                                onClick={() => onOwnerSelect(owner)}
                            >
                                <div className={styles.projectItemThumbnail}>
                                    <div className={styles.ownerAvatar}>
                                        {owner.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                </div>
                                
                                <div className={styles.projectItemContent}>
                                    <div className={styles.projectItemTitle}>
                                        {owner.username || 'Unknown User'}
                                    </div>
                                    <div className={styles.projectItemMeta}>
                                        <span className={styles.projectBadge}>
                                            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Side: Shared Projects Content */}
            <div className={styles.contentArea}>
                {!selectedOwner && (
                    <div className={styles.emptyContent}>
                        Wähle einen Besitzer aus, um dessen geteilte Projekte anzuzeigen
                    </div>
                )}
                
                {selectedOwner && (
                    <>
                        {/* Owner Header */}
                        <div className={styles.sharedProjectsHeader}>
                            <div className={styles.ownerInfo}>
                                <div className={styles.ownerAvatarLarge}>
                                    {selectedOwner.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h2 className={styles.ownerName}>
                                        {selectedOwner.username || 'Unknown User'}
                                    </h2>
                                    <div className={styles.ownerMeta}>
                                        <FormattedMessage {...messages.sharedBy} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shared Projects Grid */}
                        <div className={styles.sharedProjectsGrid}>
                            {groupedSharedProjects[selectedOwner.id]?.projects.map(project => (
                                <div 
                                    key={project.id}
                                    className={styles.sharedProjectCard}
                                >
                                    {/* Thumbnail */}
                                    <div 
                                        className={styles.thumbnailContainer}
                                        onClick={() => handleViewInPlayer(project.latest_commit_id)}
                                    >
                                        <img 
                                            className={styles.thumbnailImage}
                                            src={project.thumbnail_url || '/static/images/default-project.png'}
                                            alt={project.title || 'Project'}
                                            onError={(e) => {
                                                e.target.src = '/static/default-thumbnail.png';
                                                e.target.onerror = null;
                                            }}
                                        />
                                    </div>
                                    
                                    <div className={styles.projectTitle}>
                                        {project.title || project.name || 'Untitled Project'}
                                    </div>

                                    {/* Shared with groups */}
                                    {project.shared_with_groups && project.shared_with_groups.length > 0 && (
                                        <div className={styles.sharedGroups}>
                                            <div className={styles.sharedLabel}>
                                                <FormattedMessage {...messages.sharedWith} />:
                                            </div>
                                            <div className={styles.groupBadges}>
                                                {project.shared_with_groups.map(group => (
                                                    <span 
                                                        key={group.id} 
                                                        className={styles.groupBadge}
                                                        title={group.name}
                                                    >
                                                        👥 {group.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.projectMeta}>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>
                                                Zuletzt aktualisiert
                                            </span>
                                            <span className={styles.metaValue}>
                                                {formatDate(project.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.projectActions}>
                                        <button 
                                            className={styles.actionButton}
                                            onClick={() => handleViewInPlayer(project.latest_commit_id)}
                                        >
                                            👁️ <FormattedMessage {...messages.viewSharedProject} />
                                        </button>
                                        <button 
                                            className={styles.actionButtonPrimary}
                                            onClick={() => handleCopySharedProject(project.id)}
                                        >
                                            📋 <FormattedMessage {...messages.copySharedProject} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

SharedProjectsTab.propTypes = {
    sharedProjects: PropTypes.array.isRequired,
    loadingShared: PropTypes.bool.isRequired,
    errorShared: PropTypes.string,
    selectedOwner: PropTypes.object,
    groupedSharedProjects: PropTypes.object.isRequired,
    onOwnerSelect: PropTypes.func.isRequired,
    handleViewInPlayer: PropTypes.func.isRequired,
    handleCopySharedProject: PropTypes.func.isRequired,
    formatDate: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    messages: PropTypes.object.isRequired
};

export default SharedProjectsTab;
