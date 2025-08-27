import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl, intlShape } from 'react-intl';
import {connect} from 'react-redux';
import ReactModal from 'react-modal';
import { UserContext } from '../../contexts/UserContext';
import * as ProjectManager from '../../lib/project-management';
import {setProjectTitle} from '../../reducers/project-title';

import styles from './projects-modal.css';
import closeIcon from './icons/icon--close.svg';
import folderIcon from './icons/icon--folder.svg';
import shareIcon from './icons/icon--share.svg';
import copyIcon from './icons/icon--copy.svg';
import playIcon from './icons/icon--play.svg';
import {setPlayer, setFullScreen} from '../../reducers/mode';
import PlayerModal from '../player-modal/player-modal.jsx';

const messages = defineMessages({
    // Existing messages...
    title: {
        id: 'gui.projectsModal.title',
        defaultMessage: 'My Projects',
        description: 'Title for the projects modal'
    },
    loading: {
        id: 'gui.projectsModal.loading',
        defaultMessage: 'Loading projects...',
        description: 'Text displayed when projects are being loaded'
    },
    noProjects: {
        id: 'gui.projectsModal.noProjects',
        defaultMessage: 'You don\'t have any saved projects yet.',
        description: 'Text displayed when user has no saved projects'
    },
    error: {
        id: 'gui.projectsModal.error',
        defaultMessage: 'Failed to load projects. Please try again.',
        description: 'Error message when projects cannot be loaded'
    },
    loadError: {
        id: 'gui.projectsModal.loadError',
        defaultMessage: 'Failed to load project. Please try again.',
        description: 'Error message when a project cannot be loaded'
    },
    lastUpdated: {
        id: 'gui.projectsModal.lastUpdated',
        defaultMessage: 'Last Updated',
        description: 'Label for when a project was last updated'
    },
    created: {
        id: 'gui.projectsModal.created',
        defaultMessage: 'Created',
        description: 'Label for when a project was created'
    },
    openProject: {
        id: 'gui.projectsModal.openProject',
        defaultMessage: 'Open',
        description: 'Button to open a project'
    },
    deleteProject: {
        id: 'gui.projectsModal.deleteProject',
        defaultMessage: 'Delete',
        description: 'Button to delete a project'
    },
    confirmDelete: {
        id: 'gui.projectsModal.confirmDelete',
        defaultMessage: 'Are you sure you want to delete this project?',
        description: 'Confirmation message for project deletion'
    },
    shareProject: {
        id: 'gui.projectsModal.shareProject',
        defaultMessage: 'Share',
        description: 'Button to share a project with groups'
    },
    shareTitle: {
        id: 'gui.projectsModal.shareTitle',
        defaultMessage: 'Share Project with Groups',
        description: 'Title for the share dialog'
    },
    selectGroups: {
        id: 'gui.projectsModal.selectGroups',
        defaultMessage: 'Select groups to share with:',
        description: 'Prompt to select groups for sharing'
    },
    saveSharing: {
        id: 'gui.projectsModal.saveSharing',
        defaultMessage: 'Save',
        description: 'Button to save sharing settings'
    },
    cancelSharing: {
        id: 'gui.projectsModal.cancelSharing',
        defaultMessage: 'Cancel',
        description: 'Button to cancel sharing settings'
    },
    sharedWith: {
        id: 'gui.projectsModal.sharedWith',
        defaultMessage: 'Shared with:',
        description: 'Label for groups the project is shared with'
    },
    loadingGroups: {
        id: 'gui.projectsModal.loadingGroups',
        defaultMessage: 'Loading groups...',
        description: 'Message shown while loading groups'
    },
    noGroups: {
        id: 'gui.projectsModal.noGroups',
        defaultMessage: 'You don\'t belong to any groups.',
        description: 'Message shown when user has no groups'
    },
    shareSuccess: {
        id: 'gui.projectsModal.shareSuccess',
        defaultMessage: 'Project shared successfully!',
        description: 'Message shown after successful sharing'
    },
    shareError: {
        id: 'gui.projectsModal.shareError',
        defaultMessage: 'Error sharing project. Please try again.',
        description: 'Message shown when sharing fails'
    },
    
    // New messages for shared projects view
    myProjects: {
        id: 'gui.projectsModal.myProjects',
        defaultMessage: 'My Projects',
        description: 'Tab title for user\'s own projects'
    },
    sharedProjects: {
        id: 'gui.projectsModal.sharedProjects',
        defaultMessage: 'Shared With Me',
        description: 'Tab title for projects shared with the user'
    },
    noSharedProjects: {
        id: 'gui.projectsModal.noSharedProjects',
        defaultMessage: 'No projects have been shared with you yet.',
        description: 'Text displayed when user has no shared projects'
    },
    viewProject: {
        id: 'gui.projectsModal.viewProject',
        defaultMessage: 'View',
        description: 'Button to view a shared project'
    },
    copyProject: {
        id: 'gui.projectsModal.copyProject',
        defaultMessage: 'Make a Copy',
        description: 'Button to copy a shared project'
    },
    sharedBy: {
        id: 'gui.projectsModal.sharedBy',
        defaultMessage: 'Shared by:',
        description: 'Label for project owner'
    },
    loadingSharedProjects: {
        id: 'gui.projectsModal.loadingSharedProjects',
        defaultMessage: 'Loading shared projects...',
        description: 'Text displayed when shared projects are being loaded'
    },
    copySuccess: {
        id: 'gui.projectsModal.copySuccess',
        defaultMessage: 'Project copied successfully!',
        description: 'Message shown after successful project copy'
    },
    copyError: {
        id: 'gui.projectsModal.copyError',
        defaultMessage: 'Error copying project. Please try again.',
        description: 'Message shown when project copying fails'
    }
});

const ProjectsModal = ({ isOpen, onClose, vm, onUpdateProjectTitle, intl, onSetPlayer, onSetFullScreen }) => {
    const [activeTab, setActiveTab] = useState('my-projects');
    
    // State for my projects
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State for shared projects
    const [sharedProjects, setSharedProjects] = useState([]);
    const [loadingShared, setLoadingShared] = useState(true);
    const [errorShared, setErrorShared] = useState(null);
    
    // Common state
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [loadingProject, setLoadingProject] = useState(false);
    const [copiedProjectId, setCopiedProjectId] = useState(null);

    // Share dialog state
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedProjectForSharing, setSelectedProjectForSharing] = useState(null);
    const [userGroups, setUserGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [sharingStatus, setSharingStatus] = useState(null);

    const userContext = useContext(UserContext);
    const { isLoggedIn } = userContext;

    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const fetchProjects = useCallback(async () => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const projectsList = await ProjectManager.fetchProjects();
            setProjects(projectsList);
        } catch (err) {
            console.error('[ProjectsModal] Error fetching projects:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn]);
    
    const refreshProjectsList = () => {
        // If you have a function to fetch/load shared projects, call it here
        // Example: fetchSharedProjects();
        
        // Or if you have a ref to the projects list, you might need to force a refresh
        // This will depend on your implementation, but here's a generic approach:
        setForceRefresh(prevState => !prevState); // Toggle this state to force re-render
    };

    const fetchSharedProjects = useCallback(async () => {
        if (!isLoggedIn) {
            setLoadingShared(false);
            return;
        }
        
        setLoadingShared(true);
        setErrorShared(null);
        
        try {
            const sharedProjectsList = await ProjectManager.fetchSharedProjects();
            setSharedProjects(sharedProjectsList);
        } catch (err) {
            console.error('[ProjectsModal] Error fetching shared projects:', err);
            setErrorShared(err.message);
        } finally {
            setLoadingShared(false);
        }
    }, [isLoggedIn]);
    
    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'my-projects') {
                fetchProjects();
            } else {
                fetchSharedProjects();
            }
        }
    }, [isOpen, activeTab, fetchProjects, fetchSharedProjects]);
    
    const updateProjectMetadata = useCallback((projectId, title) => {
        if (userContext) {
            userContext.setProjectId(projectId);
            userContext.setProjectTitle(title);
            userContext.setProjectChanged(false);
        }
    }, [userContext]);

    const handleOpenProject = useCallback(async projectId => {
        try {
            console.log('[ProjectsModal] Opening project:', projectId);
            setLoadingProject(true);
            
            // Close modal first to improve UI responsiveness
            onClose();
            
            // Check that VM is available
            if (!vm) {
                throw new Error('VM is not available');
            }
            
            // Load the project using ProjectManager
            const metadata = await ProjectManager.loadProject(projectId, vm, {
                onUpdateMetadata: updateProjectMetadata,
                onUpdateTitle: onUpdateProjectTitle
            });
            
            //console.log('[ProjectsModal] Project loaded successfully:', metadata);
        } catch (err) {
            console.error('[ProjectsModal] Error opening project:', err);
            setError(intl.formatMessage(messages.loadError));
        } finally {
            setLoadingProject(false);
        }
    }, [onClose, vm, onUpdateProjectTitle, updateProjectMetadata, intl]);
    
    const handleViewSharedProject = useCallback(projectId => {
        setSelectedProjectId(projectId);
        setPlayerModalOpen(true);
    }, []);

    const handleClosePlayerModal = useCallback(() => {
        setPlayerModalOpen(false);
        setSelectedProjectId(null);
    }, []);

    const handleCopyProject = useCallback(async (projectId) => {
        try {
            setCopiedProjectId(projectId);
            const copiedProject = await ProjectManager.copyProject(projectId);
            
            // Update the projects list with the new copy
            setProjects(prev => [copiedProject, ...prev]);
            
            // Show success briefly
            setTimeout(() => {
                setCopiedProjectId(null);
            }, 2000);
            
        } catch (err) {
            console.error('[ProjectsModal] Error copying project:', err);
            setCopiedProjectId(null);
            setErrorShared(intl.formatMessage(messages.copyError));
        }
    }, [intl]);

    const handleDeleteClick = useCallback(projectId => {
        setDeleteConfirmation(projectId);
    }, []);

    const handleConfirmDelete = useCallback(async projectId => {
        try {
            await ProjectManager.deleteProject(projectId);
            
            // Remove the project from the list
            setProjects(projects.filter(project => project.id !== projectId));
            
            // Clear the confirmation dialog
            setDeleteConfirmation(null);
        } catch (err) {
            console.error('[ProjectsModal] Error deleting project:', err);
            setError(err.message);
        }
    }, [projects]);

    const handleCancelDelete = useCallback(() => {
        setDeleteConfirmation(null);
    }, []);

    const loadUserGroups = useCallback(async () => {
        if (!isLoggedIn) return;
        
        setLoadingGroups(true);
        
        try {
            const groups = await ProjectManager.fetchUserGroups();
            setUserGroups(groups);
        } catch (err) {
            console.error('[ProjectsModal] Error fetching groups:', err);
        } finally {
            setLoadingGroups(false);
        }
    }, [isLoggedIn]);
    
    // Load groups when the modal opens
    useEffect(() => {
        if (isOpen && activeTab === 'my-projects') {
            loadUserGroups();
        }
    }, [isOpen, activeTab, loadUserGroups]);

    // Function to open share dialog for a project
    const handleShareClick = useCallback(project => {
        setSelectedProjectForSharing(project);
        
        // Use the ProjectManager to get the current sharing state
        const currentlySharedWith = ProjectManager.getProjectSharingState(project);
        setSelectedGroups(currentlySharedWith);
        
        setShareDialogOpen(true);
        setSharingStatus(null);
    }, []);
    
    // Function to handle group selection
    const handleGroupToggle = useCallback(groupId => {
        setSelectedGroups(prevSelected => {
            if (prevSelected.includes(groupId)) {
                return prevSelected.filter(id => id !== groupId);
            } else {
                return [...prevSelected, groupId];
            }
        });
    }, []);
    
    // Function to save sharing settings
    const handleSaveSharing = useCallback(async () => {
        if (!selectedProjectForSharing) return;
        
        try {
            // Use ProjectManager to share the project
            const updatedProject = await ProjectManager.shareProject(
                selectedProjectForSharing.id,
                selectedGroups
            );
            
            // Update the project in the list with new sharing info
            setProjects(prevProjects => 
                prevProjects.map(project => 
                    project.id === selectedProjectForSharing.id ? 
                        {...project, shared_with_groups: updatedProject.shared_with_groups} : 
                        project
                )
            );
            
            setSharingStatus('success');
            
            // Close the dialog after showing success for a moment
            setTimeout(() => {
                setShareDialogOpen(false);
                setSharingStatus(null);
            }, 1500);
            
        } catch (err) {
            console.error('[ProjectsModal] Error sharing project:', err);
            setSharingStatus('error');
        }
    }, [selectedProjectForSharing, selectedGroups]);
    
    // Function to close the share dialog
    const handleCloseShareDialog = useCallback(() => {
        setShareDialogOpen(false);
        setSelectedProjectForSharing(null);
        setSelectedGroups([]);
        setSharingStatus(null);
    }, []);
    
    // Function to switch between tabs
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
    }, []);

    const formatDate = date => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = date => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <>
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onClose}
            className={styles.projectsModalContainer}
            overlayClassName={styles.projectsModalOverlay}
            contentLabel={intl.formatMessage(messages.title)}
            appElement={document.getElementById('app')}
        >
            <div className={styles.modalHeader}>
                <div className={styles.headerTitle}>
                    <img
                        className={styles.folderIcon}
                        src={folderIcon}
                        alt="Projects"
                    />
                    <FormattedMessage {...messages.title} />
                </div>
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close"
                >
                    <img
                        className={styles.closeIcon}
                        src={closeIcon}
                        alt="Close"
                    />
                </button>
            </div>
            
            {/* Tab navigation */}
            <div className={styles.tabsContainer}>
                <div 
                    className={`${styles.tab} ${activeTab === 'my-projects' ? styles.activeTab : ''}`}
                    onClick={() => handleTabChange('my-projects')}
                >
                    <FormattedMessage {...messages.myProjects} />
                </div>
                <div 
                    className={`${styles.tab} ${activeTab === 'shared-projects' ? styles.activeTab : ''}`}
                    onClick={() => handleTabChange('shared-projects')}
                >
                    <FormattedMessage {...messages.sharedProjects} />
                </div>
            </div>
            
            <div className={styles.modalContent}>
                {/* My Projects Tab Content */}
                {activeTab === 'my-projects' && (
                    <>
                        {loading && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner} />
                                <FormattedMessage {...messages.loading} />
                            </div>
                        )}
                        
                        {!loading && error && (
                            <div className={styles.errorContainer}>
                                <FormattedMessage {...messages.error} />
                                <button 
                                    className={styles.retryButton}
                                    onClick={fetchProjects}
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        
                        {!loading && !error && projects.length === 0 && (
                            <div className={styles.emptyContainer}>
                                <FormattedMessage {...messages.noProjects} />
                            </div>
                        )}
                        
                        {!loading && !error && projects.length > 0 && (
                            <div className={styles.projectsGrid}>
                                {projects.map(project => (
                                    <div 
                                        key={project.id}
                                        className={styles.projectCard}
                                    >
                                        {/* Thumbnail */}
                                        <div 
                                            className={styles.thumbnailContainer}
                                            onClick={() => handleOpenProject(project.id)}
                                        >
                                            <img 
                                                className={styles.thumbnailImage}
                                                src={project.thumbnail_url || '/static/images/default-project.png'}
                                                alt={project.title || 'Project thumbnail'}
                                                onError={(e) => {
                                                    e.target.src = '/static/default-thumbnail.png';
                                                    e.target.onerror = null;
                                                }}
                                            />
                                        </div>
                                        
                                        <div className={styles.projectTitle}>
                                            {project.title || 'Untitled Project'}
                                        </div>

                                        {/* Shared groups */}
                                        <div className={styles.projectMeta}>
                                        
                                    
                                            <div className={styles.metaItem}>
                                                <span className={styles.metaLabel}>
                                                    <FormattedMessage {...messages.sharedWith} />
                                                </span>
                                                {project.shared_with_groups && project.shared_with_groups.length > 0 && (
                                                    <div className={styles.groupBadges}>
                                                        <span 
                                                            key={project.shared_with_groups[0].id} 
                                                            className={styles.groupBadge}
                                                            title={project.shared_with_groups[0].name}
                                                        >
                                                            {project.shared_with_groups[0].name}
                                                        </span>
                                                        
                                                        {project.shared_with_groups.length > 1 && (
                                                            <span 
                                                                className={`${styles.groupBadge} ${styles.moreGroupsBadge}`}
                                                                title={`${project.shared_with_groups.length - 1} more groups`}
                                                            >
                                                                +{project.shared_with_groups.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                            </div>
                                        
                                            <div className={styles.metaItem}>
                                                <span className={styles.metaLabel}>
                                                    <FormattedMessage {...messages.lastUpdated} />
                                                </span>
                                                <span className={styles.metaValue}>
                                                    {formatDate(project.updated_at)}<br />
                                                    {formatTime(project.updated_at)}
                                                </span>
                                            </div>
                                            <div className={styles.metaItem}>
                                                <span className={styles.metaLabel}>
                                                    <FormattedMessage {...messages.created} />
                                                </span>
                                                <span className={styles.metaValue}>
                                                    {formatDate(project.created_at)}<br />
                                                    {formatTime(project.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.projectActions}>
                                            <button 
                                                className={styles.shareButton}
                                                onClick={() => handleShareClick(project)}
                                            >
                                                <img 
                                                    className={styles.shareIcon}
                                                    src={shareIcon} 
                                                    alt="Share" 
                                                />
                                                <FormattedMessage {...messages.shareProject} />
                                            </button>
                                            <button 
                                                className={styles.deleteButton}
                                                onClick={() => handleDeleteClick(project.id)}
                                                disabled={loadingProject}
                                            >
                                                <FormattedMessage {...messages.deleteProject} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                
                {/* Shared Projects Tab Content */}
                {activeTab === 'shared-projects' && (
                    <>
                        {loadingShared && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner} />
                                <FormattedMessage {...messages.loadingSharedProjects} />
                            </div>
                        )}
                        
                        {!loadingShared && errorShared && (
                            <div className={styles.errorContainer}>
                                <FormattedMessage {...messages.error} />
                                <button 
                                    className={styles.retryButton}
                                    onClick={fetchSharedProjects}
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        
                        {!loadingShared && !errorShared && sharedProjects.length === 0 && (
                            <div className={styles.emptyContainer}>
                                <FormattedMessage {...messages.noSharedProjects} />
                            </div>
                        )}
                        
                        {!loadingShared && !errorShared && sharedProjects.length > 0 && (
                            <div className={styles.projectsGrid}>
                                {sharedProjects.map(project => (
                                    <div 
                                        key={project.id}
                                        className={styles.projectCard}
                                    >
                                        {/* Thumbnail */}
                                        <div 
                                            className={styles.thumbnailContainer}
                                            onClick={() => handleViewSharedProject(project.id)}
                                        >
                                            <img 
                                                className={styles.thumbnailImage}
                                                src={project.thumbnail_url || '/static/images/default-project.png'}
                                                alt={project.title || 'Project thumbnail'}
                                                onError={(e) => {
                                                    e.target.src = '/static/default-thumbnail.png';
                                                    e.target.onerror = null;
                                                }}
                                            />
                                        </div>
                                        
                                        <div className={styles.projectTitle}>
                                            {project.title || 'Untitled Project'}
                                        </div>
                                        
                                        {/* Owner info */}
                                        <div className={styles.sharedBy}>
                                            <div className={styles.sharedLabel}>
                                                <FormattedMessage {...messages.sharedBy} />
                                            </div>
                                            <div className={styles.ownerName}>
                                                {project.owner ? project.owner.username : 'Unknown user'}
                                            </div>
                                        </div>

                                        <div className={styles.projectMeta}>
                                            <div className={styles.metaItem}>
                                                <span className={styles.metaLabel}>
                                                    <FormattedMessage {...messages.lastUpdated} />
                                                </span>
                                                <span className={styles.metaValue}>
                                                    {formatDate(project.updated_at)}<br />
                                                    {formatTime(project.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.projectActions}>
                                            <button 
                                                className={styles.viewButton}
                                                onClick={() => handleViewSharedProject(project.id)}
                                                disabled={loadingProject}
                                            >
                                                <img 
                                                    className={styles.actionIcon}
                                                    src={playIcon} 
                                                    alt="View" 
                                                />
                                                <FormattedMessage {...messages.viewProject} />
                                            </button>
                                            
                                            <button 
                                                className={styles.copyButton}
                                                onClick={() => handleCopyProject(project.id)}
                                                disabled={loadingProject || copiedProjectId === project.id}
                                            >
                                                {copiedProjectId === project.id ? (
                                                    <FormattedMessage {...messages.copySuccess} />
                                                ) : (
                                                    <>
                                                        <img 
                                                            className={styles.actionIcon}
                                                            src={copyIcon} 
                                                            alt="Copy" 
                                                        />
                                                        <FormattedMessage {...messages.copyProject} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
                
                {/* Delete confirmation dialog */}
                {deleteConfirmation && (
                    <div className={styles.confirmationOverlay}>
                        <div className={styles.confirmationDialog}>
                            <div className={styles.confirmationMessage}>
                                <FormattedMessage {...messages.confirmDelete} />
                            </div>
                            <div className={styles.confirmationButtons}>
                                <button 
                                    className={styles.cancelButton}
                                    onClick={handleCancelDelete}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={styles.confirmButton}
                                    onClick={() => handleConfirmDelete(deleteConfirmation)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Share dialog */}
                {shareDialogOpen && selectedProjectForSharing && (
                    <div className={styles.shareOverlay}>
                        <div className={styles.shareDialog}>
                            <div className={styles.shareHeader}>
                                <h2 className={styles.shareTitle}>
                                    <FormattedMessage {...messages.shareTitle} />
                                </h2>
                                <button
                                    className={styles.shareCloseButton}
                                    onClick={handleCloseShareDialog}
                                    aria-label="Close"
                                >
                                    <img
                                        className={styles.closeIcon}
                                        src={closeIcon}
                                        alt="Close"
                                    />
                                </button>
                            </div>
                            
                            <div className={styles.shareContent}>
                                {/* Share dialog content - unchanged */}
                                <div className={styles.shareProjectInfo}>
                                    <div className={styles.shareThumbnail}>
                                        <img 
                                            src={selectedProjectForSharing.thumbnail_url || '/static/images/default-project.png'} 
                                            alt={selectedProjectForSharing.title || 'Project thumbnail'}
                                            onError={(e) => {
                                                e.target.src = '/static/default-thumbnail.png';
                                                e.target.onerror = null;
                                            }}
                                        />
                                    </div>
                                    <div className={styles.shareProjectTitle}>
                                        {selectedProjectForSharing.title || 'Untitled Project'}
                                    </div>
                                </div>
                                
                                <div className={styles.shareGroups}>
                                    <div className={styles.shareGroupsLabel}>
                                        <FormattedMessage {...messages.selectGroups} />
                                    </div>
                                    
                                    {loadingGroups ? (
                                        <div className={styles.loadingGroupsMessage}>
                                            <div className={styles.spinner} />
                                            <FormattedMessage {...messages.loadingGroups} />
                                        </div>
                                    ) : userGroups.length === 0 ? (
                                        <div className={styles.noGroupsMessage}>
                                            <FormattedMessage {...messages.noGroups} />
                                        </div>
                                    ) : (
                                        <div className={styles.groupList}>
                                            {userGroups.map(group => (
                                                <div 
                                                    key={group.id}
                                                    className={styles.groupItem}
                                                >
                                                    <label className={styles.groupCheckboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            className={styles.groupCheckbox}
                                                            checked={selectedGroups.includes(group.id)}
                                                            onChange={() => handleGroupToggle(group.id)}
                                                        />
                                                        <span className={styles.groupName}>{group.name}</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Sharing status message */}
                                {sharingStatus === 'success' && (
                                    <div className={styles.sharingSuccess}>
                                        <FormattedMessage {...messages.shareSuccess} />
                                    </div>
                                )}
                                
                                {sharingStatus === 'error' && (
                                    <div className={styles.sharingError}>
                                        <FormattedMessage {...messages.shareError} />
                                    </div>
                                )}
                                
                                {/* Action buttons */}
                                <div className={styles.shareActions}>
                                    <button
                                        className={styles.shareCancelButton}
                                        onClick={handleCloseShareDialog}
                                    >
                                        <FormattedMessage {...messages.cancelSharing} />
                                    </button>
                                    <button
                                        className={styles.shareSaveButton}
                                        onClick={handleSaveSharing}
                                        disabled={loadingGroups || sharingStatus === 'success'}
                                    >
                                        <FormattedMessage {...messages.saveSharing} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ReactModal>
        {playerModalOpen && (
            <PlayerModal
                isOpen={playerModalOpen}
                onClose={() => setPlayerModalOpen(false)}
                projectId={selectedProjectId}
                onAfterClose={refreshProjectsList} // Add this callback
            />
        )}
        </>
    );
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onUpdateProjectTitle: title => dispatch(setProjectTitle(title)),
    onSetPlayer: playerOnly => dispatch(setPlayer(playerOnly)),
    onSetFullScreen: fullScreen => dispatch(setFullScreen(fullScreen))
});

ProjectsModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    onUpdateProjectTitle: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    onSetPlayer: PropTypes.func.isRequired,
    onSetFullScreen: PropTypes.func.isRequired
};

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectsModal));