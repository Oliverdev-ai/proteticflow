import logging
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def error_response(message, code=status.HTTP_400_BAD_REQUEST, extra=None):
    data = {'error': message}
    if extra:
        data.update(extra)
    return Response(data, status=code)


def log_and_response(message, exc=None, code=status.HTTP_500_INTERNAL_SERVER_ERROR, extra=None):
    logger.error(message, exc_info=exc)
    return error_response(message, code=code, extra=extra)
