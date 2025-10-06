"""
Utility functions for duration formatting and conversion
"""

def minutes_to_hours_minutes(minutes):
    """
    Convert minutes to hh:mm format
    Args:
        minutes: Duration in minutes (int or float)
    Returns:
        Formatted string like "3:45" or "0:30"
    """
    if not minutes or minutes < 0:
        return "0:00"
    
    # Round to avoid floating point precision issues
    total_minutes = round(minutes)
    hours = total_minutes // 60
    mins = total_minutes % 60
    
    return f"{hours}:{mins:02d}"

def minutes_to_display_format(minutes):
    """
    Convert minutes to display format (e.g., "3h 45m" or "30m")
    Args:
        minutes: Duration in minutes (int or float)
    Returns:
        Formatted string for display
    """
    if not minutes or minutes < 0:
        return "0m"
    
    total_minutes = int(minutes)
    hours = total_minutes // 60
    mins = total_minutes % 60
    
    if hours > 0:
        return f"{hours}h {mins}m" if mins > 0 else f"{hours}h"
    else:
        return f"{mins}m"

def minutes_to_decimal_hours(minutes):
    """
    Convert minutes to decimal hours (for calculations)
    Args:
        minutes: Duration in minutes (int or float)
    Returns:
        Decimal hours
    """
    if not minutes or minutes < 0:
        return 0.0
    
    return round(minutes / 60, 2)
