import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {setCanSave, setProjectId} from '../../reducers/project-state';
import {setProjectTitle} from '../../reducers/project-title';
import saveProjectToServer from '../../lib/save-project-to-server';
import * as ProjectManager from '../../lib/project-management';
import { UserContext } from '../../contexts/UserContext';
import ProjectsModal from '../projects-modal/projects-modal.jsx';



/**
 * Component that manages saving functionality with timer-based auto-save
 */
class SaveManager extends React.Component {
    constructor(props) {
        super(props);
        // Manually bind methods
        this.checkSession = this.checkSession.bind(this);
        this.toggleAutoSave = this.toggleAutoSave.bind(this);
        this.handleProjectLoaded = this.handleProjectLoaded.bind(this);
        this.handleProjectChanged = this.handleProjectChanged.bind(this);
        this.performAutoSave = this.performAutoSave.bind(this);
        this.saveProject = this.saveProject.bind(this);
        this.saveProjectAs = this.saveProjectAs.bind(this); // New binding for Save As
        this.checkAndSaveIfNeeded = this.checkAndSaveIfNeeded.bind(this);
        this.loadProject = this.loadProject.bind(this);
        this.loadRecentProject = this.loadRecentProject.bind(this);
        this.handleNewProject = this.handleNewProject.bind(this);
        this.handleWorkspaceUpdate = this.handleWorkspaceUpdate.bind(this);
        this.showProjectsModal = this.showProjectsModal.bind(this);
        this.hideProjectsModal = this.hideProjectsModal.bind(this);
        this.updateProjectMetadata = this.updateProjectMetadata.bind(this);
        this.handleSaveAsEvent = this.handleSaveAsEvent.bind(this);
        this.handleSaveEvent = this.handleSaveEvent.bind(this);
        
        this.state = {
            lastAutoSave: null,
            autoSaveEnabled: true,
            saveStatus: null,
            saveError: null,
            pendingChanges: false,
            saveInProgress: false,
            loadInProgress: false,
            loadError: null,
            newProjectCooldown: false,
            projectsModalVisible: false
        };
        
        // Create a static variable to track global save lock
        SaveManager.saveInProgress = false;
        
        // Auto-save timer settings (in milliseconds)
        this.AUTO_SAVE_INTERVAL = 60000; // 60 seconds between checks
        this.CHANGE_DEBOUNCE_TIME = 5000; // Wait 5 seconds after last change
        this.NEW_PROJECT_COOLDOWN = 10000; // Don't auto-save for 10 seconds after new project
        
        // Keep track of the last reset timestamp
        this.lastResetTime = Date.now();

    }
    static eventListenerRegistered = false;
    static debugDisplay = false;
    
    componentDidMount() {
        //console.log('[SaveManager] Component mounted');
        // Check for session ID and enable saving if it exists
        this.checkSession();
        
        // Set up interval to check session periodically
        this.sessionCheckInterval = setInterval(this.checkSession, 30000);
        
        // Set up auto-save timer
        this.autoSaveTimer = setInterval(this.checkAndSaveIfNeeded, this.AUTO_SAVE_INTERVAL);
        
        // Add project activity listeners
        if (this.props.vm) {
            this.props.vm.on('PROJECT_LOADED', this.handleProjectLoaded);
            this.props.vm.on('PROJECT_CHANGED', this.handleProjectChanged);
            this.props.vm.on('workspaceUpdate', this.handleWorkspaceUpdate);
            //console.log('[SaveManager] VM listeners attached');
        } else {
            console.warn('[SaveManager] VM not available at mount');
        }
        
        // Only add the event listener if it's not already registered
        if (!SaveManager.eventListenerRegistered) {
            // First remove any existing listener to be safe
            document.removeEventListener('saveProjectAs', this.handleSaveAsEvent);
            document.removeEventListener('saveProject', this.handleSaveEvent);
            
            // Then add our listener
            document.addEventListener('saveProjectAs', this.handleSaveAsEvent);
            document.addEventListener('saveProject', this.handleSaveEvent);
            SaveManager.eventListenerRegistered = true;
            //console.log('[SaveManager] All saveProject event listener registered');
        }
    }
    
    componentDidUpdate(prevProps, prevState, prevContext) {
        // Update VM listeners if VM instance changes
        if (this.props.vm !== prevProps.vm) {
            if (prevProps.vm) {
                prevProps.vm.removeListener('PROJECT_LOADED', this.handleProjectLoaded);
                prevProps.vm.removeListener('PROJECT_CHANGED', this.handleProjectChanged);
                prevProps.vm.removeListener('workspaceUpdate', this.handleWorkspaceUpdate);
            }
            if (this.props.vm) {
                this.props.vm.on('PROJECT_LOADED', this.handleProjectLoaded);
                this.props.vm.on('PROJECT_CHANGED', this.handleProjectChanged);
                this.props.vm.on('workspaceUpdate', this.handleWorkspaceUpdate);
                console.log('[SaveManager] VM listeners updated');
            }
        }
        // Reset lastAutoSave when projectId changes
        if (this.context && prevContext && 
            this.context.projectId !== prevContext.projectId) {
            this.setState({ lastAutoSave: null });
            console.log('[SaveManager] Project ID changed, reset lastAutoSave');
        }
        // Check if project ID has been reset in context
        if (prevContext && prevContext.projectId && 
            this.context && !this.context.projectId) {
            //console.log('[SaveManager] Detected project reset in context');
            this.handleNewProject();
        }
    }
    
    componentWillUnmount() {
        //console.log('[SaveManager] Component unmounting, cleaning up...');
        
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        if (this.changeDebounceTimer) {
            clearTimeout(this.changeDebounceTimer);
        }
        
        if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer);
        }
        
        if (this.props.vm) {
            try {
                // Remove event listeners we added
                this.props.vm.removeListener('PROJECT_LOADED', this.handleProjectLoaded);
                this.props.vm.removeListener('PROJECT_CHANGED', this.handleProjectChanged);
                this.props.vm.removeListener('workspaceUpdate', this.handleWorkspaceUpdate);
            } catch (error) {
                console.warn('[SaveManager] Error removing event listener:', error);
            }
        }
        
        // Clean up the document event listener
        if (SaveManager.eventListenerRegistered) {
            document.removeEventListener('saveProjectAs', this.handleSaveAsEvent);
            document.removeEventListener('saveProject', this.handleSaveEvent);
            SaveManager.eventListenerRegistered = false;
            //console.log('[SaveManager] All saveProject event listener removed');
        }
    }

    updateProjectMetadata(projectId, title) {
        if (this.context) {
            this.context.setProjectId(projectId);
            this.context.setProjectTitle(title);
            this.context.setProjectChanged(false);
        }
    }

    handleSaveAsEvent(event) {
        //console.log('[SaveManager] saveProjectAs event received', event.detail);
        if (event && event.detail && event.detail.title) {
            this.saveProjectAs(event.detail.title);
        } else {
            this.saveProjectAs();
        }
    }

    handleSaveEvent(event) {
        //console.log('[SaveManager] saveProject event received', event.detail);
        if (event && event.detail && event.detail.projectid) {
            this.saveProject(event.detail.projectid);
        } else if (this.context && this.context.projectId) {
            this.saveProject(this.context.projectId);
        } else {
            this.saveProject(null);
        }
    }

    // Detect when a new project is created
    handleWorkspaceUpdate(data) {
        // Don't process if we're already in cooldown
        if (this.state.newProjectCooldown) return;
        
        // If the VM has been reset (which happens during new project creation)
        if (this.props.vm && 
            this.props.vm.runtime && 
            this.props.vm.runtime.targets && 
            this.props.vm.runtime.targets.length <= 2) {
            
            // Check if project was just created (has very few blocks)
            const spriteCount = this.props.vm.runtime.targets.length;
            const blockCount = this.props.vm.runtime.targets.reduce((count, target) => {
                return count + Object.keys(target.blocks._blocks || {}).length;
            }, 0);
            
            // If this looks like a new project (default sprites and few/no blocks)
            if (spriteCount <= 2 && blockCount <= 5) {
                const projectId = this.context ? this.context.projectId : null;
                
                // Only reset if we had a project before
                if (projectId) {
                    //console.log('[SaveManager] Detected new project creation via workspace update');
                    this.handleNewProject();
                }
            }
        }
    }

    handleNewProject() {
        console.log('[SaveManager] Creating new project');
        
        // Reset project in context if not already reset
        if (this.context && this.context.projectId) {
            this.context.resetProject();
        }
        
        // Cancel any pending auto-saves
        if (this.changeDebounceTimer) {
            clearTimeout(this.changeDebounceTimer);
            this.changeDebounceTimer = null;
        }
        
        // Update the reset timestamp
        this.lastResetTime = Date.now();
        
        // Set cooldown state
        this.setState({
            lastAutoSave: null,
            saveStatus: null,
            saveError: null,
            pendingChanges: false,
            loadInProgress: false,
            loadError: null,
            newProjectCooldown: true
        });
        
        // Update Redux title
        this.props.onUpdateProjectTitle('Untitled Project');
        
        //console.log('[SaveManager] Starting new project cooldown period', this.NEW_PROJECT_COOLDOWN, 'ms');
        
        // Set a timer to end cooldown period
        if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer);
        }
        
        this.cooldownTimer = setTimeout(() => {
            //console.log('[SaveManager] New project cooldown period ended');
            this.setState({ newProjectCooldown: false });
        }, this.NEW_PROJECT_COOLDOWN);
        document.dispatchEvent(new CustomEvent('newProjectLoaded'));
        
        //console.log('[SaveManager] UserContext reset for new project');
    }

    /**
     * Handle VM's PROJECT_LOADED event
     * Updates both UserContext and Redux state for project metadata
     */
    handleProjectLoaded() {
        //console.log('[SaveManager] Project loaded event received');
        
        this.setState({ 
            lastAutoSave: null,
            saveStatus: null,
            saveError: null,
            pendingChanges: false,
            loadInProgress: false,
            loadError: null
        });
        
        // Get project info from VM
        if (this.props.vm && this.props.vm.runtime) {
            // Check for project metadata in VM
            const projectMetadata = this.props.vm.runtime.projectMetadata || {};
            
            // Update context if available
            if (this.context) {
                // Set project ID if available
                if (projectMetadata.id) {
                    //console.log('[SaveManager] Setting project ID from VM metadata:', projectMetadata.id);
                    const numericId = Number(projectMetadata.id);
                    this.context.setProjectId(numericId);
                    
                    // Update Redux state with project ID
                    // The reducer now handles NOT_LOADED state properly - it will transition to
                    // SHOWING_WITH_ID without fetching, since the project is already in the VM
                    //this.props.onSetProjectId(numericId);
                    
                    // End cooldown since we're loading an existing project
                    if (this.state.newProjectCooldown) {
                        //console.log('[SaveManager] Ending cooldown due to project load');
                        this.setState({ newProjectCooldown: false });
                        
                        if (this.cooldownTimer) {
                            clearTimeout(this.cooldownTimer);
                            this.cooldownTimer = null;
                        }
                    }
                }
                
                // Set project title
                const title = projectMetadata.title || 
                            (this.props.vm.runtime.getProjectTitle && this.props.vm.runtime.getProjectTitle()) || 
                            'Untitled Project';
                            
                //console.log('[SaveManager] Setting project title:', title);
                this.context.setProjectTitle(title);
                
                // Update Redux state so menu bar displays the correct title
                this.props.onUpdateProjectTitle(title);
            }
        }
    }
    
    handleProjectChanged() {
        // Skip if we're in cooldown
        if (this.state.newProjectCooldown) {
            //console.log('[SaveManager] Project changed ignored due to cooldown');
            return;
        }
        
        // Skip if too close to project reset
        const timeSinceReset = Date.now() - this.lastResetTime;
        if (timeSinceReset < this.NEW_PROJECT_COOLDOWN) {
            //console.log(`[SaveManager] Project changed ignored - too soon after reset (${timeSinceReset}ms)`);
            return;
        }
        
        //console.log('[SaveManager] Project changed event received');
        
        // Mark project as having pending changes
        this.setState({ pendingChanges: true });
        
        if (this.context) {
            // Set project changed flag in context
            this.context.setProjectChanged(true);
        }
        
        // Reset debounce timer
        if (this.changeDebounceTimer) {
            clearTimeout(this.changeDebounceTimer);
        }
        
        // Set a new debounce timer
        this.changeDebounceTimer = setTimeout(() => {
            // Double check that we're not in cooldown before performing auto-save
            if (!this.state.newProjectCooldown) {
                this.performAutoSave();
            }
        }, this.CHANGE_DEBOUNCE_TIME);
    }
    
    checkSession() {
        const hasSession = !!localStorage.getItem('session_id');
        
        if (hasSession !== this.props.canSave) {
            //console.log('[SaveManager] Session status changed:', hasSession);
            this.props.onSetCanSave(hasSession);
        }
    }
    
    checkAndSaveIfNeeded() {
        // Skip check during cooldown period
        if (this.state.newProjectCooldown) {
            //console.log('[SaveManager] Auto-save check skipped due to cooldown');
            return;
        }
        
        const { pendingChanges, autoSaveEnabled, saveInProgress } = this.state;
        const isLoggedIn = this.context ? this.context.isLoggedIn : false;
        const projectChanged = this.context ? this.context.projectChanged : false;
        
        // Check time since last reset
        const timeSinceReset = Date.now() - this.lastResetTime;
        if (timeSinceReset < this.NEW_PROJECT_COOLDOWN) {
            //console.log(`[SaveManager] Auto-save check skipped - too soon after reset (${timeSinceReset}ms)`);
            return;
        }
        
        /*console.log('[SaveManager] Checking if save needed:', {
            pendingChanges,
            autoSaveEnabled,
            isLoggedIn,
            saveInProgress,
            canSave: this.props.canSave,
            timeSinceReset
        });*/
        
        // Only save if there are changes, auto-save is enabled, user is logged in, and no save is in progress
        if (projectChanged && autoSaveEnabled && isLoggedIn && !saveInProgress && this.props.canSave) {
            this.performAutoSave();
        }
    }
    
    performAutoSave() {
        // Ensure we don't double-save - check both component and static locks
        if (this.state.saveInProgress || SaveManager.saveInProgress) {
            //console.log('[SaveManager] Save already in progress, skipping auto-save');
            return;
        }
        
        // Skip saving if in cooldown
        if (this.state.newProjectCooldown) {
            //console.log('[SaveManager] Auto-save skipped due to cooldown');
            return;
        }
        
        // Check time since reset
        const timeSinceReset = Date.now() - this.lastResetTime;
        if (timeSinceReset < this.NEW_PROJECT_COOLDOWN) {
            //console.log(`[SaveManager] Auto-save skipped - too soon after reset (${timeSinceReset}ms)`);
            return;
        }
        
        //console.log('[SaveManager] Performing auto-save');
        
        // Get project ID from context or state
        const projectId = this.context ? this.context.projectId : null;
        
        // Set both local and static locks before saving
        SaveManager.saveInProgress = true;
        
        // Save the project
        this.saveProject(projectId);
    }
    
    saveProjectAs(newTitle = null) {
        if (!this.props.vm) {
            console.error('[SaveManager] Cannot save as - VM not available');
            return Promise.reject(new Error('VM not available'));
        }
        
        // Set saving state
        this.setState({ saveInProgress: true });
        SaveManager.saveInProgress = true;
        
        // Get project title from context or use provided title
        const currentTitle = this.context ? this.context.projectTitle : 'Untitled Project';
        const projectTitle = newTitle || currentTitle;
        
        // If newTitle is not provided but we have a current title, add "copy" to it
        const titleToUse = newTitle || `${currentTitle} (copy)`;
        
        //console.log(`[SaveManager] Starting Save As with title: "${titleToUse}"`);
        
        // Always use the create endpoint for Save As
        const endpoint = '/backend/api/projects';
        
        // Use saveProjectToServer with force creation
        return saveProjectToServer(
            endpoint,
            null, // null projectId forces creation of a new project
            this.props.vm,
            { 
                title: titleToUse,
                // Optionally include original project ID for tracking remixes
                originalId: this.context ? this.context.projectId : null,
                isCopy: true
            }
        )
        .then(response => {
            //console.log('[SaveManager] Save As completed successfully:', response);
            
            this.setState({
                lastAutoSave: new Date(),
                saveStatus: 'success',
                saveError: null,
                pendingChanges: false,
                saveInProgress: false
            });
            
            // Update project ID and title in context
            // For collaborative projects, use collaborative_project.id
            if (this.context && response) {
                let projectIdToStore = response.id;
                let collaborativeProjectId = null;
                
                // If this is a new collaborative project, use collaborative_project.id
                if (response.collaborative_project && response.collaborative_project.id) {
                    projectIdToStore = response.collaborative_project.id;
                    collaborativeProjectId = response.collaborative_project.id;
                    //console.log('[SaveManager] New collaborative project copy created, storing collab ID:', projectIdToStore);
                } else if (response.id) {
                    projectIdToStore = response.id;
                    //console.log('[SaveManager] Storing project ID for copy:', projectIdToStore);
                }
                
                if (projectIdToStore) {
                    const numericId = Number(projectIdToStore);
                    this.context.setProjectId(numericId);
                    this.context.setProjectTitle(titleToUse);
                    this.context.setProjectChanged(false);
                    
                    // ✅ UPDATE Redux state with project ID (ensure it's a number)
                    this.props.onSetProjectId(numericId);
                    
                    // Set collaborative project ID if available
                    if (collaborativeProjectId) {
                        this.context.setIsCollaborative(true);
                        this.context.setCollaborativeProjectId(collaborativeProjectId);
                    }
                }
            }
            
            // Update VM metadata
            if (this.props.vm && this.props.vm.runtime && response) {
                // Use collaborative_project.id if available, otherwise use project.id
                const idToStore = (response.collaborative_project && response.collaborative_project.id) 
                    ? response.collaborative_project.id 
                    : response.id;
                    
                this.props.vm.runtime.projectMetadata = {
                    id: idToStore,
                    title: titleToUse,
                    isCollaborative: !!(response.collaborative_project),
                    collaborativeProjectId: response.collaborative_project ? response.collaborative_project.id : null
                };
                //console.log('[SaveManager] Updated VM project metadata for new copy:', this.props.vm.runtime.projectMetadata);
            }
            
            // Update Redux title
            this.props.onUpdateProjectTitle(titleToUse);
            
            // Release global save lock
            SaveManager.saveInProgress = false;
            
            return response;
        })
        .catch(error => {
            console.error('[SaveManager] Save As failed:', error);
            
            this.setState({
                saveStatus: 'error',
                saveError: error,
                saveInProgress: false
            });
            
            // Release global save lock
            SaveManager.saveInProgress = false;
            
            throw error;
        });
    }


    saveProject(projectId=null) {
        if (!this.props.vm) {
            console.error('[SaveManager] Cannot save - VM not available');
            SaveManager.saveInProgress = false;
            return;
        }
        console.log('[SaveManager] Saving project with ID:', projectId);
        
        this.setState({ saveInProgress: true });
        
        const now = new Date();
        //console.log(`[SaveManager] Starting save at ${now.toLocaleTimeString()}`, { projectId });
        
        // Get project title
        const projectTitle = this.context ? this.context.projectTitle : 'Untitled Project';
        
        // Determine API endpoint based on whether we're creating or updating
        const endpoint = projectId ? 
            `/backend/api/projects/${projectId}` : 
            '/backend/api/projects';
        
        // Use saveProjectToServer directly
        saveProjectToServer(
            endpoint,
            projectId,
            this.props.vm,
            { title: projectTitle }
        )
        .then(response => {
            const completionTime = new Date();
            //console.log(`[SaveManager] Save completed at ${completionTime.toLocaleTimeString()}:`, response);
            
            this.setState({
                lastAutoSave: completionTime,
                saveStatus: 'success',
                saveError: null,
                pendingChanges: false,
                saveInProgress: false
            });
            
            // Update project ID in context when save completes
            // For collaborative projects, use collaborative_project.id if available
            // Otherwise use the project.id (working copy or commit id)
            if (this.context && response) {
                let projectIdToStore = response.id;
                let collaborativeProjectId = null;
                
                // If this is a new collaborative project, use collaborative_project.id
                if (response.collaborative_project && response.collaborative_project.id) {
                    collaborativeProjectId = response.collaborative_project.id;
                    //console.log('[SaveManager] New collaborative project created, storing collab ID:', projectIdToStore);
                } else if (response.id) {
                    projectIdToStore = response.id;
                    //console.log('[SaveManager] Storing project ID:', projectIdToStore);
                }
                
                if (projectIdToStore) {
                    const numericId = Number(projectIdToStore);
                    this.context.setProjectId(numericId);
                    this.context.setProjectChanged(false);
                    
                    // ✅ UPDATE Redux state with project ID (ensure it's a number)
                    //this.props.onSetProjectId(numericId);
                    
                    // Set collaborative project ID if available
                    if (collaborativeProjectId) {
                        this.context.setIsCollaborative(true);
                        this.context.setCollaborativeProjectId(collaborativeProjectId);
                    }
                    
                    // Verify context update
                    setTimeout(() => {
                        const updatedId = this.context.projectId;
                        //console.log('[SaveManager] Verified context project ID:', updatedId);
                    }, 100);
                }
            }
            if (this.props.vm && this.props.vm.runtime && response) {
                // Use collaborative_project.id if available, otherwise use project.id
                const idToStore = (response.collaborative_project && response.collaborative_project.id) 
                    ? response.collaborative_project.id 
                    : response.id;
                    
                this.props.vm.runtime.projectMetadata = {
                    id: idToStore,
                    title: projectTitle,
                    isCollaborative: !!(response.collaborative_project),
                    collaborativeProjectId: response.collaborative_project ? response.collaborative_project.id : null
                };
                //console.log('[SaveManager] Updated VM project metadata:', this.props.vm.runtime.projectMetadata);
            }
            
            // Release global save lock
            SaveManager.saveInProgress = false;
        })
        .catch(error => {
            console.error('[SaveManager] Save failed:', error);
            
            this.setState({
                saveStatus: 'error',
                saveError: error,
                saveInProgress: false
            });
            
            // If error is related to authentication, update canSave
            if (error.message && error.message.includes('authentication')) {
                this.props.onSetCanSave(false);
            }
            
            // Release global save lock
            SaveManager.saveInProgress = false;
        });
    }
    
    /**
     * Load a project from the server using its ID
     * @param {string|number} projectId - The ID of the project to load
     * @returns {Promise<boolean>} - Success status
     */
   async loadProject(projectId) {
        if (!this.props.vm) {
            console.error('[SaveManager] Cannot load project - VM not available');
            return false;
        }
        
        try {
            this.setState({ loadInProgress: true, loadError: null });
            
            await ProjectManager.loadProject(projectId, this.props.vm, {
                onUpdateMetadata: this.updateProjectMetadata,
                onUpdateTitle: this.props.onUpdateProjectTitle
            });
            
            this.setState({
                loadInProgress: false,
                pendingChanges: false
            });
            
            return true;
        } catch (error) {
            console.error('[SaveManager] Error loading project:', error);
            this.setState({ 
                loadInProgress: false,
                loadError: error
            });
            return false;
        }
    }
    
    /**
     * Load the most recent project for the current user
     * @returns {Promise<boolean>} - Success status
     */
    async loadRecentProject() {
        try {
            this.setState({ loadInProgress: true, loadError: null });
            
            const metadata = await ProjectManager.loadRecentProject(this.props.vm, {
                onUpdateMetadata: this.updateProjectMetadata,
                onUpdateTitle: this.props.onUpdateProjectTitle
            });
            
            this.setState({ loadInProgress: false });
            
            return !!metadata;
        } catch (error) {
            console.error('[SaveManager] Error loading recent project:', error);
            this.setState({ 
                loadInProgress: false,
                loadError: error
            });
            return false;
        }
    }
    
    toggleAutoSave() {
        this.setState(prevState => ({
            autoSaveEnabled: !prevState.autoSaveEnabled
        }));
    }

    showProjectsModal() {
        this.setState({ projectsModalVisible: true });
    }
    
    hideProjectsModal() {
        this.setState({ projectsModalVisible: false });
    }
    
    render() {
        // Get project ID from context
        const projectId = this.context ? this.context.projectId : null;
        const isLoggedIn = this.context ? this.context.isLoggedIn : false;
        const projectChanged = this.context ? this.context.projectChanged : false;
        
        // Calculate time since last reset for display
        const timeSinceReset = Date.now() - this.lastResetTime;
        const inCooldown = this.state.newProjectCooldown || timeSinceReset < this.NEW_PROJECT_COOLDOWN;
        
        return (

            <React.Fragment>
                {SaveManager.debugDisplay && (
                    <div className="save-manager-debug" style={{
                        position: 'fixed',
                        bottom: '70px',
                        left: '10px',
                        padding: '8px',
                        background: '#ffffffcc',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        zIndex: 9998
                    }}>
                        <div>Auto-save: {this.state.autoSaveEnabled ? '✅' : '❌'}</div>
                        <div>Can save: {this.props.canSave ? '✅' : '❌'}</div>
                        <div>Logged in: {isLoggedIn ? '✅' : '❌'}</div>
                        <div>Project ID: {projectId || 'Not saved yet'}</div>
                        <div>Pending changes: {this.state.pendingChanges ? 'Yes' : 'No'}</div>
                        <div>Save in progress: {this.state.saveInProgress ? 'Yes' : 'No'}</div>
                        <div>Load in progress: {this.state.loadInProgress ? 'Yes' : 'No'}</div>
                        <div style={{
                            color: inCooldown ? 'red' : 'green',
                            fontWeight: inCooldown ? 'bold' : 'normal'
                        }}>
                            Cooldown: {inCooldown ? 'ACTIVE' : 'inactive'} 
                            ({Math.round(timeSinceReset / 1000)}s since reset)
                        </div>
                        <div>Last auto-save: {this.state.lastAutoSave ? 
                            this.state.lastAutoSave.toLocaleTimeString() : 'Never'}</div>
                        <div>Context changed flag: {projectChanged ? 'Yes' : 'No'}</div>
                        <div>Status: {this.state.saveStatus || 'N/A'}</div>
                        
                        {/* Error display */}
                        {this.state.saveError && (
                            <div style={{color: 'red'}}>
                                Save Error: {this.state.saveError.message || 'Unknown error'}
                            </div>
                        )}
                        {this.state.loadError && (
                            <div style={{color: 'red'}}>
                                Load Error: {this.state.loadError.message || 'Unknown error'}
                            </div>
                        )}
                        
                        {/* Action buttons */}
                        <div style={{marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
                            <button 
                                onClick={this.toggleAutoSave}
                            >
                                {this.state.autoSaveEnabled ? 'Disable' : 'Enable'} Auto-save
                            </button>
                            <button 
                                onClick={() => this.saveProject(projectId)}
                                disabled={this.state.saveInProgress || inCooldown}
                            >
                                Save Now {inCooldown ? '(in cooldown)' : ''}
                            </button>
                            <button 
                                onClick={this.loadRecentProject}
                                disabled={this.state.loadInProgress}
                                style={{background: '#4c97ff', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px'}}
                            >
                                {this.state.loadInProgress ? 'Loading...' : 'Load Recent Project'}
                            </button>
                            <button 
                                onClick={() => this.saveProjectAs(`${this.context.projectTitle || 'Untitled'} (copy)`)}
                                disabled={this.state.saveInProgress}
                                style={{background: '#4c97ff', color: 'white'}}
                            >
                                Save As New Project
                            </button>
                        </div>
                    </div>
                )} 
                <ProjectsModal
                    isOpen={this.state.projectsModalVisible}
                    onRequestClose={this.hideProjectsModal}
                />                {/* Projects Modal */}
                {this.state.projectsModalVisible && (
                    <ProjectsModal
                        isOpen={this.state.projectsModalVisible}
                        onClose={this.hideProjectsModal}
                        onOpenProject={this.loadProject}
                        intl={this.props.intl}
                    />
                )}
            </React.Fragment>
            
        );
    }
}

// Set the contextType to use UserContext
SaveManager.contextType = UserContext;

// Static variable to track global save lock
SaveManager.saveInProgress = false;

SaveManager.propTypes = {
    canSave: PropTypes.bool,
    vm: PropTypes.object,
    onSetCanSave: PropTypes.func.isRequired,
    onSetProjectId: PropTypes.func.isRequired,
    onUpdateProjectTitle: PropTypes.func.isRequired,
    showDebugInfo: PropTypes.bool
};

SaveManager.defaultProps = {
    showDebugInfo: true // Set to true by default to see debug info
};

const mapStateToProps = state => ({
    canSave: state.scratchGui.projectState.canSave,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onSetCanSave: canSave => dispatch(setCanSave(canSave)),
    onSetProjectId: projectId => dispatch(setProjectId(projectId)),
    onUpdateProjectTitle: title => dispatch(setProjectTitle(title))
});

const ConnectedSaveManager = connect(
    mapStateToProps,
    mapDispatchToProps
)(SaveManager);

export default injectIntl(React.forwardRef((props, ref) => {
    return <ConnectedSaveManager {...props} ref={ref} />;
}));