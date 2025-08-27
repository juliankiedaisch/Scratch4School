import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl, intlShape } from 'react-intl';
import {connect} from 'react-redux';
import ReactModal from 'react-modal';
import { UserContext } from '../../contexts/UserContext';
import * as ProjectManager from '../../lib/project-management';
import {setProjectTitle} from '../../reducers/project-title';

import styles from './teacher-modal.css';
import closeIcon from '../projects-modal/icons/icon--close.svg';
import folderIcon from '../projects-modal/icons/icon--folder.svg';
import userIcon from './icon--user.svg';

const messages = defineMessages({
    title: {
        id: 'gui.teacherStudentsModal.title',
        defaultMessage: 'Student Projects',
        description: 'Title for the teacher students modal'
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
    loadError: {
        id: 'gui.teacherStudentsModal.loadError',
        defaultMessage: 'Failed to load project. Please try again.',
        description: 'Error message when a project cannot be loaded'
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
    }
});

const TeacherStudentsModal = ({ isOpen, onClose, vm, onUpdateProjectTitle, intl }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [errorStudents, setErrorStudents] = useState(null);
    const [errorProjects, setErrorProjects] = useState(null);
    const [loadingProject, setLoadingProject] = useState(false);
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
    
    const fetchStudentProjects = useCallback(async (studentId) => {
        if (!studentId) return;
        
        setLoadingProjects(true);
        setErrorProjects(null);
        
        try {
            const response = await fetch(`/backend/api/teacher/students/${studentId}/projects`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('session_id')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            setProjects(data.projects || []);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error fetching student projects:', err);
            setErrorProjects(err.message);
        } finally {
            setLoadingProjects(false);
        }
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            fetchStudents();
        }
    }, [isOpen, fetchStudents]);
    
    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProjects(selectedStudent.id);
        } else {
            setProjects([]);
        }
    }, [selectedStudent, fetchStudentProjects]);
    
    const updateProjectMetadata = useCallback((projectId, title) => {
        if (userContext) {
            userContext.setProjectId(projectId);
            userContext.setProjectTitle(title);
            userContext.setProjectChanged(false);
        }
    }, [userContext]);

    const handleOpenProject = useCallback(async projectId => {
        try {
            //console.log('[TeacherStudentsModal] Opening project:', projectId);
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
            
            //console.log('[TeacherStudentsModal] Project loaded successfully:', metadata);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error opening project:', err);
        } finally {
            setLoadingProject(false);
        }
    }, [onClose, vm, onUpdateProjectTitle, updateProjectMetadata]);

    const handleSelectStudent = useCallback(student => {
        setSelectedStudent(student);
    }, []);

    const handleSearchChange = useCallback(e => {
        setSearchTerm(e.target.value);
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
    
    // Filter students based on search term
    const filteredStudents = searchTerm ? students.filter(student => 
        (student.username && student.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.first_name && student.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.last_name && student.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : students;

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
                        alt="Student Projects"
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
            
            <div className={styles.modalContent}>
                <div className={styles.modalLayout}>
                    {/* Left side - Student list */}
                    <div className={styles.studentsPanel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>
                                <FormattedMessage {...messages.studentsTitle} />
                            </h3>
                            <div className={styles.searchBox}>
                                <input 
                                    type="text" 
                                    placeholder={intl.formatMessage(messages.searchStudents)}
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                        
                        <div className={styles.studentsList}>
                            {loadingStudents && (
                                <div className={styles.loadingContainer}>
                                    <div className={styles.spinner} />
                                    <FormattedMessage {...messages.loadingStudents} />
                                </div>
                            )}
                            
                            {!loadingStudents && errorStudents && (
                                <div className={styles.errorContainer}>
                                    <FormattedMessage {...messages.errorStudents} />
                                    <button 
                                        className={styles.retryButton}
                                        onClick={fetchStudents}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            
                            {!loadingStudents && !errorStudents && filteredStudents.length === 0 && (
                                <div className={styles.emptyContainer}>
                                    <FormattedMessage {...messages.noStudents} />
                                </div>
                            )}
                            
                            {!loadingStudents && !errorStudents && filteredStudents.length > 0 && (
                                <div className={styles.studentItems}>
                                    {filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            className={`${styles.studentCard} ${selectedStudent && selectedStudent.id === student.id ? styles.selectedStudent : ''}`}
                                            onClick={() => handleSelectStudent(student)}
                                        >
                                            <div className={styles.studentAvatar}>
                                                {student.avatar_url ? (
                                                    <img 
                                                        src={student.avatar_url} 
                                                        alt={student.username} 
                                                        className={styles.avatarImage}
                                                    />
                                                ) : (
                                                    <img 
                                                        src={userIcon} 
                                                        alt="User" 
                                                        className={styles.avatarPlaceholder}
                                                    />
                                                )}
                                            </div>
                                            <div className={styles.studentInfo}>
                                                <div className={styles.studentName}>
                                                    {student.first_name && student.last_name
                                                        ? `${student.first_name} ${student.last_name}`
                                                        : student.username}
                                                </div>
                                                {student.first_name && student.last_name && (
                                                    <div className={styles.studentUsername}>
                                                        @{student.username}
                                                    </div>
                                                )}
                                                <div className={styles.projectCount}>
                                                    <FormattedMessage 
                                                        {...messages.projectCount} 
                                                        values={{ count: student.project_count || 0 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right side - Projects */}
                    <div className={styles.projectsPanel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>
                                {selectedStudent ? (
                                    <FormattedMessage
                                        {...messages.projectsTitle}
                                        values={{
                                            name: selectedStudent.first_name || selectedStudent.username
                                        }}
                                    />
                                ) : ' '}
                            </h3>
                        </div>
                        
                        <div className={styles.projectsContent}>
                            {!selectedStudent && (
                                <div className={styles.selectPrompt}>
                                    Please select a student to view their projects
                                </div>
                            )}
                            
                            {selectedStudent && loadingProjects && (
                                <div className={styles.loadingContainer}>
                                    <div className={styles.spinner} />
                                    <FormattedMessage {...messages.loadingProjects} />
                                </div>
                            )}
                            
                            {selectedStudent && !loadingProjects && errorProjects && (
                                <div className={styles.errorContainer}>
                                    <FormattedMessage {...messages.errorProjects} />
                                    <button 
                                        className={styles.retryButton}
                                        onClick={() => fetchStudentProjects(selectedStudent.id)}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            
                            {selectedStudent && !loadingProjects && !errorProjects && projects.length === 0 && (
                                <div className={styles.emptyContainer}>
                                    <FormattedMessage {...messages.noProjects} />
                                </div>
                            )}
                            
                            {selectedStudent && !loadingProjects && !errorProjects && projects.length > 0 && (
                                <div className={styles.projectsGrid}>
                                    {projects.map(project => (
                                        <div 
                                            key={project.id}
                                            className={styles.projectCard}
                                        >
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
                                                    className={styles.viewButton}
                                                    onClick={() => handleOpenProject(project.id)}
                                                    disabled={loadingProject}
                                                >
                                                    <FormattedMessage {...messages.openProject} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
    intl: intlShape.isRequired
};

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TeacherStudentsModal));