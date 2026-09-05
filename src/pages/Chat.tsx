import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya adalah AI berbasis DeepSeek-v3.2 via MaxRouter. Ada yang bisa saya bantu hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.error?.message || data.error || 'Terjadi kesalahan pada server API');
      }

      const assistantMsg = data.choices?.[0]?.message?.content || "Tidak ada respon dari model.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b shadow-sm py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sallverapedia AI</h1>
            <p className="text-sm text-gray-500">Model: DeepSeek-v3.2 (MaxRouter)</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col gap-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div 
              className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border text-gray-800 shadow-sm rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              <span className="text-gray-500 text-sm">Mengetik balasan...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="bg-white border-t p-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-gray-100 rounded-2xl p-2 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all"
          >
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Tanya sesuatu kepada AI..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none resize-none px-4 py-2 text-gray-800 placeholder-gray-500"
              rows={1}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-400">
            Powered by MaxRouter.io API
          </div>
        </div>
      </div>
    </div>
  );
}
