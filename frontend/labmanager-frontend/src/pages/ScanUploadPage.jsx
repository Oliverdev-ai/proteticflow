import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Maximize2,
  Box,
  User,
  Activity,
  Calendar,
  Search,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  scanService,
  API_URL 
} from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ScanUploadPage = () => {
  const [files, setFiles] = useState({ xml: null, stl_upper: null, stl_lower: null, gallery: null });
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (type, file) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    
    // Se for XML, podemos tentar um preview básico ou apenas aguardar o upload
    if (type === 'xml') {
      toast({ title: "XML carregado", description: "O sistema processará os metadados ao fazer o upload." });
    }
  };

  const handleUpload = async () => {
    if (!files.xml) {
      toast({ 
        title: "Erro", 
        description: "O arquivo XML é obrigatório.", 
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('xml_file', files.xml);
    if (files.stl_upper) formData.append('stl_upper', files.stl_upper);
    if (files.stl_lower) formData.append('stl_lower', files.stl_lower);
    if (files.gallery) formData.append('gallery_image', files.gallery);
    if (selectedJobId) formData.append('job_id', selectedJobId);

    try {
      const data = await scanService.upload(formData);
      
      setScanResult(data);
      toast({ 
        title: "Sucesso!", 
        description: `Scan ${response.data.order_id} importado com sucesso.`,
      });
      setIsConfirmModalOpen(true);
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error.response?.data?.error || error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendToPrinter = async () => {
    if (!scanResult) return;
    try {
      await scanService.sendToPrinter(scanResult.id);
      toast({ title: "Enviado!", description: "STL enviado para a fila de impressão." });
      // Atualizar status local
      setScanResult(prev => ({ ...prev, print_status: 'sent' }));
    } catch (error) {
      toast({
        title: "Erro ao imprimir",
        description: error.response?.data?.error || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Módulo de Scans 3D
        </h1>
        <p className="text-xl text-muted-foreground">
          Importe arquivos do iTero e envie para sua impressora 3D em segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna de Upload */}
        <Card className="border-2 border-dashed bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <span>Importar Arquivos</span>
            </CardTitle>
            <CardDescription>Formatos suportados: XML (iTero) e STL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Arquivo XML (Obrigatório)</Label>
              <Input 
                type="file" 
                accept=".xml" 
                onChange={(e) => handleFileChange('xml', e.target.files[0])}
                className="bg-background"
              />
              {files.xml && (
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {files.xml.name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">STL Superior</Label>
                <Input 
                  type="file" 
                  accept=".stl" 
                  onChange={(e) => handleFileChange('stl_upper', e.target.files[0])}
                  className="bg-background text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">STL Inferior</Label>
                <Input 
                  type="file" 
                  accept=".stl" 
                  onChange={(e) => handleFileChange('stl_lower', e.target.files[0])}
                  className="bg-background text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs font-semibold">Vincular a Trabalho (Opcional)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ID do Trabalho (Order Number)..." 
                  className="pl-8 bg-background"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-12 text-lg font-bold transition-all hover:scale-[1.02]" 
              onClick={handleUpload}
              disabled={uploading || !files.xml}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando XML...
                </>
              ) : (
                'Processar e Importar'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Coluna de Instruções / Status */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-indigo-900">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-600 text-white rounded-full p-1 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <p className="text-sm text-indigo-800">Nosso <b>iTero Parser</b> extrai automaticamente Patient Name, Doctor, Due Date e observações do XML.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-600 text-white rounded-full p-1 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <p className="text-sm text-indigo-800">O sistema tenta encontrar o cliente (dentista) no seu banco de dados automaticamente.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-600 text-white rounded-full p-1 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <p className="text-sm text-indigo-800">Após a confirmação, você pode enviar o modelo STL diretamente para sua <b>Impressora 3D</b> via rede local.</p>
              </div>
            </CardContent>
          </Card>

          {scanResult && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Scan Importado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Paciente:</span>
                  <span className="font-bold">{scanResult.patient_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Order ID:</span>
                  <code className="bg-green-100 px-1 rounded">{scanResult.order_id}</code>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Status Impressão:</span>
                  <Badge variant={scanResult.print_status === 'pending' ? 'outline' : 'default'} className="bg-white">
                    {scanResult.print_status_display}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSendToPrinter}
                  disabled={scanResult.print_status !== 'pending'}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Enviar para Impressora
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Confirmação com Detalhes */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Scan Importado</DialogTitle>
            <DialogDescription>
              Confira os dados extraídos do arquivo XML.
            </DialogDescription>
          </DialogHeader>
          
          {scanResult && (
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-primary">
                  <User className="h-5 w-5" />
                  <h3 className="font-bold">Informações Básicas</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Paciente</Label>
                  <p className="font-medium">{scanResult.patient_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Dentista / CRO</Label>
                  <p className="font-medium">{scanResult.doctor_name} {scanResult.doctor_license && `(${scanResult.doctor_license})`}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Procedimento</Label>
                  <p className="font-medium">{scanResult.procedure || 'Não especificado'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-primary">
                  <Calendar className="h-5 w-5" />
                  <h3 className="font-bold">Datas e Vínculos</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Data do Scan / Prazo</Label>
                  <p className="font-medium">{scanResult.scan_date} / {scanResult.due_date || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Trabalho Vinculado</Label>
                  <p className="font-medium">{scanResult.job_order_number || 'Nenhum'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Arquivos STL</Label>
                  <div className="flex space-x-2">
                    {scanResult.stl_upper && <Badge variant="secondary">Superior</Badge>}
                    {scanResult.stl_lower && <Badge variant="secondary">Inferior</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Fechar</Button>
            <Button onClick={handleSendToPrinter} disabled={!scanResult?.stl_upper && !scanResult?.stl_lower}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanUploadPage;
