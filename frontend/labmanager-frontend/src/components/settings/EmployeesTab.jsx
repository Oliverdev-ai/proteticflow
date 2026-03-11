import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

export default function EmployeesTab() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/v1/employees/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(response.data.results || response.data);
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar a lista de funcionários.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                        <Users className="h-6 w-6 mr-3 text-blue-600" />
                        Gestão de Funcionários
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Cadastre membros da equipe, cargos e gerencie contas de acesso
                    </CardDescription>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Novo Funcionário
                </Button>
            </CardHeader>
            <CardContent className="p-8">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3">Cargo</th>
                                    <th className="px-6 py-3">Perfil de Acesso</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-gray-500">
                                            Nenhum funcionário cadastrado.
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                                            <td className="px-6 py-4">{emp.position || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                    {emp.role || 'Sem acesso'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {emp.is_active !== false ? (
                                                    <span className="text-green-600 font-medium">Ativo</span>
                                                ) : (
                                                    <span className="text-red-600 font-medium">Inativo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-blue-600">Editar</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
