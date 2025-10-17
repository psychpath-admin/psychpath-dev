# Section B (Professional Development) - Test Plan

## Overview
This test plan covers all functionality for Section B (Professional Development) in PsychPATH, including entry creation, validation, error handling, and the help system integration completed on October 17, 2025.

## Test Environment
- **Frontend**: React/TypeScript (Vite)
- **Backend**: Django REST Framework
- **Browser**: Chrome, Firefox, Safari (latest versions)
- **User Roles**: Provisional Psychologist, Registrar Psychologist

---

## Test Categories

### 1. Help System & Error Overlay Tests

#### Test 1.1: Error Overlay Display - All Mandatory Fields Missing
**Priority**: HIGH  
**Status**: ✅ PASSED (Implemented Oct 17, 2025)

**Steps:**
1. Navigate to Section B (Professional Development)
2. Click "Create Activity" button
3. Leave ALL mandatory fields empty:
   - Activity Type: (default selected)
   - Date of Activity: (default today)
   - Duration in Minutes: (empty)
   - Activity Details: (empty)
   - Topics Covered: (empty)
   - Competencies: (none selected)
   - Reflection: (empty)
4. Click "Create Activity" button

**Expected Results:**
- ✅ Error overlay appears
- ✅ Title: "Unable to Save Entry"
- ✅ Specific validation errors listed for each empty field
- ✅ Buttons: "I understand" (primary) and "I Need More Help" (secondary)
- ✅ Red borders on ALL empty mandatory fields:
  - Duration in Minutes field
  - Activity Details textarea
  - Topics Covered textarea
  - Competencies selection container
  - Reflection textarea

#### Test 1.2: Invalid Duration - Exceeds Maximum
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Navigate to Section B
2. Click "Create Activity"
3. Fill all fields correctly EXCEPT:
   - Duration in Minutes: Enter `2000` (exceeds 1440 max)
4. Fill other mandatory fields with valid data
5. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Duration Minutes: Ensure this value is less than or equal to 1440"
- ✅ Duration field has red border
- ✅ Other fields do NOT have red borders

#### Test 1.3: Invalid Duration - Too Large Number
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Enter very large number in Duration: `60000000000000000000`
3. Fill other fields correctly
4. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Duration Minutes: A valid integer is required"
- ✅ Duration field has red border
- ✅ Clear explanation of what's wrong

#### Test 1.4: Single Mandatory Field Missing - Activity Details
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Fill all fields EXCEPT Activity Details (leave blank)
3. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Activity Details: This field may not be blank"
- ✅ ONLY Activity Details has red border
- ✅ Other valid fields do NOT have red borders

#### Test 1.5: Single Mandatory Field Missing - Topics Covered
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Fill all fields EXCEPT Topics Covered (leave blank)
3. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Topics Covered: This field may not be blank"
- ✅ ONLY Topics Covered textarea has red border

#### Test 1.6: No Competencies Selected
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Fill all fields EXCEPT Competencies (select none)
3. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message mentions competencies requirement
- ✅ Competencies selection container has red border

#### Test 1.7: No Reflection Entered
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Fill all fields EXCEPT Reflection (leave blank)
3. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Reflection: This field may not be blank"
- ✅ Reflection textarea has red border

#### Test 1.8: "I understand" Button Functionality
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Trigger any validation error (leave fields blank)
2. Click "Create Activity"
3. Error overlay appears
4. Click "I understand" button

**Expected Results:**
- ✅ Error overlay closes
- ✅ User returns to form
- ✅ Red borders remain on invalid fields
- ✅ User can correct errors and resubmit

#### Test 1.9: "I Need More Help" Button Functionality
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Trigger any validation error
2. Error overlay appears
3. Click "I Need More Help" button

**Expected Results:**
- ✅ Navigates to help page (new tab or same window)
- ✅ Error context passed as URL parameters
- ✅ Help page displays relevant error information
- ✅ Error details highlighted on help page

---

### 2. Form Validation Tests

#### Test 2.1: Valid Entry Creation - All Fields Correct
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Fill all fields with valid data:
   - Activity Type: "Workshop"
   - Date: Today's date
   - Duration: 120 minutes
   - Active Activity: "Yes"
   - Activity Details: "Internal Family Systems Workshop with Richard Schwartz"
   - Topics Covered: "IFS therapy, parts work, trauma-informed approaches"
   - Competencies: Select at least 1 (e.g., "Practices ethically")
   - Reflection: "Learned about the IFS model and how to identify client parts. Key takeaway: self-compassion is central to healing."
3. Click "Create Activity"

**Expected Results:**
- ✅ No error overlay appears
- ✅ Entry saves successfully
- ✅ Success message displayed
- ✅ Entry appears in dashboard list
- ✅ All red borders cleared (if any existed)
- ✅ Form closes/resets
- ✅ Entry shows correct data in list view

#### Test 2.2: Date Validation - Future Date
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Set Date of Activity to tomorrow's date
3. Fill other fields correctly
4. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error message: "Cannot create records for future dates"
- ✅ Date field highlighted or indicated as problematic
- ✅ Suggestion to select today or earlier

#### Test 2.3: Duration - Minimum Valid (1 minute)
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entry with Duration = 1 minute
2. Fill all other fields correctly
3. Submit

**Expected Results:**
- ✅ Entry saves successfully
- ✅ No validation errors

#### Test 2.4: Duration - Maximum Valid (1440 minutes)
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entry with Duration = 1440 minutes (24 hours)
2. Fill all other fields correctly
3. Submit

**Expected Results:**
- ✅ Entry saves successfully
- ✅ No validation errors
- ✅ Duration displays as "24h" or "1440 minutes"

#### Test 2.5: Duration Quick Links
**Priority**: LOW  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Click each quick duration link: 15min, 30min, 1hr, 2hr, 3hr, 4hr, 8hr
3. Verify each sets correct value

**Expected Results:**
- ✅ Each link sets the correct minute value
- ✅ Values: 15, 30, 60, 120, 180, 240, 480 minutes

---

### 3. Removed "Reviewed with Supervisor" Tests

#### Test 3.1: Field Not Present in Create Form
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Click "Create Activity"
2. Examine entire form

**Expected Results:**
- ✅ No "Reviewed with Supervisor" checkbox visible
- ✅ No "Reviewed in Supervision" field anywhere in form
- ✅ Form only shows required PD fields

#### Test 3.2: Field Not Present in Edit Form
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create a valid PD entry
2. Click Edit (✏️) on the entry
3. Examine edit form

**Expected Results:**
- ✅ No "Reviewed with Supervisor" checkbox
- ✅ No "Reviewed in Supervision" field
- ✅ Edit form matches create form (minus supervisor fields)

#### Test 3.3: No Supervision Filter in Dashboard
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Navigate to Section B dashboard
2. Examine all filter options
3. Check dashboard stats/metrics

**Expected Results:**
- ✅ No filter for "Reviewed with Supervisor"
- ✅ No "Reviewed" badge on entries
- ✅ No "Supervisor Reviews" metric card
- ✅ No supervision review percentage displayed

#### Test 3.4: Entry Display - No Review Status
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. View any PD entry in list view
2. Expand entry details

**Expected Results:**
- ✅ No "Reviewed" status shown
- ✅ No green checkmark for "Reviewed"
- ✅ No supervision review date
- ✅ Entry shows only core PD fields

---

### 4. CRUD Operations Tests

#### Test 4.1: Create Multiple Entries
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create 3 different PD entries with varying:
   - Activity types (Workshop, Webinar, Reading)
   - Durations (60, 120, 240 minutes)
   - Different dates
2. Verify all save successfully

**Expected Results:**
- ✅ All 3 entries save
- ✅ All appear in dashboard
- ✅ Sorted correctly by date
- ✅ Week totals update correctly

#### Test 4.2: Edit Existing Entry
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entry
2. Click Edit (✏️)
3. Modify Activity Details and Reflection
4. Save changes

**Expected Results:**
- ✅ Edit form pre-fills with existing data
- ✅ Changes save successfully
- ✅ Updated entry shows new data
- ✅ Updated timestamp reflects change

#### Test 4.3: Delete Entry
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entry
2. Click Delete (🗑️)
3. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Entry deletes successfully
- ✅ Entry removed from list
- ✅ Week totals update correctly
- ✅ Success message shown

#### Test 4.4: Cannot Edit Locked Entry
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entry
2. Submit logbook containing this entry
3. Logbook is approved (entry becomes locked)
4. Try to edit locked entry

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error: "Entry is locked"
- ✅ Explanation: "Part of approved logbook"
- ✅ User action: "Contact supervisor to unlock"
- ✅ Edit icon disabled or hidden for locked entries

#### Test 4.5: Cannot Delete Locked Entry
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Try to delete a locked entry

**Expected Results:**
- ✅ Error overlay appears
- ✅ Error: "Entry is locked"
- ✅ Clear explanation why deletion is blocked
- ✅ Delete icon disabled for locked entries

---

### 5. Dashboard & Filtering Tests

#### Test 5.1: Weekly Grouping
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries across multiple weeks
2. View dashboard

**Expected Results:**
- ✅ Entries grouped by week
- ✅ Week starting date shown (Monday)
- ✅ Week total duration calculated correctly
- ✅ Entries sorted within week by date (newest first)

#### Test 5.2: Date Range Filter
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries across 3 different weeks
2. Apply date filter: From [Week 2 Monday] To [Week 2 Sunday]
3. Verify only Week 2 entries shown

**Expected Results:**
- ✅ Only entries within date range visible
- ✅ Other entries hidden (not deleted)
- ✅ Clear filter button removes filter
- ✅ Totals recalculate for filtered view

#### Test 5.3: Activity Type Filter
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries with different activity types
2. Filter by "Workshop" only
3. Verify only workshops shown

**Expected Results:**
- ✅ Only Workshop entries visible
- ✅ Other activity types hidden
- ✅ Filter persists across page refreshes
- ✅ Clear filter resets view

#### Test 5.4: Search Functionality
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries with distinct topics
2. Search for specific term (e.g., "trauma")
3. Verify results match search term

**Expected Results:**
- ✅ Searches Activity Details field
- ✅ Searches Topics Covered field
- ✅ Case-insensitive search
- ✅ Partial match works
- ✅ Shows "No results" if no match

#### Test 5.5: Competency Filter
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries with different competencies
2. Filter by specific competency
3. Verify only entries with that competency shown

**Expected Results:**
- ✅ Multi-select competency filter works
- ✅ Shows entries matching ANY selected competency
- ✅ Filter indicator shows active filters
- ✅ Clear competency filter works

---

### 6. Metrics & Compliance Tests

#### Test 6.1: Total PD Hours Calculation
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create 3 entries: 60min, 120min, 180min
2. Check Total PD Hours metric

**Expected Results:**
- ✅ Total = 360 minutes = 6 hours
- ✅ Displays as "6h" or "6:00"
- ✅ Updates immediately after new entry
- ✅ Decreases when entry deleted

#### Test 6.2: Weekly Total Calculation
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create multiple entries in current week
2. Check "This Week" metric

**Expected Results:**
- ✅ Sums only current week entries
- ✅ Week = Monday to Sunday
- ✅ Updates immediately
- ✅ Resets on new week

#### Test 6.3: Active vs Passive Hours
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries with Active Activity = Yes (120min)
2. Create entries with Active Activity = No (60min)
3. Check active hours metric

**Expected Results:**
- ✅ Active hours = 120min
- ✅ Passive hours = 60min
- ✅ Total hours = 180min
- ✅ Percentage calculated correctly

#### Test 6.4: Unique Competencies Count
**Priority**: LOW  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create entries covering different competencies
2. Check unique competencies metric

**Expected Results:**
- ✅ Counts each competency only once
- ✅ Updates when new competency added
- ✅ Shows which competencies covered
- ✅ Highlights uncovered competencies

---

### 7. Field Highlighting Tests (Red Borders)

#### Test 7.1: Red Border Appears on Validation Error
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Submit form with empty mandatory field
2. Error overlay appears
3. Close error overlay

**Expected Results:**
- ✅ Red border appears on invalid field
- ✅ Red border persists after overlay closes
- ✅ Red border is clearly visible
- ✅ Border thickness appropriate (2-3px)

#### Test 7.2: Red Border Clears After Fix
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Field has red border from validation error
2. User enters valid data in field
3. User submits form again

**Expected Results:**
- ✅ Red border removed after successful save
- ✅ Or red border removed on field blur if valid
- ✅ No red borders on successfully saved entry

#### Test 7.3: Multiple Fields with Red Borders
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Leave 3 fields empty (Activity Details, Topics, Reflection)
2. Submit form
3. Observe all 3 fields

**Expected Results:**
- ✅ All 3 fields have red borders simultaneously
- ✅ Each border is distinct and visible
- ✅ Borders don't interfere with each other
- ✅ User can clearly identify all problem fields

#### Test 7.4: Red Border on Competencies Container
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Submit without selecting any competencies
2. Error appears
3. Observe competencies selection area

**Expected Results:**
- ✅ Red border on "Selected Competencies" container
- ✅ Border is visible and distinct
- ✅ User understands competency is required
- ✅ Border clears after selecting competency

---

### 8. Accessibility Tests

#### Test 8.1: Keyboard Navigation - Form
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Open form
2. Use Tab key to navigate through all fields
3. Use Enter to submit

**Expected Results:**
- ✅ Tab order is logical (top to bottom)
- ✅ All fields reachable by keyboard
- ✅ Focus indicators clearly visible
- ✅ Enter key submits form

#### Test 8.2: Keyboard Navigation - Error Overlay
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Trigger error overlay
2. Use Tab to navigate buttons
3. Use Enter to activate button

**Expected Results:**
- ✅ Focus trapped in modal
- ✅ Tab cycles through "I understand" and "I Need More Help"
- ✅ Esc key closes overlay
- ✅ Focus returns to form after close

#### Test 8.3: Screen Reader - Error Messages
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Trigger validation error
3. Listen to announcements

**Expected Results:**
- ✅ Error overlay title announced
- ✅ Error messages read aloud
- ✅ Field labels read with errors
- ✅ Button labels clear and descriptive

#### Test 8.4: Color Contrast - Red Borders
**Priority**: LOW  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Trigger red border validation
2. Check contrast with color contrast checker

**Expected Results:**
- ✅ Red border color has sufficient contrast with background
- ✅ Visible to users with color blindness
- ✅ Error messages don't rely solely on color
- ✅ Icons or text indicators accompany color

---

### 9. Edge Cases & Error Scenarios

#### Test 9.1: Network Error During Save
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Fill form with valid data
2. Disconnect network
3. Click "Create Activity"

**Expected Results:**
- ✅ Error overlay appears with network error message
- ✅ User data NOT lost
- ✅ "Retry" option available
- ✅ Clear guidance on what happened

#### Test 9.2: Session Timeout During Form Fill
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Start filling form
2. Wait for session to expire (or force logout)
3. Try to submit

**Expected Results:**
- ✅ Error overlay: "Session expired"
- ✅ Redirect to login with form data saved (if possible)
- ✅ Or clear message that data may be lost
- ✅ No confusing 401/403 errors

#### Test 9.3: Very Long Text in Fields
**Priority**: LOW  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Enter 5000+ characters in Activity Details
2. Enter 5000+ characters in Reflection
3. Submit

**Expected Results:**
- ✅ Fields accept long text (or show character limit)
- ✅ UI doesn't break with long text
- ✅ Text truncates gracefully in list view
- ✅ Full text visible in detail view

#### Test 9.4: Special Characters in Text Fields
**Priority**: LOW  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Enter special characters: `<>&"'`
2. Enter emojis: 😀🎉
3. Submit and verify

**Expected Results:**
- ✅ Special characters saved correctly
- ✅ No XSS vulnerabilities
- ✅ Text displays correctly in list
- ✅ Emojis supported (or gracefully handled)

---

### 10. Integration Tests

#### Test 10.1: PD Entry in Logbook Submission
**Priority**: HIGH  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entry
2. Navigate to Logbook page
3. Submit logbook including PD entry

**Expected Results:**
- ✅ PD entry appears in logbook preview
- ✅ Entry locks after submission
- ✅ Entry shows "Locked" badge
- ✅ Cannot edit/delete after lock

#### Test 10.2: PD Entry with Supervisor Comments
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entry
2. Submit logbook
3. Supervisor adds comment to PD entry
4. View entry as trainee

**Expected Results:**
- ✅ Supervisor comment visible on entry
- ✅ Trainee can add response
- ✅ Comment thread displays correctly
- ✅ Timestamps shown for each comment

#### Test 10.3: PD Hours in Dashboard Summary
**Priority**: MEDIUM  
**Status**: ⏳ NEEDS TESTING

**Steps:**
1. Create PD entries
2. Navigate to main Dashboard
3. Check PD hours summary card

**Expected Results:**
- ✅ PD hours shown in main dashboard
- ✅ Total matches Section B total
- ✅ Updates in real-time
- ✅ Link to Section B works

---

## Test Summary

### Priority Breakdown
- **HIGH Priority**: 15 tests
- **MEDIUM Priority**: 20 tests
- **LOW Priority**: 6 tests

### Status Overview
- **✅ PASSED**: 1 test (Error overlay implementation)
- **⏳ NEEDS TESTING**: 40 tests

---

## Testing Schedule

### Phase 1: Critical Path (Complete First)
1. All Help System tests (1.1 - 1.9)
2. Valid entry creation (2.1)
3. CRUD operations (4.1 - 4.5)
4. Field highlighting (7.1 - 7.4)

### Phase 2: Validation & Business Logic
1. Form validation (2.2 - 2.5)
2. Date validation
3. Duration validation
4. Metrics calculations (6.1 - 6.4)

### Phase 3: Features & UX
1. Dashboard & filtering (5.1 - 5.5)
2. Removed supervisor review (3.1 - 3.4)
3. Search functionality

### Phase 4: Quality & Edge Cases
1. Accessibility (8.1 - 8.4)
2. Edge cases (9.1 - 9.4)
3. Integration tests (10.1 - 10.3)

---

## Bug Tracking Template

When issues are found, document as follows:

**Bug ID**: [Auto-increment]  
**Test Case**: [Test number]  
**Severity**: Critical / High / Medium / Low  
**Summary**: [One-line description]  
**Steps to Reproduce**:  
1. Step 1  
2. Step 2  

**Expected**: [What should happen]  
**Actual**: [What actually happened]  
**Screenshots**: [If applicable]  
**Console Errors**: [If any]  
**Fix Status**: Open / In Progress / Fixed / Verified

---

## Notes

- All tests assume user is logged in as Provisional Psychologist
- Tests should be repeated for Registrar Psychologist role
- Tests should cover both desktop and mobile browsers
- Backend validation should match frontend validation
- Test data should be realistic (AHPRA-compliant scenarios)

## Change Log

- **2025-10-17**: Initial test plan created
- **2025-10-17**: Help system tests added (1.1-1.9)
- **2025-10-17**: Field highlighting tests added (7.1-7.4)
- **2025-10-17**: "Reviewed with Supervisor" removal tests added (3.1-3.4)

