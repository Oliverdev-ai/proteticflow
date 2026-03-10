import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jobService } from '@/services/api';

export default function JobPhotoUpload({ jobId }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Por favor, selecione uma imagem para upload.');
      return;
    }

    setError('');
    setSuccess('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('job', jobId);
      formData.append('image_file', file);
      formData.append('description', description);

      await jobService.uploadPhoto(jobId, formData);
      setSuccess('Imagem enviada com sucesso!');
      setFile(null);
      setDescription('');
      
      // Limpar o input de arquivo
      const fileInput = document.getElementById('image-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      setError('Erro ao fazer upload da imagem. Por favor, tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Imagem</CardTitle>
        <CardDescription>
          Faça upload de imagens relacionadas ao trabalho
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-upload">Selecione uma imagem</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Descreva a imagem"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Enviar Imagem'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

