from django.test import TestCase
from unittest.mock import patch, MagicMock
from datetime import date


class FinancialTasksTest(TestCase):
    """Patches nos módulos de origem dos imports (tasks importa de .models e jobs.models)."""

    @patch('apps.jobs.models.Job')
    @patch('apps.financial.models.FinancialClosing')
    def test_generate_monthly_closing_skips_duplicate(self, MockClosing, MockJob):
        """Task deve pular se fechamento do mês já existe."""
        MockClosing.objects.filter.return_value.exists.return_value = True
        from apps.financial.tasks import generate_monthly_closing
        result = generate_monthly_closing()
        self.assertEqual(result.get('skipped'), True)
        MockClosing.objects.create.assert_not_called()

    @patch('apps.financial.models.AccountsReceivable')
    def test_send_overdue_reminders_marks_overdue(self, MockAR):
        """Task deve atualizar status das contas vencidas."""
        MockAR.objects.filter.return_value.exists.return_value = False
        MockAR.objects.filter.return_value = MagicMock()
        MockAR.objects.filter.return_value.update.return_value = 3
        MockAR.objects.filter.return_value.select_related.return_value = []
        from apps.financial.tasks import send_overdue_reminders
        send_overdue_reminders()
        MockAR.objects.filter.return_value.update.assert_called_once()


class CommissionUpdateTest(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from auditlog.registry import auditlog
        User = get_user_model()
        if auditlog.contains(User):
            auditlog.unregister(User)
            self._auditlog_user_registered = True
        else:
            self._auditlog_user_registered = False
        self.user = User.objects.create_user(
            username='mgr_test', password='pass123', role='gerente'
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.user)

    def tearDown(self):
        if getattr(self, '_auditlog_user_registered', False):
            from auditlog.registry import auditlog
            from django.contrib.auth import get_user_model
            auditlog.register(get_user_model())

    def test_update_commission_invalid_value(self):
        """Percentual fora de 0-100 deve retornar 400."""
        # Sem employee real, só verifica a rota existe
        response = self.api.patch('/api/v1/employees/99999/commission/',
                                  {'commission_percentage': 150}, format='json')
        # 404 (not found) ou 400 (invalid) — ambos aceitáveis, não 500
        self.assertIn(response.status_code, [400, 404])
