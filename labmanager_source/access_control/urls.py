from django.urls import path
from . import views
from .views import RolePermissionsView

app_name = 'access_control'

urlpatterns = [
    # Planos e assinaturas
    path('subscription-plans/', views.SubscriptionPlanListView.as_view(), name='subscription-plans'),
    path('my-subscription/', views.UserSubscriptionDetailView.as_view(), name='my-subscription'),
    
    # Papéis e perfis
    path('user-roles/', views.UserRoleListView.as_view(), name='user-roles'),
    path('my-profile/', views.UserProfileDetailView.as_view(), name='my-profile'),
    
    # Controle de acesso
    path('access-status/', views.AccessControlStatusView.as_view(), name='access-status'),
    path('check-feature-access/', views.FeatureAccessCheckView.as_view(), name='check-feature-access'),
    
    # Uso e limites
    path('usage-tracking/', views.UsageTrackingListView.as_view(), name='usage-tracking'),
    path('usage-summary/', views.UsageSummaryView.as_view(), name='usage-summary'),
    path('track-usage/', views.track_feature_usage, name='track-usage'),
    
    # Restrições
    path('access-restrictions/', views.AccessRestrictionListView.as_view(), name='access-restrictions'),
    path('create-restriction/', views.create_access_restriction, name='create-restriction'),
    path('lift-restriction/<int:restriction_id>/', views.lift_access_restriction, name='lift-restriction'),
    
    # Administração
    path('update-user-limits/<int:user_id>/', views.UserLimitsUpdateView.as_view(), name='update-user-limits'),
    path('admin-dashboard/', views.admin_dashboard_data, name='admin-dashboard'),
    path('permissions/', RolePermissionsView.as_view(), name='role-permissions'),
]

