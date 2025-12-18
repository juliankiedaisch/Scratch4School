import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import AccountNav from '../../components/menu-bar/account-nav.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';

import {openTipsLibrary, openDebugModal} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu
} from '../../reducers/menus';

import collectMetadata from '../../lib/collect-metadata';
import {PLATFORM} from '../../lib/platform';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import mystuffIcon from './icon--mystuff.png';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import aboutIcon from './icon--about.svg';
import fileIcon from './icon--file.svg';
import editIcon from './icon--edit.svg';
import debugIcon from '../debug-modal/icons/icon--debug.svg';

import scratchLogo from './scratch-logo.svg';
import scratchLogoAndroid from './scratch-logo-android.svg';
import ninetiesLogo from './nineties_logo.svg';
import catLogo from './cat_logo.svg';
import prehistoricLogo from './prehistoric-logo.svg';
import oldtimeyLogo from './oldtimey-logo.svg';

import sharedMessages from '../../lib/shared-messages';

import {AccountMenuOptionsPropTypes} from '../../lib/account-menu-options';

//Scratch4School imports
import SaveManager from '../save-manager/save-manager.jsx';
import StatusBar from './status-bar.jsx';
import teacherIcon from './icon--teacher.svg';
import TeacherStudentsModal from '../teacher-modal/teacher-modal.jsx';
import collaborativeIcon from '../collaboration-manager-modal/icons/icon--collaborative.svg';
import CollaborationManagerModal from '../collaboration-manager-modal/collaboration-manager-modal.jsx';

// User context imports
import { UserContext } from '../../contexts/UserContext';

// User-related components
import LoginModal from '../login/login-modal';
import AutoSave from '../auto-save/auto-save.jsx';

const ariaMessages = defineMessages({
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    },
    debug: {
        id: 'gui.menuBar.debug',
        defaultMessage: 'Debug',
        description: 'accessibility text for the debug button'
    }
});

const getScratchLogo = platform => (platform === PLATFORM.ANDROID ? scratchLogoAndroid : scratchLogo);

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({id, isRtl, children, className}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

const AboutButton = props => (
    <Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickNew',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage',
            'shouldLogProps',
            'handleConnectionStatusChange',
            'handleSaveStatusUpdate'
        ]);
        
        // Store last logged props to prevent duplicate logs
        this.lastLoggedProps = {
            canSave: null,
            canManageFiles: null,
            fileMenuOpen: null,
            isShowingProject: null
        };
        
        this.state = {
            savedProjectId: this.props.projectId || null,
            saveStatus: null,
            saveError: null,
            projectsModalVisible: false,
            teacherStudentsModalVisible: false,
            collaborationModalVisible: false,
            connectionStatus: 'disconnected',
            isSaving: false,
            lastSaveTime: null,
            saveError: false
        };

        this.handleShowTeacherStudentsModal = this.handleShowTeacherStudentsModal.bind(this);
        this.handleCloseTeacherStudentsModal = this.handleCloseTeacherStudentsModal.bind(this);
        this.handleShowCollaborationModal = this.handleShowCollaborationModal.bind(this);
        this.handleCloseCollaborationModal = this.handleCloseCollaborationModal.bind(this);
        this.handleOpenProject = this.handleOpenProject.bind(this);
        this.saveManagerRef = React.createRef();
        this.pingInterval = null;
        
        // Flags to prevent race conditions when closing menus
        this.menuClosingFlags = {
            file: false,
            edit: false,
            mode: false,
            about: false,
            account: false,
            settings: false
        };
    }

    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
        
        // Log once on mount for debugging
        /*console.log("[MenuBar] componentDidMount - props:", {
            canSave: this.props.canSave,
            canManageFiles: this.props.canManageFiles,
            isShowingWithId: this.props.isShowingProject,
            loadingState: this.props.loadingState,
            projectId: this.props.projectId
        });*/
        this.startConnectionChecking();
        // Listen for save events
        document.addEventListener('projectSaveStarted', this.handleSaveStatusUpdate);
        document.addEventListener('projectSaved', this.handleSaveStatusUpdate);
        document.addEventListener('projectSaveError', this.handleSaveStatusUpdate);
        document.addEventListener('newProjectLoaded', this.handleSaveStatusUpdate);
    }
    
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Remove save event listeners
        document.removeEventListener('projectSaveStarted', this.handleSaveStatusUpdate);
        document.removeEventListener('projectSaved', this.handleSaveStatusUpdate);
        document.removeEventListener('projectSaveError', this.handleSaveStatusUpdate);
        document.removeEventListener('newProjectLoaded', this.handleSaveStatusUpdate);
    }
    
    // Helper to determine if we should log props (only when they change)
    shouldLogProps(currentProps) {
        const propsToCheck = {
            canSave: currentProps.canSave,
            canManageFiles: currentProps.canManageFiles,
            fileMenuOpen: currentProps.fileMenuOpen,
            isShowingProject: currentProps.isShowingProject
        };
        
        // Check if any props are different from last time we logged
        const shouldLog = !this.lastLoggedProps ||
            Object.keys(propsToCheck).some(key => propsToCheck[key] !== this.lastLoggedProps[key]);
            
        if (shouldLog) {
            // Update last logged props
            this.lastLoggedProps = {...propsToCheck};
        }
        
        return shouldLog;
    }

    // Add methods to show/hide the teacher modal
    handleShowTeacherStudentsModal () {
        this.setState({ teacherStudentsModalVisible: true });
    };

    handleCloseTeacherStudentsModal () {
        this.setState({ teacherStudentsModalVisible: false });
    };

    handleShowCollaborationModal() {
        this.setState({ collaborationModalVisible: true });
    }

    handleCloseCollaborationModal() {
        this.setState({ collaborationModalVisible: false });
    }

    handleOpenProject(projectId) {
        // Use SaveManager's loadProject method via a global custom event
        const event = new CustomEvent('loadProject', { detail: { projectId } });
        document.dispatchEvent(event);
    }

    handleSaveAs = () => {
        // Access SaveManager through the global document event system
        // This avoids direct ref usage which can be problematic
        //console.log("[MenuBar] handleSaveAs called");
        const currentTitle = this.props.projectTitle || 'Untitled Project';
        const newTitle = `${currentTitle} (copy)`;
        
        // Dispatch a custom event that SaveManager will listen for
        const event = new CustomEvent('saveProjectAs', { 
            detail: { 
                title: newTitle 
            }
        });
        document.dispatchEvent(event);
        this.props.onRequestCloseFile();
    };

    handleClickNew () {
        // if the project is dirty, and user owns the project, we will autosave.
        // but if they are not logged in and can't save, user should consider
        // downloading or logging in first.
        // Note that if user is logged in and editing someone else's project,
        // they'll lose their work.
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );
        this.props.onRequestCloseFile();
        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
        this.props.onRequestCloseFile();
    }

    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        // Access SaveManager through the global document event system
        // This avoids direct ref usage which can be problematic
        //console.log("[MenuBar] handleSave called");
        const currentId = this.props.projectId || null;
        
        // Dispatch a custom event that SaveManager will listen for
        const event = new CustomEvent('saveProject', { 
            detail: { 
                projectId: currentId 
            }
        });
        document.dispatchEvent(event);
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject(); // save before transitioning to project page
            waitForUpdate(true); // queue the transition to project page
        } else {
            waitForUpdate(false); // immediately transition to project page
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) { // save before transitioning to project page
                this.props.onShare();
            }
            if (this.props.canSave) { // save before transitioning to project page
                this.props.autoUpdateProject();
                waitForUpdate(true); // queue the transition to project page
            } else {
                waitForUpdate(false); // immediately transition to project page
            }
        }
    }
    handleSetMode (mode) {
        return () => {
            // Turn on/off filters for modes.
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            // Change logo for modes
            if (mode === '1990') {
                document.getElementById('logo_img').src = ninetiesLogo;
            } else if (mode === '2020') {
                document.getElementById('logo_img').src = catLogo;
            } else if (mode === '1920') {
                document.getElementById('logo_img').src = oldtimeyLogo;
            } else if (mode === '220022BC') {
                document.getElementById('logo_img').src = prehistoricLogo;
            } else {
                document.getElementById('logo_img').src = getScratchLogo(this.props.platform);
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier && event.key === 's') {
            this.props.onClickSave();
            event.preventDefault();
        }
    }

    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            this.props.onRequestCloseFile();
            downloadProjectCallback();
            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
    }

    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (<FormattedMessage
                defaultMessage="Restore Sprite"
                description="Menu bar item for restoring the last deleted sprite."
                id="gui.menuBar.restoreSprite"
            />);
        case 'Sound':
            return (<FormattedMessage
                defaultMessage="Restore Sound"
                description="Menu bar item for restoring the last deleted sound."
                id="gui.menuBar.restoreSound"
            />);
        case 'Costume':
            return (<FormattedMessage
                defaultMessage="Restore Costume"
                description="Menu bar item for restoring the last deleted costume."
                id="gui.menuBar.restoreCostume"
            />);
        default: {
            return (<FormattedMessage
                defaultMessage="Restore"
                description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
                id="gui.menuBar.restore"
            />);
        }
        }
    }

    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) {
            // hide the button
            return null;
        }
        if (typeof onClickAbout === 'function') {
            // make a button which calls a function
            return <AboutButton onClick={onClickAbout} />;
        }
        // assume it's an array of objects
        // each item must have a 'title' FormattedMessage and a 'handleClick' function
        // generate a menu with items for each object in the array
        return (
            <div
                className={classNames(styles.menuBarItem, styles.hoverable, {
                    [styles.active]: this.props.aboutMenuOpen
                })}
                onMouseDown={(e) => {
                    if (this.props.aboutMenuOpen) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.menuClosingFlags.about = true;
                        this.props.onRequestCloseAbout();
                        setTimeout(() => { this.menuClosingFlags.about = false; }, 100);
                    }
                }}
                onClick={(e) => {
                    if (this.menuClosingFlags.about) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    if (!this.props.aboutMenuOpen) {
                        this.props.onRequestOpenAbout();
                    }
                }}
            >
                <img
                    className={styles.aboutIcon}
                    src={aboutIcon}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                    onRequestClose={this.props.onRequestCloseAbout}
                >
                    {
                        onClickAbout.map(itemProps => (
                            <MenuItem
                                key={itemProps.title}
                                isRtl={this.props.isRtl}
                                onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                            >
                                {itemProps.title}
                            </MenuItem>
                        ))
                    }
                </MenuBarMenu>
            </div>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
    }

    startConnectionChecking() {
        // Clear any existing interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        // Set connection status to checking
        this.setState({ connectionStatus: 'connecting' });
        
        // Check connection immediately
        this.checkConnection();
        
        // Then check every 30 seconds
        this.pingInterval = setInterval(() => {
            this.checkConnection();
        }, 30000); // 30 seconds
    }

    /**
     * Check connection to the backend
     */
    checkConnection() {
        // Simple ping endpoint to check if backend is up
        fetch('/backend/api/status', { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        })
        .then(response => {
            if (response.ok) {
                this.handleConnectionStatusChange('connected');
            } else {
                this.handleConnectionStatusChange('disconnected');
            }
        })
        .catch(() => {
            this.handleConnectionStatusChange('disconnected');
        });
    }

    /**
     * Handle save status updates
     * @param {Event} event - Custom event with save status details
     */
    handleSaveStatusUpdate(event) {
        if (event.type === 'projectSaveStarted') {
            this.setState({
                isSaving: true,
                saveError: false
            });
        } else if (event.type === 'projectSaved') {
            this.setState({
                isSaving: false,
                lastSaveTime: new Date(),
                saveError: false
            });
        } else if (event.type === 'projectSaveError') {
            this.setState({
                isSaving: false,
                saveError: true
            });
        } else if (event.type === 'newProjectLoaded') {
            this.setState({
                isSaving: false,
                lastSaveTime: null
            });
        }
    }
    /**
     * Handle connection status changes
     * @param {string} status - New connection status
     */
    handleConnectionStatusChange(status) {
        this.setState({ connectionStatus: status });
    }
    
    render () {
        // Only log when props actually change to reduce console spam
        /*
        if (this.shouldLogProps(this.props)) {
            console.log("[MenuBar] Props changed:", {
                canSave: this.props.canSave,
                canManageFiles: this.props.canManageFiles,
                fileMenuOpen: this.props.fileMenuOpen,
                isShowingProject: this.props.isShowingProject
            });
        }*/
        
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconSrc={remixIcon}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );
        // Show the About button only if we have a handler for it (like in the desktop app)
        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);

        const menuOpts = this.props.accountMenuOptions;

        return (
            <UserContext.Consumer>
                {userContext => {
                    const isLoggedIn = userContext.isLoggedIn;
                    const currentUser = userContext.currentUser;
                    const isTeacher = userContext.isTeacher;
                    const isAdmin = userContext.isAdmin;
                    
                    return (
                        <Box
                            className={classNames(
                                this.props.className,
                                styles.menuBar
                            )}
                            aria-label={this.props.ariaLabel}
                            role={this.props.ariaRole}
                        >
                            <div className={styles.mainMenu}>
                                <div className={styles.fileGroup}>
                                    <div className={classNames(styles.menuBarItem)}>
                                        <img
                                            id="logo_img"
                                            alt="Scratch"
                                            className={classNames(styles.scratchLogo, {
                                                [styles.clickable]: typeof this.props.onClickLogo !== 'undefined'
                                            })}
                                            draggable={false}
                                            src={getScratchLogo(this.props.platform)}
                                            onClick={this.props.onClickLogo}
                                        />
                                    </div>
                                    {(this.props.canChangeTheme || this.props.canChangeLanguage || this.props.canChangeTheme) && 
                                    (<SettingsMenu
                                        canChangeLanguage={this.props.canChangeLanguage}
                                        canChangeColorMode={this.props.canChangeColorMode}
                                        canChangeTheme={this.props.canChangeTheme}
                                        hasActiveMembership={this.props.hasActiveMembership}
                                        isRtl={this.props.isRtl}
                                        onMouseDown={(e) => {
                                            if (this.props.settingsMenuOpen) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                this.menuClosingFlags.settings = true;
                                                this.props.onRequestCloseSettings();
                                                setTimeout(() => { this.menuClosingFlags.settings = false; }, 100);
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (this.menuClosingFlags.settings) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                return;
                                            }
                                            if (!this.props.settingsMenuOpen) {
                                                this.props.onClickSettings();
                                            }
                                        }}
                                        onRequestClose={this.props.onRequestCloseSettings}
                                        onRequestOpen={this.props.onClickSettings}
                                        settingsMenuOpen={this.props.settingsMenuOpen}
                                    />)}
                                    {(this.props.canManageFiles) && (
                                        <div
                                            className={classNames(styles.menuBarItem, styles.hoverable, {
                                                [styles.active]: this.props.fileMenuOpen
                                            })}
                                        >
                                            <div
                                                className={styles.menuTrigger}
                                                onMouseDown={(e) => {
                                                    if (this.props.fileMenuOpen) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        this.menuClosingFlags.file = true;
                                                        this.props.onRequestCloseFile();
                                                        setTimeout(() => { this.menuClosingFlags.file = false; }, 100);
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (this.menuClosingFlags.file) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        return;
                                                    }
                                                    if (!this.props.fileMenuOpen) {
                                                        this.props.onClickFile();
                                                    }
                                                }}
                                            >
                                                <img src={fileIcon} />
                                                <span className={styles.collapsibleLabel}>
                                                    <FormattedMessage
                                                        defaultMessage="File"
                                                        description="Text for file dropdown menu"
                                                        id="gui.menuBar.file"
                                                    />
                                                </span>
                                                <img src={dropdownCaret} />
                                            </div>
                                            <MenuBarMenu
                                                className={classNames(styles.menuBarMenu)}
                                                open={this.props.fileMenuOpen}
                                                place={this.props.isRtl ? 'left' : 'right'}
                                                onRequestClose={this.props.onRequestCloseFile}
                                            >
                                                <MenuSection>
                                                    <MenuItem
                                                        isRtl={this.props.isRtl}
                                                        onClick={this.handleClickNew}
                                                    >
                                                        {newProjectMessage}
                                                    </MenuItem>
                                                </MenuSection>
                                                
                                                {isLoggedIn && (
                                                    <MenuSection>
                                                            <MenuItem onClick={this.handleSaveAs}>
                                                                Kopie erstellen
                                                            </MenuItem>

                                                            <MenuItem onClick={this.handleClickSave}>
                                                                Projekt speichern
                                                            </MenuItem>
                                                        {this.state.saveStatus === 'saving' && (
                                                            <MenuItem disabled>
                                                                Speichere...
                                                            </MenuItem>
                                                        )}
                                                        {this.state.saveStatus === 'error' && (
                                                            <MenuItem className={styles.errorText}>
                                                                Fehler beim Speichern
                                                            </MenuItem>
                                                        )}
                                                    </MenuSection>
                                                )}
                                                
                                                <MenuSection>
                                                    <MenuItem
                                                        onClick={this.props.onStartSelectingFileUpload}
                                                    >
                                                        {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                                                    </MenuItem>
                                                    <SB3Downloader>{(className, downloadProjectCallback) => (
                                                        <MenuItem
                                                            className={className}
                                                            onClick={this.getSaveToComputerHandler(downloadProjectCallback)}
                                                        >
                                                            <FormattedMessage
                                                                defaultMessage="Save to your computer"
                                                                description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
                                                                id="gui.menuBar.downloadToComputer"
                                                            />
                                                        </MenuItem>
                                                    )}</SB3Downloader>
                                                </MenuSection>
                                            </MenuBarMenu>
                                        </div>
                                    )}
                                    <div
                                        className={classNames(styles.menuBarItem, styles.hoverable, {
                                            [styles.active]: this.props.editMenuOpen
                                        })}
                                    >
                                        <div
                                            className={styles.menuTrigger}
                                            onMouseDown={(e) => {
                                                if (this.props.editMenuOpen) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    this.menuClosingFlags.edit = true;
                                                    this.props.onRequestCloseEdit();
                                                    setTimeout(() => { this.menuClosingFlags.edit = false; }, 100);
                                                }
                                            }}
                                            onClick={(e) => {
                                                if (this.menuClosingFlags.edit) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                if (!this.props.editMenuOpen) {
                                                    this.props.onClickEdit();
                                                }
                                            }}
                                        >
                                            <img src={editIcon} />
                                            <span className={styles.collapsibleLabel}>
                                                <FormattedMessage
                                                    defaultMessage="Edit"
                                                    description="Text for edit dropdown menu"
                                                    id="gui.menuBar.edit"
                                                />
                                            </span>
                                            <img src={dropdownCaret} />
                                        </div>
                                        <MenuBarMenu
                                            className={classNames(styles.menuBarMenu)}
                                            open={this.props.editMenuOpen}
                                            place={this.props.isRtl ? 'left' : 'right'}
                                            onRequestClose={this.props.onRequestCloseEdit}
                                        >
                                            <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                                                <MenuItem
                                                    className={classNames({[styles.disabled]: !restorable})}
                                                    onClick={this.handleRestoreOption(handleRestore)}
                                                >
                                                    {this.restoreOptionMessage(deletedItem)}
                                                </MenuItem>
                                            )}</DeletionRestorer>
                                            <MenuSection>
                                                <TurboMode>{(toggleTurboMode, {turboMode}) => (
                                                    <MenuItem onClick={toggleTurboMode}>
                                                        {turboMode ? (
                                                            <FormattedMessage
                                                                defaultMessage="Turn off Turbo Mode"
                                                                description="Menu bar item for turning off turbo mode"
                                                                id="gui.menuBar.turboModeOff"
                                                            />
                                                        ) : (
                                                            <FormattedMessage
                                                                defaultMessage="Turn on Turbo Mode"
                                                                description="Menu bar item for turning on turbo mode"
                                                                id="gui.menuBar.turboModeOn"
                                                            />
                                                        )}
                                                    </MenuItem>
                                                )}</TurboMode>
                                            </MenuSection>
                                        </MenuBarMenu>
    
                                    </div>
                                    {this.props.isTotallyNormal && (
                                        <div
                                            className={classNames(styles.menuBarItem, styles.hoverable, {
                                                [styles.active]: this.props.modeMenuOpen
                                            })}
                                        >
                                            <div
                                                className={styles.menuTrigger}
                                                onMouseDown={(e) => {
                                                    if (this.props.modeMenuOpen) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        this.menuClosingFlags.mode = true;
                                                        this.props.onRequestCloseMode();
                                                        setTimeout(() => { this.menuClosingFlags.mode = false; }, 100);
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (this.menuClosingFlags.mode) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        return;
                                                    }
                                                    if (!this.props.modeMenuOpen) {
                                                        this.props.onClickMode();
                                                    }
                                                }}
                                            >
                                                <div className={classNames(styles.editMenu)}>
                                                    <FormattedMessage
                                                        defaultMessage="Mode"
                                                        description="Mode menu item in the menu bar"
                                                        id="gui.menuBar.modeMenu"
                                                    />
                                                </div>
                                            </div>
                                            <MenuBarMenu
                                                className={classNames(styles.menuBarMenu)}
                                                open={this.props.modeMenuOpen}
                                                place={this.props.isRtl ? 'left' : 'right'}
                                                onRequestClose={this.props.onRequestCloseMode}
                                            >
                                                <MenuSection>
                                                    <MenuItem onClick={this.handleSetMode('NOW')}>
                                                        <span className={classNames({[styles.inactive]: !this.props.modeNow})}>
                                                            {'✓'}
                                                        </span>
                                                        {' '}
                                                        <FormattedMessage
                                                            defaultMessage="Normal mode"
                                                            description="April fools: resets editor to not have any pranks"
                                                            id="gui.menuBar.normalMode"
                                                        />
                                                    </MenuItem>
                                                    <MenuItem onClick={this.handleSetMode('2020')}>
                                                        <span className={classNames({[styles.inactive]: !this.props.mode2020})}>
                                                            {'✓'}
                                                        </span>
                                                        {' '}
                                                        <FormattedMessage
                                                            defaultMessage="Caturday mode"
                                                            description="April fools: Cat blocks mode"
                                                            id="gui.menuBar.caturdayMode"
                                                        />
                                                    </MenuItem>
                                                </MenuSection>
                                            </MenuBarMenu>
                                        </div>
                                    )}
                                </div>
                                {/* Read-only title display */}
                                <div className={classNames(styles.menuBarItem, styles.growable)}>
                                    <div className={classNames(styles.titleFieldGrowable, styles.titleFieldReadOnly)}>
                                        {this.props.projectTitle || 'Untitled Project'}
                                    </div>
                                </div>
                                <Divider className={classNames(styles.divider)} />
                                <div className={styles.fileGroup}>
                                    <div
                                        aria-label={this.props.intl.formatMessage(ariaMessages.tutorials)}
                                        className={
                                            classNames(styles.menuBarItem, styles.noOffset, styles.hoverable, 'tutorials-button')
                                        }
                                        onClick={this.props.onOpenTipLibrary}
                                    >
                                        <img
                                            className={styles.helpIcon}
                                            src={helpIcon}
                                        />
                                        <span className={styles.tutorialsLabel}>
                                            <FormattedMessage {...ariaMessages.tutorials} />
                                        </span>
                                    </div>
                                    <div
                                        aria-label={this.props.intl.formatMessage(ariaMessages.debug)}
                                        className={classNames(styles.menuBarItem, styles.noOffset, styles.hoverable)}
                                        onClick={this.props.onOpenDebugModal}
                                    >
                                        <img
                                            className={styles.helpIcon}
                                            src={debugIcon}
                                        />
                                        <span className={styles.debugLabel}>
                                            <FormattedMessage {...ariaMessages.debug} />
                                        </span>
                                    </div>
                                </div>
                            </div>
    
                            {/* Account info group with UserContext integration */}
                            <div className={styles.accountInfoGroup}>
                                <StatusBar 
                                    onClickToSave={this.handleClickSave}
                                    className={styles.statusBar}
                                    isSaving={this.state.isSaving}
                                    lastSaveTime={this.state.lastSaveTime}
                                    saveError={this.state.saveError}
                                    isNewProject={this.state.savedProjectId===null}
                                    projectChanged={userContext.projectChanged} // Use projectChanged from context
                                />
                                {isLoggedIn && currentUser ? (
                                                   // ************ user is logged in through OAuth ************
                                    <React.Fragment>
                                        {/* My Stuff button if URL is available */}
                                        <div
                                            className={classNames(
                                                styles.menuBarItem,
                                                styles.hoverable,
                                                styles.collaborationButton
                                            )}
                                            onClick={this.handleShowCollaborationModal}
                                            title="Collaborative Projects"
                                        >
                                            <img
                                                className={styles.mystuffIcon}
                                                src={mystuffIcon}
                                            />
                                        </div>
                                        {isAdmin || isTeacher ? (
                                            <div
                                                className={classNames(
                                                    styles.menuBarItem,
                                                    styles.hoverable,
                                                    styles.mystuffButton
                                                )}
                                                onClick={this.handleShowTeacherStudentsModal}
                                            >
                                                <img
                                                    src={collaborativeIcon}
                                                    className={styles.collaborativeIcon}
                                                />
                                            </div>
                                        ) : null}
    
                                        {/* Account navigation with OAuth user info */}
                                        <AccountNav
                                            className={classNames(
                                                styles.menuBarItem,
                                                styles.hoverable,
                                                {[styles.active]: this.props.accountMenuOpen}
                                            )}
    
                                            isOpen={this.props.accountMenuOpen}
                                            isRtl={this.props.isRtl}
    
                                            menuBarMenuClassName={classNames(styles.menuBarMenu)}
    
                                            onMouseDown={(e) => {
                                                if (this.props.accountMenuOpen) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    this.menuClosingFlags.account = true;
                                                    this.props.onRequestCloseAccount();
                                                    setTimeout(() => { this.menuClosingFlags.account = false; }, 100);
                                                }
                                            }}
                                            onClick={(e) => {
                                                if (this.menuClosingFlags.account) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                if (!this.props.accountMenuOpen) {
                                                    this.props.onClickAccount();
                                                }
                                            }}
                                            onClose={this.props.onRequestCloseAccount}
                                            // Use our OAuth logout function
                                            onLogOut={userContext.logout}
    
                                            // Use username from OAuth currentUser
                                            username={currentUser.username}
                                            avatarBadge={this.props.avatarBadge}
    
                                            // Pass through available menu options
                                            myStuffUrl={this.handleShowCollaborationModal}
                                            myClassesUrl={menuOpts.myClassesUrl}
                                            myClassUrl={menuOpts.myClassUrl}
                                        />
                                    </React.Fragment>
                                ) : (
                                    // ********* user not logged in, show OAuth login option ************
                                    <React.Fragment>
                                        {/* Single Sign In button for OAuth */}
                                        <div
                                            className={classNames(
                                                styles.menuBarItem,
                                                styles.hoverable
                                            )}
                                            key="oauth-login"
                                            onClick={userContext.login} // Use the OAuth login function
                                        >
                                            <FormattedMessage
                                                defaultMessage="Sign in"
                                                description="Link for signing in via OAuth"
                                                id="gui.menuBar.signIn"
                                            />
                                        </div>
                                        
                                        {/* Display login information modal when needed */}
                                        {this.props.loginMenuOpen && (
                                            <LoginModal
                                                className={classNames(styles.menuBarMenu)}
                                                isOpen={this.props.loginMenuOpen}
                                                isRtl={this.props.isRtl}
                                                onClose={this.props.onRequestCloseLogin}
                                                onLogin={userContext.login}
                                            />
                                        )}
                                    </React.Fragment>

                                )}
                                
                                {aboutButton}
                            </div>
                            
                            {/* Auto-save component with proper configuration */}
                            {isLoggedIn && this.props.canSave && (
                                <AutoSave 
                                    autoSaveEnabled={true}
                                    canSave={this.props.canSave}
                                    onSaveComplete={response => {
                                        if (response.collaborative_project && response.collaborative_project.id) {
                                            this.setState({
                                                savedProjectId: response.collaborative_project.id
                                            });
                                        } else if (response.id) {
                                            this.setState({
                                                savedProjectId: response.id
                                            });
 
                                        }
                                    }}
                                    onSaveError={error => {
                                        console.error('[MenuBar] Auto-save error:', error);
                                    }}
                                    vm={this.props.vm}
                                    projectId={this.state.savedProjectId}
                                />
                            )}
                            <SaveManager 
                                ref={this.saveManagerRef}
                                // ...other props...
                            />
                        {/* Collaboration Manager Modal */}
                        {isLoggedIn && currentUser && (
                            <CollaborationManagerModal
                                isOpen={this.state.collaborationModalVisible}
                                onClose={this.handleCloseCollaborationModal}
                                vm={this.props.vm}
                            />
                        )}
                        {isLoggedIn && currentUser && (isTeacher || isAdmin) && (
                            <TeacherStudentsModal
                                isOpen={this.state.teacherStudentsModalVisible}
                                onClose={this.handleCloseTeacherStudentsModal}
                                onOpenProject={this.handleOpenProject}
                            />
                        )}
                        </Box>
                    );
                }}
            </UserContext.Consumer>
        );
    }
}

MenuBar.propTypes = {
    aboutMenuOpen: PropTypes.bool,
    accountMenuOpen: PropTypes.bool,
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorAvatarBadge: PropTypes.number,
    autoUpdateProject: PropTypes.func,
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    editMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    hasActiveMembership: PropTypes.bool,
    intl: intlShape,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    loadingState: PropTypes.string,
    locale: PropTypes.string.isRequired,
    loginMenuOpen: PropTypes.bool,
    logo: PropTypes.string,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    onClickAccount: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickLogo: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onOpenDebugModal: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    platform: PropTypes.oneOf(Object.keys(PLATFORM)),
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    settingsMenuOpen: PropTypes.bool,
    shouldSaveBeforeTransition: PropTypes.func,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    avatarBadge: PropTypes.number,
    userOwnsProject: PropTypes.bool,
    accountMenuOptions: AccountMenuOptionsPropTypes,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.defaultProps = {
    logo: scratchLogo,
    onShare: () => {}
};

const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    const permissions = state.session && state.session.permissions;
    const sessionExists = state.session && typeof state.session.session !== 'undefined';

    return {
        aboutMenuOpen: aboutMenuOpen(state),
        accountMenuOpen: accountMenuOpen(state),
        currentLocale: state.locales.locale,
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        loadingState: loadingState,
        locale: state.locales.locale,
        loginMenuOpen: loginMenuOpen(state),
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        projectId: state.scratchGui.projectState.projectId,
        settingsMenuOpen: settingsMenuOpen(state),
        username: ownProps.username ?? (user ? user.username : null),
        avatarBadge: user ? user.membership_avatar_badge : null,
        userIsEducator: permissions && permissions.educator,
        vm: state.scratchGui.vm,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state),

        platform: state.scratchGui.platform.platform,

        userOwnsProject: ownProps.userOwnsProject ?? (
            ownProps.authorUsername && user && (ownProps.authorUsername === user.username)
        ),

        accountMenuOptions: ownProps.accountMenuOptions ?? {
            canHaveSession: sessionExists ?? false,

            canRegister: true,
            canLogin: true,
            canLogout: true,

            avatarUrl: user?.thumbnailUrl,
            myStuffUrl: '/mystuff/',
            profileUrl: user && `/users/${user.username}`,
            myClassesUrl: permissions?.educator ? '/educators/classes/' : null,
            myClassUrl: user && permissions?.student ? `/classes/${user.classroomId}/` : null,
            accountSettingsUrl: '/accounts/settings/'
        }
    };
};

const mapDispatchToProps = (dispatch, ownProps) => ({
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onOpenDebugModal: () => dispatch(openDebugModal()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickEdit: () => dispatch(openEditMenu()),
    onRequestCloseEdit: () => dispatch(closeEditMenu()),
    onClickLogin: ownProps.onClickLogin ?? (() => dispatch(openLoginMenu())),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => dispatch(requestNewProject(needSave)),
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSeeCommunity: ownProps.onSeeCommunity ?? (() => dispatch(setPlayer(true))),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);