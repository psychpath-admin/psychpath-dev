class PDActivityQualityValidator:
    """Validate quality of PD activity descriptions"""
    
    def validate_activity_details(self, text: str) -> dict:
        """
        Validate activity details quality
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
                'feedback': ['Activity details are too brief'],
                'prompts': []
            }
        
        score = 0
        feedback = []
        
        # Length check (20-200 characters is good)
        if len(text) < 20:
            feedback.append('Consider adding more detail about the activity')
            score += 10
        elif len(text) >= 20:
            score += 20
        
        # Check for presenter/facilitator name
        if any(word in text.lower() for word in ['presenter', 'facilitator', 'instructor', 'speaker', 'by ']):
            score += 20
        else:
            feedback.append('Consider including the presenter or facilitator name')
        
        # Check for institution/organization
        if any(word in text.lower() for word in ['university', 'college', 'institute', 'association', 'society', 'organization', 'centre', 'center']):
            score += 20
        else:
            feedback.append('Consider mentioning the institution or organization')
        
        # Check for format details
        if any(word in text.lower() for word in ['workshop', 'webinar', 'seminar', 'conference', 'course', 'training', 'lecture', 'presentation']):
            score += 15
        else:
            feedback.append('Consider specifying the format (workshop, webinar, etc.)')
        
        # Check for professional language
        professional_terms = ['professional', 'development', 'learning', 'education', 'competency', 'skill', 'knowledge', 'practice']
        if any(term in text.lower() for term in professional_terms):
            score += 15
        else:
            feedback.append('Consider using more professional language')
        
        # Check for specific topics or content
        if len(text.split()) >= 10:  # At least 10 words
            score += 10
        else:
            feedback.append('Consider describing the key topics or content covered')
        
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

    def validate_topics_covered(self, text: str) -> dict:
        """Validate topics covered quality and specificity."""
        if not text or len(text.strip()) < 5:
            return {
                'quality': 'needs_improvement',
                'score': 0,
                'feedback': ['Topics are too brief'],
                'prompts': []
            }

        score = 0
        feedback: list[str] = []

        # Length and specificity
        words = len(text.split())
        if words < 6:
            feedback.append('Add more detail about key themes or modules')
            score += 5
        elif words < 20:
            score += 15
        else:
            score += 25

        # Look for structure: techniques/models, population/context, outcomes/skills
        techniques = ['cbt', 'act', 'emdr', 'mi ', 'motivational interviewing', 'exposure', 'formulation', 'assessment', 'intervention', 'measurement']
        population = ['adolescent', 'child', 'adult', 'older', 'aboriginal', 'torres strait', 'neurodivers', 'trauma', 'forensic', 'perinatal']
        outcomes   = ['outcome', 'monitor', 'evaluation', 'case study', 'role-play', 'skills', 'practice']

        has_tech = any(k in text.lower() for k in techniques)
        has_pop  = any(k in text.lower() for k in population)
        has_out  = any(k in text.lower() for k in outcomes)

        if has_tech:
            score += 20
        else:
            feedback.append('Mention techniques/models or assessment/intervention focus')

        if has_pop:
            score += 15
        else:
            feedback.append('Specify target population or context (e.g., adolescents, telehealth)')

        if has_out:
            score += 15
        else:
            feedback.append('Include outcomes/skills emphasis or evaluation approach')

        # Professional language/keywords
        pro_terms = ['evidence', 'competency', 'learning objectives', 'supervision', 'case conceptualisation', 'formulation']
        if any(t in text.lower() for t in pro_terms):
            score += 10
        else:
            feedback.append('Use professional terms (e.g., learning objectives, evidence)')

        # Determine quality
        if score >= 80:
            quality = 'excellent'
        elif score >= 60:
            quality = 'good'
        else:
            quality = 'needs_improvement'

        if not feedback:
            feedback.append('Covers relevant themes with good specificity')

        return {
            'quality': quality,
            'score': min(score, 100),
            'feedback': feedback,
            'prompts': []
        }
