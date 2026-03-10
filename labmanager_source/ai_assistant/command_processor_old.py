import re
import json
import time
from datetime import datetime, timedelta
from django.db.models import Q, Count, Sum
from django.utils import timezone
from apps.clients.models import Client
from apps.jobs.models import Job
from apps.pricing.models import ServiceItem
from accounts.models import CustomUser


class CommandProcessor:
    """Classe responsável por processar comandos em linguagem natural"""
    
    def __init__(self, user):
        self.user = user
        self.commands = {
            'gerar_relatorio_contas_receber': self.gerar_relatorio_contas_receber,
            'fazer_fechamento_mensal': self.fazer_fechamento_mensal,
            'mostrar_trabalhos_pendentes': self.mostrar_trabalhos_pendentes,
            'listar_entregas_hoje': self.listar_entregas_hoje,
            'cadastrar_cliente': self.auxiliar_cadastro_cliente,
            'cadastrar_trabalho': self.auxiliar_cadastro_trabalho,
            'dar_baixa_trabalho': self.dar_baixa_trabalho,
            'listar_clientes': self.listar_clientes,
            'buscar_cliente': self.buscar_cliente,
            'status_trabalho': self.status_trabalho,
            'trabalhos_atrasados': self.trabalhos_atrasados,
        }
    
    def process_command(self, text):
        """Processa um comando em linguagem natural"""
        start_time = time.time()
        
        try:
            # Identifica o comando baseado no texto
            command_name = self._identify_command(text)
            
            if not command_name:
                return {
                    'success': False,
                    'message': 'Não consegui entender o comando. Tente reformular ou use um dos comandos disponíveis.',
                    'suggestions': self._get_command_suggestions()
                }
            
            # Verifica permissões
            if not self._check_permissions(command_name):
                return {
                    'success': False,
                    'message': 'Você não tem permissão para executar este comando.',
                    'command': command_name
                }
            
            # Executa o comando
            result = self.commands[command_name](text)
            
            execution_time = time.time() - start_time
            
            return {
                'success': True,
                'command': command_name,
                'result': result,
                'execution_time': execution_time
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                'success': False,
                'message': f'Erro ao executar comando: {str(e)}',
                'execution_time': execution_time
            }
    
    def _identify_command(self, text):
        """Identifica qual comando executar baseado no texto"""
        text_lower = text.lower()
        
        # Mapeamento de palavras-chave para comandos
        command_patterns = {
            'gerar_relatorio_contas_receber': [
                r'gerar.*relat[óo]rio.*contas.*receber',
                r'relat[óo]rio.*financeiro',
                r'contas.*receber',
                r'relat[óo]rio.*faturamento'
            ],
            'fazer_fechamento_mensal': [
                r'fechamento.*mensal',
                r'fechar.*m[êe]s',
                r'fechamento.*financeiro'
            ],
            'mostrar_trabalhos_pendentes': [
                r'trabalhos.*pendentes',
                r'mostrar.*pendentes',
                r'listar.*pendentes',
                r'trabalhos.*em.*andamento'
            ],
            'listar_entregas_hoje': [
                r'entregas.*hoje',
                r'entregas.*programadas',
                r'entregas.*dia',
                r'roteiro.*entrega'
            ],
            'cadastrar_cliente': [
                r'cadastrar.*cliente',
                r'novo.*cliente',
                r'adicionar.*cliente',
                r'criar.*cliente'
            ],
            'cadastrar_trabalho': [
                r'cadastrar.*trabalho',
                r'novo.*trabalho',
                r'adicionar.*trabalho',
                r'criar.*trabalho'
            ],
            'dar_baixa_trabalho': [
                r'dar.*baixa',
                r'finalizar.*trabalho',
                r'concluir.*trabalho',
                r'marcar.*conclu[íi]do'
            ],
            'listar_clientes': [
                r'listar.*clientes',
                r'mostrar.*clientes',
                r'ver.*clientes'
            ],
            'buscar_cliente': [
                r'buscar.*cliente',
                r'encontrar.*cliente',
                r'procurar.*cliente'
            ],
            'status_trabalho': [
                r'status.*trabalho',
                r'situa[çc][ãa]o.*trabalho',
                r'andamento.*trabalho'
            ],
            'trabalhos_atrasados': [
                r'trabalhos.*atrasados',
                r'atrasos',
                r'trabalhos.*vencidos'
            ]
        }
        
        for command, patterns in command_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return command
        
        return None
    
    def _check_permissions(self, command_name):
        """Verifica se o usuário tem permissão para executar o comando"""
        # Comandos que apenas admins podem executar
        admin_only_commands = [
            'gerar_relatorio_contas_receber',
            'fazer_fechamento_mensal'
        ]
        
        if command_name in admin_only_commands:
            return self.user.is_admin() if hasattr(self.user, 'is_admin') else True
        
        return True
    
    def _get_command_suggestions(self):
        """Retorna sugestões de comandos disponíveis"""
        if self.user.is_admin() if hasattr(self.user, 'is_admin') else True:
            return [
                "Gerar relatório de contas a receber",
                "Fazer fechamento mensal",
                "Mostrar trabalhos pendentes",
                "Listar entregas programadas para hoje",
                "Cadastrar novo cliente",
                "Cadastrar novo trabalho",
                "Dar baixa em trabalho",
                "Listar clientes",
                "Buscar cliente por nome"
            ]
        else:
            return [
                "Mostrar trabalhos pendentes",
                "Listar entregas programadas para hoje",
                "Cadastrar novo cliente",
                "Cadastrar novo trabalho",
                "Dar baixa em trabalho",
                "Listar clientes",
                "Buscar cliente por nome"
            ]
    
    # Implementação dos comandos
    
    def gerar_relatorio_contas_receber(self, text):
        """Gera relatório de contas a receber"""
        try:
            # Busca trabalhos concluídos mas não entregues
            trabalhos_pendentes = Job.objects.filter(
                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.QUALITY_CHECK]
            ).select_related('client')
            
            total_valor = sum(job.total_price or 0 for job in trabalhos_pendentes)
            
            relatorio = {
                'titulo': 'Relatório de Contas a Receber',
                'data_geracao': timezone.now().strftime('%d/%m/%Y %H:%M'),
                'total_trabalhos': trabalhos_pendentes.count(),
                'valor_total': float(total_valor),
                'trabalhos': []
            }
            
            for job in trabalhos_pendentes[:10]:  # Limita a 10 para não sobrecarregar
                relatorio['trabalhos'].append({
                    'numero_ordem': job.order_number,
                    'cliente': job.client.name,
                    'paciente': job.patient_name,
                    'valor': float(job.total_price or 0),
                    'data_conclusao': job.completion_date.strftime('%d/%m/%Y') if job.completion_date else 'N/A',
                    'status': job.get_status_display()
                })
            
            return relatorio
            
        except Exception as e:
            raise Exception(f"Erro ao gerar relatório: {str(e)}")
    
    def fazer_fechamento_mensal(self, text):
        """Realiza fechamento mensal"""
        try:
            hoje = timezone.now().date()
            inicio_mes = hoje.replace(day=1)
            
            # Trabalhos do mês
            trabalhos_mes = Job.objects.filter(
                entry_date__gte=inicio_mes,
                entry_date__lte=hoje
            )
            
            # Trabalhos entregues no mês
            trabalhos_entregues = trabalhos_mes.filter(
                status=Job.JobStatus.DELIVERED
            )
            
            faturamento_total = sum(job.total_price or 0 for job in trabalhos_entregues)
            
            fechamento = {
                'titulo': f'Fechamento Mensal - {hoje.strftime("%m/%Y")}',
                'periodo': f'{inicio_mes.strftime("%d/%m/%Y")} a {hoje.strftime("%d/%m/%Y")}',
                'total_trabalhos_recebidos': trabalhos_mes.count(),
                'total_trabalhos_entregues': trabalhos_entregues.count(),
                'faturamento_total': float(faturamento_total),
                'trabalhos_pendentes': trabalhos_mes.exclude(status=Job.JobStatus.DELIVERED).count(),
                'data_fechamento': timezone.now().strftime('%d/%m/%Y %H:%M')
            }
            
            return fechamento
            
        except Exception as e:
            raise Exception(f"Erro ao fazer fechamento: {str(e)}")
    
    def mostrar_trabalhos_pendentes(self, text):
        """Mostra trabalhos pendentes"""
        try:
            # Extrai nome do cliente se mencionado
            cliente_nome = self._extract_client_name(text)
            
            trabalhos = Job.objects.exclude(
                status__in=[Job.JobStatus.DELIVERED, Job.JobStatus.CANCELED]
            ).select_related('client').order_by('due_date')
            
            if cliente_nome:
                trabalhos = trabalhos.filter(client__name__icontains=cliente_nome)
            
            resultado = {
                'titulo': f'Trabalhos Pendentes{f" - Cliente: {cliente_nome}" if cliente_nome else ""}',
                'total': trabalhos.count(),
                'trabalhos': []
            }
            
            for job in trabalhos[:15]:  # Limita a 15
                dias_para_vencimento = (job.due_date - timezone.now().date()).days
                
                resultado['trabalhos'].append({
                    'numero_ordem': job.order_number,
                    'cliente': job.client.name,
                    'paciente': job.patient_name,
                    'tipo_protese': job.prosthesis_type,
                    'status': job.get_status_display(),
                    'data_vencimento': job.due_date.strftime('%d/%m/%Y'),
                    'dias_para_vencimento': dias_para_vencimento,
                    'urgente': dias_para_vencimento <= 2
                })
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Erro ao buscar trabalhos pendentes: {str(e)}")
    
    def listar_entregas_hoje(self, text):
        """Lista entregas programadas para hoje"""
        try:
            hoje = timezone.now().date()
            
            entregas = Job.objects.filter(
                due_date=hoje,
                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.QUALITY_CHECK]
            ).select_related('client').order_by('client__name')
            
            resultado = {
                'titulo': f'Entregas Programadas - {hoje.strftime("%d/%m/%Y")}',
                'total': entregas.count(),
                'entregas': []
            }
            
            for job in entregas:
                resultado['entregas'].append({
                    'numero_ordem': job.order_number,
                    'cliente': job.client.name,
                    'paciente': job.patient_name,
                    'tipo_protese': job.prosthesis_type,
                    'telefone_cliente': job.client.phone_primary,
                    'endereco': f"{job.client.address_street}, {job.client.address_number}" if job.client.address_street else 'N/A'
                })
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Erro ao listar entregas: {str(e)}")
    
    def auxiliar_cadastro_cliente(self, text):
        """Auxilia no cadastro de cliente"""
        return {
            'titulo': 'Assistente para Cadastro de Cliente',
            'mensagem': 'Vou te ajudar a cadastrar um novo cliente. Preciso das seguintes informações:',
            'campos_obrigatorios': [
                'Nome do cliente/clínica',
                'Telefone principal',
                'Email (opcional)',
                'Endereço (opcional)'
            ],
            'proximos_passos': [
                '1. Acesse a tela de cadastro de clientes',
                '2. Preencha os campos obrigatórios',
                '3. Adicione informações de contato',
                '4. Salve o cadastro'
            ],
            'dica': 'Certifique-se de verificar se o cliente já não está cadastrado antes de criar um novo registro.'
        }
    
    def auxiliar_cadastro_trabalho(self, text):
        """Auxilia no cadastro de trabalho"""
        return {
            'titulo': 'Assistente para Cadastro de Trabalho',
            'mensagem': 'Vou te ajudar a cadastrar um novo trabalho. Siga estes passos:',
            'campos_obrigatorios': [
                'Cliente (selecione da lista)',
                'Nome/ID do paciente',
                'Data de vencimento',
                'Tipo de prótese',
                'Material'
            ],
            'campos_opcionais': [
                'Cor',
                'Instruções específicas',
                'Fotos do caso'
            ],
            'proximos_passos': [
                '1. Acesse a tela de cadastro de trabalhos',
                '2. Selecione o cliente',
                '3. Preencha os dados do trabalho',
                '4. Adicione itens/serviços',
                '5. Salve o trabalho'
            ],
            'dica': 'O número da ordem será gerado automaticamente. Certifique-se de adicionar todos os serviços necessários.'
        }
    
    def dar_baixa_trabalho(self, text):
        """Auxilia na baixa de trabalho"""
        # Extrai número da ordem se mencionado
        numero_ordem = self._extract_order_number(text)
        
        resultado = {
            'titulo': 'Dar Baixa em Trabalho',
            'mensagem': 'Para dar baixa em um trabalho, siga estes passos:'
        }
        
        if numero_ordem:
            try:
                job = Job.objects.get(order_number=numero_ordem)
                resultado.update({
                    'trabalho_encontrado': {
                        'numero_ordem': job.order_number,
                        'cliente': job.client.name,
                        'paciente': job.patient_name,
                        'status_atual': job.get_status_display()
                    },
                    'proximos_passos': [
                        f'1. Acesse o trabalho {numero_ordem}',
                        '2. Altere o status para "Concluído"',
                        '3. Adicione data de conclusão',
                        '4. Salve as alterações'
                    ]
                })
            except Job.DoesNotExist:
                resultado['erro'] = f'Trabalho {numero_ordem} não encontrado.'
        else:
            resultado['proximos_passos'] = [
                '1. Acesse a lista de trabalhos',
                '2. Encontre o trabalho desejado',
                '3. Altere o status para "Concluído"',
                '4. Adicione data de conclusão',
                '5. Salve as alterações'
            ]
        
        return resultado
    
    def listar_clientes(self, text):
        """Lista clientes cadastrados"""
        try:
            clientes = Client.objects.filter(is_active=True).order_by('name')[:20]
            
            resultado = {
                'titulo': 'Clientes Cadastrados',
                'total': Client.objects.filter(is_active=True).count(),
                'clientes': []
            }
            
            for cliente in clientes:
                resultado['clientes'].append({
                    'id': cliente.id,
                    'nome': cliente.name,
                    'telefone': cliente.phone_primary,
                    'email': cliente.email or 'N/A',
                    'cidade': cliente.address_city or 'N/A'
                })
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Erro ao listar clientes: {str(e)}")
    
    def buscar_cliente(self, text):
        """Busca cliente por nome"""
        nome = self._extract_client_name(text)
        
        if not nome:
            return {
                'titulo': 'Buscar Cliente',
                'erro': 'Por favor, especifique o nome do cliente que deseja buscar.',
                'exemplo': 'Buscar cliente João Silva'
            }
        
        try:
            clientes = Client.objects.filter(
                name__icontains=nome,
                is_active=True
            ).order_by('name')
            
            resultado = {
                'titulo': f'Resultados da busca por: {nome}',
                'total_encontrados': clientes.count(),
                'clientes': []
            }
            
            for cliente in clientes:
                # Conta trabalhos do cliente
                total_trabalhos = Job.objects.filter(client=cliente).count()
                
                resultado['clientes'].append({
                    'id': cliente.id,
                    'nome': cliente.name,
                    'telefone': cliente.phone_primary,
                    'email': cliente.email or 'N/A',
                    'endereco': f"{cliente.address_street}, {cliente.address_number}" if cliente.address_street else 'N/A',
                    'total_trabalhos': total_trabalhos
                })
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Erro ao buscar cliente: {str(e)}")
    
    def status_trabalho(self, text):
        """Verifica status de trabalho específico"""
        numero_ordem = self._extract_order_number(text)
        
        if not numero_ordem:
            return {
                'titulo': 'Consultar Status de Trabalho',
                'erro': 'Por favor, especifique o número da ordem do trabalho.',
                'exemplo': 'Status do trabalho 2024001'
            }
        
        try:
            job = Job.objects.select_related('client').get(order_number=numero_ordem)
            
            return {
                'titulo': f'Status do Trabalho {numero_ordem}',
                'trabalho': {
                    'numero_ordem': job.order_number,
                    'cliente': job.client.name,
                    'paciente': job.patient_name,
                    'tipo_protese': job.prosthesis_type,
                    'status': job.get_status_display(),
                    'data_entrada': job.entry_date.strftime('%d/%m/%Y'),
                    'data_vencimento': job.due_date.strftime('%d/%m/%Y'),
                    'data_conclusao': job.completion_date.strftime('%d/%m/%Y') if job.completion_date else 'N/A',
                    'valor': float(job.total_price) if job.total_price else 'N/A'
                }
            }
            
        except Job.DoesNotExist:
            return {
                'titulo': 'Trabalho Não Encontrado',
                'erro': f'Não foi encontrado nenhum trabalho com o número {numero_ordem}.'
            }
        except Exception as e:
            raise Exception(f"Erro ao consultar status: {str(e)}")
    
    def trabalhos_atrasados(self, text):
        """Lista trabalhos atrasados"""
        try:
            hoje = timezone.now().date()
            
            atrasados = Job.objects.filter(
                due_date__lt=hoje,
                status__in=[
                    Job.JobStatus.RECEIVED,
                    Job.JobStatus.IN_PRODUCTION,
                    Job.JobStatus.QUALITY_CHECK
                ]
            ).select_related('client').order_by('due_date')
            
            resultado = {
                'titulo': 'Trabalhos Atrasados',
                'total': atrasados.count(),
                'trabalhos': []
            }
            
            for job in atrasados:
                dias_atraso = (hoje - job.due_date).days
                
                resultado['trabalhos'].append({
                    'numero_ordem': job.order_number,
                    'cliente': job.client.name,
                    'paciente': job.patient_name,
                    'tipo_protese': job.prosthesis_type,
                    'status': job.get_status_display(),
                    'data_vencimento': job.due_date.strftime('%d/%m/%Y'),
                    'dias_atraso': dias_atraso,
                    'urgencia': 'Alta' if dias_atraso > 7 else 'Média'
                })
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Erro ao listar trabalhos atrasados: {str(e)}")
    
    # Métodos auxiliares
    
    def _extract_client_name(self, text):
        """Extrai nome do cliente do texto"""
        # Procura por padrões como "cliente João" ou "do cliente Maria"
        patterns = [
            r'cliente\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$)',
            r'do\s+cliente\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$)',
            r'da\s+cliente\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_order_number(self, text):
        """Extrai número da ordem do texto"""
        # Procura por padrões numéricos que podem ser números de ordem
        patterns = [
            r'trabalho\s+(\d+)',
            r'ordem\s+(\d+)',
            r'n[úu]mero\s+(\d+)',
            r'(\d{4,})'  # Números com 4 ou mais dígitos
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None

