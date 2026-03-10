import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { aiAssistantService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';

const AIAssistantChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [availableCommands, setAvailableCommands] = useState([]);
  const messagesEndRef = useRef(null);
  const { canAccessAIAssistant, canUseAIForReports, isCollaborator } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && canAccessAIAssistant()) {
      loadAvailableCommands();
      // Mensagem de boas-vindas
      setMessages([{
        id: 1,
        type: 'assistant',
        content: `Olá! Sou o assistente do DentalFlow. ${isCollaborator() ? 'Como colaborador, posso te ajudar com cadastros e baixas de trabalhos.' : 'Posso te ajudar com diversas tarefas do sistema.'}\n\nDigite um comando ou escolha uma das sugestões abaixo.`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, canAccessAIAssistant, isCollaborator]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableCommands = async () => {
    try {
      const response = await aiAssistantService.getAvailableCommands();
      setAvailableCommands(response.available_commands);
    } catch (error) {
      console.error('Erro ao carregar comandos:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await aiAssistantService.sendMessage(inputMessage, sessionId);
      
      if (!sessionId) {
        setSessionId(response.session_id);
      }

      const assistantMessage = {
        id: response.message_id,
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        commandExecuted: response.command_executed,
        executionResult: response.execution_result,
        success: response.success
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (!response.success && response.suggestions) {
        // Adiciona sugestões como uma mensagem especial
        const suggestionsMessage = {
          id: Date.now() + 1,
          type: 'suggestions',
          content: 'Comandos disponíveis:',
          suggestions: response.suggestions,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, suggestionsMessage]);
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
        success: false
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const formatMessage = (content) => {
    // Converte markdown básico para JSX
    return content.split('\n').map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={index} className="font-bold text-lg mb-2">{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('🔹')) {
        return <div key={index} className="ml-4 mb-1">{line}</div>;
      }
      if (line.startsWith('✅')) {
        return <div key={index} className="text-green-600 font-medium mb-2">{line}</div>;
      }
      if (line.startsWith('⚠️') || line.startsWith('🔥')) {
        return <div key={index} className="text-orange-600 mb-1">{line}</div>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <div key={index} className="mb-1">{line}</div>;
    });
  };

  if (!canAccessAIAssistant()) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-600" />
            Assistente DentalFlow
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </div>
        {isCollaborator() && (
          <Badge variant="secondary" className="w-fit">
            Modo Colaborador
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : message.type === 'suggestions'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : message.type === 'suggestions' ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className={`rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'suggestions'
                      ? 'bg-purple-50 border border-purple-200'
                      : message.success === false
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    {message.type === 'suggestions' ? (
                      <div>
                        <div className="font-medium mb-2">{message.content}</div>
                        <div className="space-y-1">
                          {message.suggestions?.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left h-auto p-2 text-purple-700 hover:bg-purple-100"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {formatMessage(message.content)}
                      </div>
                    )}
                    
                    {message.commandExecuted && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {message.commandExecuted}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Sugestões de comandos */}
        {messages.length === 1 && availableCommands.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Comandos disponíveis:</div>
            <div className="flex flex-wrap gap-1">
              {availableCommands.slice(0, 3).map((command, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => handleSuggestionClick(command)}
                >
                  {command}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input de mensagem */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAssistantChat;

