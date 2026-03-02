from .ml_models import JobTimePredictor, ProductionOptimizer
from .models import TechnicianProfile, ProductionSchedule, BottleneckAlert
from apps.jobs.models import Job
from apps.clients.models import Client
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class IntelligentSchedulingCommands:
    """Comandos inteligentes para agendamento e otimização"""
    
    def __init__(self, user):
        self.user = user
        self.predictor = JobTimePredictor()
        self.optimizer = ProductionOptimizer()
    
    def optimize_production_schedule(self, params=None):
        """Comando: Otimize a produção para entregar tudo no prazo"""
        try:
            result = self.optimizer.optimize_schedule()
            
            if result['success']:
                # Obter estatísticas do cronograma otimizado
                schedules = ProductionSchedule.objects.filter(
                    job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
                ).order_by('-priority_score')
                
                high_priority = schedules.filter(priority_score__gte=50).count()
                medium_priority = schedules.filter(priority_score__gte=20, priority_score__lt=50).count()
                low_priority = schedules.filter(priority_score__lt=20).count()
                
                # Identificar gargalos
                bottleneck_result = self.optimizer.identify_bottlenecks()
                
                return {
                    'success': True,
                    'titulo': '🎯 Cronograma Otimizado com Sucesso!',
                    'mensagem': f"""
**Otimização Concluída:**
• {result['optimized_jobs']} trabalhos reorganizados
• {high_priority} trabalhos de alta prioridade
• {medium_priority} trabalhos de prioridade média  
• {low_priority} trabalhos de baixa prioridade

**Análise de Gargalos:**
• {bottleneck_result.get('bottlenecks_found', 0)} gargalos identificados

**Próximos Passos Recomendados:**
1. Revisar cronograma otimizado no painel
2. Comunicar mudanças aos técnicos
3. Monitorar progresso dos trabalhos prioritários
4. Resolver alertas de gargalo identificados
                    """,
                    'cronograma': {
                        'total_trabalhos': result['optimized_jobs'],
                        'alta_prioridade': high_priority,
                        'media_prioridade': medium_priority,
                        'baixa_prioridade': low_priority,
                        'gargalos_encontrados': bottleneck_result.get('bottlenecks_found', 0)
                    }
                }
            else:
                return {
                    'success': False,
                    'titulo': '❌ Erro na Otimização',
                    'mensagem': result['message']
                }
                
        except Exception as e:
            logger.error(f"Erro na otimização: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro Interno',
                'mensagem': 'Erro ao otimizar cronograma. Tente novamente.'
            }
    
    def find_best_technician_for_job(self, params=None):
        """Comando: Qual técnico deve fazer este trabalho complexo?"""
        try:
            # Buscar trabalho mais recente ou complexo
            complex_jobs = Job.objects.filter(
                status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
            ).order_by('-entry_date')
            
            if not complex_jobs.exists():
                return {
                    'success': False,
                    'titulo': '📋 Nenhum Trabalho Pendente',
                    'mensagem': 'Não há trabalhos pendentes para designação.'
                }
            
            job = complex_jobs.first()
            
            # Encontrar melhor técnico
            technicians = TechnicianProfile.objects.filter(is_available=True)
            best_technician = self.optimizer._find_best_technician(job, technicians)
            
            if best_technician:
                # Calcular estimativa de tempo
                job_features = self.optimizer._extract_job_features(job)
                time_prediction = self.predictor.predict_time(job_features)
                
                return {
                    'success': True,
                    'titulo': f'👨‍🔬 Técnico Recomendado para {job.order_number}',
                    'mensagem': f"""
**Trabalho:** {job.order_number} - {job.client.name}
**Paciente:** {job.patient_name or 'N/A'}
**Tipo:** {job.prosthesis_type or 'N/A'}

**Técnico Recomendado:** {best_technician.user.get_full_name()}
• Nível de habilidade: {best_technician.get_skill_level_display()}
• Eficiência: {best_technician.efficiency_rating:.1f}x
• Especialidades: {', '.join(best_technician.specialties) if best_technician.specialties else 'Geral'}

**Estimativa de Tempo:** {time_prediction.get('estimated_hours', 0):.1f} horas ({time_prediction.get('estimated_days', 0):.1f} dias)
**Confiança da Predição:** {time_prediction.get('confidence', 0):.0%}
                    """,
                    'recomendacao': {
                        'trabalho': job.order_number,
                        'tecnico': best_technician.user.get_full_name(),
                        'skill_level': best_technician.skill_level,
                        'eficiencia': best_technician.efficiency_rating,
                        'tempo_estimado': time_prediction.get('estimated_hours', 0) if time_prediction else 0
                    }
                }
            else:
                return {
                    'success': False,
                    'titulo': '❌ Nenhum Técnico Disponível',
                    'mensagem': 'Não há técnicos disponíveis no momento.'
                }
                
        except Exception as e:
            logger.error(f"Erro na recomendação de técnico: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Análise',
                'mensagem': 'Erro ao analisar técnicos. Tente novamente.'
            }
    
    def reorganize_schedule_for_absence(self, params=None):
        """Comando: Reorganize a agenda considerando a ausência do João"""
        try:
            # Buscar técnico mencionado (João ou similar)
            technician_name = "João"  # Pode ser extraído do comando
            
            # Buscar técnico por nome
            technician = None
            for tech in TechnicianProfile.objects.all():
                if technician_name.lower() in tech.user.get_full_name().lower():
                    technician = tech
                    break
            
            if not technician:
                return {
                    'success': False,
                    'titulo': '👤 Técnico Não Encontrado',
                    'mensagem': f'Não foi possível encontrar o técnico "{technician_name}".'
                }
            
            # Marcar técnico como indisponível temporariamente
            technician.is_available = False
            technician.save()
            
            # Buscar trabalhos designados para este técnico
            affected_schedules = ProductionSchedule.objects.filter(
                assigned_technician=technician,
                job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
            )
            
            affected_jobs = [schedule.job for schedule in affected_schedules]
            
            # Re-otimizar cronograma sem este técnico
            result = self.optimizer.optimize_schedule(
                jobs=affected_jobs,
                technicians=TechnicianProfile.objects.filter(is_available=True)
            )
            
            # Restaurar disponibilidade do técnico (apenas para demonstração)
            technician.is_available = True
            technician.save()
            
            if result['success']:
                return {
                    'success': True,
                    'titulo': f'🔄 Agenda Reorganizada - Ausência de {technician.user.get_full_name()}',
                    'mensagem': f"""
**Reorganização Concluída:**
• {len(affected_jobs)} trabalhos redistribuídos
• Técnicos alternativos designados
• Cronograma ajustado para manter prazos

**Trabalhos Afetados:**
{chr(10).join([f"• {job.order_number} - {job.client.name}" for job in affected_jobs[:5]])}
{f"... e mais {len(affected_jobs) - 5} trabalhos" if len(affected_jobs) > 5 else ""}

**Ações Recomendadas:**
1. Comunicar mudanças aos técnicos envolvidos
2. Verificar capacidade dos técnicos substitutos
3. Monitorar progresso dos trabalhos redistribuídos
                    """,
                    'reorganizacao': {
                        'tecnico_ausente': technician.user.get_full_name(),
                        'trabalhos_redistribuidos': len(affected_jobs),
                        'trabalhos_afetados': [job.order_number for job in affected_jobs]
                    }
                }
            else:
                return {
                    'success': False,
                    'titulo': '❌ Erro na Reorganização',
                    'mensagem': result['message']
                }
                
        except Exception as e:
            logger.error(f"Erro na reorganização: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Reorganização',
                'mensagem': 'Erro ao reorganizar agenda. Tente novamente.'
            }
    
    def identify_production_bottlenecks(self, params=None):
        """Comando: Identifique gargalos na produção desta semana"""
        try:
            # Analisar gargalos
            result = self.optimizer.identify_bottlenecks()
            
            if result['success']:
                # Obter alertas ativos
                alerts = BottleneckAlert.objects.filter(
                    is_resolved=False
                ).order_by('-severity', '-created_at')
                
                critical_alerts = alerts.filter(severity=BottleneckAlert.AlertSeverity.CRITICAL)
                high_alerts = alerts.filter(severity=BottleneckAlert.AlertSeverity.HIGH)
                
                # Analisar cronograma da semana
                week_start = timezone.now().date()
                week_end = week_start + timedelta(days=7)
                
                week_schedules = ProductionSchedule.objects.filter(
                    estimated_start_date__date__range=[week_start, week_end],
                    job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
                )
                
                high_risk_jobs = week_schedules.filter(bottleneck_risk__gte=0.7)
                
                return {
                    'success': True,
                    'titulo': '🔍 Análise de Gargalos - Esta Semana',
                    'mensagem': f"""
**Resumo da Análise:**
• {result.get('bottlenecks_found', 0)} gargalos identificados
• {critical_alerts.count()} alertas críticos
• {high_alerts.count()} alertas de alta prioridade
• {high_risk_jobs.count()} trabalhos com alto risco

**Alertas Críticos:**
{chr(10).join([f"🚨 {alert.title}" for alert in critical_alerts[:3]])}

**Trabalhos de Alto Risco:**
{chr(10).join([f"⚠️ {schedule.job.order_number} - {schedule.job.client.name}" for schedule in high_risk_jobs[:3]])}

**Recomendações Imediatas:**
1. Priorizar resolução dos alertas críticos
2. Redistribuir trabalhos de alto risco
3. Considerar horas extras se necessário
4. Comunicar possíveis atrasos aos clientes
                    """,
                    'gargalos': {
                        'total_encontrados': result.get('bottlenecks_found', 0),
                        'alertas_criticos': critical_alerts.count(),
                        'alertas_altos': high_alerts.count(),
                        'trabalhos_alto_risco': high_risk_jobs.count(),
                        'alertas_detalhes': [
                            {
                                'titulo': alert.title,
                                'severidade': alert.get_severity_display(),
                                'tipo': alert.get_alert_type_display()
                            } for alert in alerts[:5]
                        ]
                    }
                }
            else:
                return {
                    'success': False,
                    'titulo': '❌ Erro na Análise',
                    'mensagem': result['message']
                }
                
        except Exception as e:
            logger.error(f"Erro na análise de gargalos: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Análise',
                'mensagem': 'Erro ao analisar gargalos. Tente novamente.'
            }
    
    def suggest_optimal_firing_time(self, params=None):
        """Comando: Sugira o melhor horário para queima de cerâmica"""
        try:
            # Analisar cronograma atual
            current_schedules = ProductionSchedule.objects.filter(
                job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION],
                estimated_start_date__date=timezone.now().date()
            ).order_by('estimated_start_date')
            
            # Buscar trabalhos que envolvem cerâmica
            ceramic_jobs = []
            for schedule in current_schedules:
                job = schedule.job
                if any(term in (job.prosthesis_type or '').lower() for term in ['cerâmica', 'porcelana', 'zircônia']):
                    ceramic_jobs.append(schedule)
            
            if not ceramic_jobs:
                return {
                    'success': True,
                    'titulo': '🔥 Sugestão de Horário - Queima de Cerâmica',
                    'mensagem': """
**Análise do Cronograma:**
• Nenhum trabalho de cerâmica agendado para hoje
• Forno disponível para uso conforme necessário

**Horários Recomendados:**
• **Manhã (8h-10h):** Ideal para trabalhos urgentes
• **Tarde (14h-16h):** Melhor para produção regular
• **Final do dia (16h-18h):** Para trabalhos não urgentes

**Dicas de Otimização:**
1. Agrupar múltiplas peças na mesma queima
2. Priorizar trabalhos com prazo mais apertado
3. Considerar tempo de resfriamento (2-3 horas)
                    """,
                    'sugestao_queima': {
                        'trabalhos_ceramica_hoje': 0,
                        'horario_recomendado': '14h-16h',
                        'disponibilidade_forno': 'Livre'
                    }
                }
            
            # Analisar melhor horário baseado no cronograma
            morning_jobs = [s for s in ceramic_jobs if s.estimated_start_date.hour < 12]
            afternoon_jobs = [s for s in ceramic_jobs if 12 <= s.estimated_start_date.hour < 18]
            
            if len(morning_jobs) > len(afternoon_jobs):
                recommended_time = "14h-16h (Tarde)"
                reason = "Manhã mais ocupada"
            else:
                recommended_time = "8h-10h (Manhã)"
                reason = "Tarde mais ocupada"
            
            return {
                'success': True,
                'titulo': '🔥 Sugestão de Horário - Queima de Cerâmica',
                'mensagem': f"""
**Análise do Cronograma:**
• {len(ceramic_jobs)} trabalhos de cerâmica agendados hoje
• {len(morning_jobs)} trabalhos pela manhã
• {len(afternoon_jobs)} trabalhos à tarde

**Horário Recomendado:** {recommended_time}
**Motivo:** {reason}

**Trabalhos de Cerâmica Hoje:**
{chr(10).join([f"• {s.job.order_number} - {s.job.prosthesis_type}" for s in ceramic_jobs[:3]])}

**Recomendações:**
1. Agrupar peças similares na mesma queima
2. Verificar compatibilidade de temperaturas
3. Planejar tempo de resfriamento
4. Preparar próxima queima se necessário
                """,
                'sugestao_queima': {
                    'trabalhos_ceramica_hoje': len(ceramic_jobs),
                    'horario_recomendado': recommended_time,
                    'trabalhos_manha': len(morning_jobs),
                    'trabalhos_tarde': len(afternoon_jobs)
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na sugestão de queima: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Sugestão',
                'mensagem': 'Erro ao analisar horários. Tente novamente.'
            }

