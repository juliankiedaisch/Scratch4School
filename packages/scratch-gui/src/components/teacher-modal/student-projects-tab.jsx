import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import * as ProjectManager from '../../lib/project-management';

import styles from './teacher-modal.css';
import userIcon from './icon--user.svg';
import versionIcon from '../collaboration-manager-modal/icons/icon--version.svg';

const StudentProjectsTab = ({ 
    students,
    loadingStudents,
    errorStudents,
    fetchStudents,
    searchTerm,
    onSearchChange,
    vm,
    onUpdateProjectTitle,
    updateProjectMetadata,
    messages,
    onClose
}) => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [collaborationData, setCollaborationData] = useState(null);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingCollabData, setLoadingCollabData] = useState(false);
    const [errorProjects, setErrorProjects] = useState(null);
    const [loadingProject, setLoadingProject] = useState(false);
    const [projectsTab, setProjectsTab] = useState('active');
    const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);
    const [selectedVersionForActions, setSelectedVersionForActions] = useState(null);

    const fetchStudentProjects = useCallback(async (studentId) => {
        if (!studentId) return;
        
        setLoadingProjects(true);
        setErrorProjects(null);
        
        try {
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
            console.error('[StudentProjectsTab] Error fetching student projects:', err);
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
            
            fetchStudentProjects(selectedStudent.id);
            setSelectedProject(null);
            setCollaborationData(null);
        } catch (err) {
            console.error('[StudentProjectsTab] Error restoring project:', err);
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
            const data = await ProjectManager.fetchCollaborationData(project.id, selectedStudent.id);
            
            if (data.working_copies && !Array.isArray(data.working_copies)) {
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
            console.error('[StudentProjectsTab] Error fetching collaboration data:', err);
            setCollaborationData(null);
        } finally {
            setLoadingCollabData(false);
        }
    }, [selectedStudent]);

    const handleProjectSelect = useCallback((project) => {
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
            
            fetchStudentProjects(selectedStudent.id);
            setConfirmPermanentDelete(null);
            setSelectedProject(null);
            setCollaborationData(null);
        } catch (err) {
            console.error('[StudentProjectsTab] Error permanently deleting project:', err);
            setErrorProjects(err.message);
        }
    }, [selectedStudent, fetchStudentProjects]);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentProjects(selectedStudent.id);
            setSelectedProject(null);
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

    const handleOpenProject = useCallback(async projectId => {
        try {
            setLoadingProject(true);
            onClose();
            
            if (!vm) {
                throw new Error('VM is not available');
            }
            
            await ProjectManager.loadProject(projectId, vm, {
                onUpdateMetadata: updateProjectMetadata,
                onUpdateTitle: onUpdateProjectTitle
            });
        } catch (err) {
            console.error('[StudentProjectsTab] Error opening project:', err);
        } finally {
            setLoadingProject(false);
        }
    }, [onClose, vm, onUpdateProjectTitle, updateProjectMetadata]);

    const handleDownloadProject = useCallback(async (projectId, projectTitle, commitNumber) => {
        try {
            const sb3Data = await ProjectManager.downloadProjectSB3(projectId);
            const blob = new Blob([sb3Data], { type: 'application/x.scratch.sb3' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = commitNumber 
                ? `${projectTitle || 'project'}_v${commitNumber}.sb3`
                : `${projectTitle || 'project'}.sb3`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('[StudentProjectsTab] Error downloading project:', err);
        }
    }, []);

    const handleSelectStudent = useCallback(student => {
        setSelectedStudent(student);
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

    const filteredStudents = searchTerm ? students.filter(student => 
        (student.username && student.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.first_name && student.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.last_name && student.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : students;

    return (
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
                            placeholder={messages.searchStudents.defaultMessage}
                            value={searchTerm}
                            onChange={onSearchChange}
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
            
            {/* Right side - Projects Area */}
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
                                    ) : null}
                                    
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
                                    
                                    {/* Members Section */}
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
                                    
                                    {/* Versions Section */}
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
                                                    const workingCopy = collaborationData.working_copies?.[commit.project_id];
                                                    return (
                                                        <div 
                                                            key={commit.id} 
                                                            className={styles.versionItem}
                                                            onClick={() => setSelectedVersionForActions({ commit, workingCopy })}
                                                            style={{ cursor: 'pointer' }}
                                                        >
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
            
            {selectedVersionForActions && (
                <div className={styles.confirmOverlay} onClick={() => setSelectedVersionForActions(null)}>
                    <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                        <h3>
                            <FormattedMessage {...messages.versionActions} />
                        </h3>
                        <p>
                            Version #{selectedVersionForActions.commit.commit_number}: {selectedVersionForActions.commit.commit_message || 'No message'}
                        </p>
                        <div className={styles.versionActionsModal}>
                            <button 
                                className={styles.modalActionButton}
                                onClick={() => {
                                    handleOpenProject(selectedVersionForActions.commit.project_id);
                                    setSelectedVersionForActions(null);
                                }}
                                disabled={loadingProject}
                            >
                                📂 <FormattedMessage {...messages.openVersion} />
                            </button>
                            
                            {selectedVersionForActions.workingCopy && (
                                <button 
                                    className={styles.modalActionButton}
                                    onClick={() => {
                                        handleOpenProject(selectedVersionForActions.workingCopy.project_id);
                                        setSelectedVersionForActions(null);
                                    }}
                                    disabled={loadingProject}
                                >
                                    📝 <FormattedMessage {...messages.openWorkingCopy} />
                                </button>
                            )}
                            
                            <button 
                                className={styles.modalActionButton}
                                onClick={() => {
                                    handleDownloadProject(
                                        selectedVersionForActions.commit.project_id,
                                        selectedProject?.title || selectedProject?.name,
                                        selectedVersionForActions.commit.commit_number
                                    );
                                    setSelectedVersionForActions(null);
                                }}
                            >
                                ⬇️ <FormattedMessage {...messages.downloadVersion} />
                            </button>
                            
                            {selectedVersionForActions.workingCopy && (
                                <button 
                                    className={styles.modalActionButton}
                                    onClick={() => {
                                        handleDownloadProject(
                                            selectedVersionForActions.workingCopy.project_id,
                                            selectedProject?.title || selectedProject?.name,
                                            `${selectedVersionForActions.commit.commit_number}_working`
                                        );
                                        setSelectedVersionForActions(null);
                                    }}
                                >
                                    ⬇️ <FormattedMessage {...messages.downloadWorkingCopy} />
                                </button>
                            )}
                            
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setSelectedVersionForActions(null)}
                            >
                                <FormattedMessage {...messages.cancel} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

StudentProjectsTab.propTypes = {
    students: PropTypes.array.isRequired,
    loadingStudents: PropTypes.bool.isRequired,
    errorStudents: PropTypes.string,
    fetchStudents: PropTypes.func.isRequired,
    searchTerm: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    onUpdateProjectTitle: PropTypes.func.isRequired,
    updateProjectMetadata: PropTypes.func.isRequired,
    messages: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired
};

export default StudentProjectsTab;
