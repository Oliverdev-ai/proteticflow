import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from apps.jobs.models import Job
from apps.clients.models import Client
from .models import (
    RevenuePredictor, TrendAnalysis, PerformanceMetric, 
    SeasonalityPattern, PredictiveAlert
)
import logging

logger = logging.getLogger(__name__)


class RevenuePredictionEngine:
    """Engine para predição de receita usando Machine Learning"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=15
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def _prepare_historical_data(self, months_back=24):
        """Prepara dados históricos para treino"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=months_back * 30)
        
        # Agregar receita por mês
        monthly_data = []
        current_date = start_date
        
        while current_date <= end_date:
            month_start = current_date.replace(day=1)
            if current_date.month == 12:
                month_end = current_date.replace(year=current_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = current_date.replace(month=current_date.month + 1, day=1) - timedelta(days=1)
            
            # Calcular receita do mês
            monthly_revenue = Job.objects.filter(
                completion_date__range=[month_start, month_end],
                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
            ).aggregate(total=Sum('total_price'))['total'] or 0
            
            # Calcular número de trabalhos
            jobs_count = Job.objects.filter(
                completion_date__range=[month_start, month_end],
                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
            ).count()
            
            # Calcular número de clientes ativos
            active_clients = Job.objects.filter(
                completion_date__range=[month_start, month_end]
            ).values('client').distinct().count()
            
            # Features sazonais
            month_features = {
                'year': current_date.year,
                'month': current_date.month,
                'quarter': (current_date.month - 1) // 3 + 1,
                'is_holiday_season': current_date.month in [12, 1],  # Dezembro/Janeiro
                'is_summer': current_date.month in [12, 1, 2],  # Verão no Brasil
                'revenue': float(monthly_revenue),
                'jobs_count': jobs_count,
                'active_clients': active_clients,
                'avg_ticket': float(monthly_revenue) / max(jobs_count, 1)
            }
            
            monthly_data.append(month_features)
            
            # Próximo mês
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return pd.DataFrame(monthly_data)
    
    def _create_features(self, df):
        """Cria features para o modelo"""
        # Features de lag (valores anteriores)
        df['revenue_lag_1'] = df['revenue'].shift(1)
        df['revenue_lag_2'] = df['revenue'].shift(2)
        df['revenue_lag_3'] = df['revenue'].shift(3)
        
        # Médias móveis
        df['revenue_ma_3'] = df['revenue'].rolling(window=3).mean()
        df['revenue_ma_6'] = df['revenue'].rolling(window=6).mean()
        
        # Tendência
        df['revenue_trend'] = df['revenue'].diff()
        
        # Features cíclicas para sazonalidade
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Features de crescimento
        df['jobs_growth'] = df['jobs_count'].pct_change()
        df['clients_growth'] = df['active_clients'].pct_change()
        
        # Remover linhas com NaN
        df = df.dropna()
        
        return df
    
    def train(self, months_back=24):
        """Treina o modelo de predição"""
        try:
            logger.info("Iniciando treinamento do modelo de predição de receita...")
            
            # Preparar dados
            df = self._prepare_historical_data(months_back)
            
            if len(df) < 6:
                logger.warning("Dados insuficientes para treino. Gerando dados sintéticos.")
                df = self._generate_synthetic_data()
            
            # Criar features
            df = self._create_features(df)
            
            if len(df) < 3:
                logger.error("Dados insuficientes mesmo após processamento")
                return False
            
            # Preparar features e target
            feature_columns = [
                'month', 'quarter', 'is_holiday_season', 'is_summer',
                'jobs_count', 'active_clients', 'avg_ticket',
                'revenue_lag_1', 'revenue_lag_2', 'revenue_lag_3',
                'revenue_ma_3', 'revenue_ma_6', 'revenue_trend',
                'month_sin', 'month_cos', 'jobs_growth', 'clients_growth'
            ]
            
            X = df[feature_columns]
            y = df['revenue']
            
            # Normalizar features
            X_scaled = self.scaler.fit_transform(X)
            
            # Treinar modelo
            self.model.fit(X_scaled, y)
            
            # Avaliar modelo
            y_pred = self.model.predict(X_scaled)
            mae = mean_absolute_error(y, y_pred)
            rmse = np.sqrt(mean_squared_error(y, y_pred))
            r2 = r2_score(y, y_pred)
            
            self.is_trained = True
            
            logger.info(f"Modelo treinado. MAE: {mae:.2f}, RMSE: {rmse:.2f}, R²: {r2:.3f}")
            return True
            
        except Exception as e:
            logger.error(f"Erro no treinamento: {e}")
            return False
    
    def _generate_synthetic_data(self):
        """Gera dados sintéticos para treino inicial"""
        synthetic_data = []
        base_revenue = 50000  # Receita base mensal
        
        for i in range(24):  # 24 meses
            month = (i % 12) + 1
            year = 2023 + (i // 12)
            
            # Sazonalidade
            seasonal_factor = 1.0
            if month in [12, 1]:  # Dezembro/Janeiro
                seasonal_factor = 1.3
            elif month in [6, 7]:  # Junho/Julho
                seasonal_factor = 0.8
            
            # Tendência de crescimento
            growth_factor = 1 + (i * 0.02)  # 2% de crescimento por mês
            
            # Ruído aleatório
            noise = np.random.normal(0, 0.1)
            
            revenue = base_revenue * seasonal_factor * growth_factor * (1 + noise)
            jobs_count = int(revenue / 800)  # Ticket médio de R$ 800
            active_clients = int(jobs_count * 0.7)  # 70% de clientes únicos
            
            synthetic_data.append({
                'year': year,
                'month': month,
                'quarter': (month - 1) // 3 + 1,
                'is_holiday_season': month in [12, 1],
                'is_summer': month in [12, 1, 2],
                'revenue': revenue,
                'jobs_count': jobs_count,
                'active_clients': active_clients,
                'avg_ticket': revenue / max(jobs_count, 1)
            })
        
        return pd.DataFrame(synthetic_data)
    
    def predict_revenue(self, months_ahead=3):
        """Prediz receita para os próximos meses"""
        try:
            if not self.is_trained:
                if not self.train():
                    return None
            
            # Obter dados recentes
            df = self._prepare_historical_data(12)  # Últimos 12 meses
            df = self._create_features(df)
            
            predictions = []
            current_date = timezone.now().date()
            
            for i in range(months_ahead):
                # Calcular data do mês a predizer
                if current_date.month + i + 1 > 12:
                    pred_year = current_date.year + ((current_date.month + i) // 12)
                    pred_month = ((current_date.month + i) % 12) + 1
                else:
                    pred_year = current_date.year
                    pred_month = current_date.month + i + 1
                
                # Preparar features para predição
                last_row = df.iloc[-1].copy()
                
                # Atualizar features temporais
                last_row['month'] = pred_month
                last_row['quarter'] = (pred_month - 1) // 3 + 1
                last_row['is_holiday_season'] = pred_month in [12, 1]
                last_row['is_summer'] = pred_month in [12, 1, 2]
                last_row['month_sin'] = np.sin(2 * np.pi * pred_month / 12)
                last_row['month_cos'] = np.cos(2 * np.pi * pred_month / 12)
                
                # Features para predição
                feature_columns = [
                    'month', 'quarter', 'is_holiday_season', 'is_summer',
                    'jobs_count', 'active_clients', 'avg_ticket',
                    'revenue_lag_1', 'revenue_lag_2', 'revenue_lag_3',
                    'revenue_ma_3', 'revenue_ma_6', 'revenue_trend',
                    'month_sin', 'month_cos', 'jobs_growth', 'clients_growth'
                ]
                
                X_pred = last_row[feature_columns].values.reshape(1, -1)
                X_pred_scaled = self.scaler.transform(X_pred)
                
                # Fazer predição
                predicted_revenue = self.model.predict(X_pred_scaled)[0]
                
                # Calcular confiança baseada na variância das árvores
                tree_predictions = [tree.predict(X_pred_scaled)[0] for tree in self.model.estimators_]
                confidence = max(0, min(1, 1 - (np.std(tree_predictions) / np.mean(tree_predictions))))
                
                predictions.append({
                    'month': pred_month,
                    'year': pred_year,
                    'predicted_revenue': max(0, predicted_revenue),
                    'confidence': confidence
                })
            
            return predictions
            
        except Exception as e:
            logger.error(f"Erro na predição: {e}")
            return None


class TrendAnalysisEngine:
    """Engine para análise de tendências"""
    
    def analyze_revenue_trend(self, months_back=12):
        """Analisa tendência de receita"""
        try:
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=months_back * 30)
            
            # Obter dados mensais
            monthly_revenues = []
            current_date = start_date
            
            while current_date <= end_date:
                month_start = current_date.replace(day=1)
                if current_date.month == 12:
                    month_end = current_date.replace(year=current_date.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    month_end = current_date.replace(month=current_date.month + 1, day=1) - timedelta(days=1)
                
                revenue = Job.objects.filter(
                    completion_date__range=[month_start, month_end],
                    status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
                ).aggregate(total=Sum('total_price'))['total'] or 0
                
                monthly_revenues.append(float(revenue))
                
                # Próximo mês
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            
            if len(monthly_revenues) < 2:
                return None
            
            # Calcular tendência
            current_value = monthly_revenues[-1]
            previous_value = monthly_revenues[-2] if len(monthly_revenues) > 1 else monthly_revenues[-1]
            
            if previous_value > 0:
                percentage_change = ((current_value - previous_value) / previous_value) * 100
            else:
                percentage_change = 0
            
            # Determinar força da tendência
            if abs(percentage_change) < 5:
                trend_strength = 'weak'
            elif abs(percentage_change) < 15:
                trend_strength = 'moderate'
            elif abs(percentage_change) < 30:
                trend_strength = 'strong'
            else:
                trend_strength = 'very_strong'
            
            # Gerar insights
            insights = []
            if percentage_change > 10:
                insights.append("Crescimento significativo na receita")
            elif percentage_change < -10:
                insights.append("Declínio preocupante na receita")
            else:
                insights.append("Receita estável")
            
            # Gerar recomendações
            recommendations = []
            if percentage_change < -5:
                recommendations.extend([
                    "Revisar estratégias de marketing",
                    "Analisar satisfação dos clientes",
                    "Considerar novos serviços"
                ])
            elif percentage_change > 15:
                recommendations.extend([
                    "Preparar para aumento de demanda",
                    "Considerar expansão da equipe",
                    "Otimizar processos produtivos"
                ])
            
            return {
                'current_value': current_value,
                'previous_value': previous_value,
                'percentage_change': percentage_change,
                'trend_strength': trend_strength,
                'insights': insights,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de tendência: {e}")
            return None
    
    def analyze_jobs_volume_trend(self, months_back=12):
        """Analisa tendência de volume de trabalhos"""
        try:
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=months_back * 30)
            
            # Volume atual vs anterior
            current_month_start = end_date.replace(day=1)
            previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
            previous_month_end = current_month_start - timedelta(days=1)
            
            current_volume = Job.objects.filter(
                entry_date__gte=current_month_start,
                entry_date__lte=end_date
            ).count()
            
            previous_volume = Job.objects.filter(
                entry_date__gte=previous_month_start,
                entry_date__lte=previous_month_end
            ).count()
            
            if previous_volume > 0:
                percentage_change = ((current_volume - previous_volume) / previous_volume) * 100
            else:
                percentage_change = 0
            
            # Determinar força da tendência
            if abs(percentage_change) < 10:
                trend_strength = 'weak'
            elif abs(percentage_change) < 25:
                trend_strength = 'moderate'
            elif abs(percentage_change) < 50:
                trend_strength = 'strong'
            else:
                trend_strength = 'very_strong'
            
            return {
                'current_value': current_volume,
                'previous_value': previous_volume,
                'percentage_change': percentage_change,
                'trend_strength': trend_strength,
                'insights': [f"Volume de trabalhos {'aumentou' if percentage_change > 0 else 'diminuiu'} {abs(percentage_change):.1f}%"],
                'recommendations': []
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de volume: {e}")
            return None


class SeasonalityAnalyzer:
    """Analisador de padrões sazonais"""
    
    def identify_seasonal_patterns(self, years_back=2):
        """Identifica padrões sazonais"""
        try:
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=years_back * 365)
            
            # Agregar dados por mês
            monthly_data = {}
            
            for month in range(1, 13):
                month_revenues = []
                
                # Buscar dados deste mês em anos anteriores
                for year in range(start_date.year, end_date.year + 1):
                    try:
                        month_start = datetime(year, month, 1).date()
                        if month == 12:
                            month_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
                        else:
                            month_end = datetime(year, month + 1, 1).date() - timedelta(days=1)
                        
                        if month_end <= end_date:
                            revenue = Job.objects.filter(
                                completion_date__range=[month_start, month_end],
                                status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED]
                            ).aggregate(total=Sum('total_price'))['total'] or 0
                            
                            month_revenues.append(float(revenue))
                    except:
                        continue
                
                if month_revenues:
                    monthly_data[month] = {
                        'average': np.mean(month_revenues),
                        'std': np.std(month_revenues),
                        'count': len(month_revenues)
                    }
            
            # Calcular padrões
            patterns = []
            overall_average = np.mean([data['average'] for data in monthly_data.values()])
            
            for month, data in monthly_data.items():
                if data['count'] >= 2:  # Pelo menos 2 anos de dados
                    impact_factor = data['average'] / overall_average if overall_average > 0 else 1.0
                    
                    if impact_factor > 1.2:
                        pattern_type = "high_season"
                        description = f"Alta temporada em {self._month_name(month)}"
                    elif impact_factor < 0.8:
                        pattern_type = "low_season"
                        description = f"Baixa temporada em {self._month_name(month)}"
                    else:
                        continue
                    
                    confidence = min(1.0, data['count'] / 3.0)  # Mais confiança com mais dados
                    
                    patterns.append({
                        'month': month,
                        'pattern_type': pattern_type,
                        'description': description,
                        'impact_factor': impact_factor,
                        'confidence': confidence,
                        'average_revenue': data['average']
                    })
            
            return patterns
            
        except Exception as e:
            logger.error(f"Erro na análise de sazonalidade: {e}")
            return []
    
    def _month_name(self, month):
        """Retorna nome do mês"""
        months = [
            '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        return months[month]


class PredictiveAlertEngine:
    """Engine para gerar alertas preditivos"""
    
    def __init__(self):
        self.revenue_engine = RevenuePredictionEngine()
        self.trend_engine = TrendAnalysisEngine()
    
    def generate_alerts(self):
        """Gera alertas preditivos"""
        alerts = []
        
        # Alerta de queda de receita
        revenue_trend = self.trend_engine.analyze_revenue_trend()
        if revenue_trend and revenue_trend['percentage_change'] < -15:
            alerts.append({
                'alert_type': PredictiveAlert.AlertType.REVENUE_DROP,
                'severity': PredictiveAlert.AlertSeverity.HIGH,
                'title': 'Queda Significativa na Receita',
                'description': f"Receita caiu {abs(revenue_trend['percentage_change']):.1f}% em relação ao mês anterior",
                'probability': 0.9,
                'time_horizon': 'Atual',
                'recommended_actions': [
                    'Revisar estratégias de marketing',
                    'Analisar satisfação dos clientes',
                    'Verificar concorrência'
                ]
            })
        
        # Alerta de sobrecarga de capacidade
        pending_jobs = Job.objects.filter(
            status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
        ).count()
        
        if pending_jobs > 50:  # Threshold configurável
            alerts.append({
                'alert_type': PredictiveAlert.AlertType.CAPACITY_OVERLOAD,
                'severity': PredictiveAlert.AlertSeverity.MEDIUM,
                'title': 'Possível Sobrecarga de Capacidade',
                'description': f"{pending_jobs} trabalhos pendentes podem sobrecarregar a produção",
                'probability': 0.7,
                'time_horizon': 'Próximas 2 semanas',
                'recommended_actions': [
                    'Considerar horas extras',
                    'Priorizar trabalhos urgentes',
                    'Avaliar terceirização'
                ]
            })
        
        return alerts

