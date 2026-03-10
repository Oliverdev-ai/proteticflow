import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { jobService, clientService } from '@/services/api';
import { PlusIcon, SearchIcon, EditIcon, ImageIcon, EyeIcon, ClipboardListIcon, CalendarIcon, UserIcon, TrendingUpIcon, CheckCircleIcon, TruckIcon } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [clients, setClients] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar trabalhos
        const jobsResponse = await jobService.getAll();
        setJobs(jobsResponse.results);
        setFilteredJobs(jobsResponse.results);

        // Buscar clientes para mapear IDs para nomes
        const clientsResponse = await clientService.getAll();
        const clientMap = {};
        clientsResponse.results.forEach(client => {
          clientMap[client.id] = client.name;
        });
        setClients(clientMap);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredJobs(jobs);
    } else {
      const filtered = jobs.filter(
        (job) =>
          job.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (clients[job.client] && clients[job.client].toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredJobs(filtered);
    }
  }, [searchTerm, jobs, clients]);

  const getStatusBadge = (status) => {
    const statusMap = {
      REC: { label: 'Recebido', variant: 'default', color: 'bg-blue-100 text-blue-800' },
      PROD: { label: 'Em Produção', variant: 'warning', color: 'bg-amber-100 text-amber-800' },
      QC: { label: 'Controle de Qualidade', variant: 'secondary', color: 'bg-purple-100 text-purple-800' },
      COMP: { label: 'Concluído', variant: 'success', color: 'bg-green-100 text-green-800' },
      DEL: { label: 'Entregue', variant: 'outline', color: 'bg-gray-100 text-gray-800' },
      CANC: { label: 'Cancelado', variant: 'destructive', color: 'bg-red-100 text-red-800' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getJobStats = () => {
    const total = jobs.length;
    const inProgress = jobs.filter(job => ['REC', 'PROD', 'QC'].includes(job.status)).length;
    const completed = jobs.filter(job => job.status === 'COMP').length;
    const delivered = jobs.filter(job => job.status === 'DEL').length;
    
    return { total, inProgress, completed, delivered };
  };

  const stats = getJobStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestão de Trabalhos</h1>
              <p className="text-blue-100 text-lg">Controle completo da produção do laboratório</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center">
                  <ClipboardListIcon className="h-5 w-5 mr-2" />
                  <span>Organização Total</span>
                </div>
                <div className="flex items-center">
                  <TrendingUpIcon className="h-5 w-5 mr-2" />
                  <span>Produtividade Máxima</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/jobs/new')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 text-lg font-semibold shadow-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Trabalho
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
                  <p className="text-sm font-medium text-gray-600">Total de Trabalhos</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      📋 Todos os trabalhos
                    </span>
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ClipboardListIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Produção</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.inProgress}</p>
                  <p className="text-sm text-amber-600 mt-1">
                    <span className="inline-flex items-center">
                      ⚡ Em andamento
                    </span>
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <TrendingUpIcon className="h-8 w-8 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Concluídos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ✅ Finalizados
                    </span>
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Entregues</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.delivered}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      🚚 Entregues
                    </span>
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TruckIcon className="h-8 w-8 text-purple-600" />
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
            <CardTitle className="text-2xl font-bold text-gray-800">Lista de Trabalhos</CardTitle>
            <CardDescription className="text-gray-600">
              Acompanhe o status e progresso de todos os trabalhos
            </CardDescription>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por número, paciente ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 text-lg border-2 border-gray-200 focus:border-blue-400 rounded-lg"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Carregando trabalhos...</span>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-4">
                        <div className="flex items-center">
                          <ClipboardListIcon className="h-4 w-4 mr-2" />
                          Número
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          Cliente
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          Paciente
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Entrada
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Entrega
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job, index) => (
                      <TableRow key={job.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                              <ClipboardListIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="font-semibold text-gray-800">{job.order_number}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700">
                            {clients[job.client] || `Cliente #${job.client}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700">{job.patient_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-gray-600">
                            <CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />
                            {formatDate(job.entry_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-gray-600">
                            <CalendarIcon className="h-4 w-4 mr-2 text-green-500" />
                            {formatDate(job.due_date)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}/edit`)}
                              className="border-green-200 text-green-600 hover:bg-green-50"
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}/photos`)}
                              className="border-purple-200 text-purple-600 hover:bg-purple-50"
                            >
                              <ImageIcon className="h-4 w-4" />
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
                  <ClipboardListIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum trabalho encontrado</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece adicionando seu primeiro trabalho'}
                </p>
                <Button 
                  onClick={() => navigate('/jobs/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Trabalho
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-50 border-t px-6 py-4">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total: {filteredJobs.length}</span> trabalho(s)
                {searchTerm && (
                  <span className="ml-2">
                    • Filtrado de {jobs.length} trabalho(s)
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
    </div>
  );
}

