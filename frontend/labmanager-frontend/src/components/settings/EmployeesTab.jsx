import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Pencil, UserX, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import usePermissions from '@/hooks/usePermissions';

/* ─── Constantes de Role ─────────────────────────────────── */

const ROLES = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'gerente',    label: 'Gerente' },
    { value: 'recepcao',   label: 'Recepção' },
    { value: 'producao',   label: 'Produção' },
    { value: 'contabil',   label: 'Contábil' },
];

const CONTRACT_TYPES = [
    { value: 'clt',          label: 'CLT' },
    { value: 'pj',           label: 'PJ / MEI' },
    { value: 'estagio',      label: 'Estágio' },
    { value: 'autonomo',     label: 'Autônomo' },
    { value: 'temporario',   label: 'Temporário' },
];

/** Badge colorido de role */
const ROLE_BADGE = {
    superadmin: 'bg-red-100 text-red-800',
    gerente:    'bg-purple-100 text-purple-800',
    recepcao:   'bg-blue-100 text-blue-800',
    producao:   'bg-gray-100 text-gray-700',
    contabil:   'bg-green-100 text-green-800',
};

function RoleBadge({ role }) {
    const label = ROLES.find(r => r.value === role)?.label || role || 'Sem acesso';
    const cls   = ROLE_BADGE[role] || 'bg-gray-100 text-gray-600';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {label}
        </span>
    );
}

/* ─── Formulário inicial vazio ───────────────────────────── */

const EMPTY_FORM = {
    // EmployeeProfile
    name: '',
    document_number: '',
    email: '',
    phone: '',
    position: '',
    hire_date: '',
    contract_type: '',
    salary: '',
    // CustomUser
    username: '',
    role: 'producao',
    password: '',
};

/* ─── Componente principal ───────────────────────────────── */

export default function EmployeesTab() {
    const { isSuperAdmin } = usePermissions();
    const [employees, setEmployees]   = useState([]);
    const [isLoading, setIsLoading]   = useState(true);

    // Modal de cadastro/edição
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = criação; objeto = edição
    const [form, setForm]             = useState(EMPTY_FORM);
    const [saving, setSaving]         = useState(false);

    // Modal de troca de role (superadmin apenas)
    const [roleModal, setRoleModal]   = useState(null); // { userId, currentRole, empName }
    const [newRole, setNewRole]       = useState('');
    const [savingRole, setSavingRole] = useState(false);

    /* ── Helpers de autenticação ── */
    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    /* ── Fetch ── */
    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get(`${API_URL}/api/v1/employees/employees/`, authHeader());
            setEmployees(res.data.results || res.data);
        } catch {
            toast({ title: 'Erro', description: 'Não foi possível carregar funcionários.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    /* ── Abertura do modal ── */
    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditTarget(emp);
        setForm({
            name:            emp.name || '',
            document_number: emp.document_number || '',
            email:           emp.email || '',
            phone:           emp.phone || '',
            position:        emp.position || '',
            hire_date:       emp.hire_date || '',
            contract_type:   emp.contract_type || '',
            salary:          emp.salary || '',
            // Campos de usuário não são editáveis aqui
            username:        emp.user?.username || '',
            role:            emp.user?.role || 'producao',
            password:        '',
        });
        setShowModal(true);
    };

    /* ── Submissão do formulário ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editTarget) {
                // Edição — atualiza só o EmployeeProfile
                await axios.patch(
                    `${API_URL}/api/v1/employees/employees/${editTarget.id}/`,
                    {
                        name:            form.name,
                        document_number: form.document_number,
                        email:           form.email,
                        phone:           form.phone,
                        position:        form.position,
                        hire_date:       form.hire_date,
                        contract_type:   form.contract_type,
                        salary:          form.salary || null,
                    },
                    authHeader()
                );
                toast({ title: 'Sucesso', description: 'Funcionário atualizado.' });
            } else {
                // Criação — 1º cria CustomUser, 2º cria EmployeeProfile
                const tempPassword = form.password || `Lab@${Math.random().toString(36).slice(2, 10)}#1`;

                const userRes = await axios.post(
                    `${API_URL}/api/auth/users/`,
                    {
                        username:         form.username || form.document_number,
                        email:            form.email,
                        first_name:       form.name.split(' ')[0],
                        last_name:        form.name.split(' ').slice(1).join(' '),
                        role:             form.role,
                        phone:            form.phone,
                        password:         tempPassword,
                        password_confirm: tempPassword,
                    },
                    authHeader()
                );

                await axios.post(
                    `${API_URL}/api/v1/employees/employees/`,
                    {
                        user:            userRes.data.id,
                        name:            form.name,
                        document_number: form.document_number,
                        email:           form.email,
                        phone:           form.phone,
                        position:        form.position,
                        hire_date:       form.hire_date,
                        contract_type:   form.contract_type,
                        salary:          form.salary || null,
                    },
                    authHeader()
                );

                toast({
                    title: 'Funcionário cadastrado!',
                    description: `Login criado: usuário "${form.username || form.document_number}" • senha temporária: ${tempPassword}`,
                });
            }

            setShowModal(false);
            fetchEmployees();
        } catch (err) {
            const msg = err.response?.data
                ? JSON.stringify(err.response.data)
                : 'Erro ao salvar funcionário.';
            toast({ title: 'Erro', description: msg, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    /* ── Soft Delete (inativar) ── */
    const handleDeactivate = async (emp) => {
        if (!window.confirm(`Inativar "${emp.name}"? O acesso será removido imediatamente.`)) return;
        try {
            const userId = emp.user?.id;
            if (userId) {
                await axios.patch(
                    `${API_URL}/api/auth/users/${userId}/`,
                    { is_active: false },
                    authHeader()
                );
            }
            // Marca também no EmployeeProfile
            await axios.patch(
                `${API_URL}/api/v1/employees/employees/${emp.id}/`,
                { is_active: false },
                authHeader()
            );
            toast({ title: 'Funcionário inativado.', description: emp.name });
            fetchEmployees();
        } catch {
            toast({ title: 'Erro', description: 'Não foi possível inativar.', variant: 'destructive' });
        }
    };

    /* ── Troca de Role ── */
    const openRoleModal = (emp) => {
        setRoleModal({
            userId:      emp.user?.id,
            currentRole: emp.user?.role || emp.role,
            empName:     emp.name,
        });
        setNewRole(emp.user?.role || emp.role || 'producao');
    };

    const handleRoleSave = async () => {
        if (!roleModal) return;
        setSavingRole(true);
        try {
            await axios.patch(
                `${API_URL}/api/auth/users/${roleModal.userId}/role/`,
                { role: newRole },
                authHeader()
            );
            toast({ title: 'Papel alterado!', description: `${roleModal.empName} → ${newRole}` });
            setRoleModal(null);
            fetchEmployees();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Erro ao alterar papel.';
            toast({ title: 'Erro', description: msg, variant: 'destructive' });
        } finally {
            setSavingRole(false);
        }
    };

    /* ── Auxiliar de campo ── */
    const field = (key) => ({
        id: key,
        value: form[key],
        onChange: (e) => setForm(prev => ({ ...prev, [key]: e.target.value })),
    });

    /* ─────────────────────────── Render ────────────────────── */
    return (
        <>
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
                    <Button
                        id="btn-novo-funcionario"
                        onClick={openCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Novo Funcionário
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center p-12">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Nome / Cargo</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Perfil de Acesso</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-12 text-gray-400">
                                                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                                Nenhum funcionário cadastrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        employees.map((emp) => (
                                            <tr key={emp.id} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">{emp.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{emp.position || '—'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <p>{emp.email || '—'}</p>
                                                    <p className="text-xs">{emp.phone || ''}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <RoleBadge role={emp.user?.role || emp.role} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    {emp.is_active !== false ? (
                                                        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs bg-green-50 px-2 py-1 rounded-full">
                                                            ● Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full">
                                                            ● Inativo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            id={`btn-editar-${emp.id}`}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-blue-600 hover:text-blue-800"
                                                            onClick={() => openEdit(emp)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>

                                                        {isSuperAdmin() && (
                                                            <Button
                                                                id={`btn-role-${emp.id}`}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-purple-600 hover:text-purple-800"
                                                                title="Alterar papel (superadmin)"
                                                                onClick={() => openRoleModal(emp)}
                                                            >
                                                                <ShieldCheck className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        {emp.is_active !== false && (
                                                            <Button
                                                                id={`btn-inativar-${emp.id}`}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Inativar funcionário"
                                                                onClick={() => handleDeactivate(emp)}
                                                            >
                                                                <UserX className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
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

            {/* ─── Modal Criar / Editar ─── */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editTarget ? `Editar: ${editTarget.name}` : 'Novo Funcionário'}
                        </DialogTitle>
                        <DialogDescription>
                            {editTarget
                                ? 'Atualize os dados do funcionário abaixo.'
                                : 'Preencha os dados para cadastrar o funcionário e criar o login de acesso.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form id="form-funcionario" onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* ── Dados pessoais ── */}
                        <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Dados Pessoais</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">Nome completo *</Label>
                                <Input {...field('name')} id="name" placeholder="Ex: João da Silva" required />
                            </div>
                            <div>
                                <Label htmlFor="document_number">CPF *</Label>
                                <Input {...field('document_number')} id="document_number" placeholder="000.000.000-00" required />
                            </div>
                            <div>
                                <Label htmlFor="phone">Telefone</Label>
                                <Input {...field('phone')} id="phone" placeholder="(11) 99999-0000" />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input {...field('email')} id="email" type="email" placeholder="joao@laboratorio.com" />
                            </div>
                        </div>

                        {/* ── Dados do vínculo ── */}
                        <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider pt-2">Vínculo Empregatício</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="position">Cargo *</Label>
                                <Input {...field('position')} id="position" placeholder="Ex: Protético, Auxiliar…" required />
                            </div>
                            <div>
                                <Label htmlFor="hire_date">Data de admissão *</Label>
                                <Input {...field('hire_date')} id="hire_date" type="date" required />
                            </div>
                            <div>
                                <Label htmlFor="contract_type">Tipo de contrato</Label>
                                <Select value={form.contract_type} onValueChange={v => setForm(p => ({ ...p, contract_type: v }))}>
                                    <SelectTrigger id="contract_type">
                                        <SelectValue placeholder="Selecione…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONTRACT_TYPES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="salary">Salário (R$)</Label>
                                <Input {...field('salary')} id="salary" type="number" min="0" step="0.01" placeholder="0,00" />
                            </div>
                        </div>

                        {/* ── Acesso ao sistema (apenas criação) ── */}
                        {!editTarget && (
                            <>
                                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider pt-2">Acesso ao Sistema</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="username">Usuário (login)</Label>
                                        <Input
                                            {...field('username')}
                                            id="username"
                                            placeholder="deixe vazio para usar o CPF"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="role">Papel / Nível de acesso *</Label>
                                        <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                                            <SelectTrigger id="role">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map(r => (
                                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                        <Label htmlFor="password">Senha temporária</Label>
                                        <Input
                                            {...field('password')}
                                            id="password"
                                            type="text"
                                            placeholder="Deixe vazio para gerar automaticamente"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            A senha gerada será exibida após o cadastro. Comunique ao funcionário.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowModal(false)}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                id="btn-salvar-funcionario"
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {saving ? 'Salvando…' : editTarget ? 'Salvar alterações' : 'Cadastrar funcionário'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Modal Alterar Role (superadmin) ─── */}
            <Dialog open={!!roleModal} onOpenChange={() => setRoleModal(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-purple-600" />
                            Alterar Papel
                        </DialogTitle>
                        <DialogDescription>
                            {roleModal?.empName} — papel atual:{' '}
                            <RoleBadge role={roleModal?.currentRole} />
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Label htmlFor="new-role">Novo papel</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger id="new-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleModal(null)} disabled={savingRole}>
                            Cancelar
                        </Button>
                        <Button
                            id="btn-confirmar-role"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleRoleSave}
                            disabled={savingRole}
                        >
                            {savingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {savingRole ? 'Salvando…' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
