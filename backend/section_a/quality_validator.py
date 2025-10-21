"""
Clinical quality validator for DCC entries.
Non-AI rule-based validation using keyword matching and structural analysis.
"""

import re
from typing import Dict, List, Tuple


class ClinicalQualityValidator:
    """
    Non-AI rule-based validator for clinical entry quality.
    Analyzes text for clinical terminology, structure, and reflection depth.
    Provides feedback and suggestions without blocking saves.
    """
    
    # Clinical terminology for presenting issues
    CLINICAL_TERMS = {
        'symptoms': [
            'anxiety', 'depression', 'stress', 'trauma', 'mood', 'affect', 
            'cognition', 'cognitive', 'behavior', 'behaviour', 'sleep', 'appetite',
            'worry', 'fear', 'panic', 'rumination', 'intrusive', 'avoidance',
            'irritability', 'anger', 'sadness', 'hopelessness', 'anhedonia',
            'concentration', 'memory', 'attention', 'thinking', 'thoughts'
        ],
        'diagnoses': [
            'ptsd', 'ocd', 'gad', 'mdd', 'adhd', 'asd', 'bpd', 'npd',
            'schizophrenia', 'bipolar', 'panic', 'phobia', 'eating disorder',
            'substance', 'addiction', 'personality', 'psychosis', 'mania',
            'depression', 'anxiety disorder', 'trauma', 'adjustment'
        ],
        'psychological': [
            'assessment', 'formulation', 'presentation', 'symptoms', 
            'diagnosis', 'comorbid', 'clinical', 'psychological',
            'psychometric', 'screening', 'evaluation', 'case conceptualization',
            'differential', 'mental health', 'psychiatric', 'wellbeing'
        ],
        'duration': [
            'weeks', 'months', 'years', 'recently', 'ongoing', 'acute', 
            'chronic', 'persistent', 'episodic', 'since', 'started', 
            'began', 'duration', 'history', 'long-term', 'short-term',
            'recurrent', 'first episode', 'relapse'
        ],
        'severity': [
            'mild', 'moderate', 'severe', 'significant', 'persistent',
            'intermittent', 'minimal', 'extreme', 'debilitating', 'manageable',
            'overwhelming', 'intense', 'frequent', 'constant', 'occasional'
        ],
        'impact': [
            'functioning', 'function', 'work', 'employment', 'relationships',
            'social', 'daily activities', 'impairment', 'disability', 
            'interference', 'affect', 'impact', 'struggle', 'difficulty',
            'unable', 'capacity', 'performance', 'quality of life'
        ]
    }
    
    # Reflection depth indicators
    REFLECTION_TERMS = {
        'learning': [
            'learned', 'learn', 'discovered', 'realized', 'understood',
            'insight', 'awareness', 'noticed', 'recognized', 'observed',
            'identified', 'became aware', 'understanding', 'knowledge'
        ],
        'growth': [
            'develop', 'developing', 'developed', 'improve', 'improving',
            'enhance', 'enhancing', 'strengthen', 'build', 'building',
            'practice', 'practicing', 'apply', 'applying', 'applied',
            'refine', 'skill', 'competence', 'capability', 'growth'
        ],
        'challenges': [
            'difficult', 'difficulty', 'challenging', 'challenge', 'struggled',
            'struggle', 'uncertain', 'uncertainty', 'unsure', 'questioned',
            'question', 'dilemma', 'complex', 'complicated', 'confused',
            'unfamiliar', 'new to', 'uncomfortable'
        ],
        'supervision': [
            'supervisor', 'supervision', 'discussed', 'discuss', 'feedback',
            'guidance', 'consultation', 'consulted', 'debriefed', 'debrief',
            'advised', 'supported', 'mentored', 'reviewed', 'reflected with'
        ],
        'competencies': [
            'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
            'competency', 'competencies', 'ethical', 'ethics', 'assessment',
            'intervention', 'communication', 'communicate', 'cultural',
            'culture', 'diversity', 'reflexivity', 'reflective', 'evidence-based',
            'research', 'theory', 'theoretical', 'professional development'
        ]
    }
    
    @classmethod
    def validate_presenting_issues(cls, text: str) -> Dict:
        """
        Validate presenting issues for clinical quality.
        
        Args:
            text: The presenting issues text to validate
        
        Returns:
            Dictionary with quality, score, feedback, and missing_elements
        """
        if not text or len(text.strip()) < 10:
            return {
                'quality': 'basic',
                'score': 0,
                'feedback': ['Entry is too short for quality assessment. Minimum 10 characters required.'],
                'missing_elements': ['content']
            }
        
        text_lower = text.lower()
        length = len(text.strip())
        
        # Count clinical term categories present
        categories_found = {}
        for category, terms in cls.CLINICAL_TERMS.items():
            found = sum(1 for term in terms if term in text_lower)
            categories_found[category] = found > 0
        
        categories_present = sum(categories_found.values())
        missing_elements = [cat for cat, found in categories_found.items() if not found]
        
        # Calculate score based on length and clinical terms
        score = 0
        feedback = []
        
        # Length component (40 points max)
        if length >= 150:
            score += 40
        elif length >= 100:
            score += 30
            feedback.append("Good detail. Consider expanding to 150+ characters for even stronger documentation.")
        elif length >= 50:
            score += 20
            feedback.append("Entry could benefit from more clinical detail.")
        else:
            score += 10
            feedback.append("Entry is quite brief. Add more clinical detail about symptoms, duration, and impact.")
        
        # Clinical terminology (60 points max - 10 per category)
        score += categories_present * 10
        
        # Provide specific feedback
        if not categories_found['symptoms']:
            feedback.append("Consider describing specific symptoms the client reported.")
        if not categories_found['duration']:
            feedback.append("Include information about duration or onset (e.g., weeks, months, recent).")
        if not categories_found['severity']:
            feedback.append("Describe the severity of symptoms (e.g., mild, moderate, severe).")
        if not categories_found['impact']:
            feedback.append("Explain how the issues are affecting the client's daily functioning.")
        
        # Determine quality level
        if score >= 70:
            quality = 'strong'
            if not feedback:
                feedback.append("Excellent clinical detail and documentation quality.")
        elif score >= 40:
            quality = 'adequate'
        else:
            quality = 'basic'
        
        return {
            'quality': quality,
            'score': score,
            'feedback': feedback,
            'missing_elements': missing_elements
        }
    
    @classmethod
    def validate_reflection(cls, text: str) -> Dict:
        """
        Validate reflection for depth and professional learning.
        
        Args:
            text: The reflection text to validate
        
        Returns:
            Dictionary with quality, score, feedback, and missing_elements
        """
        if not text or len(text.strip()) < 20:
            return {
                'quality': 'basic',
                'score': 0,
                'feedback': ['Reflection is too short for quality assessment. Minimum 20 characters required.'],
                'missing_elements': ['content']
            }
        
        text_lower = text.lower()
        length = len(text.strip())
        
        # Count reflection term categories present
        categories_found = {}
        for category, terms in cls.REFLECTION_TERMS.items():
            found = sum(1 for term in terms if term in text_lower)
            categories_found[category] = found > 0
        
        categories_present = sum(categories_found.values())
        missing_elements = [cat for cat, found in categories_found.items() if not found]
        
        # Calculate score based on length and reflection depth
        score = 0
        feedback = []
        
        # Length component (30 points max)
        if length >= 200:
            score += 30
        elif length >= 150:
            score += 25
        elif length >= 80:
            score += 15
            feedback.append("Good start. Consider expanding to 150+ characters for deeper reflection.")
        else:
            score += 5
            feedback.append("Reflection is quite brief. Add more detail about what you learned and how you'll grow.")
        
        # Reflection depth (70 points max - 14 per category)
        score += categories_present * 14
        
        # Provide specific feedback
        if not categories_found['learning']:
            feedback.append("What did you learn from this interaction? Include insights or new understanding.")
        if not categories_found['growth']:
            feedback.append("Describe how this experience contributes to your professional development.")
        if not categories_found['competencies']:
            feedback.append("Consider linking to AHPRA competencies (C1-C8) or specific skills practiced.")
        if not categories_found['supervision']:
            feedback.append("Include any supervisor feedback or supervision discussions if relevant.")
        
        # Check for reflective structure (what/so what/now what)
        has_structure = cls._check_reflective_structure(text_lower)
        if has_structure:
            score += 10
        else:
            feedback.append("Try using a structured approach: What happened? What did you learn? What will you do differently?")
        
        # Determine quality level
        if score >= 70:
            quality = 'strong'
            if len(feedback) == 0:
                feedback.append("Excellent reflective depth and professional learning demonstrated.")
        elif score >= 40:
            quality = 'adequate'
        else:
            quality = 'basic'
        
        return {
            'quality': quality,
            'score': score,
            'feedback': feedback,
            'missing_elements': missing_elements
        }
    
    @classmethod
    def _check_reflective_structure(cls, text_lower: str) -> bool:
        """
        Check if reflection shows structured thinking (description -> analysis -> application).
        
        Returns:
            True if structure is detected, False otherwise
        """
        # Look for patterns indicating structured reflection
        descriptive_patterns = ['during', 'when', 'client', 'session', 'we', 'i noticed']
        analytical_patterns = ['learned', 'realized', 'understood', 'because', 'this shows', 'indicated']
        application_patterns = ['next time', 'will', 'plan to', 'going forward', 'future', 'continue to']
        
        has_description = any(pattern in text_lower for pattern in descriptive_patterns)
        has_analysis = any(pattern in text_lower for pattern in analytical_patterns)
        has_application = any(pattern in text_lower for pattern in application_patterns)
        
        # Needs at least 2 of 3 components
        return sum([has_description, has_analysis, has_application]) >= 2

