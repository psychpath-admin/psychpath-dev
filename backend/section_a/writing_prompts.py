"""
Writing prompts for helping users improve DCC entry quality.
Non-AI rule-based prompts organized by field type and quality level.
"""

class WritingPrompts:
    """
    Structured prompts to help users write stronger clinical entries.
    Organized by field type (presenting_issues, reflection) and what's missing.
    """
    
    PRESENTING_ISSUES_PROMPTS = {
        'basic': {
            'clinical_detail': [
                "What specific symptoms did the client report?",
                "How long has the client been experiencing these issues?",
                "How are these issues affecting the client's daily functioning?",
                "What is the severity of the presentation (mild, moderate, severe)?",
            ],
            'structured_format': [
                "Presenting concerns: What brought the client in?",
                "Duration and onset: When did this start?",
                "Current symptoms: What are they experiencing now?",
                "Functional impact: How is this affecting their life?",
            ]
        },
        'adequate': {
            'depth': [
                "Are there any relevant background factors (e.g., trauma, life stressors)?",
                "What patterns or themes emerged in the presentation?",
                "How does the client understand or explain their difficulties?",
                "What coping strategies has the client tried?",
            ],
            'clinical_language': [
                "Consider using clinical terminology where appropriate (e.g., symptoms, presentation, functioning)",
                "Include relevant diagnostic or formulation language if applicable",
                "Describe the severity or intensity of symptoms more specifically",
            ]
        },
        'strong': {
            'refinement': [
                "Your entry shows strong clinical detail. Consider if there are any additional contextual factors worth noting.",
                "Well documented. You might add any cultural or systemic factors if relevant.",
            ]
        }
    }
    
    REFLECTION_PROMPTS = {
        'basic': {
            'learning': [
                "What did you learn from this clinical interaction?",
                "Which AHPRA competencies (C1-C8) did you apply or develop?",
                "What theoretical concepts or approaches did you use?",
                "What surprised you or challenged your assumptions?",
            ],
            'structure': [
                "What happened during the session? (Description)",
                "What did you learn or notice? (Analysis)",
                "What would you do differently next time? (Application)",
            ]
        },
        'adequate': {
            'growth': [
                "What skills did you practice or develop in this interaction?",
                "How does this relate to your learning goals or development plan?",
                "What feedback did you receive from your supervisor about this?",
                "What evidence or research informed your approach?",
            ],
            'competencies': [
                "C1: How did you apply psychological science or evidence-based practice?",
                "C2: What ethical considerations arose and how did you address them?",
                "C3: How did you reflect on your own practice, biases, or development areas?",
                "C4: What assessment methods or clinical reasoning did you use?",
                "C5: What interventions did you implement and why?",
                "C6: How did you establish rapport and communicate with the client?",
                "C7: How did you consider cultural factors or diversity issues?",
                "C8: How did you work with others (e.g., supervisor, colleagues)?",
            ]
        },
        'strong': {
            'refinement': [
                "Your reflection demonstrates strong professional learning. Consider expanding on any supervision discussions.",
                "Excellent reflective depth. You might add specific examples of how this will inform future practice.",
            ]
        }
    }
    
    @classmethod
    def get_presenting_issues_prompts(cls, quality_level, missing_elements=None):
        """
        Get relevant prompts for presenting issues based on quality level and what's missing.
        
        Args:
            quality_level: 'basic', 'adequate', or 'strong'
            missing_elements: List of element types that are missing (e.g., ['clinical_terms', 'structure'])
        
        Returns:
            List of prompt strings
        """
        prompts = []
        
        if quality_level == 'basic':
            # Basic entries need fundamental clinical detail
            prompts.extend(cls.PRESENTING_ISSUES_PROMPTS['basic']['clinical_detail'])
            prompts.extend(cls.PRESENTING_ISSUES_PROMPTS['basic']['structured_format'][:2])  # First 2 structure prompts
        elif quality_level == 'adequate':
            # Adequate entries can be enhanced with depth
            prompts.extend(cls.PRESENTING_ISSUES_PROMPTS['adequate']['depth'][:3])
            if missing_elements and 'clinical_terms' in missing_elements:
                prompts.extend(cls.PRESENTING_ISSUES_PROMPTS['adequate']['clinical_language'][:2])
        else:  # strong
            prompts.extend(cls.PRESENTING_ISSUES_PROMPTS['strong']['refinement'])
        
        return prompts[:5]  # Limit to 5 prompts to avoid overwhelming
    
    @classmethod
    def get_reflection_prompts(cls, quality_level, missing_elements=None):
        """
        Get relevant prompts for reflection based on quality level and what's missing.
        
        Args:
            quality_level: 'basic', 'adequate', or 'strong'
            missing_elements: List of element types that are missing (e.g., ['learning_terms', 'competencies'])
        
        Returns:
            List of prompt strings
        """
        prompts = []
        
        if quality_level == 'basic':
            # Basic reflections need fundamental structure
            prompts.extend(cls.REFLECTION_PROMPTS['basic']['structure'])
            prompts.extend(cls.REFLECTION_PROMPTS['basic']['learning'][:2])
        elif quality_level == 'adequate':
            # Adequate reflections can add competency links and growth focus
            prompts.extend(cls.REFLECTION_PROMPTS['adequate']['growth'][:3])
            if missing_elements and 'competencies' in missing_elements:
                prompts.extend(cls.REFLECTION_PROMPTS['adequate']['competencies'][:3])
        else:  # strong
            prompts.extend(cls.REFLECTION_PROMPTS['strong']['refinement'])
        
        return prompts[:6]  # Slightly more prompts for reflection as it's more complex

