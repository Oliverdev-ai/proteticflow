import uuid
import json
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ChatSession, ChatMessage, AICommand, CommandExecution
from .serializers import (
    ChatSessionSerializer, ChatMessageSerializer, ChatRequestSerializer,
    ChatResponseSerializer, AICommandSerializer, CommandExecutionSerializer
)
from .command_processor import CommandProcessor


class ChatSessionListView(generics.ListCreateAPIView):
    """View para listar e criar sessões de chat"""
    
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChatSession.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-updated_at')
    
    def perform_create(self, serializer):
        session_id = str(uuid.uuid4())
        serializer.save(
            user=self.request.user,
            session_id=session_id
        )


class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View para operações detalhadas em sessões de chat"""
    
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        # Soft delete - marca como inativa
        instance.is_active = False
        instance.save()


class ChatMessageListView(generics.ListAPIView):
    """View para listar mensagens de uma sessão"""
    
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        session_id = self.kwargs.get('session_id')
        try:
            session = ChatSession.objects.get(
                session_id=session_id,
                user=self.request.user
            )
            return session.messages.all().order_by('created_at')
        except ChatSession.DoesNotExist:
            return ChatMessage.objects.none()


class ChatView(APIView):
    """View principal para interação com o chat"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Processa uma mensagem de chat"""
        
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        message_text = serializer.validated_data['message']
        session_id = serializer.validated_data.get('session_id')
        
        # Obtém ou cria sessão
        session = self._get_or_create_session(request.user, session_id)
        
        # Salva mensagem do usuário
        user_message = ChatMessage.objects.create(
            session=session,
            message_type=ChatMessage.MessageType.USER,
            content=message_text
        )
        
        # Processa comando
        processor = CommandProcessor(request.user)
        result = processor.process_command(message_text)
        
        # Prepara resposta
        if result['success']:
            response_text = self._format_success_response(result)
            command_executed = result.get('command')
            execution_result = result.get('result')
        else:
            response_text = result['message']
            command_executed = None
            execution_result = None
        
        # Salva resposta do assistente
        assistant_message = ChatMessage.objects.create(
            session=session,
            message_type=ChatMessage.MessageType.ASSISTANT,
            content=response_text,
            command_executed=command_executed,
            execution_result=execution_result
        )
        
        # Registra execução do comando
        if command_executed:
            self._log_command_execution(
                user=request.user,
                command_name=command_executed,
                input_text=message_text,
                result=result,
                message=assistant_message
            )
        
        # Atualiza título da sessão se for a primeira mensagem
        if session.messages.count() == 2:  # User + Assistant
            session.title = self._generate_session_title(message_text)
            session.save()
        
        # Atualiza timestamp da sessão
        session.updated_at = timezone.now()
        session.save()
        
        # Prepara resposta
        response_data = {
            'session_id': session.session_id,
            'message_id': assistant_message.id,
            'response': response_text,
            'command_executed': command_executed,
            'execution_result': execution_result,
            'success': result['success'],
            'execution_time': result.get('execution_time')
        }
        
        if not result['success'] and 'suggestions' in result:
            response_data['suggestions'] = result['suggestions']
        
        return Response(response_data)
    
    def _get_or_create_session(self, user, session_id=None):
        """Obtém sessão existente ou cria nova"""
        if session_id:
            try:
                return ChatSession.objects.get(
                    session_id=session_id,
                    user=user,
                    is_active=True
                )
            except ChatSession.DoesNotExist:
                pass
        
        # Cria nova sessão
        return ChatSession.objects.create(
            user=user,
            session_id=str(uuid.uuid4())
        )
    
    def _format_success_response(self, result):
        """Formata resposta de sucesso"""
        command_result = result.get('result', {})
        
        if isinstance(command_result, dict):
            if 'titulo' in command_result:
                response = f"✅ **{command_result['titulo']}**\n\n"
                
                # Formata diferentes tipos de resultado
                if 'trabalhos' in command_result:
                    response += self._format_trabalhos_response(command_result)
                elif 'clientes' in command_result:
                    response += self._format_clientes_response(command_result)
                elif 'entregas' in command_result:
                    response += self._format_entregas_response(command_result)
                elif 'mensagem' in command_result:
                    response += command_result['mensagem']
                    if 'proximos_passos' in command_result:
                        response += "\n\n**Próximos passos:**\n"
                        for i, passo in enumerate(command_result['proximos_passos'], 1):
                            response += f"{i}. {passo}\n"
                else:
                    response += json.dumps(command_result, indent=2, ensure_ascii=False)
                
                return response
        
        return f"✅ Comando executado com sucesso!\n\n{json.dumps(command_result, indent=2, ensure_ascii=False)}"
    
    def _format_trabalhos_response(self, data):
        """Formata resposta com lista de trabalhos"""
        response = f"**Total:** {data.get('total', len(data['trabalhos']))} trabalhos\n\n"
        
        for trabalho in data['trabalhos'][:10]:  # Limita exibição
            response += f"🔹 **{trabalho['numero_ordem']}** - {trabalho['cliente']}\n"
            response += f"   Paciente: {trabalho.get('paciente', 'N/A')}\n"
            
            if 'status' in trabalho:
                response += f"   Status: {trabalho['status']}\n"
            
            if 'data_vencimento' in trabalho:
                response += f"   Vencimento: {trabalho['data_vencimento']}"
                if 'dias_para_vencimento' in trabalho:
                    dias = trabalho['dias_para_vencimento']
                    if dias < 0:
                        response += f" (⚠️ {abs(dias)} dias atrasado)"
                    elif dias <= 2:
                        response += f" (🔥 {dias} dias restantes)"
                response += "\n"
            
            if 'valor' in trabalho and trabalho['valor']:
                response += f"   Valor: R$ {trabalho['valor']:.2f}\n"
            
            response += "\n"
        
        if len(data['trabalhos']) > 10:
            response += f"... e mais {len(data['trabalhos']) - 10} trabalhos.\n"
        
        return response
    
    def _format_clientes_response(self, data):
        """Formata resposta com lista de clientes"""
        response = f"**Total:** {data.get('total', len(data['clientes']))} clientes\n\n"
        
        for cliente in data['clientes'][:15]:  # Limita exibição
            response += f"🏢 **{cliente['nome']}**\n"
            response += f"   📞 {cliente.get('telefone', 'N/A')}\n"
            
            if cliente.get('email') and cliente['email'] != 'N/A':
                response += f"   📧 {cliente['email']}\n"
            
            if cliente.get('cidade') and cliente['cidade'] != 'N/A':
                response += f"   📍 {cliente['cidade']}\n"
            
            if 'total_trabalhos' in cliente:
                response += f"   📋 {cliente['total_trabalhos']} trabalhos\n"
            
            response += "\n"
        
        return response
    
    def _format_entregas_response(self, data):
        """Formata resposta com lista de entregas"""
        response = f"**Total:** {data.get('total', len(data['entregas']))} entregas\n\n"
        
        for entrega in data['entregas']:
            response += f"📦 **{entrega['numero_ordem']}** - {entrega['cliente']}\n"
            response += f"   Paciente: {entrega.get('paciente', 'N/A')}\n"
            response += f"   Tipo: {entrega.get('tipo_protese', 'N/A')}\n"
            
            if entrega.get('telefone_cliente'):
                response += f"   📞 {entrega['telefone_cliente']}\n"
            
            if entrega.get('endereco') and entrega['endereco'] != 'N/A':
                response += f"   📍 {entrega['endereco']}\n"
            
            response += "\n"
        
        return response
    
    def _generate_session_title(self, first_message):
        """Gera título para a sessão baseado na primeira mensagem"""
        message_lower = first_message.lower()
        
        if 'relatório' in message_lower or 'relatorio' in message_lower:
            return "Relatórios"
        elif 'trabalho' in message_lower and 'pendente' in message_lower:
            return "Trabalhos Pendentes"
        elif 'entrega' in message_lower:
            return "Entregas"
        elif 'cadastrar' in message_lower or 'cadastro' in message_lower:
            return "Cadastros"
        elif 'cliente' in message_lower:
            return "Clientes"
        elif 'baixa' in message_lower:
            return "Baixas de Trabalho"
        else:
            return first_message[:50] + "..." if len(first_message) > 50 else first_message
    
    def _log_command_execution(self, user, command_name, input_text, result, message):
        """Registra execução do comando"""
        try:
            # Busca comando na base de dados (se existir)
            try:
                command = AICommand.objects.get(name=command_name)
            except AICommand.DoesNotExist:
                # Cria comando se não existir
                command = AICommand.objects.create(
                    name=command_name,
                    description=f"Comando {command_name}",
                    keywords=[command_name],
                    function_name=command_name
                )
            
            CommandExecution.objects.create(
                user=user,
                command=command,
                message=message,
                input_text=input_text,
                status=CommandExecution.ExecutionStatus.SUCCESS if result['success'] else CommandExecution.ExecutionStatus.ERROR,
                result_data=result.get('result'),
                error_message=result.get('message') if not result['success'] else None,
                execution_time=result.get('execution_time', 0)
            )
        except Exception as e:
            # Log do erro, mas não falha a operação principal
            pass


class AICommandListView(generics.ListCreateAPIView):
    """View para listar e criar comandos de IA"""
    
    serializer_class = AICommandSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Apenas admins podem ver todos os comandos
        if self.request.user.is_admin() if hasattr(self.request.user, 'is_admin') else True:
            return AICommand.objects.all()
        
        # Colaboradores veem apenas comandos permitidos
        return AICommand.objects.filter(
            required_permissions__in=[[], ['collaborator']]
        )


class CommandExecutionListView(generics.ListAPIView):
    """View para listar execuções de comando"""
    
    serializer_class = CommandExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Admins veem todas as execuções
        if self.request.user.is_admin() if hasattr(self.request.user, 'is_admin') else True:
            return CommandExecution.objects.all().order_by('-created_at')
        
        # Colaboradores veem apenas suas execuções
        return CommandExecution.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def available_commands(request):
    """Endpoint para listar comandos disponíveis para o usuário"""
    
    processor = CommandProcessor(request.user)
    suggestions = processor._get_command_suggestions()
    
    return Response({
        'available_commands': suggestions,
        'user_type': getattr(request.user, 'user_type', 'admin'),
        'total_commands': len(suggestions)
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def quick_command(request):
    """Endpoint para execução rápida de comandos sem chat"""
    
    command_text = request.data.get('command')
    if not command_text:
        return Response(
            {'error': 'Campo "command" é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    processor = CommandProcessor(request.user)
    result = processor.process_command(command_text)
    
    return Response(result)

