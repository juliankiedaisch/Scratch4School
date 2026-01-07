import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, defineMessages, injectIntl } from 'react-intl';
import assignmentService from '../../lib/assignment-service';
import * as ProjectManager from '../../lib/project-management';
import { UserContext } from '../../contexts/UserContext';
import { AddUserModal as AssignUserModal, AddGroupModal as AssignGroupModal } from '../shared-modals';

import styles from './teacher-modal.css';

const messages = defineMessages({
    assignmentsTitle: {
        id: 'gui.teacherModal.assignmentsTitle',
        defaultMessage: 'Assignments',
        description: 'Title for assignments list'
    },
    createAssignment: {
        id: 'gui.teacherModal.createAssignment',
        defaultMessage: 'Create New Assignment',
        description: 'Button to create new assignment'
    },
    editAssignment: {
        id: 'gui.teacherModal.editAssignment',
        defaultMessage: 'Edit',
        description: 'Button to edit assignment'
    },
    assignmentName: {
        id: 'gui.teacherModal.assignmentName',
        defaultMessage: 'Assignment Name',
        description: 'Label for assignment name'
    },
    description: {
        id: 'gui.teacherModal.description',
        defaultMessage: 'Description',
        description: 'Label for description'
    },
    dueDate: {
        id: 'gui.teacherModal.dueDate',
        defaultMessage: 'Due Date',
        description: 'Label for due date'
    },
    dueTime: {
        id: 'gui.teacherModal.dueTime',
        defaultMessage: 'Due Time',
        description: 'Label for due time'
    },
    hour: {
        id: 'gui.teacherModal.hour',
        defaultMessage: 'Hour',
        description: 'Hour label'
    },
    minute: {
        id: 'gui.teacherModal.minute',
        defaultMessage: 'Minute',
        description: 'Minute label'
    },
    groups: {
        id: 'gui.teacherModal.groups',
        defaultMessage: 'Assign to Groups',
        description: 'Groups option'
    },
    submissions: {
        id: 'gui.teacherModal.submissions',
        defaultMessage: 'Submissions',
        description: 'Submissions label'
    },
    freeze: {
        id: 'gui.teacherModal.freeze',
        defaultMessage: 'Freeze',
        description: 'Button to freeze project'
    },
    unfreeze: {
        id: 'gui.teacherModal.unfreeze',
        defaultMessage: 'Unfreeze',
        description: 'Button to unfreeze project'
    },
    freezeAll: {
        id: 'gui.teacherModal.freezeAll',
        defaultMessage: 'Freeze All',
        description: 'Button to freeze all submissions'
    },
    unfreezeAll: {
        id: 'gui.teacherModal.unfreezeAll',
        defaultMessage: 'Unfreeze All',
        description: 'Button to unfreeze all submissions'
    },
    deleteAssignment: {
        id: 'gui.teacherModal.deleteAssignment',
        defaultMessage: 'Delete',
        description: 'Button to delete assignment'
    },
    grade: {
        id: 'gui.teacherModal.grade',
        defaultMessage: 'Grade',
        description: 'Grade label'
    },
    feedback: {
        id: 'gui.teacherModal.feedback',
        defaultMessage: 'Feedback',
        description: 'Feedback label'
    },
    submitGrade: {
        id: 'gui.teacherModal.submitGrade',
        defaultMessage: 'Save Grade',
        description: 'Button to submit grade'
    },
    noAssignments: {
        id: 'gui.teacherModal.noAssignments',
        defaultMessage: 'No assignments yet. Create one to get started.',
        description: 'Message when no assignments exist'
    },
    selectAssignment: {
        id: 'gui.teacherModal.selectAssignment',
        defaultMessage: 'Select an assignment to view details',
        description: 'Prompt to select assignment'
    },
    loading: {
        id: 'gui.teacherModal.loading',
        defaultMessage: 'Loading...',
        description: 'Loading message'
    },
    frozen: {
        id: 'gui.teacherModal.frozen',
        defaultMessage: 'Frozen',
        description: 'Frozen status'
    },
    notFrozen: {
        id: 'gui.teacherModal.notFrozen',
        defaultMessage: 'Not Frozen',
        description: 'Not frozen status'
    },
    noSubmissions: {
        id: 'gui.teacherModal.noSubmissions',
        defaultMessage: 'No submissions yet',
        description: 'No submissions message'
    },
    studentName: {
        id: 'gui.teacherModal.studentName',
        defaultMessage: 'Student',
        description: 'Student label'
    },
    projectName: {
        id: 'gui.teacherModal.projectName',
        defaultMessage: 'Project',
        description: 'Project label'
    },
    submittedAt: {
        id: 'gui.teacherModal.submittedAt',
        defaultMessage: 'Submitted',
        description: 'Submitted at label'
    },
    save: {
        id: 'gui.teacherModal.save',
        defaultMessage: 'Save',
        description: 'Save button'
    },
    cancel: {
        id: 'gui.teacherModal.cancel',
        defaultMessage: 'Cancel',
        description: 'Cancel button'
    },
    assignmentInfo: {
        id: 'gui.teacherModal.assignmentInfo',
        defaultMessage: 'Assignment Information',
        description: 'Assignment info section'
    },
    statistics: {
        id: 'gui.teacherModal.statistics',
        defaultMessage: 'Statistics',
        description: 'Statistics section'
    },
    totalAssigned: {
        id: 'gui.teacherModal.totalAssigned',
        defaultMessage: 'Total Assigned',
        description: 'Total assigned label'
    },
    totalSubmitted: {
        id: 'gui.teacherModal.totalSubmitted',
        defaultMessage: 'Submitted',
        description: 'Total submitted label'
    },
    totalGraded: {
        id: 'gui.teacherModal.totalGraded',
        defaultMessage: 'Graded',
        description: 'Total graded label'
    },
    editGrade: {
        id: 'gui.teacherModal.editGrade',
        defaultMessage: 'Edit',
        description: 'Edit grade button'
    },
    created: {
        id: 'gui.teacherModal.created',
        defaultMessage: 'Created',
        description: 'Created label'
    },
    due: {
        id: 'gui.teacherModal.due',
        defaultMessage: 'Due',
        description: 'Due date label'
    },
    organizers: {
        id: 'gui.teacherModal.organizers',
        defaultMessage: 'Organizers',
        description: 'Organizers section title'
    },
    addOrganizer: {
        id: 'gui.teacherModal.addOrganizer',
        defaultMessage: 'Add Organizer',
        description: 'Button to add organizer'
    },
    assignees: {
        id: 'gui.teacherModal.assignees',
        defaultMessage: 'Assigned To',
        description: 'Assignees section title'
    },
    assignUser: {
        id: 'gui.teacherModal.assignUser',
        defaultMessage: 'Assign User',
        description: 'Button to assign user'
    },
    assignGroup: {
        id: 'gui.teacherModal.assignGroup',
        defaultMessage: 'Assign Group',
        description: 'Button to assign group'
    },
    noOrganizers: {
        id: 'gui.teacherModal.noOrganizers',
        defaultMessage: 'No additional organizers',
        description: 'Message when no organizers'
    },
    noAssignees: {
        id: 'gui.teacherModal.noAssignees',
        defaultMessage: 'No users or groups assigned yet',
        description: 'Message when no assignees'
    },
    directUser: {
        id: 'gui.teacherModal.directUser',
        defaultMessage: 'Direct',
        description: 'Direct user assignment label'
    },
    viaGroup: {
        id: 'gui.teacherModal.viaGroup',
        defaultMessage: 'Via Group',
        description: 'Group assignment label'
    },
    selectUser: {
        id: 'gui.teacherModal.selectUser',
        defaultMessage: 'Select a user',
        description: 'Select user prompt'
    },
    selectGroup: {
        id: 'gui.teacherModal.selectGroup',
        defaultMessage: 'Select a group',
        description: 'Select group prompt'
    },
    selectOrganizer: {
        id: 'gui.teacherModal.selectOrganizer',
        defaultMessage: 'Select an organizer',
        description: 'Select organizer prompt'
    },
    add: {
        id: 'gui.teacherModal.add',
        defaultMessage: 'Add',
        description: 'Add button'
    },
    remove: {
        id: 'gui.teacherModal.remove',
        defaultMessage: 'Remove',
        description: 'Remove button'
    },
    close: {
        id: 'gui.teacherModal.close',
        defaultMessage: 'Close',
        description: 'Close button'
    },
    confirmDeleteAssignment: {
        id: 'gui.teacherModal.confirmDeleteAssignment',
        defaultMessage: 'Are you sure you want to delete this assignment?',
        description: 'Confirm delete assignment dialog'
    },
    confirmFreezeAll: {
        id: 'gui.teacherModal.confirmFreezeAll',
        defaultMessage: 'Freeze all submissions? Students will not be able to edit their projects.',
        description: 'Confirm freeze all dialog'
    },
    confirmUnfreezeAll: {
        id: 'gui.teacherModal.confirmUnfreezeAll',
        defaultMessage: 'Unfreeze all submissions? Students will be able to edit their projects again.',
        description: 'Confirm unfreeze all dialog'
    },
    confirmRemoveOrganizer: {
        id: 'gui.teacherModal.confirmRemoveOrganizer',
        defaultMessage: 'Remove this organizer?',
        description: 'Confirm remove organizer dialog'
    },
    confirmRemoveUser: {
        id: 'gui.teacherModal.confirmRemoveUser',
        defaultMessage: 'Remove this user from the assignment?',
        description: 'Confirm remove user dialog'
    },
    confirmRemoveGroup: {
        id: 'gui.teacherModal.confirmRemoveGroup',
        defaultMessage: 'Remove this group from the assignment?',
        description: 'Confirm remove group dialog'
    },
    errorCreateAssignment: {
        id: 'gui.teacherModal.errorCreateAssignment',
        defaultMessage: 'Failed to create assignment',
        description: 'Error creating assignment'
    },
    errorUpdateAssignment: {
        id: 'gui.teacherModal.errorUpdateAssignment',
        defaultMessage: 'Failed to update assignment',
        description: 'Error updating assignment'
    },
    errorDeleteAssignment: {
        id: 'gui.teacherModal.errorDeleteAssignment',
        defaultMessage: 'Failed to delete assignment',
        description: 'Error deleting assignment'
    },
    errorFreezeProject: {
        id: 'gui.teacherModal.errorFreezeProject',
        defaultMessage: 'Failed to freeze project',
        description: 'Error freezing project'
    },
    errorUnfreezeProject: {
        id: 'gui.teacherModal.errorUnfreezeProject',
        defaultMessage: 'Failed to unfreeze project',
        description: 'Error unfreezing project'
    },
    errorFreezeAll: {
        id: 'gui.teacherModal.errorFreezeAll',
        defaultMessage: 'Failed to freeze all',
        description: 'Error freezing all submissions'
    },
    errorUnfreezeAll: {
        id: 'gui.teacherModal.errorUnfreezeAll',
        defaultMessage: 'Failed to unfreeze all',
        description: 'Error unfreezing all submissions'
    },
    successFrozeSubmissions: {
        id: 'gui.teacherModal.successFrozeSubmissions',
        defaultMessage: 'Froze {count} submissions',
        description: 'Success message for freezing submissions'
    },
    successUnfrozeSubmissions: {
        id: 'gui.teacherModal.successUnfrozeSubmissions',
        defaultMessage: 'Unfroze {count} submissions',
        description: 'Success message for unfreezing submissions'
    },
    successGradeSubmitted: {
        id: 'gui.teacherModal.successGradeSubmitted',
        defaultMessage: 'Grade submitted successfully',
        description: 'Success message for grade submission'
    },
    errorSubmitGrade: {
        id: 'gui.teacherModal.errorSubmitGrade',
        defaultMessage: 'Failed to submit grade',
        description: 'Error submitting grade'
    },
    errorLoadOrganizers: {
        id: 'gui.teacherModal.errorLoadOrganizers',
        defaultMessage: 'Failed to load organizers',
        description: 'Error loading organizers'
    },
    errorAddOrganizer: {
        id: 'gui.teacherModal.errorAddOrganizer',
        defaultMessage: 'Failed to add organizer',
        description: 'Error adding organizer'
    },
    errorRemoveOrganizer: {
        id: 'gui.teacherModal.errorRemoveOrganizer',
        defaultMessage: 'Failed to remove organizer',
        description: 'Error removing organizer'
    },
    errorLoadUsers: {
        id: 'gui.teacherModal.errorLoadUsers',
        defaultMessage: 'Failed to load users',
        description: 'Error loading users'
    },
    errorAssignUser: {
        id: 'gui.teacherModal.errorAssignUser',
        defaultMessage: 'Failed to assign user',
        description: 'Error assigning user'
    },
    errorRemoveUser: {
        id: 'gui.teacherModal.errorRemoveUser',
        defaultMessage: 'Failed to remove user',
        description: 'Error removing user'
    },
    errorLoadGroups: {
        id: 'gui.teacherModal.errorLoadGroups',
        defaultMessage: 'Failed to load groups',
        description: 'Error loading groups'
    },
    errorAssignGroup: {
        id: 'gui.teacherModal.errorAssignGroup',
        defaultMessage: 'Failed to assign group',
        description: 'Error assigning group'
    },
    errorRemoveGroup: {
        id: 'gui.teacherModal.errorRemoveGroup',
        defaultMessage: 'Failed to remove group',
        description: 'Error removing group'
    },
    autoFreezeOnDue: {
        id: 'gui.teacherModal.autoFreezeOnDue',
        defaultMessage: 'Automatically freeze projects when due date passes',
        description: 'Checkbox label for auto-freeze on due date'
    },
    autoFreezeDisabledPastDue: {
        id: 'gui.teacherModal.autoFreezeDisabledPastDue',
        defaultMessage: 'Auto-freeze is not available after the due date has passed',
        description: 'Explanation when auto-freeze checkbox is disabled because due date has passed'
    },
    versions: {
        id: 'gui.teacherModal.versions',
        defaultMessage: 'Versions',
        description: 'Versions label'
    },
    workingCopies: {
        id: 'gui.teacherModal.workingCopies',
        defaultMessage: 'Working Copies',
        description: 'Working copies label'
    },
    expandDetails: {
        id: 'gui.teacherModal.expandDetails',
        defaultMessage: 'Show Details',
        description: 'Expand details button'
    },
    collapseDetails: {
        id: 'gui.teacherModal.collapseDetails',
        defaultMessage: 'Hide Details',
        description: 'Collapse details button'
    },
    openVersion: {
        id: 'gui.teacherModal.openVersion',
        defaultMessage: 'Open',
        description: 'Open version button'
    },
    version: {
        id: 'gui.teacherModal.version',
        defaultMessage: 'Version',
        description: 'Version label'
    },
    noVersions: {
        id: 'gui.teacherModal.noVersions',
        defaultMessage: 'No versions yet',
        description: 'No versions message'
    },
    noWorkingCopies: {
        id: 'gui.teacherModal.noWorkingCopies',
        defaultMessage: 'No working copies',
        description: 'No working copies message'
    },
    commitMessage: {
        id: 'gui.teacherModal.commitMessage',
        defaultMessage: 'Message',
        description: 'Commit message label'
    },
    committedBy: {
        id: 'gui.teacherModal.committedBy',
        defaultMessage: 'By',
        description: 'Committed by label'
    },
    basedOn: {
        id: 'gui.teacherModal.basedOn',
        defaultMessage: 'Based on',
        description: 'Based on label'
    },
    hasChanges: {
        id: 'gui.teacherModal.hasChanges',
        defaultMessage: 'Has changes',
        description: 'Has changes indicator'
    }
});

const AssignmentsTab = ({ intl, vm, onUpdateProjectTitle, onClose }) => {
    const userContext = useContext(UserContext);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Dialog state
    const [showAddOrganizer, setShowAddOrganizer] = useState(false);
    const [showAssignUser, setShowAssignUser] = useState(false);
    const [showAssignGroup, setShowAssignGroup] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState(null);
    const [availableOrganizers, setAvailableOrganizers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [availableGroups, setAvailableGroups] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        due_date: '',
        due_hour: '',
        due_minute: '',
        auto_freeze_on_due: false
    });
    const [formAssignedUsers, setFormAssignedUsers] = useState([]);
    const [formAssignedGroups, setFormAssignedGroups] = useState([]);

    useEffect(() => {
        loadAssignments();
        loadGroups();
    }, []);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const response = await assignmentService.getAssignments();
            setAssignments(response.assignments || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadGroups = async () => {
        try {
            const response = await assignmentService.getGroups();
            setGroups(response.groups || []);
        } catch (err) {
            console.error('Failed to load groups:', err);
        }
    };

    const loadSubmissions = async (assignmentId) => {
        try {
            setLoadingSubmissions(true);
            const response = await assignmentService.getSubmissions(assignmentId);
            setSubmissions(response.submissions || []);
        } catch (err) {
            console.error('Failed to load submissions:', err);
        } finally {
            setLoadingSubmissions(false);
        }
    };

    // Helper function to convert local datetime string to ISO with timezone
    const localDateTimeToISO = (dateStr, hourStr, minuteStr) => {
        if (!dateStr) return '';
        
        // Create date object from local time components
        const hour = hourStr ? hourStr.padStart(2, '0') : '00';
        const minute = minuteStr ? minuteStr.padStart(2, '0') : '00';
        const localDateTimeStr = `${dateStr}T${hour}:${minute}:00`;
        
        // Parse as local time and convert to ISO string (includes timezone offset)
        const date = new Date(localDateTimeStr);
        return date.toISOString();
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        try {
            const createData = {
                name: formData.name,
                description: formData.description,
                due_date: localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute),
                auto_freeze_on_due: formData.auto_freeze_on_due,
                user_ids: formAssignedUsers.map(u => u.id),
                group_ids: formAssignedGroups.map(g => g.id)
            };
            const response = await assignmentService.createAssignment(createData);
            setFormData({ name: '', description: '', due_date: '', due_hour: '', due_minute: '', auto_freeze_on_due: false });
            setFormAssignedUsers([]);
            setFormAssignedGroups([]);
            await loadAssignments();
            setIsCreating(false);
            // Select the newly created assignment
            if (response.assignment) {
                setSelectedAssignment(response.assignment);
                await loadSubmissions(response.assignment.id);
            }
        } catch (err) {
            console.error('Failed to create assignment:', err);
        }
    };

    const handleUpdateAssignment = async (e) => {
        e.preventDefault();
        try {
            const updateData = {
                name: formData.name,
                description: formData.description,
                due_date: localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute),
                auto_freeze_on_due: formData.auto_freeze_on_due
            };
            const response = await assignmentService.updateAssignment(selectedAssignment.id, updateData);
            
            // Reload assignments list
            await loadAssignments();
            setIsEditing(false);
            
            // Set the updated assignment from response and reload submissions
            if (response.assignment) {
                setSelectedAssignment(response.assignment);
                await loadSubmissions(response.assignment.id);
            }
        } catch (err) {
            console.error('Failed to update assignment:', err);
        }
    };

    const handleStartCreate = () => {
        setIsCreating(true);
        setSelectedAssignment(null);
        setFormData({ name: '', description: '', due_date: '', due_hour: '', due_minute: '', auto_freeze_on_due: false });
        setFormAssignedUsers([]);
        setFormAssignedGroups([]);
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        // Split datetime into date, hour, and minute components (in local time)
        let dateValue = '';
        let hourValue = '';
        let minuteValue = '';
        if (selectedAssignment.due_date) {
            const dt = new Date(selectedAssignment.due_date);
            // Format as local date YYYY-MM-DD
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
            hourValue = dt.getHours().toString();
            minuteValue = dt.getMinutes().toString();
        }
        setFormData({
            name: selectedAssignment.name,
            description: selectedAssignment.description || '',
            due_date: dateValue,
            due_hour: hourValue,
            due_minute: minuteValue,
            auto_freeze_on_due: selectedAssignment.auto_freeze_on_due || false
        });
    };

    const handleCancelEdit = () => {
        setIsCreating(false);
        setIsEditing(false);
        setFormData({ name: '', description: '', due_date: '', due_hour: '', due_minute: '' });
        setFormAssignedUsers([]);
        setFormAssignedGroups([]);
    };

    const handleDeleteAssignment = (assignmentId) => {
        setAssignmentToDelete(assignmentId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAssignment = async () => {
        if (!assignmentToDelete) return;
        
        try {
            await assignmentService.deleteAssignment(assignmentToDelete);
            setSelectedAssignment(null);
            setSubmissions([]);
            await loadAssignments();
        } catch (err) {
            console.error('Failed to delete assignment:', err);
        } finally {
            setShowDeleteConfirm(false);
            setAssignmentToDelete(null);
        }
    };

    const handleSelectAssignment = async (assignment) => {
        setSelectedAssignment(assignment);
        setIsCreating(false);
        setIsEditing(false);
        await loadSubmissions(assignment.id);
    };

    const handleFreezeSubmission = async (submissionId) => {
        try {
            await assignmentService.freezeSubmission(submissionId);
            // Update local state immediately for instant UI feedback
            setSubmissions(submissions.map(s => 
                s.id === submissionId ? { ...s, is_frozen: true } : s
            ));
            // Then refresh from server to ensure consistency
            await loadSubmissions(selectedAssignment.id);
        } catch (err) {
            console.error('Failed to freeze project:', err);
        }
    };

    const handleUnfreezeSubmission = async (submissionId) => {
        try {
            await assignmentService.unfreezeSubmission(submissionId);
            // Update local state immediately for instant UI feedback
            setSubmissions(submissions.map(s => 
                s.id === submissionId ? { ...s, is_frozen: false } : s
            ));
            // Then refresh from server to ensure consistency
            await loadSubmissions(selectedAssignment.id);
        } catch (err) {
            console.error('Failed to unfreeze project:', err);
        }
    };

    const handleFreezeAll = async () => {
        try {
            await assignmentService.freezeAllSubmissions(selectedAssignment.id);
            await loadSubmissions(selectedAssignment.id);
        } catch (err) {
            console.error('Failed to freeze all:', err);
        }
    };

    const handleUnfreezeAll = async () => {
        try {
            await assignmentService.unfreezeAllSubmissions(selectedAssignment.id);
            await loadSubmissions(selectedAssignment.id);
        } catch (err) {
            console.error('Failed to unfreeze all:', err);
        }
    };

    // Organizer management
    const handleShowAddOrganizer = async () => {
        try {
            const response = await assignmentService.getAvailableOrganizers(selectedAssignment.id);
            setAvailableOrganizers(response.users || []);
            setShowAddOrganizer(true);
        } catch (error) {
            console.error('Failed to load organizers:', error);
        }
    };

    const handleAddOrganizer = async (userId) => {
        if (!userId) return;
        
        try {
            const response = await assignmentService.addOrganizer(selectedAssignment.id, userId);
            setSelectedAssignment(response.assignment);
            setShowAddOrganizer(false);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to add organizer:', error);
        }
    };

    const handleRemoveOrganizer = async organizerId => {
        try {
            const response = await assignmentService.removeOrganizer(selectedAssignment.id, organizerId);
            setSelectedAssignment(response.assignment);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to remove organizer:', error);
        }
    };

    // User assignment management
    const handleShowAssignUser = async () => {
        try {
            const response = await assignmentService.getAvailableUsers(selectedAssignment.id);
            setAvailableUsers(response.users || []);
            setShowAssignUser(true);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleAssignUser = async (userId) => {
        if (!userId) return;
        
        try {
            const response = await assignmentService.assignToUser(selectedAssignment.id, userId);
            setSelectedAssignment(response.assignment);
            setShowAssignUser(false);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to assign user:', error);
        }
    };

    const handleRemoveUserAssignment = async userId => {
        try {
            const response = await assignmentService.removeUserAssignment(selectedAssignment.id, userId);
            setSelectedAssignment(response.assignment);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to remove user:', error);
        }
    };

    // Group assignment management
    const handleShowAssignGroup = async () => {
        try {
            const response = await assignmentService.getAvailableGroups(selectedAssignment.id);
            setAvailableGroups(response.groups || []);
            setShowAssignGroup(true);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const handleAssignGroup = async (groupId) => {
        if (!groupId) return;
        
        try {
            const response = await assignmentService.assignToGroup(selectedAssignment.id, parseInt(groupId));
            setSelectedAssignment(response.assignment);
            setShowAssignGroup(false);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to assign group:', error);
        }
    };

    const handleRemoveGroupAssignment = async groupId => {
        try {
            const response = await assignmentService.removeGroupAssignment(selectedAssignment.id, groupId);
            setSelectedAssignment(response.assignment);
            await loadAssignments();
        } catch (error) {
            console.error('Failed to remove group:', error);
        }
    };

    // Form user/group management
    const handleFormAddUser = async (userId) => {
        if (!userId) return;
        
        const user = availableUsers.find(u => u.id === userId);
        if (user && !formAssignedUsers.find(u => u.id === userId)) {
            setFormAssignedUsers([...formAssignedUsers, user]);
        }
        setShowAssignUser(false);
    };

    const handleFormRemoveUser = (userId) => {
        setFormAssignedUsers(formAssignedUsers.filter(u => u.id !== userId));
    };

    const handleFormAddGroup = async (groupId) => {
        if (!groupId) return;
        
        const group = availableGroups.find(g => g.id === parseInt(groupId));
        if (group && !formAssignedGroups.find(g => g.id === group.id)) {
            setFormAssignedGroups([...formAssignedGroups, group]);
        }
        setShowAssignGroup(false);
    };

    const handleFormRemoveGroup = (groupId) => {
        setFormAssignedGroups(formAssignedGroups.filter(g => g.id !== groupId));
    };

    const handleFormShowAssignUser = async () => {
        try {
            // Get all users, then filter out already assigned ones
            const response = await assignmentService.getAvailableUsers(0); // Use 0 for new assignment
            const filtered = (response.users || []).filter(
                u => !formAssignedUsers.find(fu => fu.id === u.id)
            );
            setAvailableUsers(filtered);
            setShowAssignUser(true);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleFormShowAssignGroup = async () => {
        try {
            // Get all groups, then filter out already assigned ones
            const response = await assignmentService.getAvailableGroups(0); // Use 0 for new assignment
            const filtered = (response.groups || []).filter(
                g => !formAssignedGroups.find(fg => fg.id === g.id)
            );
            setAvailableGroups(filtered);
            setShowAssignGroup(true);
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const formatDate = date => {
        if (!date) return 'N/A';
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

    return (
        <div className={styles.modalLayout}>
            {/* Left side - Assignments list */}
            <div className={styles.studentsPanel}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>
                        <FormattedMessage {...messages.assignmentsTitle} />
                    </h3>
                </div>

                <div className={styles.studentsList}>
                    {loading && (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner} />
                            <FormattedMessage {...messages.loading} />
                        </div>
                    )}

                    {!loading && error && (
                        <div className={styles.errorContainer}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && assignments.length === 0 && !isCreating && (
                        <div className={styles.emptyContainer}>
                            <FormattedMessage {...messages.noAssignments} />
                        </div>
                    )}

                    {!loading && !error && (
                        <div className={styles.studentItems}>
                            {assignments.map(assignment => {
                                const stats = assignment.statistics || {};
                                const isSelected = selectedAssignment && selectedAssignment.id === assignment.id;
                                const now = new Date();
                                const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
                                const isOverdue = dueDate && dueDate < now;
                                const isDueSoon = dueDate && !isOverdue && (dueDate - now) < 7 * 24 * 60 * 60 * 1000;
                                
                                return (
                                    <div
                                        key={assignment.id}
                                        className={`${styles.assignmentItem} ${isSelected ? styles.selectedAssignment : ''}`}
                                        onClick={() => handleSelectAssignment(assignment)}
                                    >
                                        <div className={styles.assignmentItemHeader}>
                                            <div className={styles.assignmentItemTitle}>
                                                {assignment.name}
                                            </div>
                                            {dueDate && (
                                                <div className={`${styles.assignmentDueIndicator} ${isOverdue ? styles.overdue : ''}`}>
                                                    {isOverdue ? '⚠️ fällig' : isDueSoon ? '⏰ Bald fällig' : '📅 Fällig'}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.assignmentItemMeta}>
                                            {assignment.due_date && (
                                                <div className={styles.assignmentDueDate}>
                                                    <span>📅</span>
                                                    <span>{formatDate(assignment.due_date)}</span>
                                                </div>
                                            )}
                                            <div className={styles.assignmentStats}>
                                                <div className={styles.statItem}>
                                                    <span>{stats.total_submitted || 0}/{stats.total_assigned || 0}</span>
                                                </div>
                                                {stats.total_graded > 0 && (
                                                    <div className={styles.statItem}>
                                                        <span>⭐</span>
                                                        <span>{stats.total_graded}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.panelFooter}>
                    <button
                        className={styles.createAssignmentButton}
                        onClick={handleStartCreate}
                        disabled={isCreating}
                    >
                        <span style={{fontSize: '1.2rem'}}>➕</span>
                        <FormattedMessage {...messages.createAssignment} />
                    </button>
                </div>
            </div>

            {/* Right side - Assignment details */}
            <div className={styles.projectsPanel}>
                {!selectedAssignment && !isCreating && (
                    <div className={styles.selectPrompt}>
                        <FormattedMessage {...messages.selectAssignment} />
                    </div>
                )}

                {isCreating && (
                    <div className={styles.projectDetailContent}>
                        <div className={styles.assignmentDetailHeader}>
                            <h2 className={styles.assignmentDetailTitle}>
                                <FormattedMessage {...messages.createAssignment} />
                            </h2>
                        </div>

                        <form onSubmit={handleCreateAssignment} className={styles.assignmentForm}>
                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.assignmentFormLabel}>
                                    <FormattedMessage {...messages.assignmentName} /> *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className={styles.assignmentFormInput}
                                    placeholder="Enter assignment name..."
                                />
                            </div>

                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.assignmentFormLabel}>
                                    <FormattedMessage {...messages.description} />
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className={styles.assignmentFormTextarea}
                                    placeholder="Describe the assignment..."
                                />
                            </div>

                            <div className={styles.dateTimeRow}>
                                <div className={styles.assignmentFormGroup}>
                                    <label className={styles.assignmentFormLabel}>
                                        <FormattedMessage {...messages.dueDate} />
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className={styles.assignmentFormInput}
                                    />
                                </div>
                                <div className={styles.assignmentFormGroup}>
                                    <label className={styles.assignmentFormLabel}>
                                        <FormattedMessage {...messages.dueTime} />
                                    </label>
                                    <div className={styles.timeSelectRow}>
                                        <select
                                            value={formData.due_hour}
                                            onChange={(e) => setFormData({ ...formData, due_hour: e.target.value })}
                                            className={styles.timeSelect}
                                        >
                                            <option value=""><FormattedMessage {...messages.hour} /></option>
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className={styles.timeSeparator}>:</span>
                                        <select
                                            value={formData.due_minute}
                                            onChange={(e) => setFormData({ ...formData, due_minute: e.target.value })}
                                            className={styles.timeSelect}
                                        >
                                            <option value=""><FormattedMessage {...messages.minute} /></option>
                                            {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                                                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Auto-freeze checkbox */}
                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.auto_freeze_on_due}
                                        onChange={(e) => setFormData({ ...formData, auto_freeze_on_due: e.target.checked })}
                                        className={styles.checkbox}
                                        disabled={(() => {
                                            if (!formData.due_date) return false;
                                            const dueDateTime = localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute);
                                            return new Date(dueDateTime) < new Date();
                                        })()}
                                    />
                                    <FormattedMessage {...messages.autoFreezeOnDue} />
                                </label>
                                {(() => {
                                    if (!formData.due_date) return null;
                                    const dueDateTime = localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute);
                                    const isPastDue = new Date(dueDateTime) < new Date();
                                    if (isPastDue) {
                                        return (
                                            <div className={styles.helpText}>
                                                ⚠️ <FormattedMessage {...messages.autoFreezeDisabledPastDue} />
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {/* Assignees Section in Create Form */}
                            <div className={styles.assignmentFormGroup}>
                                <div className={styles.sectionHeader}>
                                    <label className={styles.assignmentFormLabel}>
                                        <FormattedMessage {...messages.assignees} />
                                    </label>
                                    <div className={styles.addButtonGroup}>
                                        <button
                                            type="button"
                                            className={styles.primaryActionButton}
                                            onClick={handleFormShowAssignUser}
                                        >
                                            <FormattedMessage {...messages.assignUser} />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.primaryActionButton}
                                            onClick={handleFormShowAssignGroup}
                                        >
                                            <FormattedMessage {...messages.assignGroup} />
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formMembersList}>
                                    {/* Assigned Users */}
                                    {formAssignedUsers.map(user => (
                                        <div key={`form-user-${user.id}`} className={styles.formMemberItem}>
                                            <div className={styles.memberAvatar}>
                                                {user.username?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberName}>
                                                    {user.username}
                                                </div>
                                                <div className={styles.memberRole}>
                                                    👤 <FormattedMessage {...messages.directUser} />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                onClick={() => handleFormRemoveUser(user.id)}
                                                title="Remove user"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {/* Assigned Groups */}
                                    {formAssignedGroups.map(group => (
                                        <div key={`form-group-${group.id}`} className={styles.formMemberItem}>
                                            <div className={styles.groupAvatar}>
                                                👥
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberName}>
                                                    {group.name}
                                                </div>
                                                <div className={styles.memberRole}>
                                                    <FormattedMessage {...messages.viaGroup} /> • {group.member_count || 0} members
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                onClick={() => handleFormRemoveGroup(group.id)}
                                                title="Remove group"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {formAssignedUsers.length === 0 && formAssignedGroups.length === 0 && (
                                        <div className={styles.emptyMessage}>
                                            <FormattedMessage {...messages.noAssignees} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.assignmentFormActions}>
                                <button type="submit" className={styles.primaryActionButton}>
                                    <FormattedMessage {...messages.save} />
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.secondaryActionButton}
                                    onClick={handleCancelEdit}
                                >
                                    <FormattedMessage {...messages.cancel} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {selectedAssignment && !isEditing && (
                    <div className={styles.projectDetailContent}>
                        <div className={styles.assignmentDetailHeader}>
                            <h2 className={styles.assignmentDetailTitle}>
                                {selectedAssignment.name}
                            </h2>
                            <div className={styles.assignmentDetailActions}>
                                <button
                                    className={styles.primaryActionButton}
                                    onClick={handleStartEdit}
                                >
                                    <FormattedMessage {...messages.editAssignment} />
                                </button>
                                <button
                                    className={styles.dangerActionButton}
                                    onClick={() => handleDeleteAssignment(selectedAssignment.id)}
                                >
                                    <FormattedMessage {...messages.deleteAssignment} />
                                </button>
                            </div>
                        </div>

                        {/* Assignment Info */}
                        <div className={styles.assignmentInfoSection}>
                            <h3 className={styles.assignmentSectionTitle}>
                                <FormattedMessage {...messages.assignmentInfo} />
                            </h3>

                            <div className={styles.assignmentInfoGrid}>
                                {selectedAssignment.description && (
                                    <div className={styles.assignmentInfoItem} style={{gridColumn: '1 / -1'}}>
                                        <div className={styles.assignmentInfoLabel}>
                                            <FormattedMessage {...messages.description} />
                                        </div>
                                        <div className={styles.assignmentInfoValue}>
                                            {selectedAssignment.description}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.assignmentInfoItem}>
                                    <div className={styles.assignmentInfoLabel}>
                                        📅 <FormattedMessage {...messages.created} />
                                    </div>
                                    <div className={styles.assignmentInfoValue}>
                                        {formatDate(selectedAssignment.created_at)}<br/>
                                        {formatTime(selectedAssignment.created_at)}
                                    </div>
                                </div>

                                {selectedAssignment.due_date && (
                                    <div className={styles.assignmentInfoItem}>
                                        <div className={styles.assignmentInfoLabel}>
                                            ⏰ <FormattedMessage {...messages.due} />
                                        </div>
                                        <div className={styles.assignmentInfoValue}>
                                            {formatDate(selectedAssignment.due_date)}<br/>
                                            {formatTime(selectedAssignment.due_date)}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.assignmentInfoItem}>
                                    <div className={styles.assignmentInfoLabel}>
                                        🔒 <FormattedMessage {...messages.autoFreezeOnDue} />
                                    </div>
                                    <div className={styles.assignmentInfoValue}>
                                        {selectedAssignment.auto_freeze_on_due ? '✓' : '✗'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Statistics */}
                        {selectedAssignment.statistics && (
                            <div className={styles.assignmentInfoSection}>
                                <h3 className={styles.assignmentSectionTitle}>
                                    <FormattedMessage {...messages.statistics} />
                                </h3>
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <div className={styles.statValue}>
                                            {selectedAssignment.statistics.total_assigned || 0}
                                        </div>
                                        <div className={styles.statLabel}>
                                            <FormattedMessage {...messages.totalAssigned} />
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statValue}>
                                            {selectedAssignment.statistics.total_submitted || 0}
                                        </div>
                                        <div className={styles.statLabel}>
                                            <FormattedMessage {...messages.totalSubmitted} />
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statValue}>
                                            {selectedAssignment.statistics.total_graded || 0}
                                        </div>
                                        <div className={styles.statLabel}>
                                            <FormattedMessage {...messages.totalGraded} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Organizers Section */}
                        <div className={styles.assignmentInfoSection}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.assignmentSectionTitle}>
                                    <FormattedMessage {...messages.organizers} />
                                    <span className={styles.badge}>
                                        {selectedAssignment.organizers?.length || 0}
                                    </span>
                                </h3>
                                <button
                                    className={styles.primaryActionButton}
                                    onClick={handleShowAddOrganizer}
                                >
                                    <FormattedMessage {...messages.addOrganizer} />
                                </button>
                            </div>

                            <div className={styles.membersList}>
                                {selectedAssignment.organizers && selectedAssignment.organizers.length > 0 ? (
                                    selectedAssignment.organizers.map((organizer, index) => (
                                        <div key={organizer.id} className={styles.memberItem}>
                                            <div className={styles.memberAvatar}>
                                                {organizer.username?.[0]?.toUpperCase() || 'O'}
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberName}>
                                                    {organizer.username}
                                                </div>
                                                <div className={styles.memberRole}>
                                                    {index === 0 ? '👑 Creator' : '👨‍🏫 Organizer'}
                                                </div>
                                            </div>
                                            {index > 0 && (
                                                <button
                                                    className={styles.removeButton}
                                                    onClick={() => handleRemoveOrganizer(organizer.id)}
                                                    title="Remove organizer"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <FormattedMessage {...messages.noOrganizers} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assignees Section (Users & Groups) */}
                        <div className={styles.assignmentInfoSection}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.assignmentSectionTitle}>
                                    <FormattedMessage {...messages.assignees} />
                                    <span className={styles.badge}>
                                        {(selectedAssignment.user_assignments?.length || 0) + 
                                         (selectedAssignment.group_assignments?.length || 0)}
                                    </span>
                                </h3>
                                <div className={styles.addButtonGroup}>
                                    <button
                                        className={styles.primaryActionButton}
                                        onClick={handleShowAssignUser}
                                    >
                                        <FormattedMessage {...messages.assignUser} />
                                    </button>
                                    <button
                                        className={styles.primaryActionButton}
                                        onClick={handleShowAssignGroup}
                                    >
                                        <FormattedMessage {...messages.assignGroup} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.membersList}>
                                {/* Individual Users */}
                                {selectedAssignment.user_assignments && selectedAssignment.user_assignments.map(assignment => (
                                    <div key={`user-${assignment.user.id}`} className={styles.memberItem}>
                                        <div className={styles.memberAvatar}>
                                            {assignment.user.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className={styles.memberInfo}>
                                            <div className={styles.memberName}>
                                                {assignment.user.username}
                                            </div>
                                            <div className={styles.memberRole}>
                                                👤 <FormattedMessage {...messages.directUser} />
                                            </div>
                                        </div>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => handleRemoveUserAssignment(assignment.user.id)}
                                            title="Remove user"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {/* Groups */}
                                {selectedAssignment.group_assignments && selectedAssignment.group_assignments.map(assignment => (
                                    <div key={`group-${assignment.group.id}`} className={styles.memberItem}>
                                        <div className={styles.groupAvatar}>
                                            👥
                                        </div>
                                        <div className={styles.memberInfo}>
                                            <div className={styles.memberName}>
                                                {assignment.group.name}
                                            </div>
                                            <div className={styles.memberRole}>
                                                <FormattedMessage {...messages.viaGroup} /> • {assignment.group.member_count || 0} members
                                            </div>
                                        </div>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => handleRemoveGroupAssignment(assignment.group.id)}
                                            title="Remove group"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {(!selectedAssignment.user_assignments || selectedAssignment.user_assignments.length === 0) &&
                                 (!selectedAssignment.group_assignments || selectedAssignment.group_assignments.length === 0) && (
                                    <div className={styles.emptyMessage}>
                                        <FormattedMessage {...messages.noAssignees} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submissions */}
                        <div className={styles.membersSection}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.assignmentSectionTitle}>
                                    📝 <FormattedMessage {...messages.submissions} />
                                    <span className={styles.badge}>
                                        {submissions.length}
                                    </span>
                                </h3>
                            </div>
                            {submissions.length > 0 && (
                                <div className={styles.bulkActionsBar}>
                                    <button
                                        className={styles.secondaryActionButton}
                                        onClick={handleFreezeAll}
                                    >
                                        🔒 <FormattedMessage {...messages.freezeAll} />
                                    </button>
                                    <button
                                        className={styles.secondaryActionButton}
                                        onClick={handleUnfreezeAll}
                                    >
                                        🔓 <FormattedMessage {...messages.unfreezeAll} />
                                    </button>
                                </div>
                            )}

                            <div className={styles.membersList}>
                                {loadingSubmissions && (
                                    <div className={styles.loadingContainer}>
                                        <div className={styles.spinner} />
                                    </div>
                                )}

                                {!loadingSubmissions && submissions.length === 0 && (
                                    <div className={styles.emptyMessage}>
                                        <FormattedMessage {...messages.noSubmissions} />
                                    </div>
                                )}

                                {!loadingSubmissions && submissions.map(submission => (
                                    <SubmissionCard
                                        key={submission.id}
                                        submission={submission}
                                        onFreeze={() => handleFreezeSubmission(submission.id)}
                                        onUnfreeze={() => handleUnfreezeSubmission(submission.id)}
                                        messages={messages}
                                        vm={vm}
                                        userContext={userContext}
                                        onUpdateProjectTitle={onUpdateProjectTitle}
                                        onClose={onClose}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {selectedAssignment && isEditing && (
                    <div className={styles.projectDetailContent}>
                        <div className={styles.assignmentDetailHeader}>
                            <h2 className={styles.assignmentDetailTitle}>
                                ✏️ Edit Assignment
                            </h2>
                        </div>

                        <form onSubmit={handleUpdateAssignment} className={styles.assignmentForm}>
                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.assignmentFormLabel}>
                                    <FormattedMessage {...messages.assignmentName} /> *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className={styles.assignmentFormInput}
                                />
                            </div>

                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.assignmentFormLabel}>
                                    <FormattedMessage {...messages.description} />
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className={styles.assignmentFormTextarea}
                                />
                            </div>

                            <div className={styles.dateTimeRow}>
                                <div className={styles.assignmentFormGroup}>
                                    <label className={styles.assignmentFormLabel}>
                                        <FormattedMessage {...messages.dueDate} />
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className={styles.assignmentFormInput}
                                    />
                                </div>
                                <div className={styles.assignmentFormGroup}>
                                    <label className={styles.assignmentFormLabel}>
                                        <FormattedMessage {...messages.dueTime} />
                                    </label>
                                    <div className={styles.timeSelectRow}>
                                        <select
                                            value={formData.due_hour}
                                            onChange={(e) => setFormData({ ...formData, due_hour: e.target.value })}
                                            className={styles.timeSelect}
                                        >
                                            <option value=""><FormattedMessage {...messages.hour} /></option>
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className={styles.timeSeparator}>:</span>
                                        <select
                                            value={formData.due_minute}
                                            onChange={(e) => setFormData({ ...formData, due_minute: e.target.value })}
                                            className={styles.timeSelect}
                                        >
                                            <option value=""><FormattedMessage {...messages.minute} /></option>
                                            {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                                                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Auto-freeze checkbox */}
                            <div className={styles.assignmentFormGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.auto_freeze_on_due}
                                        onChange={(e) => setFormData({ ...formData, auto_freeze_on_due: e.target.checked })}
                                        className={styles.checkbox}
                                        disabled={(() => {
                                            if (!formData.due_date) return false;
                                            const dueDateTime = localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute);
                                            return new Date(dueDateTime) < new Date();
                                        })()}
                                    />
                                    <FormattedMessage {...messages.autoFreezeOnDue} />
                                </label>
                                {(() => {
                                    if (!formData.due_date) return null;
                                    const dueDateTime = localDateTimeToISO(formData.due_date, formData.due_hour, formData.due_minute);
                                    const isPastDue = new Date(dueDateTime) < new Date();
                                    if (isPastDue) {
                                        return (
                                            <div className={styles.helpText}>
                                                ⚠️ <FormattedMessage {...messages.autoFreezeDisabledPastDue} />
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className={styles.assignmentFormActions}>
                                <button type="submit" className={styles.primaryActionButton}>
                                    💾 <FormattedMessage {...messages.save} />
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.secondaryActionButton}
                                    onClick={handleCancelEdit}
                                >
                                    ✖️ <FormattedMessage {...messages.cancel} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddOrganizer && (
                <AssignUserModal
                    users={availableOrganizers}
                    onAdd={handleAddOrganizer}
                    onClose={() => setShowAddOrganizer(false)}
                    intl={intl}
                    messages={messages}
                    headerText={<FormattedMessage {...messages.addOrganizer} />}
                    showPermissionInfo={false}
                />
            )}

            {showAssignUser && (
                <AssignUserModal
                    users={availableUsers}
                    onAdd={isCreating ? handleFormAddUser : handleAssignUser}
                    onClose={() => setShowAssignUser(false)}
                    intl={intl}
                    messages={messages}
                    headerText={<FormattedMessage {...messages.assignUser} />}
                    showPermissionInfo={false}
                />
            )}

            {showAssignGroup && (
                <AssignGroupModal
                    groups={availableGroups}
                    onAdd={isCreating ? handleFormAddGroup : handleAssignGroup}
                    onClose={() => setShowAssignGroup(false)}
                    intl={intl}
                    messages={messages}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className={styles.deleteModalOverlay}>
                    <div className={styles.deleteModal}>
                        <div className={styles.deleteModalHeader}>
                            <h3><FormattedMessage {...messages.deleteAssignment} /></h3>
                        </div>
                        <div className={styles.deleteModalContent}>
                            <p><FormattedMessage {...messages.confirmDeleteAssignment} /></p>
                        </div>
                        <div className={styles.deleteModalButtons}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setAssignmentToDelete(null);
                                }}
                            >
                                <FormattedMessage {...messages.cancel} />
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={confirmDeleteAssignment}
                            >
                                <FormattedMessage {...messages.deleteAssignment} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SubmissionCard = ({ submission, onFreeze, onUnfreeze, messages, vm, userContext, onUpdateProjectTitle, onClose }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [versions, setVersions] = useState([]);
    const [workingCopies, setWorkingCopies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const formatDate = date => {
        if (!date) return '';
        return new Date(date).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const userName = submission.user?.username || submission.user_name || 'Unknown';
    const projectName = submission.collaborative_project?.name || submission.project_name || 'Untitled Project';
    const collabProjectId = submission.collaborative_project?.id;

    // Load versions and working copies when expanded
    useEffect(() => {
        if (isExpanded && collabProjectId && versions.length === 0 && !loading) {
            loadProjectDetails();
        }
    }, [isExpanded, collabProjectId]);

    const loadProjectDetails = async () => {
        if (!collabProjectId) {
            console.error('No collaborative project ID found', submission);
            setLoadError('No collaborative project ID');
            return;
        }
        
        setLoading(true);
        setLoadError(null);
        
        try {
            console.log('Fetching project details for collab_id:', collabProjectId);
            
            const data = await assignmentService.getProjectDetails(collabProjectId);
            console.log('Received data:', data);
            
            // Set versions (commits)
            const commits = data.commits || [];
            setVersions(commits);
            
            // Convert working copies object to array with user info
            // Note: The keys in working_copies are based_on_commit_id (project_id), not commit_number
            // We need to find the matching commit to get the commit_number
            const wcArray = [];
            if (data.working_copies) {
                Object.keys(data.working_copies).forEach(basedOnCommitId => {
                    const wc = data.working_copies[basedOnCommitId];
                    
                    // Find the commit with this project_id to get the commit_number
                    const matchingCommit = commits.find(c => c.project_id === parseInt(basedOnCommitId));
                    const commitNumber = matchingCommit ? matchingCommit.commit_number : basedOnCommitId;
                    
                    wcArray.push({
                        ...wc,
                        commit_number: commitNumber,
                        based_on_project_id: basedOnCommitId
                    });
                });
            }
            setWorkingCopies(wcArray);
            
        } catch (error) {
            console.error('Error loading project details:', error);
            console.error('Submission object:', submission);
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenVersion = async (commitNumber) => {
        if (!collabProjectId) return;
        
        try {
            // Close the modal first
            if (onClose) onClose();
            
            // Load the specific commit (read-only)
            const result = await ProjectManager.loadCommit(
                collabProjectId,
                commitNumber,
                vm,
                userContext,
                {
                    onUpdateTitle: onUpdateProjectTitle
                }
            );
            
            // Explicitly update Redux state after loading
            if (result && result.metadata && result.metadata.title) {
                onUpdateProjectTitle(result.metadata.title);
            }
        } catch (err) {
            console.error('[SubmissionCard] Error loading version:', err);
            setLoadError(err.message);
        }
    };

    const handleOpenWorkingCopy = async (commitId) => {
        if (!collabProjectId) return;
        
        try {
            // Close the modal first
            if (onClose) onClose();
            
            // Load the working copy
            const result = await ProjectManager.loadWorkingCopyByCommit(
                collabProjectId,
                commitId,
                vm,
                userContext,
                {
                    onUpdateTitle: onUpdateProjectTitle
                }
            );
            
            // Explicitly update Redux state after loading
            if (result && result.metadata && result.metadata.title) {
                onUpdateProjectTitle(result.metadata.title);
            }
        } catch (err) {
            console.error('[SubmissionCard] Error loading working copy:', err);
            setLoadError(err.message);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={styles.submissionCard}>
            <div className={styles.submissionHeader}>
                <div className={styles.submissionStudentInfo}>
                    <div className={styles.submissionStudentName}>
                        👤 {userName}
                    </div>
                    <div className={styles.submissionProjectName}>
                        📦 {projectName}
                    </div>
                    <div className={styles.submissionMetaRow}>
                        <div className={styles.submissionMetaItem}>
                            📅 {formatDate(submission.submitted_at)}
                        </div>
                        {submission.is_frozen && (
                            <span className={`${styles.submissionStatusBadge} ${styles.statusFrozen}`}>
                                🔒 Frozen
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.submissionActions}>
                    <button
                        className={styles.secondaryActionButton}
                        onClick={toggleExpand}
                        title={isExpanded ? 'Hide details' : 'Show details'}
                    >
                        {isExpanded ? '▼' : '▶'} <FormattedMessage {...messages[isExpanded ? 'collapseDetails' : 'expandDetails']} />
                    </button>
                    {submission.is_frozen ? (
                        <button
                            className={styles.secondaryActionButton}
                            onClick={onUnfreeze}
                            title="Unfreeze"
                        >
                            🔓 <FormattedMessage {...messages.unfreeze} />
                        </button>
                    ) : (
                        <button
                            className={styles.primaryActionButton}
                            onClick={onFreeze}
                            title="Freeze"
                        >
                            🔒 <FormattedMessage {...messages.freeze} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className={styles.submissionDetails}>
                    {loading && (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner} />
                            <FormattedMessage {...messages.loading} />
                        </div>
                    )}

                    {loadError && (
                        <div className={styles.errorContainer}>
                            {loadError}
                        </div>
                    )}

                    {!loading && !loadError && (
                        <>
                            {/* Versions Section */}
                            <div className={styles.submissionSection}>
                                <h4 className={styles.submissionSectionTitle}>
                                    📚 <FormattedMessage {...messages.versions} /> ({versions.length})
                                </h4>
                                {versions.length > 0 ? (
                                    <div className={styles.versionsList}>
                                        {versions.map(version => (
                                            <div key={version.commit_number} className={styles.versionItem}>
                                                <div className={styles.versionInfo}>
                                                    <div className={styles.versionNumber}>
                                                        <FormattedMessage {...messages.version} /> #{version.commit_number}
                                                    </div>
                                                    {version.message && (
                                                        <div className={styles.versionMessage}>
                                                            💬 {version.message}
                                                        </div>
                                                    )}
                                                    <div className={styles.versionMeta}>
                                                        <span>👤 {version.committed_by_name}</span>
                                                        <span>📅 {formatDate(version.created_at)}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.openButton}
                                                    onClick={() => handleOpenVersion(version.commit_number)}
                                                    title="Open this version"
                                                >
                                                    🔗 <FormattedMessage {...messages.openVersion} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <FormattedMessage {...messages.noVersions} />
                                    </div>
                                )}
                            </div>

                            {/* Working Copies Section */}
                            <div className={styles.submissionSection}>
                                <h4 className={styles.submissionSectionTitle}>
                                    ✏️ <FormattedMessage {...messages.workingCopies} /> ({workingCopies.length})
                                </h4>
                                {workingCopies.length > 0 ? (
                                    <div className={styles.versionsList}>
                                        {workingCopies.map((wc, idx) => (
                                            <div key={idx} className={styles.versionItem}>
                                                <div className={styles.versionInfo}>
                                                    <div className={styles.versionNumber}>
                                                        👤 {wc.user_name}
                                                    </div>
                                                    <div className={styles.versionMeta}>
                                                        <span>
                                                            <FormattedMessage {...messages.basedOn} /> <FormattedMessage {...messages.version} /> #{wc.commit_number}
                                                        </span>
                                                        {wc.has_changes && (
                                                            <span className={styles.changesIndicator}>
                                                                ✏️ <FormattedMessage {...messages.hasChanges} />
                                                            </span>
                                                        )}
                                                        <span>📅 {formatDate(wc.updated_at)}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.openButton}
                                                    onClick={() => handleOpenWorkingCopy(wc.based_on_commit_id)}
                                                    title="Open working copy"
                                                >
                                                    🔗 <FormattedMessage {...messages.openVersion} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyMessage}>
                                        <FormattedMessage {...messages.noWorkingCopies} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

AssignmentsTab.propTypes = {
    intl: PropTypes.object.isRequired,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    onUpdateProjectTitle: PropTypes.func,
    onClose: PropTypes.func
};

SubmissionCard.propTypes = {
    submission: PropTypes.object.isRequired,
    onFreeze: PropTypes.func.isRequired,
    onUnfreeze: PropTypes.func.isRequired,
    messages: PropTypes.object.isRequired,
    vm: PropTypes.shape({
        loadProject: PropTypes.func.isRequired
    }),
    userContext: PropTypes.object,
    onUpdateProjectTitle: PropTypes.func,
    onClose: PropTypes.func
};

export default injectIntl(AssignmentsTab);
