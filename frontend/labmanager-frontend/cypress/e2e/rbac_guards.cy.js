describe('Testes de Permissão de Interface (RBAC)', () => {
    // Define os mock functions para interceptar os logins do backend
    const interceptLogin = (role) => {
        cy.intercept('POST', '**/api/v1/auth/login/', {
            statusCode: 200,
            body: {
                access: 'fake-token-123',
                refresh: 'fake-token-456',
                user: {
                    id: 1,
                    username: `user_${role}`,
                    email: `${role}@test.com`,
                    role: role,
                    name: `Testador ${role}`,
                    is_active: true
                }
            }
        }).as(`login${role}`);

        // Mock para permissões request caso Sidebar/AuthContext chame
        cy.intercept('GET', '**/api/v1/accounts/permissions/', {
            statusCode: 200,
            body: {
                role: role,
                can_access_financial_reports: role === 'superadmin' || role === 'gerente',
                can_modify_settings: role === 'superadmin' || role === 'gerente',
                can_delete_records: role === 'superadmin',
                is_admin: role === 'superadmin' || role === 'gerente'
            }
        }).as(`permissons${role}`);
    };

    beforeEach(() => {
        cy.visit('/login');
    });

    it('1. PRODUCAO: Visualiza limitadamente os menus (Dashboard/Trabalhos)', () => {
        interceptLogin('producao');
        cy.get('input[type="text"], input[type="email"]').type('producao');
        cy.get('input[type="password"]').type('123');
        cy.get('button[type="submit"]').click();

        // AuthContext pode levar um instante
        cy.url().should('include', '/dashboard');

        // O Menu lateral não deve mostrar botão de Financeiro ou Configurações
        cy.get('nav, aside').contains('Dashboard').should('exist');
        cy.get('nav, aside').contains('Trabalhos').should('exist');
        cy.get('nav, aside').contains('Financeiro').should('not.exist');
        cy.get('nav, aside').contains('Configurações').should('not.exist');

        // Tentar acessar manualmente via URL as configurações: agora permitido (BUG-B)
        cy.visit('/settings');
        cy.contains('Meu Perfil').should('be.visible');
        cy.contains('Funcionários').should('not.exist');
        cy.contains('Autorizações').should('not.exist');
    });

    it('2. GERENTE: Visualiza Finanças, Clientes mas falha no acesso avançado', () => {
        interceptLogin('gerente');
        cy.get('input[type="text"], input[type="email"]').type('gerente');
        cy.get('input[type="password"]').type('123');
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');

        // O Menu lateral deve mostrar Configurações, mas não tudo
        cy.get('nav, aside').contains('Configurações').should('exist');
        cy.get('nav, aside').contains('Clientes').should('exist');

        cy.visit('/settings');

        // Dentro das configurações, o gerente deve ver Funcionários.
        // Dependendo do setup do defaultTab se ele não tiver auth_settings:
        cy.contains('Funcionários').should('exist');

        // O gerente não deveria ver a aba Autorizações (isso requer auth_settings de admin)
        cy.contains('Autorizações').should('not.exist');
    });

    it('3. SUPERADMIN: Tem acesso global a todas abas', () => {
        interceptLogin('superadmin');
        cy.get('input[type="text"], input[type="email"]').type('superadmin');
        cy.get('input[type="password"]').type('123');
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');

        // Visitar Configurações
        cy.visit('/settings');

        // Deve ver a aba de Autorizações e Geral do Lab
        cy.contains('Autorizações').should('exist');
        cy.contains('Laboratório').should('exist');

        // Clicar em Autorizações deve renderizar a matriz de permissões 
        cy.contains('Autorizações').click();
        cy.contains('Matriz de Autorizações').should('be.visible');
        cy.contains('SuperAdmin').should('exist');
    });
});
