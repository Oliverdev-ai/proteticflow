import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'labmanager.settings')

app = Celery('labmanager')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks() 