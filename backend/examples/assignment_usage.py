"""
Assignment System Usage Examples
=================================

This file demonstrates how to use the new Assignment system in the Scratch Editor.
"""

from app import db
from app.models.users import User
from app.models.groups import Group
from app.models.projects import CollaborativeProject, PermissionLevel
from app.models.assignments import (
    Assignment, 
    AssignmentUser, 
    AssignmentGroup, 
    AssignmentSubmission
)
from datetime import datetime, timedelta


# ============================================================
# EXAMPLE 1: Creating an Assignment
# ============================================================

def create_assignment_example():
    """Create a new assignment with organizers"""
    
    # Get teacher users who will organize the assignment
    teacher1 = User.query.filter_by(username='teacher1').first()
    teacher2 = User.query.filter_by(username='teacher2').first()
    
    # Create assignment
    assignment = Assignment(
        name="Create a Maze Game",
        description="Create an interactive maze game using Scratch. Include at least 3 levels.",
        due_date=datetime.now() + timedelta(days=7)
    )
    
    # Add organizers
    assignment.organizers.append(teacher1)
    assignment.organizers.append(teacher2)
    
    db.session.add(assignment)
    db.session.commit()
    
    print(f"Created assignment: {assignment.name} (ID: {assignment.id})")
    return assignment


# ============================================================
# EXAMPLE 2: Assigning to Users and Groups
# ============================================================

def assign_to_users_and_groups_example(assignment_id):
    """Assign an assignment to individual users and groups"""
    
    assignment = Assignment.query.get(assignment_id)
    
    # Assign to individual users
    student1 = User.query.filter_by(username='student1').first()
    student2 = User.query.filter_by(username='student2').first()
    
    assignment.assign_to_user(student1)
    assignment.assign_to_user(student2)
    
    # Assign to groups
    class_group = Group.query.filter_by(name='Class 5A').first()
    assignment.assign_to_group(class_group)
    
    db.session.commit()
    
    print(f"Assignment {assignment.name} assigned to:")
    print(f"  - {len(assignment.get_assigned_users())} individual users")
    print(f"  - {len(assignment.get_assigned_groups())} groups")
    print(f"  - {len(assignment.get_all_assigned_users())} total users (including groups)")


# ============================================================
# EXAMPLE 3: Submitting a Project to an Assignment
# ============================================================

def submit_project_example(assignment_id, user_id, collab_project_id):
    """Submit a collaborative project to an assignment (freezes the project)"""
    
    assignment = Assignment.query.get(assignment_id)
    user = User.query.get(user_id)
    collab_project = CollaborativeProject.query.get(collab_project_id)
    
    # Check if user has access to the assignment
    if not assignment.has_access(user):
        print("❌ User doesn't have access to this assignment")
        return None
    
    # Check if already submitted
    if assignment.has_submitted(user):
        print("⚠️  User has already submitted this assignment")
        return None
    
    # Get the latest commit ID (optional - for tracking which version was submitted)
    latest_commit_id = collab_project.latest_commit_id
    
    # Create submission
    submission = AssignmentSubmission(
        assignment_id=assignment.id,
        user_id=user.id,
        collaborative_project_id=collab_project.id,
        submitted_commit_id=latest_commit_id
    )
    
    # NOTE: Project is NOT automatically frozen upon submission
    # Teachers can manually freeze/unfreeze projects after submission
    
    db.session.add(submission)
    db.session.commit()
    
    print(f"✅ Project '{collab_project.name}' submitted to assignment '{assignment.name}'")
    print(f"   📌 Submitted commit: {latest_commit_id}")
    print(f"   ℹ️  Teachers can freeze this project manually if needed")
    
    return submission


# ============================================================
# EXAMPLE 4: Checking if a Project is Frozen
# ============================================================

def check_project_frozen_example(collab_project_id, user_id):
    """Check if a user can edit a project (checks frozen state)"""
    
    collab_project = CollaborativeProject.query.get(collab_project_id)
    user = User.query.get(user_id)
    
    # Check if project is frozen
    if collab_project.is_frozen():
        print(f"🔒 Project '{collab_project.name}' is FROZEN")
        
        # Get frozen permission details
        frozen_perms = [p for p in collab_project.permissions if p.is_frozen]
        if frozen_perms:
            perm = frozen_perms[0]
            print(f"   Frozen at: {perm.frozen_at}")
            print(f"   Frozen by: {perm.freezer.username if perm.freezer else 'Unknown'}")
            print(f"   Reason: {perm.frozen_reason}")
        
        return False
    
    # Check if user can edit
    if collab_project.can_edit(user):
        print(f"✅ User '{user.username}' can edit project '{collab_project.name}'")
        return True
    else:
        print(f"❌ User '{user.username}' cannot edit project '{collab_project.name}'")
        return False


# ============================================================
# EXAMPLE 5: Grading a Submission
# ============================================================

def grade_submission_example(submission_id, teacher_id, grade, feedback):
    """Grade a student's submission"""
    
    submission = AssignmentSubmission.query.get(submission_id)
    teacher = User.query.get(teacher_id)
    
    # Check if teacher is an organizer
    if not submission.assignment.is_organizer(teacher):
        print("❌ Only assignment organizers can grade submissions")
        return False
    
    # Add grade and feedback
    submission.grade = grade
    submission.feedback = feedback
    submission.graded_by = teacher.id
    submission.graded_at = datetime.now()
    
    db.session.commit()
    
    print(f"✅ Graded submission by {submission.user.username}")
    print(f"   Grade: {grade}")
    print(f"   Feedback: {feedback}")
    
    return True


# ============================================================
# EXAMPLE 6: Getting Assignment Statistics
# ============================================================

def get_assignment_stats_example(assignment_id):
    """Get statistics about an assignment"""
    
    assignment = Assignment.query.get(assignment_id)
    
    total_assigned = len(assignment.get_all_assigned_users())
    total_submitted = len(assignment.submissions)
    total_graded = len([s for s in assignment.submissions if s.grade is not None])
    
    print(f"\n📊 Assignment: {assignment.name}")
    print(f"   Total assigned: {total_assigned} users")
    print(f"   Submissions: {total_submitted}/{total_assigned} ({total_submitted/total_assigned*100:.1f}%)")
    print(f"   Graded: {total_graded}/{total_submitted}")
    
    if assignment.due_date:
        days_remaining = (assignment.due_date - datetime.now()).days
        print(f"   Due in: {days_remaining} days")
    
    # Average grade
    if total_graded > 0:
        avg_grade = sum(s.grade for s in assignment.submissions if s.grade) / total_graded
        print(f"   Average grade: {avg_grade:.2f}")
    
    return {
        'total_assigned': total_assigned,
        'total_submitted': total_submitted,
        'total_graded': total_graded
    }


# ============================================================
# EXAMPLE 7: Getting User's Assignments
# ============================================================

def get_user_assignments_example(user_id):
    """Get all assignments for a user"""
    
    user = User.query.get(user_id)
    
    # Get assignments directly assigned to user
    direct_assignments = AssignmentUser.query.filter_by(user_id=user.id).all()
    
    # Get assignments via groups
    group_assignments = []
    if user.groups:
        user_group_ids = [g.id for g in user.groups]
        group_assignments = AssignmentGroup.query.filter(
            AssignmentGroup.group_id.in_(user_group_ids)
        ).all()
    
    # Combine and deduplicate
    all_assignment_ids = set()
    all_assignment_ids.update([a.assignment_id for a in direct_assignments])
    all_assignment_ids.update([a.assignment_id for a in group_assignments])
    
    assignments = Assignment.query.filter(
        Assignment.id.in_(all_assignment_ids),
        Assignment.deleted_at.is_(None)
    ).all()
    
    print(f"\n📚 Assignments for {user.username}:")
    for assignment in assignments:
        submission = assignment.get_submission(user)
        status = "✅ Submitted" if submission else "⏳ Pending"
        
        print(f"   {assignment.name} - {status}")
        if submission and submission.grade:
            print(f"      Grade: {submission.grade}")
    
    return assignments


# ============================================================
# EXAMPLE 8: Complete Workflow
# ============================================================

def complete_assignment_workflow_example():
    """Complete example workflow from creation to grading"""
    
    # 1. Teacher creates assignment
    teacher = User.query.filter_by(role='teacher').first()
    
    assignment = Assignment(
        name="Animation Project",
        description="Create a 30-second animation",
        due_date=datetime.now() + timedelta(days=14)
    )
    assignment.organizers.append(teacher)
    db.session.add(assignment)
    
    # 2. Assign to a group
    student_group = Group.query.filter_by(name='Animation Class').first()
    assignment.assign_to_group(student_group)
    
    db.session.commit()
    print(f"✅ Created assignment: {assignment.name}")
    
    # 3. Student creates a project
    student = student_group.members[0]  # Get first student
    
    collab_project = CollaborativeProject(
        name="My Animation",
        description="A cool animation",
        created_by=student.id
    )
    db.session.add(collab_project)
    db.session.commit()
    
    print(f"✅ Student {student.username} created project: {collab_project.name}")
    
    # 4. Student works on project (creates commits, etc.)
    # ... (project work happens here)
    
    # 5. Student submits project
    submission = AssignmentSubmission(
        assignment_id=assignment.id,
        user_id=student.id,
        collaborative_project_id=collab_project.id,
        submitted_commit_id=collab_project.latest_commit_id
    )
    
    # Freeze project
    collab_project.freeze_for_assignment(student.id, assignment.id)
    
    db.session.add(submission)
    db.session.commit()
    
    print(f"✅ Student submitted project (now frozen)")
    
    # 6. Teacher grades submission
    submission.grade = 95.0
    submission.feedback = "Excellent work! Very creative animation."
    submission.graded_by = teacher.id
    submission.graded_at = datetime.now()
    
    db.session.commit()
    
    print(f"✅ Teacher graded submission: {submission.grade}/100")
    print(f"\n🎉 Complete workflow finished!")
    
    return assignment, submission


# ============================================================
# EXAMPLE 9: Checking Permissions Before Editing
# ============================================================

def check_edit_permission_example(collab_project_id, user_id):
    """Example of checking permissions before allowing edits"""
    
    collab_project = CollaborativeProject.query.get(collab_project_id)
    user = User.query.get(user_id)
    
    # This should be called before any edit operation
    if not collab_project.can_edit(user):
        if collab_project.is_frozen():
            print("❌ Cannot edit: Project is frozen (submitted to assignment)")
        else:
            print("❌ Cannot edit: Insufficient permissions")
        return False
    
    print("✅ User can edit this project")
    return True


# ============================================================
# EXAMPLE 10: Getting Submissions for an Assignment
# ============================================================

def get_submissions_for_assignment_example(assignment_id):
    """Get all submissions for an assignment with details"""
    
    assignment = Assignment.query.get(assignment_id)
    
    print(f"\n📝 Submissions for '{assignment.name}':")
    print("=" * 80)
    
    for submission in assignment.submissions:
        print(f"\nStudent: {submission.user.username}")
        print(f"Project: {submission.collaborative_project.name}")
        print(f"Submitted: {submission.submitted_at.strftime('%Y-%m-%d %H:%M')}")
        
        if submission.grade:
            print(f"Grade: {submission.grade}/100")
            print(f"Graded by: {submission.grader.username}")
            print(f"Feedback: {submission.feedback}")
        else:
            print("Status: Not graded yet")
        
        print("-" * 80)
    
    return assignment.submissions


if __name__ == '__main__':
    print("Assignment System Examples")
    print("=" * 80)
    print("\nThis file contains usage examples for the Assignment system.")
    print("Import the functions into your Flask shell or routes to use them.")
