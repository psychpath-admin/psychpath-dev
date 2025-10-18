"""
AHPRA Validation Messages

User-friendly error messages with help system integration for validation errors.
These messages provide clear guidance to users about what went wrong and how to fix it.
"""

from typing import Dict, List, Optional


class ValidationMessages:
    """
    Central repository for validation error messages with help context
    """
    
    # ════════════════════════════════════════════════════════════════
    # PROVISIONAL (5+1) VALIDATION MESSAGES
    # ════════════════════════════════════════════════════════════════
    
    PROVISIONAL_MESSAGES = {
        'INSUFFICIENT_TOTAL_HOURS': {
            'title': 'Insufficient Total Practice Hours',
            'message': 'You need at least 1,500 hours of psychological practice for the 5+1 program',
            'help_text': """
                <p>AHPRA requires <strong>1,500 hours minimum</strong> of psychological practice for the 5+1 Internship program.</p>
                
                <h4>What counts as practice hours?</h4>
                <ul>
                    <li>Direct client contact (assessment, intervention)</li>
                    <li>Client-related activities (report writing, case planning)</li>
                    <li>Independent professional activities (research, policy)</li>
                    <li>Simulated skills training (up to 60 hours)</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Continue logging your weekly activities in Section A</li>
                    <li>Ensure all entries are supervisor-approved</li>
                    <li>Your cumulative hours will update automatically</li>
                </ol>
                
                <p>You can track your progress on your Dashboard.</p>
            """,
            'severity': 'error',
            'help_category': 'hours',
            'help_section': '5+1',
        },
        
        'INSUFFICIENT_CLIENT_CONTACT': {
            'title': 'Insufficient Client Contact Hours',
            'message': 'You need at least 500 hours of direct client contact',
            'help_text': """
                <p>AHPRA requires <strong>500 hours minimum</strong> of direct client contact for the 5+1 program.</p>
                
                <h4>What counts as direct client contact?</h4>
                <ul>
                    <li><strong>Direct Real Contact:</strong> Face-to-face or video sessions with real clients</li>
                    <li><strong>Simulated Contact:</strong> Skills training with actors, peers, or VR (max 60 hours)</li>
                    <li>Assessment sessions (testing, interviews)</li>
                    <li>Intervention sessions (therapy, counselling)</li>
                </ul>
                
                <h4>What doesn't count:</h4>
                <ul>
                    <li>Report writing (counts as client-related instead)</li>
                    <li>Case planning or consultation</li>
                    <li>Reading or research</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Log direct client sessions in Section A</li>
                    <li>Choose "Direct Real Client Contact" or "Direct Simulated" as the practice type</li>
                    <li>Provide a reflection for each direct contact week</li>
                    <li>Get supervisor approval</li>
                </ol>
            """,
            'severity': 'error',
            'help_category': 'hours',
            'help_section': '5+1',
        },
        
        'SIMULATED_LIMIT_EXCEEDED': {
            'title': 'Simulated Hours Limit Exceeded',
            'message': 'AHPRA limits simulated skills training to 60 hours maximum',
            'help_text': """
                <p>AHPRA allows <strong>up to 60 hours</strong> of simulated client contact to count toward your 500-hour client contact requirement.</p>
                
                <h4>What is simulated contact?</h4>
                <ul>
                    <li>Role-plays with peers or actors</li>
                    <li>VR or computer-simulated clients</li>
                    <li>Simulated psychological testing</li>
                    <li>Shadowing experienced psychologists</li>
                </ul>
                
                <h4>Why the limit?</h4>
                <p>AHPRA requires substantial real-world client contact to ensure you develop practical skills with actual clients, not just simulations.</p>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Review your logged simulated hours to ensure they're accurately recorded</li>
                    <li>Going forward, log additional simulated activities as "Client-Related" or "Independent Professional" instead</li>
                    <li>Focus on real client contact to meet your 500-hour requirement</li>
                </ol>
                
                <p><strong>Note:</strong> Once you reach 60 simulated hours, PsychPATH will automatically prevent you from adding more.</p>
            """,
            'severity': 'error',
            'help_category': 'hours',
            'help_section': '5+1',
        },
        
        'INSUFFICIENT_SUPERVISION': {
            'title': 'Insufficient Supervision Hours',
            'message': 'You need at least 80 hours of supervision',
            'help_text': """
                <p>AHPRA requires <strong>80 hours minimum</strong> of supervision for the 5+1 program.</p>
                
                <h4>Supervision breakdown:</h4>
                <ul>
                    <li><strong>≥50 hours:</strong> Individual supervision with your Principal Supervisor</li>
                    <li><strong>≤30 hours:</strong> Group supervision or secondary supervision</li>
                </ul>
                
                <h4>Frequency:</h4>
                <p>AHPRA recommends <strong>weekly supervision</strong> (at least every 14 days).</p>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Log all supervision sessions in Section C</li>
                    <li>Indicate whether it's individual or group, and which supervisor</li>
                    <li>Provide a reflection after each session</li>
                    <li>Get supervisor digital sign-off</li>
                </ol>
            """,
            'severity': 'error',
            'help_category': 'supervision',
            'help_section': '5+1',
        },
        
        'INSUFFICIENT_PRINCIPAL_SUPERVISION': {
            'title': 'Insufficient Principal Supervisor Hours',
            'message': 'You need at least 50 hours of individual supervision with your Principal Supervisor',
            'help_text': """
                <p>AHPRA requires <strong>50 hours minimum</strong> of <em>individual</em> supervision with your <em>Principal Supervisor</em>.</p>
                
                <h4>What qualifies?</h4>
                <ul>
                    <li>One-on-one sessions (in-person or video)</li>
                    <li>With your designated Principal Supervisor</li>
                    <li>Focused on your professional development</li>
                </ul>
                
                <h4>What doesn't qualify for the 50-hour minimum?</h4>
                <ul>
                    <li>Group supervision</li>
                    <li>Supervision with a secondary supervisor</li>
                    <li>Peer consultation</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Ensure you're logging individual sessions with your Principal Supervisor</li>
                    <li>When creating a Section C entry, select "Individual" and your Principal Supervisor</li>
                    <li>These hours count toward your 80-hour total</li>
                </ol>
                
                <p><strong>Note:</strong> Group and secondary supervision can contribute up to 30 hours toward your 80-hour total.</p>
            """,
            'severity': 'error',
            'help_category': 'supervision',
            'help_section': '5+1',
        },
        
        'EXCESS_OTHER_SUPERVISION': {
            'title': 'Too Many Group/Secondary Supervision Hours',
            'message': 'Group or secondary supervision cannot exceed 30 hours',
            'help_text': """
                <p>AHPRA limits <strong>group and secondary supervision</strong> to a maximum of <strong>30 hours</strong> out of your 80-hour total.</p>
                
                <h4>Why the limit?</h4>
                <p>AHPRA requires substantial individual supervision with your Principal Supervisor (≥50 hours) to ensure personalized guidance and development.</p>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Review your logged supervision to ensure accurate categorization</li>
                    <li>If you've logged group sessions as individual, or secondary as principal, correct them</li>
                    <li>Going forward, ensure you're getting enough individual time with your Principal Supervisor</li>
                </ol>
                
                <h4>Supervision hour limits:</h4>
                <ul>
                    <li><strong>Principal Individual:</strong> ≥50 hours (required minimum)</li>
                    <li><strong>Other (Group/Secondary):</strong> ≤30 hours (cannot exceed)</li>
                    <li><strong>Total:</strong> ≥80 hours</li>
                </ul>
            """,
            'severity': 'error',
            'help_category': 'supervision',
            'help_section': '5+1',
        },
        
        'INSUFFICIENT_DURATION': {
            'title': 'Insufficient Program Duration',
            'message': 'The 5+1 program requires at least 44 weeks FTE. Your program cannot be completed before this time.',
            'help_text': """
                <p>AHPRA requires the 5+1 Internship to be completed over <strong>at least 44 weeks Full-Time Equivalent (FTE)</strong>.</p>
                
                <h4>What is FTE?</h4>
                <p>Full-Time Equivalent accounts for part-time work and leave:</p>
                <ul>
                    <li><strong>100% FTE:</strong> Full-time work (44 weeks = approximately 1 year)</li>
                    <li><strong>50% FTE:</strong> Half-time work (88 weeks = approximately 2 years)</li>
                    <li><strong>Leave:</strong> Reduces FTE (parental, sick, carer, lifestyle)</li>
                </ul>
                
                <h4>Why 44 weeks?</h4>
                <p>AHPRA requires sufficient time to develop competencies and reflect on practice. Completing too quickly doesn't allow for proper skill development.</p>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Continue your internship until you reach 44 weeks FTE</li>
                    <li>Track your FTE on your Dashboard</li>
                    <li>Log any leave you take (it's encouraged!)</li>
                </ol>
                
                <p><strong>Note:</strong> There's no maximum timeframe, but Recency of Practice rules apply (750 hours in last 5 years).</p>
            """,
            'severity': 'error',
            'help_category': 'duration',
            'help_section': '5+1',
        },
        
        'REFLECTION_REQUIRED': {
            'title': 'Reflection Required',
            'message': 'Reflection is mandatory for direct client contact activities',
            'help_text': """
                <p>AHPRA requires <strong>mandatory reflection</strong> for direct client contact activities (both real and simulated).</p>
                
                <h4>When is reflection mandatory?</h4>
                <ul>
                    <li><strong>Direct Real Client Contact:</strong> Always required</li>
                    <li><strong>Direct Simulated Contact:</strong> Always required</li>
                    <li><strong>Client-Related Activities:</strong> Optional (but encouraged)</li>
                    <li><strong>Independent Professional:</strong> Optional (but encouraged)</li>
                </ul>
                
                <h4>What should reflection include?</h4>
                <ul>
                    <li>What you learned from the activity</li>
                    <li>How it relates to AHPRA competencies (C1-C8)</li>
                    <li>What you would do differently next time</li>
                    <li>How this develops your professional practice</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>In your Section A entry, provide a reflection in the designated field</li>
                    <li>Reflection doesn't need to be lengthy - 2-3 sentences is often sufficient</li>
                    <li>Focus on learning and growth, not just description</li>
                </ol>
            """,
            'severity': 'error',
            'help_category': 'reflection',
            'help_section': '5+1',
        },
        
        'COMPETENCIES_MISSING': {
            'title': 'Competencies Not Referenced',
            'message': 'You must reference at least one competency (C1-C8) for this week\'s activities',
            'help_text': """
                <p>AHPRA requires all practice, education, and supervision activities to demonstrate development of the <strong>8 Core Competencies (C1-C8)</strong>.</p>
                
                <h4>The 8 Core Competencies:</h4>
                <ul>
                    <li><strong>C1:</strong> Professional Communication</li>
                    <li><strong>C2:</strong> Assessment and Measurement</li>
                    <li><strong>C3:</strong> Intervention</li>
                    <li><strong>C4:</strong> Research and Evaluation</li>
                    <li><strong>C5:</strong> Cross-Cultural Competence</li>
                    <li><strong>C6:</strong> Ethical and Legal Practice</li>
                    <li><strong>C7:</strong> Self-Care and Professional Development</li>
                    <li><strong>C8:</strong> Digital Competence</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>When logging activities, select which competencies they address</li>
                    <li>Most activities will reference multiple competencies</li>
                    <li>Consider how each activity develops your professional skills</li>
                </ol>
                
                <p><strong>Example:</strong> A client assessment session might reference C1 (communication), C2 (assessment), C5 (cross-cultural), and C6 (ethical practice).</p>
            """,
            'severity': 'error',
            'help_category': 'competencies',
            'help_section': '5+1',
        },
        
        'INSUFFICIENT_OBSERVATIONS': {
            'title': 'Insufficient Direct Observations',
            'message': 'You need 4 assessment observations and 4 intervention observations',
            'help_text': """
                <p>AHPRA requires your supervisor to <strong>directly observe</strong> at least <strong>8 of your client sessions</strong>:</p>
                <ul>
                    <li><strong>4 assessment sessions</strong> (testing, interviews)</li>
                    <li><strong>4 intervention sessions</strong> (therapy, counselling)</li>
                </ul>
                
                <h4>What qualifies as direct observation?</h4>
                <ul>
                    <li><strong>Live observation:</strong> Supervisor present in room or via video link</li>
                    <li><strong>Recorded observation:</strong> Supervisor reviews recorded session (with client consent)</li>
                </ul>
                
                <h4>Who can observe?</h4>
                <ul>
                    <li>Your Principal Supervisor (preferred)</li>
                    <li>A Secondary Supervisor (with approval)</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>Schedule observation sessions with your supervisor</li>
                    <li>Obtain client consent if recording</li>
                    <li>After the observation, log it in Section C</li>
                    <li>Mark the session as an "Observation" and specify type (Assessment or Intervention)</li>
                    <li>Get supervisor sign-off</li>
                </ol>
                
                <p><strong>Tip:</strong> Spread observations throughout your internship rather than doing them all at once.</p>
            """,
            'severity': 'error',
            'help_category': 'observations',
            'help_section': '5+1',
        },
        
        'RECENCY_NOT_MET': {
            'title': 'Recency of Practice Not Met',
            'message': 'You must have at least 750 hours of practice within the last 5 years to complete the program',
            'help_text': """
                <p>AHPRA's <strong>Recency of Practice</strong> requirement ensures your skills are current.</p>
                
                <h4>Requirement:</h4>
                <p>At least <strong>750 hours of psychological practice</strong> within the <strong>preceding 5 years</strong> at completion.</p>
                
                <h4>What counts?</h4>
                <ul>
                    <li>All practice hours from your 5+1 program</li>
                    <li>Any psychology practice before starting the program</li>
                    <li>Volunteer work, if supervised and psychological in nature</li>
                </ul>
                
                <h4>What to do:</h4>
                <ol>
                    <li>If you have prior practice hours, ensure they're logged in your Prior Hours</li>
                    <li>Continue your internship to accumulate sufficient hours</li>
                    <li>If you took extended leave, you may need additional practice time</li>
                </ol>
                
                <p><strong>Note:</strong> This is typically not an issue for continuous full-time internships, but matters if you have extended gaps or part-time work.</p>
            """,
            'severity': 'warning',
            'help_category': 'recency',
            'help_section': '5+1',
        },
    }
    
    @classmethod
    def get_message(cls, error_code: str, details: Optional[Dict] = None) -> Dict:
        """
        Get formatted validation message with help context
        
        Args:
            error_code: Error code from validation
            details: Optional additional details to format into message
        
        Returns:
            Dict with message, help_text, severity, etc.
        """
        if error_code in cls.PROVISIONAL_MESSAGES:
            message_config = cls.PROVISIONAL_MESSAGES[error_code].copy()
            
            # Format message with details if provided
            if details and 'message' in message_config:
                try:
                    message_config['message'] = message_config['message'].format(**details)
                except (KeyError, ValueError):
                    pass  # Use original message if formatting fails
            
            # Add details to response
            message_config['details'] = details or {}
            message_config['error_code'] = error_code
            
            return message_config
        
        # Default message for unknown error codes
        return {
            'error_code': error_code,
            'title': 'Validation Error',
            'message': 'A validation error occurred. Please check your entries and try again.',
            'help_text': '<p>If this error persists, please contact support.</p>',
            'severity': 'error',
            'help_category': 'general',
            'details': details or {},
        }
    
    @classmethod
    def format_error_response(cls, error_code: str, details: Optional[Dict] = None) -> Dict:
        """
        Format validation error for API response
        
        Returns:
            Dict suitable for DRF Response
        """
        message_config = cls.get_message(error_code, details)
        
        return {
            'error': error_code,
            'title': message_config['title'],
            'message': message_config['message'],
            'severity': message_config['severity'],
            'help': {
                'text': message_config['help_text'],
                'category': message_config.get('help_category', 'general'),
                'section': message_config.get('help_section', 'general'),
            },
            'details': message_config['details'],
        }

