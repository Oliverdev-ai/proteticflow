import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  Percent, 
  ChevronRight, 
  Search, 
  FileText,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { 
  priceTableService, 
  serviceItemService,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const PlansPage = () => {
  const [priceTables, setPriceTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [serviceItems, setServiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', description: '', is_default: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [reajustePercent, setReajustePercent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPriceTables();
  }, []);

  const loadPriceTables = async () => {
    try {
      setLoading(true);
      const data = await priceTableService.getAll();
      setPriceTables(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar tabelas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServiceItems = async (tableId) => {
    try {
      setItemsLoading(true);
      const data = await serviceItemService.getAll(); // Assuming filtering by price_table is handled or needed or getById returns items
      // Based on docs: GET /api/v1/pricing/service-items/?price_table={id}
      // If the service doesn't support query params yet, we'll need to adjust.
      // Let's assume for now we might need to filter manually if not supported by service.
      // But the requirement says GET /api/v1/pricing/service-items/?price_table={id}
      
      // Update: the serviceItemService.getAll() usually returns all. 
      // Let's assume we can pass params if we update api.js or use axios directly.
      // Since I already updated api.js for other things, I'll use it.
      setServiceItems(data.filter(item => item.price_table === tableId));
    } catch (error) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    loadServiceItems(table.id);
  };

  const handleCreateTable = async () => {
    try {
      await priceTableService.create(newTable);
      toast({ title: "Tabela criada com sucesso!" });
      setIsCreateModalOpen(false);
      setNewTable({ name: '', description: '', is_default: false });
      loadPriceTables();
    } catch (error) {
      toast({
        title: "Erro ao criar tabela",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    if (!selectedTable) return;
    try {
      const blob = await priceTableService.exportCSV(selectedTable.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tabela_${selectedTable.name}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Exportação concluída" });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e) => {
    if (!selectedTable || !e.target.files[0]) return;
    try {
      const result = await priceTableService.importCSV(selectedTable.id, e.target.files[0]);
      toast({
        title: "Importação concluída",
        description: `Criados: ${result.created}, Atualizados: ${result.updated}, Erros: ${result.errors}`,
      });
      loadServiceItems(selectedTable.id);
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReajuste = async () => {
    if (!selectedTable || !reajustePercent) return;
    try {
      const result = await priceTableService.reajuste(selectedTable.id, parseFloat(reajustePercent));
      toast({
        title: "Reajuste aplicado",
        description: `${result.updated_count} itens atualizados com sucesso.`,
      });
      loadServiceItems(selectedTable.id);
      setReajustePercent('');
    } catch (error) {
      toast({
        title: "Erro ao aplicar reajuste",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditPrice(item.price.toString());
  };

  const handleSavePrice = async () => {
    try {
      await serviceItemService.update(editingItem.id, { 
        ...editingItem,
        price: parseFloat(editPrice) 
      });
      toast({ title: "Preço atualizado!" });
      setEditingItem(null);
      loadServiceItems(selectedTable.id);
    } catch (error) {
      toast({
        title: "Erro ao atualizar preço",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredItems = serviceItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tabelas de Preços</h1>
          <p className="text-muted-foreground">Gerencie os preços dos serviços prestados pelo laboratório.</p>
        </div>
        {!selectedTable && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova Tabela
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tabela de Preços</DialogTitle>
                <DialogDescription>
                  Insira as informações básicas para a nova tabela.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input 
                    id="name" 
                    value={newTable.name} 
                    onChange={(e) => setNewTable({...newTable, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input 
                    id="description" 
                    value={newTable.description} 
                    onChange={(e) => setNewTable({...newTable, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTable}>Criar Tabela</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {selectedTable && (
          <Button variant="outline" onClick={() => setSelectedTable(null)}>
            <X className="mr-2 h-4 w-4" /> Voltar para Listagem
          </Button>
        )}
      </div>

      {!selectedTable ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceTables.map((table) => (
            <Card key={table.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectTable(table)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {table.name}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{table.description || 'Sem descrição'}</p>
                {table.is_default && (
                  <Badge variant="secondary" className="mt-2">Padrão</Badge>
                )}
              </CardContent>
              <CardFooter>
                <div className="text-xs font-semibold flex items-center">
                  Ver itens <ChevronRight className="ml-1 h-3 w-3" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedTable.name}</CardTitle>
                  <CardDescription>Itens e preços da tabela selecionada.</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar item..." 
                      className="pl-8" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            {editingItem?.id === item.id ? (
                              <Input 
                                type="number" 
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24"
                                autoFocus
                              />
                            ) : (
                              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)
                            )}
                          </TableCell>
                          <TableCell>
                            {editingItem?.id === item.id ? (
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={handleSavePrice}><Save className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}><X className="h-4 w-4" /></Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleStartEdit(item)}>Editar</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Ações em Lote</CardTitle>
                <CardDescription>Operações rápidas para toda a tabela.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Exportar Dados</Label>
                  <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Importar Dados</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleImport}
                      className="text-xs"
                    />
                    <Button size="icon" variant="outline"><Upload className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">O arquivo deve estar no formato CSV padrão.</p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Reajuste Geral (%)</Label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Percent className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Ex: 5.5" 
                        className="pl-8" 
                        type="number"
                        value={reajustePercent}
                        onChange={(e) => setReajustePercent(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleReajuste}>Aplicar</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Aplica um aumento percentual em todos os itens desta tabela.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;
