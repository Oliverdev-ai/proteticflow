import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder
import joblib
import os
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from apps.jobs.models import Job, JobStage
from .models import JobTimeEstimate, TechnicianProfile, MLModelMetrics, BottleneckAlert
import logging

logger = logging.getLogger(__name__)


class JobTimePredictor:
    """Preditor de tempo de trabalhos usando Machine Learning"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=10,
            min_samples_split=5
        )
        self.encoders = {}
        self.feature_columns = [
            'prosthesis_type_encoded',
            'material_encoded', 
            'complexity_level',
            'technician_skill_level',
            'technician_efficiency',
            'client_history_avg_time',
            'month',
            'day_of_week'
        ]
        self.is_trained = False
        self.model_path = os.path.join(settings.MEDIA_ROOT, 'ml_models', 'job_time_predictor.pkl')
        self.encoders_path = os.path.join(settings.MEDIA_ROOT, 'ml_models', 'encoders.pkl')
        
        # Criar diretório se não existir
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
    
    def _prepare_features(self, jobs_data):
        """Prepara features para o modelo"""
        df = pd.DataFrame(jobs_data)
        
        # Encoding de variáveis categóricas
        categorical_columns = ['prosthesis_type', 'material']
        
        for col in categorical_columns:
            if col not in self.encoders:
                self.encoders[col] = LabelEncoder()
                df[f'{col}_encoded'] = self.encoders[col].fit_transform(df[col].fillna('unknown'))
            else:
                # Para dados novos, usar encoder existente
                df[f'{col}_encoded'] = self.encoders[col].transform(df[col].fillna('unknown'))
        
        # Features temporais
        df['entry_date'] = pd.to_datetime(df['entry_date'])
        df['month'] = df['entry_date'].dt.month
        df['day_of_week'] = df['entry_date'].dt.dayofweek
        
        # Garantir que todas as features necessárias existam
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0  # Valor padrão
        
        return df[self.feature_columns]
    
    def _get_historical_data(self):
        """Obtém dados históricos para treino"""
        # Buscar trabalhos concluídos com tempo real
        jobs = Job.objects.filter(
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            completion_date__isnull=False,
            entry_date__isnull=False
        ).select_related('client').prefetch_related('job_items__service_item')
        
        data = []
        for job in jobs:
            # Calcular tempo real de produção
            if job.completion_date and job.entry_date:
                actual_time = (job.completion_date - job.entry_date).days * 8  # Assumindo 8h/dia
                
                # Obter dados do técnico (se disponível)
                technician_skill = 2  # Padrão
                technician_efficiency = 1.0  # Padrão
                
                # Calcular tempo médio histórico do cliente
                client_avg_time = self._get_client_average_time(job.client)
                
                # Determinar complexidade baseada no tipo e instruções
                complexity = self._estimate_complexity(job)
                
                data.append({
                    'prosthesis_type': job.prosthesis_type or 'unknown',
                    'material': job.material or 'unknown',
                    'complexity_level': complexity,
                    'technician_skill_level': technician_skill,
                    'technician_efficiency': technician_efficiency,
                    'client_history_avg_time': client_avg_time,
                    'entry_date': job.entry_date,
                    'actual_time_hours': actual_time
                })
        
        return data
    
    def _get_client_average_time(self, client):
        """Calcula tempo médio histórico do cliente"""
        completed_jobs = Job.objects.filter(
            client=client,
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            completion_date__isnull=False,
            entry_date__isnull=False
        )
        
        if completed_jobs.exists():
            total_time = sum([
                (job.completion_date - job.entry_date).days * 8 
                for job in completed_jobs
            ])
            return total_time / completed_jobs.count()
        
        return 40  # Padrão de 40 horas (5 dias)
    
    def _estimate_complexity(self, job):
        """Estima complexidade do trabalho"""
        complexity = 2  # Padrão médio
        
        # Baseado no tipo de prótese
        complex_types = ['implante', 'protocolo', 'overdenture']
        simple_types = ['coroa', 'faceta', 'restauração']
        
        prosthesis_type = (job.prosthesis_type or '').lower()
        
        if any(t in prosthesis_type for t in complex_types):
            complexity = 4
        elif any(t in prosthesis_type for t in simple_types):
            complexity = 1
        
        # Ajustar baseado nas instruções
        instructions = (job.instructions or '').lower()
        if len(instructions) > 200:  # Instruções longas = mais complexo
            complexity = min(4, complexity + 1)
        
        return complexity
    
    def train(self, retrain=False):
        """Treina o modelo com dados históricos"""
        try:
            # Verificar se modelo já existe e não é retreino
            if not retrain and os.path.exists(self.model_path):
                self.load_model()
                return True
            
            logger.info("Iniciando treinamento do modelo de predição de tempo...")
            
            # Obter dados históricos
            historical_data = self._get_historical_data()
            
            if len(historical_data) < 10:
                logger.warning("Dados insuficientes para treino. Usando dados sintéticos.")
                historical_data = self._generate_synthetic_data()
            
            # Preparar features
            df = self._prepare_features(historical_data)
            y = [item['actual_time_hours'] for item in historical_data]
            
            # Dividir dados
            X_train, X_test, y_train, y_test = train_test_split(
                df, y, test_size=0.2, random_state=42
            )
            
            # Treinar modelo
            self.model.fit(X_train, y_train)
            
            # Avaliar modelo
            y_pred = self.model.predict(X_test)
            mae = mean_absolute_error(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            
            # Salvar modelo e encoders
            self.save_model()
            
            # Salvar métricas
            self._save_metrics(mae, rmse, len(historical_data))
            
            self.is_trained = True
            
            logger.info(f"Modelo treinado com sucesso. MAE: {mae:.2f}, RMSE: {rmse:.2f}")
            return True
            
        except Exception as e:
            logger.error(f"Erro no treinamento do modelo: {e}")
            return False
    
    def _generate_synthetic_data(self):
        """Gera dados sintéticos para treino inicial"""
        synthetic_data = []
        
        prosthesis_types = ['coroa', 'ponte', 'implante', 'prótese total', 'prótese parcial']
        materials = ['porcelana', 'zircônia', 'resina', 'metal', 'cerâmica']
        
        for i in range(100):
            prosthesis_type = np.random.choice(prosthesis_types)
            material = np.random.choice(materials)
            complexity = np.random.randint(1, 5)
            
            # Tempo base baseado na complexidade
            base_time = complexity * 10 + np.random.normal(0, 5)
            base_time = max(4, base_time)  # Mínimo 4 horas
            
            synthetic_data.append({
                'prosthesis_type': prosthesis_type,
                'material': material,
                'complexity_level': complexity,
                'technician_skill_level': np.random.randint(1, 5),
                'technician_efficiency': np.random.uniform(0.8, 1.3),
                'client_history_avg_time': np.random.uniform(20, 60),
                'entry_date': datetime.now() - timedelta(days=np.random.randint(1, 365)),
                'actual_time_hours': base_time
            })
        
        return synthetic_data
    
    def predict_time(self, job_features):
        """Prediz tempo de produção para um trabalho"""
        try:
            if not self.is_trained:
                if not self.load_model():
                    if not self.train():
                        return None
            
            # Preparar features
            df = self._prepare_features([job_features])
            
            # Fazer predição
            predicted_time = self.model.predict(df)[0]
            
            # Garantir valor mínimo razoável
            predicted_time = max(2, predicted_time)
            
            return {
                'estimated_hours': round(predicted_time, 1),
                'estimated_days': round(predicted_time / 8, 1),
                'confidence': self._calculate_confidence(df)
            }
            
        except Exception as e:
            logger.error(f"Erro na predição: {e}")
            return None
    
    def _calculate_confidence(self, features):
        """Calcula confiança da predição"""
        try:
            # Usar variância das predições das árvores
            predictions = [tree.predict(features)[0] for tree in self.model.estimators_]
            variance = np.var(predictions)
            
            # Converter variância em score de confiança (0-1)
            confidence = max(0, min(1, 1 - (variance / 100)))
            return round(confidence, 2)
            
        except:
            return 0.7  # Confiança padrão
    
    def save_model(self):
        """Salva modelo e encoders"""
        try:
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.encoders, self.encoders_path)
            logger.info("Modelo salvo com sucesso")
        except Exception as e:
            logger.error(f"Erro ao salvar modelo: {e}")
    
    def load_model(self):
        """Carrega modelo e encoders salvos"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.encoders_path):
                self.model = joblib.load(self.model_path)
                self.encoders = joblib.load(self.encoders_path)
                self.is_trained = True
                logger.info("Modelo carregado com sucesso")
                return True
        except Exception as e:
            logger.error(f"Erro ao carregar modelo: {e}")
        
        return False
    
    def _save_metrics(self, mae, rmse, training_size):
        """Salva métricas do modelo"""
        try:
            # Calcular importância das features
            feature_importance = dict(zip(
                self.feature_columns,
                self.model.feature_importances_
            ))
            
            # Salvar ou atualizar métricas
            metrics, created = MLModelMetrics.objects.get_or_create(
                model_name='JobTimePredictor',
                model_version='1.0',
                defaults={
                    'mae_score': mae,
                    'rmse_score': rmse,
                    'training_data_size': training_size,
                    'feature_importance': feature_importance,
                    'is_active': True
                }
            )
            
            if not created:
                metrics.mae_score = mae
                metrics.rmse_score = rmse
                metrics.training_data_size = training_size
                metrics.feature_importance = feature_importance
                metrics.last_trained_at = timezone.now()
                metrics.save()
            
        except Exception as e:
            logger.error(f"Erro ao salvar métricas: {e}")


class ProductionOptimizer:
    """Otimizador de cronograma de produção"""
    
    def __init__(self):
        self.time_predictor = JobTimePredictor()
    
    def optimize_schedule(self, jobs=None, technicians=None, constraints=None):
        """Otimiza cronograma de produção"""
        try:
            # Obter trabalhos pendentes se não fornecidos
            if jobs is None:
                jobs = Job.objects.filter(
                    status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
                ).select_related('client')
            
            # Obter técnicos disponíveis se não fornecidos
            if technicians is None:
                technicians = TechnicianProfile.objects.filter(is_available=True)
            
            if not jobs.exists() or not technicians.exists():
                return {
                    'success': False,
                    'message': 'Não há trabalhos ou técnicos disponíveis para otimização'
                }
            
            # Calcular prioridades e estimativas
            optimized_jobs = []
            
            for job in jobs:
                # Calcular score de prioridade
                priority_score = self._calculate_priority_score(job)
                
                # Predizer tempo de produção
                job_features = self._extract_job_features(job)
                time_prediction = self.time_predictor.predict_time(job_features)
                
                # Encontrar melhor técnico
                best_technician = self._find_best_technician(job, technicians)
                
                optimized_jobs.append({
                    'job': job,
                    'priority_score': priority_score,
                    'estimated_time': time_prediction,
                    'best_technician': best_technician,
                    'bottleneck_risk': self._calculate_bottleneck_risk(job, time_prediction)
                })
            
            # Ordenar por prioridade
            optimized_jobs.sort(key=lambda x: x['priority_score'], reverse=True)
            
            # Salvar cronogramas otimizados
            self._save_optimized_schedules(optimized_jobs)
            
            return {
                'success': True,
                'optimized_jobs': len(optimized_jobs),
                'message': f'Cronograma otimizado para {len(optimized_jobs)} trabalhos'
            }
            
        except Exception as e:
            logger.error(f"Erro na otimização: {e}")
            return {
                'success': False,
                'message': f'Erro na otimização: {str(e)}'
            }
    
    def _calculate_priority_score(self, job):
        """Calcula score de prioridade do trabalho"""
        score = 0
        
        # Urgência baseada no prazo
        days_until_due = (job.due_date - timezone.now().date()).days
        if days_until_due <= 1:
            score += 100  # Muito urgente
        elif days_until_due <= 3:
            score += 50   # Urgente
        elif days_until_due <= 7:
            score += 20   # Moderado
        
        # Valor do trabalho (se disponível)
        if job.total_price:
            score += min(50, float(job.total_price) / 100)
        
        # Histórico do cliente
        client_jobs = Job.objects.filter(client=job.client).count()
        if client_jobs > 10:
            score += 10  # Cliente frequente
        
        # Complexidade (trabalhos mais simples têm prioridade)
        complexity = self._estimate_job_complexity(job)
        score += (5 - complexity) * 5
        
        return round(score, 2)
    
    def _extract_job_features(self, job):
        """Extrai features do trabalho para predição"""
        return {
            'prosthesis_type': job.prosthesis_type or 'unknown',
            'material': job.material or 'unknown',
            'complexity_level': self._estimate_job_complexity(job),
            'technician_skill_level': 2,  # Será ajustado pelo técnico escolhido
            'technician_efficiency': 1.0,  # Será ajustado pelo técnico escolhido
            'client_history_avg_time': self._get_client_avg_time(job.client),
            'entry_date': job.entry_date or timezone.now().date()
        }
    
    def _estimate_job_complexity(self, job):
        """Estima complexidade do trabalho"""
        complexity = 2  # Padrão
        
        prosthesis_type = (job.prosthesis_type or '').lower()
        
        if any(t in prosthesis_type for t in ['implante', 'protocolo']):
            complexity = 4
        elif any(t in prosthesis_type for t in ['coroa', 'faceta']):
            complexity = 1
        
        # Ajustar por instruções
        if job.instructions and len(job.instructions) > 100:
            complexity = min(4, complexity + 1)
        
        return complexity
    
    def _get_client_avg_time(self, client):
        """Obtém tempo médio histórico do cliente"""
        completed_jobs = Job.objects.filter(
            client=client,
            status__in=[Job.JobStatus.COMPLETED, Job.JobStatus.DELIVERED],
            completion_date__isnull=False,
            entry_date__isnull=False
        )
        
        if completed_jobs.exists():
            total_time = sum([
                (job.completion_date - job.entry_date).days * 8 
                for job in completed_jobs
            ])
            return total_time / completed_jobs.count()
        
        return 32  # Padrão de 4 dias
    
    def _find_best_technician(self, job, technicians):
        """Encontra o melhor técnico para o trabalho"""
        best_technician = None
        best_score = -1
        
        job_type = (job.prosthesis_type or '').lower()
        
        for technician in technicians:
            score = 0
            
            # Verificar especialidades
            if job_type in [s.lower() for s in technician.specialties]:
                score += 50
            
            # Nível de habilidade
            score += technician.skill_level * 10
            
            # Eficiência
            score += technician.efficiency_rating * 20
            
            # Carga de trabalho atual (menor é melhor)
            current_workload = technician.scheduled_jobs.filter(
                job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
            ).count()
            score -= current_workload * 5
            
            if score > best_score:
                best_score = score
                best_technician = technician
        
        return best_technician
    
    def _calculate_bottleneck_risk(self, job, time_prediction):
        """Calcula risco de gargalo"""
        risk = 0.0
        
        if time_prediction:
            estimated_hours = time_prediction.get('estimated_hours', 0)
            
            # Trabalhos longos têm maior risco
            if estimated_hours > 40:
                risk += 0.3
            elif estimated_hours > 20:
                risk += 0.1
            
            # Prazo apertado aumenta risco
            days_until_due = (job.due_date - timezone.now().date()).days
            if days_until_due <= 2:
                risk += 0.4
            elif days_until_due <= 5:
                risk += 0.2
        
        return min(1.0, risk)
    
    def _save_optimized_schedules(self, optimized_jobs):
        """Salva cronogramas otimizados"""
        from .models import ProductionSchedule
        
        for item in optimized_jobs:
            job = item['job']
            
            # Calcular datas estimadas
            estimated_hours = 0
            if item['estimated_time']:
                estimated_hours = item['estimated_time'].get('estimated_hours', 0)
            
            estimated_start = timezone.now()
            estimated_completion = estimated_start + timedelta(hours=estimated_hours)
            
            # Criar ou atualizar cronograma
            schedule, created = ProductionSchedule.objects.get_or_create(
                job=job,
                defaults={
                    'assigned_technician': item['best_technician'],
                    'estimated_start_date': estimated_start,
                    'estimated_completion_date': estimated_completion,
                    'estimated_duration_hours': estimated_hours,
                    'priority_score': item['priority_score'],
                    'bottleneck_risk': item['bottleneck_risk'],
                    'optimization_notes': f"Otimizado automaticamente em {timezone.now()}"
                }
            )
            
            if not created:
                schedule.assigned_technician = item['best_technician']
                schedule.estimated_start_date = estimated_start
                schedule.estimated_completion_date = estimated_completion
                schedule.estimated_duration_hours = estimated_hours
                schedule.priority_score = item['priority_score']
                schedule.bottleneck_risk = item['bottleneck_risk']
                schedule.optimization_notes = f"Re-otimizado em {timezone.now()}"
                schedule.save()
    
    def identify_bottlenecks(self, current_schedule=None):
        """Identifica gargalos no cronograma atual"""
        from .models import ProductionSchedule, BottleneckAlert
        
        try:
            if current_schedule is None:
                current_schedule = ProductionSchedule.objects.filter(
                    job__status__in=[Job.JobStatus.RECEIVED, Job.JobStatus.IN_PRODUCTION]
                )
            
            bottlenecks = []
            
            # Verificar sobrecarga de técnicos
            technicians = TechnicianProfile.objects.filter(is_available=True)
            
            for technician in technicians:
                workload = current_schedule.filter(assigned_technician=technician)
                total_hours = sum([s.estimated_duration_hours or 0 for s in workload])
                
                # Assumindo 40h/semana de capacidade
                if total_hours > technician.average_work_time * 5:
                    bottlenecks.append({
                        'type': BottleneckAlert.AlertType.TECHNICIAN_OVERLOAD,
                        'severity': BottleneckAlert.AlertSeverity.HIGH,
                        'title': f'Sobrecarga do técnico {technician.user.get_full_name()}',
                        'description': f'Técnico com {total_hours:.1f}h de trabalho agendado',
                        'technician': technician,
                        'affected_jobs': [s.job for s in workload]
                    })
            
            # Verificar riscos de prazo
            high_risk_jobs = current_schedule.filter(bottleneck_risk__gte=0.7)
            
            if high_risk_jobs.exists():
                bottlenecks.append({
                    'type': BottleneckAlert.AlertType.DEADLINE_RISK,
                    'severity': BottleneckAlert.AlertSeverity.CRITICAL,
                    'title': f'{high_risk_jobs.count()} trabalhos com alto risco de atraso',
                    'description': 'Trabalhos com alta probabilidade de não cumprir prazo',
                    'affected_jobs': [s.job for s in high_risk_jobs]
                })
            
            # Salvar alertas
            for bottleneck in bottlenecks:
                alert = BottleneckAlert.objects.create(
                    alert_type=bottleneck['type'],
                    severity=bottleneck['severity'],
                    title=bottleneck['title'],
                    description=bottleneck['description'],
                    affected_technician=bottleneck.get('technician'),
                    suggested_actions=self._generate_suggested_actions(bottleneck)
                )
                
                # Associar trabalhos afetados
                if 'affected_jobs' in bottleneck:
                    alert.affected_jobs.set(bottleneck['affected_jobs'])
            
            return {
                'success': True,
                'bottlenecks_found': len(bottlenecks),
                'message': f'Identificados {len(bottlenecks)} gargalos'
            }
            
        except Exception as e:
            logger.error(f"Erro na identificação de gargalos: {e}")
            return {
                'success': False,
                'message': f'Erro: {str(e)}'
            }
    
    def _generate_suggested_actions(self, bottleneck):
        """Gera ações sugeridas para resolver gargalo"""
        actions = []
        
        if bottleneck['type'] == BottleneckAlert.AlertType.TECHNICIAN_OVERLOAD:
            actions = [
                'Redistribuir trabalhos para outros técnicos',
                'Considerar horas extras ou trabalho em fins de semana',
                'Priorizar trabalhos mais urgentes',
                'Terceirizar alguns trabalhos se possível'
            ]
        
        elif bottleneck['type'] == BottleneckAlert.AlertType.DEADLINE_RISK:
            actions = [
                'Renegociar prazos com clientes',
                'Acelerar produção dos trabalhos críticos',
                'Alocar técnicos mais experientes',
                'Simplificar processos quando possível'
            ]
        
        return actions

