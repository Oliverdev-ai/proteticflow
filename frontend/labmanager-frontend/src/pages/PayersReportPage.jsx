import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { 
  DownloadIcon, 
  PrinterIcon, 
  MailIcon, 
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  BarChart3Icon,
  TrendingUpIcon,
  AwardIcon,
  CalendarIcon
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

export default function PayersReportPage() {
  const [reportType, setReportType] = useState('detailed');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [payersData, setPayersData] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalPaid: 0,
    averageDaysToPayment: 0,
    averagePaymentAmount: 0,
    totalClients: 0,
    onTimePayers: 0,
    latePayers: 0
  });

  useEffect(() => {
    fetchPayersData();
  }, [reportType, dateRange, startDate, endDate]);

  const fetchPayersData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Format dates for API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch payers data
      const endpoint = `/financial/reports/payers/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
      
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update payers data
      setPayersData(response.data.items || response.data);
      
      // Update summary data if available
      if (response.data.summary) {
        setSummaryData(response.data.summary);
      }
      
    } catch (error) {
      console.error('Erro ao buscar relatório de pagadores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório de pagadores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    
    // Create print content
    let printContent = `
      <html>
        <head>
          <title>Relatório de Pagadores - ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}</title>
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
              <h1>Relatório de Pagadores</h1>
              <p>Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}</p>
            </div>
            <img src="/logo.png" alt="Logo" class="logo" />
          </div>
          
          <div class="summary">
            <h2>Resumo</h2>
            <p><strong>Total Pago:</strong> R$ ${summaryData.totalPaid.toFixed(2)}</p>
            <p><strong>Média de Dias para Pagamento:</strong> ${summaryData.averageDaysToPayment.toFixed(1)} dias</p>
            <p><strong>Valor Médio de Pagamento:</strong> R$ ${summaryData.averagePaymentAmount.toFixed(2)}</p>
            <p><strong>Total de Clientes Pagantes:</strong> ${summaryData.totalClients}</p>
            <p><strong>Pagadores em Dia:</strong> ${summaryData.onTimePayers} (${(summaryData.onTimePayers / summaryData.totalClients * 100).toFixed(1)}%)</p>
            <p><strong>Pagadores em Atraso:</strong> ${summaryData.latePayers} (${(summaryData.latePayers / summaryData.totalClients * 100).toFixed(1)}%)</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Total Pago</th>
                <th>Qtd. Pagamentos</th>
                <th>Média de Dias</th>
                <th>Último Pagamento</th>
                <th>Pontualidade</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    payersData.forEach(payer => {
      const punctualityClass = payer.punctuality_score >= 90 ? 'green' : 
                              payer.punctuality_score >= 70 ? 'blue' : 
                              payer.punctuality_score >= 50 ? 'orange' : 'red';
      
      printContent += `
        <tr>
          <td>${payer.client_name}</td>
          <td>R$ ${payer.total_paid.toFixed(2)}</td>
          <td>${payer.payment_count}</td>
          <td>${payer.average_days_to_payment.toFixed(1)} dias</td>
          <td>${format(new Date(payer.last_payment_date), 'dd/MM/yyyy')}</td>
          <td style="color: ${punctualityClass};">${payer.punctuality_score}%</td>
        </tr>
      `;
    });
    
    printContent += `
            </tbody>
          </table>
          
          <div class="footer">
            <p>Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - LabManager</p>
          </div>
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
      
      // Get endpoint for PDF
      const endpoint = `/financial/reports/payers/pdf/?start_date=${formattedStartDate}&end_date=${formattedEndDate}&type=${reportType}`;
      
      // Request PDF file
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payers_report_${formattedStartDate}_${formattedEndDate}.pdf`);
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
      
      // Send email request
      await axios.post(`${API_URL}/financial/reports/payers/email/`, {
        email: emailRecipient,
        subject: emailSubject || `Relatório de Pagadores`,
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

  // Chart data for payment distribution
  const paymentDistributionData = {
    labels: ['Em dia', 'Até 7 dias de atraso', 'De 8 a 30 dias de atraso', 'Mais de 30 dias de atraso'],
    datasets: [
      {
        label: 'Quantidade de Pagamentos',
        data: [
          summaryData.onTimePayers || 0,
          summaryData.latePayers1to7Days || 0,
          summaryData.latePayers8to30Days || 0,
          summaryData.latePayersOver30Days || 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Chart data for top payers
  const topPayersData = {
    labels: payersData.slice(0, 5).map(payer => payer.client_name),
    datasets: [
      {
        label: 'Total Pago (R$)',
        data: payersData.slice(0, 5).map(payer => payer.total_paid),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  // Chart data for payment trends
  const paymentTrendsData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Total Pago (R$)',
        data: [15000, 18000, 16000, 20000, 22000, 25000],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true
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
        text: 'Relatório de Pagadores',
      },
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatório de Pagadores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagadores</CardTitle>
          <CardDescription>
            Visualize e exporte relatórios de clientes que efetuaram pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
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
          
          <div className="flex justify-end space-x-2 mb-6">
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
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Carregando relatório...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Total Pago</p>
                        <h3 className="text-2xl font-bold">
                          R$ {summaryData.totalPaid.toFixed(2)}
                        </h3>
                      </div>
                      <DollarSignIcon className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Média de Dias para Pagamento</p>
                        <h3 className="text-2xl font-bold">
                          {summaryData.averageDaysToPayment.toFixed(1)} dias
                        </h3>
                      </div>
                      <CalendarIcon className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Clientes Pagantes</p>
                        <h3 className="text-2xl font-bold">
                          {summaryData.totalClients}
                        </h3>
                      </div>
                      <AwardIcon className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Pie data={paymentDistributionData} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Pagadores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <Bar data={topPayersData} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Tendência de Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Line data={paymentTrendsData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total Pago</TableHead>
                    <TableHead>Qtd. Pagamentos</TableHead>
                    <TableHead>Média de Dias</TableHead>
                    <TableHead>Último Pagamento</TableHead>
                    <TableHead>Pontualidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payersData.length > 0 ? (
                    payersData.map((payer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payer.client_name}</TableCell>
                        <TableCell>R$ {payer.total_paid.toFixed(2)}</TableCell>
                        <TableCell>{payer.payment_count}</TableCell>
                        <TableCell>{payer.average_days_to_payment.toFixed(1)} dias</TableCell>
                        <TableCell>{format(new Date(payer.last_payment_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          {payer.punctuality_score >= 90 ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Excelente ({payer.punctuality_score}%)
                            </div>
                          ) : payer.punctuality_score >= 70 ? (
                            <div className="flex items-center text-blue-600">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Bom ({payer.punctuality_score}%)
                            </div>
                          ) : payer.punctuality_score >= 50 ? (
                            <div className="flex items-center text-orange-500">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Regular ({payer.punctuality_score}%)
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Ruim ({payer.punctuality_score}%)
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
            </>
          )}
          
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
                    placeholder="Relatório de Pagadores"
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
        </CardContent>
      </Card>
    </div>
  );
}
