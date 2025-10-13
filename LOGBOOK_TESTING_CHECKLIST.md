# Logbook Review Process Testing Checklist

**Version:** 1.0  
**Date:** 2025-10-12  
**System Status:** Dashboard standardization complete, ready for comprehensive logbook review testing

## Table of Contents

1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Core State Transition Tests](#2-core-state-transition-tests)
3. [Entry Locking Tests](#3-entry-locking-tests)
4. [Data Integrity Tests](#4-data-integrity-tests)
5. [Supervisor Workflow Tests](#5-supervisor-workflow-tests)
6. [Edge Cases & Error Handling](#6-edge-cases--error-handling)
7. [UI/UX Verification](#7-uiux-verification)
8. [API Testing](#8-api-testing)
9. [Quick Reference](#9-quick-reference)
10. [Testing Summary](#10-testing-summary)

---

## 1. Pre-Testing Setup

### Test User Accounts
- **Primary Trainee:** `intern1.demo@cymp.com.au` / `demo123` (PROVISIONAL - Phil O'Brien)
- **Primary Supervisor:** `supervisor.demo@cymp.com.au` / `demo123` (SUPERVISOR - Brett Mackie)
- **Alternative Trainee:** `intern2.demo@cymp.com.au` / `demo123` (PROVISIONAL - Maryam Baboli)
- **Alternative Trainee:** `intern3.demo@cymp.com.au` / `demo123` (PROVISIONAL - Intern Three)
- **Registrar:** `registrar.demo@cymp.com.au` / `demo123` (REGISTRAR)
- **Alternative Registrar:** `registrar1.demo@cymp.com.au` / `demo123` (REGISTRAR - Registrar One)

### Data Preparation
- **Test Week:** Use week starting **2025-01-13** (Monday) for new tests
- **Existing Data:** Week 2024-09-02 has approved logbook for reference testing
- **Browser:** Clear cache and cookies before testing
- **Servers:** Ensure backend (port 8000) and frontend (port 5173) are running

### Prerequisites
- [ ] Backend server running on http://localhost:8000
- [ ] Frontend server running on http://localhost:5173
- [ ] All test users can log in successfully
- [ ] Supervision relationship exists between trainee and supervisor
- [ ] Browser cache cleared

---

## 2. Core State Transition Tests

### Test 1: Create Draft Logbook
**Initial State:** No logbook for test week  
**Action:** Create logbook with entries, save as draft  
**Expected Result:** Logbook created with status 'draft', entries remain unlocked

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1.1 | Login as trainee | Successful login | ⬜ | |
| 1.2 | Navigate to Logbook Dashboard | Week shows "No logbook" | ⬜ | |
| 1.3 | Create entries in Section A, B, C | Entries created successfully | ⬜ | |
| 1.4 | Create logbook, save as draft | Status: 'draft', entries unlocked | ⬜ | |
| 1.5 | Verify database | WeeklyLogbook created, status='draft' | ⬜ | |

**Database Verification:**
```python
# Django shell command
WeeklyLogbook.objects.filter(week_start_date='2025-01-13').first()
```

---

### Test 2: Submit Draft Logbook (draft → submitted)
**Initial State:** Draft logbook exists  
**Action:** Submit logbook for review  
**Expected Result:** Status changes to 'submitted', entries locked, supervisor notified

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 2.1 | Edit existing draft logbook | Draft loads successfully | ⬜ | |
| 2.2 | Submit logbook | Status: 'submitted', success message | ⬜ | |
| 2.3 | Check Section A entries | All entries show locked badge | ⬜ | |
| 2.4 | Check Section B entries | All entries show locked badge | ⬜ | |
| 2.5 | Check Section C entries | All entries show locked badge | ⬜ | |
| 2.6 | Verify database | Status='submitted', entries.locked=True | ⬜ | |
| 2.7 | Check audit log | Entry created for submission | ⬜ | |

**Database Verification:**
```python
# Check logbook status
logbook = WeeklyLogbook.objects.filter(week_start_date='2025-01-13').first()
print(f"Status: {logbook.status}, Submitted: {logbook.submitted_at}")

# Check entry locking
from section_a.models import SectionAEntry
SectionAEntry.objects.filter(week_starting='2025-01-13').values('id', 'locked')
```

---

### Test 3: Supervisor Reviews Submitted Logbook
**Initial State:** Logbook submitted by trainee  
**Action:** Supervisor views submitted logbook  
**Expected Result:** Logbook appears in supervisor queue, details visible

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 3.1 | Login as supervisor | Successful login | ⬜ | |
| 3.2 | Navigate to Supervisor Dashboard | Logbook appears in queue | ⬜ | |
| 3.3 | View logbook details | All sections and entries visible | ⬜ | |
| 3.4 | Check totals calculation | Weekly and cumulative totals correct | ⬜ | |
| 3.5 | Verify entry details | All entry information displayed | ⬜ | |

---

### Test 4: Supervisor Approves Logbook (submitted → approved)
**Initial State:** Logbook submitted for review  
**Action:** Supervisor approves logbook  
**Expected Result:** Status changes to 'approved', entries permanently locked

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 4.1 | Supervisor adds approval comment | Comment saved successfully | ⬜ | |
| 4.2 | Click "Approve Logbook" | Status: 'approved', success message | ⬜ | |
| 4.3 | Verify trainee view | Logbook shows approved status | ⬜ | |
| 4.4 | Check entry locking | All entries remain locked | ⬜ | |
| 4.5 | Verify database | Status='approved', reviewed_by set | ⬜ | |
| 4.6 | Check audit log | Approval entry created | ⬜ | |

**Database Verification:**
```python
logbook = WeeklyLogbook.objects.filter(week_start_date='2025-01-13').first()
print(f"Status: {logbook.status}, Reviewed by: {logbook.reviewed_by}")
```

---

### Test 5: Supervisor Rejects Logbook (submitted → rejected)
**Initial State:** New submitted logbook (use different week)  
**Action:** Supervisor rejects logbook  
**Expected Result:** Status changes to 'rejected', entries unlocked for resubmission

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 5.1 | Create new submitted logbook | Status: 'submitted' | ⬜ | |
| 5.2 | Supervisor adds rejection comment | Comment saved successfully | ⬜ | |
| 5.3 | Click "Reject Logbook" | Status: 'rejected', success message | ⬜ | |
| 5.4 | Verify trainee view | Logbook shows rejected status | ⬜ | |
| 5.5 | Check entry locking | Entries unlocked for editing | ⬜ | |
| 5.6 | Verify database | Status='rejected' | ⬜ | |

---

### Test 6: Supervisor Returns for Edits (submitted → returned_for_edits)
**Initial State:** Submitted logbook  
**Action:** Supervisor returns logbook for edits  
**Expected Result:** Status changes to 'returned_for_edits', entries remain locked until unlock granted

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.1 | Supervisor adds return comment | Comment saved successfully | ⬜ | |
| 6.2 | Click "Return for Edits" | Status: 'returned_for_edits' | ⬜ | |
| 6.3 | Verify trainee view | Shows return status and comments | ⬜ | |
| 6.4 | Check entry locking | Entries still locked | ⬜ | |
| 6.5 | Trainee requests unlock | Unlock request created | ⬜ | |

---

### Test 7: Trainee Resubmits After Return (returned_for_edits → submitted)
**Initial State:** Logbook returned for edits, unlocked  
**Action:** Trainee makes edits and resubmits  
**Expected Result:** Status changes to 'submitted', entries locked again

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 7.1 | Trainee edits entries | Edits saved successfully | ⬜ | |
| 7.2 | Resubmit logbook | Status: 'submitted' | ⬜ | |
| 7.3 | Check entry locking | Entries locked again | ⬜ | |
| 7.4 | Verify supervisor queue | Appears in supervisor queue | ⬜ | |

---

### Test 8: Trainee Resubmits After Rejection (rejected → submitted)
**Initial State:** Rejected logbook  
**Action:** Trainee makes changes and resubmits  
**Expected Result:** Status changes to 'submitted', entries locked

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 8.1 | Trainee edits rejected logbook | Edits allowed | ⬜ | |
| 8.2 | Resubmit logbook | Status: 'submitted' | ⬜ | |
| 8.3 | Check entry locking | Entries locked | ⬜ | |
| 8.4 | Verify supervisor queue | Appears in queue | ⬜ | |

---

## 3. Entry Locking Tests

### Section A Entry Locking
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 3A.1 | Submit logbook with Section A entries | All DCC entries locked | ⬜ | |
| 3A.2 | Check locked badge display | Red "🔒 Locked" badge visible | ⬜ | |
| 3A.3 | Try to edit locked DCC entry | Error message via help system | ⬜ | |
| 3A.4 | Check edit button state | Button disabled with tooltip | ⬜ | |
| 3A.5 | Check delete button state | Button disabled with tooltip | ⬜ | |
| 3A.6 | Verify CRA inheritance | CRA entries inherit DCC lock status | ⬜ | |
| 3A.7 | Try to edit locked CRA | Error message via help system | ⬜ | |

### Section B Entry Locking
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 3B.1 | Submit logbook with Section B entries | All PD entries locked | ⬜ | |
| 3B.2 | Check locked badge display | Red "🔒 Locked" badge visible | ⬜ | |
| 3B.3 | Try to edit locked PD entry | Error message via help system | ⬜ | |
| 3B.4 | Check button states | Edit/delete buttons disabled | ⬜ | |

### Section C Entry Locking
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 3C.1 | Submit logbook with Section C entries | All supervision entries locked | ⬜ | |
| 3C.2 | Check locked badge display | Red "🔒 Locked" badge visible | ⬜ | |
| 3C.3 | Try to edit locked entry | Error message via help system | ⬜ | |
| 3C.4 | Check button states | Edit/delete buttons disabled | ⬜ | |

---

## 4. Data Integrity Tests

### Entry Association Verification
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 4.1 | Verify Section A entry IDs | Correct entries in section_a_entry_ids | ⬜ | |
| 4.2 | Verify Section B entry IDs | Correct entries in section_b_entry_ids | ⬜ | |
| 4.3 | Verify Section C entry IDs | Correct entries in section_c_entry_ids | ⬜ | |
| 4.4 | Check week boundary | Only entries for correct week included | ⬜ | |
| 4.5 | Verify cross-week entries | Sunday entries in correct week | ⬜ | |

### Totals Calculation Verification
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 4.6 | Check Section A weekly total | Matches sum of all Section A entries | ⬜ | |
| 4.7 | Check Section B weekly total | Matches sum of all Section B entries | ⬜ | |
| 4.8 | Check Section C weekly total | Matches sum of all Section C entries | ⬜ | |
| 4.9 | Check DCC vs CRA breakdown | Separate totals for DCC and CRA | ⬜ | |
| 4.10 | Check cumulative totals | Correct sum up to submission week | ⬜ | |

**Database Verification:**
```python
# Verify totals calculation
logbook = WeeklyLogbook.objects.filter(week_start_date='2025-01-13').first()
totals = logbook.calculate_section_totals()
print(f"Section A: {totals['section_a']['weekly_hours']}")
print(f"Section B: {totals['section_b']['weekly_hours']}")
print(f"Section C: {totals['section_c']['weekly_hours']}")
```

### Audit Trail Verification
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 4.11 | Check submission audit entry | Entry created with correct user/role | ⬜ | |
| 4.12 | Check approval audit entry | Entry created with supervisor info | ⬜ | |
| 4.13 | Check comment audit entries | Entries for each comment added | ⬜ | |
| 4.14 | Verify timestamps | All timestamps recorded correctly | ⬜ | |

---

## 5. Supervisor Workflow Tests

### Supervisor Dashboard
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 5.1 | View supervisor queue | Submitted logbooks visible | ⬜ | |
| 5.2 | Filter by 'submitted' status | Only submitted logbooks shown | ⬜ | |
| 5.3 | Filter by 'approved' status | Only approved logbooks shown | ⬜ | |
| 5.4 | Filter by 'all' status | All logbooks shown | ⬜ | |
| 5.5 | Sort by submission date | Most recent first | ⬜ | |

### Comment System
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 5.6 | Add general logbook comment | Comment saved and displayed | ⬜ | |
| 5.7 | Add Section A comment | Section-specific comment saved | ⬜ | |
| 5.8 | Add Section B comment | Section-specific comment saved | ⬜ | |
| 5.9 | Add Section C comment | Section-specific comment saved | ⬜ | |
| 5.10 | Add entry-specific comment | Entry-specific comment saved | ⬜ | |
| 5.11 | View comment threads | All comments displayed correctly | ⬜ | |

### Review Actions
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 5.12 | Approve with comments | Status: 'approved', comments saved | ⬜ | |
| 5.13 | Reject with comments | Status: 'rejected', comments saved | ⬜ | |
| 5.14 | Return for edits with comments | Status: 'returned_for_edits' | ⬜ | |
| 5.15 | Verify notification sent | Trainee receives notification | ⬜ | |

---

## 6. Edge Cases & Error Handling

### Supervisor Assignment Issues
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.1 | Submit without supervisor assigned | Error: "You must have a principal supervisor" | ⬜ | |
| 6.2 | Submit with unaccepted relationship | Error: "Your supervisor relationship must be accepted" | ⬜ | |
| 6.3 | Submit with pending relationship | Error: "Your supervisor relationship must be accepted" | ⬜ | |

### Data Edge Cases
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.4 | Submit same week twice | Old draft deleted, new logbook created | ⬜ | |
| 6.5 | Submit logbook with no Section A | Empty section_a_entry_ids, totals = 0 | ⬜ | |
| 6.6 | Submit logbook with no Section B | Empty section_b_entry_ids, totals = 0 | ⬜ | |
| 6.7 | Submit logbook with no Section C | Empty section_c_entry_ids, totals = 0 | ⬜ | |
| 6.8 | Submit logbook with no entries | All entry lists empty, totals = 0 | ⬜ | |

### Locking Edge Cases
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.9 | Try to edit locked DCC entry | Error message via help system | ⬜ | |
| 6.10 | Try to edit locked CRA entry | Error message via help system | ⬜ | |
| 6.11 | Try to delete locked entry | Error message via help system | ⬜ | |
| 6.12 | Try to add CRA to locked DCC | Error message via help system | ⬜ | |

### Cross-Week Entry Tests
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.13 | Create entry for Sunday | Entry belongs to next Monday's week | ⬜ | |
| 6.14 | Submit logbook with Sunday entry | Entry included in correct week logbook | ⬜ | |
| 6.15 | Verify week calculation | Sunday 2025-01-12 → week starting 2025-01-13 | ⬜ | |

---

## 7. UI/UX Verification

### Dashboard Consistency
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 7.1 | Check Section A dashboard | Weekly grouping by default | ⬜ | |
| 7.2 | Check Section B dashboard | Weekly grouping by default | ⬜ | |
| 7.3 | Check Section C dashboard | Weekly grouping by default | ⬜ | |
| 7.4 | Verify button styles | Circular icon-only buttons in top-right | ⬜ | |
| 7.5 | Check expand/collapse | ChevronDown (expand) / ChevronUp (collapse) | ⬜ | |
| 7.6 | Verify locked badges | Red "🔒 Locked" badges consistent | ⬜ | |

### Visual Indicators
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 7.7 | Check entry type badges | DCC/ICRA/CRA/PD/SUP badges consistent | ⬜ | |
| 7.8 | Check disabled button styling | Opacity 50%, cursor not-allowed | ⬜ | |
| 7.9 | Check tooltips | Proper tooltips on disabled buttons | ⬜ | |
| 7.10 | Check error messages | Help system integration working | ⬜ | |

### Weekly Organization
| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 7.11 | Verify week headers | Week starting date displayed | ⬜ | |
| 7.12 | Check weekly totals | Section totals per week displayed | ⬜ | |
| 7.13 | Test expand/collapse weeks | Weeks can be expanded/collapsed | ⬜ | |
| 7.14 | Check week sorting | Weeks sorted by date (newest first) | ⬜ | |

---

## 8. API Testing

### Key API Endpoints
| Endpoint | Method | Purpose | Expected Code | Test Status |
|----------|--------|---------|---------------|-------------|
| `/api/logbook/create/` | POST | Create/submit logbook | 200/201 | ⬜ |
| `/api/logbook/dashboard/` | GET | List logbooks | 200 | ⬜ |
| `/api/logbook/{id}/` | GET | Get logbook details | 200 | ⬜ |
| `/api/logbook/{id}/approve/` | POST | Approve logbook | 200 | ⬜ |
| `/api/logbook/{id}/reject/` | POST | Reject logbook | 200 | ⬜ |
| `/api/logbook/{id}/return-for-edits/` | POST | Return for edits | 200 | ⬜ |
| `/api/logbook/{id}/audit-logs/` | GET | View audit trail | 200 | ⬜ |
| `/api/logbook/{id}/valid-actions/` | GET | Get allowed transitions | 200 | ⬜ |
| `/api/supervisor/logbooks/` | GET | Supervisor queue | 200 | ⬜ |
| `/api/logbook/{id}/comments/` | GET/POST | Comment threads | 200 | ⬜ |

### Sample API Commands
```bash
# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"intern4.demo@cymp.com.au","password":"demo123"}' \
  | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

# Create logbook
curl -X POST http://localhost:8000/api/logbook/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"week_start_date":"2025-01-13","save_as_draft":false}'

# Get logbook dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/logbook/dashboard/
```

---

## 9. Quick Reference

### Test User Credentials
- **Primary Trainee:** `intern1.demo@cymp.com.au` / `demo123` (Phil O'Brien)
- **Primary Supervisor:** `supervisor.demo@cymp.com.au` / `demo123` (Brett Mackie)
- **Alternative Trainee:** `intern2.demo@cymp.com.au` / `demo123` (Maryam Baboli)
- **Alternative Trainee:** `intern3.demo@cymp.com.au` / `demo123` (Intern Three)
- **Registrar:** `registrar.demo@cymp.com.au` / `demo123`
- **Alternative Registrar:** `registrar1.demo@cymp.com.au` / `demo123` (Registrar One)

### Database Queries
```python
# Django shell commands
from logbook_app.models import WeeklyLogbook, LogbookAuditLog
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry

# Check logbook status
WeeklyLogbook.objects.filter(week_start_date='2025-01-13').first()

# Check entry locking
SectionAEntry.objects.filter(week_starting='2025-01-13').values('id', 'locked')

# Check audit trail
LogbookAuditLog.objects.filter(logbook_id=123).order_by('-timestamp')
```

### Common URLs
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/
- **Admin:** http://localhost:8000/admin/
- **Logbook Dashboard:** http://localhost:5173/logbooks
- **Supervisor Dashboard:** http://localhost:5173/supervisor

### State Transition Reference
```
draft → submitted → approved (terminal)
draft → submitted → rejected → submitted
draft → submitted → returned_for_edits → submitted
draft → ready → submitted
```

---

## 10. Testing Summary

### Test Execution Tracking

| Test Category | Total Tests | Passed | Failed | Not Started | Pass Rate |
|---------------|-------------|--------|--------|-------------|-----------|
| State Transitions | 8 | 0 | 0 | 8 | 0% |
| Entry Locking | 19 | 0 | 0 | 19 | 0% |
| Data Integrity | 14 | 0 | 0 | 14 | 0% |
| Supervisor Workflow | 15 | 0 | 0 | 15 | 0% |
| Edge Cases | 15 | 0 | 0 | 15 | 0% |
| UI/UX Verification | 14 | 0 | 0 | 14 | 0% |
| API Testing | 10 | 0 | 0 | 10 | 0% |
| **TOTAL** | **95** | **0** | **0** | **95** | **0%** |

### Tester Information
- **Tester Name:** ________________
- **Test Date:** ________________
- **Test Environment:** Development (localhost)
- **Browser:** ________________
- **Notes:** ________________

### Issues Found
| Issue # | Description | Severity | Status | Notes |
|---------|-------------|----------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Recommendations
1. ________________
2. ________________
3. ________________

---

## Appendix

### Known Issues/Limitations
- None currently identified

### Future Enhancements
- Bulk logbook operations
- Advanced filtering options
- Export functionality
- Mobile responsiveness improvements

### Related Documentation
- [Configuration System Documentation](CONFIGURATION_SYSTEM.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Checkpoint Log](checkpoint.md)

---

**Testing Checklist Complete**  
*Last Updated: 2025-10-12*
