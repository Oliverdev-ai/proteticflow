"""
Staging settings for ProteticFlow.
Based on production settings with safer defaults for non-HTTPS environments.
"""

import os
from .settings_production import *  # noqa: F403,F401

# Staging should not force HTTPS by default
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Allow configuring email security flags from env for MailHog
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False').lower() == 'true'

# Log to mounted /app/logs by default in staging
if 'LOGGING' in globals() and 'handlers' in LOGGING and 'file' in LOGGING['handlers']:
    LOGGING['handlers']['file']['filename'] = os.environ.get(
        'LOG_FILE', '/app/logs/django.log'
    )
