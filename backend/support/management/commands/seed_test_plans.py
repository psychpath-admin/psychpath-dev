import os
import re
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings

from support.models import SupportTicket


User = get_user_model()


CORE_SUITE_TITLE = "Core State Transition Tests"


def parse_core_state_tests(md_text: str):
    """Parse the Core State Transition Tests section into tests and steps.
    Returns a list of tests with steps.
    """
    # Extract section 2 content
    m = re.search(r"^##\s*2\.\s*Core State Transition Tests[\s\S]*?(?=^##\s*\d+|\Z)", md_text, re.MULTILINE)
    if not m:
        return []
    section = m.group(0)

    # Split by test headings
    tests = []
    for tm in re.finditer(r"^###\s*Test\s*(\d+):\s*(.+)$([\s\S]*?)(?=^###\s*Test|\Z)", section, re.MULTILINE):
        test_num = tm.group(1)
        title = tm.group(2).strip()
        body = tm.group(3)

        # Attempt to glean initial_state/action/expected from the summary line after heading
        # e.g., "**Initial State:** ...  **Action:** ...  **Expected Result:** ..."
        initial_state = ''
        action = ''
        expected = ''
        summary_match = re.search(r"Initial State:\s*([^\n*]+).*?Action:\s*([^\n*]+).*?Expected Result:\s*([^\n*]+)", body, re.IGNORECASE | re.DOTALL)
        if summary_match:
            initial_state = summary_match.group(1).strip()
            action = summary_match.group(2).strip()
            expected = summary_match.group(3).strip()

        # Parse markdown table rows beginning with |
        steps = []
        step_index = 1
        for line in body.splitlines():
            line = line.strip()
            if not (line.startswith('|') and line.endswith('|')):
                continue
            if set(line.replace('|','').strip()) <= set('- :'):  # separator row
                continue
            cols = [c.strip() for c in line.strip('|').split('|')]
            # Expect at least Step, Action, Expected Result
            if len(cols) < 3:
                continue
            if cols[0].lower() == 'step':
                continue
            step_action = cols[1]
            step_expected = cols[2]
            steps.append({
                'id': f'step_{step_index}',
                'action': step_action,
                'expected': step_expected,
                'status': 'NOT_TESTED',
                'notes': '',
                'date_tested': None,
                'tester': None,
            })
            step_index += 1

        tests.append({
            'id': f'test_{test_num}',
            'title': f"Test {test_num}: {title}",
            'initial_state': initial_state,
            'action': action,
            'expected': expected,
            'last_result': 'NOT_TESTED',
            'steps': steps,
        })

    return tests

def parse_section_table(md_text: str, section_heading: str):
    """Parse generic markdown table under a section into a single test with many steps.
    Returns a test dict or None.
    """
    m = re.search(rf"^##\s*{re.escape(section_heading)}[\s\S]*?(?=^##\s*\d+|\Z)", md_text, re.MULTILINE)
    if not m:
        return None
    section = m.group(0)
    steps = []
    step_index = 1
    for line in section.splitlines():
        line = line.strip()
        if not (line.startswith('|') and line.endswith('|')):
            continue
        if set(line.replace('|','').strip()) <= set('- :'):
            continue
        cols = [c.strip() for c in line.strip('|').split('|')]
        if len(cols) < 3 or cols[0].lower() in ['test','step']:
            continue
        # Make a best-effort guess at column structure
        # Common shapes: [Test, Action, Expected, Pass/Fail, Notes] OR [Step, Action, Expected, ...]
        action = cols[1] if len(cols) > 1 else ''
        expected = cols[2] if len(cols) > 2 else ''
        steps.append({
            'id': f'step_{step_index}',
            'action': action,
            'expected': expected,
            'status': 'NOT_TESTED',
            'notes': '',
            'date_tested': None,
            'tester': None,
        })
        step_index += 1
    if not steps:
        return None
    return {
        'id': 'test_1',
        'title': section_heading,
        'initial_state': '',
        'action': '',
        'expected': '',
        'last_result': 'NOT_TESTED',
        'steps': steps,
    }


def parse_section_table_into_tests(md_text: str, section_heading: str):
    """Parse a section's markdown table into multiple tests (one test per row).
    Returns a list of tests. Each test contains a single step for clarity.
    """
    m = re.search(rf"^##\s*{re.escape(section_heading)}[\s\S]*?(?=^##\s*\d+|\Z)", md_text, re.MULTILINE)
    if not m:
        return []
    section = m.group(0)
    tests = []
    idx = 1
    for line in section.splitlines():
        line = line.strip()
        if not (line.startswith('|') and line.endswith('|')):
            continue
        if set(line.replace('|','').strip()) <= set('- :'):
            continue
        cols = [c.strip() for c in line.strip('|').split('|')]
        if len(cols) < 3 or cols[0].lower() in ['test','step']:
            continue
        action = cols[1] if len(cols) > 1 else ''
        expected = cols[2] if len(cols) > 2 else ''
        title = action or f"Row {idx}"
        tests.append({
            'id': f'test_{idx}',
            'title': title,
            'initial_state': '',
            'action': action,
            'expected': expected,
            'last_result': 'NOT_TESTED',
            'steps': [{
                'id': 'step_1',
                'action': action,
                'expected': expected,
                'status': 'NOT_TESTED',
                'notes': '',
                'date_tested': None,
                'tester': None,
            }],
        })
        idx += 1
    return tests


class Command(BaseCommand):
    help = "Seed a SupportTicket test plan by parsing LOGBOOK_TESTING_CHECKLIST.md (Core State Transition Tests)"

    def handle(self, *args, **options):
        user = User.objects.filter(is_staff=True).first() or User.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR("No users found. Create a user first."))
            return

        # Read the markdown checklist from repo root
        checklist_path = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'LOGBOOK_TESTING_CHECKLIST.md'))
        if not os.path.exists(checklist_path):
            self.stdout.write(self.style.ERROR(f"Checklist not found at {checklist_path}"))
            return
        with open(checklist_path, 'r') as f:
            md_text = f.read()

        # 1) Create Core State Transition Tests ticket with multiple tests
        core_tests = parse_core_state_tests(md_text)

        # Enrich core tests with very detailed happy-path steps when we recognize them
        def add_detailed_steps_for_core(tests_list):
            enriched = []
            for t in tests_list:
                title_lower = t['title'].lower()
                steps = t.get('steps', [])
                detailed = []
                if 'create draft logbook' in title_lower:
                    detailed = [
                        {'id': 'hp_1', 'action': 'Open frontend', 'expected': 'App loads', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_2', 'action': 'Login at http://localhost:5173/login with trainee credentials', 'expected': 'Redirected to dashboard', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_3', 'action': 'Navigate to Section A: http://localhost:5173/section-a', 'expected': 'Section A list visible, Add DCC Entry button present', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_4', 'action': 'Click "Add DCC Entry" and enter sample data (client X, 30 min, DCC)', 'expected': 'Entry saved and listed for the chosen date', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_5', 'action': 'Navigate to Section B: http://localhost:5173/section-b and add one PD entry (e.g., reading, 30 min)', 'expected': 'PD entry saved and listed', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_6', 'action': 'Navigate to Section C: http://localhost:5173/section-c and add one supervision entry (e.g., 60 min)', 'expected': 'SUP entry saved and listed', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_7', 'action': 'Go to Logbooks: http://localhost:5173/logbooks and choose the completed week', 'expected': 'Week card shows Create Logbook', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_8', 'action': 'Click Create Logbook and Save as draft', 'expected': "Draft created with status 'draft' and entries remain editable", 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_9', 'action': 'Verify preview totals show each section and weekly totals', 'expected': 'Totals present and non-zero where expected', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                    ]
                elif 'submit draft logbook' in title_lower:
                    detailed = [
                        {'id': 'hp_1', 'action': 'Open http://localhost:5173/logbooks and click the draft created earlier', 'expected': 'Draft detail opens', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_2', 'action': 'Click "Submit for Review" and confirm', 'expected': "Status changes to 'submitted', success message displayed", 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                        {'id': 'hp_3', 'action': 'Attempt to edit a Section A entry from the submitted week', 'expected': 'Editing disabled (locked) with tooltip/message', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                    ]
                # Fallback: keep existing parsed steps if we have no specific template
                if detailed:
                    # Merge original parsed steps at the end for traceability
                    merged = detailed + [dict(s, id=f"orig_{i+1}") for i, s in enumerate(steps)]
                    t['steps'] = merged
                enriched.append(t)
            return enriched

        core_tests = add_detailed_steps_for_core(core_tests)
        if not core_tests:
            self.stdout.write(self.style.WARNING("No tests parsed from Core State Transition Tests section."))
        core_ticket, _ = SupportTicket.objects.get_or_create(
            user=user,
            ticket_type='TASK',
            subject='Logbook – Core State Transition Tests',
            defaults={'priority': 'HIGH', 'stage': 'PLANNED'}
        )
        core_plan = {
            'testing_level': 'TEST',
            'suites': [
                {'id': 'suite_1', 'title': CORE_SUITE_TITLE, 'tests': core_tests}
            ]
        }
        core_ticket.test_plan = core_plan
        core_ticket.save(update_fields=['test_plan'])
        self.stdout.write(self.style.SUCCESS(f"Seeded Core State Transition Tests on ticket #{core_ticket.id}"))

        # 2) Each additional section as its own ticket with one test (all rows as steps)
        sections = [
            ('Entry Locking Tests', '3. Entry Locking Tests'),
            ('Data Integrity Tests', '4. Data Integrity Tests'),
            ('Supervisor Workflow Tests', '5. Supervisor Workflow Tests'),
            ('Edge Cases & Error Handling', '6. Edge Cases & Error Handling'),
            ('UI/UX Verification', '7. UI/UX Verification'),
            ('API Testing', '8. API Testing'),
        ]

        for display_title, heading in sections:
            tests = parse_section_table_into_tests(md_text, heading)
            # For each parsed test, add a sibling Edge Cases test
            expanded = []
            for i, base_test in enumerate(tests, start=1):
                expanded.append(base_test)
                edge_title = f"Edge Cases for: {base_test['title']}"
                # Generic edge-case templates
                edge_steps = [
                    {'id': 'edge_1', 'action': 'Leave a required field blank and try to save/submit', 'expected': 'Client-side validation or 400 with clear error', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                    {'id': 'edge_2', 'action': 'Enter boundary values (0, negative, extremely large) for numeric fields', 'expected': 'Validation prevents invalid values; large values handled gracefully', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                    {'id': 'edge_3', 'action': 'Attempt duplicate action (double-click submit or resubmit quickly)', 'expected': 'Idempotent behavior; no duplicate records or clear error', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                    {'id': 'edge_4', 'action': 'Try action without required permissions (e.g., logged out or wrong role)', 'expected': 'Redirect to login or 403/401 with message', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                ]
                expanded.append({
                    'id': f"test_edge_{i}",
                    'title': edge_title,
                    'initial_state': '',
                    'action': '',
                    'expected': '',
                    'last_result': 'NOT_TESTED',
                    'steps': edge_steps,
                })
            tests = expanded
            if not tests:
                self.stdout.write(self.style.WARNING(f"No steps parsed for section: {display_title}"))
                continue
            ticket, _ = SupportTicket.objects.get_or_create(
                user=user,
                ticket_type='TASK',
                subject=display_title,
                defaults={'priority': 'MEDIUM', 'stage': 'PLANNED'}
            )
            plan = {
                'testing_level': 'TEST',
                'suites': [
                    {'id': 'suite_1', 'title': display_title, 'tests': tests}
                ]
            }
            ticket.test_plan = plan
            ticket.save(update_fields=['test_plan'])
            self.stdout.write(self.style.SUCCESS(f"Seeded {display_title} on ticket #{ticket.id}"))


