import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import ReactModal from 'react-modal';
import { UserContext } from '../../contexts/UserContext';
import { setProjectTitle } from '../../reducers/project-title';

import styles from './teacher-modal.css';
import closeIcon from '../projects-modal/icons/icon--close.svg';
import folderIcon from '../projects-modal/icons/icon--folder.svg';
import StudentProjectsTab from './student-projects-tab.jsx';
import AssignmentsTab from './assignments-tab.jsx';

const messages = defineMessages({
    title: {
        id: 'gui.teacherStudentsModal.title',
        defaultMessage: 'Teacher Dashboard',
        description: 'Title for the teacher students modal'
    },
    studentProjectsTab: {
        id: 'gui.teacherStudentsModal.studentProjectsTab',
        defaultMessage: 'Student Projects',
        description: 'Tab label for student projects'
    },
    assignmentsTab: {
        id: 'gui.teacherStudentsModal.assignmentsTab',
        defaultMessage: 'Assignments',
        description: 'Tab label for assignments'
    },
    loadingStudents: {
        id: 'gui.teacherStudentsModal.loadingStudents',
        defaultMessage: 'Loading students...',
        description: 'Text displayed when students are being loaded'
    },
    loadingProjects: {
        id: 'gui.teacherStudentsModal.loadingProjects',
        defaultMessage: 'Loading projects...',
        description: 'Text displayed when projects are being loaded'
    },
    noStudents: {
        id: 'gui.teacherStudentsModal.noStudents',
        defaultMessage: 'You don\'t have any assigned students yet.',
        description: 'Text displayed when teacher has no assigned students'
    },
    noProjects: {
        id: 'gui.teacherStudentsModal.noProjects',
        defaultMessage: 'This student doesn\'t have any saved projects yet.',
        description: 'Text displayed when student has no saved projects'
    },
    errorStudents: {
        id: 'gui.teacherStudentsModal.errorStudents',
        defaultMessage: 'Failed to load students. Please try again.',
        description: 'Error message when students cannot be loaded'
    },
    errorProjects: {
        id: 'gui.teacherStudentsModal.errorProjects',
        defaultMessage: 'Failed to load projects. Please try again.',
        description: 'Error message when projects cannot be loaded'
    },

    lastUpdated: {
        id: 'gui.teacherStudentsModal.lastUpdated',
        defaultMessage: 'Last Updated',
        description: 'Label for when a project was last updated'
    },
    created: {
        id: 'gui.teacherStudentsModal.created',
        defaultMessage: 'Created',
        description: 'Label for when a project was created'
    },
    openProject: {
        id: 'gui.teacherStudentsModal.openProject',
        defaultMessage: 'View',
        description: 'Button to open a student project'
    },
    studentsTitle: {
        id: 'gui.teacherStudentsModal.studentsTitle',
        defaultMessage: 'Your Students',
        description: 'Title for the students section'
    },
    projectsTitle: {
        id: 'gui.teacherStudentsModal.projectsTitle',
        defaultMessage: '{name}\'s Projects',
        description: 'Title for the student projects section'
    },
    searchStudents: {
        id: 'gui.teacherStudentsModal.searchStudents',
        defaultMessage: 'Search students...',
        description: 'Placeholder for student search box'
    },
    projectCount: {
        id: 'gui.teacherStudentsModal.projectCount',
        defaultMessage: '{count} {count, plural, one {project} other {projects}}',
        description: 'Count of student projects'
    },
    deletedProjects: {
        id: 'gui.teacherStudentsModal.deletedProjects',
        defaultMessage: 'Deleted Projects',
        description: 'Tab for deleted projects'
    },
    activeProjects: {
        id: 'gui.teacherStudentsModal.activeProjects',
        defaultMessage: 'Active Projects',
        description: 'Tab for active projects'
    },
    restoreProject: {
        id: 'gui.teacherStudentsModal.restoreProject',
        defaultMessage: 'Restore',
        description: 'Button to restore deleted project'
    },
    deletePermProject: {
        id: 'gui.teacherStudentsModal.deletePermProject',
        defaultMessage: 'Delete Permanently',
        description: 'Button to permanently delete project'
    },
    confirmPermanentDelete: {
        id: 'gui.teacherStudentsModal.confirmPermanentDelete',
        defaultMessage: 'Are you sure you want to permanently delete this project? This cannot be undone!',
        description: 'Confirmation for permanent deletion'
    },
    deletedAt: {
        id: 'gui.teacherStudentsModal.deletedAt',
        defaultMessage: 'Deleted',
        description: 'Label for deletion date'
    },
    selectStudent: {
        id: 'gui.teacherStudentsModal.selectStudent',
        defaultMessage: 'Please select a student to view their projects',
        description: 'Prompt to select a student'
    },
    noDeletedProjects: {
        id: 'gui.teacherStudentsModal.noDeletedProjects',
        defaultMessage: 'No deleted projects',
        description: 'Message when there are no deleted projects'
    },
    commits: {
        id: 'gui.teacherStudentsModal.commits',
        defaultMessage: 'Commits',
        description: 'Label for commit count'
    },
    permanentDeletionTitle: {
        id: 'gui.teacherStudentsModal.permanentDeletionTitle',
        defaultMessage: 'Permanent Deletion',
        description: 'Title for permanent deletion confirmation'
    },
    cancel: {
        id: 'gui.teacherStudentsModal.cancel',
        defaultMessage: 'Cancel',
        description: 'Cancel button text'
    },
    deletePermanently: {
        id: 'gui.teacherStudentsModal.deletePermanently',
        defaultMessage: 'Delete Permanently',
        description: 'Confirm permanent deletion button text'
    },
    versions: {
        id: 'gui.teacherStudentsModal.versions',
        defaultMessage: 'Versions',
        description: 'Label for versions/commits section'
    },
    selectProject: {
        id: 'gui.teacherStudentsModal.selectProject',
        defaultMessage: 'Select a project to view details',
        description: 'Prompt to select a project'
    },
    version: {
        id: 'gui.teacherStudentsModal.version',
        defaultMessage: 'Version',
        description: 'Label for version number'
    },
    projectDetails: {
        id: 'gui.teacherStudentsModal.projectDetails',
        defaultMessage: 'Project Details',
        description: 'Title for project details section'
    },
    collaborativeProject: {
        id: 'gui.teacherStudentsModal.collaborativeProject',
        defaultMessage: 'Collaborative Project',
        description: 'Label for collaborative projects'
    },
    normalProject: {
        id: 'gui.teacherStudentsModal.normalProject',
        defaultMessage: 'Normal Project',
        description: 'Label for normal projects'
    },
    collaboratorBadge: {
        id: 'gui.teacherStudentsModal.collaboratorBadge',
        defaultMessage: 'Collaborator',
        description: 'Badge indicating student is a collaborator, not owner'
    },
    ownedBy: {
        id: 'gui.teacherStudentsModal.ownedBy',
        defaultMessage: 'Owned by {owner}',
        description: 'Label showing who owns the project'
    },
    workingCopies: {
        id: 'gui.teacherStudentsModal.workingCopies',
        defaultMessage: 'Working Copies',
        description: 'Label for working copies section'
    },
    openVersion: {
        id: 'gui.teacherStudentsModal.openVersion',
        defaultMessage: 'Open',
        description: 'Button to open a specific version'
    },
    openWorkingCopy: {
        id: 'gui.teacherStudentsModal.openWorkingCopy',
        defaultMessage: 'Open',
        description: 'Button to open a working copy'
    },
    noWorkingCopies: {
        id: 'gui.teacherStudentsModal.noWorkingCopies',
        defaultMessage: 'No working copies yet',
        description: 'Message when there are no working copies'
    },
    workingCopyExists: {
        id: 'gui.teacherStudentsModal.workingCopyExists',
        defaultMessage: 'Working copy exists',
        description: 'Indicator that a working copy exists for this version'
    },
    members: {
        id: 'gui.teacherStudentsModal.members',
        defaultMessage: 'Members',
        description: 'Label for project members section'
    },
    roleRead: {
        id: 'gui.teacherStudentsModal.roleRead',
        defaultMessage: 'Read',
        description: 'Read permission role'
    },
    roleWrite: {
        id: 'gui.teacherStudentsModal.roleWrite',
        defaultMessage: 'Write',
        description: 'Write permission role'
    },
    roleAdmin: {
        id: 'gui.teacherStudentsModal.roleAdmin',
        defaultMessage: 'Admin',
        description: 'Admin permission role'
    },
    noMembers: {
        id: 'gui.teacherStudentsModal.noMembers',
        defaultMessage: 'No other members',
        description: 'Message when project has no other members'
    },
    lastEdited: {
        id: 'gui.teacherStudentsModal.lastEdited',
        defaultMessage: 'Last edited',
        description: 'Label for last edited time of working copy'
    },
    versionActions: {
        id: 'gui.teacherStudentsModal.versionActions',
        defaultMessage: 'Version Actions',
        description: 'Title for version actions modal'
    },
    downloadVersion: {
        id: 'gui.teacherStudentsModal.downloadVersion',
        defaultMessage: 'Download Version',
        description: 'Button to download a version as sb3 file'
    },
    downloadWorkingCopy: {
        id: 'gui.teacherStudentsModal.downloadWorkingCopy',
        defaultMessage: 'Download Working Copy',
        description: 'Button to download a working copy as sb3 file'
    }
});

const TeacherStudentsModal = ({ isOpen, onClose, vm, onUpdateProjectTitle, intl }) => {
    const [activeTab, setActiveTab] = useState('assignments'); // 'projects' or 'assignments'
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [errorStudents, setErrorStudents] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const userContext = useContext(UserContext);
    const { isLoggedIn } = userContext;

    const fetchStudents = useCallback(async () => {
        if (!isLoggedIn) {
            setLoadingStudents(false);
            return;
        }
        
        setLoadingStudents(true);
        setErrorStudents(null);
        
        try {
            const response = await fetch('/backend/api/teacher/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('session_id')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            setStudents(data.students || []);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error fetching students:', err);
            setErrorStudents(err.message);
        } finally {
            setLoadingStudents(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isOpen) {
            fetchStudents();
        }
    }, [isOpen, fetchStudents]);
    
    const updateProjectMetadata = useCallback((projectId, title) => {
        if (userContext) {
            userContext.setProjectId(projectId);
            userContext.setProjectTitle(title);
            userContext.setProjectChanged(false);
        }
    }, [userContext]);

    const handleSearchChange = useCallback(e => {
        setSearchTerm(e.target.value);
    }, []);

    if (!isOpen) return null;

    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onClose}
            className={styles.teacherModalContainer}
            overlayClassName={styles.teacherModalOverlay}
            contentLabel={intl.formatMessage(messages.title)}
            appElement={document.getElementById('app')}
        >
            <div className={styles.modalHeader}>
                <div className={styles.headerTitle}>
                    <img
                        className={styles.headerIcon}
                        src={folderIcon}
                        alt="Teacher Dashboard"
                    />
                    <FormattedMessage {...messages.title} />
                </div>
                <div className={styles.mainTabs}>
                    <button
                        className={`${styles.mainTabButton} ${activeTab === 'assignments' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveTab('assignments')}
                    >
                        <FormattedMessage {...messages.assignmentsTab} />
                    </button>
                    <button
                        className={`${styles.mainTabButton} ${activeTab === 'projects' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveTab('projects')}
                    >
                        <FormattedMessage {...messages.studentProjectsTab} />
                    </button>
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
            
            <div className={styles.modalContent}>
                {activeTab === 'projects' && (
                    <StudentProjectsTab
                        students={students}
                        loadingStudents={loadingStudents}
                        errorStudents={errorStudents}
                        fetchStudents={fetchStudents}
                        searchTerm={searchTerm}
                        onSearchChange={handleSearchChange}
                        vm={vm}
                        onUpdateProjectTitle={onUpdateProjectTitle}
                        updateProjectMetadata={updateProjectMetadata}
                        messages={messages}
                        onClose={onClose}
                    />
                )}
                {activeTab === 'assignments' && (
                    <AssignmentsTab
                        vm={vm}
                        onUpdateProjectTitle={onUpdateProjectTitle}
                        onClose={onClose}
                    />
                )}
            </div>
        </ReactModal>
    );
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onUpdateProjectTitle: title => dispatch(setProjectTitle(title))
});

TeacherStudentsModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    onUpdateProjectTitle: PropTypes.func.isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func.isRequired
    }).isRequired
};

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TeacherStudentsModal));
