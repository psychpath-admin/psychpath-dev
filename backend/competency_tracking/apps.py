from django.apps import AppConfig

class CompetencyTrackingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'competency_tracking'
    
    def ready(self):
        import competency_tracking.signals