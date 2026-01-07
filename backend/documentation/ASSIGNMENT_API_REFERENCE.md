# Assignment API Quick Reference

## Base URL
```
http://your-domain/api/assignments
```

## Authentication
All endpoints require authentication via cookies. User role determines access level.

---

## Assignments

### Create Assignment
**Only teachers/admins**
```http
POST /api/assignments
Content-Type: application/json

{
  "name": "Assignment Name",
  "description": "Optional description",
  "due_date": "2025-12-31T23:59:59",  // Optional, ISO format
  "organizer_ids": [123, 456],         // Optional, additional organizers
  "user_ids": [789],                   // Optional, direct user assignments
  "group_ids": [1, 2]                  // Optional, group assignments
}

Response: 201
{
  "success": true,
  "assignment": { ... }
}
```

### List Assignments
```http
GET /api/assignments

Response: 200
{
  "success": true,
  "assignments": [
    {
      "id": 1,
      "name": "...",
      "description": "...",
      "due_date": "...",
      "organizers": [...],
      "statistics": {          // Only for organizers
        "total_assigned": 25,
        "total_submitted": 20,
        "total_graded": 15,
        "submission_rate": 80.0
      },
      "user_submission": {...} // Current user's submission
    }
  ]
}
```

### Get Assignment
```http
GET /api/assignments/{id}

Response: 200
{
  "success": true,
  "assignment": {
    "id": 1,
    "name": "...",
    "is_organizer": true,
    "assigned_users": [...],   // If organizer
    "assigned_groups": [...],  // If organizer
    "submissions": [...],      // If organizer
    "user_submission": {...}
  }
}
```

### Update Assignment
**Only organizers**
```http
PUT /api/assignments/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "due_date": "2026-01-15T23:59:59"
}

Response: 200
{
  "success": true,
  "assignment": { ... }
}
```

### Delete Assignment
**Only organizers** (soft delete, projects are preserved)
```http
DELETE /api/assignments/{id}

Response: 200
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

---

## Assignment Management

### Assign to User
**Only organizers**
```http
POST /api/assignments/{id}/assign-user
Content-Type: application/json

{
  "user_id": "user123"
}

Response: 200
{
  "success": true,
  "message": "Assignment assigned to username"
}
```

### Assign to Group
**Only organizers**
```http
POST /api/assignments/{id}/assign-group
Content-Type: application/json

{
  "group_id": 5
}

Response: 200
{
  "success": true,
  "message": "Assignment assigned to group GroupName"
}
```

---

## Submissions

### Submit Assignment
**Students** (NOT auto-frozen)
```http
POST /api/assignments/{id}/submit
Content-Type: application/json

{
  "collaborative_project_id": 10
}

Response: 201
{
  "success": true,
  "message": "Project submitted successfully",
  "submission": {
    "id": 42,
    "assignment_id": 1,
    "user": {...},
    "collaborative_project": {...},
    "submitted_at": "...",
    "submitted_commit_id": 15
  }
}
```

### Get Submissions
**Only organizers**
```http
GET /api/assignments/{id}/submissions

Response: 200
{
  "success": true,
  "submissions": [
    {
      "id": 42,
      "user": { "id": "...", "username": "..." },
      "collaborative_project": { "id": 10, "name": "..." },
      "submitted_at": "...",
      "submitted_commit_id": 15,
      "grade": 95.0,
      "feedback": "Excellent!",
      "graded_by": "teacher1",
      "graded_at": "...",
      "is_frozen": false
    }
  ],
  "total": 20
}
```

### Grade Submission
**Only organizers**
```http
PUT /api/assignments/submissions/{submission_id}/grade
Content-Type: application/json

{
  "grade": 95.0,
  "feedback": "Excellent work! Very creative approach."
}

Response: 200
{
  "success": true,
  "submission": { ... }
}
```

---

## Freeze/Unfreeze Controls

### Freeze Single Submission
**Only organizers**
```http
POST /api/assignments/submissions/{submission_id}/freeze

Response: 200
{
  "success": true,
  "message": "Project frozen successfully"
}
```

### Unfreeze Single Submission
**Only organizers**
```http
POST /api/assignments/submissions/{submission_id}/unfreeze

Response: 200
{
  "success": true,
  "message": "Project unfrozen successfully"
}
```

### Freeze All Submissions
**Only organizers**
```http
POST /api/assignments/{id}/freeze-all

Response: 200
{
  "success": true,
  "message": "Froze 15 submissions",
  "frozen_count": 15
}
```

### Unfreeze All Submissions
**Only organizers**
```http
POST /api/assignments/{id}/unfreeze-all

Response: 200
{
  "success": true,
  "message": "Unfroze 15 submissions",
  "unfrozen_count": 15
}
```

---

## Helper Endpoints

### Get Available Users
**Only organizers**
```http
GET /api/assignments/{id}/available-users?search=john

Response: 200
{
  "success": true,
  "users": [
    {
      "id": "user123",
      "username": "john_doe",
      "email": "john@example.com"
    }
  ]
}
```

### Get Available Groups
**Only organizers**
```http
GET /api/assignments/{id}/available-groups

Response: 200
{
  "success": true,
  "groups": [
    {
      "id": 5,
      "name": "Class 5A",
      "external_id": "class_5a",
      "member_count": 25
    }
  ]
}
```

---

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:
- `400` - Bad Request (missing/invalid data)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Frontend Integration

### Using Assignment Service
```javascript
import assignmentService from '../../lib/assignment-service';

// Create assignment
const assignment = await assignmentService.createAssignment({
  name: 'Create a Game',
  description: 'Build an interactive game',
  due_date: '2025-12-31T23:59:59',
  group_ids: [1, 2]
});

// Get assignments
const { assignments } = await assignmentService.getAssignments();

// Submit assignment
const submission = await assignmentService.submitAssignment(
  assignmentId, 
  collaborativeProjectId
);

// Freeze submission
await assignmentService.freezeSubmission(submissionId);

// Grade submission
await assignmentService.gradeSubmission(submissionId, {
  grade: 95.0,
  feedback: 'Great work!'
});
```

---

## Notes

1. **No Auto-Freeze**: Projects are NOT automatically frozen upon submission. Teachers must manually freeze projects.

2. **Project Preservation**: Deleting an assignment does NOT delete student projects.

3. **Permission Hierarchy**:
   - Teachers/Admins: Create assignments
   - Organizers: Manage submissions, freeze, grade
   - Students: Submit, view own submissions

4. **Freeze State**: When frozen, projects cannot be edited by anyone (including owners) until unfrozen by organizer.

5. **Multiple Submissions**: A student can submit different projects to the same assignment, but not the same project twice.
