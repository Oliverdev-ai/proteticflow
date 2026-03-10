# DentalFlow - Documentação das Novas Funcionalidades

**Versão:** 2.0  
**Data:** 14 de Junho de 2025  
**Autor:** Manus AI  

## Sumário Executivo

Este documento apresenta a documentação completa das duas principais funcionalidades implementadas no sistema DentalFlow: o **Agente de IA para Comandos Simples** e o **Sistema de Login de Colaborador com Permissões Restritas**. Estas funcionalidades foram desenvolvidas para otimizar a operação de laboratórios de prótese dentária, proporcionando maior eficiência operacional e controle de acesso adequado às diferentes funções dentro da organização.

O sistema DentalFlow, anteriormente conhecido como LabManager, é uma solução completa de gerenciamento para laboratórios de prótese dentária que integra tecnologias modernas como Django (backend), React (frontend) e inteligência artificial para automatizar processos e facilitar a gestão diária das operações laboratoriais.

## Índice

1. [Visão Geral das Funcionalidades](#visão-geral)
2. [Sistema de Permissões de Colaborador](#sistema-permissões)
3. [Agente de IA para Comandos Simples](#agente-ia)
4. [Guia de Implementação Técnica](#implementação-técnica)
5. [Guia do Administrador](#guia-administrador)
6. [Guia do Colaborador](#guia-colaborador)
7. [Exemplos de Uso](#exemplos-uso)
8. [Configuração e Manutenção](#configuração)
9. [Segurança e Boas Práticas](#segurança)
10. [Troubleshooting](#troubleshooting)
11. [Roadmap e Melhorias Futuras](#roadmap)

---


## 1. Visão Geral das Funcionalidades {#visão-geral}

### 1.1 Contexto e Motivação

A evolução tecnológica no setor odontológico tem demandado sistemas de gestão cada vez mais sofisticados e intuitivos. Laboratórios de prótese dentária enfrentam desafios únicos relacionados ao controle de qualidade, gestão de prazos, relacionamento com clientes e controle financeiro. Neste contexto, o DentalFlow foi desenvolvido para atender especificamente às necessidades deste segmento, oferecendo funcionalidades especializadas que vão além dos sistemas de gestão convencionais.

As duas funcionalidades principais implementadas nesta versão respondem a demandas específicas identificadas através de pesquisa de mercado e feedback de usuários beta. O sistema de permissões de colaborador atende à necessidade de delegação segura de tarefas operacionais, enquanto o agente de IA representa um avanço significativo na automação de processos rotineiros e na acessibilidade do sistema.

### 1.2 Arquitetura Tecnológica

O DentalFlow utiliza uma arquitetura moderna baseada em microsserviços, com separação clara entre frontend e backend. O backend é desenvolvido em Django com Django REST Framework, proporcionando uma API robusta e escalável. O frontend utiliza React com componentes modernos, garantindo uma experiência de usuário responsiva e intuitiva.

A integração entre as funcionalidades é realizada através de APIs RESTful bem documentadas, permitindo futuras expansões e integrações com sistemas terceiros. O sistema de autenticação utiliza JSON Web Tokens (JWT) para garantir segurança e escalabilidade, enquanto o middleware de permissões implementa controle de acesso granular baseado em roles.

### 1.3 Benefícios Principais

**Para Administradores:**
- Controle total sobre permissões e acessos
- Delegação segura de tarefas operacionais
- Automação de relatórios e consultas através de IA
- Visibilidade completa das operações do laboratório
- Redução significativa do tempo gasto em tarefas administrativas

**Para Colaboradores:**
- Interface simplificada focada em tarefas essenciais
- Acesso guiado através do assistente de IA
- Redução de erros através de validações automáticas
- Maior produtividade em cadastros e baixas de trabalhos
- Experiência de usuário otimizada para operações rotineiras

**Para o Laboratório:**
- Maior eficiência operacional
- Redução de custos administrativos
- Melhoria na qualidade dos dados
- Controle de acesso aprimorado
- Preparação para crescimento e expansão

---



## 2. Sistema de Permissões de Colaborador

### 2.1 Tipos de Usuário

O DentalFlow agora suporta dois tipos de usuário:

#### **Administrador**
- Acesso completo a todas as funcionalidades
- Pode gerenciar colaboradores
- Acesso a relatórios financeiros
- Pode usar todos os comandos da assistente Flow

#### **Colaborador**
- Acesso limitado às funcionalidades operacionais
- Pode cadastrar clientes e trabalhos
- Pode dar baixa em trabalhos
- Pode visualizar roteiros de entrega
- **NÃO** tem acesso a relatórios financeiros
- **NÃO** pode alterar configurações do sistema
- **NÃO** pode excluir registros
- Acesso limitado à assistente Flow (apenas comandos operacionais)

### 2.2 Implementação Técnica

#### Backend (Django)
```python
# Modelo de usuário customizado
class CustomUser(AbstractUser):
    USER_TYPES = [
        ('admin', 'Administrador'),
        ('collaborator', 'Colaborador'),
    ]
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='admin')
    phone = models.CharField(max_length=20, blank=True, null=True)
```

#### Middleware de Permissões
```python
class PermissionMiddleware:
    """Middleware que verifica permissões baseadas no tipo de usuário"""
    
    RESTRICTED_PATHS = [
        '/api/v1/financial-reports/',
        '/api/v1/payroll/',
        '/admin/',
    ]
```

### 2.3 Endpoints de Autenticação

- `POST /api/v1/auth/login/` - Login de usuário
- `POST /api/v1/auth/register-collaborator/` - Cadastro de colaborador (admin apenas)
- `GET /api/v1/auth/permissions/` - Verificação de permissões do usuário

## 3. Assistente de IA "Flow"

### 3.1 Visão Geral

A assistente **Flow** é um sistema de processamento de linguagem natural que permite aos usuários executar ações no DentalFlow através de comandos em português.

### 3.2 Comandos Disponíveis

#### **Comandos Financeiros (Apenas Administradores)**

| Comando | Exemplos | Descrição |
|---------|----------|-----------|
| **Relatório de Contas a Receber** | "gerar relatório de contas a receber"<br>"relatório financeiro"<br>"contas a receber" | Gera relatório detalhado de valores pendentes por cliente |
| **Fechamento Mensal** | "fazer fechamento mensal"<br>"fechamento do mês"<br>"gerar fechamento mensal" | Calcula receitas, despesas e lucro do mês atual |
| **Balanço Anual** | "gerar balanço anual"<br>"balanço do ano"<br>"relatório anual" | Gera balanço completo do ano com dados trimestrais |
| **Folha de Pagamento** | "gerar folha de pagamento"<br>"folha salarial"<br>"calcular salários" | Exibe informações da folha de pagamento atual |

#### **Comandos Operacionais (Administradores e Colaboradores)**

| Comando | Exemplos | Descrição |
|---------|----------|-----------|
| **Trabalhos Pendentes** | "mostrar trabalhos pendentes"<br>"listar trabalhos pendentes"<br>"trabalhos em andamento" | Lista todos os trabalhos com status pendente |
| **Entregas de Hoje** | "listar entregas para hoje"<br>"entregas de hoje"<br>"entregas do dia" | Mostra trabalhos programados para entrega hoje |
| **Cadastrar Cliente** | "cadastrar novo cliente"<br>"criar cliente"<br>"adicionar cliente" | Fornece orientações para cadastro de cliente |
| **Cadastrar Trabalho** | "cadastrar novo trabalho"<br>"criar trabalho"<br>"adicionar trabalho" | Fornece orientações para cadastro de trabalho |
| **Finalizar Trabalho** | "dar baixa em trabalho"<br>"finalizar trabalho"<br>"concluir trabalho" | Fornece orientações para conclusão de trabalho |
| **Listar Clientes** | "listar clientes"<br>"mostrar clientes"<br>"ver clientes" | Lista todos os clientes cadastrados |
| **Buscar Cliente** | "buscar cliente João"<br>"procurar cliente Silva"<br>"encontrar cliente Maria" | Busca cliente por nome ou telefone |

### 3.3 Exemplos de Uso

#### Exemplo 1: Fechamento Mensal
```
Usuário: "fazer fechamento mensal"

Flow: 📊 **Fechamento Mensal - 06/2025**

**Receita Total:** R$ 15.450,00
**Despesas:**
🔹 Folha de Pagamento: R$ 8.200,00
🔹 Operacionais (est.): R$ 4.635,00
🔹 **Total Despesas:** R$ 12.835,00

**Lucro Líquido:** R$ 2.615,00
**Margem de Lucro:** 16.9%

**Trabalhos:**
🔹 Total: 23
🔹 Concluídos: 18
🔹 Pendentes: 5
```

#### Exemplo 2: Trabalhos Pendentes
```
Usuário: "mostrar trabalhos pendentes"

Flow: ✅ **Trabalhos Pendentes**

**Total:** 5 trabalhos

🔹 **#123** - Dr. João Silva
   Prótese total superior - Entrega: 15/06/2025

🔹 **#124** - Dra. Maria Santos
   Coroa em porcelana dente 11 - Entrega: 16/06/2025

🔹 **#125** - Clínica Odonto+
   PPR inferior com grampos - Entrega: 18/06/2025
```

### 3.4 Implementação Técnica

#### Processador de Comandos
```python
class CommandProcessor:
    """Processador de comandos em linguagem natural para o assistente de IA Flow"""
    
    def __init__(self, user):
        self.user = user
        self.commands = {
            'gerar_relatorio_contas_receber': {
                'patterns': [
                    r'gerar?\s+relat[óo]rio\s+de\s+contas?\s+a\s+receber',
                    r'relat[óo]rio\s+financeiro',
                    r'contas?\s+a\s+receber'
                ],
                'method': 'generate_accounts_receivable_report',
                'admin_only': True
            },
            # ... outros comandos
        }
```

#### Endpoints da API
- `POST /api/v1/ai-assistant/process-command/` - Processa comando em linguagem natural
- `GET /api/v1/ai-assistant/available-commands/` - Lista comandos disponíveis para o usuário
- `GET /api/v1/ai-assistant/chat-history/` - Histórico de conversas

## 4. Sistema de Folha de Pagamento

### 4.1 Modelos de Dados

#### **Employee (Funcionário)**
```python
class Employee(models.Model):
    EMPLOYEE_TYPES = [
        ('technician', 'Técnico em Prótese'),
        ('assistant', 'Auxiliar'),
        ('administrative', 'Administrativo'),
        ('manager', 'Gerente'),
    ]
    
    CONTRACT_TYPES = [
        ('clt', 'CLT'),
        ('freelancer', 'Freelancer'),
        ('intern', 'Estagiário'),
    ]
    
    full_name = models.CharField(max_length=200)
    employee_type = models.CharField(max_length=20, choices=EMPLOYEE_TYPES)
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPES)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    hire_date = models.DateField()
    is_active = models.BooleanField(default=True)
```

#### **PayrollPeriod (Período de Folha)**
```python
class PayrollPeriod(models.Model):
    year = models.IntegerField()
    month = models.IntegerField()
    reference_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    total_gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
```

#### **PayrollEntry (Entrada de Folha)**
```python
class PayrollEntry(models.Model):
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
```

### 4.2 Funcionalidades

#### **Gestão de Funcionários**
- Cadastro completo de funcionários
- Diferentes tipos de contrato (CLT, Freelancer, Estagiário)
- Controle de funcionários ativos/inativos
- Dados bancários para pagamento

#### **Períodos de Folha**
- Criação de períodos mensais
- Geração automática de entradas para funcionários ativos
- Cálculo automático de salários brutos e líquidos
- Fechamento de períodos

#### **Relatórios Financeiros**
- Fechamentos mensais automáticos
- Balanços anuais com dados trimestrais
- Integração com dados de trabalhos e receitas
- Cálculo de margens de lucro

### 4.3 Endpoints da API

#### **Funcionários**
- `GET /api/v1/payroll/employees/` - Lista funcionários
- `POST /api/v1/payroll/employees/` - Cadastra funcionário
- `GET /api/v1/payroll/employees/{id}/` - Detalhes do funcionário
- `PUT /api/v1/payroll/employees/{id}/` - Atualiza funcionário

#### **Folha de Pagamento**
- `GET /api/v1/payroll/payroll-periods/` - Lista períodos
- `POST /api/v1/payroll/payroll-periods/` - Cria período
- `POST /api/v1/payroll/payroll-periods/{id}/generate-entries/` - Gera entradas
- `POST /api/v1/payroll/payroll-periods/{id}/close/` - Fecha período

#### **Relatórios**
- `POST /api/v1/payroll/generate-monthly-closing/` - Gera fechamento mensal
- `POST /api/v1/payroll/generate-annual-balance/` - Gera balanço anual
- `GET /api/v1/payroll/financial-reports/` - Lista relatórios

## 5. Componentes Frontend

### 5.1 Contexto de Autenticação
```jsx
// AuthContext.jsx - Gerencia autenticação e permissões
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    
    const hasPermission = (permission) => {
        return user?.user_type === 'admin' || permissions[permission];
    };
    
    // ... resto da implementação
};
```

### 5.2 Assistente de IA
```jsx
// AIAssistant.jsx - Componente principal da assistente Flow
const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    
    const sendMessage = async (message) => {
        const response = await aiService.processCommand(message);
        setMessages(prev => [...prev, 
            { type: 'user', content: message },
            { type: 'assistant', content: response.message }
        ]);
    };
    
    // ... resto da implementação
};
```

### 5.3 Gerenciamento de Colaboradores
```jsx
// CollaboratorManagement.jsx - Gestão de colaboradores (admin apenas)
const CollaboratorManagement = () => {
    const [collaborators, setCollaborators] = useState([]);
    const { user, hasPermission } = useAuth();
    
    if (!hasPermission('manage_users')) {
        return <AccessDenied />;
    }
    
    // ... resto da implementação
};
```

## 6. Configuração e Instalação

### 6.1 Dependências Backend
```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### 6.2 Configurações Django
```python
# settings.py
INSTALLED_APPS = [
    # ... apps padrão
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'ai_assistant',
    'payroll',
    # ... outros apps
]

AUTH_USER_MODEL = 'accounts.CustomUser'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'accounts.middleware.PermissionMiddleware',
    # ... outros middlewares
]
```

### 6.3 Migrações
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

## 7. Guia de Uso

### 7.1 Para Administradores

#### **Cadastro de Colaboradores**
1. Acesse **Sistema → Usuários → Colaboradores**
2. Clique em **Novo Colaborador**
3. Preencha os dados obrigatórios:
   - Nome de usuário
   - Email
   - Senha
   - Telefone (opcional)
4. Salve o cadastro

#### **Uso da Assistente Flow**
1. Clique no ícone da assistente (canto inferior direito)
2. Digite comandos em linguagem natural:
   - "gerar fechamento mensal"
   - "mostrar trabalhos pendentes"
   - "listar entregas de hoje"
3. A assistente processará e retornará as informações

#### **Gestão de Folha de Pagamento**
1. Acesse **Sistema → RH → Funcionários**
2. Cadastre funcionários com dados completos
3. Acesse **Sistema → RH → Folha de Pagamento**
4. Crie período mensal
5. Gere entradas automaticamente
6. Revise e feche o período

### 7.2 Para Colaboradores

#### **Funcionalidades Disponíveis**
- Cadastro de clientes e trabalhos
- Visualização de trabalhos pendentes
- Dar baixa em trabalhos concluídos
- Uso limitado da assistente Flow
- Visualização de roteiros de entrega

#### **Restrições**
- Sem acesso a relatórios financeiros
- Sem permissão para excluir registros
- Sem acesso a configurações do sistema
- Comandos financeiros da assistente bloqueados

## 8. Segurança e Permissões

### 8.1 Middleware de Segurança
O sistema implementa um middleware que verifica automaticamente as permissões do usuário antes de permitir acesso a endpoints restritos.

### 8.2 Autenticação JWT
Utiliza JSON Web Tokens para autenticação segura, com tokens de acesso e refresh.

### 8.3 Controle de Acesso
- Verificação de permissões em nível de view
- Middleware de interceptação de requisições
- Controle granular por tipo de usuário

## 9. Próximos Passos

### 9.1 Funcionalidades Futuras
Com base na análise do LabFácil, as próximas implementações prioritárias são:

1. **Sistema de Estoque** - Controle de materiais e insumos
2. **Gestão de Fornecedores** - Cadastro e gestão de fornecedores
3. **Boletos e NFS-E** - Integração fiscal
4. **Contas a Pagar** - Gestão completa de despesas
5. **Sistema de Agenda** - Agendamento de trabalhos
6. **RoteiroBoy** - Otimização de rotas de entrega

### 9.2 Melhorias da Assistente Flow
- Integração com APIs de IA externa (OpenAI, etc.)
- Comandos mais complexos e contextuais
- Aprendizado baseado no histórico do usuário
- Sugestões proativas baseadas em padrões

## 10. Conclusão

O DentalFlow agora possui um sistema robusto e competitivo para gestão de laboratórios de prótese dentária, com:

✅ **Assistente de IA avançada** com comandos em linguagem natural
✅ **Sistema de permissões** com diferentes níveis de acesso
✅ **Folha de pagamento completa** com relatórios financeiros
✅ **Fechamentos mensais e balanços anuais** automatizados
✅ **Interface moderna** e responsiva
✅ **Segurança robusta** com autenticação JWT

O sistema está preparado para competir diretamente com soluções como o LabFácil, oferecendo funcionalidades equivalentes ou superiores em muitos aspectos.

