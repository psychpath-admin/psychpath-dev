class PDWritingPrompts:
    """Provide writing prompts for PD activities"""
    
    @staticmethod
    def get_activity_details_prompts(text: str) -> list:
        """Return contextual prompts for activity details"""
        prompts = []
        
        # Check what's missing and provide relevant prompts
        text_lower = text.lower()
        
        # Presenter/facilitator prompts
        if not any(word in text_lower for word in ['presenter', 'facilitator', 'instructor', 'speaker', 'by ']):
            prompts.append("Who was the presenter or facilitator? Include their name and credentials if relevant.")
        
        # Institution/organization prompts
        if not any(word in text_lower for word in ['university', 'college', 'institute', 'association', 'society', 'organization', 'centre', 'center']):
            prompts.append("Which institution or organization hosted this activity? Include the full name.")
        
        # Format prompts
        if not any(word in text_lower for word in ['workshop', 'webinar', 'seminar', 'conference', 'course', 'training', 'lecture', 'presentation']):
            prompts.append("What was the format? (e.g., '2-day workshop', 'online webinar', 'conference presentation')")
        
        # Duration prompts
        if not any(word in text_lower for word in ['hour', 'day', 'week', 'session', 'duration', 'length']):
            prompts.append("How long was the activity? Include duration (e.g., '3-hour workshop', 'full-day seminar')")
        
        # Content/topics prompts
        if len(text.split()) < 15:
            prompts.append("What were the key topics or learning objectives covered? Be specific about the content.")
        
        # Relevance prompts
        if not any(word in text_lower for word in ['practice', 'clinical', 'professional', 'development', 'competency', 'skill']):
            prompts.append("How does this relate to your professional practice? Why was it relevant to your development?")
        
        # Location prompts (if not online)
        if 'online' not in text_lower and 'virtual' not in text_lower and 'zoom' not in text_lower:
            if not any(word in text_lower for word in ['location', 'venue', 'at ', 'in ']):
                prompts.append("Where was this activity held? Include the location or venue if relevant.")
        
        # If no specific prompts needed, provide general improvement suggestions
        if not prompts:
            prompts.extend([
                "Consider adding more specific details about the learning outcomes",
                "Mention any practical applications or skills gained",
                "Include any notable presenters or their expertise areas"
            ])
        
        return prompts

    @staticmethod
    def get_topics_prompts(text: str) -> list:
        """Prompts tailored for topics covered field."""
        prompts: list[str] = []
        tl = text.lower()

        # Techniques / models
        if not any(k in tl for k in ['cbt', 'act', 'emdr', 'schema', 'dbt', 'motivational interviewing', 'exposure']):
            prompts.append("Which techniques or models were covered (e.g., CBT, ACT, EMDR)?")

        # Assessment vs intervention
        if 'assessment' not in tl and 'intervention' not in tl:
            prompts.append("Was the focus on assessment, intervention, or both? Include examples.")

        # Population / context
        if not any(k in tl for k in ['adolescent', 'child', 'adult', 'older', 'aboriginal', 'torres strait', 'forensic', 'school', 'primary care']):
            prompts.append("Which populations or contexts were emphasised (e.g., adolescents, forensic, primary care)?")

        # Measurement / outcomes
        if not any(k in tl for k in ['outcome', 'measurement', 'monitor', 'evaluation']):
            prompts.append("How were outcomes or progress measured and monitored?")

        # Resources / evidence
        if 'evidence' not in tl and 'guideline' not in tl and 'resource' not in tl:
            prompts.append("Were key resources or evidence/guidelines referenced? Name them if relevant.")

        if not prompts:
            prompts.extend([
                "Summarise the key learning objectives",
                "Note any skills practised (e.g., role‑play, case formulation)",
                "State how these topics connect to your current practice"
            ])
        return prompts
