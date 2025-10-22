class SupervisionWritingPrompts:
    """Provide writing prompts for supervision summaries"""
    
    @staticmethod
    def get_supervision_summary_prompts(text: str) -> list:
        """Return contextual prompts for supervision summary"""
        prompts = []
        
        # Check what's missing and provide relevant prompts
        text_lower = text.lower()
        
        # Key topics or cases discussed
        if not any(word in text_lower for word in ['discussed', 'reviewed', 'addressed', 'covered', 'case', 'client']):
            prompts.append("What key topics or cases were discussed in this supervision session?")
        
        # Specific feedback received
        if not any(word in text_lower for word in ['feedback', 'guidance', 'advice', 'suggestion', 'recommendation']):
            prompts.append("What specific feedback did you receive from your supervisor?")
        
        # Skills or competencies addressed
        if not any(word in text_lower for word in ['skill', 'competency', 'development', 'learning', 'practice', 'technique']):
            prompts.append("Which skills or competencies were addressed or developed?")
        
        # Action items or follow-up tasks
        if not any(word in text_lower for word in ['action', 'follow', 'next', 'plan', 'goal', 'task', 'homework']):
            prompts.append("Were there any action items or follow-up tasks assigned?")
        
        # Clinical insights gained
        if not any(word in text_lower for word in ['insight', 'understanding', 'realization', 'learning', 'discovery', 'breakthrough']):
            prompts.append("What clinical or professional insights did you gain from this session?")
        
        # Concerns or challenges raised
        if not any(word in text_lower for word in ['concern', 'challenge', 'difficulty', 'issue', 'problem', 'struggle']):
            prompts.append("Were any concerns or challenges raised during the supervision?")
        
        # Supervision format or structure
        if not any(word in text_lower for word in ['individual', 'group', 'case', 'presentation', 'review', 'discussion']):
            prompts.append("What was the format or structure of this supervision session?")
        
        # Duration and context
        if not any(word in text_lower for word in ['hour', 'minute', 'session', 'meeting', 'appointment']):
            prompts.append("How long was the session and what was the context?")
        
        # If no specific prompts needed, provide general improvement suggestions
        if not prompts:
            prompts.extend([
                "Consider adding more specific details about the clinical content discussed",
                "Mention any particular techniques or approaches covered",
                "Include any notable insights or learning outcomes from the session"
            ])
        
        return prompts
