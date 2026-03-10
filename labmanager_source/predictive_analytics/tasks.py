from celery import shared_task
from .analytics_engine import RevenuePredictionEngine

@shared_task
def async_predict_revenue(months_ahead):
    engine = RevenuePredictionEngine()
    return engine.predict_revenue(months_ahead) 