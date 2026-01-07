# Shared Modal Components

This directory contains reusable modal components that are used across multiple features in the application.

## Components

### AddUserModal

A unified modal for selecting and adding users. Used in:
- **Collaboration Manager**: Adding users to projects with READ permission (changeable later)
- **Teacher/Assignment Modal**: Assigning users to assignments

**Features:**
- Search functionality to filter users
- Visual user avatars
- Click to select interface
- Shows permission information (READ by default for collaboration)
- Clean, modern UI with hover states

**Usage:**

```jsx
import { AddUserModal } from '../shared-modals';

function MyComponent() {
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState([]);

    const handleAdd = (userId, permission) => {
        // permission will always be 'READ'
        console.log(`Adding user ${userId} with ${permission} permission`);
    };

    return (
        <>
            <button onClick={() => setShowModal(true)}>Add User</button>
            
            {showModal && (
                <AddUserModal
                    users={users}
                    onAdd={handleAdd}
                    onClose={() => setShowModal(false)}
                    intl={intl}
                    messages={messages}
                />
            )}
        </>
    );
}
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `users` | `Array<{id: number, username: string}>` | Yes | - | List of available users |
| `onAdd` | `function(userId, permission)` | Yes | - | Callback when user is added (permission is always 'READ') |
| `onClose` | `function()` | Yes | - | Callback to close the modal |
| `intl` | `object` | Yes | - | React Intl object |
| `messages` | `object` | No | - | Message definitions for FormattedMessage |
| `title` | `string` | No | 'Add User' | Modal title |
| `searchPlaceholder` | `string` | No | 'Search users...' | Search input placeholder |
| `noUsersMessage` | `string` | No | 'No users found' | Empty state message |
| `addButtonText` | `string` | No | 'Add' | Add button text |
| `cancelButtonText` | `string` | No | 'Cancel' | Cancel button text |

---

### AddGroupModal

A unified modal for selecting and adding groups. Used in:
- **Collaboration Manager**: Adding groups to projects with READ permission (changeable later)
- **Teacher/Assignment Modal**: Assigning groups to assignments

**Features:**
- List view of groups with member counts
- Visual group avatars (👥)
- Click to select interface
- Shows permission information (READ by default for collaboration)
- Clean, modern UI matching user modal

**Usage:**

```jsx
import { AddGroupModal } from '../shared-modals';

function MyComponent() {
    const [showModal, setShowModal] = useState(false);
    const [groups, setGroups] = useState([]);

    const handleAdd = (groupId, permission) => {
        // permission will always be 'READ'
        console.log(`Adding group ${groupId} with ${permission} permission`);
    };

    return (
        <>
            <button onClick={() => setShowModal(true)}>Add Group</button>
            
            {showModal && (
                <AddGroupModal
                    groups={groups}
                    onAdd={handleAdd}
                    onClose={() => setShowModal(false)}
                    intl={intl}
                    messages={messages}
                />
            )}
        </>
    );
}
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `groups` | `Array<{id: number, name: string, member_count?: number}>` | Yes | - | List of available groups |
| `onAdd` | `function(groupId, permission)` | Yes | - | Callback when group is added (permission is always 'READ') |
| `onClose` | `function()` | Yes | - | Callback to close the modal |
| `intl` | `object` | Yes | - | React Intl object |
| `messages` | `object` | No | - | Message definitions for FormattedMessage |
| `title` | `string` | No | 'Add Group' | Modal title |
| `noGroupsMessage` | `string` | No | 'No groups available' | Empty state message |
| `addButtonText` | `string` | No | 'Add' | Add button text |
| `cancelButtonText` | `string` | No | 'Cancel' | Cancel button text |
| `showMemberCount` | `boolean` | No | `true` | Whether to show member count |

---

## Design Philosophy

Both modals follow these principles:

1. **Simplified Selection**: Users/groups are selected via click, not dropdowns
2. **Default Permission**: Always adds with READ permission (for collaboration features)
3. **Post-Addition Editing**: Permissions can be changed after adding in the main view
4. **Consistent UX**: Both modals have similar UI patterns
5. **Reusability**: Single source of truth for user/group selection across the app

## Styling

The modals use `shared-modals.css` which includes:
- Modern card-based layout
- Smooth transitions and hover effects
- Accessible color contrasts
- Responsive sizing
- Consistent with Scratch design system

## Migration Notes

If you're using the old modal components:
- `collaboration-manager-modal/add-user-modal.jsx` → `shared-modals/add-user-modal.jsx`
- `collaboration-manager-modal/add-group-modal.jsx` → `shared-modals/add-group-modal.jsx`
- `teacher-modal/assign-user-modal.jsx` → `shared-modals/add-user-modal.jsx`
- `teacher-modal/assign-group-modal.jsx` → `shared-modals/add-group-modal.jsx`

The old export files (`modals.js`) have been updated to re-export from shared-modals for backward compatibility.

## Adding New Features

To add these modals to a new feature:

1. Import from shared-modals:
   ```jsx
   import { AddUserModal, AddGroupModal } from '../shared-modals';
   ```

2. Provide your user/group data and handle the callbacks

3. The modals handle their own internal state (search, selection)

4. Permission changes should be implemented in your main view after adding
