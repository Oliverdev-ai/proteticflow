import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { ImageIcon, UploadIcon, SaveIcon, CheckCircleIcon, PaletteIcon, BuildingIcon, PhoneIcon, MailIcon, GlobeIcon, FileTextIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/services/api';

export default function LabSettingsPage() {
  const [settings, setSettings] = useState({
    lab_name: '',
    logo: null,
    address: '',
    phone: '',
    email: '',
    website: '',
    report_header_text: '',
    report_footer_text: '',
    primary_color: '#2563eb',
    secondary_color: '#64748b'
  });
  
  const [logoPreview, setLogoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/financial/lab-settings/current/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSettings(response.data);
      if (response.data.logo_url) {
        setLogoPreview(response.data.logo_url);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações do laboratório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações do laboratório",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Formato de arquivo inválido. Use JPG, PNG ou SVG.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo é muito grande. Tamanho máximo: 2MB.",
        variant: "destructive"
      });
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Store file for upload
    setSettings(prev => ({
      ...prev,
      logo: file
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const formData = new FormData();
      Object.keys(settings).forEach(key => {
        if (key === 'logo' && settings[key] instanceof File) {
          formData.append('logo', settings[key]);
        } else if (key !== 'logo' || settings[key] === null) {
          formData.append(key, settings[key]);
        }
      });
      
      // Send request
      let response;
      if (settings.id) {
        response = await axios.patch(
          `${API_URL}/api/financial/lab-settings/${settings.id}/`, 
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/financial/lab-settings/`, 
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }
      
      setSettings(response.data);
      if (response.data.logo_url) {
        setLogoPreview(response.data.logo_url);
      }
      
      toast({
        title: "Sucesso",
        description: "Configurações do laboratório salvas com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações do laboratório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações do laboratório",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setSettings(prev => ({
      ...prev,
      logo: null
    }));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Carregando configurações...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Configurações do Laboratório</h1>
              <p className="text-blue-100 text-lg">Personalize sua identidade visual e informações de contato</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center">
                  <BuildingIcon className="h-5 w-5 mr-2" />
                  <span>Identidade Visual</span>
                </div>
                <div className="flex items-center">
                  <FileTextIcon className="h-5 w-5 mr-2" />
                  <span>Personalização de Documentos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                      <BuildingIcon className="h-6 w-6 mr-3 text-blue-600" />
                      Informações Básicas
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Dados principais do seu laboratório
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="lab_name" className="text-sm font-medium text-gray-700">
                        Nome do Laboratório *
                      </Label>
                      <Input
                        id="lab_name"
                        value={settings.lab_name}
                        onChange={(e) => handleInputChange('lab_name', e.target.value)}
                        required
                        placeholder="Nome do seu laboratório"
                        className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                        Endereço
                      </Label>
                      <Textarea
                        id="address"
                        value={settings.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Endereço completo"
                        className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                          Telefone
                        </Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                            <PhoneIcon className="h-4 w-4" />
                          </span>
                          <Input
                            id="phone"
                            value={settings.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="rounded-l-none border-2 border-gray-200 focus:border-blue-400"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email
                        </Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                            <MailIcon className="h-4 w-4" />
                          </span>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="contato@seulaboratorio.com"
                            className="rounded-l-none border-2 border-gray-200 focus:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                        Website
                      </Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                          <GlobeIcon className="h-4 w-4" />
                        </span>
                        <Input
                          id="website"
                          value={settings.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="www.seulaboratorio.com"
                          className="rounded-l-none border-2 border-gray-200 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Logo Upload */}
                <Card className="bg-white shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                      <ImageIcon className="h-6 w-6 mr-3 text-blue-600" />
                      Logomarca
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Sua identidade visual em documentos e relatórios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {logoPreview ? (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="border rounded-lg p-4 bg-gray-50 w-full flex justify-center">
                            <img 
                              src={logoPreview} 
                              alt="Logo Preview" 
                              className="max-h-48 max-w-full object-contain"
                            />
                          </div>
                          <div className="flex space-x-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="border-blue-200 text-blue-600"
                            >
                              <UploadIcon className="h-4 w-4 mr-2" />
                              Trocar Logo
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRemoveLogo}
                              className="border-red-200 text-red-600"
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 w-full flex flex-col items-center justify-center bg-gray-50">
                            <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-gray-500 text-center mb-4">
                              Arraste e solte sua logo aqui ou clique para selecionar
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="border-blue-200 text-blue-600"
                            >
                              <UploadIcon className="h-4 w-4 mr-2" />
                              Selecionar Arquivo
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500">
                            Formatos aceitos: JPG, PNG, SVG. Tamanho máximo: 2MB
                          </p>
                        </div>
                      )}
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoChange}
                        accept="image/jpeg,image/png,image/svg+xml"
                        className="hidden"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Appearance Settings */}
            <TabsContent value="appearance">
              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                  <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                    <PaletteIcon className="h-6 w-6 mr-3 text-blue-600" />
                    Cores e Aparência
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Personalize as cores da sua marca
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="primary_color" className="text-sm font-medium text-gray-700 flex items-center">
                          Cor Primária
                          <div 
                            className="ml-2 w-4 h-4 rounded-full" 
                            style={{ backgroundColor: settings.primary_color }}
                          ></div>
                        </Label>
                        <div className="flex">
                          <Input
                            id="primary_color"
                            type="color"
                            value={settings.primary_color}
                            onChange={(e) => handleInputChange('primary_color', e.target.value)}
                            className="w-12 h-12 p-1 rounded-l-md"
                          />
                          <Input
                            value={settings.primary_color}
                            onChange={(e) => handleInputChange('primary_color', e.target.value)}
                            className="rounded-l-none border-2 border-gray-200 focus:border-blue-400"
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          Cor principal para cabeçalhos e elementos de destaque
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="secondary_color" className="text-sm font-medium text-gray-700 flex items-center">
                          Cor Secundária
                          <div 
                            className="ml-2 w-4 h-4 rounded-full" 
                            style={{ backgroundColor: settings.secondary_color }}
                          ></div>
                        </Label>
                        <div className="flex">
                          <Input
                            id="secondary_color"
                            type="color"
                            value={settings.secondary_color}
                            onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                            className="w-12 h-12 p-1 rounded-l-md"
                          />
                          <Input
                            value={settings.secondary_color}
                            onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                            className="rounded-l-none border-2 border-gray-200 focus:border-blue-400"
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          Cor complementar para detalhes e elementos secundários
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="text-lg font-semibold mb-4">Prévia</h3>
                      
                      <div className="space-y-6">
                        <div 
                          className="rounded-lg p-4 text-white" 
                          style={{ backgroundColor: settings.primary_color }}
                        >
                          <h4 className="font-bold">Cabeçalho de Documento</h4>
                          <p className="text-sm opacity-90">Exemplo de texto em cor primária</p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: settings.primary_color }}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Título de Seção</p>
                            <p 
                              className="text-sm" 
                              style={{ color: settings.secondary_color }}
                            >
                              Subtítulo em cor secundária
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            className="text-white"
                            style={{ backgroundColor: settings.primary_color }}
                          >
                            Botão de Ação
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Document Settings */}
            <TabsContent value="documents">
              <Card className="bg-white shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                  <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileTextIcon className="h-6 w-6 mr-3 text-blue-600" />
                    Personalização de Documentos
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Configure textos personalizados para relatórios e documentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <Label htmlFor="report_header_text" className="text-sm font-medium text-gray-700">
                        Texto do Cabeçalho
                      </Label>
                      <Textarea
                        id="report_header_text"
                        value={settings.report_header_text}
                        onChange={(e) => handleInputChange('report_header_text', e.target.value)}
                        placeholder="Texto que aparecerá no cabeçalho dos relatórios e documentos"
                        className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                        rows={3}
                      />
                      <p className="text-sm text-gray-500">
                        Este texto aparecerá no topo de todos os relatórios e documentos gerados
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="report_footer_text" className="text-sm font-medium text-gray-700">
                        Texto do Rodapé
                      </Label>
                      <Textarea
                        id="report_footer_text"
                        value={settings.report_footer_text}
                        onChange={(e) => handleInputChange('report_footer_text', e.target.value)}
                        placeholder="Texto que aparecerá no rodapé dos relatórios e documentos"
                        className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                        rows={3}
                      />
                      <p className="text-sm text-gray-500">
                        Este texto aparecerá no rodapé de todos os relatórios e documentos gerados
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="border rounded-lg p-6 bg-gray-50">
                      <h3 className="text-lg font-semibold mb-4">Prévia do Documento</h3>
                      
                      <div className="border rounded-lg bg-white p-6 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-4 mb-6">
                          <div className="flex items-center space-x-4">
                            {logoPreview && (
                              <img 
                                src={logoPreview} 
                                alt="Logo" 
                                className="h-12 w-auto object-contain"
                              />
                            )}
                            <div>
                              <h2 className="font-bold text-lg">{settings.lab_name || 'Nome do Laboratório'}</h2>
                              <p className="text-sm text-gray-600">{settings.address || 'Endereço do Laboratório'}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p>{settings.phone || 'Telefone'}</p>
                            <p>{settings.email || 'Email'}</p>
                          </div>
                        </div>
                        
                        {/* Header Text */}
                        {settings.report_header_text && (
                          <div className="text-sm italic text-gray-600 mb-6">
                            {settings.report_header_text}
                          </div>
                        )}
                        
                        {/* Document Content (Sample) */}
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Relatório de Exemplo</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Este é um exemplo de como seus documentos ficarão com as configurações atuais.
                          </p>
                          
                          <div className="border-t border-b py-2 my-4">
                            <div className="flex justify-between text-sm">
                              <span>Item de exemplo</span>
                              <span>R$ 100,00</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer Text */}
                        {settings.report_footer_text && (
                          <div className="text-sm italic text-gray-600 mt-6 pt-4 border-t">
                            {settings.report_footer_text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center">
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
