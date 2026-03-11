import { useAuth } from '../contexts/AuthContext';

// Matriz de Controle de Acesso Baseada no Papel (RBAC) do Backend
const ROLE_PERMISSIONS = {
    superadmin: [
        'dashboard', 'clients', 'jobs', 'financial', 'materials', 'employees', 'auth_settings', 'pricing'
    ],
    gerente: [
        'dashboard', 'clients', 'jobs', 'financial', 'materials', 'employees', 'pricing'
    ],
    recepcao: [
        'dashboard', 'clients', 'jobs', 'pricing'
    ],
    producao: [
        'dashboard', 'jobs'
    ],
    contabil: [
        'dashboard', 'financial'
    ]
};

const usePermissions = () => {
    const { user, isLoading } = useAuth();

    /**
     * Verifica se o usuário autenticado possui acesso ao módulo especificado.
     * @param {string} module - O nome do módulo a ser validado (ex: 'financial', 'clients').
     * @returns {boolean} - true se tiver permissão, false caso contrário.
     */
    const can = (module) => {
        // Se o user não carregou ainda ou não tem role, negue
        if (!user || (!user.role && !user.user_type)) return false;

        // Suporte transicional: role ou user_type
        const role = user.role || user.user_type;

        // Resgata o array de permissões do papel. Se não existir, retorna array vazio
        const permissions = ROLE_PERMISSIONS[role] || [];

        return permissions.includes(module);
    };

    /**
     * Retorna o array bruto de permissões atrelado à sessão atual
     */
    const getMyPermissions = () => {
        if (!user || (!user.role && !user.user_type)) return [];
        const role = user.role || user.user_type;
        return ROLE_PERMISSIONS[role] || [];
    };

    return {
        can,
        getMyPermissions,
        isSuperAdmin: () => (user?.role || user?.user_type) === 'superadmin',
        isLoading
    };
};

export default usePermissions;
