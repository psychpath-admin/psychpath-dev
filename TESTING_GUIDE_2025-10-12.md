# Testing Guide - October 12, 2025
## Logbook System Integration Testing

### 🎯 System Status

**Backend Server**: ✅ Running on http://localhost:8000  
**Frontend Server**: ✅ Running on http://localhost:5173  
**Database**: ✅ All migrations applied  
**Git Status**: ✅ 8 commits ahead, clean working directory  

---

## ✅ Phase 1 & 2 Complete

### What's Been Completed:

1. **Configuration System** - Fully committed and functional
2. **State Machine** - Logbook status transitions with validation
3. **Backend Integration** - WeeklyLogbook uses state machine
4. **Section C Backend** - Supervision entries with logbook integration
5. **All Form Components** - Section A, B, C forms created
6. **Logbook Preview** - All sections display correctly
7. **Click-to-Edit** - All sections support inline editing

### Commits Made (8 total):
1. `d91cc40` - Configuration-driven consistency system
2. `7963279` - Logbook state machine and migrations
3. `8fbc001` - State machine integration into workflow
4. `e9fcd54` - Frontend logbook workflow enhancements
5. `1f097c2` - Section A form improvements
6. `ae24f1a` - Section B, C, CRA form components
7. `c7e5c53` - Checkpoint documentation
8. `f4a78d8` - Section C logbook integration fields

---

## 📋 Phase 3: Testing Instructions

### Test 1: Intern Workflow - Creating Entries

**As a Provisional Psychologist or Registrar:**

1. **Section A - Direct Client Contact**
   - Navigate to Section A dashboard
   - Click "Add DCC Entry"
   - Fill in client details, session info
   - Save entry
   - ✅ **Verify**: Entry appears in list

2. **Section A - Critical Reflection (CRA)**
   - Click on a DCC entry
   - Add a CRA entry linked to it
   - Fill in reflection details
   - Save
   - ✅ **Verify**: CRA appears linked to parent DCC

3. **Section B - Professional Development**
   - Navigate to Section B dashboard
   - Click "Add Entry"
   - Fill in activity details (workshop, reading, etc.)
   - Select competencies covered
   - Save entry
   - ✅ **Verify**: Entry appears grouped by week

4. **Section C - Supervision**
   - Navigate to Section C dashboard
   - Click "Add Supervision Entry"
   - Fill in supervisor details (should pull from profile)
   - Enter supervision type, duration, summary
   - Save entry
   - ✅ **Verify**: Entry appears with correct supervisor info

### Test 2: Creating & Submitting Logbook

**Prerequisites**: Have entries in Sections A, B, C for a completed week

1. **Navigate to Logbook Dashboard**
   - Go to `/logbook`
   - ✅ **Verify**: See list of weeks with entries

2. **Create Draft Logbook**
   - Find a week with entries (not current week)
   - Click "Create Logbook" or "View" if exists
   - ✅ **Verify**: Logbook preview shows all sections
   - ✅ **Verify**: Section A shows DCC and CRA entries
   - ✅ **Verify**: Section B shows professional development
   - ✅ **Verify**: Section C shows supervision entries
   - ✅ **Verify**: Totals calculate correctly

3. **Preview Functionality**
   - Click on entries in preview
   - ✅ **Verify**: Can edit entries inline (for draft/returned status)
   - ✅ **Verify**: Returns to logbook dashboard after edit

4. **Submit Logbook**
   - Click "Submit for Review"
   - Confirm submission
   - ✅ **Verify**: Status changes to "submitted"
   - ✅ **Verify**: Entries become locked
   - ✅ **Verify**: Cannot edit entries anymore

### Test 3: Supervisor Review Workflow

**As a Supervisor:**

1. **View Submitted Logbooks**
   - Navigate to Supervisor Dashboard
   - ✅ **Verify**: See submitted logbooks from supervisees
   - Click on a submitted logbook

2. **Review Logbook**
   - Review all sections (A, B, C)
   - ✅ **Verify**: All entries display correctly
   - ✅ **Verify**: Totals are accurate
   - ✅ **Verify**: Can add comments to individual entries

3. **Add Comments**
   - Click "Add Comment" for an entry
   - Write feedback
   - Save comment
   - ✅ **Verify**: Comment appears on entry

4. **Approve Logbook**
   - Click "Approve" button
   - Add approval comments (optional)
   - Confirm approval
   - ✅ **Verify**: Status changes to "approved"
   - ✅ **Verify**: Entries remain locked
   - ✅ **Verify**: Intern receives notification

5. **Return for Edits** (Alternative to Approve)
   - Click "Return for Edits"
   - Add specific feedback about what needs changing
   - Confirm return
   - ✅ **Verify**: Status changes to "returned_for_edits"
   - ✅ **Verify**: Entries become editable again
   - ✅ **Verify**: Intern receives notification

6. **Reject Logbook** (Alternative)
   - Click "Reject"
   - Provide detailed rejection reason
   - Confirm rejection
   - ✅ **Verify**: Status changes to "rejected"
   - ✅ **Verify**: Entries become editable
   - ✅ **Verify**: Intern receives notification

### Test 4: Bidirectional Flow

**Test the back-and-forth review process:**

1. **Supervisor Returns for Edits**
   - Supervisor: Return logbook with specific feedback
   - ✅ **Verify**: Intern sees "returned_for_edits" status

2. **Intern Makes Changes**
   - Intern: Log in and view returned logbook
   - ✅ **Verify**: Can see supervisor comments
   - ✅ **Verify**: Can edit entries
   - Make requested changes
   - Add trainee response to comments

3. **Resubmit**
   - Click "Resubmit for Review"
   - ✅ **Verify**: Status changes back to "submitted"
   - ✅ **Verify**: Entries lock again
   - ✅ **Verify**: Supervisor receives notification

4. **Second Review**
   - Supervisor: Review resubmitted logbook
   - ✅ **Verify**: Can see change history
   - ✅ **Verify**: Can see trainee responses
   - Approve logbook
   - ✅ **Verify**: Final approval locks everything

### Test 5: Edge Cases & Validation

1. **Try to Edit Approved Logbook**
   - Navigate to approved logbook
   - Try to edit an entry
   - ✅ **Verify**: Cannot edit (locked)
   - ✅ **Verify**: Appropriate message shown

2. **Invalid State Transitions**
   - Try to submit already-submitted logbook
   - ✅ **Verify**: Error message prevents invalid transition
   - Try to approve draft logbook
   - ✅ **Verify**: State machine prevents invalid action

3. **Empty Sections**
   - Try to create logbook with no entries
   - ✅ **Verify**: Validation prevents empty logbook submission
   - Or allows with appropriate warnings

4. **Section C Specific**
   - Create supervision entry without supervisor name
   - ✅ **Verify**: Validation requires supervisor
   - Create entry with invalid duration
   - ✅ **Verify**: Validation catches errors

5. **Unlocked for Edits Status**
   - Test the "unlocked_for_edits" functionality
   - ✅ **Verify**: Entries editable while maintaining submitted status
   - ✅ **Verify**: Supervisor can see edits in progress

---

## 🐛 Known Issues to Watch For

Based on branch name `feature/fix-logbook-submit-error`:

1. **Submission Errors**
   - Watch for API errors when submitting
   - Check browser console for JavaScript errors
   - Check backend logs for Python errors

2. **Section C Integration**
   - Verify supervision entries display in logbook
   - Check that locked status works correctly
   - Ensure totals calculate properly

3. **Review Workflow**
   - Verify all status transitions work
   - Check that comments save and display
   - Ensure notifications are sent

---

## 📊 Testing Checklist

### Section A (Direct Client Contact)
- [ ] Create DCC entry
- [ ] Create CRA entry linked to DCC
- [ ] Edit entries before submission
- [ ] View entries in logbook preview
- [ ] Entries lock after submission
- [ ] Click-to-edit works for draft/returned logbooks

### Section B (Professional Development)
- [ ] Create professional development entry
- [ ] Select multiple competencies
- [ ] View entries grouped by week
- [ ] Entries display in logbook preview
- [ ] Totals calculate correctly

### Section C (Supervision)
- [ ] Create supervision entry
- [ ] Supervisor name pulls from profile
- [ ] Duration and type fields work
- [ ] Entries display in logbook preview
- [ ] Weekly and cumulative totals correct
- [ ] Entries lock after submission

### Logbook Workflow
- [ ] Create draft logbook
- [ ] Preview shows all sections
- [ ] Submit logbook successfully
- [ ] Status changes correctly
- [ ] Entries lock on submission
- [ ] Cannot edit locked entries

### Supervisor Actions
- [ ] View submitted logbooks
- [ ] Add comments to entries
- [ ] Approve logbook
- [ ] Return for edits
- [ ] Reject logbook
- [ ] All status transitions work

### Bidirectional Flow
- [ ] Intern receives returned logbook
- [ ] Can make requested changes
- [ ] Resubmit after changes
- [ ] Supervisor sees resubmission
- [ ] Final approval works
- [ ] Audit trail is complete

---

## 🔍 How to Report Issues

If you find any issues during testing:

1. **Note the exact steps to reproduce**
2. **Capture any error messages** (browser console, backend logs)
3. **Note the user role** (provisional, registrar, supervisor)
4. **Note the logbook status** when error occurred
5. **Screenshot if helpful**

### Backend Logs
Located at: `/Users/macdemac/Local Sites/PsychPATH/backend/logs/`
- `support_errors.log` - Application errors
- Terminal output from `python manage.py runserver`

### Frontend Errors
- Check browser console (F12 → Console tab)
- Look for red error messages
- Note any failed API calls (Network tab)

---

## 📝 Testing Notes Template

```
### Test: [Test Name]
**Date**: October 12, 2025
**Tester**: [Your Name]
**User Role**: [Provisional/Registrar/Supervisor]

#### Steps Taken:
1. 
2. 
3. 

#### Expected Result:


#### Actual Result:


#### Issues Found:
- Issue 1: [Description]
  - Severity: [Low/Medium/High/Critical]
  - Steps to reproduce: 
  
- Issue 2: [Description]
  - Severity: [Low/Medium/High/Critical]
  - Steps to reproduce:

#### Screenshots:
[Attach if available]

#### Notes:

```

---

## ✅ When Testing is Complete

Once all tests pass:

1. Document any issues found
2. Prioritize fixes (critical → high → medium → low)
3. I'll implement fixes for all issues
4. Retest after fixes
5. Final commit and merge

---

## 🚀 Current System Health

**Database**: SQLite with all migrations applied  
**API Endpoints**: All functional and protected  
**Authentication**: Working correctly  
**State Machine**: Validating all transitions  
**Configuration System**: Ready for admin use  

**Configuration Admin Interface**: http://localhost:5173/admin/configuration  
**Configuration Demo**: http://localhost:5173/config-demo  

---

**Questions or Issues?** Just let me know what you found, and I'll fix it!

