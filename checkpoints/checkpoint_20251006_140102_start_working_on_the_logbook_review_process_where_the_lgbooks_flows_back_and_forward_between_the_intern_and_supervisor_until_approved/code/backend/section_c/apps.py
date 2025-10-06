from django.apps import AppConfig

class SectionCConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'section_c'

    def ready(self):
        import section_c.signals # noqa
