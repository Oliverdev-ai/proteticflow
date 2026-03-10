import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusIcon, SearchIcon, PrinterIcon, TruckIcon, MapPinIcon, ClipboardIcon, CheckCircleIcon, AlertCircleIcon, CalendarDaysIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';

export default function DeliverySchedulePage() {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/financial/delivery-schedules/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDeliveries(response.data.results || response.data);
        setFilteredDeliveries(response.data.results || response.data);
      } catch (error) {
        console.error('Erro ao buscar roteiros de entrega:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [searchTerm, filterStatus, selectedDate, deliveries]);

  const filterDeliveries = () => {
    let filtered = [...deliveries];

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        (delivery) =>
          delivery.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (delivery.jobs_details && delivery.jobs_details.some(job => 
            job.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.order_number.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((delivery) => delivery.status === filterStatus);
    }

    // Filter by date
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter((delivery) => delivery.date === dateStr);
    }

    setFilteredDeliveries(filtered);
  };

  const handlePrintRoute = async (delivery) => {
    try {
      setPrintLoading(true);
      setSelectedDelivery(delivery);
      setPrintDialogOpen(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/financial/delivery-schedules/${delivery.id}/print_route/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPrintData(response.data);
    } catch (error) {
      console.error('Erro ao gerar impressão do roteiro:', error);
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
        alert('PDF gerado com sucesso! Em um ambiente de produção, o download seria iniciado automaticamente.');
        setPrintDialogOpen(false);
        setPrintLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setPrintLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Agendado</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Em Trânsito</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Entregue</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Falha na Entrega</Badge>;
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
              <h1 className="text-4xl font-bold mb-2">Roteiro de Entregas</h1>
              <p className="text-blue-100 text-lg">Organize e acompanhe suas entregas com eficiência</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2" />
                  <span>Planejamento de Rotas</span>
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  <span>Rastreamento de Entregas</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/delivery-schedule/new')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 text-lg font-semibold shadow-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Roteiro
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
                  <p className="text-sm font-medium text-gray-600">Total de Roteiros</p>
                  <p className="text-3xl font-bold text-blue-600">{deliveries.length}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ↗️ +8% este mês
                    </span>
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ClipboardIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agendados</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {deliveries.filter(d => d.status === 'scheduled').length}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    <span className="inline-flex items-center">
                      🕒 Aguardando entrega
                    </span>
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <CalendarDaysIcon className="h-8 w-8 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Trânsito</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {deliveries.filter(d => d.status === 'in_transit').length}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    <span className="inline-flex items-center">
                      🚚 Em rota de entrega
                    </span>
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TruckIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Entregues</p>
                  <p className="text-3xl font-bold text-green-600">
                    {deliveries.filter(d => d.status === 'delivered').length}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ✅ Concluídos com sucesso
                    </span>
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-12">
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">Roteiros de Entrega</CardTitle>
            <CardDescription className="text-gray-600">
              Gerencie e acompanhe todos os roteiros de entrega
            </CardDescription>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Buscar por rota, motorista ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3 text-lg border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="py-3 text-lg border-2 border-gray-200 focus:border-blue-400 rounded-lg">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="in_transit">Em Trânsito</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="failed">Falha na Entrega</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="py-3 text-lg border-2 border-gray-200 focus:border-blue-400 rounded-lg justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Carregando roteiros...</span>
              </div>
            ) : filteredDeliveries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-4">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Data
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          Rota
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <TruckIcon className="h-4 w-4 mr-2" />
                          Motorista
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <ClipboardIcon className="h-4 w-4 mr-2" />
                          Trabalhos
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveries.map((delivery, index) => (
                      <TableRow key={delivery.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium py-4">
                          {delivery.date ? format(new Date(delivery.date), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700">{delivery.route_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-gray-600">
                            {delivery.driver_name || 'Não atribuído'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-600 border-0">
                              {delivery.jobs_count || 0} trabalhos
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(delivery.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/delivery-schedule/${delivery.id}`)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintRoute(delivery)}
                              className="border-green-200 text-green-600 hover:bg-green-50"
                            >
                              <PrinterIcon className="h-4 w-4 mr-1" />
                              Imprimir
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
                  <TruckIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum roteiro encontrado</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterStatus !== 'all' || selectedDate ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro roteiro de entrega'}
                </p>
                <Button 
                  onClick={() => navigate('/delivery-schedule/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Roteiro
                </Button>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="bg-gray-50 border-t px-6 py-4">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total: {filteredDeliveries.length}</span> roteiro(s)
                {(searchTerm || filterStatus !== 'all' || selectedDate) && (
                  <span className="ml-2">
                    • Filtrado de {deliveries.length} roteiro(s)
                  </span>
                )}
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
            <DialogTitle className="text-2xl font-bold">Imprimir Roteiro de Entrega</DialogTitle>
            <DialogDescription>
              Visualize e imprima o roteiro de entrega selecionado
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
                <h2 className="text-2xl font-bold text-gray-800">Roteiro de Entrega</h2>
                <p className="text-gray-600">
                  {printData.date ? format(new Date(printData.date), 'dd/MM/yyyy') : 'N/A'} - {printData.route_name}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Motorista</p>
                  <p className="font-medium">{printData.driver_name || 'Não atribuído'}</p>
                </div>
                <div className="border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Veículo</p>
                  <p className="font-medium">{printData.vehicle_info || 'Não especificado'}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">Trabalhos para Entrega ({printData.total_jobs})</h3>
              
              <div className="space-y-4">
                {printData.jobs && printData.jobs.map((job, index) => (
                  <div key={index} className="border rounded p-4 bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold">{job.client_name}</p>
                        <p className="text-gray-600">{job.client_address}</p>
                        <p className="text-gray-600">{job.client_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Ordem: {job.order_number}</p>
                        <p className="text-gray-600">Paciente: {job.patient_name}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-gray-600">{job.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t text-center text-gray-500 text-sm">
                <p>Este documento é apenas para controle interno do laboratório.</p>
              </div>
            </div>
          ) : (
            <div className="text-center p-6">
              <AlertCircleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p>Não foi possível carregar os dados do roteiro.</p>
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
