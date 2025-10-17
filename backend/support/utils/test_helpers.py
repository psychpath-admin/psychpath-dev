"""
Test plan helper utilities for calculating statistics and managing test data.
"""

import json
from typing import Dict, Any, List


def calculate_suite_summary(test_plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate summary statistics for a test plan based on test case statuses.
    
    Args:
        test_plan: Dictionary containing test plan data with test_cases list
        
    Returns:
        Dictionary with calculated summary statistics
    """
    if not isinstance(test_plan, dict) or 'test_cases' not in test_plan:
        return _get_empty_summary()
    
    test_cases = test_plan.get('test_cases', [])
    if not isinstance(test_cases, list):
        return _get_empty_summary()
    
    # Initialize counters
    total_tests = len(test_cases)
    status_counts = {
        'not_tested': 0,
        'blocked': 0,
        'to_be_implemented': 0,
        'in_progress': 0,
        'passed': 0,
        'failed': 0,
        'skipped': 0,
        'invalid_test': 0,
        'design_issue': 0,
        'ux_issue': 0,
        'requirements_change': 0,
        'needs_clarification': 0,
        'deferred': 0,
        'wont_fix': 0,
        'duplicate': 0
    }
    
    # Count statuses
    for test_case in test_cases:
        if isinstance(test_case, dict) and 'status' in test_case:
            status = test_case['status'].lower().replace(' ', '_').replace('-', '_')
            if status in status_counts:
                status_counts[status] += 1
            else:
                # Handle unknown statuses
                status_counts['not_tested'] += 1
    
    # Calculate pass rate (only from executed tests)
    executed_tests = status_counts['passed'] + status_counts['failed']
    if executed_tests > 0:
        pass_rate = f"{(status_counts['passed'] / executed_tests * 100):.1f}%"
    else:
        pass_rate = "0%"
    
    # Calculate completion rate (executed tests / total tests)
    completion_rate = f"{((executed_tests + status_counts['skipped']) / total_tests * 100):.1f}%" if total_tests > 0 else "0%"
    
    return {
        'total_tests': total_tests,
        'not_tested': status_counts['not_tested'],
        'blocked': status_counts['blocked'],
        'to_be_implemented': status_counts['to_be_implemented'],
        'in_progress': status_counts['in_progress'],
        'passed': status_counts['passed'],
        'failed': status_counts['failed'],
        'skipped': status_counts['skipped'],
        'invalid_test': status_counts['invalid_test'],
        'design_issue': status_counts['design_issue'],
        'ux_issue': status_counts['ux_issue'],
        'requirements_change': status_counts['requirements_change'],
        'needs_clarification': status_counts['needs_clarification'],
        'deferred': status_counts['deferred'],
        'wont_fix': status_counts['wont_fix'],
        'duplicate': status_counts['duplicate'],
        'pass_rate': pass_rate,
        'completion_rate': completion_rate
    }


def determine_qa_status(test_plan: Dict[str, Any]) -> str:
    """
    Determine the QA status of a ticket based on test case results.
    
    Args:
        test_plan: Dictionary containing test plan data
        
    Returns:
        String representing the QA status
    """
    summary = calculate_suite_summary(test_plan)
    
    total_tests = summary['total_tests']
    if total_tests == 0:
        return 'NOT_TESTED'
    
    # Calculate percentages
    blocked_percentage = (summary['blocked'] / total_tests) * 100
    to_be_implemented_percentage = (summary['to_be_implemented'] / total_tests) * 100
    not_tested_percentage = (summary['not_tested'] / total_tests) * 100
    
    # If >50% of tests are blocked, mark as BLOCKED
    if blocked_percentage > 50:
        return 'BLOCKED'
    
    # If all tests are NOT_TESTED or TO_BE_IMPLEMENTED, mark as NOT_TESTED
    if (not_tested_percentage + to_be_implemented_percentage) >= 95:
        return 'NOT_TESTED'
    
    # If any tests are IN_PROGRESS or mix of statuses, mark as IN_QA
    if summary['in_progress'] > 0:
        return 'IN_QA'
    
    # Check for mixed statuses (not all one type)
    executed_tests = summary['passed'] + summary['failed'] + summary['skipped']
    if executed_tests > 0 and (summary['not_tested'] + summary['to_be_implemented']) > 0:
        return 'IN_QA'
    
    # If we have executed tests, check pass rate
    if summary['passed'] + summary['failed'] > 0:
        pass_rate_percentage = (summary['passed'] / (summary['passed'] + summary['failed'])) * 100
        
        # If pass rate >= 95% and blocked < 5%, mark as PASSED
        if pass_rate_percentage >= 95 and blocked_percentage < 5:
            return 'PASSED'
        
        # If any tests failed or pass rate < 95%, mark as REJECTED
        if summary['failed'] > 0 or pass_rate_percentage < 95:
            return 'REJECTED'
    
    # Default to IN_QA for edge cases
    return 'IN_QA'


def validate_test_case(test_case: Dict[str, Any]) -> List[str]:
    """
    Validate a test case structure and return list of validation errors.
    
    Args:
        test_case: Dictionary containing test case data
        
    Returns:
        List of validation error messages (empty if valid)
    """
    errors = []
    
    if not isinstance(test_case, dict):
        errors.append("Test case must be a dictionary")
        return errors
    
    # Required fields
    required_fields = ['id', 'description', 'steps', 'expected_result', 'status']
    for field in required_fields:
        if field not in test_case:
            errors.append(f"Missing required field: {field}")
    
    # Validate status
    valid_statuses = [
        'NOT_TESTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED',
        'TO_BE_IMPLEMENTED', 'INVALID_TEST', 'DESIGN_ISSUE', 'UX_ISSUE',
        'REQUIREMENTS_CHANGE', 'NEEDS_CLARIFICATION', 'DEFERRED', 'WONT_FIX', 'DUPLICATE'
    ]
    
    if 'status' in test_case and test_case['status'] not in valid_statuses:
        errors.append(f"Invalid status: {test_case['status']}. Must be one of: {', '.join(valid_statuses)}")
    
    # Validate steps
    if 'steps' in test_case:
        if not isinstance(test_case['steps'], list):
            errors.append("Steps must be a list")
        elif len(test_case['steps']) == 0:
            errors.append("Steps list cannot be empty")
    
    # Validate priority
    if 'priority' in test_case:
        valid_priorities = ['HIGH', 'MEDIUM', 'LOW']
        if test_case['priority'] not in valid_priorities:
            errors.append(f"Invalid priority: {test_case['priority']}. Must be one of: {', '.join(valid_priorities)}")
    
    return errors


def update_test_case_status(test_plan: Dict[str, Any], test_id: str, new_status: str, 
                          tested_by: str = None, actual_result: str = None, 
                          failure_reason: str = None) -> Dict[str, Any]:
    """
    Update a test case status and recalculate summary.
    
    Args:
        test_plan: Dictionary containing test plan data
        test_id: ID of the test case to update
        new_status: New status for the test case
        tested_by: User who tested the case
        actual_result: Actual result of the test
        failure_reason: Reason for failure (if applicable)
        
    Returns:
        Updated test plan dictionary
    """
    if not isinstance(test_plan, dict) or 'test_cases' not in test_plan:
        return test_plan
    
    test_cases = test_plan.get('test_cases', [])
    
    # Find and update the test case
    for test_case in test_cases:
        if isinstance(test_case, dict) and test_case.get('id') == test_id:
            test_case['status'] = new_status
            if tested_by:
                test_case['tested_by'] = tested_by
            if actual_result is not None:
                test_case['actual_result'] = actual_result
            if failure_reason is not None:
                test_case['failure_reason'] = failure_reason
            
            # Update tested_at timestamp
            from django.utils import timezone
            test_case['tested_at'] = timezone.now().isoformat()
            break
    
    # Recalculate summary
    test_plan['summary'] = calculate_suite_summary(test_plan)
    
    return test_plan


def get_test_case_by_id(test_plan: Dict[str, Any], test_id: str) -> Dict[str, Any]:
    """
    Get a specific test case by ID.
    
    Args:
        test_plan: Dictionary containing test plan data
        test_id: ID of the test case to find
        
    Returns:
        Test case dictionary or None if not found
    """
    if not isinstance(test_plan, dict) or 'test_cases' not in test_plan:
        return None
    
    test_cases = test_plan.get('test_cases', [])
    
    for test_case in test_cases:
        if isinstance(test_case, dict) and test_case.get('id') == test_id:
            return test_case
    
    return None


def group_test_cases_by_category(test_plan: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group test cases by category.
    
    Args:
        test_plan: Dictionary containing test plan data
        
    Returns:
        Dictionary with category names as keys and lists of test cases as values
    """
    if not isinstance(test_plan, dict) or 'test_cases' not in test_plan:
        return {}
    
    test_cases = test_plan.get('test_cases', [])
    grouped = {}
    
    for test_case in test_cases:
        if isinstance(test_case, dict) and 'category' in test_case:
            category = test_case['category']
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(test_case)
    
    return grouped


def _get_empty_summary() -> Dict[str, Any]:
    """Return empty summary statistics."""
    return {
        'total_tests': 0,
        'not_tested': 0,
        'blocked': 0,
        'to_be_implemented': 0,
        'in_progress': 0,
        'passed': 0,
        'failed': 0,
        'skipped': 0,
        'invalid_test': 0,
        'design_issue': 0,
        'ux_issue': 0,
        'requirements_change': 0,
        'needs_clarification': 0,
        'deferred': 0,
        'wont_fix': 0,
        'duplicate': 0,
        'pass_rate': '0%',
        'completion_rate': '0%'
    }
