import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '../ui/button';
import AIAssistantChat from './AIAssistantChat';
import { useAuth } from '../../contexts/AuthContext';

const AIAssistant = ({ isOpen, onClose, onOpen }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { canAccessAIAssistant } = useAuth();

  if (!canAccessAIAssistant()) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700 z-40"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
      
      <AIAssistantChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
};

export default AIAssistant;

