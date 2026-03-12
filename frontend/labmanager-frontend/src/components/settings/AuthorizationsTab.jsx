import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Shield, Save, Loader2, RefreshCw, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import usePermissions from '../../hooks/usePermissions';
import axios from 'axios';
import { API_URL } from '@/services/api';

/* ─── Metadados estáticos ─────────────────────────────────── */

const MODULES = [
    { id: 'dashboard',     name: 'Dashboard' },
    { id: 'clients',       name: 'Clientes & Pacientes' },
    { id: 'jobs',          name: 'Trabalhos & Produção' },
    { id: 'pricing',       name: 'Tabelas de Preços' },
    { id: 'financial',     name: 'Financeiro' },
    { id: 'materials',     name: 'Estoque' },
    { id: 'employees',     name: 'RH & Funcionários' },
    { id: 'auth_settings', name: 'Configurações' },
];

const ROLES = [
    { id: 'producao',   name: 'Produção' },
    { id: 'recepcao',   name: 'Recepção' },
    { id: 'contabil',   name: 'Contábil' },
    { id: 'gerente',    name: 'Gerente' },
    { id: 'superadmin', name: 'SuperAdmin' },
];

/* ─── Componente ──────────────────────────────────────────── */

export default function AuthorizationsTab() {
    const { isSuperAdmin } = usePermissions();
    const canEdit = isSuperAdmin();

    const [matrix,    setMatrix]    = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving,  setIsSaving]  = useState(false);
    const [isDirty,   setIsDirty]   = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    /* ── 4.1 Carrega a matriz do servidor ── */
    const fetchMatrix = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/v1/access/permissions/`, authHeader());
            setMatrix(res.data.matrix || {});
            setLastSaved(res.data.updated_at || null);
            setIsDirty(false);
        } catch (err) {
            const msg = err.response?.data?.detail || 'Não foi possível carregar as permissões.';
            toast({ title: 'Erro ao carregar', description: msg, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

    /* ── 4.3 Toggle bloqueado para não-superadmin ── */
    const handleToggle = (roleId, moduleId) => {
        if (!canEdit) return;            // guard: apenas superadmin
        if (roleId === 'superadmin') return; // superadmin sempre tudo liberado

        setMatrix(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [moduleId]: !prev[roleId]?.[moduleId],
            },
        }));
        setIsDirty(true);
    };

    /* ── 4.2 Salva no servidor ── */
    const handleSave = async () => {
        if (!canEdit) return;
        setIsSaving(true);
        try {
            const res = await axios.patch(
                `${API_URL}/api/v1/access/permissions/`,
                { matrix },
                authHeader()
            );
            setLastSaved(res.data.updated_at);
            setIsDirty(false);
            toast({
                title: 'Permissões salvas!',
                description: 'A matriz de acesso foi atualizada no servidor.',
            });
        } catch (err) {
            const msg = err.response?.data?.detail || 'Erro ao salvar permissões.';
            toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    /* ── Render ── */
    return (
        <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                <div className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                            <Shield className="h-6 w-6 mr-3 text-blue-600" />
                            Matriz de Autorizações
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-1">
                            Configure quais perfis podem acessar cada módulo do sistema
                            {lastSaved && (
                                <span className="ml-2 text-xs text-gray-400">
                                    • Salvo em {new Date(lastSaved).toLocaleString('pt-BR')}
                                </span>
                            )}
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Reload */}
                        <Button
                            id="btn-reload-permissions"
                            variant="outline"
                            size="sm"
                            onClick={fetchMatrix}
                            disabled={isLoading || isSaving}
                            title="Recarregar do servidor"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>

                        {/* Save — visível apenas para superadmin */}
                        {canEdit && (
                            <Button
                                id="btn-save-permissions"
                                className={`text-white transition-colors ${
                                    isDirty
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-400 cursor-default'
                                }`}
                                onClick={handleSave}
                                disabled={isSaving || !isDirty}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {isSaving ? 'Salvando…' : 'Salvar Permissões'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Aviso de somente-leitura para não-superadmin */}
                {!canEdit && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        <Lock className="h-4 w-4 shrink-0" />
                        <span>Visualização apenas. Apenas o <strong>superadmin</strong> pode alterar esta matriz.</span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {/* ── 4.4 Loading state ── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="text-sm">Carregando permissões do servidor…</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                                    <th className="px-6 py-4 font-semibold border-r w-1/4">Módulo</th>
                                    {ROLES.map(role => (
                                        <th
                                            key={`th-${role.id}`}
                                            className="px-6 py-4 text-center font-semibold border-r"
                                        >
                                            <span className={role.id === 'superadmin' ? 'text-red-700' : ''}>
                                                {role.name}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map((mod, idx) => (
                                    <tr
                                        key={`tr-${mod.id}`}
                                        className={`border-b transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/40`}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-800 border-r">
                                            {mod.name}
                                        </td>
                                        {ROLES.map(role => {
                                            const checked = role.id === 'superadmin'
                                                ? true
                                                : matrix[role.id]?.[mod.id] ?? false;
                                            const locked = !canEdit || role.id === 'superadmin';

                                            return (
                                                <td
                                                    key={`td-${role.id}-${mod.id}`}
                                                    className="px-6 py-4 text-center border-r"
                                                >
                                                    <Switch
                                                        id={`switch-${role.id}-${mod.id}`}
                                                        checked={checked}
                                                        onCheckedChange={() => handleToggle(role.id, mod.id)}
                                                        disabled={locked}
                                                        className={locked ? 'opacity-60 cursor-not-allowed' : ''}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <p className="px-6 py-4 text-xs text-gray-400 italic border-t">
                            * SuperAdmin sempre tem acesso total e não pode ser alterado por segurança.
                            {isDirty && canEdit && (
                                <span className="ml-2 font-semibold text-amber-600 not-italic">
                                    ⚠ Há alterações não salvas.
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
