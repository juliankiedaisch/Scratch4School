# Assignment System Implementation Guide

## Overview
Complete implementation of the Assignment System with manual freeze/unfreeze controls for teachers.

## Key Features Implemented

### ✅ Backend (Python/Flask)

#### 1. **Routes** (`backend/app/routes/assignment_routes.py`)
- **CRUD Operations:**
  - `POST /api/assignments` - Create assignment (teachers/admins only)
  - `GET /api/assignments` - List assignments (filtered by role)
  - `GET /api/assignments/<id>` - Get assignment details
  - `PUT /api/assignments/<id>` - Update assignment (organizers only)
  - `DELETE /api/assignments/<id>` - Delete assignment (organizers only)

- **Assignment Management:**
  - `POST /api/assignments/<id>/assign-user` - Assign to user
  - `POST /api/assignments/<id>/assign-group` - Assign to group

- **Submission Management:**
  - `POST /api/assignments/<id>/submit` - Submit project (NO auto-freeze)
  - `GET /api/assignments/<id>/submissions` - Get all submissions (organizers)
  - `PUT /api/assignments/submissions/<id>/grade` - Grade submission

- **Freeze/Unfreeze Controls:**
  - `POST /api/assignments/submissions/<id>/freeze` - Freeze single submission
  - `POST /api/assignments/submissions/<id>/unfreeze` - Unfreeze single submission
  - `POST /api/assignments/<id>/freeze-all` - Freeze all submissions
  - `POST /api/assignments/<id>/unfreeze-all` - Unfreeze all submissions

- **Helper Endpoints:**
  - `GET /api/assignments/<id>/available-users` - Get assignable users
  - `GET /api/assignments/<id>/available-groups` - Get assignable groups

#### 2. **Authorization**
- Custom decorator `@require_teacher_or_admin` ensures only teachers/admins can create/manage assignments
- Organizers can manage their assignments (view submissions, freeze, grade, etc.)
- Students can only view assignments assigned to them and submit projects

#### 3. **Models** (already created)
- `Assignment` - Main assignment table
- `AssignmentUser` - User assignments
- `AssignmentGroup` - Group assignments
- `AssignmentSubmission` - Submission tracking
- `CollaborativeProjectPermission` - Added frozen state columns

### ✅ Frontend (React)

#### 1. **Assignment Service** (`packages/scratch-gui/src/lib/assignment-service.js`)
Complete API client with methods for:
- CRUD operations
- Assignment management
- Submission handling
- Freeze/unfreeze controls
- Grading

#### 2. **Assignments Tab** (`packages/scratch-gui/src/components/teacher-modal/assignments-tab.jsx`)
Full-featured React component with:
- **Assignment List View:**
  - Display all assignments
  - Statistics (submissions, grading progress)
  - Create new assignment form
  - Delete assignments

- **Submission Detail View:**
  - View all submissions for an assignment
  - Individual freeze/unfreeze buttons per submission
  - Bulk freeze/unfreeze all submissions
  - Grading interface (grade + feedback)
  - Frozen status indicators

- **Create Assignment Form:**
  - Name, description, due date fields
  - Multi-select for groups
  - Auto-assignment to selected groups

## Important Design Decisions

### 1. **Manual Freeze Control**
Projects are **NOT automatically frozen** upon submission. Teachers have full control:
- Can freeze/unfreeze individual submissions
- Can bulk freeze/unfreeze all submissions
- Gives flexibility for edits after submission

### 2. **Assignment Deletion**
- Assignments can be deleted (soft delete)
- **Projects are NOT deleted** when assignment is deleted
- Maintains student work integrity

### 3. **Permission Hierarchy**
- Only teachers/admins can create assignments
- Assignment creators (organizers) can manage submissions
- Students can submit and view their own submissions

## Usage Examples

### Backend API

#### Create Assignment
```bash
POST /api/assignments
Content-Type: application/json

{
  "name": "Create a Game",
  "description": "Build an interactive game",
  "due_date": "2025-12-31T23:59:59",
  "group_ids": [1, 2]
}
```

#### Submit to Assignment
```bash
POST /api/assignments/1/submit
Content-Type: application/json

{
  "collaborative_project_id": 5
}
```

#### Freeze Submission
```bash
POST /api/assignments/submissions/10/freeze
```

#### Grade Submission
```bash
PUT /api/assignments/submissions/10/grade
Content-Type: application/json

{
  "grade": 95.0,
  "feedback": "Excellent work!"
}
```

### Frontend Usage

The Assignments Tab is accessible in the Teacher Modal:
1. Click "Assignments" tab
2. Click "Create Assignment"
3. Fill in details and select groups
4. View created assignment
5. Click "View Submissions" to see student work
6. Use freeze/unfreeze buttons as needed
7. Grade submissions

## Database Schema

### New Tables
- `assignments` - Assignment metadata
- `assignment_organizers` - Many-to-many with users
- `assignment_users` - Individual user assignments
- `assignment_groups` - Group assignments
- `assignment_submissions` - Submission tracking

### Modified Tables
- `collaborative_project_permissions` - Added frozen state columns:
  - `is_frozen` (boolean)
  - `frozen_at` (timestamp)
  - `frozen_by` (user_id)
  - `frozen_reason` (text)

## Migration

Run the migration script:
```bash
cd backend
python migrations/add_assignments_tables.py
```

The migration also runs automatically on server startup (configured in `run.py`).

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/assignments` | Teacher/Admin | Create assignment |
| GET | `/api/assignments` | Any | List assignments |
| GET | `/api/assignments/<id>` | Any | Get assignment |
| PUT | `/api/assignments/<id>` | Organizer | Update assignment |
| DELETE | `/api/assignments/<id>` | Organizer | Delete assignment |
| POST | `/api/assignments/<id>/assign-user` | Organizer | Assign to user |
| POST | `/api/assignments/<id>/assign-group` | Organizer | Assign to group |
| POST | `/api/assignments/<id>/submit` | Student | Submit project |
| GET | `/api/assignments/<id>/submissions` | Organizer | Get submissions |
| PUT | `/api/assignments/submissions/<id>/grade` | Organizer | Grade submission |
| POST | `/api/assignments/submissions/<id>/freeze` | Organizer | Freeze project |
| POST | `/api/assignments/submissions/<id>/unfreeze` | Organizer | Unfreeze project |
| POST | `/api/assignments/<id>/freeze-all` | Organizer | Freeze all |
| POST | `/api/assignments/<id>/unfreeze-all` | Organizer | Unfreeze all |
| GET | `/api/assignments/<id>/available-users` | Organizer | Get users |
| GET | `/api/assignments/<id>/available-groups` | Organizer | Get groups |

## Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/test_assignments.py
```

### Frontend Testing
The Assignments Tab is integrated into the Teacher Modal. Test by:
1. Login as teacher
2. Open Teacher Modal
3. Navigate to Assignments tab
4. Create, view, and manage assignments

## Security Considerations

1. **Authorization Checks:**
   - Only teachers/admins can create assignments
   - Only organizers can manage submissions
   - Students can only access their own data

2. **Data Validation:**
   - Required fields validated
   - User/group existence verified
   - Permission levels checked

3. **Project Integrity:**
   - Frozen projects cannot be edited
   - Assignments can be deleted without losing student work
   - Submission tracking maintains commit history

## Future Enhancements

Potential features to add:
- Assignment templates
- Rubric-based grading
- Peer review system
- Late submission handling
- Email notifications
- Analytics dashboard
- Export grades to CSV

## Troubleshooting

### Projects Not Freezing
- Check if organizer has correct permissions
- Verify submission exists before freezing
- Check backend logs for errors

### Cannot Create Assignment
- Verify user has teacher or admin role
- Check group IDs are valid
- Ensure required fields are provided

### Submissions Not Showing
- Confirm user is assignment organizer
- Check assignment ID is correct
- Verify database migration ran successfully

## Files Modified/Created

### Backend
- ✅ `app/routes/assignment_routes.py` (NEW)
- ✅ `app/models/assignments.py` (already created)
- ✅ `app/__init__.py` (modified - registered blueprint)
- ✅ `migrations/add_assignments_tables.py` (already created)
- ✅ `examples/assignment_usage.py` (modified)

### Frontend
- ✅ `packages/scratch-gui/src/lib/assignment-service.js` (NEW)
- ✅ `packages/scratch-gui/src/components/teacher-modal/assignments-tab.jsx` (REPLACED)

## Summary

The Assignment System is now fully functional with:
- ✅ Complete backend API with all CRUD operations
- ✅ Manual freeze/unfreeze controls (no auto-freeze)
- ✅ Teacher-only creation and management
- ✅ Full-featured React UI
- ✅ Grading system with feedback
- ✅ Bulk operations support
- ✅ Project integrity maintained on deletion

Teachers can now create assignments, assign them to groups/users, view submissions, manually control freeze state, and grade student work through an intuitive interface.
