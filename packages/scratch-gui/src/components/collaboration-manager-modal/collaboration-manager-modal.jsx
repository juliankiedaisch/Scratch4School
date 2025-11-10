import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import ReactModal from 'react-modal';
import { UserContext } from '../../contexts/UserContext';
import * as ProjectManager from '../../lib/project-management';

import styles from './collaboration-manager-modal.css';
import closeIcon from '../projects-modal/icons/icon--close.svg';
import collaborativeIcon from '../menu-bar/icon--mystuff.png';
import { connect } from 'react-redux';
import { setProjectTitle } from '../../reducers/project-title';
import { setProjectId } from '../../reducers/project-state';
import PlayerModal from '../player-modal/player-modal.jsx';
import MyProjectsTab from './my-projects-tab.jsx';
import CollaborationProjectsTab from './collaboration-projects-tab.jsx';
import SharedProjectsTab from './shared-projects-tab.jsx';

const messages = defineMessages({
    title: {
        id: 'gui.collaborationModal.title',
        defaultMessage: 'Collaborative Projects',
        description: 'Title for the collaboration manager modal'
    },
    loading: {
        id: 'gui.collaborationModal.loading',
        defaultMessage: 'Loading projects...',
        description: 'Text displayed when projects are being loaded'
    },
    noProjects: {
        id: 'gui.collaborationModal.noProjects',
        defaultMessage: 'You don\'t have any projects yet.',
        description: 'Text displayed when user has no projects'
    },
    error: {
        id: 'gui.collaborationModal.error',
        defaultMessage: 'Failed to load projects. Please try again.',
        description: 'Error message when projects cannot be loaded'
    },
    makeCollaborative: {
        id: 'gui.collaborationModal.makeCollaborative',
        defaultMessage: 'Make Collaborative',
        description: 'Button to convert project to collaborative'
    },
    makeCollaborativeTitle: {
        id: 'gui.collaborationModal.makeCollaborativeTitle',
        defaultMessage: 'Convert to Collaborative Project',
        description: 'Title for making project collaborative'
    },
    makeCollaborativeDescription: {
        id: 'gui.collaborationModal.makeCollaborativeDescription',
        defaultMessage: 'This will enable version control and allow you to invite collaborators. The current project state will become the first commit.',
        description: 'Description for making project collaborative'
    },
    confirmMakeCollaborative: {
        id: 'gui.collaborationModal.confirmMakeCollaborative',
        defaultMessage: 'Are you sure you want to make this project collaborative?',
        description: 'Confirmation message for making project collaborative'
    },
    addMember: {
        id: 'gui.collaborationModal.addMember',
        defaultMessage: 'Add Member',
        description: 'Button to add a collaborator'
    },
    members: {
        id: 'gui.collaborationModal.members',
        defaultMessage: 'Collaborators',
        description: 'Label for collaborators section'
    },
    commits: {
        id: 'gui.collaborationModal.commits',
        defaultMessage: 'Commits',
        description: 'Label for commits section'
    },
    workingCopy: {
        id: 'gui.collaborationModal.workingCopy',
        defaultMessage: 'Your Working Copy',
        description: 'Label for working copy'
    },
    lastSaved: {
        id: 'gui.collaborationModal.lastSaved',
        defaultMessage: 'Last saved',
        description: 'Label for last saved time'
    },
    load: {
        id: 'gui.collaborationModal.load',
        defaultMessage: 'Load',
        description: 'Button to load a commit or working copy'
    },
    commit: {
        id: 'gui.collaborationModal.commit',
        defaultMessage: 'Commit Changes',
        description: 'Button to commit working copy'
    },
    workHere: {
        id: 'gui.collaborationModal.workHere',
        defaultMessage: 'Work on this Version',
        description: 'Button to create working copy from commit'
    },
    loadThisVersion: {
        id: 'gui.collaborationModal.loadThisVersion',
        defaultMessage: 'Load this Version',
        description: 'Button to load specific commit'
    },
    commitMessage: {
        id: 'gui.collaborationModal.commitMessage',
        defaultMessage: 'Commit Message',
        description: 'Label for commit message input'
    },
    commitMessagePlaceholder: {
        id: 'gui.collaborationModal.commitMessagePlaceholder',
        defaultMessage: 'Describe your changes...',
        description: 'Placeholder for commit message'
    },
    cancel: {
        id: 'gui.collaborationModal.cancel',
        defaultMessage: 'Cancel',
        description: 'Cancel button'
    },
    save: {
        id: 'gui.collaborationModal.save',
        defaultMessage: 'Add',
        description: 'Save button'
    },
    confirm: {
        id: 'gui.collaborationModal.confirm',
        defaultMessage: 'Confirm',
        description: 'Confirm button'
    },
    collaborative: {
        id: 'gui.collaborationModal.collaborative',
        defaultMessage: 'Collaborative',
        description: 'Label for collaborative projects'
    },
    normal: {
        id: 'gui.collaborationModal.normal',
        defaultMessage: 'Normal',
        description: 'Label for normal projects'
    },
    owner: {
        id: 'gui.collaborationModal.owner',
        defaultMessage: 'Owner',
        description: 'Label for project owner'
    },
    invited: {
        id: 'gui.collaborationModal.invited',
        defaultMessage: 'Invited',
        description: 'Label for invited collaborators'
    },
    viaGroup: {
        id: 'gui.collaborationModal.viaGroup',
        defaultMessage: 'Via Group',
        description: 'Label for group members'
    },
    searchUsers: {
        id: 'gui.collaborationModal.searchUsers',
        defaultMessage: 'Search users...',
        description: 'Placeholder for user search'
    },
    noUsersFound: {
        id: 'gui.collaborationModal.noUsersFound',
        defaultMessage: 'No users found',
        description: 'Message when no users match search'
    },
    hasWorkingCopy: {
        id: 'gui.collaborationModal.hasWorkingCopy',
        defaultMessage: 'You have unsaved changes',
        description: 'Message when user has working copy'
    },
    selectGroup: {
        id: 'gui.collaborationModal.selectGroup',
        defaultMessage: 'Select a group (optional)',
        description: 'Label for group selection'
    },
    noGroup: {
        id: 'gui.collaborationModal.noGroup',
        defaultMessage: 'No group (invite individuals)',
        description: 'Option for no group'
    },
    initialCommitMessage: {
        id: 'gui.collaborationModal.initialCommitMessage',
        defaultMessage: 'Initial Commit Message',
        description: 'Label for initial commit message'
    },
    initialCommitMessagePlaceholder: {
        id: 'gui.collaborationModal.initialCommitMessagePlaceholder',
        defaultMessage: 'Initial version',
        description: 'Placeholder for initial commit message'
    },
    open: {
        id: 'gui.collaborationModal.open',
        defaultMessage: 'Open',
        description: 'Button to open a commit'
    },
    resetWorkingCopy: {
        id: 'gui.collaborationModal.resetWorkingCopy',
        defaultMessage: 'Reset Changes',
        description: 'Button to reset working copy'
    },
    confirmReset: {
        id: 'gui.collaborationModal.confirmReset',
        defaultMessage: 'Are you sure you want to reset? All unsaved changes will be lost.',
        description: 'Confirmation message for resetting working copy'
    },
    unsavedChanges: {
        id: 'gui.collaborationModal.unsavedChanges',
        defaultMessage: 'You have unsaved changes based on this version',
        description: 'Message when working copy exists'
    },
    deleteWorkingCopy: {
        id: 'gui.collaborationModal.deleteWorkingCopy',
        defaultMessage: 'Delete Working Copy',
        description: 'Button to delete working copy'
    },
    confirmDeleteWorkingCopy: {
        id: 'gui.collaborationModal.confirmDeleteWorkingCopy',
        defaultMessage: 'Are you sure you want to delete this working copy? All unsaved changes will be lost.',
        description: 'Confirmation message for deleting working copy'
    },
    deleteProject: {
        id: 'gui.collaborationModal.deleteProject',
        defaultMessage: 'Leave/Delete Project',
        description: 'Button to delete or leave project'
    },
    confirmDeleteOwner: {
        id: 'gui.collaborationModal.confirmDeleteOwner',
        defaultMessage: 'Are you sure you want to delete this project? This will remove all commits and working copies. Other collaborators will lose access.',
        description: 'Confirmation for owner deleting project'
    },
    confirmDeleteCollaborator: {
        id: 'gui.collaborationModal.confirmDeleteCollaborator',
        defaultMessage: 'Are you sure you want to leave this project? Your working copies will be removed, but you will keep your current version as a standalone project.',
        description: 'Confirmation for collaborator leaving project'
    },
    deleteSuccess: {
        id: 'gui.collaborationModal.deleteSuccess',
        defaultMessage: 'Project deleted successfully',
        description: 'Success message after deletion'
    },
    leaveSuccess: {
        id: 'gui.collaborationModal.leaveSuccess',
        defaultMessage: 'You have left the project',
        description: 'Success message after leaving'
    },
    private: {
        id: 'gui.collaborationModal.private',
        defaultMessage: 'Private',
        description: 'Label for private projects'
    },
    shared: {
        id: 'gui.collaborationModal.shared',
        defaultMessage: 'Shared',
        description: 'Label for shared projects (read-only)'
    },
    shareProject: {
        id: 'gui.collaborationModal.shareProject',
        defaultMessage: 'Share Project',
        description: 'Button to share project with groups'
    },
    shareWithGroups: {
        id: 'gui.collaborationModal.shareWithGroups',
        defaultMessage: 'Share with Groups',
        description: 'Title for share dialog'
    },
    selectGroupsToShare: {
        id: 'gui.collaborationModal.selectGroupsToShare',
        defaultMessage: 'Select groups to share with:',
        description: 'Label for group selection in share dialog'
    },
    sharedWith: {
        id: 'gui.collaborationModal.sharedWith',
        defaultMessage: 'Shared with',
        description: 'Label showing which groups have access'
    },
    noGroupsAvailable: {
        id: 'gui.collaborationModal.noGroupsAvailable',
        defaultMessage: 'You don\'t belong to any groups.',
        description: 'Message when no groups available for sharing'
    },
    shareSuccess: {
        id: 'gui.collaborationModal.shareSuccess',
        defaultMessage: 'Project shared successfully!',
        description: 'Success message after sharing'
    },
    shareError: {
        id: 'gui.collaborationModal.shareError',
        defaultMessage: 'Error sharing project. Please try again.',
        description: 'Error message when sharing fails'
    },
    openProject: {
        id: 'gui.collaborationModal.openProject',
        defaultMessage: 'Open Project',
        description: 'Button to open/edit project'
    },
    viewProject: {
        id: 'gui.collaborationModal.viewProject',
        defaultMessage: 'View Project',
        description: 'Button to view shared project (read-only)'
    },
    addCollaborator: {
        id: 'gui.collaborationModal.addCollaborator',
        defaultMessage: 'Add Collaborator',
        description: 'Button to add collaborator (makes project collaborative)'
    },
    currentlySharedWith: {
        id: 'gui.collaborationModal.currentlySharedWith',
        defaultMessage: 'Currently shared with',
        description: 'Label for currently shared groups'
    },
    myProjects: {
        id: 'gui.collaborationModal.myProjects',
        defaultMessage: 'Own Projects',
        description: 'Tab for user\'s own projects (owner)'
    },
    collaborationProjects: {
        id: 'gui.collaborationModal.collaborationProjects',
        defaultMessage: 'Collaboration Projects',
        description: 'Tab for projects with write/admin permission'
    },
    sharedWithMe: {
        id: 'gui.collaborationModal.sharedWithMe',
        defaultMessage: 'Shared Projects',
        description: 'Tab for projects shared with read-only permission'
    },
    noSharedProjects: {
        id: 'gui.collaborationModal.noSharedProjects',
        defaultMessage: 'No projects have been shared with you yet.',
        description: 'Message when no projects are shared'
    },
    loadingSharedProjects: {
        id: 'gui.collaborationModal.loadingSharedProjects',
        defaultMessage: 'Loading shared projects...',
        description: 'Loading message for shared projects'
    },
    sharedBy: {
        id: 'gui.collaborationModal.sharedBy',
        defaultMessage: 'Shared by',
        description: 'Label for project owner'
    },
    viewSharedProject: {
        id: 'gui.collaborationModal.viewSharedProject',
        defaultMessage: 'View Project',
        description: 'Button to view shared project'
    },
    copySharedProject: {
        id: 'gui.collaborationModal.copySharedProject',
        defaultMessage: 'Make a Copy',
        description: 'Button to copy shared project'
    },
    permissionRead: {
        id: 'gui.collaborationModal.permissionRead',
        defaultMessage: 'Read',
        description: 'Read permission level'
    },
    permissionWrite: {
        id: 'gui.collaborationModal.permissionWrite',
        defaultMessage: 'Write',
        description: 'Write permission level'
    },
    permissionAdmin: {
        id: 'gui.collaborationModal.permissionAdmin',
        defaultMessage: 'Admin',
        description: 'Admin permission level'
    },
    permissions: {
        id: 'gui.collaborationModal.permissions',
        defaultMessage: 'Permissions',
        description: 'Permissions label'
    },
    groups: {
        id: 'gui.collaborationModal.groups',
        defaultMessage: 'Groups',
        description: 'Groups label'
    },
    addGroup: {
        id: 'gui.collaborationModal.addGroup',
        defaultMessage: 'Add Group',
        description: 'Button to add group'
    },
    selectGroup: {
        id: 'gui.collaborationModal.selectGroup2',
        defaultMessage: 'Select Group',
        description: 'Select group label'
    },
    permissionLevel: {
        id: 'gui.collaborationModal.permissionLevel',
        defaultMessage: 'Permission Level',
        description: 'Permission level label'
    }
});

const CollaborationManagerModal = ({ isOpen, onClose, vm, projectId, onUpdateProjectTitle, onSetProjectId, intl }) => {
    // State - Own Projects Tab
    const [ownProjects, setOwnProjects] = useState([]);
    const [loadingOwn, setLoadingOwn] = useState(true);
    const [errorOwn, setErrorOwn] = useState(null);
    const [error, setError] = useState(null);
    
    // State - Collaboration Projects Tab
    const [collaborationProjects, setCollaborationProjects] = useState([]);
    const [loadingCollab, setLoadingCollab] = useState(true);
    const [errorCollab, setErrorCollab] = useState(null);
    
    // State - Shared Projects Tab
    const [sharedProjects, setSharedProjects] = useState([]);
    const [loadingShared, setLoadingShared] = useState(false);
    const [errorShared, setErrorShared] = useState(null);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [groupedSharedProjects, setGroupedSharedProjects] = useState({});
    
    // Selected project state (shared across tabs)
    const [selectedProject, setSelectedProject] = useState(null);
    const [collaborationData, setCollaborationData] = useState(null);
    const [loadingCollabData, setLoadingCollabData] = useState(false);
    
    // UI State
    const [showCommitDialog, setShowCommitDialog] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [selectedCommitForReset, setSelectedCommitForReset] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState('my-projects');
    
    // Player Modal
    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [selectedProjectIdForPlayer, setSelectedProjectIdForPlayer] = useState(null);
    
    // Share Dialog State
    const [availableGroups, setAvailableGroups] = useState([]);

    
    // Add Member Dialog State
    const [showAddMember, setShowAddMember] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');

    // Permission management state
    const [showAddGroup, setShowAddGroup] = useState(false);
 
    const userContext = useContext(UserContext);
    const { isLoggedIn } = userContext;
    
    const LAST_SELECTED_PROJECT_KEY = 'collab_modal_last_selected_project';
    const LAST_SELECTED_TAB_KEY = 'collab_modal_last_selected_tab';
    
    // ============================================================
    // DATA FETCHING
    // ============================================================
    
    const fetchOwnProjects = useCallback(async () => {
        if (!isLoggedIn) {
            setLoadingOwn(false);
            return;
        }
        
        setLoadingOwn(true);
        setErrorOwn(null);
        
        try {
            const projects = await ProjectManager.fetchOwnedProjects();
            
            console.log('[CollabModal] Fetched own projects:', projects);
            
            setOwnProjects(projects);
            
            // Auto-select based on localStorage only on initial load
            if (!selectedProject && projects.length > 0) {
                const lastSelectedId = localStorage.getItem(LAST_SELECTED_PROJECT_KEY);
                let projectToSelect = null;
                
                if (lastSelectedId) {
                    projectToSelect = projects.find(p => p.id === parseInt(lastSelectedId));
                }
                
                if (!projectToSelect) {
                    projectToSelect = projects.find(p => p.is_collaborative) || projects[0];
                }
                
                if (projectToSelect) {
                    setSelectedProject(projectToSelect);
                }
            }
        } catch (err) {
            console.error('[CollabModal] Error fetching own projects:', err);
            setErrorOwn(err.message);
        } finally {
            setLoadingOwn(false);
        }
    }, [isLoggedIn, LAST_SELECTED_PROJECT_KEY]);
    
    const fetchCollaborationProjectsList = useCallback(async () => {
        if (!isLoggedIn) {
            setLoadingCollab(false);
            return;
        }
        
        setLoadingCollab(true);
        setErrorCollab(null);
        
        try {
            const projects = await ProjectManager.fetchCollaborationProjects();
            
            console.log('[CollabModal] Fetched collaboration projects:', projects);
            
            setCollaborationProjects(projects);
            
            // Auto-select based on localStorage only on initial load
            if (!selectedProject && projects.length > 0) {
                const lastSelectedId = localStorage.getItem(LAST_SELECTED_PROJECT_KEY);
                let projectToSelect = null;
                
                if (lastSelectedId) {
                    projectToSelect = projects.find(p => p.id === parseInt(lastSelectedId));
                }
                
                if (!projectToSelect) {
                    projectToSelect = projects[0];
                }
                
                if (projectToSelect) {
                    setSelectedProject(projectToSelect);
                }
            }
        } catch (err) {
            console.error('[CollabModal] Error fetching collaboration projects:', err);
            setErrorCollab(err.message);
        } finally {
            setLoadingCollab(false);
        }
    }, [isLoggedIn, LAST_SELECTED_PROJECT_KEY]);
    
    const fetchCollaborationData = useCallback(async (project) => {
        if (!project || !project.is_collaborative) {
            setCollaborationData(null);
            return;
        }
        
        setLoadingCollabData(true);
        
        try {
            const data = await ProjectManager.fetchCollaborationData(project.id);
            
            console.log('[CollabModal] Collaboration data:', data);
            
            setCollaborationData(data);
        } catch (err) {
            console.error('[CollabModal] Error fetching collaboration data:', err);
            setError(err.message);
        } finally {
            setLoadingCollabData(false);
        }
    }, []);
    
    const fetchSharedProjects = useCallback(async () => {
        if (!isLoggedIn) {
            setLoadingShared(false);
            return;
        }
        
        setLoadingShared(true);
        setErrorShared(null);
        
        try {
            const projects = await ProjectManager.fetchSharedProjects();
            
            console.log('[CollabModal] Fetched shared projects:', projects);
            
            // Group by owner
            const grouped = {};
            projects.forEach(project => {
                const ownerId = project.owner?.id;
                
                if (!grouped[ownerId]) {
                    grouped[ownerId] = {
                        owner: project.owner,
                        projects: []
                    };
                }
                
                grouped[ownerId].projects.push(project);
            });
            
            setGroupedSharedProjects(grouped);
            setSharedProjects(projects);
            
            // Auto-select first owner only on initial load
            if (!selectedOwner && Object.keys(grouped).length > 0) {
                const firstOwnerId = Object.keys(grouped)[0];
                setSelectedOwner(grouped[firstOwnerId].owner);
            }
        } catch (err) {
            console.error('[CollabModal] Error fetching shared projects:', err);
            setErrorShared(err.message);
        } finally {
            setLoadingShared(false);
        }
    }, [isLoggedIn]);
    
    // ============================================================
    // PROJECT ACTIONS
    // ============================================================
    
    const handleProjectSelect = useCallback((project) => {
        console.log('[CollabModal] Selected project:', project);
        
        localStorage.setItem(LAST_SELECTED_PROJECT_KEY, project.id.toString());
        
        setSelectedProject(project);
        setShowCommitDialog(false);
        setCommitMessage('');
    }, [LAST_SELECTED_PROJECT_KEY]);
    
    const handleLoadWorkingCopy = useCallback(async (commitId) => {
        if (!selectedProject) return;
        
        try {
            onClose();
            
            const result = await ProjectManager.loadWorkingCopyByCommit(
                selectedProject.id,
                commitId,
                vm,
                userContext,
                {
                    onUpdateTitle: onUpdateProjectTitle
                }
            );
            
            // Explicitly set the project title in Redux after metadata is received
            if (result && result.metadata && result.metadata.title) {
                onUpdateProjectTitle(result.metadata.title);
            }
        } catch (err) {
            console.error('[CollabModal] Error loading working copy:', err);
            setError(err.message);
        }
    }, [selectedProject, vm, onClose, userContext, onUpdateProjectTitle]);
    
    const handleWorkOnCommit = useCallback(async (commitNumber) => {
        if (!selectedProject) return;
        
        try {
            // Create working copy
            const result = await ProjectManager.createWorkingCopyFromCommit(
                selectedProject.id,
                commitNumber
            );
            
            // Auto-load if successful
            if (result.working_copy_id) {
                onClose();
                
                const loadResult = await ProjectManager.loadWorkingCopyByCommit(
                    selectedProject.id,
                    result.based_on_commit,
                    vm,
                    userContext,
                    {
                        onUpdateTitle: onUpdateProjectTitle
                    }
                );
                
                // Explicitly set the project title in Redux after metadata is received
                if (loadResult && loadResult.metadata && loadResult.metadata.title) {
                    onUpdateProjectTitle(loadResult.metadata.title);
                }
            } else {
                // Refresh collaboration data to update working copy status
                await fetchCollaborationData(selectedProject);
                
                // Also refresh the project list to update has_working_copy badge
                if (activeTab === 'my-projects') {
                    await fetchOwnProjects();
                } else if (activeTab === 'collaboration-projects') {
                    await fetchCollaborationProjectsList();
                }
            }
        } catch (err) {
            console.error('[CollabModal] Error creating working copy:', err);
            setError(err.message);
        }
    }, [selectedProject, vm, onClose, userContext, fetchCollaborationData, activeTab, fetchOwnProjects, fetchCollaborationProjectsList, onUpdateProjectTitle]);
    
    const handleCommit = useCallback(async () => {
        if (!selectedProject) return;
        
        try {
            await ProjectManager.commitWorkingCopy(
                selectedProject.id,
                commitMessage || 'Update'
            );
            
            // Refresh collaboration data to show new commit and clear working copy
            await fetchCollaborationData(selectedProject);
            
            // Also refresh the project list to update has_working_copy badge
            if (activeTab === 'my-projects') {
                await fetchOwnProjects();
            } else if (activeTab === 'collaboration-projects') {
                await fetchCollaborationProjectsList();
            }
            
            setShowCommitDialog(false);
            setCommitMessage('');
        } catch (err) {
            console.error('[CollabModal] Error committing:', err);
            setError(err.message);
        }
    }, [selectedProject, commitMessage, fetchCollaborationData, activeTab, fetchOwnProjects, fetchCollaborationProjectsList]);
    
    const handleDeleteWorkingCopy = useCallback(async () => {
        if (!selectedProject || !selectedCommitForReset) return;
        
        try {
            await ProjectManager.deleteWorkingCopy(
                selectedProject.id,
                selectedCommitForReset
            );
            
            // Refresh collaboration data to update working copy status
            await fetchCollaborationData(selectedProject);
            
            // Also refresh the project list to update has_working_copy badge
            if (activeTab === 'my-projects') {
                await fetchOwnProjects();
            } else if (activeTab === 'collaboration-projects') {
                await fetchCollaborationProjectsList();
            }
            
            setShowResetConfirm(false);
            setSelectedCommitForReset(null);
        } catch (err) {
            console.error('[CollabModal] Error deleting working copy:', err);
            setError(err.message);
        }
    }, [selectedProject, selectedCommitForReset, fetchCollaborationData, activeTab, fetchOwnProjects, fetchCollaborationProjectsList]);
    
    const handleDeleteProject = useCallback(async () => {
        if (!selectedProject || deleteInProgress) return;
        
        setDeleteInProgress(true);
        
        try {
            await ProjectManager.deleteOrLeaveProject(selectedProject.id);
            
            // Remove from localStorage
            const lastSelectedId = localStorage.getItem(LAST_SELECTED_PROJECT_KEY);
            if (lastSelectedId === selectedProject.id.toString()) {
                localStorage.removeItem(LAST_SELECTED_PROJECT_KEY);
            }


            // Clear selected project and collaboration data immediately
            setSelectedProject(null);
            setCollaborationData(null);

            // Refresh the correct tab
            if (activeTab === 'my-projects') {
                await fetchOwnProjects();
            } else if (activeTab === 'collaboration-projects') {
                await fetchCollaborationProjectsList();
            }
            
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('[CollabModal] Error deleting project:', err);
            if (activeTab === 'my-projects') {
                setErrorOwn(err.message);
            } else {
                setErrorCollab(err.message);
            }
        } finally {
            setDeleteInProgress(false);
        }
    }, [selectedProject, deleteInProgress, activeTab, 
        fetchOwnProjects, fetchCollaborationProjectsList, LAST_SELECTED_PROJECT_KEY]);
    
    const handleCopySharedProject = useCallback(async (projectId) => {
        try {
            await ProjectManager.copyProject(projectId);
            
            // Switch to my projects tab
            setActiveTab('my-projects');
            await fetchOwnProjects();
        } catch (err) {
            console.error('[CollabModal] Error copying project:', err);
            setErrorShared(err.message);
        }
    }, [fetchOwnProjects]);
    
    const handleViewInPlayer = useCallback((projectId) => {
        setSelectedProjectIdForPlayer(projectId);
        setPlayerModalOpen(true);
    }, []);
    
    const handleClosePlayerModal = useCallback(() => {
        setPlayerModalOpen(false);
        setSelectedProjectIdForPlayer(null);
    }, []);
    
    // ============================================================
    // SHARING & COLLABORATION
    // ============================================================
    
    const fetchAvailableGroups = useCallback(async () => {
        try {
            const groups = await ProjectManager.fetchUserGroups();
            setAvailableGroups(groups);
        } catch (err) {
            console.error('[CollabModal] Error fetching groups:', err);
        }
    }, []);
    

    
    const fetchAvailableUsers = useCallback(async () => {
        try {
            const users = await ProjectManager.fetchAvailableUsers(selectedProject.id);
            setAvailableUsers(users);
        } catch (err) {
            console.error('[CollabModal] Error fetching users:', err);
            setAvailableUsers([]);
        }
    }, [selectedProject]);

    const handleGrantUserPermission = useCallback(async (userId, permissionLevel = 'READ') => {
        if (!selectedProject) return;
        
        try {
            await ProjectManager.grantPermission(selectedProject.id, {
                user_id: userId,
                permission: permissionLevel
            });
            
            // Refresh collaboration data
            await fetchCollaborationData(selectedProject);
            
            setShowAddMember(false);
            setUserSearch('');
            setAvailableUsers([]);
        } catch (err) {
            console.error('[CollabModal] Error granting permission:', err);
            setError(err.message);
        }
    }, [selectedProject, fetchCollaborationData]);
    
    // Grant permission to group
    const handleGrantGroupPermission = useCallback(async (groupId, permissionLevel = 'READ') => {
        if (!selectedProject) return;
        
        try {
            await ProjectManager.grantPermission(selectedProject.id, {
                group_id: groupId,
                permission: permissionLevel
            });
            
            // Refresh collaboration data
            await fetchCollaborationData(selectedProject);
            
            setShowAddGroup(false);
        } catch (err) {
            console.error('[CollabModal] Error granting group permission:', err);
            setError(err.message);
        }
    }, [selectedProject, fetchCollaborationData]);

    // Change user permission level
    const handleChangeUserPermission = useCallback(async (userId, newPermission) => {
        if (!selectedProject) return;
        
        try {
            // Update permission (backend will update existing entry)
            await ProjectManager.grantPermission(selectedProject.id, {
                user_id: userId,
                permission: newPermission
            });
            
            // Refresh
            await fetchCollaborationData(selectedProject);
        } catch (err) {
            console.error('[CollabModal] Error changing permission:', err);
            setError(err.message);
        }
    }, [selectedProject, fetchCollaborationData]);
    
    // Change group permission level
    const handleChangeGroupPermission = useCallback(async (groupId, newPermission) => {
        if (!selectedProject) return;
        
        try {
            // Update permission (backend will update existing entry)
            await ProjectManager.grantPermission(selectedProject.id, {
                group_id: groupId,
                permission: newPermission
            });
            
            // Refresh
            await fetchCollaborationData(selectedProject);
        } catch (err) {
            console.error('[CollabModal] Error changing group permission:', err);
            setError(err.message);
        }
    }, [selectedProject, fetchCollaborationData]);
    
    // Revoke permission
    const handleRevokePermission = useCallback(async (permissionId) => {
        console.log('[CollabModal] Revoking permission ID:', permissionId);
        if (!selectedProject) return;
        
        try {
            await ProjectManager.revokePermission(selectedProject.id, permissionId);
            
            // Refresh collaboration data
            await fetchCollaborationData(selectedProject);
        } catch (err) {
            console.error('[CollabModal] Error revoking permission:', err);
            setError(err.message);
        }
    }, [selectedProject, fetchCollaborationData]);


    // ============================================================
    // TAB HANDLING
    // ============================================================
    
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        localStorage.setItem(LAST_SELECTED_TAB_KEY, tab);
    
        setSelectedOwner(null);
        setSelectedProject(null);
        setCollaborationData(null);
    
    }, [LAST_SELECTED_TAB_KEY]);
    
    const handleOwnerSelect = useCallback((owner) => {
        setSelectedOwner(owner);
    }, []);
    
    const handleUpdateProjectName = useCallback(async (newName) => {
        if (!selectedProject) return;
        
        try {
            await ProjectManager.updateCollaborativeProject(selectedProject.id, {
                name: newName
            });
            
            // Update the selected project locally
            setSelectedProject(prev => ({
                ...prev,
                name: newName
            }));
        
            
            // Update UserContext (like ProjectTitleInput does)
            if (userContext) {
                console.log('[CollabModal] Updating UserContext project title. userContext projectId:', userContext.collaborativeProjectId, 'selectedProject id:', selectedProject.id);
                if (userContext.collaborativeProjectId === selectedProject.id) {
                    userContext.setProjectTitle(newName);
                    userContext.setProjectChanged(true);
                    // Update Redux state (like ProjectTitleInput does)
                    onUpdateProjectTitle(newName);
                }
            }
            
            // Refresh the project list for the active tab
            if (activeTab === 'my-projects') {
                await fetchOwnProjects();
            } else if (activeTab === 'collaboration-projects') {
                await fetchCollaborationProjectsList();
            }
            
            console.log('[CollabModal] Project name updated successfully');
        } catch (err) {
            console.error('[CollabModal] Error updating project name:', err);
            setError(err.message);
        }
    }, [selectedProject, activeTab, fetchOwnProjects, fetchCollaborationProjectsList, onUpdateProjectTitle, userContext]);
    
    // ============================================================
    // HELPERS
    // ============================================================
    
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'gerade eben';
        if (diffMins < 60) return `vor ${diffMins} Min`;
        if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)} Std`;
        
        return date.toLocaleDateString();
    };
    
    const getProjectBadges = (project) => {
        const badges = [];
        
        if (project.collaborator_count && project.collaborator_count > 1) {
            badges.push({
                type: 'collaborative',
                icon: '👥',
                text: intl.formatMessage(messages.collaborative)
            });
        } else {
            badges.push({
                type: 'private',
                icon: '🔒',
                text: intl.formatMessage(messages.private)
            });
        }
        
        if (project.shared_with_groups && project.shared_with_groups.length > 0) {
            badges.push({
                type: 'shared',
                icon: '📤',
                text: `${intl.formatMessage(messages.shared)} (${project.shared_with_groups.length})`
            });
        }
        
        return badges;
    };
    
    const getDeleteConfirmMessage = () => {
        if (!selectedProject) return '';
        
        const isOwner = selectedProject.access_via === 'owner';
        
        return isOwner 
            ? intl.formatMessage(messages.confirmDeleteOwner)
            : intl.formatMessage(messages.confirmDeleteCollaborator);
    };
    
    // ============================================================
    // EFFECTS
    // ============================================================
    
    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'my-projects') {
                fetchOwnProjects();
            } else if (activeTab === 'collaboration-projects') {
                fetchCollaborationProjectsList();
            } else if (activeTab === 'shared-with-me') {
                fetchSharedProjects();
            }
        }
    }, [isOpen, activeTab, fetchOwnProjects, fetchCollaborationProjectsList, fetchSharedProjects]);
    
    useEffect(() => {
        if (selectedProject) {
            fetchCollaborationData(selectedProject);
        }
    }, [selectedProject, fetchCollaborationData]);
    
    useEffect(() => {
        if (isOpen) {
            const lastTab = localStorage.getItem(LAST_SELECTED_TAB_KEY);
            const validTabs = ['my-projects', 'collaboration-projects', 'shared-with-me'];
            if (lastTab && validTabs.includes(lastTab)) {
                setActiveTab(lastTab);
            }
        }
    }, [isOpen, LAST_SELECTED_TAB_KEY]);
    
    useEffect(() => {
        if (showAddMember) {
            fetchAvailableUsers();
        }
    }, [showAddMember, fetchAvailableUsers]);
    
    // ============================================================
    // RENDER
    // ============================================================
    
    if (!isOpen) return null;
    
    const commits = collaborationData?.commits || [];
    const collaborators = collaborationData?.collaborators || [];
    const sharedGroups = collaborationData?.groups || [];
    return (
<ReactModal
    isOpen={isOpen}
    onRequestClose={onClose}
    className={styles.modalContainer}
    overlayClassName={styles.modalOverlay}
    contentLabel={intl.formatMessage(messages.title)}
    appElement={document.getElementById('app')}
>
    <div className={styles.modalHeader}>
        <div className={styles.headerTitle}>
            <img
                className={styles.headerIcon}
                src={collaborativeIcon}
                alt="Collaborative"
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

    {/* Tab Navigation */}
    <div className={styles.tabsContainer}>
        <div 
            className={`${styles.tab} ${activeTab === 'my-projects' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('my-projects')}
        >
            <FormattedMessage {...messages.myProjects} />
        </div>
        <div 
            className={`${styles.tab} ${activeTab === 'collaboration-projects' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('collaboration-projects')}
        >
            <FormattedMessage {...messages.collaborationProjects} />
        </div>
        <div 
            className={`${styles.tab} ${activeTab === 'shared-with-me' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('shared-with-me')}
        >
            <FormattedMessage {...messages.sharedWithMe} />
        </div>
    </div>


<div className={styles.modalBody}>
    {/* MY PROJECTS TAB (OWNED) */}
    {activeTab === 'my-projects' && (
        <MyProjectsTab
            projects={ownProjects}
            loading={loadingOwn}
            error={errorOwn}
            selectedProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            collaborationData={collaborationData}
            loadingCollabData={loadingCollabData}
            onDeleteProject={() => setShowDeleteConfirm(true)}
            onUpdateProjectName={handleUpdateProjectName}
            formatDate={formatDate}
            getProjectBadges={getProjectBadges}
            handleLoadWorkingCopy={handleLoadWorkingCopy}
            handleWorkOnCommit={handleWorkOnCommit}
            handleShowCommitDialog={setShowCommitDialog}
            handleShowResetConfirm={(commitId) => {
                setShowResetConfirm(true);
                setSelectedCommitForReset(commitId);
            }}
            handleChangeUserPermission={handleChangeUserPermission}
            handleRevokePermission={handleRevokePermission}
            handleChangeGroupPermission={handleChangeGroupPermission}
            handleShowAddMember={setShowAddMember}
            handleShowAddGroup={setShowAddGroup}
            fetchAvailableUsers={fetchAvailableUsers}
            fetchAvailableGroups={fetchAvailableGroups}
            intl={intl}
            messages={messages}
        />
    )}

    {/* COLLABORATION PROJECTS TAB (WRITE/ADMIN) */}
    {activeTab === 'collaboration-projects' && (
        <CollaborationProjectsTab
            projects={collaborationProjects}
            loading={loadingCollab}
            error={errorCollab}
            selectedProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            collaborationData={collaborationData}
            loadingCollabData={loadingCollabData}
            onDeleteProject={() => {}}
            onUpdateProjectName={handleUpdateProjectName}
            formatDate={formatDate}
            getProjectBadges={getProjectBadges}
            handleLoadWorkingCopy={handleLoadWorkingCopy}
            handleWorkOnCommit={handleWorkOnCommit}
            handleShowCommitDialog={setShowCommitDialog}
            handleShowResetConfirm={(commitId) => {
                setShowResetConfirm(true);
                setSelectedCommitForReset(commitId);
            }}
            handleChangeUserPermission={handleChangeUserPermission}
            handleRevokePermission={handleRevokePermission}
            handleChangeGroupPermission={handleChangeGroupPermission}
            handleShowAddMember={setShowAddMember}
            handleShowAddGroup={setShowAddGroup}
            fetchAvailableUsers={fetchAvailableUsers}
            fetchAvailableGroups={fetchAvailableGroups}
            intl={intl}
            messages={messages}
        />
    )}

    {/* SHARED PROJECTS TAB (READ-ONLY) */}
    {activeTab === 'shared-with-me' && (
        <SharedProjectsTab
            sharedProjects={sharedProjects}
            loadingShared={loadingShared}
            errorShared={errorShared}
            selectedOwner={selectedOwner}
            groupedSharedProjects={groupedSharedProjects}
            onOwnerSelect={handleOwnerSelect}
            handleViewInPlayer={handleViewInPlayer}
            handleCopySharedProject={handleCopySharedProject}
            formatDate={formatDate}
            intl={intl}
            messages={messages}
        />
    )}
</div>
{/* CLOSING: modalBody */}



    {showAddMember && (
        <AddMemberDialog
            users={availableUsers}
            searchQuery={userSearch}
            onSearchChange={setUserSearch}
            onAdd={(userId, permission) => handleGrantUserPermission(userId, permission)}
            onClose={() => {
                setShowAddMember(false);
                setUserSearch('');
            }}
            intl={intl}
        />
    )}

    {/* Add Group Dialog */}
    {showAddGroup && (
        <AddGroupDialog
            groups={availableGroups}
            onAdd={(groupId, permission) => handleGrantGroupPermission(groupId, permission)}
            onClose={() => setShowAddGroup(false)}
            intl={intl}
            messages={messages}
            styles={styles}
        />
    )}

    {showCommitDialog && (
        <CommitDialog
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            onCommit={handleCommit}
            onClose={() => {
                setShowCommitDialog(false);
                setCommitMessage('');
            }}
            intl={intl}
        />
    )}

    {/* Delete Confirmation Dialog */}
    {showDeleteConfirm && (
        <ConfirmDialog
            message={getDeleteConfirmMessage()}
            onConfirm={handleDeleteProject}
            onClose={() => setShowDeleteConfirm(false)}
            confirmButtonText={
                selectedProject?.access_via === 'owner' 
                    ? 'Delete Project' 
                    : 'Leave Project'
            }
            confirmButtonStyle={{ backgroundColor: '#dc3545' }}
            intl={intl}
        />
    )}

    {/* Reset Working Copy Confirmation Dialog */}
    {showResetConfirm && (
        <ConfirmDialog
            message={intl.formatMessage(messages.confirmReset)}
            onConfirm={handleDeleteWorkingCopy}
            onClose={() => {
                setShowResetConfirm(false);
                setSelectedCommitForReset(null);
            }}
            confirmButtonText={intl.formatMessage(messages.resetWorkingCopy)}
            confirmButtonStyle={{ backgroundColor: '#dc3545' }}
            intl={intl}
        />
    )}

    {/* Player Modal für read-only Ansicht */}
    {playerModalOpen && (
        <PlayerModal
            isOpen={playerModalOpen}
            onClose={handleClosePlayerModal}
            projectId={selectedProjectIdForPlayer}
        />
    )}
</ReactModal>
    );
};

// Sub-components remain the same...
const MakeCollaborativeDialog = ({ 
    groups, 
    selectedGroup, 
    onGroupChange, 
    initialMessage, 
    onMessageChange, 
    onConfirm, 
    onClose, 
    intl 
}) => {
    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.makeCollaborativeTitle} /></h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <p><FormattedMessage {...messages.confirmMakeCollaborative} /></p>
                    
                    <div className={styles.formGroup}>
                        <label><FormattedMessage {...messages.selectGroup} />:</label>
                        <select
                            className={styles.selectInput}
                            value={selectedGroup || ''}
                            onChange={(e) => onGroupChange(e.target.value ? parseInt(e.target.value) : null)}
                        >
                            <option value="">
                                {intl.formatMessage(messages.noGroup)}
                            </option>
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label><FormattedMessage {...messages.initialCommitMessage} />:</label>
                        <input
                            type="text"
                            className={styles.textInput}
                            placeholder={intl.formatMessage(messages.initialCommitMessagePlaceholder)}
                            value={initialMessage}
                            onChange={(e) => onMessageChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={onConfirm}
                    >
                        <FormattedMessage {...messages.confirm} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddMemberDialog = ({ users, searchQuery, onSearchChange, onAdd, onClose, intl }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Filter users based on search query
    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.addMember} /></h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={intl.formatMessage(messages.searchUsers)}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <div className={styles.userList}>
                        {filteredUsers.length === 0 && (
                            <div className={styles.noUsers}>
                                <FormattedMessage {...messages.noUsersFound} />
                            </div>
                        )}
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className={`${styles.userItem} ${selectedUser?.id === user.id ? styles.userItemSelected : ''}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className={styles.userAvatar}>
                                    {user.username[0].toUpperCase()}
                                </div>
                                <div className={styles.userName}>{user.username}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        disabled={!selectedUser}
                        onClick={() => {
                            if (selectedUser) {
                                onAdd(selectedUser.id);
                            }
                        }}
                    >
                        <FormattedMessage {...messages.save} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddGroupDialog = ({ groups, onAdd, onClose, intl, messages, styles }) => {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedPermission, setSelectedPermission] = useState('READ');

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.addGroup} /></h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <div className={styles.groupList}>
                        {groups.length === 0 && (
                            <div className={styles.noGroups}>
                                Keine Gruppen verfügbar
                            </div>
                        )}
                        {groups.map(group => (
                            <div
                                key={group.id}
                                className={`${styles.groupItem} ${selectedGroup?.id === group.id ? styles.groupItemSelected : ''}`}
                                onClick={() => setSelectedGroup(group)}
                            >
                                <div className={styles.groupAvatar}>
                                    👥
                                </div>
                                <div className={styles.groupName}>
                                    {group.name}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {selectedGroup && (
                        <div className={styles.permissionSelection}>
                            <label><FormattedMessage {...messages.permissionLevel} />:</label>
                            <select
                                className={styles.permissionSelect}
                                value={selectedPermission}
                                onChange={(e) => setSelectedPermission(e.target.value)}
                            >
                                <option value="READ">
                                    👁️ {intl.formatMessage(messages.permissionRead)}
                                </option>
                                <option value="WRITE">
                                    ✏️ {intl.formatMessage(messages.permissionWrite)}
                                </option>
                                <option value="ADMIN">
                                    👑 {intl.formatMessage(messages.permissionAdmin)}
                                </option>
                            </select>
                        </div>
                    )}
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        disabled={!selectedGroup}
                        onClick={() => {
                            if (selectedGroup) {
                                onAdd(selectedGroup.id, selectedPermission);
                            }
                        }}
                    >
                        <FormattedMessage {...messages.save} />
                    </button>
                </div>
            </div>
        </div>
    );
};


const CommitDialog = ({ commitMessage, onCommitMessageChange, onCommit, onClose, intl }) => {
    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.commit} /></h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <label><FormattedMessage {...messages.commitMessage} />:</label>
                    <textarea
                        className={styles.commitMessageInput}
                        placeholder={intl.formatMessage(messages.commitMessagePlaceholder)}
                        value={commitMessage}
                        onChange={(e) => onCommitMessageChange(e.target.value)}
                        rows={4}
                    />
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={onCommit}
                    >
                        <FormattedMessage {...messages.confirm} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmDialog = ({ message, onConfirm, onClose, confirmButtonText, confirmButtonStyle, intl }) => {
    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3>⚠️ Confirm Action</h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    <p style={{fontSize: '1rem', lineHeight: '1.5'}}>{message}</p>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        style={confirmButtonStyle}
                        onClick={onConfirm}
                    >
                        {confirmButtonText || <FormattedMessage {...messages.confirm} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShareDialog = ({ 
    project, 
    groups, 
    selectedGroups, 
    onToggleGroup, 
    onConfirm, 
    onClose, 
    sharingStatus, 
    intl 
}) => {
    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.shareWithGroups} /></h3>
                    <button className={styles.dialogClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.dialogBody}>
                    {/* Project Info */}
                    <div className={styles.shareProjectInfo}>
                        <div className={styles.shareThumbnail}>
                            <img 
                                src={project.thumbnail_url || '/static/images/default-project.png'} 
                                alt={project.name || 'Project'}
                                onError={(e) => {
                                    e.target.src = '/static/default-thumbnail.png';
                                    e.target.onerror = null;
                                }}
                            />
                        </div>
                        <div className={styles.shareProjectTitle}>
                            {project.name || project.title || 'Untitled Project'}
                        </div>
                    </div>
                    
                    {/* ✅ NEU: Currently shared with */}
                    {project.shared_with_groups && project.shared_with_groups.length > 0 && (
                        <div className={styles.currentlyShared}>
                            <div className={styles.currentlySharedLabel}>
                                <FormattedMessage {...messages.currentlySharedWith} />:
                            </div>
                            <div className={styles.currentlySharedGroups}>
                                {project.shared_with_groups.map(group => (
                                    <span key={group.id} className={styles.currentGroupBadge}>
                                        👥 {group.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Group Selection */}
                    <div className={styles.shareGroups}>
                        <div className={styles.shareGroupsLabel}>
                            <FormattedMessage {...messages.selectGroupsToShare} />
                        </div>
                        
                        {groups.length === 0 ? (
                            <div className={styles.noGroupsMessage}>
                                <FormattedMessage {...messages.noGroupsAvailable} />
                            </div>
                        ) : (
                            <div className={styles.groupList}>
                                {groups.map(group => {
                                    const isSelected = selectedGroups.includes(group.id);
                                    const isCurrentlyShared = project.shared_with_groups?.some(g => g.id === group.id);
                                    
                                    return (
                                        <div 
                                            key={group.id}
                                            className={`${styles.groupItem} ${isCurrentlyShared ? styles.groupItemCurrentlyShared : ''}`}
                                        >
                                            <label className={styles.groupCheckboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.groupCheckbox}
                                                    checked={isSelected}
                                                    onChange={() => onToggleGroup(group.id)}
                                                />
                                                <span className={styles.groupName}>
                                                    {group.name}
                                                    {isCurrentlyShared && (
                                                        <span className={styles.currentlySharedIndicator}>
                                                            {' '}✓ Currently shared
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* Status Messages */}
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
                </div>
                <div className={styles.dialogFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={onConfirm}
                        disabled={groups.length === 0 || sharingStatus === 'success'}
                    >
                        <FormattedMessage {...messages.save} />
                    </button>
                </div>
            </div>
        </div>
    );
};

ShareDialog.propTypes = {
    project: PropTypes.object,
    groups: PropTypes.array,
    selectedGroups: PropTypes.array,
    onToggleGroup: PropTypes.func,
    onConfirm: PropTypes.func,
    onClose: PropTypes.func,
    sharingStatus: PropTypes.string,
    intl: PropTypes.object
};

ConfirmDialog.propTypes = {
    message: PropTypes.string,
    onConfirm: PropTypes.func,
    onClose: PropTypes.func,
    confirmButtonText: PropTypes.string,
    confirmButtonStyle: PropTypes.object,
    intl: PropTypes.object
};



MakeCollaborativeDialog.propTypes = {
    groups: PropTypes.array,
    selectedGroup: PropTypes.number,
    onGroupChange: PropTypes.func,
    initialMessage: PropTypes.string,
    onMessageChange: PropTypes.func,
    onConfirm: PropTypes.func,
    onClose: PropTypes.func,
    intl: PropTypes.object
};

AddMemberDialog.propTypes = {
    users: PropTypes.array,
    searchQuery: PropTypes.string,
    onSearchChange: PropTypes.func,
    onAdd: PropTypes.func,
    onClose: PropTypes.func,
    intl: PropTypes.object
};

CommitDialog.propTypes = {
    commitMessage: PropTypes.string,
    onCommitMessageChange: PropTypes.func,
    onCommit: PropTypes.func,
    onClose: PropTypes.func,
    intl: PropTypes.object
};

// ✅ KORRIGIERT: mapStateToProps hinzufügen
const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    projectId: state.scratchGui.projectState.projectId
});

// ✅ KORRIGIERT: mapDispatchToProps hinzufügen
const mapDispatchToProps = dispatch => ({
    onUpdateProjectTitle: title => dispatch(setProjectTitle(title)),
    onSetProjectId: projectId => dispatch(setProjectId(projectId))
});

// ✅ KORRIGIERT: PropTypes aktualisieren
CollaborationManagerModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onUpdateProjectTitle: PropTypes.func.isRequired,
    onSetProjectId: PropTypes.func.isRequired,
    intl: PropTypes.object
};

// ✅ KORRIGIERT: Export mit Redux connect
export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(CollaborationManagerModal));