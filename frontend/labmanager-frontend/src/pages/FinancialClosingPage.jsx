import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, PrinterIcon, FileTextIcon, DownloadIcon, BarChart3Icon, PieChartIcon, LineChartIcon, DollarSignIcon, UsersIcon, ClipboardListIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

// Importar Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Registrar componentes Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function FinancialClosingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('monthly');
  const [closings, setClosings] = useState([]);
  const [filteredClosings, setFilteredClosings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [receivablesSummary, setReceivablesSummary] = useState({
    total_pending: 0,
    total_paid: 0,
    overdue_count: 0,
    total_count: 0
  });

  // Dados para gráficos
  const [chartData, setChartData] = useState({
    monthly: {
      labels: [],
      datasets: []
    },
    clientDistribution: {
      labels: [],
      datasets: []
    },
    statusDistribution: {
      labels: [],
      datasets: []
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monthly') {
      setSelectedPeriod({
        start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
        end: endOfMonth(new Date(selectedYear, selectedMonth - 1))
      });
    } else if (activeTab === 'annual') {
      setSelectedPeriod({
        start: startOfYear(new Date(selectedYear, 0)),
        end: endOfYear(new Date(selectedYear, 0))
      });
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Buscar fechamentos financeiros
      const closingsResponse = await axios.get(`${API_URL}/api/financial/financial-closings/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Buscar contas a receber
      const receivablesResponse = await axios.get(`${API_URL}/api/financial/accounts-receivable/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Buscar resumo de contas a receber
      const summaryResponse = await axios.get(`${API_URL}/api/financial/accounts-receivable/summary/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Buscar contas a receber agrupadas por cliente
      const byClientResponse = await axios.get(`${API_URL}/api/financial/accounts-receivable/by_client/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClosings(closingsResponse.data.results || closingsResponse.data);
      setFilteredClosings(closingsResponse.data.results || closingsResponse.data);
      setReceivables(receivablesResponse.data.results || receivablesResponse.data);
      setReceivablesSummary(summaryResponse.data);
      
      // Preparar dados para gráficos
      prepareChartData(receivablesResponse.data.results || receivablesResponse.data, byClientResponse.data);
      
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartData = (receivablesData, clientsData) => {
    // Dados para gráfico mensal
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM', { locale: ptBR }),
        date: date
      };
    }).reverse();
    
    const monthlyRevenue = last6Months.map(month => {
      const monthReceivables = receivablesData.filter(r => 
        new Date(r.created_at).getMonth() === month.date.getMonth() && 
        new Date(r.created_at).getFullYear() === month.date.getFullYear() &&
        r.status === 'paid'
      );
      
      return {
        month: month.month,
        revenue: monthlyRevenue.reduce((sum, r) => sum + parseFloat(r.adjusted_amount), 0)
      };
    });
    
    // Dados para distribuição por cliente
    const topClients = clientsData
      .sort((a, b) => b.total_paid - a.total_paid)
      .slice(0, 5);
    
    // Dados para distribuição por status
    const statusCounts = {
      pending: receivablesData.filter(r => r.status === 'pending').length,
      paid: receivablesData.filter(r => r.status === 'paid').length,
      overdue: receivablesData.filter(r => r.status === 'overdue').length,
      cancelled: receivablesData.filter(r => r.status === 'cancelled').length
    };
    
    setChartData({
      monthly: {
        labels: monthlyRevenue.map(item => item.month),
        datasets: [
          {
            label: 'Receita Mensal',
            data: monthlyRevenue.map(item => item.revenue),
            backgroundColor: 'rgba(37, 99, 235, 0.5)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 1
          }
        ]
      },
      clientDistribution: {
        labels: topClients.map(client => client.client_name),
        datasets: [
          {
            label: 'Receita por Cliente',
            data: topClients.map(client => client.total_paid),
            backgroundColor: [
              'rgba(37, 99, 235, 0.7)',
              'rgba(59, 130, 246, 0.7)',
              'rgba(96, 165, 250, 0.7)',
              'rgba(147, 197, 253, 0.7)',
              'rgba(191, 219, 254, 0.7)'
            ],
            borderColor: [
              'rgba(37, 99, 235, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(96, 165, 250, 1)',
              'rgba(147, 197, 253, 1)',
              'rgba(191, 219, 254, 1)'
            ],
            borderWidth: 1
          }
        ]
      },
      statusDistribution: {
        labels: ['Pendente', 'Pago', 'Atrasado', 'Cancelado'],
        datasets: [
          {
            label: 'Status de Pagamentos',
            data: [statusCounts.pending, statusCounts.paid, statusCounts.overdue, statusCounts.cancelled],
            backgroundColor: [
              'rgba(234, 179, 8, 0.7)',
              'rgba(34, 197, 94, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(107, 114, 128, 0.7)'
            ],
            borderColor: [
              'rgba(234, 179, 8, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(107, 114, 128, 1)'
            ],
            borderWidth: 1
          }
        ]
      }
    });
  };

  const handleGenerateClosing = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      let data = {};
      
      if (activeTab === 'monthly') {
        endpoint = `${API_URL}/api/financial/financial-closings/generate_monthly/`;
        data = {
          year: selectedYear,
          month: selectedMonth
        };
      } else if (activeTab === 'annual') {
        endpoint = `${API_URL}/api/financial/financial-closings/generate_annual/`;
        data = {
          year: selectedYear
        };
      } else if (activeTab === 'by_job') {
        endpoint = `${API_URL}/api/financial/financial-closings/generate_by_job/`;
        data = {
          start_date: format(selectedPeriod.start, 'yyyy-MM-dd'),
          end_date: format(selectedPeriod.end, 'yyyy-MM-dd')
        };
      }
      
      const response = await axios.post(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "Sucesso",
        description: "Fechamento financeiro gerado com sucesso",
      });
      
      // Atualizar lista de fechamentos
      fetchData();
      
    } catch (error) {
      console.error('Erro ao gerar fechamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o fechamento financeiro",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintClosing = async (closing) => {
    try {
      setPrintLoading(true);
      setSelectedClosing(closing);
      setPrintDialogOpen(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/financial/financial-closings/${closing.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPrintData(response.data);
    } catch (error) {
      console.error('Erro ao gerar impressão do fechamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a impressão do fechamento",
        variant: "destructive"
      });
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    try {
      setPrintLoading(true);
      
      // Aqui seria implementada a geração do PDF
      // Por enquanto, simulamos um download
      setTimeout(() => {
        toast({
          title: "PDF Gerado",
          description: "Em um ambiente de produção, o download seria iniciado automaticamente."
        });
        setPrintDialogOpen(false);
        setPrintLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setPrintLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getClosingTypeBadge = (type) => {
    switch (type) {
      case 'monthly':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Mensal</Badge>;
      case 'annual':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Anual</Badge>;
      case 'by_job':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Por Trabalho</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Fechamento Financeiro</h1>
              <p className="text-blue-100 text-lg">Gerencie e acompanhe seus resultados financeiros</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center">
                  <DollarSignIcon className="h-5 w-5 mr-2" />
                  <span>Controle Financeiro</span>
                </div>
                <div className="flex items-center">
                  <BarChart3Icon className="h-5 w-5 mr-2" />
                  <span>Análise de Resultados</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleGenerateClosing}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 text-lg font-semibold shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando...
                </div>
              ) : (
                <>
                  <FileTextIcon className="h-5 w-5 mr-2" />
                  Gerar Fechamento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total a Receber</p>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(receivablesSummary.total_pending)}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    <span className="inline-flex items-center">
                      📊 {receivablesSummary.total_count} lançamentos
                    </span>
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <DollarSignIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Recebido</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(receivablesSummary.total_paid)}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ✅ Pagamentos confirmados
                    </span>
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSignIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagamentos Atrasados</p>
                  <p className="text-3xl font-bold text-red-600">{receivablesSummary.overdue_count}</p>
                  <p className="text-sm text-red-600 mt-1">
                    <span className="inline-flex items-center">
                      ⚠️ Necessitam atenção
                    </span>
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <ClipboardListIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                  <p className="text-3xl font-bold text-purple-600">{receivablesSummary.total_clients || 0}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    <span className="inline-flex items-center">
                      👥 Com movimentação
                    </span>
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <UsersIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-12 space-y-8">
        {/* Charts Section */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">Visão Geral Financeira</CardTitle>
            <CardDescription className="text-gray-600">
              Análise gráfica dos resultados financeiros
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3Icon className="h-5 w-5 mr-2 text-blue-600" />
                  Receita Mensal
                </h3>
                <div className="h-64">
                  <Bar 
                    data={chartData.monthly} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }} 
                  />
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Distribuição por Cliente
                </h3>
                <div className="h-64">
                  <Pie 
                    data={chartData.clientDistribution} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }} 
                  />
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Status de Pagamentos
                </h3>
                <div className="h-64">
                  <Pie 
                    data={chartData.statusDistribution} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fechamento Financeiro Section */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">Fechamento Financeiro</CardTitle>
            <CardDescription className="text-gray-600">
              Gere relatórios de fechamento financeiro por período
            </CardDescription>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
                <TabsTrigger value="annual">Anual</TabsTrigger>
                <TabsTrigger value="by_job">Por Trabalho</TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <TabsContent value="monthly" className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="w-40">
                      <Label>Ano</Label>
                      <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-40">
                      <Label>Mês</Label>
                      <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <SelectItem key={month} value={month.toString()}>
                              {format(new Date(2021, month - 1), 'MMMM', { locale: ptBR })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="annual" className="space-y-4">
                  <div className="w-40">
                    <Label>Ano</Label>
                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="by_job" className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label>Data Inicial</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[240px] justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedPeriod.start ? format(selectedPeriod.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedPeriod.start}
                            onSelect={(date) => setSelectedPeriod(prev => ({ ...prev, start: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label>Data Final</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[240px] justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedPeriod.end ? format(selectedPeriod.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedPeriod.end}
                            onSelect={(date) => setSelectedPeriod(prev => ({ ...prev, end: date }))}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Carregando fechamentos...</span>
              </div>
            ) : filteredClosings.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-4">Tipo</TableHead>
                      <TableHead className="font-semibold text-gray-700">Período</TableHead>
                      <TableHead className="font-semibold text-gray-700">Receita Total</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trabalhos</TableHead>
                      <TableHead className="font-semibold text-gray-700">Clientes</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClosings.map((closing, index) => (
                      <TableRow key={closing.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell>
                          {getClosingTypeBadge(closing.closing_type)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700">
                            {format(new Date(closing.period_start), 'dd/MM/yyyy')} a {format(new Date(closing.period_end), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            {formatCurrency(closing.total_revenue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-600 border-0">
                              {closing.total_jobs} trabalhos
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-600 border-0">
                              {closing.total_clients} clientes
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintClosing(closing)}
                              className="border-green-200 text-green-600 hover:bg-green-50"
                            >
                              <PrinterIcon className="h-4 w-4 mr-1" />
                              Imprimir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <DownloadIcon className="h-4 w-4 mr-1" />
                              Exportar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-12">
                <div className="bg-gray-100 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <FileTextIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum fechamento encontrado</h3>
                <p className="text-gray-500 mb-6">
                  Gere seu primeiro fechamento financeiro clicando no botão acima
                </p>
                <Button 
                  onClick={handleGenerateClosing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileTextIcon className="h-4 w-4 mr-2" />
                  Gerar Fechamento
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="bg-gray-50 border-t px-6 py-4">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total: {filteredClosings.length}</span> fechamento(s)
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-600 border-green-200">
                  ✅ Sistema Atualizado
                </Badge>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Imprimir Fechamento Financeiro</DialogTitle>
            <DialogDescription>
              Visualize e imprima o fechamento financeiro selecionado
            </DialogDescription>
          </DialogHeader>
          
          {printLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Gerando impressão...</span>
            </div>
          ) : printData ? (
            <div className="border rounded-lg p-6 bg-white">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Fechamento Financeiro</h2>
                <p className="text-gray-600">
                  {format(new Date(printData.period_start), 'dd/MM/yyyy')} a {format(new Date(printData.period_end), 'dd/MM/yyyy')}
                </p>
                <Badge className="mt-2">
                  {printData.closing_type === 'monthly' ? 'Mensal' : 
                   printData.closing_type === 'annual' ? 'Anual' : 'Por Trabalho'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Receita Total</p>
                  <p className="font-bold text-xl text-green-600">{formatCurrency(printData.total_revenue)}</p>
                </div>
                <div className="border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Total de Trabalhos</p>
                  <p className="font-bold text-xl">{printData.total_jobs}</p>
                </div>
                <div className="border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Total de Clientes</p>
                  <p className="font-bold text-xl">{printData.total_clients}</p>
                </div>
              </div>
              
              {printData.breakdown_data && printData.breakdown_data.by_client && (
                <>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Detalhamento por Cliente</h3>
                  <div className="overflow-x-auto mb-6">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2">Cliente</th>
                          <th className="text-right p-2">Receita</th>
                          <th className="text-right p-2">Trabalhos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(printData.breakdown_data.by_client).map(([client, data], index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2">{client}</td>
                            <td className="text-right p-2">{formatCurrency(data.revenue)}</td>
                            <td className="text-right p-2">{data.jobs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              <div className="mt-6 pt-4 border-t text-center text-gray-500 text-sm">
                <p>Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p>Este documento é apenas para controle interno do laboratório.</p>
              </div>
            </div>
          ) : (
            <div className="text-center p-6">
              <AlertCircleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p>Não foi possível carregar os dados do fechamento.</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePrintPDF} 
              disabled={!printData || printLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
