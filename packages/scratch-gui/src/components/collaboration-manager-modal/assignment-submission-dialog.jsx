import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, defineMessages } from 'react-intl';
import styles from './collaboration-manager-modal.css';
import assignmentService from '../../lib/assignment-service';

const messages = defineMessages({
    submitToAssignment: {
        id: 'gui.assignmentSubmission.submitToAssignment',
        defaultMessage: 'Submit to Assignment',
        description: 'Title for assignment submission dialog'
    },
    selectAssignment: {
        id: 'gui.assignmentSubmission.selectAssignment',
        defaultMessage: 'Select an assignment:',
        description: 'Label for assignment selection'
    },
    noAssignments: {
        id: 'gui.assignmentSubmission.noAssignments',
        defaultMessage: 'You have no available assignments.',
        description: 'Message when no assignments available'
    },
    loading: {
        id: 'gui.assignmentSubmission.loading',
        defaultMessage: 'Loading assignments...',
        description: 'Loading message'
    },
    submit: {
        id: 'gui.assignmentSubmission.submit',
        defaultMessage: 'Submit',
        description: 'Submit button'
    },
    cancel: {
        id: 'gui.assignmentSubmission.cancel',
        defaultMessage: 'Cancel',
        description: 'Cancel button'
    },
    dueDate: {
        id: 'gui.assignmentSubmission.dueDate',
        defaultMessage: 'Due',
        description: 'Due date label'
    },
    alreadySubmitted: {
        id: 'gui.assignmentSubmission.alreadySubmitted',
        defaultMessage: 'Already submitted',
        description: 'Label for already submitted assignments'
    }
});

const AssignmentSubmissionDialog = ({ 
    projectId, 
    currentSubmissions = [],
    onSubmit, 
    onClose, 
    intl 
}) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [userSubmittedAssignments, setUserSubmittedAssignments] = useState(new Set());

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await assignmentService.getAssignments({ forSubmission: true });
            
            if (response.success) {
                const allAssignments = response.assignments || [];
                setAssignments(allAssignments);
                
                // Build a set of assignment IDs that the user has already submitted to
                // The backend includes user_submission for each assignment if the user has submitted
                const submittedIds = new Set();
                allAssignments.forEach(assignment => {
                    if (assignment.user_submission) {
                        submittedIds.add(assignment.id);
                    }
                });
                setUserSubmittedAssignments(submittedIds);
            } else {
                setError('Failed to load assignments');
            }
        } catch (err) {
            console.error('Error fetching assignments:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedAssignmentId) return;

        try {
            setSubmitting(true);
            setError(null);
            await onSubmit(selectedAssignmentId);
            onClose();
        } catch (err) {
            console.error('Error submitting to assignment:', err);
            setError(err.message || 'Failed to submit to assignment');
            setSubmitting(false);
        }
    };

    const isAlreadySubmitted = (assignmentId) => {
        // Check if user has submitted ANY project to this assignment
        return userSubmittedAssignments.has(assignmentId);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <div className={styles.dialogOverlay} onClick={onClose}>
            <div className={styles.dialogContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.dialogHeader}>
                    <h3><FormattedMessage {...messages.submitToAssignment} /></h3>
                </div>

                <div className={styles.dialogBody}>
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

                    {!loading && !error && assignments.length === 0 && (
                        <div className={styles.emptyContainer}>
                            <FormattedMessage {...messages.noAssignments} />
                        </div>
                    )}

                    {!loading && !error && assignments.length > 0 && (
                        <>
                            <label className={styles.dialogLabel}>
                                <FormattedMessage {...messages.selectAssignment} />
                            </label>
                            <div className={styles.assignmentList}>
                                {assignments.map(assignment => {
                                    const alreadySubmitted = isAlreadySubmitted(assignment.id);
                                    
                                    return (
                                        <div
                                            key={assignment.id}
                                            className={`${styles.assignmentItem} ${
                                                selectedAssignmentId === assignment.id ? styles.selected : ''
                                            } ${alreadySubmitted ? styles.disabled : ''}`}
                                            onClick={() => !alreadySubmitted && setSelectedAssignmentId(assignment.id)}
                                        >
                                            <div className={styles.assignmentItemHeader}>
                                                <span className={styles.assignmentName}>
                                                    {assignment.name}
                                                </span>
                                                {alreadySubmitted && (
                                                    <span className={styles.submittedBadge}>
                                                        ✓ <FormattedMessage {...messages.alreadySubmitted} />
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {assignment.description && (
                                                <div className={styles.assignmentDescription}>
                                                    {assignment.description}
                                                </div>
                                            )}
                                            
                                            {assignment.due_date && (
                                                <div className={styles.assignmentDueDate}>
                                                    <FormattedMessage {...messages.dueDate} />: {formatDate(assignment.due_date)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.dialogFooter}>
                    <button
                        className={styles.dialogButtonSecondary}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        <FormattedMessage {...messages.cancel} />
                    </button>
                    <button
                        className={styles.dialogButtonPrimary}
                        onClick={handleSubmit}
                        disabled={!selectedAssignmentId || submitting}
                    >
                        {submitting ? '...' : <FormattedMessage {...messages.submit} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

AssignmentSubmissionDialog.propTypes = {
    projectId: PropTypes.number.isRequired,
    currentSubmissions: PropTypes.array,
    onSubmit: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired
};

export default AssignmentSubmissionDialog;
