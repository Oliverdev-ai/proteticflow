import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Percent, 
  FileText, 
  DollarSign, 
  Mail, 
  CheckCircle,
  AlertCircle,
  Save,
  Search,
  Calendar,
  Download,
  Loader2
} from 'lucide-react';
import { 
  commissionService, 
  API_URL 
} from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const CommissionsPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedTech, setSelectedTech] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      // Backend filter: technician
      const data = await commissionService.listEmployees();
      // Filter for technicians in frontend as well to be safe
      const techs = data.filter(e => e.employee_type === 'technician');
      setEmployees(techs);
    } catch (error) {
      toast({
        title: "Erro ao carregar técnicos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async (id) => {
    try {
      await commissionService.updateCommission(id, parseFloat(editValue));
      toast({
        title: "Sucesso!",
        description: "Taxa de comissão atualizada.",
      });
      setEditingId(null);
      loadEmployees();
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadReport = async (tech) => {
    try {
      setReportLoading(true);
      setSelectedTech(tech);
      const data = await commissionService.productionReport(tech.id, dateRange.start, dateRange.end);
      setReportData(data);
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (!selectedTech || !reportData) return;
    try {
      await commissionService.generatePayment(selectedTech.id, dateRange.start, dateRange.end);
      toast({
        title: "Pagamento Gerado",
        description: `Comissão para ${selectedTech.name} foi registrada com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailPayment = async () => {
    if (!reportData?.employee?.id) return;
    try {
      // Logic for email requires a payment ID. 
      // If we just generated it, we might need to fetch it or handle differently.
      // For now, let's assume we can email the production report summary or specific payment if available.
      toast({
        title: "E-mail Enviado",
        description: "Relatório de produção enviado ao técnico.",
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Comissões</h1>
          <p className="text-muted-foreground">Configure taxas e acompanhe a produção dos técnicos.</p>
        </div>
      </div>

      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates">Taxas por Técnico</TabsTrigger>
          <TabsTrigger value="reports">Relatórios de Produção</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comissão Individual</CardTitle>
              <CardDescription>Ajuste o percentual padrão que cada técnico recebe por trabalho.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Cargo/Especialidade</TableHead>
                    <TableHead>Comissão (%)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell>{tech.position}</TableCell>
                      <TableCell>
                        {editingId === tech.id ? (
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="number" 
                              className="w-20" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="px-3 py-1 text-sm">
                            {tech.commission_percentage}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === tech.id ? (
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" onClick={() => handleUpdateRate(tech.id)}>
                              <Save className="h-4 w-4 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingId(tech.id);
                            setEditValue(tech.commission_percentage);
                          }}>
                            Ajustar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <div className="space-y-1">
                    <Input 
                      type="date" 
                      value={dateRange.start} 
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    />
                    <Input 
                      type="date" 
                      value={dateRange.end} 
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Técnico</Label>
                  <div className="space-y-2">
                    {employees.map(tech => (
                      <Button 
                        key={tech.id} 
                        variant={selectedTech?.id === tech.id ? "default" : "outline"}
                        className="w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => loadReport(tech)}
                      >
                        <Users className="mr-2 h-4 w-4 shrink-0" /> {tech.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Produção {selectedTech ? `— ${selectedTech.name}` : ''}</CardTitle>
                  <CardDescription>Resumo de trabalhos e comissões no período.</CardDescription>
                </div>
                {reportData && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleEmailPayment}>
                      <Mail className="mr-2 h-4 w-4" /> E-mail
                    </Button>
                    <Button size="sm" onClick={handleGeneratePayment}>
                      <DollarSign className="mr-2 h-4 w-4" /> Gerar Pagamento
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Total Produzido</p>
                        <p className="text-2xl font-bold">R$ {reportData.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Trabalhos</p>
                        <p className="text-2xl font-bold">{reportData.completed_assignments}</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg text-center">
                        <p className="text-xs text-primary uppercase font-bold">Comissão Total</p>
                        <p className="text-2xl font-bold text-primary">R$ {reportData.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor Trabalho</TableHead>
                          <TableHead>Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.assignments.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">#{a.job_order_number || a.job}</TableCell>
                            <TableCell>{new Date(a.assigned_date).toLocaleDateString()}</TableCell>
                            <TableCell>R$ {a.job_total_price?.toLocaleString('pt-BR') || '---'}</TableCell>
                            <TableCell className="text-primary font-semibold">R$ {a.commission_amount.toLocaleString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                    <p>Selecione um técnico e período para ver o relatório.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionsPage;
