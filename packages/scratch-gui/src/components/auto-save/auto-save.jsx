import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import debounce from 'lodash.debounce';
import VM from '@scratch/scratch-vm';

import {getIsShowingWithId} from '../../reducers/project-state';
import saveProjectToServer from '../../lib/save-project-to-server';

/**
 * Component that automatically saves the project as SB3 file
 * when the project changes and enough time has passed
 */
class AutoSave extends React.Component {
    constructor (props) {
        super(props);
        
        // Manually bind methods instead of using lodash.bindAll
        this.startAutoSave = this.startAutoSave.bind(this);
        this.stopAutoSave = this.stopAutoSave.bind(this);
        this.handleAutoSave = this.handleAutoSave.bind(this);
        
        this.state = {
            isSaving: false,
            lastSaveTime: null,
            saveError: null
        };

        // Create debounced save function to avoid too frequent saves
        this.debouncedAutoSave = debounce(this.handleAutoSave, 3000);
        this.autoSaveInterval = null;
    }

    componentDidMount () {
        // Start auto-save if conditions are met
        if (this.canPerformAutoSave()) {
            this.startAutoSave();
        }
        
        // Add VM listener for project changes
        if (this.props.vm) {
            this.props.vm.on('PROJECT_CHANGED', this.debouncedAutoSave);
        }
    }

    componentDidUpdate (prevProps) {
        // Start/stop auto-save based on condition changes
        const canAutoSaveNow = this.canPerformAutoSave();
        const couldAutoSave = this.canPerformAutoSave(prevProps);
        
        if (canAutoSaveNow && !couldAutoSave) {
            this.startAutoSave();
        } else if (!canAutoSaveNow && couldAutoSave) {
            this.stopAutoSave();
        }
        
        // If project has been newly loaded, reset last save time
        if (this.props.projectId !== prevProps.projectId) {
            this.setState({ lastSaveTime: null });
            console.log('[AutoSave] Project ID changed, reset lastSaveTime');
        }
        
        // If VM instance has changed, update listeners
        if (this.props.vm !== prevProps.vm) {
            if (prevProps.vm) {
                prevProps.vm.removeListener('PROJECT_CHANGED', this.debouncedAutoSave);
            }
            if (this.props.vm) {
                this.props.vm.on('PROJECT_CHANGED', this.debouncedAutoSave);
            }
        }
    }

    componentWillUnmount () {
        this.stopAutoSave();
        // Remove VM listener
        if (this.props.vm) {
            this.props.vm.removeListener('PROJECT_CHANGED', this.debouncedAutoSave);
        }
        // Cancel any pending debounced save
        if (this.debouncedAutoSave.cancel) {
            this.debouncedAutoSave.cancel();
        }
    }

    canPerformAutoSave (props = this.props) {
        return (
            props.autoSaveEnabled &&
            props.isShowingWithId &&
            props.canSave &&
            props.projectId &&
            props.projectId !== '0'
        );
    }

    startAutoSave () {
        this.stopAutoSave(); // Clear any existing interval first
        this.autoSaveInterval = setInterval(() => {
            if (this.props.projectChanged && !this.state.isSaving) {
                this.handleAutoSave();
            }
        }, this.props.autoSaveIntervalMs);
        
        console.log('[AutoSave] Started - interval:', this.props.autoSaveIntervalMs / 1000, 'seconds');
    }

    stopAutoSave () {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('[AutoSave] Stopped');
        }
    }

    handleAutoSave () {
        // Don't save if already saving or conditions aren't met
        if (this.state.isSaving || !this.canPerformAutoSave()) {
            return;
        }
        
        const timeSinceLastSave = this.state.lastSaveTime ? 
            Date.now() - this.state.lastSaveTime : 
            Infinity;
        
        // Skip if we saved too recently
        if (timeSinceLastSave < this.props.minTimeBetweenSavesMs) {
            console.log(`[AutoSave] Skipping - saved ${Math.round(timeSinceLastSave/1000)}s ago`);
            return;
        }
        
        if (this.props.projectChanged) {
            console.log('[AutoSave] Saving project...');
            this.setState({ isSaving: true, saveError: null });
            
            // Use the SB3 save approach
            saveProjectToServer(
                null,
                this.props.projectId,
                this.props.vm,
                { title: this.props.projectTitle }
            )
            .then(response => {
                console.log('[AutoSave] Save successful:', response);
                this.setState({
                    isSaving: false,
                    lastSaveTime: Date.now(),
                    saveError: null
                });
                
                // Notify parent component of successful save
                if (this.props.onSaveComplete) {
                    this.props.onSaveComplete(response);
                }
            })
            .catch(error => {
                console.error('[AutoSave] Save failed:', error);
                this.setState({
                    isSaving: false,
                    saveError: error
                });
                
                // Notify parent component of error
                if (this.props.onSaveError) {
                    this.props.onSaveError(error);
                }
            });
        } else {
            console.log('[AutoSave] No changes to save');
        }
    }

    render () {
        // This component doesn't render anything visible
        return null;
    }
}

AutoSave.propTypes = {
    autoSaveEnabled: PropTypes.bool,
    autoSaveIntervalMs: PropTypes.number,
    minTimeBetweenSavesMs: PropTypes.number,
    canSave: PropTypes.bool,
    isShowingWithId: PropTypes.bool,
    projectChanged: PropTypes.bool,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectTitle: PropTypes.string,
    vm: PropTypes.instanceOf(VM),
    onSaveComplete: PropTypes.func,
    onSaveError: PropTypes.func
};

AutoSave.defaultProps = {
    autoSaveEnabled: true,
    autoSaveIntervalMs: 60000, // 60 seconds interval
    minTimeBetweenSavesMs: 30000, // 30 seconds minimum between saves
    projectTitle: 'Untitled Project'
};

const mapStateToProps = state => ({
    canSave: state.scratchGui.projectState.canSave,
    isShowingWithId: getIsShowingWithId(state.scratchGui.projectState.loadingState),
    projectChanged: state.scratchGui.projectChanged,
    projectId: state.scratchGui.projectState.projectId,
    projectTitle: state.scratchGui.projectTitle,
    vm: state.scratchGui.vm
});

export default connect(
    mapStateToProps
)(AutoSave);