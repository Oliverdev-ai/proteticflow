import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
import joblib
import json
import logging

from .models import (
    ClientOrderHistory, SmartOrderTemplate, MaterialSuggestion,
    PriceEstimationModel, SmartOrderSuggestion, ReworkPattern,
    SmartOrderMetrics
)
from apps.jobs.models import Job
from apps.clients.models import Client

logger = logging.getLogger(__name__)


class SmartOrderEngine:
    """Engine principal para gestão inteligente de ordens"""
    
    def __init__(self):
        self.price_models = {}
        self.material_models = {}
        self.scaler = StandardScaler()
    
    def analyze_client_patterns(self, client):
        """Analisa padrões de pedidos de um cliente"""
        try:
            # Obter histórico do cliente
            history = ClientOrderHistory.objects.filter(
                client=client
            ).order_by('-created_at')[:20]  # Últimos 20 pedidos
            
            if not history.exists():
                return self._create_default_pattern(client)
            
            # Analisar padrões
            patterns = {
                'preferred_services': self._analyze_service_preferences(history),
                'typical_materials': self._analyze_material_preferences(history),
                'price_range': self._analyze_price_patterns(history),
                'timing_patterns': self._analyze_timing_patterns(history),
                'satisfaction_trend': self._analyze_satisfaction_trend(history),
                'seasonal_preferences': self._analyze_seasonal_patterns(history)
            }
            
            return patterns
            
        except Exception as e:
            logger.error(f"Erro ao analisar padrões do cliente {client.id}: {e}")
            return self._create_default_pattern(client)
    
    def _analyze_service_preferences(self, history):
        """Analisa preferências de serviços"""
        service_counts = {}
        for entry in history:
            for service in entry.service_types:
                service_counts[service] = service_counts.get(service, 0) + 1
        
        # Ordenar por frequência
        sorted_services = sorted(
            service_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return {
            'most_frequent': [s[0] for s in sorted_services[:5]],
            'frequencies': dict(sorted_services),
            'diversity_score': len(service_counts) / max(len(history), 1)
        }
    
    def _analyze_material_preferences(self, history):
        """Analisa preferências de materiais"""
        material_counts = {}
        for entry in history:
            for material in entry.materials_used:
                material_counts[material] = material_counts.get(material, 0) + 1
        
        sorted_materials = sorted(
            material_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return {
            'most_used': [m[0] for m in sorted_materials[:10]],
            'frequencies': dict(sorted_materials)
        }
    
    def _analyze_price_patterns(self, history):
        """Analisa padrões de preço"""
        prices = [float(entry.total_value) for entry in history]
        
        if not prices:
            return {'min': 0, 'max': 0, 'avg': 0, 'std': 0}
        
        return {
            'min': min(prices),
            'max': max(prices),
            'avg': sum(prices) / len(prices),
            'std': np.std(prices),
            'typical_range': {
                'low': np.percentile(prices, 25),
                'high': np.percentile(prices, 75)
            }
        }
    
    def _analyze_timing_patterns(self, history):
        """Analisa padrões de tempo"""
        completion_times = [entry.completion_time_days for entry in history]
        
        if not completion_times:
            return {'avg_days': 7, 'min_days': 1, 'max_days': 14}
        
        return {
            'avg_days': sum(completion_times) / len(completion_times),
            'min_days': min(completion_times),
            'max_days': max(completion_times),
            'typical_range': {
                'fast': np.percentile(completion_times, 25),
                'slow': np.percentile(completion_times, 75)
            }
        }
    
    def _analyze_satisfaction_trend(self, history):
        """Analisa tendência de satisfação"""
        satisfactions = [
            entry.client_satisfaction for entry in history 
            if entry.client_satisfaction is not None
        ]
        
        if not satisfactions:
            return {'avg': 4.0, 'trend': 'stable'}
        
        avg_satisfaction = sum(satisfactions) / len(satisfactions)
        
        # Analisar tendência (últimos vs primeiros)
        if len(satisfactions) >= 4:
            recent = satisfactions[:len(satisfactions)//2]
            older = satisfactions[len(satisfactions)//2:]
            
            recent_avg = sum(recent) / len(recent)
            older_avg = sum(older) / len(older)
            
            if recent_avg > older_avg + 0.3:
                trend = 'improving'
            elif recent_avg < older_avg - 0.3:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return {
            'avg': avg_satisfaction,
            'trend': trend,
            'recent_scores': satisfactions[:5]
        }
    
    def _analyze_seasonal_patterns(self, history):
        """Analisa padrões sazonais"""
        seasonal_data = {}
        for entry in history:
            season = entry.season
            if season not in seasonal_data:
                seasonal_data[season] = {
                    'count': 0,
                    'total_value': 0,
                    'services': []
                }
            
            seasonal_data[season]['count'] += 1
            seasonal_data[season]['total_value'] += float(entry.total_value)
            seasonal_data[season]['services'].extend(entry.service_types)
        
        # Calcular médias
        for season in seasonal_data:
            data = seasonal_data[season]
            if data['count'] > 0:
                data['avg_value'] = data['total_value'] / data['count']
                # Contar serviços mais frequentes por estação
                service_counts = {}
                for service in data['services']:
                    service_counts[service] = service_counts.get(service, 0) + 1
                data['top_services'] = sorted(
                    service_counts.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:3]
        
        return seasonal_data
    
    def _create_default_pattern(self, client):
        """Cria padrão padrão para clientes novos"""
        return {
            'preferred_services': {
                'most_frequent': [],
                'frequencies': {},
                'diversity_score': 0
            },
            'typical_materials': {
                'most_used': [],
                'frequencies': {}
            },
            'price_range': {
                'min': 0,
                'max': 1000,
                'avg': 300,
                'std': 150,
                'typical_range': {'low': 200, 'high': 500}
            },
            'timing_patterns': {
                'avg_days': 7,
                'min_days': 3,
                'max_days': 14,
                'typical_range': {'fast': 5, 'slow': 10}
            },
            'satisfaction_trend': {
                'avg': 4.0,
                'trend': 'stable',
                'recent_scores': []
            },
            'seasonal_preferences': {}
        }
    
    def generate_auto_fill_suggestions(self, client, partial_order_data=None):
        """Gera sugestões de auto-preenchimento para um pedido"""
        try:
            # Analisar padrões do cliente
            patterns = self.analyze_client_patterns(client)
            
            # Obter templates aplicáveis
            applicable_templates = self._find_applicable_templates(
                client, partial_order_data
            )
            
            # Gerar sugestões baseadas em padrões
            suggestions = {
                'services': self._suggest_services(patterns, partial_order_data),
                'materials': self._suggest_materials(patterns, partial_order_data),
                'pricing': self._suggest_pricing(patterns, partial_order_data),
                'timeline': self._suggest_timeline(patterns, partial_order_data),
                'templates': applicable_templates
            }
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Erro ao gerar sugestões de auto-preenchimento: {e}")
            return self._create_default_suggestions()
    
    def _find_applicable_templates(self, client, partial_order_data):
        """Encontra templates aplicáveis"""
        templates = SmartOrderTemplate.objects.filter(
            Q(client=client) | Q(client__isnull=True),
            is_active=True
        ).order_by('-priority', '-confidence_score')
        
        applicable = []
        for template in templates:
            if self._template_matches_context(template, client, partial_order_data):
                applicable.append({
                    'id': template.id,
                    'name': template.name,
                    'type': template.template_type,
                    'confidence': template.confidence_score,
                    'suggested_services': template.suggested_services,
                    'suggested_materials': template.suggested_materials,
                    'estimated_price_range': template.estimated_price_range,
                    'estimated_completion_days': template.estimated_completion_days
                })
        
        return applicable[:5]  # Top 5 templates
    
    def _template_matches_context(self, template, client, partial_order_data):
        """Verifica se template se aplica ao contexto"""
        # Verificar cliente específico
        if template.client and template.client != client:
            return False
        
        # Verificar padrões de serviço
        if partial_order_data and 'services' in partial_order_data:
            order_services = set(partial_order_data['services'])
            template_services = set(template.service_types_pattern)
            
            if template_services and not order_services.intersection(template_services):
                return False
        
        # Verificar condições sazonais
        current_season = self._get_current_season()
        seasonal_conditions = template.seasonal_conditions
        
        if seasonal_conditions and 'seasons' in seasonal_conditions:
            if current_season not in seasonal_conditions['seasons']:
                return False
        
        return True
    
    def _suggest_services(self, patterns, partial_order_data):
        """Sugere serviços baseados em padrões"""
        suggestions = []
        
        # Serviços mais frequentes do cliente
        frequent_services = patterns['preferred_services']['most_frequent']
        for service in frequent_services[:3]:
            suggestions.append({
                'service': service,
                'reason': 'Serviço frequentemente solicitado por você',
                'confidence': 0.8,
                'frequency': patterns['preferred_services']['frequencies'].get(service, 0)
            })
        
        # Serviços complementares baseados no que já foi selecionado
        if partial_order_data and 'services' in partial_order_data:
            complementary = self._find_complementary_services(
                partial_order_data['services']
            )
            for service in complementary:
                suggestions.append({
                    'service': service['name'],
                    'reason': f'Frequentemente solicitado junto com {service["complement_to"]}',
                    'confidence': service['confidence'],
                    'type': 'complementary'
                })
        
        return suggestions
    
    def _suggest_materials(self, patterns, partial_order_data):
        """Sugere materiais baseados em padrões"""
        suggestions = []
        
        # Materiais mais usados pelo cliente
        frequent_materials = patterns['typical_materials']['most_used']
        for material in frequent_materials[:5]:
            suggestions.append({
                'material': material,
                'reason': 'Material frequentemente usado em seus trabalhos',
                'confidence': 0.7,
                'estimated_quantity': self._estimate_material_quantity(material, patterns)
            })
        
        # Materiais baseados nos serviços selecionados
        if partial_order_data and 'services' in partial_order_data:
            service_materials = self._get_materials_for_services(
                partial_order_data['services']
            )
            for material in service_materials:
                suggestions.append({
                    'material': material['name'],
                    'reason': f'Recomendado para {material["service"]}',
                    'confidence': material['confidence'],
                    'estimated_quantity': material['quantity'],
                    'estimated_cost': material['cost']
                })
        
        return suggestions
    
    def _suggest_pricing(self, patterns, partial_order_data):
        """Sugere preços baseados em padrões"""
        price_patterns = patterns['price_range']
        
        # Estimar preço baseado em serviços selecionados
        if partial_order_data and 'services' in partial_order_data:
            estimated_price = self._estimate_price_for_services(
                partial_order_data['services'], patterns
            )
        else:
            estimated_price = price_patterns['avg']
        
        return {
            'estimated_price': estimated_price,
            'price_range': {
                'min': max(estimated_price * 0.8, price_patterns['typical_range']['low']),
                'max': min(estimated_price * 1.2, price_patterns['typical_range']['high'])
            },
            'confidence': 0.75,
            'reasoning': 'Baseado no histórico de preços e serviços similares'
        }
    
    def _suggest_timeline(self, patterns, partial_order_data):
        """Sugere cronograma baseado em padrões"""
        timing_patterns = patterns['timing_patterns']
        
        # Estimar prazo baseado em serviços
        if partial_order_data and 'services' in partial_order_data:
            estimated_days = self._estimate_timeline_for_services(
                partial_order_data['services'], patterns
            )
        else:
            estimated_days = timing_patterns['avg_days']
        
        return {
            'estimated_days': int(estimated_days),
            'range': {
                'optimistic': max(1, int(estimated_days * 0.8)),
                'realistic': int(estimated_days),
                'pessimistic': int(estimated_days * 1.3)
            },
            'confidence': 0.7,
            'reasoning': 'Baseado no tempo médio de trabalhos similares'
        }
    
    def _find_complementary_services(self, selected_services):
        """Encontra serviços complementares"""
        # Analisar histórico para encontrar serviços frequentemente solicitados juntos
        complementary = []
        
        # Buscar em histórico de pedidos
        history_entries = ClientOrderHistory.objects.filter(
            service_types__overlap=selected_services
        )
        
        service_combinations = {}
        for entry in history_entries:
            for service in entry.service_types:
                if service not in selected_services:
                    key = f"{','.join(sorted(selected_services))} -> {service}"
                    service_combinations[key] = service_combinations.get(key, 0) + 1
        
        # Ordenar por frequência
        sorted_combinations = sorted(
            service_combinations.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for combo, count in sorted_combinations[:3]:
            parts = combo.split(' -> ')
            if len(parts) == 2:
                complementary.append({
                    'name': parts[1],
                    'complement_to': parts[0],
                    'confidence': min(0.9, count / 10),  # Normalizar confiança
                    'frequency': count
                })
        
        return complementary
    
    def _get_materials_for_services(self, services):
        """Obtém materiais recomendados para serviços"""
        materials = []
        
        for service in services:
            # Buscar sugestões de materiais para este serviço
            suggestions = MaterialSuggestion.objects.filter(
                service_type__icontains=service,
                is_active=True
            ).order_by('-confidence_score')[:3]
            
            for suggestion in suggestions:
                materials.append({
                    'name': suggestion.material_name,
                    'service': service,
                    'confidence': suggestion.confidence_score,
                    'quantity': suggestion.suggested_quantity,
                    'cost': float(suggestion.estimated_cost),
                    'unit': suggestion.unit_of_measure
                })
        
        return materials
    
    def _estimate_material_quantity(self, material, patterns):
        """Estima quantidade de material baseada em padrões"""
        # Buscar histórico de uso deste material
        history_entries = ClientOrderHistory.objects.filter(
            materials_used__contains=[material]
        )
        
        if history_entries.exists():
            # Calcular quantidade média (simplificado)
            return 1.0  # Placeholder - implementar lógica mais sofisticada
        
        return 1.0
    
    def _estimate_price_for_services(self, services, patterns):
        """Estima preço para serviços selecionados"""
        # Buscar preços históricos para combinações similares
        base_price = patterns['price_range']['avg']
        
        # Ajustar baseado no número e tipo de serviços
        service_multiplier = 1 + (len(services) - 1) * 0.3  # 30% adicional por serviço extra
        
        return base_price * service_multiplier
    
    def _estimate_timeline_for_services(self, services, patterns):
        """Estima cronograma para serviços selecionados"""
        base_days = patterns['timing_patterns']['avg_days']
        
        # Ajustar baseado na complexidade dos serviços
        complexity_multiplier = 1 + (len(services) - 1) * 0.2  # 20% adicional por serviço extra
        
        return base_days * complexity_multiplier
    
    def _get_current_season(self):
        """Obtém estação atual"""
        month = timezone.now().month
        if month in [12, 1, 2]:
            return 'summer'  # Verão no hemisfério sul
        elif month in [3, 4, 5]:
            return 'autumn'
        elif month in [6, 7, 8]:
            return 'winter'
        else:
            return 'spring'
    
    def _create_default_suggestions(self):
        """Cria sugestões padrão em caso de erro"""
        return {
            'services': [],
            'materials': [],
            'pricing': {
                'estimated_price': 300,
                'price_range': {'min': 200, 'max': 500},
                'confidence': 0.5,
                'reasoning': 'Estimativa baseada em valores médios'
            },
            'timeline': {
                'estimated_days': 7,
                'range': {'optimistic': 5, 'realistic': 7, 'pessimistic': 10},
                'confidence': 0.5,
                'reasoning': 'Estimativa baseada em prazos médios'
            },
            'templates': []
        }


class PricePredictionEngine:
    """Engine para predição de preços usando Machine Learning"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_columns = [
            'service_count', 'material_count', 'client_history_avg',
            'complexity_score', 'seasonal_factor', 'day_of_week_factor'
        ]
    
    def train_price_model(self, service_category=None):
        """Treina modelo de predição de preços"""
        try:
            # Obter dados de treinamento
            training_data = self._prepare_training_data(service_category)
            
            if len(training_data) < 10:
                logger.warning(f"Dados insuficientes para treinar modelo: {len(training_data)} amostras")
                return False
            
            # Preparar features e target
            X = training_data[self.feature_columns]
            y = training_data['total_value']
            
            # Dividir dados
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Escalar features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Treinar modelo Random Forest
            model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            model.fit(X_train_scaled, y_train)
            
            # Avaliar modelo
            y_pred = model.predict(X_test_scaled)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            # Salvar modelo
            model_key = service_category or 'general'
            self.models[model_key] = model
            self.scalers[model_key] = scaler
            
            # Salvar métricas no banco
            self._save_model_metrics(model_key, mae, r2, len(training_data))
            
            logger.info(f"Modelo treinado para {model_key}: MAE={mae:.2f}, R²={r2:.3f}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao treinar modelo de preços: {e}")
            return False
    
    def predict_price(self, order_data, service_category=None):
        """Prediz preço para um pedido"""
        try:
            model_key = service_category or 'general'
            
            if model_key not in self.models:
                # Treinar modelo se não existir
                if not self.train_price_model(service_category):
                    return self._fallback_price_estimation(order_data)
            
            # Preparar features
            features = self._extract_features_from_order(order_data)
            features_df = pd.DataFrame([features], columns=self.feature_columns)
            
            # Escalar features
            scaler = self.scalers[model_key]
            features_scaled = scaler.transform(features_df)
            
            # Fazer predição
            model = self.models[model_key]
            predicted_price = model.predict(features_scaled)[0]
            
            # Calcular intervalo de confiança (simplificado)
            confidence_interval = predicted_price * 0.15  # ±15%
            
            return {
                'predicted_price': max(0, predicted_price),
                'confidence_interval': {
                    'lower': max(0, predicted_price - confidence_interval),
                    'upper': predicted_price + confidence_interval
                },
                'confidence_score': 0.8,
                'model_used': model_key
            }
            
        except Exception as e:
            logger.error(f"Erro na predição de preço: {e}")
            return self._fallback_price_estimation(order_data)
    
    def _prepare_training_data(self, service_category):
        """Prepara dados de treinamento"""
        # Obter histórico de pedidos
        history_queryset = ClientOrderHistory.objects.all()
        
        if service_category:
            history_queryset = history_queryset.filter(
                service_types__contains=[service_category]
            )
        
        training_data = []
        for entry in history_queryset:
            features = self._extract_features_from_history(entry)
            features['total_value'] = float(entry.total_value)
            training_data.append(features)
        
        return pd.DataFrame(training_data)
    
    def _extract_features_from_history(self, history_entry):
        """Extrai features de uma entrada do histórico"""
        return {
            'service_count': len(history_entry.service_types),
            'material_count': len(history_entry.materials_used),
            'client_history_avg': self._get_client_avg_price(history_entry.client),
            'complexity_score': self._calculate_complexity_score(history_entry),
            'seasonal_factor': self._get_seasonal_factor(history_entry.season),
            'day_of_week_factor': self._get_day_factor(history_entry.day_of_week)
        }
    
    def _extract_features_from_order(self, order_data):
        """Extrai features de dados de pedido"""
        return {
            'service_count': len(order_data.get('services', [])),
            'material_count': len(order_data.get('materials', [])),
            'client_history_avg': self._get_client_avg_price(order_data.get('client')),
            'complexity_score': self._calculate_order_complexity(order_data),
            'seasonal_factor': self._get_seasonal_factor(self._get_current_season()),
            'day_of_week_factor': self._get_day_factor(timezone.now().strftime('%A').lower())
        }
    
    def _get_client_avg_price(self, client):
        """Obtém preço médio histórico do cliente"""
        if not client:
            return 300  # Valor padrão
        
        avg_price = ClientOrderHistory.objects.filter(
            client=client
        ).aggregate(avg_price=Avg('total_value'))['avg_price']
        
        return float(avg_price) if avg_price else 300
    
    def _calculate_complexity_score(self, history_entry):
        """Calcula score de complexidade baseado no histórico"""
        # Simplificado - baseado no número de serviços e materiais
        service_complexity = len(history_entry.service_types) * 0.3
        material_complexity = len(history_entry.materials_used) * 0.2
        time_complexity = history_entry.completion_time_days * 0.1
        
        return min(10, service_complexity + material_complexity + time_complexity)
    
    def _calculate_order_complexity(self, order_data):
        """Calcula score de complexidade para um pedido"""
        service_complexity = len(order_data.get('services', [])) * 0.3
        material_complexity = len(order_data.get('materials', [])) * 0.2
        
        return min(10, service_complexity + material_complexity)
    
    def _get_seasonal_factor(self, season):
        """Obtém fator sazonal"""
        factors = {
            'summer': 1.1,  # Alta temporada
            'winter': 0.9,  # Baixa temporada
            'spring': 1.0,
            'autumn': 1.0
        }
        return factors.get(season, 1.0)
    
    def _get_day_factor(self, day_of_week):
        """Obtém fator do dia da semana"""
        factors = {
            'monday': 1.0,
            'tuesday': 1.0,
            'wednesday': 1.0,
            'thursday': 1.0,
            'friday': 1.1,  # Sexta-feira pode ter urgência
            'saturday': 0.9,
            'sunday': 0.8
        }
        return factors.get(day_of_week, 1.0)
    
    def _save_model_metrics(self, model_key, mae, r2, training_size):
        """Salva métricas do modelo no banco"""
        try:
            model_record, created = PriceEstimationModel.objects.get_or_create(
                name=f"Price Model - {model_key}",
                defaults={
                    'model_type': PriceEstimationModel.ModelType.RANDOM_FOREST,
                    'service_categories': [model_key] if model_key != 'general' else [],
                    'accuracy_score': min(1.0, max(0.0, r2)),
                    'mean_absolute_error': mae,
                    'r2_score': r2,
                    'training_data_size': training_size,
                    'last_training_date': timezone.now()
                }
            )
            
            if not created:
                model_record.accuracy_score = min(1.0, max(0.0, r2))
                model_record.mean_absolute_error = mae
                model_record.r2_score = r2
                model_record.training_data_size = training_size
                model_record.last_training_date = timezone.now()
                model_record.save()
                
        except Exception as e:
            logger.error(f"Erro ao salvar métricas do modelo: {e}")
    
    def _fallback_price_estimation(self, order_data):
        """Estimativa de preço de fallback"""
        # Estimativa simples baseada em regras
        base_price = 300
        service_count = len(order_data.get('services', []))
        material_count = len(order_data.get('materials', []))
        
        estimated_price = base_price + (service_count * 100) + (material_count * 50)
        
        return {
            'predicted_price': estimated_price,
            'confidence_interval': {
                'lower': estimated_price * 0.8,
                'upper': estimated_price * 1.2
            },
            'confidence_score': 0.5,
            'model_used': 'fallback'
        }


class ReworkDetectionEngine:
    """Engine para detecção de padrões de retrabalho"""
    
    def __init__(self):
        self.detection_models = {}
    
    def analyze_rework_patterns(self):
        """Analisa padrões de retrabalho no histórico"""
        try:
            # Identificar trabalhos com retrabalho (simplificado)
            # Assumindo que trabalhos com tempo de conclusão muito alto podem indicar retrabalho
            
            history = ClientOrderHistory.objects.all()
            
            # Calcular estatísticas de tempo de conclusão
            completion_times = [entry.completion_time_days for entry in history]
            if not completion_times:
                return []
            
            avg_time = np.mean(completion_times)
            std_time = np.std(completion_times)
            threshold = avg_time + (2 * std_time)  # 2 desvios padrão acima da média
            
            # Identificar possíveis retrabalhos
            potential_reworks = history.filter(completion_time_days__gt=threshold)
            
            # Analisar padrões
            patterns = self._identify_patterns(potential_reworks)
            
            # Salvar padrões detectados
            self._save_rework_patterns(patterns)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Erro na análise de padrões de retrabalho: {e}")
            return []
    
    def _identify_patterns(self, rework_cases):
        """Identifica padrões nos casos de retrabalho"""
        patterns = []
        
        # Agrupar por tipo de serviço
        service_patterns = {}
        for case in rework_cases:
            for service in case.service_types:
                if service not in service_patterns:
                    service_patterns[service] = {
                        'cases': [],
                        'total_extra_time': 0,
                        'total_extra_cost': 0
                    }
                
                service_patterns[service]['cases'].append(case)
                # Calcular tempo extra (simplificado)
                extra_time = max(0, case.completion_time_days - 7)  # Assumindo 7 dias como padrão
                service_patterns[service]['total_extra_time'] += extra_time
        
        # Criar padrões para serviços com múltiplos casos
        for service, data in service_patterns.items():
            if len(data['cases']) >= 3:  # Pelo menos 3 casos para considerar padrão
                pattern = {
                    'pattern_name': f'Retrabalho em {service}',
                    'pattern_description': f'Padrão de retrabalho identificado em serviços de {service}',
                    'service_types_affected': [service],
                    'frequency_score': len(data['cases']) / len(rework_cases),
                    'avg_extra_time': data['total_extra_time'] / len(data['cases']),
                    'common_causes': self._identify_common_causes(data['cases']),
                    'prevention_suggestions': self._generate_prevention_suggestions(service)
                }
                patterns.append(pattern)
        
        return patterns
    
    def _identify_common_causes(self, cases):
        """Identifica causas comuns de retrabalho"""
        # Análise simplificada baseada em materiais e satisfação
        causes = []
        
        # Analisar materiais frequentes
        material_counts = {}
        low_satisfaction_count = 0
        
        for case in cases:
            for material in case.materials_used:
                material_counts[material] = material_counts.get(material, 0) + 1
            
            if case.client_satisfaction and case.client_satisfaction < 3:
                low_satisfaction_count += 1
        
        # Materiais problemáticos
        if material_counts:
            most_common_material = max(material_counts, key=material_counts.get)
            if material_counts[most_common_material] > len(cases) * 0.6:
                causes.append(f'Uso frequente de {most_common_material}')
        
        # Baixa satisfação
        if low_satisfaction_count > len(cases) * 0.5:
            causes.append('Baixa satisfação do cliente')
        
        return causes or ['Causa não identificada']
    
    def _generate_prevention_suggestions(self, service):
        """Gera sugestões de prevenção para um serviço"""
        suggestions = [
            f'Revisar processo de {service}',
            'Implementar checklist de qualidade',
            'Treinamento adicional da equipe',
            'Verificação dupla antes da entrega'
        ]
        return suggestions
    
    def _save_rework_patterns(self, patterns):
        """Salva padrões de retrabalho no banco"""
        for pattern_data in patterns:
            try:
                pattern, created = ReworkPattern.objects.get_or_create(
                    pattern_name=pattern_data['pattern_name'],
                    defaults={
                        'pattern_description': pattern_data['pattern_description'],
                        'service_types_affected': pattern_data['service_types_affected'],
                        'frequency_score': pattern_data['frequency_score'],
                        'time_impact_hours': pattern_data['avg_extra_time'] * 8,  # Converter dias para horas
                        'cost_impact': pattern_data['avg_extra_time'] * 200,  # Estimativa de custo
                        'common_causes': pattern_data['common_causes'],
                        'prevention_suggestions': pattern_data['prevention_suggestions'],
                        'detection_confidence': 0.7,
                        'sample_size': len(pattern_data.get('cases', [])),
                        'requires_attention': pattern_data['frequency_score'] > 0.2
                    }
                )
                
                if not created:
                    # Atualizar padrão existente
                    pattern.frequency_score = pattern_data['frequency_score']
                    pattern.time_impact_hours = pattern_data['avg_extra_time'] * 8
                    pattern.cost_impact = pattern_data['avg_extra_time'] * 200
                    pattern.updated_at = timezone.now()
                    pattern.save()
                    
            except Exception as e:
                logger.error(f"Erro ao salvar padrão de retrabalho: {e}")


def update_client_order_history(job):
    """Atualiza histórico de pedidos quando um trabalho é concluído"""
    try:
        # Extrair dados do trabalho
        service_types = []  # Implementar extração de tipos de serviço
        materials_used = []  # Implementar extração de materiais
        
        # Calcular tempo de conclusão
        if job.created_at and job.updated_at:
            completion_time = (job.updated_at - job.created_at).days
        else:
            completion_time = 7  # Padrão
        
        # Determinar estação
        month = job.created_at.month if job.created_at else timezone.now().month
        if month in [12, 1, 2]:
            season = 'summer'
        elif month in [3, 4, 5]:
            season = 'autumn'
        elif month in [6, 7, 8]:
            season = 'winter'
        else:
            season = 'spring'
        
        # Determinar dia da semana
        day_of_week = job.created_at.strftime('%A').lower() if job.created_at else 'monday'
        
        # Criar entrada no histórico
        ClientOrderHistory.objects.create(
            client=job.client,
            job=job,
            service_types=service_types,
            materials_used=materials_used,
            total_value=job.total_price or 0,
            completion_time_days=completion_time,
            season=season,
            day_of_week=day_of_week
        )
        
        logger.info(f"Histórico atualizado para trabalho {job.id}")
        
    except Exception as e:
        logger.error(f"Erro ao atualizar histórico do cliente: {e}")

