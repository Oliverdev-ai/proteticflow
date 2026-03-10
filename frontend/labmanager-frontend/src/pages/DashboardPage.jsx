import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { BarChart3Icon, ArrowRightIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    financialSummary: {
      totalReceivables: 0,
      totalPayables: 0,
      overdueReceivables: 0,
      overduePayables: 0,
      cashFlow: 0
    },
    jobsSummary: {
      totalActive: 0,
      totalCompleted: 0,
      totalPending: 0,
      totalDelayed: 0
    },
    clientsSummary: {
      totalClients: 0,
      activeClients: 0,
      newClientsThisMonth: 0
    },
    inventorySummary: {
      totalItems: 0,
      lowStockItems: 0,
      totalValue: 0
    },
    employeesSummary: {
      totalEmployees: 0,
      totalCommissions: 0,
      pendingAssignments: 0
    },
    recentJobs: [],
    upcomingDeliveries: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/dashboard/summary/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={() => fetchDashboardData()} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg">Carregando dashboard...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financial Summary Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-700 flex items-center">
                  <BarChart3Icon className="h-5 w-5 mr-2" />
                  Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">A Receber:</span>
                    <span className="font-semibold text-blue-700">
                      R$ {dashboardData.financialSummary.totalReceivables.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">A Pagar:</span>
                    <span className="font-semibold text-red-600">
                      R$ {dashboardData.financialSummary.totalPayables.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Em Atraso:</span>
                    <span className="font-semibold text-orange-500">
                      R$ {dashboardData.financialSummary.overdueReceivables.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-blue-200 my-2 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Saldo:</span>
                      <span className={`font-bold ${dashboardData.financialSummary.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {dashboardData.financialSummary.cashFlow.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-blue-700"
                  onClick={() => navigate('/financial-reports')}
                >
                  Ver Relatórios Financeiros
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Jobs Summary Card */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-700 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Trabalhos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ativos:</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData.jobsSummary.totalActive}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Concluídos:</span>
                    <span className="font-semibold text-green-600">
                      {dashboardData.jobsSummary.totalCompleted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pendentes:</span>
                    <span className="font-semibold text-orange-500">
                      {dashboardData.jobsSummary.totalPending}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Atrasados:</span>
                    <span className="font-semibold text-red-600">
                      {dashboardData.jobsSummary.totalDelayed}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-green-700"
                  onClick={() => navigate('/jobs')}
                >
                  Gerenciar Trabalhos
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Inventory Summary Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-700 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Itens:</span>
                    <span className="font-semibold text-purple-700">
                      {dashboardData.inventorySummary.totalItems}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estoque Baixo:</span>
                    <span className="font-semibold text-orange-500">
                      {dashboardData.inventorySummary.lowStockItems}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="font-semibold text-purple-700">
                      R$ {dashboardData.inventorySummary.totalValue.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-purple-700"
                  onClick={() => navigate('/materials')}
                >
                  Gerenciar Estoque
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Trabalhos Recentes</CardTitle>
                <CardDescription>
                  Últimos trabalhos cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.recentJobs.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentJobs.map((job) => (
                      <div key={job.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium">{job.order_number}</h4>
                          <p className="text-sm text-gray-500">{job.client_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{new Date(job.created_at).toLocaleDateString()}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'delayed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {job.status === 'completed' ? 'Concluído' :
                             job.status === 'in_progress' ? 'Em Andamento' :
                             job.status === 'delayed' ? 'Atrasado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Nenhum trabalho recente encontrado
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/jobs')}
                >
                  Ver Todos os Trabalhos
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Próximas Entregas</CardTitle>
                <CardDescription>
                  Entregas programadas para os próximos dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.upcomingDeliveries.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.upcomingDeliveries.map((delivery) => (
                      <div key={delivery.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-medium">{delivery.route_name}</h4>
                          <p className="text-sm text-gray-500">{delivery.jobs_count} trabalhos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{new Date(delivery.date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{delivery.driver_name || 'Motorista não definido'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    Nenhuma entrega programada
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/delivery-schedule')}
                >
                  Ver Roteiro de Entregas
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employees Summary */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-700 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Funcionários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-amber-700">
                      {dashboardData.employeesSummary.totalEmployees}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comissões Pendentes:</span>
                    <span className="font-semibold text-green-600">
                      R$ {dashboardData.employeesSummary.totalCommissions.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tarefas Pendentes:</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData.employeesSummary.pendingAssignments}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-amber-700"
                  onClick={() => navigate('/employees')}
                >
                  Gerenciar Funcionários
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Clients Summary */}
            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-cyan-700 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Clientes:</span>
                    <span className="font-semibold text-cyan-700">
                      {dashboardData.clientsSummary.totalClients}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Clientes Ativos:</span>
                    <span className="font-semibold text-green-600">
                      {dashboardData.clientsSummary.activeClients}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novos este mês:</span>
                    <span className="font-semibold text-blue-600">
                      {dashboardData.clientsSummary.newClientsThisMonth}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-cyan-700"
                  onClick={() => navigate('/clients')}
                >
                  Gerenciar Clientes
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="production">Produção</TabsTrigger>
              <TabsTrigger value="inventory">Estoque</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
            </TabsList>
            <TabsContent value="financial" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/financial-reports')}
                >
                  <span className="text-lg font-medium">Relatórios Financeiros</span>
                  <span className="text-sm text-gray-500">Contas a receber, a pagar e fechamentos</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/payers-report')}
                >
                  <span className="text-lg font-medium">Relatório de Pagadores</span>
                  <span className="text-sm text-gray-500">Análise de clientes que efetuaram pagamentos</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/financial-closing')}
                >
                  <span className="text-lg font-medium">Fechamento Financeiro</span>
                  <span className="text-sm text-gray-500">Mensal, anual ou por trabalho</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/accounts-receivable')}
                >
                  <span className="text-lg font-medium">Contas a Receber</span>
                  <span className="text-sm text-gray-500">Gerenciamento de faturas e recebimentos</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="production" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/jobs')}
                >
                  <span className="text-lg font-medium">Trabalhos</span>
                  <span className="text-sm text-gray-500">Gerenciamento de trabalhos e pedidos</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/delivery-schedule')}
                >
                  <span className="text-lg font-medium">Roteiro de Entregas</span>
                  <span className="text-sm text-gray-500">Programação e impressão de roteiros</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/employees')}
                >
                  <span className="text-lg font-medium">Funcionários</span>
                  <span className="text-sm text-gray-500">Cadastro e comissões</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/production-report')}
                >
                  <span className="text-lg font-medium">Relatório de Produção</span>
                  <span className="text-sm text-gray-500">Análise de produtividade por funcionário</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="inventory" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/materials')}
                >
                  <span className="text-lg font-medium">Materiais</span>
                  <span className="text-sm text-gray-500">Cadastro e controle de estoque</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/suppliers')}
                >
                  <span className="text-lg font-medium">Fornecedores</span>
                  <span className="text-sm text-gray-500">Cadastro e histórico de compras</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/purchase-orders')}
                >
                  <span className="text-lg font-medium">Pedidos de Compra</span>
                  <span className="text-sm text-gray-500">Gerenciamento de compras</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/stock-movements')}
                >
                  <span className="text-lg font-medium">Movimentações</span>
                  <span className="text-sm text-gray-500">Entradas e saídas de estoque</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="clients" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/clients')}
                >
                  <span className="text-lg font-medium">Clientes</span>
                  <span className="text-sm text-gray-500">Cadastro e gerenciamento</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/price-tables')}
                >
                  <span className="text-lg font-medium">Tabelas de Preço</span>
                  <span className="text-sm text-gray-500">Gerenciamento de preços e ajustes</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/debtors-report')}
                >
                  <span className="text-lg font-medium">Relatório de Devedores</span>
                  <span className="text-sm text-gray-500">Análise de clientes com pendências</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center"
                  onClick={() => navigate('/client-history')}
                >
                  <span className="text-lg font-medium">Histórico de Clientes</span>
                  <span className="text-sm text-gray-500">Trabalhos e pagamentos por cliente</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
