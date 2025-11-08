import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl} from 'react-intl';
import intlShape from './intlShape';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

import {setProjectUnchanged} from '../reducers/project-changed';
import {
    LoadingStates,
    defaultProjectId,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    setProjectId
} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';

import log from './log';
import {GUIStoragePropType} from '../gui-config';
import * as ProjectManager from './project-management';
import defaultProjectAsset from './default-project.sb3';

/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject'
            ]);

            const storage = this.props.storage;

            storage.setProjectHost?.(props.projectHost);
            storage.setProjectToken?.(props.projectToken);
            storage.setAssetHost?.(props.assetHost);
            storage.setTranslatorFunction?.(props.intl.formatMessage);

            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
            }
        }
        componentDidMount() {
            const storage = this.props.storage;
            // Set the project host to our backend API
            storage.setProjectHost?.(this.props.projectHost || '/backend/projects');
        }
        componentDidUpdate (prevProps) {
            const storage = this.props.storage;

            if (prevProps.projectHost !== this.props.projectHost) {
                storage.setProjectHost?.(this.props.projectHost);
            }
            if (prevProps.projectToken !== this.props.projectToken) {
                storage.setProjectToken?.(this.props.projectToken);
            }
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost?.(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && !prevProps.isFetchingWithId) {
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && !prevProps.isShowingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }
        async fetchProject (projectId, loadingState) {
            if (!this.props.vm) {
                const error = new Error('VM not available');
                this.props.onError(error);
                log.error(error);
                return;
            }

            try {
                let sb3Data;
                
                // Check if this is the default project (loaded before login)
                if (projectId === defaultProjectId || projectId === '0' || projectId === 0) {
                    // Load the default project from the local file instead of backend
                    log.info('Loading default project from local file');
                    const response = await fetch(defaultProjectAsset);
                    sb3Data = await response.arrayBuffer();
                } else {
                    // Download the project data using the new backend API
                    sb3Data = await ProjectManager.downloadProjectSB3(projectId);
                }
                
                if (!sb3Data) {
                    throw new Error('Could not find project');
                }
                
                // Pass the project data to Redux, which will trigger vm-manager-hoc to load it
                this.props.onFetchedProjectData(sb3Data, loadingState);
            } catch (err) {
                this.props.onError(err);
                log.error(err);
            }
        }
        render () {
            const {
                 
                assetHost,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                projectHost,
                projectId,
                projectToken,
                reduxProjectId,
                setProjectId: setProjectIdProp,
                vm: vmProp,
                 
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        storage: GUIStoragePropType,
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isCreatingNew: PropTypes.bool,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        projectHost: PropTypes.string,
        projectToken: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func,
        vm: PropTypes.instanceOf(VM)
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://assets.scratch.mit.edu',
        //assetHost: '',
        projectHost: 'https://projects.scratch.mit.edu'
    };

    const mapStateToProps = state => ({
        storage: state.scratchGui.config.storage,
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged())
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};
