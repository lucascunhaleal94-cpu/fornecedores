import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface InsumoRowProps {
  insumo: { codigo: string; descricao: string };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#131825] border border-white/10 p-3 rounded-lg shadow-xl text-sm">
        <p className="text-white font-medium mb-1">{data.data_emissao}</p>
        <p className="text-emerald-400 font-bold mb-2">
          R$ {data.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-slate-400 text-xs">Fornecedor:</p>
        <p className="text-slate-200">{data.fornecedorNome}</p>
      </div>
    );
  }
  return null;
}

export function InsumoRow({ insumo }: InsumoRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAdmin } = useAuth();
  const { notasFiscais, updateNotaFiscal, deleteNotaFiscal } = useNotasFiscais();
  const { fornecedores } = useFornecedores();

  // Filtrar e processar notas para este insumo
  const insumoNotas = useMemo(() => {
    const notas = notasFiscais.filter(n => n.codigo === insumo.codigo);
    
    // Converter data para ordenação
    const parsedNotas = notas.map(n => {
      let time = 0;
      let year = 'Desconhecido';
      if (n.data_emissao) {
        const parts = n.data_emissao.split('/');
        if (parts.length === 3) {
          time = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          year = parts[2];
        } else {
          const d = new Date(n.data_emissao);
          time = d.getTime();
          year = d.getFullYear().toString();
        }
      }

      const fornecedor = fornecedores.find(f => f.id === n.fornecedor_id);

      return {
        ...n,
        time,
        year,
        fornecedorNome: fornecedor ? fornecedor.razaoSocial : 'Fornecedor Excluído/Desconhecido'
      };
    });

    // Ordenar cronologicamente do mais antigo para o mais novo
    return parsedNotas.sort((a, b) => a.time - b.time);
  }, [notasFiscais, insumo.codigo, fornecedores]);

  // Agrupar por ano
  const anosDisponiveis = useMemo(() => {
    const anos = Array.from(new Set(insumoNotas.map(n => n.year))).filter(y => y !== 'Desconhecido').sort((a, b) => Number(b) - Number(a)); // decrescente nas abas
    return anos.length > 0 ? anos : ['Todos'];
  }, [insumoNotas]);

  const [activeYear, setActiveYear] = useState(anosDisponiveis[0]);

  // Dados para o ano ativo, incluindo cálculo de variação
  const dadosAnoAtivo = useMemo(() => {
    let filtered = insumoNotas;
    if (activeYear !== 'Todos') {
      filtered = insumoNotas.filter(n => n.year === activeYear);
    }

    // Calcular variação em relação à nota anterior (globalmente ou no ano)
    // Para ser mais preciso na variação, a nota "anterior" deveria ser a nota imediatamente anterior cronologicamente no geral.
    return filtered.map((n, index) => {
      let variacao = 0;
      let variacaoPercentual = 0;
      
      if (index > 0) {
        const prev = filtered[index - 1];
        variacao = n.valor_unitario - prev.valor_unitario;
        variacaoPercentual = (variacao / prev.valor_unitario) * 100;
      }

      return {
        ...n,
        variacao,
        variacaoPercentual
      };
    });
  }, [insumoNotas, activeYear]);

  const handleMotivoChange = (id: string, motivo: string) => {
    // Optimistic update is handled in context
    updateNotaFiscal(id, { motivo });
  };

  const handleDeleteInsumo = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o insumo ${insumo.codigo} (${insumo.descricao})? Isso removerá este produto de todas as compras registradas.`)) {
      let allSuccess = true;
      for (const nota of insumoNotas) {
        const res = await deleteNotaFiscal(nota.id);
        if (!res.success) allSuccess = false;
      }
      if (allSuccess) {
        toast.success(`Insumo excluído com sucesso!`);
      } else {
        toast.error('Alguns registros não puderam ser excluídos.');
      }
    }
  };

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
        <td className="py-4 px-4 font-medium text-emerald-400">{insumo.codigo}</td>
        <td className="py-4 px-4 text-slate-300">{insumo.descricao}</td>
        <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium bg-blue-500/10 px-4 py-2 rounded-full text-sm"
          >
            {isExpanded ? 'Ocultar Evolução' : 'Ver Evolução'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {isAdmin && (
            <button 
              onClick={handleDeleteInsumo} 
              className="text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-white/5 transition-colors" 
              title="Excluir Insumo (Todas as compras)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
      
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={3} className="p-0 border-b border-white/5">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden bg-black/20"
              >
                <div className="p-6 md:p-8">
                  {insumoNotas.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">Nenhum histórico encontrado para este insumo.</div>
                  ) : (
                    <Tabs value={activeYear} onValueChange={setActiveYear} className="w-full">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-white">Evolução de Preços</h3>
                        <TabsList className="bg-[#131825] border border-white/10">
                          {anosDisponiveis.map(ano => (
                            <TabsTrigger 
                              key={ano} 
                              value={ano}
                              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-slate-400"
                            >
                              {ano}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>

                      <TabsContent value={activeYear} className="mt-0 space-y-8">
                        
                        {/* Gráfico */}
                        <div className="h-[300px] w-full bg-[#131825] border border-white/5 rounded-xl p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosAnoAtivo} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                              <XAxis 
                                dataKey="data_emissao" 
                                stroke="#ffffff50" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                stroke="#ffffff50" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `R$ ${val}`}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Line 
                                type="monotone" 
                                dataKey="valor_unitario" 
                                stroke="#34d399" 
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#34d399', strokeWidth: 2, stroke: '#131825' }}
                                activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Tabela de Detalhes */}
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-[#131825]">
                              <tr className="text-slate-400">
                                <th className="py-3 px-4 font-medium">Data da Compra</th>
                                <th className="py-3 px-4 font-medium">Fornecedor</th>
                                <th className="py-3 px-4 font-medium text-right">V. Unitário</th>
                                <th className="py-3 px-4 font-medium text-right">Variação</th>
                                <th className="py-3 px-4 font-medium w-1/3">Motivo da Variação</th>
                                {isAdmin && <th className="py-3 px-4 font-medium text-center">Ações</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {dadosAnoAtivo.map((nota, i) => (
                                <tr key={nota.id} className="hover:bg-white/[0.02]">
                                  <td className="py-3 px-4 text-slate-300">{nota.data_emissao}</td>
                                  <td className="py-3 px-4 text-slate-300 truncate max-w-[200px]" title={nota.fornecedorNome}>
                                    {nota.fornecedorNome}
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-white">
                                    R$ {nota.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {i === 0 ? (
                                      <span className="text-slate-500 inline-flex items-center gap-1"><Minus className="w-3 h-3"/> Base</span>
                                    ) : (
                                      <span className={`inline-flex items-center gap-1 font-medium ${
                                        nota.variacaoPercentual > 0 ? 'text-red-400' : 
                                        nota.variacaoPercentual < 0 ? 'text-emerald-400' : 'text-slate-500'
                                      }`}>
                                        {nota.variacaoPercentual > 0 ? <TrendingUp className="w-3 h-3"/> : 
                                         nota.variacaoPercentual < 0 ? <TrendingDown className="w-3 h-3"/> : 
                                         <Minus className="w-3 h-3"/>}
                                        {Math.abs(nota.variacaoPercentual).toFixed(2)}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4">
                                    <Input 
                                      defaultValue={nota.motivo || ''}
                                      placeholder="Justifique o aumento/queda..."
                                      className="bg-black/20 border-white/10 text-white h-8 text-xs placeholder:text-slate-600"
                                      onBlur={(e) => {
                                        if (e.target.value !== nota.motivo) {
                                          handleMotivoChange(nota.id, e.target.value);
                                        }
                                      }}
                                    />
                                  </td>
                                  {isAdmin && (
                                    <td className="py-2 px-4 text-center">
                                      <button 
                                        onClick={async () => {
                                          if (window.confirm('Tem certeza que deseja excluir este registro específico de compra do insumo?')) {
                                            const res = await deleteNotaFiscal(nota.id);
                                            if (res.success) {
                                              toast.success('Registro excluído com sucesso!');
                                            }
                                          }
                                        }}
                                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                        title="Excluir este registro"
                                      >
                                        <Trash2 className="w-4 h-4 mx-auto" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
