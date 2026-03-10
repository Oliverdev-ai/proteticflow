import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch
from .models import RevenuePredictor
from .analytics_engine import RevenuePredictionEngine
from .tasks import async_predict_revenue
import factory

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    username = factory.Sequence(lambda n: f'user{n}')
    password = factory.PostGenerationMethodCall('set_password', 'pass')

@pytest.mark.django_db
def test_revenue_prediction_engine_returns_valid_result():
    engine = RevenuePredictionEngine()
    with patch.object(engine, 'predict_revenue', return_value=[{'predicted_revenue': 1000, 'confidence': 0.9, 'year': 2025, 'month': 6}]):
        result = engine.predict_revenue(months_ahead=3)
        assert isinstance(result, list)
        assert all('predicted_revenue' in p for p in result)

@pytest.mark.django_db
def test_revenue_prediction_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    with patch('predictive_analytics.analytics_engine.RevenuePredictionEngine.predict_revenue', return_value=[{'predicted_revenue': 1000, 'confidence': 0.9, 'year': 2025, 'month': 6}]):
        response = client.post('/api/predictive_analytics/revenue-prediction/', {'months_ahead': 3, 'include_factors': True}, format='json')
        assert response.status_code == 200
        assert 'predictions' in response.json()

@pytest.mark.django_db
def test_async_predict_revenue_task():
    with patch('predictive_analytics.analytics_engine.RevenuePredictionEngine.predict_revenue', return_value=[{'predicted_revenue': 1000, 'confidence': 0.9, 'year': 2025, 'month': 6}]):
        result = async_predict_revenue.delay(3)
        assert result.successful()
        assert isinstance(result.result, list)
        assert result.result[0]['predicted_revenue'] == 1000
