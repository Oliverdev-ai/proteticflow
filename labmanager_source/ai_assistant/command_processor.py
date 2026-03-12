import re
import json
import traceback
from datetime import datetime, timedelta
from django.db.models import Q, Count, Sum
from django.utils import timezone
from apps.clients.models import Client
from apps.jobs.models import Job
from apps.pricing.models import ServiceItem
from accounts.models import CustomUser
from payroll.models import PayrollPeriod, PayrollEntry, FinancialReport
from apps.employees.models import EmployeeProfile


class CommandProcessor:
    """Processador de comandos em linguagem natural para o assistente de IA Flow"""
    
    def __init__(self, user):
        self.user = user
        self.commands = {
            # Comandos financeiros (admin apenas)
            'gerar_relatorio_contas_receber': {
                'patterns': [
                    r'gerar?\s+relat[óo]rio\s+de\s+contas?\s+a\s+receber',
                    r'relat[óo]rio\s+financeiro',
                    r'contas?\s+a\s+receber'
                ],
                'method': 'generate_accounts_receivable_report',
                'admin_only': True
            },
            'fazer_fechamento_mensal': {
                'patterns': [
                    r'fazer?\s+fechamento\s+mensal',
                    r'fechamento\s+do\s+m[êe]s',
                    r'gerar?\s+fechamento\s+mensal'
                ],
                'method': 'generate_monthly_closing',
                'admin_only': True
            },
            'gerar_balanco_anual': {
                'patterns': [
                    r'gerar?\s+balan[çc]o\s+anual',
                    r'balan[çc]o\s+do\s+ano',
                    r'relat[óo]rio\s+anual'
                ],
                'method': 'generate_annual_balance',
                'admin_only': True
            },
            'gerar_folha_pagamento': {
                'patterns': [
                    r'gerar?\s+folha\s+de\s+pagamento',
                    r'folha\s+salarial',
                    r'calcular?\s+sal[áa]rios?'
                ],
                'method': 'generate_payroll',
                'admin_only': True
            },
            
            # Comandos operacionais (admin e colaborador)
            'mostrar_trabalhos_pendentes': {
                'patterns': [
                    r'mostrar?\s+trabalhos?\s+pendentes?',
                    r'listar?\s+trabalhos?\s+pendentes?',
                    r'trabalhos?\s+em\s+andamento'
                ],
                'method': 'list_pending_jobs',
                'admin_only': False
            },
            'listar_entregas_hoje': {
                'patterns': [
                    r'listar?\s+entregas?\s+(?:programadas?\s+)?(?:para\s+)?hoje',
                    r'entregas?\s+de\s+hoje',
                    r'entregas?\s+do\s+dia'
                ],
                'method': 'list_today_deliveries',
                'admin_only': False
            },
            'cadastrar_cliente': {
                'patterns': [
                    r'cadastrar?\s+(?:novo\s+)?cliente',
                    r'criar?\s+cliente',
                    r'adicionar?\s+cliente'
                ],
                'method': 'help_register_client',
                'admin_only': False
            },
            'cadastrar_trabalho': {
                'patterns': [
                    r'cadastrar?\s+(?:novo\s+)?trabalho',
                    r'criar?\s+trabalho',
                    r'adicionar?\s+trabalho'
                ],
                'method': 'help_register_job',
                'admin_only': False
            },
            'dar_baixa_trabalho': {
                'patterns': [
                    r'dar?\s+baixa\s+(?:em\s+)?trabalho',
                    r'finalizar?\s+trabalho',
                    r'concluir?\s+trabalho'
                ],
                'method': 'help_complete_job',
                'admin_only': False
            },
            'listar_clientes': {
                'patterns': [
                    r'listar?\s+clientes?',
                    r'mostrar?\s+clientes?',
                    r'ver\s+clientes?'
                ],
                'method': 'list_clients',
                'admin_only': False
            },
            'buscar_cliente': {
                'patterns': [
                    r'buscar?\s+cliente\s+(?:por\s+nome\s+)?(.+)',
                    r'procurar?\s+cliente\s+(.+)',
                    r'encontrar?\s+cliente\s+(.+)'
                ],
                'method': 'search_client',
                'admin_only': False
            }
        }
    
    def process_command(self, message):
        """Processa um comando em linguagem natural"""
        message_lower = message.lower().strip()
        
        # Verifica cada comando
        for command_key, command_info in self.commands.items():
            # Verifica permissões
            if command_info['admin_only'] and not (self.user.is_gerente() or self.user.is_superadmin()):
                continue
                
            # Verifica padrões
            for pattern in command_info['patterns']:
                match = re.search(pattern, message_lower)
                if match:
                    try:
                        method = getattr(self, command_info['method'])
                        # Passa grupos capturados se existirem
                        if match.groups():
                            return method(*match.groups())
                        else:
                            return method()
                    except Exception as e:
                        return {
                            'success': False,
                            'message': f'Erro ao executar comando: {str(e)}',
                            'error': str(e)
                        }
        
        # Comando não reconhecido
        return {
            'success': False,
            'message': 'Comando não reconhecido. Digite "ajuda" para ver os comandos disponíveis.',
            'suggestions': self.get_available_commands()
        }
    
    def get_available_commands(self):
        """Retorna lista de comandos disponíveis para o usuário"""
        available = []
        for command_key, command_info in self.commands.items():
            if not command_info['admin_only'] or self.user.is_gerente() or self.user.is_superadmin():
                # Pega o primeiro padrão como exemplo
                pattern = command_info['patterns'][0]
                # Remove regex e converte para exemplo legível
                example = pattern.replace(r'\s+', ' ').replace('?', '').replace(r'[óo]', 'o').replace(r'[êe]', 'e').replace(r'[çc]', 'ç').replace(r'[áa]', 'a')
                example = re.sub(r'[().*+?^${}|[\]\\]', '', example)
                available.append(example.title())
        return available
    
    # Métodos de comando - Financeiros (Admin apenas)
    
    def generate_accounts_receivable_report(self):
        """Gera relatório de contas a receber"""
        try:
            # Busca trabalhos pendentes de pagamento
            pending_jobs = Job.objects.filter(
                Q(status='completed') | Q(status='delivered'),
                payment_status='pending'
            ).select_related('client')
            
            total_amount = pending_jobs.aggregate(Sum('total_price'))['total_price__sum'] or 0
            
            # Agrupa por cliente
            clients_debt = {}
            for job in pending_jobs:
                client_name = job.client.name
                if client_name not in clients_debt:
                    clients_debt[client_name] = {
                        'total': 0,
                        'jobs': []
                    }
                clients_debt[client_name]['total'] += float(job.total_price)
                clients_debt[client_name]['jobs'].append({
                    'id': job.id,
                    'description': job.description,
                    'value': float(job.total_price),
                    'delivery_date': job.delivery_date.strftime('%d/%m/%Y') if job.delivery_date else 'N/A'
                })
            
            response = f"💰 **Relatório de Contas a Receber**\n\n"
            response += f"**Total a Receber:** R$ {total_amount:,.2f}\n"
            response += f"**Trabalhos Pendentes:** {pending_jobs.count()}\n\n"
            
            if clients_debt:
                response += "**Por Cliente:**\n"
                for client, data in sorted(clients_debt.items(), key=lambda x: x[1]['total'], reverse=True):
                    response += f"🔹 **{client}:** R$ {data['total']:,.2f} ({len(data['jobs'])} trabalhos)\n"
            else:
                response += "✅ Não há contas pendentes no momento!"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'total_amount': float(total_amount),
                    'pending_count': pending_jobs.count(),
                    'clients_debt': clients_debt
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao gerar relatório: {str(e)}'
            }
    
    def generate_monthly_closing(self):
        """Gera fechamento mensal"""
        try:
            now = timezone.now()
            year = now.year
            month = now.month
            
            # Calcula período
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
            
            # Busca dados do mês
            jobs_month = Job.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            completed_jobs = jobs_month.filter(status='completed')
            total_revenue = completed_jobs.aggregate(Sum('total_price'))['total_price__sum'] or 0
            
            # Busca folha de pagamento
            try:
                payroll_period = PayrollPeriod.objects.get(year=year, month=month)
                payroll_expense = payroll_period.total_net_salary or 0
            except PayrollPeriod.DoesNotExist:
                payroll_expense = 0
            
            # Estimativas
            operational_expense = total_revenue * 0.30  # 30% da receita
            total_expense = payroll_expense + operational_expense
            net_profit = total_revenue - total_expense
            
            response = f"📊 **Fechamento Mensal - {month:02d}/{year}**\n\n"
            response += f"**Receita Total:** R$ {total_revenue:,.2f}\n"
            response += f"**Despesas:**\n"
            response += f"🔹 Folha de Pagamento: R$ {payroll_expense:,.2f}\n"
            response += f"🔹 Operacionais (est.): R$ {operational_expense:,.2f}\n"
            response += f"🔹 **Total Despesas:** R$ {total_expense:,.2f}\n\n"
            response += f"**Lucro Líquido:** R$ {net_profit:,.2f}\n"
            response += f"**Margem de Lucro:** {(net_profit/total_revenue*100) if total_revenue > 0 else 0:.1f}%\n\n"
            response += f"**Trabalhos:**\n"
            response += f"🔹 Total: {jobs_month.count()}\n"
            response += f"🔹 Concluídos: {completed_jobs.count()}\n"
            response += f"🔹 Pendentes: {jobs_month.filter(status='pending').count()}"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'period': f"{month:02d}/{year}",
                    'revenue': float(total_revenue),
                    'expenses': float(total_expense),
                    'profit': float(net_profit),
                    'margin': float((net_profit/total_revenue*100) if total_revenue > 0 else 0)
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao gerar fechamento: {str(e)}'
            }
    
    def generate_annual_balance(self):
        """Gera balanço anual"""
        try:
            now = timezone.now()
            year = now.year
            
            # Calcula período
            start_date = datetime(year, 1, 1).date()
            end_date = datetime(year, 12, 31).date()
            
            # Busca dados do ano
            jobs_year = Job.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            completed_jobs = jobs_year.filter(status='completed')
            total_revenue = completed_jobs.aggregate(Sum('total_price'))['total_price__sum'] or 0
            
            # Busca folhas de pagamento do ano
            payroll_periods = PayrollPeriod.objects.filter(year=year)
            total_payroll = payroll_periods.aggregate(Sum('total_net_salary'))['total_net_salary__sum'] or 0
            
            # Estimativas
            operational_expense = total_revenue * 0.30
            total_expense = total_payroll + operational_expense
            net_profit = total_revenue - total_expense
            
            # Dados por trimestre
            quarterly_data = []
            for quarter in range(1, 5):
                q_start = datetime(year, (quarter-1)*3 + 1, 1).date()
                if quarter == 4:
                    q_end = datetime(year, 12, 31).date()
                else:
                    q_end = datetime(year, quarter*3 + 1, 1).date() - timedelta(days=1)
                
                q_jobs = jobs_year.filter(
                    created_at__date__gte=q_start,
                    created_at__date__lte=q_end
                )
                q_revenue = q_jobs.filter(status='completed').aggregate(Sum('total_price'))['total_price__sum'] or 0
                
                quarterly_data.append({
                    'quarter': quarter,
                    'revenue': float(q_revenue),
                    'jobs': q_jobs.count()
                })
            
            response = f"📈 **Balanço Anual - {year}**\n\n"
            response += f"**Receita Total:** R$ {total_revenue:,.2f}\n"
            response += f"**Despesas Totais:** R$ {total_expense:,.2f}\n"
            response += f"**Lucro Líquido:** R$ {net_profit:,.2f}\n"
            response += f"**Margem de Lucro:** {(net_profit/total_revenue*100) if total_revenue > 0 else 0:.1f}%\n\n"
            
            response += f"**Trabalhos:**\n"
            response += f"🔹 Total: {jobs_year.count()}\n"
            response += f"🔹 Concluídos: {completed_jobs.count()}\n"
            response += f"🔹 Taxa de Conclusão: {(completed_jobs.count()/jobs_year.count()*100) if jobs_year.count() > 0 else 0:.1f}%\n\n"
            
            response += f"**Por Trimestre:**\n"
            for q_data in quarterly_data:
                response += f"🔹 Q{q_data['quarter']}: R$ {q_data['revenue']:,.2f} ({q_data['jobs']} trabalhos)\n"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'year': year,
                    'total_revenue': float(total_revenue),
                    'total_expense': float(total_expense),
                    'net_profit': float(net_profit),
                    'quarterly_data': quarterly_data
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao gerar balanço: {str(e)}'
            }
    
    def generate_payroll(self):
        """Gera ou exibe informações da folha de pagamento"""
        try:
            now = timezone.now()
            year = now.year
            month = now.month
            
            # Verifica se existe período de folha
            try:
                period = PayrollPeriod.objects.get(year=year, month=month)
                entries = period.entries.all()
                
                response = f"💼 **Folha de Pagamento - {month:02d}/{year}**\n\n"
                
                if period.is_closed:
                    response += f"✅ **Status:** Fechada em {period.closed_at.strftime('%d/%m/%Y')}\n\n"
                else:
                    response += f"⚠️ **Status:** Em aberto\n\n"
                
                response += f"**Resumo:**\n"
                response += f"🔹 Funcionários: {entries.count()}\n"
                response += f"🔹 Salário Bruto Total: R$ {period.total_gross_salary:,.2f}\n"
                response += f"🔹 Descontos Total: R$ {period.total_deductions:,.2f}\n"
                response += f"🔹 Salário Líquido Total: R$ {period.total_net_salary:,.2f}\n\n"
                
                if entries.exists():
                    response += f"**Por Funcionário:**\n"
                    for entry in entries[:10]:  # Limita a 10 para não ficar muito longo
                        response += f"🔹 {entry.employee.name}: R$ {entry.net_salary:,.2f}\n"
                    
                    if entries.count() > 10:
                        response += f"... e mais {entries.count() - 10} funcionários\n"
                
                return {
                    'success': True,
                    'message': response,
                    'data': {
                        'period_id': period.id,
                        'is_closed': period.is_closed,
                        'total_employees': entries.count(),
                        'total_gross': float(period.total_gross_salary),
                        'total_net': float(period.total_net_salary)
                    }
                }
                
            except PayrollPeriod.DoesNotExist:
                # Sugere criar período
                active_employees = EmployeeProfile.objects.filter(is_active=True).count()
                
                response = f"💼 **Folha de Pagamento - {month:02d}/{year}**\n\n"
                response += f"⚠️ Período ainda não foi criado.\n\n"
                response += f"**Funcionários Ativos:** {active_employees}\n\n"
                response += f"Para criar a folha de pagamento deste mês, acesse:\n"
                response += f"Sistema → RH → Folha de Pagamento → Criar Período"
                
                return {
                    'success': True,
                    'message': response,
                    'data': {
                        'period_exists': False,
                        'active_employees': active_employees,
                        'suggested_action': 'create_period'
                    }
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao acessar folha de pagamento: {str(e)}'
            }
    
    # Métodos de comando - Operacionais (Admin e Colaborador)
    
    def list_pending_jobs(self):
        """Lista trabalhos pendentes"""
        try:
            pending_jobs = Job.objects.filter(status='pending').select_related('client')
            
            response = f"✅ **Trabalhos Pendentes**\n\n"
            response += f"**Total:** {pending_jobs.count()} trabalhos\n\n"
            
            if pending_jobs.exists():
                for job in pending_jobs[:10]:  # Limita a 10
                    delivery_info = f" - Entrega: {job.delivery_date.strftime('%d/%m/%Y')}" if job.delivery_date else ""
                    response += f"🔹 **#{job.id}** - {job.client.name}\n"
                    response += f"   {job.description[:50]}{'...' if len(job.description) > 50 else ''}{delivery_info}\n\n"
                
                if pending_jobs.count() > 10:
                    response += f"... e mais {pending_jobs.count() - 10} trabalhos\n"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'total': pending_jobs.count(),
                    'jobs': [{'id': j.id, 'client': j.client.name, 'description': j.description} for j in pending_jobs[:10]]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao listar trabalhos: {str(e)}'
            }
    
    def list_today_deliveries(self):
        """Lista entregas programadas para hoje"""
        try:
            today = timezone.now().date()
            today_deliveries = Job.objects.filter(delivery_date=today).select_related('client')
            
            response = f"🚚 **Entregas de Hoje ({today.strftime('%d/%m/%Y')})**\n\n"
            response += f"**Total:** {today_deliveries.count()} entregas\n\n"
            
            if today_deliveries.exists():
                for job in today_deliveries:
                    status_icon = "✅" if job.status == 'completed' else "⏳"
                    response += f"{status_icon} **#{job.id}** - {job.client.name}\n"
                    response += f"   {job.description[:50]}{'...' if len(job.description) > 50 else ''}\n"
                    response += f"   Status: {job.get_status_display()}\n\n"
            else:
                response += "📅 Não há entregas programadas para hoje."
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'total': today_deliveries.count(),
                    'deliveries': [{'id': j.id, 'client': j.client.name, 'status': j.status} for j in today_deliveries]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao listar entregas: {str(e)}'
            }
    
    def help_register_client(self):
        """Ajuda no cadastro de cliente"""
        response = f"👤 **Cadastro de Cliente**\n\n"
        response += f"Para cadastrar um novo cliente, você precisa:\n\n"
        response += f"**Dados Obrigatórios:**\n"
        response += f"🔹 Nome completo\n"
        response += f"🔹 Telefone\n"
        response += f"🔹 Email (opcional)\n\n"
        response += f"**Dados Adicionais:**\n"
        response += f"🔹 Endereço completo\n"
        response += f"🔹 CPF/CNPJ\n"
        response += f"🔹 Observações\n\n"
        response += f"Acesse: **Sistema → Clientes → Novo Cliente**"
        
        return {
            'success': True,
            'message': response,
            'data': {
                'action': 'register_client',
                'required_fields': ['name', 'phone'],
                'optional_fields': ['email', 'address', 'document']
            }
        }
    
    def help_register_job(self):
        """Ajuda no cadastro de trabalho"""
        response = f"🦷 **Cadastro de Trabalho**\n\n"
        response += f"Para cadastrar um novo trabalho:\n\n"
        response += f"**Dados Obrigatórios:**\n"
        response += f"🔹 Cliente\n"
        response += f"🔹 Descrição do trabalho\n"
        response += f"🔹 Tipo de prótese\n"
        response += f"🔹 Data de entrega\n\n"
        response += f"**Dados Adicionais:**\n"
        response += f"🔹 Observações técnicas\n"
        response += f"🔹 Fotos de referência\n"
        response += f"🔹 Valor personalizado\n\n"
        response += f"Acesse: **Sistema → Trabalhos → Novo Trabalho**"
        
        return {
            'success': True,
            'message': response,
            'data': {
                'action': 'register_job',
                'required_fields': ['client', 'description', 'prosthesis_type', 'delivery_date'],
                'optional_fields': ['notes', 'photos', 'custom_price']
            }
        }
    
    def help_complete_job(self):
        """Ajuda para dar baixa em trabalho"""
        response = f"✅ **Finalizar Trabalho**\n\n"
        response += f"Para dar baixa em um trabalho:\n\n"
        response += f"**Passos:**\n"
        response += f"1. Acesse **Sistema → Trabalhos**\n"
        response += f"2. Encontre o trabalho na lista\n"
        response += f"3. Clique em **Editar**\n"
        response += f"4. Altere o status para **Concluído**\n"
        response += f"5. Adicione observações finais (opcional)\n"
        response += f"6. Salve as alterações\n\n"
        response += f"**Dica:** Você também pode marcar como entregue se já foi retirado pelo cliente."
        
        return {
            'success': True,
            'message': response,
            'data': {
                'action': 'complete_job',
                'steps': ['access_jobs', 'find_job', 'edit_job', 'change_status', 'save']
            }
        }
    
    def list_clients(self):
        """Lista clientes"""
        try:
            clients = Client.objects.all()[:20]  # Limita a 20
            total_clients = Client.objects.count()
            
            response = f"👥 **Lista de Clientes**\n\n"
            response += f"**Total:** {total_clients} clientes\n\n"
            
            if clients.exists():
                for client in clients:
                    phone_info = f" - {client.phone}" if client.phone else ""
                    response += f"🔹 **{client.name}**{phone_info}\n"
                
                if total_clients > 20:
                    response += f"\n... e mais {total_clients - 20} clientes\n"
                    response += f"\nPara ver todos: **Sistema → Clientes**"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'total': total_clients,
                    'clients': [{'id': c.id, 'name': c.name, 'phone': c.phone} for c in clients]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao listar clientes: {str(e)}'
            }
    
    def search_client(self, search_term):
        """Busca cliente por nome"""
        try:
            search_term = search_term.strip()
            clients = Client.objects.filter(
                Q(name__icontains=search_term) | Q(phone__icontains=search_term)
            )[:10]
            
            response = f"🔍 **Busca por: '{search_term}'**\n\n"
            
            if clients.exists():
                response += f"**Encontrados:** {clients.count()} clientes\n\n"
                for client in clients:
                    phone_info = f" - {client.phone}" if client.phone else ""
                    email_info = f" - {client.email}" if client.email else ""
                    response += f"🔹 **{client.name}**{phone_info}{email_info}\n"
            else:
                response += f"❌ Nenhum cliente encontrado.\n\n"
                response += f"**Sugestões:**\n"
                response += f"🔹 Verifique a ortografia\n"
                response += f"🔹 Tente buscar apenas parte do nome\n"
                response += f"🔹 Cadastre um novo cliente se necessário"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'search_term': search_term,
                    'found': clients.count(),
                    'clients': [{'id': c.id, 'name': c.name, 'phone': c.phone} for c in clients]
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro na busca: {str(e)}'
            }


