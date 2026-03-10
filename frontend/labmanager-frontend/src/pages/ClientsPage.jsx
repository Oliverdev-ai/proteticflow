import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { clientService } from '@/services/api';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, UsersIcon, PhoneIcon, MailIcon, UserIcon } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientService.getAll();
        setClients(response.results);
        setFilteredClients(response.results);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone_primary.includes(searchTerm)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await clientService.delete(id);
        setClients(clients.filter((client) => client.id !== id));
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestão de Clientes</h1>
              <p className="text-blue-100 text-lg">Gerencie sua carteira de clientes com eficiência</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2" />
                  <span>Relacionamento Duradouro</span>
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  <span>Controle Completo</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/clients/new')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 text-lg font-semibold shadow-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                  <p className="text-3xl font-bold text-blue-600">{clients.length}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ↗️ +12% este mês
                    </span>
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{clients.length}</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      ✅ 100% ativos
                    </span>
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <UserIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Novos este Mês</p>
                  <p className="text-3xl font-bold text-purple-600">2</p>
                  <p className="text-sm text-green-600 mt-1">
                    <span className="inline-flex items-center">
                      🎯 Meta atingida
                    </span>
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <PlusIcon className="h-8 w-8 text-purple-600" />
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
            <CardTitle className="text-2xl font-bold text-gray-800">Lista de Clientes</CardTitle>
            <CardDescription className="text-gray-600">
              Gerencie informações e histórico dos seus clientes
            </CardDescription>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome, contato ou telefone..."
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
                <span className="ml-3 text-gray-600">Carregando clientes...</span>
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 py-4">
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-2" />
                          Nome da Empresa
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          Contato
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          Telefone
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center">
                          <MailIcon className="h-4 w-4 mr-2" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client, index) => (
                      <TableRow key={client.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                              <UsersIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{client.name}</div>
                              <Badge variant="secondary" className="mt-1">Cliente Ativo</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-700">{client.contact_person}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-gray-600">
                            <PhoneIcon className="h-4 w-4 mr-2 text-green-500" />
                            {client.phone_primary}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-gray-600">
                            <MailIcon className="h-4 w-4 mr-2 text-blue-500" />
                            {client.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
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
                  <UsersIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece adicionando seu primeiro cliente'}
                </p>
                <Button 
                  onClick={() => navigate('/clients/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Cliente
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-50 border-t px-6 py-4">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total: {filteredClients.length}</span> cliente(s)
                {searchTerm && (
                  <span className="ml-2">
                    • Filtrado de {clients.length} cliente(s)
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

