from .analytics_engine import (
    RevenuePredictionEngine, TrendAnalysisEngine, 
    SeasonalityAnalyzer, PredictiveAlertEngine
)
from .models import RevenuePredictor, TrendAnalysis, PredictiveAlert
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class PredictiveAnalyticsCommands:
    """Comandos inteligentes para análise preditiva"""
    
    def __init__(self, user):
        self.user = user
        self.revenue_engine = RevenuePredictionEngine()
        self.trend_engine = TrendAnalysisEngine()
        self.seasonality_analyzer = SeasonalityAnalyzer()
        self.alert_engine = PredictiveAlertEngine()
    
    def predict_revenue_next_months(self, params=None):
        """Comando: Preveja nossa receita dos próximos 3 meses"""
        try:
            # Fazer predição
            predictions = self.revenue_engine.predict_revenue(months_ahead=3)
            
            if not predictions:
                return {
                    'success': False,
                    'titulo': '❌ Erro na Predição',
                    'mensagem': 'Não foi possível gerar predições de receita.'
                }
            
            # Calcular totais
            total_predicted = sum(p['predicted_revenue'] for p in predictions)
            avg_confidence = sum(p['confidence'] for p in predictions) / len(predictions)
            
            # Analisar tendência
            trend_analysis = self.trend_engine.analyze_revenue_trend()
            
            # Formatar resposta
            months_text = []
            for pred in predictions:
                month_name = self._get_month_name(pred['month'])
                months_text.append(
                    f"• **{month_name}/{pred['year']}**: R$ {pred['predicted_revenue']:,.2f} "
                    f"(Confiança: {pred['confidence']:.0%})"
                )
            
            # Determinar tendência
            if trend_analysis:
                if trend_analysis['percentage_change'] > 5:
                    trend_text = "📈 Tendência de crescimento"
                elif trend_analysis['percentage_change'] < -5:
                    trend_text = "📉 Tendência de declínio"
                else:
                    trend_text = "📊 Tendência estável"
            else:
                trend_text = "📊 Análise de tendência indisponível"
            
            return {
                'success': True,
                'titulo': '🔮 Predição de Receita - Próximos 3 Meses',
                'mensagem': f"""
**Predições Mensais:**
{chr(10).join(months_text)}

**Resumo:**
• **Total Previsto**: R$ {total_predicted:,.2f}
• **Confiança Média**: {avg_confidence:.0%}
• **{trend_text}**

**Fatores Considerados:**
• Histórico de receita dos últimos 24 meses
• Sazonalidade identificada
• Tendências de crescimento
• Volume de trabalhos atual

**Recomendações:**
1. Monitorar indicadores mensalmente
2. Ajustar estratégias conforme tendências
3. Preparar capacidade para demanda prevista
                """,
                'predicoes': {
                    'total_previsto': total_predicted,
                    'confianca_media': avg_confidence,
                    'predicoes_mensais': predictions,
                    'tendencia': trend_analysis['percentage_change'] if trend_analysis else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na predição de receita: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Predição',
                'mensagem': 'Erro ao gerar predições. Tente novamente.'
            }
    
    def analyze_performance_trends(self, params=None):
        """Comando: Analise a performance dos técnicos"""
        try:
            # Analisar tendências de receita e volume
            revenue_trend = self.trend_engine.analyze_revenue_trend()
            volume_trend = self.trend_engine.analyze_jobs_volume_trend()
            
            # Gerar alertas preditivos
            alerts = self.alert_engine.generate_alerts()
            
            # Analisar padrões sazonais
            seasonal_patterns = self.seasonality_analyzer.identify_seasonal_patterns()
            
            # Formatar análise de receita
            if revenue_trend:
                if revenue_trend['percentage_change'] > 0:
                    revenue_status = f"📈 Crescimento de {revenue_trend['percentage_change']:.1f}%"
                else:
                    revenue_status = f"📉 Declínio de {abs(revenue_trend['percentage_change']):.1f}%"
                
                revenue_strength = revenue_trend['trend_strength'].replace('_', ' ').title()
            else:
                revenue_status = "📊 Dados insuficientes"
                revenue_strength = "N/A"
            
            # Formatar análise de volume
            if volume_trend:
                if volume_trend['percentage_change'] > 0:
                    volume_status = f"📈 Aumento de {volume_trend['percentage_change']:.1f}%"
                else:
                    volume_status = f"📉 Redução de {abs(volume_trend['percentage_change']):.1f}%"
            else:
                volume_status = "📊 Dados insuficientes"
            
            # Formatar alertas
            alerts_text = []
            if alerts:
                for alert in alerts[:3]:  # Mostrar apenas os 3 primeiros
                    severity_icon = "🚨" if alert['severity'] == 'critical' else "⚠️"
                    alerts_text.append(f"{severity_icon} {alert['title']}")
            
            if not alerts_text:
                alerts_text.append("✅ Nenhum alerta crítico identificado")
            
            # Formatar padrões sazonais
            seasonal_text = []
            if seasonal_patterns:
                for pattern in seasonal_patterns[:2]:  # Mostrar apenas os 2 primeiros
                    impact_text = "positivo" if pattern['impact_factor'] > 1 else "negativo"
                    seasonal_text.append(f"• {pattern['description']} (Impacto {impact_text})")
            
            if not seasonal_text:
                seasonal_text.append("• Nenhum padrão sazonal significativo identificado")
            
            return {
                'success': True,
                'titulo': '📊 Análise de Performance e Tendências',
                'mensagem': f"""
**Análise de Receita:**
• Status: {revenue_status}
• Força da Tendência: {revenue_strength}

**Volume de Trabalhos:**
• Status: {volume_status}

**Alertas Preditivos:**
{chr(10).join(alerts_text)}

**Padrões Sazonais Identificados:**
{chr(10).join(seasonal_text)}

**Recomendações Estratégicas:**
1. Monitorar tendências semanalmente
2. Ajustar capacidade conforme sazonalidade
3. Implementar ações preventivas para alertas
4. Otimizar processos em períodos de baixa demanda
                """,
                'analise': {
                    'receita_trend': revenue_trend,
                    'volume_trend': volume_trend,
                    'alertas_count': len(alerts),
                    'padroes_sazonais': len(seasonal_patterns)
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de performance: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Análise',
                'mensagem': 'Erro ao analisar performance. Tente novamente.'
            }
    
    def identify_market_opportunities(self, params=None):
        """Comando: Qual tipo de trabalho está em alta?"""
        try:
            from apps.jobs.models import Job
            from django.db.models import Count, Sum, Avg
            
            # Analisar últimos 3 meses
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=90)
            
            # Trabalhos por tipo nos últimos 3 meses
            job_types = Job.objects.filter(
                entry_date__range=[start_date, end_date]
            ).values('prosthesis_type').annotate(
                count=Count('id'),
                total_value=Sum('total_price'),
                avg_value=Avg('total_price')
            ).order_by('-count')
            
            # Comparar com período anterior
            prev_start = start_date - timedelta(days=90)
            prev_end = start_date - timedelta(days=1)
            
            prev_job_types = Job.objects.filter(
                entry_date__range=[prev_start, prev_end]
            ).values('prosthesis_type').annotate(
                count=Count('id')
            )
            
            # Criar dicionário para comparação
            prev_counts = {item['prosthesis_type']: item['count'] for item in prev_job_types}
            
            # Analisar crescimento
            trending_types = []
            for job_type in job_types[:10]:  # Top 10
                current_count = job_type['count']
                prev_count = prev_counts.get(job_type['prosthesis_type'], 0)
                
                if prev_count > 0:
                    growth = ((current_count - prev_count) / prev_count) * 100
                else:
                    growth = 100 if current_count > 0 else 0
                
                trending_types.append({
                    'type': job_type['prosthesis_type'] or 'Não especificado',
                    'count': current_count,
                    'total_value': float(job_type['total_value'] or 0),
                    'avg_value': float(job_type['avg_value'] or 0),
                    'growth': growth
                })
            
            # Ordenar por crescimento
            trending_types.sort(key=lambda x: x['growth'], reverse=True)
            
            # Formatar resposta
            top_trending = []
            stable_types = []
            declining_types = []
            
            for item in trending_types:
                type_name = item['type']
                count = item['count']
                growth = item['growth']
                avg_value = item['avg_value']
                
                if growth > 20:
                    top_trending.append(f"🚀 **{type_name}**: {count} trabalhos (+{growth:.1f}%) - Ticket médio: R$ {avg_value:.2f}")
                elif growth > -10:
                    stable_types.append(f"📊 **{type_name}**: {count} trabalhos ({growth:+.1f}%) - Ticket médio: R$ {avg_value:.2f}")
                else:
                    declining_types.append(f"📉 **{type_name}**: {count} trabalhos ({growth:.1f}%) - Ticket médio: R$ {avg_value:.2f}")
            
            # Identificar oportunidades
            opportunities = []
            if top_trending:
                opportunities.append("Expandir capacidade para tipos em alta demanda")
            if declining_types:
                opportunities.append("Investigar causas do declínio em alguns tipos")
            if any(item['avg_value'] > 1000 for item in trending_types[:3]):
                opportunities.append("Focar em trabalhos de maior valor agregado")
            
            return {
                'success': True,
                'titulo': '📈 Análise de Mercado - Tipos de Trabalho em Alta',
                'mensagem': f"""
**Tipos em Alta (Crescimento >20%):**
{chr(10).join(top_trending[:3]) if top_trending else "• Nenhum tipo com crescimento significativo"}

**Tipos Estáveis:**
{chr(10).join(stable_types[:3]) if stable_types else "• Nenhum tipo estável identificado"}

**Tipos em Declínio:**
{chr(10).join(declining_types[:2]) if declining_types else "• Nenhum tipo em declínio"}

**Oportunidades Identificadas:**
{chr(10).join([f"• {opp}" for opp in opportunities]) if opportunities else "• Manter estratégia atual"}

**Período Analisado:** Últimos 3 meses vs. 3 meses anteriores
**Total de Tipos Analisados:** {len(trending_types)}
                """,
                'mercado': {
                    'tipos_em_alta': len(top_trending),
                    'tipos_estaveis': len(stable_types),
                    'tipos_declinio': len(declining_types),
                    'oportunidades': opportunities
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de mercado: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Análise',
                'mensagem': 'Erro ao analisar mercado. Tente novamente.'
            }
    
    def generate_financial_forecast(self, params=None):
        """Comando: Gere previsão financeira para o próximo trimestre"""
        try:
            # Predição de receita para 3 meses
            predictions = self.revenue_engine.predict_revenue(months_ahead=3)
            
            if not predictions:
                return {
                    'success': False,
                    'titulo': '❌ Erro na Previsão',
                    'mensagem': 'Não foi possível gerar previsão financeira.'
                }
            
            # Calcular métricas
            total_predicted = sum(p['predicted_revenue'] for p in predictions)
            avg_monthly = total_predicted / 3
            
            # Comparar com trimestre atual
            current_quarter_start = timezone.now().date().replace(day=1)
            if current_quarter_start.month <= 3:
                quarter_start = current_quarter_start.replace(month=1)
            elif current_quarter_start.month <= 6:
                quarter_start = current_quarter_start.replace(month=4)
            elif current_quarter_start.month <= 9:
                quarter_start = current_quarter_start.replace(month=7)
            else:
                quarter_start = current_quarter_start.replace(month=10)
            
            from apps.jobs.models import Job
            from django.db.models import Sum
            
            current_quarter_revenue = Job.objects.filter(
                completion_date__gte=quarter_start,
                completion_date__lte=timezone.now().date(),
                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
            ).aggregate(total=Sum('total_price'))['total'] or 0
            
            # Calcular crescimento esperado
            if current_quarter_revenue > 0:
                growth_projection = ((total_predicted - float(current_quarter_revenue)) / float(current_quarter_revenue)) * 100
            else:
                growth_projection = 0
            
            # Analisar riscos e oportunidades
            risks = []
            opportunities = []
            
            # Verificar confiança das predições
            avg_confidence = sum(p['confidence'] for p in predictions) / len(predictions)
            if avg_confidence < 0.7:
                risks.append("Baixa confiança nas predições devido a dados limitados")
            
            # Verificar sazonalidade
            seasonal_patterns = self.seasonality_analyzer.identify_seasonal_patterns()
            for pattern in seasonal_patterns:
                if pattern['impact_factor'] > 1.2:
                    opportunities.append(f"Aproveitar alta temporada em {pattern['description']}")
                elif pattern['impact_factor'] < 0.8:
                    risks.append(f"Preparar para baixa temporada em {pattern['description']}")
            
            # Gerar recomendações
            recommendations = []
            if growth_projection > 10:
                recommendations.append("Preparar expansão da capacidade produtiva")
                recommendations.append("Considerar contratação de novos técnicos")
            elif growth_projection < -5:
                recommendations.append("Revisar estratégias de marketing e vendas")
                recommendations.append("Otimizar custos operacionais")
            else:
                recommendations.append("Manter estratégia atual com monitoramento contínuo")
            
            recommendations.append("Diversificar portfólio de serviços")
            recommendations.append("Investir em relacionamento com clientes")
            
            return {
                'success': True,
                'titulo': '💰 Previsão Financeira - Próximo Trimestre',
                'mensagem': f"""
**Resumo Executivo:**
• **Receita Prevista**: R$ {total_predicted:,.2f}
• **Média Mensal**: R$ {avg_monthly:,.2f}
• **Crescimento Esperado**: {growth_projection:+.1f}%
• **Confiança Média**: {avg_confidence:.0%}

**Detalhamento Mensal:**
{chr(10).join([f"• {self._get_month_name(p['month'])}/{p['year']}: R$ {p['predicted_revenue']:,.2f}" for p in predictions])}

**Riscos Identificados:**
{chr(10).join([f"⚠️ {risk}" for risk in risks]) if risks else "✅ Nenhum risco significativo identificado"}

**Oportunidades:**
{chr(10).join([f"🎯 {opp}" for opp in opportunities]) if opportunities else "📊 Manter estratégia atual"}

**Recomendações Estratégicas:**
{chr(10).join([f"• {rec}" for rec in recommendations])}
                """,
                'previsao': {
                    'receita_total': total_predicted,
                    'media_mensal': avg_monthly,
                    'crescimento_esperado': growth_projection,
                    'confianca': avg_confidence,
                    'riscos_count': len(risks),
                    'oportunidades_count': len(opportunities)
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na previsão financeira: {e}")
            return {
                'success': False,
                'titulo': '❌ Erro na Previsão',
                'mensagem': 'Erro ao gerar previsão financeira. Tente novamente.'
            }
    
    def _get_month_name(self, month):
        """Retorna nome do mês"""
        months = [
            '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        return months[month]

