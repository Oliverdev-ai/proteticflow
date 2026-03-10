import pytest
from django.conf import settings

@pytest.fixture(autouse=True)
def celery_eager():
    settings.CELERY_TASK_ALWAYS_EAGER = True 