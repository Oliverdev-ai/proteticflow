import { Outlet, Navigate } from 'react-router-dom';
import { authService } from '@/services/api';
import Sidebar from './Sidebar';

export default function Layout() {
  // Verificar se o usuário está autenticado
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar para desktop */}
      <Sidebar />
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center px-6 justify-between">
          <div className="flex items-center">
            {/* Sidebar para mobile */}
            <Sidebar isMobile={true} />
            <h1 className="text-xl font-semibold ml-2 md:ml-0">LabManager</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

