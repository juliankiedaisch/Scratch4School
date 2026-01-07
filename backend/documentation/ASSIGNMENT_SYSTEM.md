# Assignment System Documentation

## Overview

The Assignment System allows teachers/organizers to create assignments, assign them to users or groups, and have students submit their CollaborativeProjects. When a project is submitted to an assignment, it gets **frozen** and can no longer be edited.

## Architecture

### Database Tables

#### 1. `assignments`
Main table for storing assignment information.

**Columns:**
- `id` (Integer, PK) - Unique assignment identifier
- `name` (String) - Assignment name
- `description` (Text) - Assignment description/instructions
- `created_at` (DateTime) - When assignment was created
- `updated_at` (DateTime) - Last update timestamp
- `due_date` (DateTime, nullable) - Due date for submissions
- `deleted_at` (DateTime, nullable) - Soft delete timestamp
- `deleted_by` (String, nullable) - User who deleted assignment

#### 2. `assignment_organizers`
Junction table linking assignments to their organizers (many-to-many).

**Columns:**
- `assignment_id` (Integer, FK) - Reference to assignment
- `user_id` (String, FK) - Reference to user
- `assigned_at` (DateTime) - When user became organizer

#### 3. `assignment_users`
Links assignments to individual users.

**Columns:**
- `id` (Integer, PK)
- `assignment_id` (Integer, FK) - Reference to assignment
- `user_id` (String, FK) - Reference to user
- `assigned_at` (DateTime) - When assignment was given

**Constraints:**
- `unique_assignment_user` - Each user can only be assigned once per assignment

#### 4. `assignment_groups`
Links assignments to groups (all group members receive the assignment).

**Columns:**
- `id` (Integer, PK)
- `assignment_id` (Integer, FK) - Reference to assignment
- `group_id` (Integer, FK) - Reference to group
- `assigned_at` (DateTime) - When assignment was given to group

**Constraints:**
- `unique_assignment_group` - Each group can only be assigned once per assignment

#### 5. `assignment_submissions`
Records when users submit projects to assignments.

**Columns:**
- `id` (Integer, PK)
- `assignment_id` (Integer, FK) - Reference to assignment
- `user_id` (String, FK) - Reference to user who submitted
- `collaborative_project_id` (Integer, FK) - Project that was submitted
- `submitted_at` (DateTime) - Submission timestamp
- `submitted_commit_id` (Integer, FK, nullable) - Specific commit submitted
- `grade` (Float, nullable) - Grade (0-100 or custom scale)
- `feedback` (Text, nullable) - Teacher feedback
- `graded_by` (String, FK, nullable) - Teacher who graded
- `graded_at` (DateTime, nullable) - When grading occurred

**Constraints:**
- `unique_assignment_submission` - Each user can only submit each project once per assignment

### Modified Tables

#### `collaborative_project_permissions`
Added frozen state columns to support assignment submissions:

**New Columns:**
- `is_frozen` (Boolean) - Whether permission is frozen
- `frozen_at` (DateTime, nullable) - When permission was frozen
- `frozen_by` (String, FK, nullable) - User who froze permission
- `frozen_reason` (Text, nullable) - Reason for freezing (e.g., "Assignment submission: Assignment #5")

## Models

### Assignment
Located in: `app/models/assignments.py`

**Relationships:**
- `organizers` - Many-to-many with User (via assignment_organizers)
- `user_assignments` - One-to-many with AssignmentUser
- `group_assignments` - One-to-many with AssignmentGroup
- `submissions` - One-to-many with AssignmentSubmission

**Key Methods:**
- `is_organizer(user)` - Check if user is an organizer
- `assign_to_user(user)` - Assign to individual user
- `assign_to_group(group)` - Assign to group
- `get_assigned_users()` - Get directly assigned users
- `get_assigned_groups()` - Get assigned groups
- `get_all_assigned_users()` - Get all users (direct + via groups)
- `has_access(user)` - Check if user can see assignment
- `get_submission(user)` - Get user's submission
- `has_submitted(user)` - Check if user has submitted

### AssignmentUser
Links assignments to individual users.

### AssignmentGroup
Links assignments to groups.

### AssignmentSubmission
Records project submissions with grading support.

**Key Methods:**
- `to_dict()` - Serialize submission data

### CollaborativeProjectPermission (Modified)
Added frozen state functionality.

**New Methods:**
- `freeze(user_id, reason)` - Freeze this permission
- `unfreeze()` - Unfreeze this permission

### CollaborativeProject (Modified)
Added frozen state checking.

**New Methods:**
- `freeze_for_assignment(user_id, assignment_id)` - Freeze all permissions
- `is_frozen()` - Check if project is frozen
- `can_edit(user)` - Check if user can edit (considers frozen state)

## Workflows

### 1. Creating an Assignment

```python
from app.models.assignments import Assignment
from app.models.users import User

# Create assignment
assignment = Assignment(
    name="Create a Game",
    description="Build an interactive game with 3 levels",
    due_date=datetime.now() + timedelta(days=7)
)

# Add organizers
teacher = User.query.filter_by(username='teacher1').first()
assignment.organizers.append(teacher)

db.session.add(assignment)
db.session.commit()
```

### 2. Assigning to Users/Groups

```python
# Assign to individual users
student = User.query.filter_by(username='student1').first()
assignment.assign_to_user(student)

# Assign to groups (all members receive it)
group = Group.query.filter_by(name='Class 5A').first()
assignment.assign_to_group(group)

db.session.commit()
```

### 3. Submitting a Project

```python
from app.models.assignments import AssignmentSubmission

# Create submission
submission = AssignmentSubmission(
    assignment_id=assignment.id,
    user_id=user.id,
    collaborative_project_id=project.id,
    submitted_commit_id=project.latest_commit_id
)

# IMPORTANT: Freeze the project
project.freeze_for_assignment(user.id, assignment.id)

db.session.add(submission)
db.session.commit()
```

### 4. Checking Edit Permissions

```python
# Always check before allowing edits
if not project.can_edit(user):
    if project.is_frozen():
        return {"error": "Project is frozen (submitted to assignment)"}, 403
    else:
        return {"error": "Insufficient permissions"}, 403

# Proceed with edit...
```

### 5. Grading a Submission

```python
submission = AssignmentSubmission.query.get(submission_id)

# Check if user is organizer
if not submission.assignment.is_organizer(current_user):
    return {"error": "Only organizers can grade"}, 403

# Grade submission
submission.grade = 95.0
submission.feedback = "Excellent work!"
submission.graded_by = current_user.id
submission.graded_at = datetime.now()

db.session.commit()
```

## API Endpoints (Suggested)

### Assignments

- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - List all assignments (filtered by user access)
- `GET /api/assignments/<id>` - Get assignment details
- `PUT /api/assignments/<id>` - Update assignment
- `DELETE /api/assignments/<id>` - Soft delete assignment

### Assignment Management

- `POST /api/assignments/<id>/assign-user` - Assign to user
- `POST /api/assignments/<id>/assign-group` - Assign to group
- `DELETE /api/assignments/<id>/assign-user/<user_id>` - Remove user assignment
- `DELETE /api/assignments/<id>/assign-group/<group_id>` - Remove group assignment

### Submissions

- `POST /api/assignments/<id>/submit` - Submit project to assignment
- `GET /api/assignments/<id>/submissions` - Get all submissions (organizers only)
- `GET /api/assignments/<id>/my-submission` - Get current user's submission
- `PUT /api/submissions/<id>/grade` - Grade a submission (organizers only)

## Permission Hierarchy

### Assignment Access
1. **Organizers** - Can manage assignment, view all submissions, grade
2. **Assigned Users** - Can view assignment, submit projects
3. **Group Members** - Can view assignment, submit projects (if group is assigned)

### Project Editing
1. **Not Frozen** + **WRITE/ADMIN Permission** = Can edit
2. **Frozen** (any reason) = Cannot edit (even with ADMIN permission)
3. **Frozen** + **Owner** = Cannot edit (intentional - submitted projects are immutable)

## Frozen State Behavior

### When a Project is Frozen:
1. All permissions are marked with `is_frozen = True`
2. `frozen_at`, `frozen_by`, and `frozen_reason` are set
3. `can_edit()` returns `False` for all users
4. API endpoints should reject edit attempts with 403

### Unfreezing (if needed):
```python
# Only if you need to unfreeze (rare - defeats purpose of submission)
for perm in project.permissions:
    perm.unfreeze()
db.session.commit()
```

## Migration

### Running the Migration

```bash
cd backend
python migrations/add_assignments_tables.py
```

### Rollback (if needed)

```bash
python migrations/add_assignments_tables.py rollback
```

### What the Migration Does:
1. Adds frozen state columns to `collaborative_project_permissions`
2. Creates `assignments` table
3. Creates `assignment_organizers` junction table
4. Creates `assignment_users` table
5. Creates `assignment_groups` table
6. Creates `assignment_submissions` table
7. Creates performance indexes

## Best Practices

### 1. Always Check Frozen State
```python
# Before any edit operation
if project.is_frozen():
    return error_response("Project is frozen")
```

### 2. Validate Assignment Access
```python
# Before showing assignment or accepting submission
if not assignment.has_access(current_user):
    return error_response("No access to this assignment")
```

### 3. Verify Organizer Status
```python
# Before grading or managing assignment
if not assignment.is_organizer(current_user):
    return error_response("Only organizers can perform this action")
```

### 4. Record Commit on Submission
```python
# Always record which commit was submitted
submission = AssignmentSubmission(
    ...,
    submitted_commit_id=project.latest_commit_id  # Important!
)
```

### 5. Handle Multiple Submissions
The unique constraint prevents submitting the same project multiple times, but a user could submit different projects. Consider your use case:

```python
# Check if already submitted
if assignment.has_submitted(user):
    return error_response("Already submitted this assignment")
```

## Future Enhancements

### Possible Features:
1. **Late Submission Tracking** - Compare submission time to due_date
2. **Resubmission Policy** - Allow resubmissions within time limit
3. **Partial Grading** - Support rubrics with multiple criteria
4. **Peer Review** - Allow students to review each other's work
5. **Assignment Templates** - Create reusable assignment templates
6. **Group Submissions** - Allow groups to submit collectively
7. **Auto-grading** - Integrate with automated testing
8. **Notifications** - Email/notification on assignment creation, submission, grading

## Testing

See `backend/examples/assignment_usage.py` for comprehensive usage examples.

### Key Test Cases:
1. Creating assignment with multiple organizers
2. Assigning to users and groups
3. Submitting project (verify freezing)
4. Attempting to edit frozen project (should fail)
5. Grading submissions
6. Getting assignment statistics
7. Listing user's assignments
8. Checking permissions at each step

## Troubleshooting

### Project Won't Edit
- Check `project.is_frozen()` 
- Check `project.can_edit(user)`
- Verify user has WRITE or ADMIN permission

### Can't Submit Assignment
- Verify `assignment.has_access(user)`
- Check if already submitted: `assignment.has_submitted(user)`
- Ensure user has permission to the project

### Migration Fails
- Check database connection
- Verify all foreign key references exist
- Look for conflicting column names
- Run with DEBUG mode for detailed errors

## Security Considerations

1. **Always verify organizer status** before grading/managing
2. **Check frozen state** before any edit operation
3. **Validate ownership** before submission
4. **Sanitize feedback** to prevent XSS
5. **Rate limit** submission endpoints
6. **Audit log** grade changes for accountability

## Indexes

The migration creates the following indexes for performance:
- `idx_assignment_users_user` on `assignment_users(user_id)`
- `idx_assignment_groups_group` on `assignment_groups(group_id)`
- `idx_assignment_submissions_user` on `assignment_submissions(user_id)`
- `idx_assignment_submissions_project` on `assignment_submissions(collaborative_project_id)`
