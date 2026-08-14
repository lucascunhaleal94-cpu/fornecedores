import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader2, FlaskConical } from 'lucide-react';
import OpenAI from 'openai';
import { PROMPT_ESPECIALISTA } from '@/constants/promptEspecialista';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ColoristaVirtualPage() {
  const { notasFiscais } = useNotasFiscais();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o Colorista Virtual da Acquarela. Estou aqui para tirar suas dúvidas técnicas sobre tintas gráficas, pigmentos, resinas e formulações. Como posso ajudar você hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Formulation form state
  const [formData, setFormData] = useState({
    l: '',
    a: '',
    b: '',
    viscosidade: '',
    ph: '',
    resistencia: '',
    forca: '',
    obs: ''
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract most recent prices for each product code from Notas Fiscais
  const recentPrices = useMemo(() => {
    const priceMap = new Map<string, { preco: number, data: number }>();
    
    notasFiscais.forEach(nota => {
      if (!nota.codigo || !nota.valor_unitario) return;
      
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
        }
        return new Date(dStr).getTime();
      };
      
      const notaDate = parseDate(nota.data_emissao);
      const current = priceMap.get(nota.codigo);
      
      if (!current || notaDate > current.data) {
        priceMap.set(nota.codigo, { preco: nota.valor_unitario, data: notaDate });
      }
    });

    // Format map into a string representation for the AI
    let priceListStr = "";
    priceMap.forEach((val, key) => {
      priceListStr += `- Código ${key}: R$ ${val.preco.toFixed(2)}/kg\n`;
    });
    return priceListStr;
  }, [notasFiscais]);

  const sendToOpenAI = async (userMessage: Message, additionalSystemContext?: string) => {
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da OpenAI não configurada. Configure a variável VITE_OPENAI_API_KEY no Vercel.");
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const conversationHistory = messages.filter(m => m.role !== 'system');
      
      let finalSystemPrompt = PROMPT_ESPECIALISTA;
      if (additionalSystemContext) {
        finalSystemPrompt += "\n\n" + additionalSystemContext;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...conversationHistory,
          userMessage
        ]
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices[0].message.content || 'Desculpe, não consegui gerar uma resposta.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Erro na API:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erro de conexão com o Assistente: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setInput('');
    
    // Normal chat message
    sendToOpenAI(userMessage);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Build the dynamic instruction context for the AI
    const instructionContext = `
INSTRUÇÃO ESPECIAL PARA SOLICITAÇÃO DE FORMULAÇÃO:
O usuário preencheu o quadro de formulação com os seguintes dados alvo:
L*: ${formData.l}
a*: ${formData.a}
b*: ${formData.b}
Viscosidade no Zahn 2 (seg.): ${formData.viscosidade || 'Não especificado'}
pH: ${formData.ph || 'Não especificado'}
Resistência: ${formData.resistencia || 'Não especificado'}
Força: ${formData.forca || 'Não especificado'}
Observações: ${formData.obs || 'Nenhuma'}

Aqui está a lista com os CUSTOS MAIS RECENTES (em R$/kg) atualizados no sistema de Insumos:
${recentPrices}

OBJETIVO DA RESPOSTA:
A partir das características solicitadas acima, analise os dados (usando seu conhecimento sobre o espaço de cor L*a*b* e colorimetria) e apresente a fórmula ideal seguindo RIGOROSAMENTE as regras e o formato de resposta (Ficha da Cor, Fórmula Proposta, etc.) definidos no seu prompt principal.
IMPORTANTE: Para o cálculo de custo, utilize obrigatoriamente os "CUSTOS MAIS RECENTES" listados acima. Se algum código não constar na lista recente, utilize o preço base da sua tabela interna.
    `;

    const userMessage: Message = { 
      role: 'user', 
      content: "Por favor, analise as informações do quadro de Formulação e apresente a fórmula ideal baseada nos padrões definidos." 
    };

    sendToOpenAI(userMessage, instructionContext);
  };

  return (
    <div className="px-10 pb-12 pt-6 max-w-[1200px] mx-auto h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto scrollbar-hide">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] shadow-xl backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <Bot size={32} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Colorista Virtual
            </h1>
            <p className="text-slate-400 font-medium mt-1">
              Especialista em Colorimetria e Tintas Gráficas da Acquarela
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Stacked vertically now */}
      <div className="flex flex-col gap-6 flex-1 min-h-[500px]">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-[2rem] shadow-xl backdrop-blur-sm overflow-hidden min-h-[400px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' 
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                    : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-500/10 border border-blue-500/20 text-white rounded-tr-none'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Bot size={20} />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-slate-400 font-medium text-[15px]">Analisando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 bg-black/20 border-t border-white/10 shrink-0">
            <form 
              onSubmit={handleChatSubmit} 
              className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/50 transition-all"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
                placeholder="Pergunte sobre pigmentos (ex: P.B.15.3), resinas, ou chat livre..."
                className="flex-1 bg-transparent border-none text-white resize-none max-h-32 min-h-[50px] p-3 focus:outline-none placeholder:text-slate-500"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={20} className="ml-1" />
              </button>
            </form>
          </div>
        </div>

        {/* Formulation Area - Moved below chat */}
        <div className="w-full bg-white/5 border border-white/10 rounded-[2rem] shadow-xl backdrop-blur-sm overflow-hidden flex flex-col shrink-0 mb-6">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <FlaskConical size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Formulação Alvo</h2>
                <p className="text-xs text-slate-400">Preencha os dados e peça para a IA sugerir a melhor composição.</p>
              </div>
            </div>
            <button 
              onClick={handleFormSubmit}
              disabled={isLoading || !formData.l || !formData.a || !formData.b}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Gerar Formulações
            </button>
          </div>
          
          <form className="p-6 space-y-5" onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">L* <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  name="l"
                  value={formData.l}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: 50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">a* <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  name="a"
                  value={formData.a}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: 10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">b* <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  name="b"
                  value={formData.b}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: -5"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Força</label>
                <select 
                  name="forca"
                  value={formData.forca}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Selecione...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider" title="Viscosidade no Zahn 2 (seg.)">Viscosidade (s)</label>
                <input 
                  type="number" 
                  name="viscosidade"
                  value={formData.viscosidade}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: 25"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">pH</label>
                <input 
                  type="number" 
                  name="ph"
                  value={formData.ph}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder="Ex: 8.5"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Resistência</label>
                <select 
                  name="resistencia"
                  value={formData.resistencia}
                  onChange={handleFormChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Selecione...</option>
                  <option value="Atrito">Atrito</option>
                  <option value="Luz">Luz</option>
                  <option value="Frigor">Frigor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">OBS</label>
              <textarea 
                name="obs"
                value={formData.obs}
                onChange={handleFormChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none min-h-[80px]"
                placeholder="Observações adicionais da formulação..."
              />
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
