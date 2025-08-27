import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';
import ProjectService from '../../lib/project-service';
import { UserContext } from '../../contexts/UserContext';

/**
 * Component that handles loading the user's last project or creating a new one
 */
class ProjectLoader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            projectLoaded: false
        };
        
        this.loadLastProject = this.loadLastProject.bind(this);
        this.loadProjectById = this.loadProjectById.bind(this);
        this.createNewProject = this.createNewProject.bind(this);
    }
    
    componentDidMount() {
        // Don't load project if in player mode
        if (this.props.isPlayerOnly) {
            return;
        }
        
        // Check if user is logged in
        const isLoggedIn = this.context ? this.context.isLoggedIn : false;
        
        if (isLoggedIn) {
            console.log('[ProjectLoader] User is logged in, attempting to load last project');
            this.loadLastProject();
        } else {
            // Set up a listener to load project after login
            this.loginWatcher = setInterval(() => {
                const isNowLoggedIn = this.context ? this.context.isLoggedIn : false;
                
                if (isNowLoggedIn && !this.state.loading && !this.state.projectLoaded) {
                    console.log('[ProjectLoader] User logged in, now loading last project');
                    clearInterval(this.loginWatcher);
                    this.loadLastProject();
                }
            }, 1000); // Check every second
        }
    }
    
    componentWillUnmount() {
        if (this.loginWatcher) {
            clearInterval(this.loginWatcher);
        }
    }
    
    async loadLastProject() {
        const { vm } = this.props;
        
        if (!vm) {
            console.error('[ProjectLoader] VM not available');
            return;
        }
        
        try {
            this.setState({ loading: true });
            
            // Check for project ID in URL
            const urlParams = new URLSearchParams(window.location.search);
            const projectIdFromUrl = urlParams.get('projectId');
            
            // If project ID is in URL, load that specific project
            if (projectIdFromUrl) {
                console.log(`[ProjectLoader] Loading project from URL parameter: ${projectIdFromUrl}`);
                await this.loadProjectById(projectIdFromUrl);
                return;
            }
            
            // No project ID in URL, try to fetch the most recent project
            console.log('[ProjectLoader] Fetching most recent project');
            const projectMetadata = await ProjectService.fetchLastProject();
            
            if (projectMetadata && projectMetadata.id) {
                console.log('[ProjectLoader] Found recent project:', projectMetadata.id);
                
                // Update context with project metadata
                if (this.context) {
                    this.context.setProjectId(projectMetadata.id);
                    if (projectMetadata.title) {
                        this.context.setProjectTitle(projectMetadata.title);
                    }
                }
                
                // Load the project into VM
                await ProjectService.loadProjectIntoVM(vm, projectMetadata);
                console.log('[ProjectLoader] Project loaded into VM successfully');
                this.setState({ projectLoaded: true });
            } else {
                // No projects found, create a new one
                console.log('[ProjectLoader] No recent projects found, creating new project');
                this.createNewProject();
            }
        } catch (error) {
            console.error('[ProjectLoader] Error loading project:', error);
            this.setState({ error });
            
            // If there's an error loading the project, create a new one
            this.createNewProject();
        } finally {
            this.setState({ loading: false });
        }
    }
    
    async loadProjectById(projectId) {
        const { vm } = this.props;
        
        if (!vm || !projectId) {
            console.error('[ProjectLoader] VM or project ID not available');
            return false;
        }
        
        try {
            // Fetch project metadata
            const projectMetadata = await ProjectService.fetchProjectMetadata(projectId);
            
            if (!projectMetadata) {
                throw new Error(`Project ${projectId} not found`);
            }
            
            // Update project info in context
            if (this.context) {
                this.context.setProjectId(projectId);
                if (projectMetadata.title) {
                    this.context.setProjectTitle(projectMetadata.title);
                }
            }
            
            // Load the project into VM using SB3 file
            await ProjectService.loadProjectIntoVM(vm, projectMetadata);
            console.log(`[ProjectLoader] Project ${projectId} loaded successfully`);
            this.setState({ projectLoaded: true });
            return true;
        } catch (error) {
            console.error(`[ProjectLoader] Error loading project ${projectId}:`, error);
            this.setState({ error });
            return false;
        }
    }
    
    createNewProject() {
        const { vm } = this.props;
        
        if (!vm) {
            console.error('[ProjectLoader] VM not available for creating new project');
            return;
        }
        
        try {
            console.log('[ProjectLoader] Creating new project');
            vm.createEmptyProject();
            this.setState({ projectLoaded: true });
            
            // Reset project ID in context since this is a new project
            if (this.context) {
                this.context.resetProject();
            }
        } catch (error) {
            console.error('[ProjectLoader] Error creating new project:', error);
            this.setState({ error });
        }
    }
    
    render() {
        // This component doesn't render anything visible
        return null;
    }
}

// Set the contextType to use UserContext
ProjectLoader.contextType = UserContext;

ProjectLoader.propTypes = {
    vm: PropTypes.instanceOf(VM),
    isPlayerOnly: PropTypes.bool
};

ProjectLoader.defaultProps = {
    isPlayerOnly: false
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly
});

export default connect(
    mapStateToProps
)(ProjectLoader);