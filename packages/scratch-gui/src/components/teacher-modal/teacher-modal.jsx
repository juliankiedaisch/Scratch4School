import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import ReactModal from 'react-modal';
import { UserContext } from '../../contexts/UserContext';
import * as ProjectManager from '../../lib/project-management';
import { setProjectTitle } from '../../reducers/project-title';

import styles from './teacher-modal.css';
import closeIcon from '../projects-modal/icons/icon--close.svg';
import folderIcon from '../projects-modal/icons/icon--folder.svg';
import userIcon from './icon--user.svg';
import versionIcon from '../collaboration-manager-modal/icons/icon--version.svg';

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
    }
});

const TeacherStudentsModal = ({ isOpen, onClose, vm, onUpdateProjectTitle, intl }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [collaborationData, setCollaborationData] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingCollabData, setLoadingCollabData] = useState(false);
    const [errorStudents, setErrorStudents] = useState(null);
    const [errorProjects, setErrorProjects] = useState(null);
    const [loadingProject, setLoadingProject] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectsTab, setProjectsTab] = useState('active'); // 'active' or 'deleted'
    const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);
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
            // ✅ Always fetch all projects (including deleted)
            const response = await fetch(
                `/backend/api/teacher/students/${studentId}/projects?include_deleted=true`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('session_id')}`
                    }
                }
            );
            
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

    const handleRestoreProject = useCallback(async (projectId, projectType) => {
        if (!selectedStudent) return;
        
        try {
            const response = await fetch(
                `/backend/api/teacher/students/${selectedStudent.id}/projects/${projectId}/restore`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        project_type: projectType
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to restore project');
            }
            
            // Refresh projects
            fetchStudentProjects(selectedStudent.id);
            // Reset content window
            setSelectedProject(null);
            setCollaborationData(null);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error restoring project:', err);
            setErrorProjects(err.message);
        }
    }, [selectedStudent, fetchStudentProjects]);

    const fetchCollaborationData = useCallback(async (project) => {
        if (!project || project.project_type !== 'collaborative') {
            setCollaborationData(null);
            return;
        }
        
        if (!selectedStudent) {
            setCollaborationData(null);
            return;
        }
        
        setLoadingCollabData(true);
        
        try {
            // ✅ Pass student ID to get their working copies
            const data = await ProjectManager.fetchCollaborationData(project.id, selectedStudent.id);
            
            console.log('[TeacherStudentsModal] Collaboration data:', data);

            
            // Transform working_copies from object to dict indexed by commit_id for easy lookup
            if (data.working_copies && !Array.isArray(data.working_copies)) {
                // Keep it as an object for easy lookup by commit_id
                // Just ensure each working copy has the commit_id stored
                const wcDict = {};
                for (const [commitId, wc] of Object.entries(data.working_copies)) {
                    wcDict[commitId] = {
                        ...wc,
                        commit_id: commitId
                    };
                }
                data.working_copies = wcDict;
            }
            
            setCollaborationData(data);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error fetching collaboration data:', err);
            setCollaborationData(null);
        } finally {
            setLoadingCollabData(false);
        }
    }, [selectedStudent]);

    const handleProjectSelect = useCallback((project) => {
        console.log('[TeacherStudentsModal] Selected project:', project);
        setSelectedProject(project);
    }, []);

    const handlePermanentDelete = useCallback(async (projectId, projectType) => {
        if (!selectedStudent) return;
        
        try {
            const response = await fetch(
                `/backend/api/teacher/students/${selectedStudent.id}/projects/${projectId}/permanent`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('session_id')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        project_type: projectType
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to permanently delete project');
            }
            
            // Refresh projects
            fetchStudentProjects(selectedStudent.id);
            setConfirmPermanentDelete(null);
            // Reset content window
            setSelectedProject(null);
            setCollaborationData(null);
        } catch (err) {
            console.error('[TeacherStudentsModal] Error permanently deleting project:', err);
            setErrorProjects(err.message);
        }
    }, [selectedStudent, fetchStudentProjects]);



    useEffect(() => {
        if (isOpen) {
            fetchStudents();
        }
    }, [isOpen, fetchStudents]);
    
    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProjects(selectedStudent.id);
            setSelectedProject(null); // Reset selected project when student changes
        } else {
            setProjects([]);
            setSelectedProject(null);
        }
    }, [selectedStudent, fetchStudentProjects]);
    
    useEffect(() => {
        if (selectedProject) {
            fetchCollaborationData(selectedProject);
        } else {
            setCollaborationData(null);
        }
    }, [selectedProject, fetchCollaborationData]);
    
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

    const filteredProjects = projects.filter(p => {
        if (projectsTab === 'active') {
            return !p.is_deleted;
        } else {
            return p.is_deleted;
        }
    });

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
                    
                    {/* Right side - Projects Area (Split into Projects List and Detail View) */}
                    <div className={styles.projectsPanel}>
                        {!selectedStudent && (
                            <div className={styles.selectPrompt}>
                                <FormattedMessage {...messages.selectStudent} />
                            </div>
                        )}
                        
                        {selectedStudent && (
                            <div className={styles.projectsLayout}>
                                {/* Projects List (Left) */}
                                <div className={styles.projectsList}>
                                    <div className={styles.projectsListHeader}>
                                        <h3 className={styles.panelTitle}>
                                            <FormattedMessage
                                                {...messages.projectsTitle}
                                                values={{
                                                    name: selectedStudent.first_name || selectedStudent.username
                                                }}
                                            />
                                        </h3>
                                        <div className={styles.projectsTabs}>
                                            <button
                                                className={`${styles.tabButton} ${projectsTab === 'active' ? styles.activeTab : ''}`}
                                                onClick={() => setProjectsTab('active')}
                                            >
                                                <FormattedMessage {...messages.activeProjects} />
                                                {' '}({projects.filter(p => !p.is_deleted).length})
                                            </button>
                                            <button
                                                className={`${styles.tabButton} ${projectsTab === 'deleted' ? styles.activeTab : ''}`}
                                                onClick={() => setProjectsTab('deleted')}
                                            >
                                                <FormattedMessage {...messages.deletedProjects} />
                                                {' '}({projects.filter(p => p.is_deleted).length})
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.projectsListContent}>
                                        {loadingProjects && (
                                            <div className={styles.loadingContainer}>
                                                <div className={styles.spinner} />
                                                <FormattedMessage {...messages.loadingProjects} />
                                            </div>
                                        )}
                                        
                                        {!loadingProjects && errorProjects && (
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
                                        
                                        {!loadingProjects && !errorProjects && filteredProjects.length === 0 && (
                                            <div className={styles.emptyContainer}>
                                                {projectsTab === 'active' ? (
                                                    <FormattedMessage {...messages.noProjects} />
                                                ) : (
                                                    <FormattedMessage {...messages.noDeletedProjects} />
                                                )}
                                            </div>
                                        )}
                                        
                                        {!loadingProjects && !errorProjects && filteredProjects.map(project => (
                                            <div
                                                key={project.id}
                                                className={`${styles.projectItem} ${
                                                    selectedProject?.id === project.id ? styles.selectedProjectItem : ''
                                                } ${project.is_deleted ? styles.deletedProjectItem : ''}`}
                                                onClick={() => handleProjectSelect(project)}
                                            >
                                                <div className={styles.projectItemThumbnail}>
                                                    <img 
                                                        src={project.thumbnail_url || '/static/images/default-project.png'}
                                                        alt={project.title || project.name || 'Project'}
                                                        onError={(e) => {
                                                            e.target.src = '/static/default-thumbnail.png';
                                                            e.target.onerror = null;
                                                        }}
                                                    />
                                                </div>
                                                
                                                <div className={styles.projectItemContent}>
                                                    <div className={styles.projectItemTitle}>
                                                        {project.title || project.name || 'Untitled Project'}
                                                        {project.is_collaborator && (
                                                            <span className={styles.collaboratorIndicator} title={project.owner_username ? `Owned by ${project.owner_username}` : 'Collaborator'}>
                                                                🤝
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className={styles.projectItemMeta}>
                                                        {project.is_collaborator && project.owner_username && (
                                                            <span className={styles.ownerBadge}>
                                                                <FormattedMessage 
                                                                    {...messages.ownedBy}
                                                                    values={{ owner: project.owner_username }}
                                                                />
                                                            </span>
                                                        )}
                                                        {project.project_type === 'collaborative' && project.write_admin_count > 1 && (
                                                            <span className={styles.projectBadge}>
                                                                👥 <FormattedMessage {...messages.collaborativeProject} />
                                                            </span>
                                                        )}
                                                        {project.is_deleted && (
                                                            <span className={styles.deletedBadge}>
                                                                🗑️ Deleted
                                                            </span>
                                                        )}
                                                        {!project.is_deleted && project.project_type === 'collaborative' && (
                                                            <span className={styles.commitBadge}>
                                                                {project.commit_count || 0} {project.commit_count === 1 ? 'version' : 'versions'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Project Detail View (Right) */}
                                <div className={styles.projectDetailPanel}>
                                    {!selectedProject && (
                                        <div className={styles.selectPrompt}>
                                            <FormattedMessage {...messages.selectProject} />
                                        </div>
                                    )}
                                    
                                    {selectedProject && (
                                        <div className={styles.projectDetailContent}>
                                            {/* Project Header */}
                                            <div className={styles.projectDetailHeader}>
                                                <div className={styles.projectThumbnailLarge}>
                                                    <img 
                                                        src={selectedProject.thumbnail_url || '/static/images/default-project.png'}
                                                        alt={selectedProject.title || selectedProject.name || 'Project'}
                                                        onError={(e) => {
                                                            e.target.src = '/static/default-thumbnail.png';
                                                            e.target.onerror = null;
                                                        }}
                                                    />
                                                </div>
                                                <div className={styles.projectDetailHeaderInfo}>
                                                    <h2 className={styles.projectDetailTitle}>
                                                        {selectedProject.title || selectedProject.name || 'Untitled Project'}
                                                        {selectedProject.is_collaborator && (
                                                            <span className={styles.collaboratorBadge}>
                                                                🤝 <FormattedMessage {...messages.collaboratorBadge} />
                                                            </span>
                                                        )}
                                                    </h2>
                                                    <div className={styles.projectDetailMeta}>
                                                        {selectedProject.is_collaborator && selectedProject.owner_username && (
                                                            <span className={styles.ownerInfo}>
                                                                <FormattedMessage 
                                                                    {...messages.ownedBy}
                                                                    values={{ owner: selectedProject.owner_username }}
                                                                />
                                                            </span>
                                                        )}
                                                        {selectedProject.project_type === 'collaborative' && selectedProject.write_admin_count > 1 && (
                                                            <span className={styles.metaBadge}>
                                                                <FormattedMessage {...messages.collaborativeProject} />
                                                            </span>
                                                        )}
                                                        {selectedProject.is_deleted && (
                                                            <span className={styles.deletedBadge}>
                                                                🗑️ Deleted on {formatDate(selectedProject.deleted_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            

                                                {selectedProject.is_deleted ? (
                                                    <>
                                                    {/* Project Actions */}
                                                    <div className={styles.projectDetailActions}>
                                                        <button 
                                                            className={styles.restoreButton}
                                                            onClick={() => handleRestoreProject(selectedProject.id, selectedProject.project_type)}
                                                        >
                                                            ↩️ <FormattedMessage {...messages.restoreProject} />
                                                        </button>
                                                        <button 
                                                            className={styles.permanentDeleteButton}
                                                            onClick={() => setConfirmPermanentDelete({ 
                                                                id: selectedProject.id, 
                                                                type: selectedProject.project_type 
                                                            })}
                                                        >
                                                            🗑️ <FormattedMessage {...messages.deletePermProject} />
                                                        </button>
                                                    </div>
                                                    </>
                                                ) : (null)}
                                            
                                            
                                            {/* Project Info Section */}
                                            <div className={styles.projectInfoSection}>
                                                <div className={styles.infoRow}>
                                                    <span className={styles.infoLabel}>
                                                        <FormattedMessage {...messages.created} />:
                                                    </span>
                                                    <span className={styles.infoValue}>
                                                        {formatDate(selectedProject.created_at)} {formatTime(selectedProject.created_at)}
                                                    </span>
                                                </div>
                                                <div className={styles.infoRow}>
                                                    <span className={styles.infoLabel}>
                                                        <FormattedMessage {...messages.lastUpdated} />:
                                                    </span>
                                                    <span className={styles.infoValue}>
                                                        {formatDate(selectedProject.updated_at)} {formatTime(selectedProject.updated_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Members Section (only for collaborative projects) */}
                                            {selectedProject.project_type === 'collaborative' && !selectedProject.is_deleted && (
                                                <div className={styles.membersSection}>
                                                    <div className={styles.sectionHeader}>
                                                        <div className={styles.sectionTitle}>
                                                            <img src={userIcon} alt="Members" className={styles.sectionIcon} />
                                                            <FormattedMessage {...messages.members} />
                                                            <span className={styles.badge}>
                                                                {collaborationData?.collaborators?.length || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={styles.membersList}>
                                                        {loadingCollabData && (
                                                            <div className={styles.loadingContainer}>
                                                                <div className={styles.spinner} />
                                                            </div>
                                                        )}
                                                        
                                                        {!loadingCollabData && collaborationData?.collaborators?.map(collab => (
                                                            <div key={collab.user.id} className={styles.memberItem}>
                                                                <div className={styles.memberInfo}>
                                                                    <span className={styles.memberName}>
                                                                        {collab.user.username}
                                                                    </span>
                                                                    <span className={styles.memberRole}>
                                                                        {collab.permission === 'read' && <FormattedMessage {...messages.roleRead} />}
                                                                        {collab.permission === 'write' && <FormattedMessage {...messages.roleWrite} />}
                                                                        {collab.permission === 'admin' && <FormattedMessage {...messages.roleAdmin} />}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        
                                                        {!loadingCollabData && (!collaborationData?.collaborators || collaborationData.collaborators.length === 0) && (
                                                            <div className={styles.emptyMessage}>
                                                                <FormattedMessage {...messages.noMembers} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Versions/Commits Section (only for collaborative projects) */}
                                            {selectedProject.project_type === 'collaborative' && !selectedProject.is_deleted && (
                                                <div className={styles.versionsSection}>
                                                    <div className={styles.sectionHeader}>
                                                        <div className={styles.sectionTitle}>
                                                            <img src={versionIcon} alt="Versions" className={styles.sectionIcon} />
                                                            <FormattedMessage {...messages.versions} />
                                                            <span className={styles.badge}>
                                                                {collaborationData?.commits?.length || 0}
                                                            </span>
                                                            {collaborationData?.working_copies && Object.keys(collaborationData.working_copies).length > 0 && (
                                                                <span className={styles.workingCopyBadge}>
                                                                    📝 {Object.keys(collaborationData.working_copies).length} <FormattedMessage {...messages.workingCopies} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={styles.versionsList}>
                                                        {loadingCollabData && (
                                                            <div className={styles.loadingContainer}>
                                                                <div className={styles.spinner} />
                                                            </div>
                                                        )}
                                                        
                                                        {!loadingCollabData && collaborationData?.commits?.map(commit => {
                                                            // ✅ Look up working copy by commit.project_id (the project representing this commit)
                                                            // based_on_commit_id in WorkingCopy references the commit's project_id
                                                            const workingCopy = collaborationData.working_copies?.[commit.project_id];
                                                            return (
                                                                <div key={commit.id} className={styles.versionItem}>
                                                                    <div className={styles.versionThumbnail}>
                                                                        <img 
                                                                            src={commit.thumbnail_url || '/static/images/default-project.png'}
                                                                            alt={`Version ${commit.commit_number}`}
                                                                            onError={(e) => {
                                                                                e.target.src = '/static/default-thumbnail.png';
                                                                                e.target.onerror = null;
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className={styles.versionContent}>
                                                                        <div className={styles.versionTitle}>
                                                                            ✓ #{commit.commit_number}: {commit.commit_message || 'No message'}
                                                                        </div>
                                                                        <div className={styles.versionMeta}>
                                                                            {commit.committed_by} • {formatDate(commit.committed_at)} {formatTime(commit.committed_at)}
                                                                        </div>
                                                                        {workingCopy && (
                                                                            <div className={styles.workingCopyInfo}>
                                                                                📝 <FormattedMessage {...messages.workingCopyExists} /> • <FormattedMessage {...messages.lastEdited} />: {formatDate(workingCopy.updated_at)} {formatTime(workingCopy.updated_at)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className={styles.versionActions}>
                                                                        <button 
                                                                            className={styles.openVersionButton}
                                                                            onClick={() => handleOpenProject(commit.project_id)}
                                                                            disabled={loadingProject}
                                                                            title="Open this version"
                                                                        >
                                                                            <FormattedMessage {...messages.openVersion} />
                                                                        </button>
                                                                        {workingCopy && (
                                                                            <button 
                                                                                className={styles.openWorkingCopyButton}
                                                                                onClick={() => handleOpenProject(workingCopy.project_id)}
                                                                                disabled={loadingProject}
                                                                                title="Open working copy based on this version"
                                                                            >
                                                                                📝 <FormattedMessage {...messages.openWorkingCopy} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        
                                                        {!loadingCollabData && (!collaborationData?.commits || collaborationData.commits.length === 0) && (
                                                            <div className={styles.emptyMessage}>
                                                                No versions yet
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {confirmPermanentDelete && (
                <div className={styles.confirmOverlay}>
                    <div className={styles.confirmDialog}>
                        <h3>
                            ⚠️ <FormattedMessage {...messages.permanentDeletionTitle} />
                        </h3>
                        <p><FormattedMessage {...messages.confirmPermanentDelete} /></p>
                        <div className={styles.confirmActions}>
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setConfirmPermanentDelete(null)}
                            >
                                <FormattedMessage {...messages.cancel} />
                            </button>
                            <button 
                                className={styles.confirmDeleteButton}
                                onClick={() => handlePermanentDelete(confirmPermanentDelete.id, confirmPermanentDelete.type)}
                            >
                                <FormattedMessage {...messages.deletePermanently} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
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