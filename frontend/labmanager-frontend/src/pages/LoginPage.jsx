import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA States
  const [requires2FA, setRequires2FA] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const credentials = {
        username: username,
        password: password
      };
      const response = await authService.login(credentials);

      if (response && response.require_2fa) {
        setRequires2FA(true);
        setUserId(response.user_id);
        setIsSetupRequired(response.is_setup_required);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Credenciais inválidas. Por favor, verifique seu usuário e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSetupRequired) {
        setError('O administrador precisa habilitar o 2FA primeiro. Entre com outro usuário.');
        setIsLoading(false);
        return;
      }

      await authService.login2FA(userId, twoFactorCode);
      navigate('/dashboard');
    } catch (err) {
      setError('Código 2FA inválido ou expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">LabManager</CardTitle>
          <CardDescription className="text-center">
            Sistema de Gerenciamento para Laboratório de Prótese
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!requires2FA ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    placeholder="Digite seu nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
                <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
                  <strong>Credenciais de teste:</strong><br />
                  Usuário: admin<br />
                  Senha: SuperAdmin@2025!
                </div>
              </div>
              <Button className="w-full mt-6" type="submit" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit}>
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sua conta possui alto nível de privilégios. <br />
                    Insira o código de 6 dígitos gerado pelo seu Authenticator.
                  </p>
                  <Label htmlFor="totp">Código de Autenticação</Label>
                  <Input
                    id="totp"
                    type="text"
                    placeholder="Ex: 123456"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    required
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.2em] font-mono"
                    disabled={isSetupRequired}
                  />
                </div>

                {isSetupRequired && (
                  <div className="p-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md">
                    Sua conta precisa de configuração 2FA.<br />
                    Peça a outro superadmin para logar e ativar o seu 2FA nas Configurações - Perfil!
                  </div>
                )}

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
              </div>
              <Button className="w-full mt-6" type="submit" disabled={isLoading || isSetupRequired}>
                {isLoading ? 'Verificando...' : 'Autenticar'}
              </Button>
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => { setRequires2FA(false); setError(''); }}
                type="button"
              >
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            © 2025 LabManager - Todos os direitos reservados
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

