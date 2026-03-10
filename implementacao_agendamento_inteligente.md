# Implementação Prática - Agendamento Inteligente
## Exemplo de Código para Próxima Fase

### 1. Modelo de Machine Learning para Estimativa de Tempo

```python
# ai_assistant/ml_models.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

class JobTimePredictor:
    """Prediz tempo de produção baseado em características do trabalho"""
    
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.encoders = {}
        self.is_trained = False
    
    def prepare_features(self, job_data):
        """Prepara features para o modelo"""
        features = {
            'prosthesis_type': job_data.get('prosthesis_type'),
            'material': job_data.get('material', 'ceramic'),
            'complexity': job_data.get('complexity', 'medium'),
            'client_history_avg_time': job_data.get('client_avg_time', 24),
            'technician_experience': job_data.get('tech_experience', 5),
            'rush_order': job_data.get('is_rush', False),
            'modifications_requested': job_data.get('modifications', 0)
        }
        return features
    
    def train(self, historical_jobs):
        """Treina o modelo com dados históricos"""
        df = pd.DataFrame(historical_jobs)
        
        # Encode categorical variables
        categorical_cols = ['prosthesis_type', 'material', 'complexity']
        for col in categorical_cols:
            self.encoders[col] = LabelEncoder()
            df[col] = self.encoders[col].fit_transform(df[col])
        
        X = df.drop(['actual_time_hours'], axis=1)
        y = df['actual_time_hours']
        
        self.model.fit(X, y)
        self.is_trained = True
        
        # Salva o modelo
        joblib.dump(self.model, 'job_time_predictor.pkl')
        joblib.dump(self.encoders, 'encoders.pkl')
    
    def predict_time(self, job_data):
        """Prediz tempo de produção para um trabalho"""
        if not self.is_trained:
            return 24  # Default 24 horas
        
        features = self.prepare_features(job_data)
        
        # Encode categorical features
        for col, encoder in self.encoders.items():
            if col in features:
                features[col] = encoder.transform([features[col]])[0]
        
        # Converte para array
        feature_array = np.array(list(features.values())).reshape(1, -1)
        
        predicted_hours = self.model.predict(feature_array)[0]
        return max(1, predicted_hours)  # Mínimo 1 hora


class ProductionOptimizer:
    """Otimiza sequência de produção"""
    
    def __init__(self):
        self.time_predictor = JobTimePredictor()
    
    def optimize_schedule(self, jobs, technicians, constraints):
        """Otimiza cronograma de produção"""
        optimized_schedule = []
        
        # Calcula prioridades
        for job in jobs:
            job['priority_score'] = self.calculate_priority(job)
            job['estimated_time'] = self.time_predictor.predict_time(job)
        
        # Ordena por prioridade
        jobs_sorted = sorted(jobs, key=lambda x: x['priority_score'], reverse=True)
        
        # Distribui trabalhos entre técnicos
        tech_schedules = {tech['id']: [] for tech in technicians}
        tech_workload = {tech['id']: 0 for tech in technicians}
        
        for job in jobs_sorted:
            # Encontra técnico com menor carga e habilidade adequada
            best_tech = self.find_best_technician(job, technicians, tech_workload)
            
            if best_tech:
                tech_schedules[best_tech['id']].append(job)
                tech_workload[best_tech['id']] += job['estimated_time']
        
        return tech_schedules
    
    def calculate_priority(self, job):
        """Calcula score de prioridade do trabalho"""
        score = 0
        
        # Urgência (prazo)
        days_until_delivery = (job['delivery_date'] - datetime.now().date()).days
        if days_until_delivery <= 1:
            score += 100
        elif days_until_delivery <= 3:
            score += 50
        elif days_until_delivery <= 7:
            score += 20
        
        # Valor do trabalho
        if job.get('value', 0) > 1000:
            score += 30
        elif job.get('value', 0) > 500:
            score += 15
        
        # Cliente VIP
        if job.get('client_vip', False):
            score += 25
        
        # Complexidade (trabalhos simples primeiro para liberar agenda)
        complexity_scores = {'simple': 10, 'medium': 5, 'complex': 0}
        score += complexity_scores.get(job.get('complexity', 'medium'), 5)
        
        return score
    
    def find_best_technician(self, job, technicians, workload):
        """Encontra melhor técnico para o trabalho"""
        best_tech = None
        best_score = -1
        
        for tech in technicians:
            if not tech.get('is_available', True):
                continue
            
            score = 0
            
            # Habilidade específica
            job_type = job.get('prosthesis_type', '')
            if job_type in tech.get('specialties', []):
                score += 50
            
            # Carga de trabalho (prefere menos carregado)
            max_hours = tech.get('max_hours_per_week', 40)
            current_load = workload[tech['id']]
            load_percentage = current_load / max_hours
            
            if load_percentage < 0.7:
                score += 30
            elif load_percentage < 0.9:
                score += 15
            else:
                score -= 20  # Sobrecarregado
            
            # Experiência
            experience = tech.get('experience_years', 1)
            if job.get('complexity') == 'complex' and experience >= 5:
                score += 20
            elif job.get('complexity') == 'simple' and experience >= 2:
                score += 10
            
            if score > best_score:
                best_score = score
                best_tech = tech
        
        return best_tech


# ai_assistant/smart_scheduler.py
class SmartScheduler:
    """Sistema de agendamento inteligente"""
    
    def __init__(self):
        self.optimizer = ProductionOptimizer()
        self.predictor = JobTimePredictor()
    
    def create_weekly_schedule(self, jobs, technicians):
        """Cria cronograma semanal otimizado"""
        # Otimiza distribuição
        schedule = self.optimizer.optimize_schedule(jobs, technicians, {})
        
        # Converte para formato de cronograma
        weekly_schedule = {}
        
        for tech_id, tech_jobs in schedule.items():
            tech = next(t for t in technicians if t['id'] == tech_id)
            daily_schedule = self.distribute_jobs_by_day(tech_jobs, tech)
            weekly_schedule[tech_id] = daily_schedule
        
        return weekly_schedule
    
    def distribute_jobs_by_day(self, jobs, technician):
        """Distribui trabalhos pelos dias da semana"""
        daily_schedule = {}
        max_hours_per_day = technician.get('max_hours_per_day', 8)
        
        current_day = datetime.now().date()
        current_hours = 0
        
        for job in jobs:
            job_hours = job['estimated_time']
            
            # Se não cabe no dia atual, vai para o próximo
            if current_hours + job_hours > max_hours_per_day:
                current_day += timedelta(days=1)
                current_hours = 0
                
                # Pula fins de semana
                while current_day.weekday() >= 5:
                    current_day += timedelta(days=1)
            
            if current_day not in daily_schedule:
                daily_schedule[current_day] = []
            
            daily_schedule[current_day].append({
                'job': job,
                'start_time': f"{8 + int(current_hours)}:{int((current_hours % 1) * 60):02d}",
                'estimated_duration': job_hours
            })
            
            current_hours += job_hours
        
        return daily_schedule
    
    def suggest_optimizations(self, current_schedule):
        """Sugere otimizações no cronograma"""
        suggestions = []
        
        # Analisa gargalos
        bottlenecks = self.identify_bottlenecks(current_schedule)
        for bottleneck in bottlenecks:
            suggestions.append({
                'type': 'bottleneck',
                'message': f"Gargalo identificado: {bottleneck['technician']} está sobrecarregado",
                'action': 'redistribute_jobs',
                'priority': 'high'
            })
        
        # Analisa ociosidade
        idle_periods = self.identify_idle_periods(current_schedule)
        for idle in idle_periods:
            suggestions.append({
                'type': 'optimization',
                'message': f"Período ocioso: {idle['technician']} tem {idle['hours']}h livres",
                'action': 'add_jobs',
                'priority': 'medium'
            })
        
        return suggestions
```

### 2. Comandos Avançados para a Flow

```python
# ai_assistant/advanced_commands.py
class AdvancedCommandProcessor(CommandProcessor):
    """Processador de comandos avançados com IA"""
    
    def __init__(self, user):
        super().__init__(user)
        self.scheduler = SmartScheduler()
        self.predictor = JobTimePredictor()
        
        # Adiciona comandos avançados
        self.commands.update({
            'otimizar_agenda': {
                'patterns': [
                    r'otimiz[ae]?\s+(?:a\s+)?agenda',
                    r'reorganiz[ae]?\s+(?:a\s+)?produ[çc][ãa]o',
                    r'melhor?\s+cronograma'
                ],
                'method': 'optimize_schedule',
                'admin_only': False
            },
            'prever_tempo_trabalho': {
                'patterns': [
                    r'quanto\s+tempo\s+(?:vai\s+)?levar?\s+(?:o\s+)?trabalho',
                    r'estim[ae]?\s+tempo\s+de\s+produ[çc][ãa]o',
                    r'previs[ãa]o\s+de\s+entrega'
                ],
                'method': 'predict_job_time',
                'admin_only': False
            },
            'sugerir_melhorias': {
                'patterns': [
                    r'suger[ie]?\s+melhorias?',
                    r'como\s+melhorar?\s+(?:a\s+)?produ[çc][ãa]o',
                    r'otimiza[çc][õo]es?\s+poss[íi]veis?'
                ],
                'method': 'suggest_improvements',
                'admin_only': True
            },
            'analisar_gargalos': {
                'patterns': [
                    r'analis[ae]?\s+gargalos?',
                    r'onde\s+(?:est[áa]\s+)?(?:o\s+)?problema',
                    r'identific[ae]?\s+(?:os\s+)?gargalos?'
                ],
                'method': 'analyze_bottlenecks',
                'admin_only': True
            }
        })
    
    def optimize_schedule(self):
        """Otimiza cronograma de produção"""
        try:
            # Busca trabalhos pendentes
            pending_jobs = Job.objects.filter(status='pending')
            
            # Busca técnicos ativos
            technicians = Employee.objects.filter(
                is_active=True,
                employee_type='technician'
            )
            
            if not pending_jobs.exists():
                return {
                    'success': True,
                    'message': '✅ Não há trabalhos pendentes para otimizar!'
                }
            
            # Converte para formato do otimizador
            jobs_data = []
            for job in pending_jobs:
                jobs_data.append({
                    'id': job.id,
                    'prosthesis_type': job.prosthesis_type,
                    'delivery_date': job.delivery_date,
                    'complexity': getattr(job, 'complexity', 'medium'),
                    'value': float(job.total_price),
                    'client_vip': getattr(job.client, 'is_vip', False)
                })
            
            techs_data = []
            for tech in technicians:
                techs_data.append({
                    'id': tech.id,
                    'name': tech.full_name,
                    'specialties': getattr(tech, 'specialties', []),
                    'experience_years': getattr(tech, 'experience_years', 3),
                    'max_hours_per_day': 8,
                    'is_available': True
                })
            
            # Otimiza cronograma
            optimized_schedule = self.scheduler.create_weekly_schedule(jobs_data, techs_data)
            
            # Gera resposta
            response = "🎯 **Cronograma Otimizado**\n\n"
            
            for tech_id, daily_schedule in optimized_schedule.items():
                tech = next(t for t in techs_data if t['id'] == tech_id)
                response += f"👨‍🔬 **{tech['name']}:**\n"
                
                for date, jobs in daily_schedule.items():
                    response += f"📅 {date.strftime('%d/%m')} ({len(jobs)} trabalhos)\n"
                    for job_info in jobs[:3]:  # Mostra apenas 3 primeiros
                        response += f"   • {job_info['start_time']} - Trabalho #{job_info['job']['id']}\n"
                    if len(jobs) > 3:
                        response += f"   ... e mais {len(jobs) - 3} trabalhos\n"
                response += "\n"
            
            # Sugestões de otimização
            suggestions = self.scheduler.suggest_optimizations(optimized_schedule)
            if suggestions:
                response += "💡 **Sugestões de Melhoria:**\n"
                for suggestion in suggestions[:3]:
                    response += f"🔹 {suggestion['message']}\n"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'schedule': optimized_schedule,
                    'suggestions': suggestions
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao otimizar cronograma: {str(e)}'
            }
    
    def predict_job_time(self):
        """Prediz tempo de trabalhos pendentes"""
        try:
            pending_jobs = Job.objects.filter(status='pending')[:5]
            
            response = "⏱️ **Previsão de Tempo de Produção**\n\n"
            
            total_hours = 0
            for job in pending_jobs:
                job_data = {
                    'prosthesis_type': job.prosthesis_type,
                    'complexity': getattr(job, 'complexity', 'medium'),
                    'client_avg_time': 24,  # Buscar do histórico
                    'tech_experience': 5,   # Buscar do técnico designado
                    'is_rush': False
                }
                
                estimated_time = self.predictor.predict_time(job_data)
                total_hours += estimated_time
                
                response += f"🔹 **Trabalho #{job.id}** - {job.client.name}\n"
                response += f"   Tipo: {job.prosthesis_type}\n"
                response += f"   Tempo estimado: {estimated_time:.1f} horas\n"
                response += f"   Entrega: {job.delivery_date.strftime('%d/%m/%Y')}\n\n"
            
            response += f"📊 **Total estimado:** {total_hours:.1f} horas ({total_hours/8:.1f} dias úteis)"
            
            return {
                'success': True,
                'message': response,
                'data': {
                    'total_hours': total_hours,
                    'total_days': total_hours / 8
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Erro ao prever tempos: {str(e)}'
            }
```

### 3. Dashboard Preditivo

```python
# ai_assistant/predictive_dashboard.py
class PredictiveDashboard:
    """Dashboard com análises preditivas"""
    
    def __init__(self):
        self.predictor = JobTimePredictor()
    
    def generate_dashboard_data(self):
        """Gera dados para dashboard preditivo"""
        return {
            'production_forecast': self.get_production_forecast(),
            'bottleneck_analysis': self.analyze_production_bottlenecks(),
            'efficiency_metrics': self.calculate_efficiency_metrics(),
            'recommendations': self.get_ai_recommendations()
        }
    
    def get_production_forecast(self):
        """Previsão de produção próximos 30 dias"""
        pending_jobs = Job.objects.filter(status='pending')
        
        forecast = {
            'next_7_days': 0,
            'next_15_days': 0,
            'next_30_days': 0,
            'overdue_risk': []
        }
        
        today = timezone.now().date()
        
        for job in pending_jobs:
            estimated_time = self.predictor.predict_time({
                'prosthesis_type': job.prosthesis_type,
                'complexity': getattr(job, 'complexity', 'medium')
            })
            
            days_until_delivery = (job.delivery_date - today).days
            
            if days_until_delivery <= 7:
                forecast['next_7_days'] += estimated_time
            if days_until_delivery <= 15:
                forecast['next_15_days'] += estimated_time
            if days_until_delivery <= 30:
                forecast['next_30_days'] += estimated_time
            
            # Verifica risco de atraso
            if estimated_time > (days_until_delivery * 8):  # 8h por dia
                forecast['overdue_risk'].append({
                    'job_id': job.id,
                    'client': job.client.name,
                    'risk_level': 'high' if estimated_time > (days_until_delivery * 16) else 'medium'
                })
        
        return forecast
```

Esta implementação mostra como podemos transformar o DentalFlow em um sistema verdadeiramente inteligente, onde a IA não apenas responde comandos, mas ativamente otimiza e prevê aspectos da produção.

