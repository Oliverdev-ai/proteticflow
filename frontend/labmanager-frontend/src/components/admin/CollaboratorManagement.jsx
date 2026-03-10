import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/api';
import { useToast } from '../ui/use-toast';

const CollaboratorManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    password_confirm: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirm) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      await authService.createCollaborator(formData);
      
      toast({
        title: "Sucesso",
        description: "Colaborador criado com sucesso!",
        variant: "default"
      });
      
      // Limpa o formulário
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        password_confirm: ''
      });
      
    } catch (error) {
      console.error('Erro ao criar colaborador:', error);
      
      let errorMessage = "Erro ao criar colaborador.";
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          errorMessage = Object.values(errors).flat().join(' ');
        } else {
          errorMessage = errors;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Cadastrar Novo Colaborador
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">Apenas Administradores</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="usuario123"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="colaborador@email.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                placeholder="João"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome *</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                placeholder="Silva"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Senha forte"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirmar Senha *</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type={showPassword ? "text" : "password"}
                value={formData.password_confirm}
                onChange={handleInputChange}
                required
                placeholder="Confirme a senha"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Permissões do Colaborador:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Cadastrar novos trabalhos e clientes</li>
              <li>✅ Dar baixa em trabalhos (marcar como concluídos)</li>
              <li>✅ Visualizar roteiros de entrega</li>
              <li>✅ Acessar informações básicas de clientes e trabalhos</li>
              <li>✅ Usar assistente de IA para cadastros e baixas</li>
              <li>❌ Acessar relatórios financeiros</li>
              <li>❌ Alterar configurações do sistema</li>
              <li>❌ Excluir registros</li>
            </ul>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isCreating}
          >
            {isCreating ? "Criando..." : "Criar Colaborador"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CollaboratorManagement;

