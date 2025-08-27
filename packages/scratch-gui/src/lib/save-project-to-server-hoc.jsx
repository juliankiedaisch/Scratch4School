import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {compose} from 'redux';

import {
    getIsUpdating,
    getIsShowingWithId,
    LoadingStates,
    setCanSave
} from '../reducers/project-state';

import saveProjectToServer from './save-project-to-server';

/**
 * Higher Order Component to provide our custom project saving functionality
 * @param {React.Component} WrappedComponent component to receive customized saving
 * @returns {React.Component} Component with custom project saving
 */
const SaveProjectToServerHOC = function (WrappedComponent) {
    class SaveProjectToServerComponent extends React.Component {
        constructor (props) {
            super(props);
            this.state = {
                canSave: false
            };
        }
        
        componentDidMount() {
            // Check authentication immediately
            this.checkAuthentication();
            
            // Start polling for authentication status every 30 seconds
            this.authCheckInterval = setInterval(this.checkAuthentication, 30000);
            
            // Add event listener for localStorage changes
            window.addEventListener('storage', this.handleStorageChange);
        }
        
        componentWillUnmount() {
            // Clean up interval and event listeners
            if (this.authCheckInterval) {
                clearInterval(this.authCheckInterval);
            }
            window.removeEventListener('storage', this.handleStorageChange);
        }
        
        handleStorageChange = (e) => {
            // Respond to changes in session_id
            if (e.key === 'session_id') {
                this.checkAuthentication();
            }
        }
        
        checkAuthentication = () => {
            const sessionId = localStorage.getItem('session_id');
            const hasSession = !!sessionId;
            
            // Only log when authentication status changes
            /*
            if (hasSession !== this.state.canSave) {
                console.log("[SaveProjectToServerHOC] Authentication status changed:", hasSession);
            } else {
                console.debug("[SaveProjectToServerHOC] Authentication status unchanged:", hasSession);
            }*/
            
            if (hasSession !== this.state.canSave) {
                // Update local component state
                this.setState({ canSave: hasSession });
                
                // Update Redux store if we have the setter function
                if (this.props.onSetCanSave) {
                    this.props.onSetCanSave(hasSession);
                }
            }
        }

        render () {
            const {
                /* eslint-disable no-unused-vars */
                projectHost,
                vm,
                loadingState,
                isShowingWithId,
                onSetCanSave,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            
            // Optimize logging - only log once per render, not multiple times
            /*
            if (process.env.NODE_ENV !== 'production') {
                console.log("[SaveProjectToServerHOC] Rendering with:", {
                    canSave: this.state.canSave,
                    isShowingWithId: this.props.isShowingWithId,
                    loadingState: this.props.loadingState
                });
            }*/
            
            return (
                <WrappedComponent
                    canSave={this.state.canSave}
                    canCreateCopy={this.state.canSave}
                    canManageFiles={true}
                    // Override loading state only if needed to make save button appear
                    loadingState={this.props.isShowingWithId ? this.props.loadingState : LoadingStates.SHOWING_WITH_ID}
                    // Enhanced save function that handles SB3 files properly
                    onUpdateProjectData={(projectId, vmInstance, params) => {
                        if (!this.state.canSave) {
                            console.warn("[SaveProjectToServerHOC] Cannot save - user not authenticated");
                            return Promise.reject(new Error('Authentication required to save project'));
                        }
                        
                        // Log save attempt with cleaner output
                        /*
                        console.log("[SaveProjectToServerHOC] Saving project:", { 
                            projectId,
                            hasParams: !!params,
                            authenticated: !!localStorage.getItem('session_id')
                        });
                        */

                        // Use the VM directly to ensure SB3 file with assets is saved
                        return saveProjectToServer(
                            '/backend/api/projects',
                            projectId,
                            vmInstance,  // Pass VM directly, not just JSON
                            params
                        );
                    }}
                    {...componentProps}
                />
            );
        }
    }

    SaveProjectToServerComponent.propTypes = {
        isShowingWithId: PropTypes.bool,
        isUpdating: PropTypes.bool,
        loadingState: PropTypes.string,
        projectHost: PropTypes.string,
        onSetCanSave: PropTypes.func,
        vm: PropTypes.shape({
            saveProjectSb3: PropTypes.func
        })
    };
    
    const mapStateToProps = state => ({
        isUpdating: getIsUpdating(state.scratchGui.projectState.loadingState),
        isShowingWithId: getIsShowingWithId(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        vm: state.scratchGui.vm
    });
    
    const mapDispatchToProps = dispatch => ({
        onSetCanSave: canSave => dispatch(setCanSave(canSave))
    });
    
    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(SaveProjectToServerComponent);
};

export default SaveProjectToServerHOC;