from django.urls import path
from . import views

urlpatterns = [
    # Períodos de folha
    path('payroll-periods/', views.PayrollPeriodListCreateView.as_view(), name='payroll-period-list-create'),
    path('payroll-periods/<int:pk>/', views.PayrollPeriodDetailView.as_view(), name='payroll-period-detail'),
    path('payroll-periods/<int:period_id>/close/', views.close_payroll_period, name='close-payroll-period'),
    path('payroll-periods/<int:period_id>/generate-entries/', views.generate_payroll_entries, name='generate-payroll-entries'),

    # Entradas de folha
    path('payroll-entries/', views.PayrollEntryListCreateView.as_view(), name='payroll-entry-list-create'),
    path('payroll-entries/<int:pk>/', views.PayrollEntryDetailView.as_view(), name='payroll-entry-detail'),

    # Relatórios financeiros
    path('financial-reports/', views.FinancialReportListView.as_view(), name='financial-report-list'),
    path('generate-monthly-closing/', views.generate_monthly_closing, name='generate-monthly-closing'),
    path('generate-annual-balance/', views.generate_annual_balance, name='generate-annual-balance'),
]
