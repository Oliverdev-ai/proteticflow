/**
 * ConfigLab.tsx — ProteticFlow
 * Página de Configurações do Laboratório (admin-only).
 * Permite configurar: nome, CNPJ, contato, endereço, logo, header/footer de relatórios e cor primária.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2, Phone, Mail, MapPin, FileText, Palette,
  Upload, Save, AlertCircle, CheckCircle2, Image
} from "lucide-react";

export default function ConfigLab() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch settings
  const { data: settings, isLoading, refetch } = trpc.pdfReports.getLabSettings.useQuery();

  // Form state
  const [form, setForm] = useState({
    labName: "",
    cnpj: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    reportHeader: "",
    reportFooter: "",
    primaryColor: "#1a56db",
  });
  const [initialized, setInitialized] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Initialize form when data loads
  if (settings && !initialized) {
    setForm({
      labName: settings.labName ?? "",
      cnpj: settings.cnpj ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      city: settings.city ?? "",
      state: settings.state ?? "",
      zipCode: settings.zipCode ?? "",
      reportHeader: settings.reportHeader ?? "",
      reportFooter: settings.reportFooter ?? "Documento gerado pelo ProteticFlow",
      primaryColor: settings.primaryColor ?? "#1a56db",
    });
    if (settings.logoUrl) setLogoPreview(settings.logoUrl);
    setInitialized(true);
  }

  // Mutations
  const updateSettings = trpc.pdfReports.updateLabSettings.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Configurações salvas", { description: "As configurações do laboratório foram atualizadas." });
    },
    onError: (e) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const uploadLogo = trpc.pdfReports.uploadLogo.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      refetch();
      toast.success("Logo enviada", { description: "A logo do laboratório foi atualizada." });
    },
    onError: (e) => toast.error("Erro ao enviar logo", { description: e.message }),
  });

  // Redirect non-admins
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const handleSave = () => {
    updateSettings.mutate({
      labName: form.labName || undefined,
      cnpj: form.cnpj || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zipCode: form.zipCode || null,
      reportHeader: form.reportHeader || null,
      reportFooter: form.reportFooter || null,
      primaryColor: /^#[0-9A-Fa-f]{6}$/.test(form.primaryColor) ? form.primaryColor : null,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido", { description: "Use PNG, JPEG, WebP ou SVG." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Máximo 2MB." });
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadLogo.mutateAsync({
          base64,
          mimeType: file.type as any,
          filename: file.name,
        });
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingLogo(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações do Laboratório</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dados exibidos no cabeçalho e rodapé de todos os relatórios PDF.
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4" />
              Logo do Laboratório
            </CardTitle>
            <CardDescription>
              Aparece no cabeçalho de todos os relatórios PDF. PNG ou SVG com fundo transparente recomendado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Preview */}
              <div className="w-32 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? "Enviando..." : "Enviar Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG • Máx. 2MB</p>
                {logoPreview && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Logo configurada
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Laboratório */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Dados do Laboratório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="labName">Nome do Laboratório *</Label>
                <Input
                  id="labName"
                  value={form.labName}
                  onChange={set("labName")}
                  placeholder="Ex: Lab Prótese Silva"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={set("cnpj")}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  <Phone className="h-3.5 w-3.5 inline mr-1" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="email">
                  <Mail className="h-3.5 w-3.5 inline mr-1" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="contato@laboratorio.com.br"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="address">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Endereço
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={set("address")}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={form.city} onChange={set("city")} placeholder="São Paulo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">UF</Label>
                <Input id="state" value={form.state} onChange={set("state")} placeholder="SP" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zipCode">CEP</Label>
                <Input id="zipCode" value={form.zipCode} onChange={set("zipCode")} placeholder="00000-000" maxLength={10} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Relatório */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Configurações de Relatório PDF
            </CardTitle>
            <CardDescription>
              Textos exibidos no cabeçalho e rodapé de todos os relatórios gerados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reportHeader">Texto do Cabeçalho</Label>
              <Textarea
                id="reportHeader"
                value={form.reportHeader}
                onChange={set("reportHeader")}
                placeholder="Ex: Laboratório de Prótese Dentária | CRO-SP 12345 | Especializado em Próteses sobre Implantes"
                rows={2}
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">Aparece abaixo do nome e CNPJ no cabeçalho. Máx. 512 caracteres.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reportFooter">Texto do Rodapé</Label>
              <Textarea
                id="reportFooter"
                value={form.reportFooter}
                onChange={set("reportFooter")}
                placeholder="Ex: Documento gerado pelo ProteticFlow | Confidencial"
                rows={2}
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">Aparece no rodapé de cada página, ao lado da numeração. Máx. 512 caracteres.</p>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="primaryColor" className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cor Primária dos Relatórios
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={form.primaryColor}
                  onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.primaryColor}
                  onChange={set("primaryColor")}
                  placeholder="#1a56db"
                  maxLength={7}
                  className="w-32 font-mono"
                />
                <div
                  className="flex-1 h-10 rounded-md border border-border"
                  style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}88)` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Cor usada no cabeçalho, títulos de seção e bordas das tabelas nos PDFs.</p>
            </div>
          </CardContent>
        </Card>

        {/* Preview do Cabeçalho */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview do Cabeçalho PDF</CardTitle>
            <CardDescription>Visualização aproximada de como ficará o cabeçalho dos relatórios.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg p-4 text-white"
              style={{ backgroundColor: form.primaryColor }}
            >
              <div className="flex items-start justify-between">
                <div>
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo" className="h-8 mb-2 object-contain" />
                  )}
                  <div className="font-bold text-lg">{form.labName || "Nome do Laboratório"}</div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {[form.cnpj && `CNPJ: ${form.cnpj}`, form.phone, form.email].filter(Boolean).join("  |  ")}
                  </div>
                  {form.reportHeader && (
                    <div className="text-xs opacity-70 mt-0.5">{form.reportHeader}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">Relatório de Exemplo</div>
                  <div className="text-xs opacity-80">Período: Março/2026</div>
                  <div className="text-xs opacity-70">Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
                </div>
              </div>
            </div>
            <div className="mt-2 px-4 py-2 bg-muted/30 rounded-b-lg border border-t-0 border-border">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{form.reportFooter || "Rodapé do relatório"}</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aviso */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Nota:</strong> As configurações aqui salvas são aplicadas imediatamente em todos os novos relatórios PDF gerados. Relatórios já gerados não são afetados.
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={updateSettings.isPending} size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
