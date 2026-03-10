import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { authService } from '@/services/api';
import { 
  HomeIcon, 
  Users, 
  Briefcase, 
  DollarSign, 
  Settings, 
  LogOut, 
  Menu
} from 'lucide-react';

export default function Sidebar({ isMobile = false }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const NavItems = () => (
    <div className="space-y-1">
      <Link to="/dashboard">
        <Button variant="ghost" className="w-full justify-start">
          <HomeIcon className="mr-2 h-5 w-5" />
          Dashboard
        </Button>
      </Link>
      <Link to="/clients">
        <Button variant="ghost" className="w-full justify-start">
          <Users className="mr-2 h-5 w-5" />
          Clientes
        </Button>
      </Link>
      <Link to="/jobs">
        <Button variant="ghost" className="w-full justify-start">
          <Briefcase className="mr-2 h-5 w-5" />
          Trabalhos
        </Button>
      </Link>
      <Link to="/pricing">
        <Button variant="ghost" className="w-full justify-start">
          <DollarSign className="mr-2 h-5 w-5" />
          Tabelas de Preços
        </Button>
      </Link>
      <Link to="/settings">
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="mr-2 h-5 w-5" />
          Configurações
        </Button>
      </Link>
      <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
        <LogOut className="mr-2 h-5 w-5" />
        Sair
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col h-full">
            <div className="py-6">
              <h2 className="text-2xl font-bold text-center mb-6">LabManager</h2>
              <NavItems />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:flex flex-col h-screen w-64 border-r bg-card">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">LabManager</h2>
        <NavItems />
      </div>
    </div>
  );
}

