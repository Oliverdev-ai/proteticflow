/**
 * Flow IA — ProteticFlow "Atelier Digital"
 * Chat integrado com assistente de IA real via tRPC + LLM
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Sparkles, Lightbulb, BarChart3, Calendar, FileText, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { icon: BarChart3, label: "Relatório do mês", prompt: "Gere um relatório resumido do mês atual com faturamento, trabalhos concluídos e taxa de pontualidade" },
  { icon: Calendar, label: "Entregas de hoje", prompt: "Quais são as entregas programadas para hoje?" },
  { icon: FileText, label: "Trabalhos atrasados", prompt: "Liste todos os trabalhos que estão atrasados com detalhes" },
  { icon: Lightbulb, label: "Sugestões de melhoria", prompt: "Sugira melhorias para a produtividade do laboratório baseado nos dados atuais" },
];

export default function FlowIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou a **Flow IA**, sua assistente inteligente do ProteticFlow. Posso consultar dados reais do laboratório — trabalhos, clientes, preços, prazos — e gerar análises e relatórios. Como posso ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.chat.send.useMutation({
    onSuccess: (data: { content: string }) => {
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: (error: { message: string }) => {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Desculpe, ocorreu um erro ao processar sua solicitação: ${error.message}. Tente novamente.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Build conversation history for context (last 10 messages)
    const history = [...messages, userMsg]
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    chatMutation.mutate({ message: text.trim() });
  }, [messages, chatMutation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Flow IA</h1>
            <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Assistente inteligente conectada ao laboratório
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs text-muted-foreground font-body">Powered by LLM</span>
        </div>
      </motion.div>

      {/* Chat Area */}
      <motion.div variants={fadeUp} className="flex-1 min-h-0">
        <Card className="border border-border/60 shadow-sm h-full flex flex-col">
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-primary/10" : "bg-sage-light"}`}>
                    {msg.role === "assistant" ? <Bot size={16} className="text-primary" /> : <User size={16} className="text-sage" />}
                  </div>
                  <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm font-body leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-md"
                        : "bg-muted/50 text-foreground rounded-tl-md prose prose-sm max-w-none"
                    }`}>
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-body">
                      {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {chatMutation.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="bg-muted/50 px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-body">Analisando dados do laboratório...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
                  >
                    <action.icon size={16} className="text-primary shrink-0" />
                    <span className="text-xs font-body text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border/60">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo à Flow IA..."
                className="flex-1 h-11 px-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                disabled={chatMutation.isPending}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                disabled={!input.trim() || chatMutation.isPending}
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
