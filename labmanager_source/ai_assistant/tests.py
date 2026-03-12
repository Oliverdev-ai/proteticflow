from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CustomUser
from .command_processor import CommandProcessor


class AIAssistantSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_available_commands_endpoint(self):
        user = CustomUser.objects.create_user(
            username='user1',
            password='pass1234',
            role='producao',
        )
        self.client.force_authenticate(user=user)

        response = self.client.get('/api/v1/ai-assistant/available-commands/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data.get('available_commands'), list)

    def test_admin_only_commands_visible_for_manager(self):
        gerente = CustomUser.objects.create_user(
            username='gerente1',
            password='pass1234',
            role='gerente',
        )
        producao = CustomUser.objects.create_user(
            username='producao1',
            password='pass1234',
            role='producao',
        )

        gerente_commands = CommandProcessor(gerente).get_available_commands()
        producao_commands = CommandProcessor(producao).get_available_commands()
        self.assertGreater(len(gerente_commands), len(producao_commands))

    def test_chat_uses_message_field(self):
        user = CustomUser.objects.create_user(
            username='user2',
            password='pass1234',
            role='producao',
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            '/api/v1/ai-assistant/chat/',
            {'message': 'listar clientes'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('response', response.data)
        self.assertIsInstance(response.data['response'], str)
        self.assertGreater(len(response.data['response']), 0)
