# Assignment Modal Components Refactoring

## Summary

Refactored the assignment management modals into three reusable React components following the my-projects-tab pattern. Both user and group assignment modals now work consistently - they only handle selection and assignment without any permission configuration (assignments don't use permission levels like collaboration projects).

## Changes Made

### 1. Created Reusable Modal Components

#### `/packages/scratch-gui/src/components/teacher-modal/add-organizer-modal.jsx`
- Modal for adding organizers (teachers/admins) to an assignment
- Displays username and role in dropdown
- Only organizers can manage assignments

#### `/packages/scratch-gui/src/components/teacher-modal/assign-user-modal.jsx`
- Modal for assigning individual users to an assignment
- Simple user selection without permission configuration
- Users are assigned to work on the assignment (not given management permissions)

#### `/packages/scratch-gui/src/components/teacher-modal/assign-group-modal.jsx`
- Modal for assigning groups to an assignment
- Shows group name and member count
- Simple group selection without permission configuration
- All group members get access to submit to the assignment

### 2. Updated assignments-tab.jsx
- Added imports for the three new modal components
- Replaced inline modal JSX with reusable component calls
- Maintained all existing functionality and state management
- Cleaner, more maintainable code structure

## Key Differences from Collaboration Projects

Unlike the collaboration project system which uses READ/WRITE/ADMIN permissions:

1. **Assignments don't have permission levels** - Users are either:
   - Organizers (teachers/admins who manage the assignment)
   - Assignees (students who can submit to the assignment)

2. **Simpler data model**:
   - `AssignmentUser` - Just links assignment ↔ user (no permission field)
   - `AssignmentGroup` - Just links assignment ↔ group (no permission field)
   - `assignment_organizers` - M2M table for organizers

3. **Assignment workflow**:
   - Organizers create and manage assignments
   - Users/groups get assigned to work on them
   - Students submit their collaborative projects
   - Organizers grade submissions and can freeze/unfreeze projects

## Benefits

1. **Reusability** - Modals can be reused in other parts of the application
2. **Consistency** - All three modals follow the same pattern and structure
3. **Maintainability** - Changes to modal behavior only need to be made in one place
4. **Testability** - Individual components can be unit tested
5. **Clarity** - Separation of concerns makes code easier to understand

## Component API

### AddOrganizerModal
```jsx
<AddOrganizerModal
    isOpen={boolean}
    availableOrganizers={array}  // [{id, username, role}]
    selectedOrganizerId={string}
    onSelectOrganizer={function}  // (id) => void
    onAdd={function}              // () => void
    onCancel={function}           // () => void
    messages={object}             // i18n messages
/>
```

### AssignUserModal
```jsx
<AssignUserModal
    isOpen={boolean}
    availableUsers={array}        // [{id, username}]
    selectedUserId={string}
    onSelectUser={function}       // (id) => void
    onAssign={function}           // () => void
    onCancel={function}           // () => void
    messages={object}             // i18n messages
/>
```

### AssignGroupModal
```jsx
<AssignGroupModal
    isOpen={boolean}
    availableGroups={array}       // [{id, name, member_count}]
    selectedGroupId={string}
    onSelectGroup={function}      // (id) => void
    onAssign={function}           // () => void
    onCancel={function}           // () => void
    messages={object}             // i18n messages
/>
```

## Backend Integration

All three modals work with existing backend endpoints:
- `POST /api/assignments/:id/add-organizer` - Adds teacher/admin as organizer
- `POST /api/assignments/:id/assign-user` - Assigns user to assignment
- `POST /api/assignments/:id/assign-group` - Assigns group to assignment

No backend changes were required - the assignment system already handles assignments correctly without permission levels.
