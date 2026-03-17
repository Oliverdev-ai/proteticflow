/**
 * Login — ProteticFlow "Atelier Digital"
 * Tela de login com background hero e formulário elegante
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLocation("/");
    }, 800);
  };

  const loginBg = "https://d2xsxph8kpxj0f.cloudfront.net/310419663031704091/e5qym9UxhBWYiSZbfAJzwi/proteticflow-login-bg-ZMBdRiYqBahUXf7E2DitdB.webp";

  return (
    <div className="min-h-screen flex">
      {/* Left: Image */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative">
        <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar/80 via-sidebar/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-sm">PF</span>
            </div>
            <span className="font-heading font-bold text-xl text-white">ProteticFlow</span>
          </div>
          <div className="max-w-md">
            <h2 className="font-heading text-3xl font-bold text-white leading-tight mb-4">
              Gestão inteligente para seu laboratório de prótese
            </h2>
            <p className="text-white/70 font-body text-base leading-relaxed">
              Controle trabalhos, clientes, prazos e finanças em uma plataforma integrada com inteligência artificial.
            </p>
          </div>
          <p className="text-white/40 text-xs font-body">
            &copy; 2026 ProteticFlow. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-sm">PF</span>
            </div>
            <span className="font-heading font-bold text-xl text-foreground">ProteticFlow</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-heading font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground font-body mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-body font-medium">E-mail</Label>
              <input
                type="email"
                defaultValue="patricia@proteticflow.com"
                className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-body font-medium">Senha</Label>
                <button type="button" className="text-xs text-primary font-body hover:underline">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  defaultValue="demo1234"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-muted/50 border border-border/60 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn size={18} />
                  Entrar
                </div>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground font-body mt-8">
            Não tem uma conta?{" "}
            <button className="text-primary font-medium hover:underline">
              Solicitar acesso
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
