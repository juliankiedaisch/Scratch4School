# Assignment UI Update - Layout Redesign

## Overview
The assignments tab has been redesigned to match the student-projects-tab layout, providing a consistent user experience with a two-column interface optimized for both desktop and tablet use.

## Changes Made

### 1. Layout Structure
**Before**: Single-column view with modal-based forms
**After**: Two-column layout with sidebar and content area

#### Left Sidebar (`styles.studentsPanel`)
- List of all assignments
- Assignment name as primary text
- Due date displayed below name
- Submission statistics (X/Y submitted, Z graded)
- Selected assignment highlighted
- "Create New Assignment" button at bottom
- Scrollable list when many assignments exist

#### Right Content Area (`styles.projectsPanel`)
- **Empty State**: "Select an assignment to view details"
- **Assignment Details View**:
  - Assignment name as header
  - Edit and Delete buttons in header
  - Assignment information section (description, created date, due date)
  - Statistics section (total assigned, submitted, graded) in card format
  - Submissions list with freeze/unfreeze controls
- **Create/Edit Form View**:
  - Form replaces detail view (not modal)
  - Name, description, due date fields
  - Multi-select for groups
  - Save and Cancel buttons

### 2. State Management Updates

#### New State Variables
- `isCreating`: Boolean - tracks if creating new assignment
- `isEditing`: Boolean - tracks if editing existing assignment  
- `loadingSubmissions`: Boolean - tracks submission loading state

#### Removed State
- `showCreateForm`: Replaced by `isCreating`

### 3. Handler Functions

#### New Handlers
- `handleStartCreate()`: Initiates create mode, resets form
- `handleStartEdit()`: Initiates edit mode, loads assignment data into form
- `handleCancelEdit()`: Exits create/edit mode, returns to detail view
- `handleUpdateAssignment()`: Saves edited assignment

#### Updated Handlers
- `handleCreateAssignment()`: Now auto-selects newly created assignment
- `handleSelectAssignment()`: Renamed from `handleViewSubmissions`, resets edit states
- `loadSubmissions()`: Added loading state management

### 4. Component Updates

#### AssignmentsTab (Main Component)
- Removed modal-based UI
- Implemented two-column layout
- Uses existing CSS classes from student-projects-tab:
  - `styles.modalLayout`: Container for two-column layout
  - `styles.studentsPanel`: Left sidebar
  - `styles.projectsPanel`: Right content area
  - `styles.studentCard`: Individual assignment items
  - `styles.memberCard`: Submission cards
  - `styles.formGroup`, `styles.formInput`: Form styling
  - `styles.primaryButton`, `styles.secondaryButton`: Action buttons

#### SubmissionCard (Sub-component)
- Redesigned to match member card style
- Header shows student name, project name, metadata
- Actions (freeze/unfreeze, grade) in button group
- Inline grading form when clicked
- Uses emojis for visual indicators:
  - 📦 Project name
  - 📅 Submission date
  - 🔒 Frozen status
  - ⭐ Grade (if graded)

#### Removed Components
- `AssignmentCard`: No longer needed (assignments shown inline in sidebar)

### 5. CSS Reuse
All styling reuses existing classes from `teacher-modal.css`:
- Layout: `modalLayout`, `studentsPanel`, `projectsPanel`
- Cards: `studentCard`, `memberCard`, `selectedStudent`
- Forms: `formGroup`, `formInput`, `formTextarea`, `formSelect`, `formActions`
- Buttons: `primaryButton`, `secondaryButton`, `createButton`, `editButton`, `deleteButton`
- Sections: `infoSection`, `sectionTitle`, `infoRow`, `statsGrid`, `statCard`
- States: `loadingContainer`, `spinner`, `errorContainer`, `emptyContainer`

No new CSS needed - fully tablet-responsive out of the box.

### 6. User Flow

#### Creating an Assignment
1. Click "Create New Assignment" button at bottom of sidebar
2. Right panel shows blank form
3. Fill in name (required), description, due date, select groups
4. Click "Save" → Assignment created and auto-selected
5. Detail view shows new assignment with 0 submissions

#### Viewing Assignment Details
1. Click assignment in sidebar
2. Right panel shows:
   - Assignment metadata
   - Statistics cards
   - List of all submissions
3. Can edit or delete from header buttons

#### Managing Submissions
1. Select assignment from sidebar
2. Scroll to submissions section in right panel
3. Each submission shows:
   - Student name and project
   - Submission date and frozen status
   - Current grade (if graded)
   - Freeze/Unfreeze button
   - Grade button (shows form inline)
4. Use "Freeze All" or "Unfreeze All" for bulk operations

#### Grading a Submission
1. Click "Grade" button on submission card
2. Inline form appears below submission header
3. Enter grade (0-100) and optional feedback
4. Click "Submit Grade" or "Cancel"
5. Grade saved and displayed in submission metadata

## Technical Details

### Props Changes
- `SubmissionCard` now receives `messages` object instead of `intl`
- Removed `AssignmentCard` component entirely

### API Interactions
No changes to backend API - all endpoints remain the same:
- GET `/api/assignments` - Load all assignments
- POST `/api/assignments` - Create assignment
- PUT `/api/assignments/:id` - Update assignment
- DELETE `/api/assignments/:id` - Delete assignment
- GET `/api/assignments/:id/submissions` - Load submissions
- POST `/api/assignments/freeze/:id` - Freeze submission
- POST `/api/assignments/unfreeze/:id` - Unfreeze submission
- POST `/api/assignments/freeze-all/:id` - Freeze all submissions
- POST `/api/assignments/unfreeze-all/:id` - Unfreeze all submissions
- PUT `/api/assignments/grade/:id` - Grade submission

### Responsive Design
- Layout automatically adjusts for tablets (CSS media queries in teacher-modal.css)
- Sidebar scrolls independently from content area
- Forms stack vertically on smaller screens
- Touch-friendly button sizes
- No horizontal scrolling required

## Benefits

### User Experience
1. **Consistency**: Matches student-projects-tab interface familiar to users
2. **Efficiency**: No modal popups - all actions inline
3. **Clarity**: Clear separation of list vs. details
4. **Speed**: Fewer clicks to perform actions
5. **Context**: Always see assignment list while viewing details

### Developer Benefits
1. **Maintainability**: Reuses existing CSS - no duplication
2. **Simplicity**: Removed unnecessary component (AssignmentCard)
3. **Clarity**: Clear state management with separate create/edit modes
4. **Extensibility**: Easy to add new sections to detail view

## Testing Checklist

- [ ] Create new assignment - form appears in right panel
- [ ] Cancel create - returns to empty state
- [ ] Save new assignment - auto-selects and shows details
- [ ] Select assignment - shows details with statistics
- [ ] Edit assignment - form pre-filled with data
- [ ] Save edited assignment - updates and returns to detail view
- [ ] Delete assignment - removes from list, returns to empty state
- [ ] View submissions - loads and displays all submissions
- [ ] Freeze/Unfreeze individual submission - updates status
- [ ] Freeze/Unfreeze all submissions - updates all statuses
- [ ] Grade submission - form appears inline
- [ ] Submit grade - updates submission display
- [ ] Cancel grade - closes form without saving
- [ ] Tablet view - layout adjusts properly
- [ ] Long assignment names - truncate/wrap appropriately
- [ ] Many assignments - sidebar scrolls
- [ ] Many submissions - content area scrolls independently

## Browser Compatibility
Same as student-projects-tab:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations
1. No group management UI yet (groups must exist first)
2. Cannot assign to individual users (only groups)
3. No search/filter for assignments or submissions
4. No export functionality for grades
5. No bulk grading interface

## Future Enhancements
1. Add search/filter for assignments
2. Add filter for submissions (by status, grade, etc.)
3. Add export grades as CSV
4. Add assignment duplication
5. Add assignment templates
6. Add rich text editor for descriptions
7. Add file attachments to assignments
8. Add submission comments/discussion
9. Add assignment analytics dashboard
10. Add email notifications for submissions

## Related Documentation
- [Assignment Implementation Guide](./ASSIGNMENT_IMPLEMENTATION.md)
- [Assignment API Reference](./ASSIGNMENT_API_REFERENCE.md)
- [Student Projects Tab (reference)](../../packages/scratch-gui/src/components/teacher-modal/student-projects-tab.jsx)
- [Teacher Modal CSS](../../packages/scratch-gui/src/components/teacher-modal/teacher-modal.css)
