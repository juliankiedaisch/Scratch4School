# Assignment Organizers & Assignees Management

## Overview
Extended the assignments tab with comprehensive management capabilities for organizers and assignees, following the same pattern used in my-projects-tab for consistency.

## New Features

### 1. Organizer Management
**What are Organizers?**
- Teachers/admins who have control over an assignment
- Creator is automatically the first organizer
- Additional organizers can be added by existing organizers
- All organizers have equal rights except the creator cannot be removed

**Capabilities:**
- View all organizers with visual indication of creator (👑 crown icon)
- Add new organizers (teachers/admins only)
- Remove organizers (except when only one remains)
- Avatar-based display with role badges

**UI Components:**
- Organizers section with count badge
- "Add Organizer" button (primary blue style)
- Member cards with avatar, name, and role
- Remove button (× icon, red on hover) for non-creator organizers
- Modal dialog for selecting organizers from dropdown

### 2. Assignees Management (Users & Groups)
**What are Assignees?**
- Users and groups who are assigned the assignment
- Can be individuals (direct assignment)
- Can be groups (all group members get the assignment)

**Capabilities:**
- View all assigned users and groups
- Add users individually
- Add entire groups
- Remove user assignments
- Remove group assignments
- Visual distinction between direct users and groups

**UI Components:**
- Assignees section with combined count badge
- Two action buttons: "Assign User" and "Assign Group"
- Member cards for users (blue avatar with 👤 icon)
- Group cards (orange avatar with 👥 icon)
- Role labels: "Direct" for users, "Via Group • X members" for groups
- Remove buttons for all assignees
- Separate modal dialogs for user and group selection

### 3. Visual Design
**Following my-projects-tab Pattern:**
- Similar section layout and styling
- Consistent avatar design (circular, gradient backgrounds)
- Same member card structure
- Matching button styles and positioning
- Modal dialogs with overlay

**Color Coding:**
- Blue gradient: User avatars
- Orange gradient: Group avatars
- Red: Remove buttons
- Blue: Action buttons

**Icons:**
- 👨‍🏫 Organizers section
- 👑 Creator badge
- 🎯 Assignees section
- 👤 Direct user assignment
- 👥 Group assignment
- ➕ Add buttons
- × Remove buttons

## Backend API Endpoints

### Organizer Management
```
POST   /api/assignments/:id/add-organizer
DELETE /api/assignments/:id/remove-organizer/:organizer_id
GET    /api/assignments/:id/available-organizers
```

### Assignment Management
```
DELETE /api/assignments/:id/remove-user/:user_id
DELETE /api/assignments/:id/remove-group/:group_id
```

### Existing Endpoints (Updated)
```
POST   /api/assignments/:id/assign-user
POST   /api/assignments/:id/assign-group
GET    /api/assignments/:id/available-users
GET    /api/assignments/:id/available-groups
```

## Implementation Details

### Backend Changes
**New Routes (assignment_routes.py):**
1. `add_organizer` - Add teacher/admin as organizer
2. `remove_organizer` - Remove organizer (prevents removing last one)
3. `get_available_organizers` - Get teachers/admins not yet organizers
4. `remove_user_assignment` - Remove individual user assignment
5. `remove_group_assignment` - Remove group assignment

**Authorization:**
- Only existing organizers can add/remove other organizers
- Only organizers can add/remove user/group assignments
- Cannot remove the last organizer (prevents orphaned assignments)
- Only teachers/admins can be organizers

### Frontend Changes
**State Management (assignments-tab.jsx):**
```javascript
// Dialog states
showAddOrganizer, setShowAddOrganizer
showAssignUser, setShowAssignUser
showAssignGroup, setShowAssignGroup

// Selection states
selectedOrganizerId, setSelectedOrganizerId
selectedUserId, setSelectedUserId
selectedGroupId, setSelectedGroupId

// Data states
availableOrganizers, setAvailableOrganizers
availableUsers, setAvailableUsers
availableGroups, setAvailableGroups
```

**New Handlers:**
```javascript
// Organizer management
handleShowAddOrganizer()
handleAddOrganizer()
handleRemoveOrganizer(organizerId)

// User assignment
handleShowAssignUser()
handleAssignUser()
handleRemoveUserAssignment(userId)

// Group assignment
handleShowAssignGroup()
handleAssignGroup()
handleRemoveGroupAssignment(groupId)
```

**Service Methods (assignment-service.js):**
```javascript
addOrganizer(assignmentId, userId)
removeOrganizer(assignmentId, organizerId)
getAvailableOrganizers(assignmentId)
removeUserAssignment(assignmentId, userId)
removeGroupAssignment(assignmentId, groupId)
```

### UI Structure
```
Assignment Detail View
├── Header (title + edit/delete)
├── Info Section (description, dates)
├── Statistics Section (cards)
├── Organizers Section ← NEW
│   ├── Header (title + count + add button)
│   └── List
│       ├── Creator (with crown, no remove)
│       └── Other Organizers (with remove)
├── Assignees Section ← NEW
│   ├── Header (title + count + add user + add group)
│   └── List
│       ├── Direct Users (with remove)
│       └── Groups (with remove)
└── Submissions Section (existing)
```

### CSS Classes
**New Styles:**
- `.member-item` - Container for member/organizer cards
- `.member-avatar` - Circular avatar (blue gradient)
- `.group-avatar` - Circular avatar (orange gradient)
- `.member-info` - Name and role container
- `.member-name` - Bold name display
- `.member-role` - Lighter role/status text
- `.remove-button` - Circular × button (red)
- `.add-button-group` - Container for multiple add buttons
- `.dialog-content` - Modal content area

## User Workflows

### Adding an Organizer
1. Click "Add Organizer" button in Organizers section
2. Modal opens with dropdown of available teachers/admins
3. Select a teacher/admin from dropdown
4. Click "Add" button
5. Modal closes, organizer appears in list
6. Assignment updated with new organizer

### Removing an Organizer
1. Click × button next to organizer (not available for creator)
2. Confirmation dialog appears
3. Confirm removal
4. Organizer removed from list
5. Assignment updated

### Assigning a User
1. Click "Assign User" button in Assignees section
2. Modal opens with dropdown of available users
3. Select a user from dropdown
4. Click "Add" button
5. Modal closes, user appears in list with "Direct" label
6. Assignment updated

### Assigning a Group
1. Click "Assign Group" button in Assignees section
2. Modal opens with dropdown of available groups
3. Select a group from dropdown (shows member count)
4. Click "Add" button
5. Modal closes, group appears in list with "Via Group • X members"
6. Assignment updated, all group members now have access

### Removing Assignments
1. Click × button next to user or group
2. Confirmation dialog appears
3. Confirm removal
4. User/group removed from list
5. Assignment updated

## Data Flow

### On Component Load
1. Load assignments with full details (organizers, assignees)
2. Assignment model includes relationships:
   - `organizers` - List of User objects
   - `user_assignments` - List of AssignmentUser with nested User
   - `group_assignments` - List of AssignmentGroup with nested Group

### On Add Organizer
1. Fetch available organizers (GET)
2. Display in modal dropdown
3. User selects and confirms
4. POST request to add organizer
5. Response includes updated assignment
6. Update local state and refresh list

### On Remove
1. Confirmation prompt
2. DELETE request with IDs
3. Response includes updated assignment
4. Update local state and refresh list

## Permissions & Validation

### Backend Validation
- ✅ Only organizers can add/remove other organizers
- ✅ Only teachers/admins can be organizers
- ✅ Cannot remove creator
- ✅ Cannot remove last organizer
- ✅ Only organizers can manage assignments
- ✅ User/group must exist
- ✅ User/group not already assigned

### Frontend Validation
- ✅ Add buttons only shown in detail view
- ✅ Remove button disabled for creator organizer
- ✅ Add button disabled until selection made
- ✅ Confirmation prompts for removals
- ✅ Error messages on failure
- ✅ Loading states during operations

## Benefits

### For Teachers
1. **Collaborative Planning**: Multiple teachers can manage same assignment
2. **Flexible Assignment**: Mix individual students and whole groups
3. **Easy Management**: Visual interface with clear actions
4. **Granular Control**: Add/remove individuals or groups
5. **Clear Ownership**: Creator always visible and protected

### For Students
1. **Clear Visibility**: Know who manages the assignment
2. **Group Context**: See if assigned via group membership
3. **Accurate Tracking**: Only see assignments meant for them

### For Administrators
1. **Oversight**: See all organizers on assignments
2. **Flexibility**: Can be added as organizer when needed
3. **Audit Trail**: Assignment changes logged

## Testing Checklist

### Organizers
- [ ] Creator shown with crown icon
- [ ] Cannot remove creator
- [ ] Cannot remove last organizer
- [ ] Can add teacher as organizer
- [ ] Can add admin as organizer
- [ ] Cannot add student as organizer
- [ ] Can remove non-creator organizer
- [ ] Organizer count badge updates
- [ ] Available organizers filters out current ones

### User Assignments
- [ ] Can assign individual user
- [ ] Cannot assign same user twice
- [ ] Can remove user assignment
- [ ] User shown with "Direct" label
- [ ] User avatar displays correctly
- [ ] Available users filters out assigned ones

### Group Assignments
- [ ] Can assign group
- [ ] Cannot assign same group twice
- [ ] Can remove group assignment
- [ ] Group shown with "Via Group • X members" label
- [ ] Group avatar displays correctly (orange)
- [ ] Member count displays correctly
- [ ] Available groups filters out assigned ones

### UI/UX
- [ ] Sections appear in correct order
- [ ] Modal overlays work correctly
- [ ] Clicking outside modal closes it
- [ ] Confirmation prompts work
- [ ] Error messages display
- [ ] Success feedback provided
- [ ] Loading states show
- [ ] Touch targets are adequate (44px+)
- [ ] Responsive on tablets

### Integration
- [ ] Submissions section still works
- [ ] Statistics still calculate correctly
- [ ] Assignment list updates after changes
- [ ] Detail view refreshes properly
- [ ] All API endpoints respond correctly

## Future Enhancements

1. **Search/Filter**: Add search in dropdowns for large user/group lists
2. **Bulk Operations**: Add multiple users/groups at once
3. **Role Badges**: Show teacher/admin badges on organizers
4. **Transfer Ownership**: Allow transferring creator role
5. **Activity Log**: Show who added/removed whom and when
6. **Email Notifications**: Notify when added as organizer or assignee
7. **Group Expansion**: Show group members inline
8. **User Profiles**: Click user to see their profile/submissions
9. **Drag & Drop**: Reorder organizers/assignees
10. **Import from CSV**: Bulk import user assignments

## Related Files

### Backend
- `backend/app/routes/assignment_routes.py` - API endpoints
- `backend/app/models/assignments.py` - Database models

### Frontend
- `packages/scratch-gui/src/components/teacher-modal/assignments-tab.jsx` - Main component
- `packages/scratch-gui/src/lib/assignment-service.js` - API client
- `packages/scratch-gui/src/components/teacher-modal/teacher-modal.css` - Styles

### Documentation
- `backend/documentation/ASSIGNMENT_IMPLEMENTATION.md` - Implementation guide
- `backend/documentation/ASSIGNMENT_API_REFERENCE.md` - API reference
- `backend/documentation/ASSIGNMENT_DESIGN_UPDATE.md` - Design guide
