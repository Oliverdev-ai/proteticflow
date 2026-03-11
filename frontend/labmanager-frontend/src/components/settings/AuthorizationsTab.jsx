import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Shield, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import usePermissions from '../../hooks/usePermissions';

// Matriz de controle estática simulando o DB configuration
const MODULES = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'clients', name: 'Clientes & Pacientes' },
    { id: 'jobs', name: 'Trabalhos & Produção' },
    { id: 'pricing', name: 'Tabelas de Preços' },
    { id: 'financial', name: 'Financeiro' },
    { id: 'materials', name: 'Estoque' },
    { id: 'employees', name: 'RH & Funcionários' },
    { id: 'auth_settings', name: 'Configurações' }
];

const ROLES = [
    { id: 'producao', name: 'Produção' },
    { id: 'recepcao', name: 'Recepção' },
    { id: 'gerente', name: 'Gerente' },
    { id: 'superadmin', name: 'SuperAdmin' }
];

export default function AuthorizationsTab() {
    const [matrix, setMatrix] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const { getMyPermissions } = usePermissions();

    useEffect(() => {
        // Para simplificar a demonstração, inicializamos com as regras do front (usePermissions).
        // Num fluxo finalizado por API, substituiria isso por GET /api/v1/access/permissions/
        const initialMatrix = {};

        ROLES.forEach(r => {
            initialMatrix[r.id] = {};
            MODULES.forEach(m => {
                // Mock de matriz baseado no que temos no usePermissions RBAC
                if (r.id === 'superadmin') {
                    initialMatrix[r.id][m.id] = true;
                } else if (r.id === 'gerente') {
                    initialMatrix[r.id][m.id] = m.id !== 'auth_settings' && m.id !== 'materials'; // materials mock true, but lets dynamic
                    if (m.id === 'materials') initialMatrix[r.id][m.id] = true;
                } else if (r.id === 'recepcao') {
                    initialMatrix[r.id][m.id] = ['dashboard', 'clients', 'jobs', 'pricing'].includes(m.id);
                } else if (r.id === 'producao') {
                    initialMatrix[r.id][m.id] = ['dashboard', 'jobs'].includes(m.id);
                }
            });
        });

        setMatrix(initialMatrix);
    }, []);

    const handleToggle = (roleId, moduleId) => {
        // Superadmin sempre tem acesso a tudo (locked layer visual)
        if (roleId === 'superadmin') return;

        setMatrix(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [moduleId]: !prev[roleId][moduleId]
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Mock saving via network wait
            await new Promise(r => setTimeout(r, 1000));
            toast({
                title: "Autorizações Atualizadas",
                description: "A matriz de acesso foi salva com sucesso no sistema (simulação)."
            });
        } catch (error) {
            toast({
                title: "Erro ao Salvar",
                description: "Houve um problema ao atualizar as autorizações.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                        <Shield className="h-6 w-6 mr-3 text-blue-600" />
                        Matriz de Autorizações
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Configure quais perfis podem ter acesso a cada módulo do sistema
                    </CardDescription>
                </div>
                <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Permissões
                </Button>
            </CardHeader>

            <CardContent className="p-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-4 border-r w-1/4">Módulos</th>
                                {ROLES.map(role => (
                                    <th key={`th-${role.id}`} className="px-6 py-4 text-center border-r">
                                        {role.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MODULES.map((moduleItem, index) => (
                                <tr key={`tr-${moduleItem.id}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="px-6 py-4 font-medium text-gray-900 border-r border-b">
                                        {moduleItem.name}
                                    </td>
                                    {ROLES.map(roleItem => (
                                        <td key={`td-${roleItem.id}-${moduleItem.id}`} className="px-6 py-4 text-center border-r border-b">
                                            <Switch
                                                checked={matrix[roleItem.id]?.[moduleItem.id] || false}
                                                onCheckedChange={() => handleToggle(roleItem.id, moduleItem.id)}
                                                disabled={roleItem.id === 'superadmin'}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-4 text-sm text-gray-500 italic">
                        * O perfil SuperAdmin não pode ter módulos desativados por motivos de segurança do sistema.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
