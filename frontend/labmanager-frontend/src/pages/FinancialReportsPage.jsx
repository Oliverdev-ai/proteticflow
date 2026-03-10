import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  DownloadIcon, 
  PrinterIcon, 
  MailIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  BarChart3Icon
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('receivables');
  const [reportType, setReportType] = useState('detailed');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    receivables: [],
    payables: [],
    debtors: [],
    creditors: []
  });
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    topDebtors: [],
    topCreditors: []
  });

  useEffect(() => {
    fetchReportData();
  }, [activeTab, reportType, dateRange, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Format dates for API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch data based on active tab
      let endpoint = '';
      switch (activeTab) {
        case 'receivables':
          endpoint = `/financial/reports/receivables/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
          break;
        case 'payables':
          endpoint = `/financial/reports/payables/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
          break;
        case 'debtors':
          endpoint = `/financial/reports/debtors/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
          break;
        case 'creditors':
          endpoint = `/financial/reports/creditors/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
          break;
        default:
          endpoint = `/financial/reports/summary/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
      }
      
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update report data based on active tab
      setReportData(prev => ({
        ...prev,
        [activeTab]: response.data.items || response.data
      }));
      
      // Update summary data if available
      if (response.data.summary) {
        setSummaryData(response.data.summary);
      }
      
    } catch (error) {
      console.error(`Erro ao buscar relatório de ${activeTab}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar o relatório de ${getTabTitle(activeTab)}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'receivables': return 'Contas a Receber';
      case 'payables': return 'Contas a Pagar';
      case 'debtors': return 'Devedores';
      case 'creditors': return 'Credores';
      default: return '';
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case 'week':
        // Last 7 days
        setStartDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
        setEndDate(today);
        break;
      case 'month':
        // Current month
        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setEndDate(today);
        break;
      case 'quarter':
        // Current quarter
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        setStartDate(new Date(today.getFullYear(), quarterMonth, 1));
        setEndDate(today);
        break;
      case 'year':
        // Current year
        setStartDate(new Date(today.getFullYear(), 0, 1));
        setEndDate(today);
        break;
      default:
        // Custom range - don't change dates
        break;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    // Get current report title
    const reportTitle = getTabTitle(activeTab);
    
    // Create print content
    let printContent = `
      <html>
        <head>
          <title>${reportTitle} - ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; text-align: left; padding: 10px; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .logo { max-height: 60px; }
            .summary { margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 5px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${reportTitle}</h1>
              <p>Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}</p>
            </div>
            <img src="/logo.png" alt="Logo" class="logo" />
          </div>
    `;
    
    // Add table based on active tab
    printContent += `<table>`;
    
    switch (activeTab) {
      case 'receivables':
        printContent += `
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Trabalho</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
        `;
        
        reportData.receivables.forEach(item => {
          const status = item.is_paid ? 'Pago' : (new Date(item.due_date) < new Date() ? 'Atrasado' : 'Em aberto');
          const statusColor = item.is_paid ? 'green' : (new Date(item.due_date) < new Date() ? 'red' : 'orange');
          
          printContent += `
            <tr>
              <td>${item.client_name}</td>
              <td>${item.job_order_number}</td>
              <td>R$ ${item.amount.toFixed(2)}</td>
              <td>${format(new Date(item.due_date), 'dd/MM/yyyy')}</td>
              <td style="color: ${statusColor};">${status}</td>
            </tr>
          `;
        });
        
        printContent += `</tbody>`;
        break;
        
      case 'payables':
        printContent += `
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
        `;
        
        reportData.payables.forEach(item => {
          const status = item.is_paid ? 'Pago' : (new Date(item.due_date) < new Date() ? 'Atrasado' : 'Em aberto');
          const statusColor = item.is_paid ? 'green' : (new Date(item.due_date) < new Date() ? 'red' : 'orange');
          
          printContent += `
            <tr>
              <td>${item.supplier_name}</td>
              <td>${item.description}</td>
              <td>R$ ${item.amount.toFixed(2)}</td>
              <td>${format(new Date(item.due_date), 'dd/MM/yyyy')}</td>
              <td style="color: ${statusColor};">${status}</td>
            </tr>
          `;
        });
        
        printContent += `</tbody>`;
        break;
        
      case 'debtors':
        printContent += `
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Total Devido</th>
              <th>Valor Atrasado</th>
              <th>Qtd. Faturas</th>
              <th>Último Pagamento</th>
            </tr>
          </thead>
          <tbody>
        `;
        
        reportData.debtors.forEach(item => {
          printContent += `
            <tr>
              <td>${item.client_name}</td>
              <td>R$ ${item.total_due.toFixed(2)}</td>
              <td>R$ ${item.overdue_amount.toFixed(2)}</td>
              <td>${item.invoice_count}</td>
              <td>${item.last_payment ? format(new Date(item.last_payment), 'dd/MM/yyyy') : 'Nunca'}</td>
            </tr>
          `;
        });
        
        printContent += `</tbody>`;
        break;
        
      case 'creditors':
        printContent += `
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Total a Pagar</th>
              <th>Valor Atrasado</th>
              <th>Qtd. Faturas</th>
              <th>Último Pagamento</th>
            </tr>
          </thead>
          <tbody>
        `;
        
        reportData.creditors.forEach(item => {
          printContent += `
            <tr>
              <td>${item.supplier_name}</td>
              <td>R$ ${item.total_due.toFixed(2)}</td>
              <td>R$ ${item.overdue_amount.toFixed(2)}</td>
              <td>${item.invoice_count}</td>
              <td>${item.last_payment ? format(new Date(item.last_payment), 'dd/MM/yyyy') : 'Nunca'}</td>
            </tr>
          `;
        });
        
        printContent += `</tbody>`;
        break;
    }
    
    printContent += `</table>`;
    
    // Add summary section
    printContent += `
      <div class="summary">
        <h2>Resumo</h2>
        <p><strong>Total de Contas a Receber:</strong> R$ ${summaryData.totalReceivables.toFixed(2)}</p>
        <p><strong>Total de Contas a Pagar:</strong> R$ ${summaryData.totalPayables.toFixed(2)}</p>
        <p><strong>Saldo:</strong> R$ ${(summaryData.totalReceivables - summaryData.totalPayables).toFixed(2)}</p>
      </div>
      
      <div class="footer">
        <p>Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - LabManager</p>
      </div>
    `;
    
    printContent += `
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Format dates for API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Get endpoint based on active tab
      let endpoint = '';
      switch (activeTab) {
        case 'receivables':
          endpoint = `/financial/reports/receivables/pdf/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
          break;
        case 'payables':
          endpoint = `/financial/reports/payables/pdf/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
          break;
        case 'debtors':
          endpoint = `/financial/reports/debtors/pdf/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
          break;
        case 'creditors':
          endpoint = `/financial/reports/creditors/pdf/?start_date=${formattedStartDate}&end_date=${formattedEndDate}`;
          break;
      }
      
      // Request PDF file
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}_report_${formattedStartDate}_${formattedEndDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Sucesso",
        description: "Relatório baixado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient) {
      toast({
        title: "Erro",
        description: "Por favor, informe um endereço de e-mail",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Format dates for API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Get endpoint based on active tab
      let endpoint = '';
      switch (activeTab) {
        case 'receivables':
          endpoint = `/financial/reports/receivables/email/`;
          break;
        case 'payables':
          endpoint = `/financial/reports/payables/email/`;
          break;
        case 'debtors':
          endpoint = `/financial/reports/debtors/email/`;
          break;
        case 'creditors':
          endpoint = `/financial/reports/creditors/email/`;
          break;
      }
      
      // Send email request
      await axios.post(`${API_URL}${endpoint}`, {
        email: emailRecipient,
        subject: emailSubject || `Relatório de ${getTabTitle(activeTab)}`,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        report_type: reportType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowEmailDialog(false);
      setEmailRecipient('');
      setEmailSubject('');
      
      toast({
        title: "Sucesso",
        description: `Relatório enviado para ${emailRecipient}`,
      });
    } catch (error) {
      console.error('Erro ao enviar relatório por e-mail:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o relatório por e-mail",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Chart data for receivables
  const receivablesChartData = {
    labels: ['Em dia', 'Atrasado', 'Pago'],
    datasets: [
      {
        label: 'Valor (R$)',
        data: [
          reportData.receivables.filter(item => !item.is_paid && new Date(item.due_date) >= new Date()).reduce((sum, item) => sum + item.amount, 0),
          reportData.receivables.filter(item => !item.is_paid && new Date(item.due_date) < new Date()).reduce((sum, item) => sum + item.amount, 0),
          reportData.receivables.filter(item => item.is_paid).reduce((sum, item) => sum + item.amount, 0)
        ],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
        borderWidth: 1
      }
    ]
  };

  // Chart data for payables
  const payablesChartData = {
    labels: ['Em dia', 'Atrasado', 'Pago'],
    datasets: [
      {
        label: 'Valor (R$)',
        data: [
          reportData.payables.filter(item => !item.is_paid && new Date(item.due_date) >= new Date()).reduce((sum, item) => sum + item.amount, 0),
          reportData.payables.filter(item => !item.is_paid && new Date(item.due_date) < new Date()).reduce((sum, item) => sum + item.amount, 0),
          reportData.payables.filter(item => item.is_paid).reduce((sum, item) => sum + item.amount, 0)
        ],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)'],
        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
        borderWidth: 1
      }
    ]
  };

  // Chart data for debtors
  const debtorsChartData = {
    labels: reportData.debtors.slice(0, 5).map(item => item.client_name),
    datasets: [
      {
        label: 'Total Devido (R$)',
        data: reportData.debtors.slice(0, 5).map(item => item.total_due),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1
      }
    ]
  };

  // Chart data for creditors
  const creditorsChartData = {
    labels: reportData.creditors.slice(0, 5).map(item => item.supplier_name),
    datasets: [
      {
        label: 'Total a Pagar (R$)',
        data: reportData.creditors.slice(0, 5).map(item => item.total_due),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Relatório de ${getTabTitle(activeTab)}`,
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios Detalhados</CardTitle>
          <CardDescription>
            Visualize e exporte relatórios financeiros detalhados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
                <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
                <TabsTrigger value="debtors">Devedores</TabsTrigger>
                <TabsTrigger value="creditors">Credores</TabsTrigger>
              </TabsList>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handlePrint} disabled={loading}>
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} disabled={loading}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button variant="outline" onClick={() => setShowEmailDialog(true)} disabled={loading}>
                  <MailIcon className="h-4 w-4 mr-2" />
                  Enviar por E-mail
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-4">
                {(activeTab === 'receivables' || activeTab === 'payables') && (
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tipo de Relatório" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">Detalhado</SelectItem>
                      <SelectItem value="summary">Resumido</SelectItem>
                      <SelectItem value="by_client">Por Cliente</SelectItem>
                      <SelectItem value="by_date">Por Data</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <Select value={dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Mês Atual</SelectItem>
                    <SelectItem value="quarter">Trimestre Atual</SelectItem>
                    <SelectItem value="year">Ano Atual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Data Inicial</span>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    disabled={dateRange !== 'custom'}
                  />
                </div>
                <span className="text-gray-500">até</span>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Data Final</span>
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    disabled={dateRange !== 'custom'}
                  />
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-lg">Carregando relatório...</span>
              </div>
            ) : (
              <>
                <TabsContent value="receivables" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Total a Receber</p>
                            <h3 className="text-2xl font-bold">
                              R$ {summaryData.totalReceivables.toFixed(2)}
                            </h3>
                          </div>
                          <DollarSignIcon className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Em Atraso</p>
                            <h3 className="text-2xl font-bold text-red-500">
                              R$ {summaryData.overdueReceivables.toFixed(2)}
                            </h3>
                          </div>
                          <AlertCircleIcon className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Faturas</p>
                            <h3 className="text-2xl font-bold">
                              {reportData.receivables.length}
                            </h3>
                          </div>
                          <FileTextIcon className="h-8 w-8 text-gray-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Pie data={receivablesChartData} options={chartOptions} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Contas a Receber por Mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Bar 
                            data={{
                              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                              datasets: [
                                {
                                  label: 'Valor (R$)',
                                  data: [12000, 19000, 15000, 17000, 16000, 13000, 18000, 14000, 16000, 15000, 17000, 19000],
                                  backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                }
                              ],
                            }} 
                            options={chartOptions} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Trabalho</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.receivables.length > 0 ? (
                        reportData.receivables.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.client_name}</TableCell>
                            <TableCell>{item.job_order_number}</TableCell>
                            <TableCell>R$ {item.amount.toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(item.issue_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{format(new Date(item.due_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              {item.is_paid ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Pago
                                </div>
                              ) : new Date(item.due_date) < new Date() ? (
                                <div className="flex items-center text-red-600">
                                  <AlertCircleIcon className="h-4 w-4 mr-1" />
                                  Atrasado
                                </div>
                              ) : (
                                <div className="flex items-center text-orange-500">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  Em aberto
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="payables" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Total a Pagar</p>
                            <h3 className="text-2xl font-bold">
                              R$ {summaryData.totalPayables.toFixed(2)}
                            </h3>
                          </div>
                          <DollarSignIcon className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Em Atraso</p>
                            <h3 className="text-2xl font-bold text-red-500">
                              R$ {summaryData.overduePayables.toFixed(2)}
                            </h3>
                          </div>
                          <AlertCircleIcon className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Faturas</p>
                            <h3 className="text-2xl font-bold">
                              {reportData.payables.length}
                            </h3>
                          </div>
                          <FileTextIcon className="h-8 w-8 text-gray-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Pie data={payablesChartData} options={chartOptions} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Contas a Pagar por Mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Bar 
                            data={{
                              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                              datasets: [
                                {
                                  label: 'Valor (R$)',
                                  data: [8000, 12000, 9000, 11000, 10000, 9500, 12500, 9000, 10000, 9500, 11000, 12000],
                                  backgroundColor: 'rgba(153, 102, 255, 0.6)',
                                }
                              ],
                            }} 
                            options={chartOptions} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.payables.length > 0 ? (
                        reportData.payables.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.supplier_name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>R$ {item.amount.toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(item.issue_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{format(new Date(item.due_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              {item.is_paid ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Pago
                                </div>
                              ) : new Date(item.due_date) < new Date() ? (
                                <div className="flex items-center text-red-600">
                                  <AlertCircleIcon className="h-4 w-4 mr-1" />
                                  Atrasado
                                </div>
                              ) : (
                                <div className="flex items-center text-orange-500">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  Em aberto
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="debtors" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 5 Devedores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Bar data={debtorsChartData} options={chartOptions} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução de Dívidas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Line 
                            data={{
                              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                              datasets: [
                                {
                                  label: 'Total de Dívidas (R$)',
                                  data: [12000, 15000, 18000, 16000, 19000, 22000],
                                  borderColor: 'rgba(255, 159, 64, 1)',
                                  backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                  fill: true,
                                }
                              ],
                            }} 
                            options={chartOptions} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Total Devido</TableHead>
                        <TableHead>Valor Atrasado</TableHead>
                        <TableHead>Qtd. Faturas</TableHead>
                        <TableHead>Último Pagamento</TableHead>
                        <TableHead>Dias de Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.debtors.length > 0 ? (
                        reportData.debtors.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.client_name}</TableCell>
                            <TableCell>R$ {item.total_due.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600">R$ {item.overdue_amount.toFixed(2)}</TableCell>
                            <TableCell>{item.invoice_count}</TableCell>
                            <TableCell>{item.last_payment ? format(new Date(item.last_payment), 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                            <TableCell>
                              {item.days_overdue > 0 ? (
                                <div className={`flex items-center ${
                                  item.days_overdue > 30 ? 'text-red-600' : 'text-orange-500'
                                }`}>
                                  <AlertCircleIcon className="h-4 w-4 mr-1" />
                                  {item.days_overdue} dias
                                </div>
                              ) : (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Em dia
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="creditors" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 5 Credores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Bar data={creditorsChartData} options={chartOptions} />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução de Dívidas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <Line 
                            data={{
                              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                              datasets: [
                                {
                                  label: 'Total a Pagar (R$)',
                                  data: [8000, 10000, 9000, 12000, 11000, 13000],
                                  borderColor: 'rgba(153, 102, 255, 1)',
                                  backgroundColor: 'rgba(153, 102, 255, 0.2)',
                                  fill: true,
                                }
                              ],
                            }} 
                            options={chartOptions} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Total a Pagar</TableHead>
                        <TableHead>Valor Atrasado</TableHead>
                        <TableHead>Qtd. Faturas</TableHead>
                        <TableHead>Último Pagamento</TableHead>
                        <TableHead>Dias de Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.creditors.length > 0 ? (
                        reportData.creditors.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.supplier_name}</TableCell>
                            <TableCell>R$ {item.total_due.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600">R$ {item.overdue_amount.toFixed(2)}</TableCell>
                            <TableCell>{item.invoice_count}</TableCell>
                            <TableCell>{item.last_payment ? format(new Date(item.last_payment), 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                            <TableCell>
                              {item.days_overdue > 0 ? (
                                <div className={`flex items-center ${
                                  item.days_overdue > 30 ? 'text-red-600' : 'text-orange-500'
                                }`}>
                                  <AlertCircleIcon className="h-4 w-4 mr-1" />
                                  {item.days_overdue} dias
                                </div>
                              ) : (
                                <div className="flex items-center text-green-600">
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Em dia
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Relatório por E-mail</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para enviar o relatório por e-mail
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Destinatário</Label>
              <Input
                id="email"
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="exemplo@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto (opcional)</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={`Relatório de ${getTabTitle(activeTab)}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmail} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
