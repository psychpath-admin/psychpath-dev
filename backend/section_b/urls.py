from django.urls import path
from . import views

urlpatterns = [
    path('entries/', views.ProfessionalDevelopmentEntryListCreateView.as_view(), name='pd-entries-list'),
    path('entries/<int:pk>/', views.ProfessionalDevelopmentEntryDetailView.as_view(), name='pd-entries-detail'),
    path('competencies/', views.PDCompetencyListView.as_view(), name='pd-competencies-list'),
    path('entries/grouped-by-week/', views.pd_entries_grouped_by_week, name='pd-entries-grouped'),
    path('summary-metrics/', views.pd_summary_metrics, name='pd-summary-metrics'),
]
