import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import axios from 'axios';
import { API_URL, authService } from '@/services/api';

export default function MyProfileTab() {
    const [user, setUser] = useState(null);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [setupMode, setSetupMode] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [setupCode, setSetupCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const userData = authService.getCurrentUser();
            if (userData) {
                setUser(userData);
                setIs2FAEnabled(userData.is_two_factor_enabled || false);
            }
        };
        fetchUser();
    }, []);

    const start2FASetup = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.post(`${API_URL}/api/v1/auth/2fa/setup/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQrCode(response.data.qr_code);
            setSetupMode(true);
        } catch (error) {
            toast({
                title: "Erro",
                description: error.response?.data?.detail || "Erro ao iniciar configuração do 2FA",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const verify2FASetup = async () => {
        if (!setupCode || setupCode.length !== 6) {
            toast({ title: "Erro", description: "Código deve ter 6 dígitos", variant: "destructive" });
            return;
        }
        try {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/api/v1/auth/2fa/verify-setup/`, { code: setupCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIs2FAEnabled(true);
            setSetupMode(false);

            // Update local storage user data
            const userData = { ...user, is_two_factor_enabled: true };
            localStorage.setItem('user_data', JSON.stringify(userData));
            setUser(userData);

            toast({
                title: "Sucesso!",
                description: "Autenticação em Dois Fatores ativada com segurança."
            });
        } catch (error) {
            toast({
                title: "Erro de Validação",
                description: error.response?.data?.detail || "Código incorreto. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return <div className="p-8 text-center text-muted-foreground">Carregando perfil...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Meu Perfil</CardTitle>
                    <CardDescription>Informações básicas da sua conta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome de Usuário</Label>
                            <Input value={user.username} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Nível de Acesso (Role)</Label>
                            <Input value={user.role?.toUpperCase()} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={user.first_name || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>E-mail</Label>
                            <Input value={user.email || ''} disabled />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-rose-700">
                        <Shield className="w-5 h-5 mr-2" /> Segurança e Acesso
                    </CardTitle>
                    <CardDescription>
                        Proteja sua conta utilizando a Autenticação em Dois Fatores (Google Authenticator)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!setupMode ? (
                        <div className="bg-slate-50 p-6 rounded-lg border flex flex-col items-center text-center">
                            {is2FAEnabled ? (
                                <>
                                    <ShieldCheck className="w-16 h-16 text-green-500 mb-4" />
                                    <h3 className="text-lg font-bold text-green-700">2FA Ativado</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                        Sua conta está protegida. Durante o login, solicitaremos o código gerado no seu celular.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
                                    <h3 className="text-lg font-bold text-amber-700">2FA Desativado</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                        Para contas com acesso financeiro ou administrativo, é altamente recomendado habilitar o 2FA.
                                    </p>
                                    <Button
                                        className="mt-6"
                                        onClick={start2FASetup}
                                        disabled={isLoading}
                                    >
                                        Mágica da Segurança: Ativar Agora
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-blue-900 mb-2">Escaneie o QR Code</h3>
                            <p className="text-sm text-blue-700 text-center max-w-sm mb-6">
                                Abra o aplicativo Google Authenticator ou Authy no seu celular, adicione uma nova conta e aponte a câmera para esta imagem.
                            </p>

                            {qrCode && (
                                <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                                    <img src={`data:image/png;base64,${qrCode}`} alt="QR Code 2FA" className="w-48 h-48" />
                                </div>
                            )}

                            <div className="space-y-2 w-full max-w-xs">
                                <Label htmlFor="code" className="text-center block">Código de 6 dígitos</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    maxLength={6}
                                    value={setupCode}
                                    onChange={(e) => setSetupCode(e.target.value)}
                                    placeholder="000000"
                                    className="text-center text-2xl tracking-[0.3em] font-mono"
                                />
                            </div>

                            <div className="flex gap-4 mt-6">
                                <Button variant="outline" onClick={() => setSetupMode(false)} disabled={isLoading}>Cancelar</Button>
                                <Button onClick={verify2FASetup} disabled={setupCode.length !== 6 || isLoading}>
                                    Confirmar e Ativar
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
