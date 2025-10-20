def suggest_competencies_for_activity(activity_type, description, epa_worked_on=None, activity_type_name=None):
    """
    Suggest competencies based on EPA and activity description.
    For now, use EPA-to-competency mapping. Later: AI-powered.
    """
    # EPA to Competency mapping (provisional - based on AHPRA guidelines)
    EPA_COMPETENCY_MAP = {
        'EPA1': ['C1', 'C2', 'C6'],  # Assessment competencies
        'EPA2': ['C1', 'C4', 'C6'],  # Intervention
        'EPA3': ['C2', 'C6', 'C7'],  # Communication/Cultural
        'EPA4': ['C1', 'C3', 'C6'],  # Assessment and measurement
        'EPA5': ['C4', 'C6', 'C8'],  # Intervention across lifespan
        'EPA6': ['C1', 'C2', 'C6'],  # Professional practice
        'EPA7': ['C5', 'C6'],        # Research and evaluation
        'EPA8': ['C8', 'C6'],        # Supervision and professional development
    }
    
    # Activity type to competency mapping for Section B
    ACTIVITY_COMPETENCY_MAP = {
        'WORKSHOP': ['C1', 'C5'],
        'CONFERENCE': ['C1', 'C5'],
        'TRAINING': ['C1', 'C4'],
        'SUPERVISION': ['C8'],
        'RESEARCH': ['C5'],
        'CLINICAL': ['C1', 'C2', 'C3', 'C4'],
        'ADMINISTRATIVE': ['C1', 'C6'],
    }
    
    if activity_type == 'SECTION_A' and epa_worked_on and epa_worked_on in EPA_COMPETENCY_MAP:
        return EPA_COMPETENCY_MAP[epa_worked_on]
    
    if activity_type == 'SECTION_B' and activity_type_name and activity_type_name in ACTIVITY_COMPETENCY_MAP:
        return ACTIVITY_COMPETENCY_MAP[activity_type_name]
    
    if activity_type == 'SECTION_C':
        return ['C8']  # Supervision and Professional Development
    
    # Default fallback based on activity type
    if activity_type == 'SECTION_A':
        return ['C1', 'C6']  # General competencies for direct client contact
    elif activity_type == 'SECTION_B':
        return ['C1', 'C5']  # Knowledge and research for professional development
    else:
        return ['C1', 'C6']  # General competencies
