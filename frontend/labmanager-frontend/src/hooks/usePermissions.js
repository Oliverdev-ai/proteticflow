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
    const { user, permissions: authPerms, isLoading } = useAuth();

    /**
     * Verifica se o usuário autenticado possui acesso ao módulo especificado.
     * @param {string} module - O nome do módulo a ser validado (ex: 'financial', 'clients').
     * @returns {boolean} - true se tiver permissão, false caso contrário.
     */
    const can = (module) => {
        // Obter o role do user diretamente
        const role = user?.role;
        if (!role) return false;

        // Resgata o array de permissões do papel. Se não existir, retorna array vazio
        const permissions = ROLE_PERMISSIONS[role] || [];

        return permissions.includes(module);
    };

    /**
     * Retorna o array bruto de permissões atrelado à sessão atual
     */
    const getMyPermissions = () => {
        const role = user?.role;
        if (!role) return [];
        return ROLE_PERMISSIONS[role] || [];
    };

    return {
        can,
        getMyPermissions,
        isSuperAdmin: () => {
            return user?.role === 'superadmin';
        },
        isLoading
    };
};

export default usePermissions;
