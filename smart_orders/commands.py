from .ml_engine import SmartOrderEngine, PricePredictionEngine, ReworkDetectionEngine
from .models import SmartOrderSuggestion, SmartOrderTemplate


class SmartOrderCommands:
    """Comandos inteligentes para gestão de ordens"""
    
    def __init__(self, user):
        self.user = user
        self.smart_engine = SmartOrderEngine()
        self.price_engine = PricePredictionEngine()
        self.rework_engine = ReworkDetectionEngine()
    
    def suggest_order_completion(self, client_id, partial_data=None):
        """Comando: Sugerir preenchimento automático de pedido"""
        try:
            from apps.clients.models import Client
            
            client = Client.objects.get(id=client_id)
            suggestions = self.smart_engine.generate_auto_fill_suggestions(
                client, partial_data
            )
            
            return {
                'success': True,
                'message': f'Sugestões geradas para {client.name}',
                'data': {
                    'client_name': client.name,
                    'suggestions': suggestions,
                    'confidence': 'alta' if suggestions.get('templates') else 'média'
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao gerar sugestões: {str(e)}'
            }
    
    def estimate_order_price(self, order_data, service_category=None):
        """Comando: Estimar preço de pedido"""
        try:
            prediction = self.price_engine.predict_price(order_data, service_category)
            
            confidence_level = 'alta' if prediction['confidence_score'] > 0.8 else 'média'
            
            return {
                'success': True,
                'message': f'Preço estimado com confiança {confidence_level}',
                'data': {
                    'estimated_price': f"R$ {prediction['predicted_price']:.2f}",
                    'price_range': {
                        'min': f"R$ {prediction['confidence_interval']['lower']:.2f}",
                        'max': f"R$ {prediction['confidence_interval']['upper']:.2f}"
                    },
                    'confidence': confidence_level,
                    'model_used': prediction['model_used']
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro na estimativa de preço: {str(e)}'
            }
    
    def analyze_client_behavior(self, client_id):
        """Comando: Analisar comportamento do cliente"""
        try:
            from apps.clients.models import Client
            
            client = Client.objects.get(id=client_id)
            patterns = self.smart_engine.analyze_client_patterns(client)
            
            # Resumir insights principais
            insights = []
            
            if patterns['preferred_services']['most_frequent']:
                top_service = patterns['preferred_services']['most_frequent'][0]
                insights.append(f"Serviço mais solicitado: {top_service}")
            
            avg_price = patterns['price_range']['avg']
            insights.append(f"Ticket médio: R$ {avg_price:.2f}")
            
            avg_days = patterns['timing_patterns']['avg_days']
            insights.append(f"Prazo médio: {avg_days:.0f} dias")
            
            satisfaction = patterns['satisfaction_trend']['avg']
            insights.append(f"Satisfação média: {satisfaction:.1f}/5")
            
            return {
                'success': True,
                'message': f'Análise completa de {client.name}',
                'data': {
                    'client_name': client.name,
                    'insights': insights,
                    'patterns': patterns
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro na análise: {str(e)}'
            }
    
    def detect_rework_risks(self):
        """Comando: Detectar riscos de retrabalho"""
        try:
            patterns = self.rework_engine.analyze_rework_patterns()
            
            if not patterns:
                return {
                    'success': True,
                    'message': 'Nenhum padrão de retrabalho crítico detectado',
                    'data': {'status': 'ok', 'patterns': []}
                }
            
            # Identificar padrões mais críticos
            critical_patterns = [
                p for p in patterns 
                if p.get('frequency_score', 0) > 0.3
            ]
            
            alerts = []
            for pattern in critical_patterns:
                alerts.append({
                    'pattern': pattern['pattern_name'],
                    'frequency': f"{pattern['frequency_score']:.1%}",
                    'impact': f"{pattern.get('avg_extra_time', 0):.1f} dias extras",
                    'prevention': pattern.get('prevention_suggestions', [])[:2]
                })
            
            return {
                'success': True,
                'message': f'{len(critical_patterns)} padrões críticos detectados',
                'data': {
                    'total_patterns': len(patterns),
                    'critical_patterns': len(critical_patterns),
                    'alerts': alerts
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro na detecção: {str(e)}'
            }
    
    def optimize_material_suggestions(self, service_type):
        """Comando: Otimizar sugestões de materiais"""
        try:
            from .models import MaterialSuggestion
            
            suggestions = MaterialSuggestion.objects.filter(
                service_type__icontains=service_type,
                is_active=True
            ).order_by('-confidence_score')[:5]
            
            if not suggestions:
                return {
                    'success': True,
                    'message': f'Nenhuma sugestão específica para {service_type}',
                    'data': {'suggestions': []}
                }
            
            material_list = []
            for suggestion in suggestions:
                material_list.append({
                    'material': suggestion.material_name,
                    'category': suggestion.material_category,
                    'quantity': f"{suggestion.suggested_quantity} {suggestion.unit_of_measure}",
                    'estimated_cost': f"R$ {suggestion.estimated_cost:.2f}",
                    'confidence': f"{suggestion.confidence_score:.1%}",
                    'acceptance_rate': f"{suggestion.acceptance_rate:.1f}%"
                })
            
            return {
                'success': True,
                'message': f'{len(material_list)} materiais recomendados para {service_type}',
                'data': {
                    'service_type': service_type,
                    'suggestions': material_list
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro na otimização: {str(e)}'
            }
    
    def create_smart_template(self, template_data):
        """Comando: Criar template inteligente"""
        try:
            template = SmartOrderTemplate.objects.create(
                name=template_data.get('name', 'Template Personalizado'),
                template_type=template_data.get('type', SmartOrderTemplate.TemplateType.CUSTOM),
                suggested_services=template_data.get('services', []),
                suggested_materials=template_data.get('materials', []),
                estimated_price_range=template_data.get('price_range', {}),
                estimated_completion_days=template_data.get('completion_days', 7),
                confidence_score=0.8,
                priority=template_data.get('priority', 5)
            )
            
            return {
                'success': True,
                'message': f'Template "{template.name}" criado com sucesso',
                'data': {
                    'template_id': template.id,
                    'template_name': template.name,
                    'services': template.suggested_services,
                    'materials': template.suggested_materials
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao criar template: {str(e)}'
            }

