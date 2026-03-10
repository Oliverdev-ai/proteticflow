import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { jobService, clientService } from '@/services/api';
import pricingService from '@/services/pricingService';
import { ArrowLeftIcon, SaveIcon, ClipboardListIcon, CalendarIcon, PlusIcon, TrashIcon, DollarSignIcon, PercentIcon, AlertCircleIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    order_number: '',
    client: '',
    patient_name: '',
    entry_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'REC',
    description: '',
    notes: '',
    items: []
  });

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [priceItems, setPriceItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [adjustedTotalPrice, setAdjustedTotalPrice] = useState(0);
  const [priceAdjustment, setPriceAdjustment] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientService.getAll();
        setClients(response.results || response);
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de clientes",
          variant: "destructive"
        });
      }
    };

    const fetchPriceItems = async () => {
      try {
        const response = await pricingService.getAllItems();
        setPriceItems(response.results || response);
      } catch (error) {
        console.error('Erro ao buscar itens de preço:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a tabela de preços",
          variant: "destructive"
        });
      }
    };

    fetchClients();
    fetchPriceItems();

    if (isEdit) {
      const fetchJob = async () => {
        setIsLoading(true);
        try {
          const job = await jobService.getById(id);
          
          // Set form data
          setFormData({
            order_number: job.order_number,
            client: job.client.toString(),
            patient_name: job.patient_name,
            entry_date: job.entry_date,
            due_date: job.due_date,
            status: job.status,
            description: job.description || '',
            notes: job.notes || '',
            items: job.job_items || []
          });
          
          // Fetch client details to get price adjustment
          if (job.client) {
            const clientDetails = await clientService.getById(job.client);
            setSelectedClient(clientDetails);
            setPriceAdjustment(clientDetails.price_adjustment_percentage || 0);
          }
          
          // Set selected items
          if (job.job_items && job.job_items.length > 0) {
            setSelectedItems(job.job_items.map(item => ({
              id: item.service_item,
              name: item.service_item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            })));
          }
          
        } catch (error) {
          console.error('Erro ao buscar trabalho:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do trabalho",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchJob();
    }
  }, [id, isEdit]);

  // Update total price whenever selected items change
  useEffect(() => {
    const baseTotal = selectedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    setTotalPrice(baseTotal);
    
    // Apply client's price adjustment if available
    if (priceAdjustment !== 0) {
      const adjustedTotal = baseTotal * (1 + (priceAdjustment / 100));
      setAdjustedTotalPrice(adjustedTotal);
    } else {
      setAdjustedTotalPrice(baseTotal);
    }
  }, [selectedItems, priceAdjustment]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClientChange = async (clientId) => {
    handleInputChange('client', clientId);
    
    try {
      // Fetch client details to get price adjustment
      const clientDetails = await clientService.getById(clientId);
      setSelectedClient(clientDetails);
      setPriceAdjustment(clientDetails.price_adjustment_percentage || 0);
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId || selectedItemQuantity < 1) {
      toast({
        title: "Erro",
        description: "Selecione um item e quantidade válida",
        variant: "destructive"
      });
      return;
    }
    
    const itemToAdd = priceItems.find(item => item.id.toString() === selectedItemId);
    if (!itemToAdd) return;
    
    // Check if item already exists in selected items
    const existingItemIndex = selectedItems.findIndex(item => item.id.toString() === selectedItemId);
    
    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += selectedItemQuantity;
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].unit_price * updatedItems[existingItemIndex].quantity;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      setSelectedItems([
        ...selectedItems,
        {
          id: itemToAdd.id,
          name: itemToAdd.name,
          quantity: selectedItemQuantity,
          unit_price: itemToAdd.price,
          total_price: itemToAdd.price * selectedItemQuantity
        }
      ]);
    }
    
    // Reset selection
    setSelectedItemId('');
    setSelectedItemQuantity(1);
    setShowItemDialog(false);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = [...selectedItems];
    updatedItems.splice(index, 1);
    setSelectedItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const submitData = {
        ...formData,
        client: parseInt(formData.client),
        job_items: selectedItems.map(item => ({
          service_item: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        total_price: adjustedTotalPrice
      };

      let response;
      if (isEdit) {
        response = await jobService.update(id, submitData);
      } else {
        response = await jobService.create(submitData);
      }

      toast({
        title: "Sucesso",
        description: isEdit ? "Trabalho atualizado com sucesso" : "Trabalho criado com sucesso",
      });

      navigate('/jobs');
    } catch (error) {
      console.error('Erro ao salvar trabalho:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar trabalho. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Carregando trabalho...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/jobs')}
                className="text-white hover:bg-blue-800 p-2"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {isEdit ? 'Editar Trabalho' : 'Novo Trabalho'}
                </h1>
                <p className="text-blue-100 text-lg">
                  {isEdit ? 'Atualize as informações do trabalho' : 'Cadastre um novo trabalho no sistema'}
                </p>
                <div className="flex items-center mt-4 space-x-6">
                  <div className="flex items-center">
                    <ClipboardListIcon className="h-5 w-5 mr-2" />
                    <span>Controle Total</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    <span>Prazos Organizados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                <ClipboardListIcon className="h-6 w-6 mr-3 text-blue-600" />
                Informações Básicas
              </CardTitle>
              <CardDescription className="text-gray-600">
                Preencha os dados principais do trabalho
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="order_number" className="text-sm font-medium text-gray-700">
                    Número do Pedido *
                  </Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => handleInputChange('order_number', e.target.value)}
                    placeholder="Ex: 2024-001"
                    required
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client" className="text-sm font-medium text-gray-700">
                    Cliente *
                  </Label>
                  <Select 
                    value={formData.client} 
                    onValueChange={handleClientChange}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400 rounded-lg">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedClient && selectedClient.price_adjustment_percentage !== 0 && (
                    <div className="mt-2 flex items-center">
                      <PercentIcon className="h-4 w-4 mr-1" />
                      <span className={`text-sm ${priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {priceAdjustment > 0 ? '+' : ''}{priceAdjustment}% de {priceAdjustment > 0 ? 'acréscimo' : 'desconto'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient_name" className="text-sm font-medium text-gray-700">
                    Nome do Paciente *
                  </Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) => handleInputChange('patient_name', e.target.value)}
                    placeholder="Nome completo do paciente"
                    required
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REC">Recebido</SelectItem>
                      <SelectItem value="PROD">Em Produção</SelectItem>
                      <SelectItem value="QC">Controle de Qualidade</SelectItem>
                      <SelectItem value="COMP">Concluído</SelectItem>
                      <SelectItem value="DEL">Entregue</SelectItem>
                      <SelectItem value="CANC">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entry_date" className="text-sm font-medium text-gray-700">
                    Data de Entrada *
                  </Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => handleInputChange('entry_date', e.target.value)}
                    required
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-sm font-medium text-gray-700">
                    Data de Entrega *
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    required
                    className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descrição do Trabalho
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o tipo de trabalho, materiais, especificações..."
                  rows={4}
                  className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items and Pricing Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                    <DollarSignIcon className="h-6 w-6 mr-3 text-blue-600" />
                    Itens e Precificação
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Adicione os itens do trabalho e visualize o preço total
                  </CardDescription>
                </div>
                <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-500 hover:bg-green-600">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Item ao Trabalho</DialogTitle>
                      <DialogDescription>
                        Selecione o item da tabela de preços e a quantidade
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="item">Item</Label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um item" />
                          </SelectTrigger>
                          <SelectContent>
                            {priceItems.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.name} - {formatCurrency(item.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantidade</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={selectedItemQuantity}
                          onChange={(e) => setSelectedItemQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddItem}>
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {selectedItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[50%]">Item</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <AlertCircleIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-1">Nenhum item adicionado</h3>
                  <p className="text-gray-500 mb-4">Clique em "Adicionar Item" para incluir itens ao trabalho</p>
                  <Button
                    onClick={() => setShowItemDialog(true)}
                    variant="outline"
                    className="border-blue-200 text-blue-600"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Item
                  </Button>
                </div>
              )}
            </CardContent>
            {selectedItems.length > 0 && (
              <CardFooter className="bg-gray-50 border-t p-6">
                <div className="w-full flex flex-col items-end">
                  <div className="space-y-2 text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-gray-600 mr-4">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                    
                    {priceAdjustment !== 0 && (
                      <div className="flex items-center justify-end">
                        <span className="text-gray-600 mr-4">
                          {priceAdjustment > 0 ? 'Acréscimo' : 'Desconto'} ({priceAdjustment}%):
                        </span>
                        <span className={`font-medium ${priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceAdjustment > 0 ? '+' : ''}{formatCurrency(adjustedTotalPrice - totalPrice)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end text-lg border-t pt-2">
                      <span className="font-semibold text-gray-800 mr-4">Total:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(adjustedTotalPrice)}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-1">
                      Este valor será lançado automaticamente em contas a receber
                    </div>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* Notes Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <CardTitle className="text-2xl font-bold text-gray-800">
                Observações
              </CardTitle>
              <CardDescription className="text-gray-600">
                Informações adicionais sobre o trabalho
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-2">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Observações adicionais, instruções especiais..."
                  rows={3}
                  className="border-2 border-gray-200 focus:border-blue-400 rounded-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/jobs')}
              className="px-6 py-2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || selectedItems.length === 0}
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
                  {isEdit ? 'Atualizar' : 'Salvar'} Trabalho
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
