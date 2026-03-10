import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { clientService } from '@/services/api';
import { ArrowLeftIcon, PercentIcon, TrendingUpIcon, TrendingDownIcon, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone_primary: '',
    phone_secondary: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip_code: '',
    technical_preferences: '',
    price_adjustment_percentage: 0.00
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [samplePrices, setSamplePrices] = useState([
    { name: 'Coroa Metalocerâmica', base_price: 180.00, adjusted_price: 180.00 },
    { name: 'Prótese Total', base_price: 250.00, adjusted_price: 250.00 },
    { name: 'Faceta de Porcelana', base_price: 320.00, adjusted_price: 320.00 }
  ]);

  useEffect(() => {
    if (isEditing) {
      const fetchClient = async () => {
        try {
          setIsLoading(true);
          const client = await clientService.getById(id);
          setFormData(client);
          updateSamplePrices(client.price_adjustment_percentage || 0);
        } catch (error) {
          console.error('Erro ao buscar cliente:', error);
          setError('Erro ao carregar dados do cliente');
        } finally {
          setIsLoading(false);
        }
      };
      fetchClient();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdjustmentChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      price_adjustment_percentage: value
    }));
    updateSamplePrices(value);
  };

  const updateSamplePrices = (adjustment) => {
    const updatedPrices = samplePrices.map(item => ({
      ...item,
      adjusted_price: parseFloat((item.base_price * (1 + adjustment / 100)).toFixed(2))
    }));
    setSamplePrices(updatedPrices);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isEditing) {
        await clientService.update(id, formData);
      } else {
        await clientService.create(formData);
      }
      navigate('/clients');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setError('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAdjustmentColor = () => {
    const adjustment = formData.price_adjustment_percentage;
    if (adjustment > 0) return 'text-green-600';
    if (adjustment < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getAdjustmentIcon = () => {
    const adjustment = formData.price_adjustment_percentage;
    if (adjustment > 0) return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
    if (adjustment < 0) return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
    return <PercentIcon className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</CardTitle>
          <CardDescription>
            Preencha as informações do cliente abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Nome da empresa ou consultório"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Pessoa de Contato *</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  required
                  placeholder="Nome da pessoa responsável"
                />
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_primary">Telefone Principal *</Label>
                <Input
                  id="phone_primary"
                  name="phone_primary"
                  value={formData.phone_primary}
                  onChange={handleChange}
                  required
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_secondary">Telefone Secundário</Label>
                <Input
                  id="phone_secondary"
                  name="phone_secondary"
                  value={formData.phone_secondary}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Ajuste de Preço */}
            <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-blue-800">Ajuste de Preço Personalizado</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                          <InfoIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Defina um percentual de ajuste para este cliente. 
                          Valores positivos representam acréscimos, valores negativos representam descontos.
                          Não há limite para o valor do ajuste.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center">
                  {getAdjustmentIcon()}
                  <span className={`text-xl font-bold ml-2 ${getAdjustmentColor()}`}>
                    {formData.price_adjustment_percentage > 0 ? '+' : ''}
                    {formData.price_adjustment_percentage.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="price_adjustment_percentage" className="w-1/3">
                    Percentual de ajuste (%)
                  </Label>
                  <Input
                    id="price_adjustment_percentage"
                    name="price_adjustment_percentage"
                    type="number"
                    step="0.01"
                    value={formData.price_adjustment_percentage}
                    onChange={handleAdjustmentChange}
                    className="w-1/3"
                  />
                  <div className="text-sm text-gray-500 w-1/3">
                    Sem limite de valor. Use números negativos para desconto.
                  </div>
                </div>
              </div>
              
              {/* Preview de Preços */}
              <div className="mt-4 bg-white rounded-md border border-blue-100 overflow-hidden">
                <div className="bg-blue-100 px-4 py-2 text-blue-800 font-medium">
                  Simulação de Preços
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Item</th>
                      <th className="text-right p-3">Preço Base</th>
                      <th className="text-right p-3">Preço Ajustado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samplePrices.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-3">{item.name}</td>
                        <td className="text-right p-3">R$ {item.base_price.toFixed(2)}</td>
                        <td className={`text-right p-3 font-medium ${
                          item.adjusted_price > item.base_price 
                            ? 'text-green-600' 
                            : item.adjusted_price < item.base_price 
                              ? 'text-red-600' 
                              : ''
                        }`}>
                          R$ {item.adjusted_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address_street">Rua</Label>
                  <Input
                    id="address_street"
                    name="address_street"
                    value={formData.address_street}
                    onChange={handleChange}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    name="address_number"
                    value={formData.address_number}
                    onChange={handleChange}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    name="address_complement"
                    value={formData.address_complement}
                    onChange={handleChange}
                    placeholder="Apto, sala, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    name="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={handleChange}
                    placeholder="Nome do bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_zip_code">CEP</Label>
                  <Input
                    id="address_zip_code"
                    name="address_zip_code"
                    value={formData.address_zip_code}
                    onChange={handleChange}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    name="address_city"
                    value={formData.address_city}
                    onChange={handleChange}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    name="address_state"
                    value={formData.address_state}
                    onChange={handleChange}
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>

            {/* Preferências Técnicas */}
            <div className="space-y-2">
              <Label htmlFor="technical_preferences">Preferências Técnicas</Label>
              <textarea
                id="technical_preferences"
                name="technical_preferences"
                value={formData.technical_preferences}
                onChange={handleChange}
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-vertical"
                placeholder="Observações sobre preferências técnicas, materiais, etc."
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/clients')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
