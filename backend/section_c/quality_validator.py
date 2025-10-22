class SupervisionQualityValidator:
    """Validate quality of supervision summary descriptions"""
    
    def validate_supervision_summary(self, text: str) -> dict:
        """
        Validate supervision summary quality
        Returns: {
            'quality': 'excellent' | 'good' | 'needs_improvement',
            'score': int (0-100),
            'feedback': list of strings,
            'prompts': list of strings
        }
        """
        if not text or len(text.strip()) < 5:
            return {
                'quality': 'needs_improvement',
                'score': 0,
                'feedback': ['Supervision summary is too brief'],
                'prompts': []
            }
        
        score = 0
        feedback = []
        
        # Length check (20-200 characters is good)
        if len(text) < 20:
            feedback.append('Consider adding more detail about the supervision session')
            score += 10
        elif len(text) >= 20:
            score += 20
        
        # Check for key discussion points
        discussion_terms = ['discussed', 'reviewed', 'addressed', 'covered', 'explored', 'examined']
        if any(word in text.lower() for word in discussion_terms):
            score += 20
        else:
            feedback.append('Consider mentioning what was discussed or reviewed')
        
        # Check for clinical focus
        clinical_terms = ['case', 'client', 'formulation', 'intervention', 'assessment', 'treatment', 'therapy', 'session']
        if any(word in text.lower() for word in clinical_terms):
            score += 20
        else:
            feedback.append('Consider including clinical aspects (cases, interventions, assessments)')
        
        # Check for supervision activities
        supervision_terms = ['feedback', 'guidance', 'support', 'reflection', 'supervision', 'mentoring', 'coaching']
        if any(word in text.lower() for word in supervision_terms):
            score += 15
        else:
            feedback.append('Consider mentioning supervision activities (feedback, guidance, reflection)')
        
        # Check for professional development aspects
        development_terms = ['learning', 'skill', 'competency', 'development', 'growth', 'improvement', 'progress']
        if any(word in text.lower() for word in development_terms):
            score += 15
        else:
            feedback.append('Consider including professional development aspects')
        
        # Check for specific topics (at least 5 words)
        word_count = len(text.split())
        if word_count >= 5:
            score += 10
        else:
            feedback.append('Consider adding more specific details about the session')
        
        # Check for action items or follow-up
        action_terms = ['action', 'follow', 'next', 'plan', 'goal', 'task', 'homework', 'practice']
        if any(word in text.lower() for word in action_terms):
            score += 10
        else:
            feedback.append('Consider mentioning any action items or follow-up tasks')
        
        # Determine quality level
        if score >= 80:
            quality = 'excellent'
        elif score >= 60:
            quality = 'good'
        else:
            quality = 'needs_improvement'
        
        # If no specific feedback, add positive reinforcement
        if not feedback:
            feedback.append('Good detail and professional language')
        
        return {
            'quality': quality,
            'score': min(score, 100),
            'feedback': feedback,
            'prompts': []
        }
