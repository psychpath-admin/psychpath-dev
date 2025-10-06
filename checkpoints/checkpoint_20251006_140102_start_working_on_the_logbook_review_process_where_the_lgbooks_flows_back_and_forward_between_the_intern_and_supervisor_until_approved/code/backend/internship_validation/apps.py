from django.apps import AppConfig


class InternshipValidationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'internship_validation'
    
    def ready(self):
        import internship_validation.signals