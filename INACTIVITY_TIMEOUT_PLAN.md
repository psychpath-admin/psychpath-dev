# Inactivity Timeout System with Unsaved Changes Protection

## Problem Statement

Users should be automatically logged out after 5 minutes of inactivity for security reasons, but we need to handle the case where they have unsaved changes to prevent data loss and provide a good user experience.

## Current State

**NO inactivity timeout system currently exists** - users remain logged in indefinitely, which is a security risk.

## Proposed Solution

### Multi-Tiered Approach:

#### **Tier 1: Warning System (Clean Pages)**
- After 4 minutes of inactivity: Show warning modal
- User has 60 seconds to stay logged in
- If no interaction: Auto-logout

#### **Tier 2: Grace Period (Dirty Pages)**
- If user has unsaved changes: Extend grace period
- Show prominent warning about unsaved changes
- Options: "Save & Logout", "Stay Logged In", "Discard & Logout"
- Activity tracking paused during decision

#### **Tier 3: Auto-Save Draft (Optional Enhancement)**
- Auto-save drafts to localStorage before logout
- On next login: Offer to restore unsaved work

## Implementation Details

### 1. **Activity Tracking Hook** (`useInactivityTimeout.ts`)

```typescript
interface InactivityConfig {
  timeoutMinutes: number // Default: 5
  warningMinutes: number // Default: 4
  checkInterval: number // Default: 10000ms (10s)
  onWarning: () => void
  onTimeout: () => void
  onActivity: () => void
}

// Track user activities:
- Mouse movement (throttled)
- Keyboard input
- Click events
- Scroll events (throttled)
- API calls (automatic activity)
```

### 2. **Dirty Form Detection** (`useDirtyForm.ts`)

```typescript
interface DirtyFormTracker {
  isDirty: boolean
  setDirty: (dirty: boolean) => void
  confirmNavigation: () => boolean
}

// Track changes in:
- Form inputs
- Textareas
- Select dropdowns
- File uploads
- Any data modification
```

### 3. **Inactivity Warning Modal** Component

**Clean Page Warning:**
- Title: "Still There?"
- Message: "You've been inactive for 4 minutes. You'll be logged out in 60 seconds for security."
- Buttons: "Stay Logged In" (primary), "Logout Now" (secondary)

**Dirty Page Warning:**
- Title: "Unsaved Changes Detected"
- Message: "You have unsaved changes and have been inactive. What would you like to do?"
- Highlight: List of pages/forms with unsaved changes
- Buttons: 
  - "Save & Logout" (primary)
  - "Stay Logged In" (secondary)
  - "Discard & Logout" (tertiary/danger)

### 4. **Integration Points**

#### Forms to Track:
1. **SectionADashboard** - DCC/CRA/ICRA forms
2. **SectionB** - Professional Development form
3. **SectionC** - Supervision form
4. **UserProfile** - Profile editing
5. **LogbookEditor** - Logbook submissions
6. **WeeklyLogbookEditor** - Weekly entries

#### Implementation Pattern:
```typescript
const { isDirty, setDirty, markClean } = useDirtyForm()
const { resetTimer } = useInactivityTimeout({
  timeoutMinutes: 5,
  hasDirtyForms: isDirty,
  onWarning: () => setShowInactivityWarning(true),
  onTimeout: handleInactivityLogout
})

// On form change
onChange={() => setDirty(true)}

// On successful save
onSave(() => markClean())
```

### 5. **localStorage Draft System** (Enhancement)

```typescript
interface DraftEntry {
  pageId: string
  formData: any
  timestamp: number
  userId: string
}

// Save draft before logout
const saveDraft = () => {
  localStorage.setItem(`draft_${pageId}_${userId}`, JSON.stringify({
    formData,
    timestamp: Date.now()
  }))
}

// On login, check for drafts
const checkDrafts = () => {
  const draft = localStorage.getItem(`draft_${pageId}_${userId}`)
  if (draft) {
    // Show restore modal
  }
}
```

### 6. **Backend Session Management**

- Django REST Framework token timeout: Currently indefinite
- Recommendation: Set reasonable token expiry (e.g., 8 hours)
- Refresh token rotation for extended sessions
- Backend logs logout reason (inactivity vs manual)

## User Experience Flow

### Scenario 1: Clean Page (No Unsaved Changes)
1. User inactive for 4 minutes
2. Warning modal appears: "Still there?"
3. 60-second countdown
4. User clicks "Stay Logged In" → Timer resets
5. OR countdown reaches 0 → Auto-logout → Redirect to login

### Scenario 2: Dirty Page (Unsaved Changes)
1. User inactive for 4 minutes
2. Warning modal appears with unsaved changes notice
3. Extended grace period (no auto-logout)
4. User must make explicit choice:
   - "Save & Logout" → Saves all forms → Logout
   - "Stay Logged In" → Timer resets → Continue working
   - "Discard & Logout" → Confirm modal → Discard → Logout

### Scenario 3: Auto-Save Draft (Future Enhancement)
1. Warning modal countdown reaches 0
2. Auto-save draft to localStorage
3. Logout
4. On next login: "You have unsaved work from your last session. Restore?"

## Security Considerations

1. **Token Refresh**: Activity should refresh auth tokens
2. **Session Hijacking**: Logout should invalidate all tokens
3. **Draft Storage**: Encrypt sensitive data in localStorage
4. **Multi-Tab**: Sync activity across browser tabs
5. **Privacy**: Clear drafts after 24 hours

## Accessibility

- ARIA live regions for countdown announcements
- Keyboard navigation for modals
- Screen reader friendly messages
- High contrast warning indicators
- Focus trap in warning modal

## Configuration

Admin-configurable settings:
- Inactivity timeout duration (default: 5 minutes)
- Warning threshold (default: 4 minutes)
- Draft retention period (default: 24 hours)
- Exempt pages (e.g., reading documentation)

## Testing Scenarios

1. User inactive on clean page → Auto-logout after warning
2. User inactive with unsaved form → Extended grace → Manual choice required
3. User moves mouse during countdown → Timer resets
4. User switches tabs → Activity continues tracking
5. Network disconnection during save → Handle gracefully
6. Multiple dirty forms → Track all, save all option

## Implementation Priority

### Phase 1 (High Priority):
- Basic inactivity tracking
- Warning modal for clean pages
- Auto-logout after timeout
- Integration with Section A, B, C forms

### Phase 2 (Medium Priority):
- Dirty form detection
- Extended grace period for unsaved changes
- Multi-option warning modal

### Phase 3 (Enhancement):
- Auto-save drafts to localStorage
- Draft restoration on login
- Cross-tab activity synchronization
- Admin configuration panel

## Notes

- Created: October 17, 2025
- Status: Planning Phase
- Priority: High (Security Requirement)
- Estimated Effort: Phase 1 (2-3 days), Phase 2 (2-3 days), Phase 3 (3-5 days)

