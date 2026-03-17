/**
 * Configurações — ProteticFlow "Atelier Digital"
 * Tabs: Perfil, Organização, Integrações, Notificações
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  Puzzle,
  BellRing,
  Save,
  Shield,
  Key,
  Globe,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function Configuracoes() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    deadlines: true,
    newJobs: true,
    financial: false,
  });

  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Gerencie seu perfil, organização e preferências
        </p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="perfil" className="rounded-lg text-xs font-body data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <User size={14} className="mr-1.5" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="organizacao" className="rounded-lg text-xs font-body data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Building2 size={14} className="mr-1.5" /> Organização
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="rounded-lg text-xs font-body data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Puzzle size={14} className="mr-1.5" /> Integrações
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="rounded-lg text-xs font-body data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BellRing size={14} className="mr-1.5" /> Notificações
            </TabsTrigger>
          </TabsList>

          {/* Perfil Tab */}
          <TabsContent value="perfil" className="space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-heading">Informações Pessoais</CardTitle>
                <CardDescription className="font-body text-sm">Atualize seus dados de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-heading font-bold">PL</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="text-xs font-body" onClick={() => toast("Upload de foto em breve")}>
                      Alterar foto
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 font-body">JPG ou PNG. Máx. 2MB.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Nome completo</Label>
                    <input type="text" defaultValue="Patricia Lopes" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">E-mail</Label>
                    <input type="email" defaultValue="patricia@proteticflow.com" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Telefone</Label>
                    <input type="tel" defaultValue="(11) 99999-0000" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Cargo</Label>
                    <input type="text" defaultValue="Administradora" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={() => toast.success("Perfil atualizado com sucesso!")}>
                    <Save size={16} className="mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-destructive" />
                  <CardTitle className="text-base font-heading">Segurança</CardTitle>
                </div>
                <CardDescription className="font-body text-sm">Gerencie sua senha e autenticação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Key size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-body font-medium text-foreground">Alterar Senha</p>
                      <p className="text-xs text-muted-foreground font-body">Última alteração: 15/01/2026</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs font-body" onClick={() => toast("Alteração de senha em breve")}>
                    Alterar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-body font-medium text-foreground">Autenticação 2FA</p>
                      <p className="text-xs text-muted-foreground font-body">Adicione uma camada extra de segurança</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organização Tab */}
          <TabsContent value="organizacao" className="space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-heading">Dados do Laboratório</CardTitle>
                <CardDescription className="font-body text-sm">Informações da sua organização</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Nome do Laboratório</Label>
                    <input type="text" defaultValue="ProteticFlow Lab" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">CNPJ</Label>
                    <input type="text" defaultValue="12.345.678/0001-90" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Endereço</Label>
                    <input type="text" defaultValue="Rua das Próteses, 123" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-body font-medium">Cidade/UF</Label>
                    <input type="text" defaultValue="São Paulo, SP" className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={() => toast.success("Organização atualizada!")}>
                    <Save size={16} className="mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrações Tab */}
          <TabsContent value="integracoes" className="space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-heading">Integrações Disponíveis</CardTitle>
                <CardDescription className="font-body text-sm">Conecte o ProteticFlow com outras ferramentas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "WhatsApp Business", desc: "Envie notificações de entrega automaticamente", icon: "💬", connected: false },
                  { name: "Google Calendar", desc: "Sincronize prazos com sua agenda", icon: "📅", connected: true },
                  { name: "Nota Fiscal Eletrônica", desc: "Emita NF-e diretamente pelo sistema", icon: "📄", connected: false },
                  { name: "Contabilidade", desc: "Integre com seu sistema contábil", icon: "📊", connected: false },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="text-sm font-body font-medium text-foreground">{integration.name}</p>
                        <p className="text-xs text-muted-foreground font-body">{integration.desc}</p>
                      </div>
                    </div>
                    <Button
                      variant={integration.connected ? "outline" : "default"}
                      size="sm"
                      className={`text-xs font-body ${integration.connected ? "" : "bg-primary text-primary-foreground"}`}
                      onClick={() => toast(integration.connected ? "Desconectar integração" : "Conectar integração", { description: "Funcionalidade em breve" })}
                    >
                      {integration.connected ? "Conectado" : "Conectar"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificações Tab */}
          <TabsContent value="notificacoes" className="space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-heading">Preferências de Notificação</CardTitle>
                <CardDescription className="font-body text-sm">Escolha como deseja ser notificado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "email" as const, label: "Notificações por E-mail", desc: "Receba atualizações no seu e-mail", icon: Mail },
                  { key: "deadlines" as const, label: "Alertas de Prazo", desc: "Seja notificado quando prazos estão próximos", icon: BellRing },
                  { key: "newJobs" as const, label: "Novos Trabalhos", desc: "Notificação quando um novo trabalho é cadastrado", icon: Puzzle },
                  { key: "financial" as const, label: "Relatórios Financeiros", desc: "Resumo semanal de faturamento", icon: Globe },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-body font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground font-body">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
