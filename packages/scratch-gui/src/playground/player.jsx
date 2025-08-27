import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {compose} from 'redux';

import Box from '../components/box/box.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import AppStateHOC from '../lib/app-state-hoc.jsx';

import {setPlayer} from '../reducers/mode';
import * as ProjectManager from '../lib/project-management';

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const fullscreen = urlParams.get('fullscreen') === 'true';
const isEmbedded = urlParams.get('embed') === 'true';


if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
    // Warn before navigating away
    window.onbeforeunload = () => true;
}

import styles from './player.css';

const Player = ({isPlayerOnly, onSeeInside, projectId}) => (
    <Box className={classNames(isPlayerOnly ? styles.stageOnly : styles.editor)}>
        {isPlayerOnly && <button onClick={onSeeInside}>{'See inside'}</button>}
        <GUI
            canEditTitle
            enableCommunity
            isPlayerOnly={isPlayerOnly}
            projectId={projectId}
            isFullScreen={fullscreen}
            isEmbedded={isEmbedded}
        />
    </Box>
);

Player.propTypes = {
    isPlayerOnly: PropTypes.bool,
    onSeeInside: PropTypes.func,
    projectId: PropTypes.string
};

if (projectId) {
    const loadProjectFromId = async () => {
        try {
            // Get vm instance from window
            const vm = window.vm;
            
            if (!vm) {
                throw new Error('VM not available');
            }
            
            // Load project through ProjectManager
            await ProjectManager.loadProject(projectId, vm, {
                playerOnly: true
            });
            
            console.log(`Project ${projectId} loaded successfully in player mode`);
        } catch (error) {
            console.error('Error loading project:', error);
        }
    };
    
    // Load project after GUI initializes
    window.addEventListener('scratch-gui-initialized', loadProjectFromId);
}

const mapStateToProps = state => ({
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly
});

const mapDispatchToProps = dispatch => ({
    onSeeInside: () => dispatch(setPlayer(false))
});

const ConnectedPlayer = connect(
    mapStateToProps,
    mapDispatchToProps
)(Player);

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedPlayer = compose(
    AppStateHOC,
    HashParserHOC
)(ConnectedPlayer);

const appTarget = document.createElement('div');
document.body.appendChild(appTarget);

ReactDOM.render(<WrappedPlayer isPlayerOnly />, appTarget);
