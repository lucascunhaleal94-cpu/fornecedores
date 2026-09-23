import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Despesa {
  id?: string;
  veiculo: string;
  data: string;
  local: string;
  quantidade: number;
  pedagio: number;
  motorista: number;
  combustivel: number;
  hotel: number;
  gasto_extra_valor: number;
  gasto_extra_motivo: string;
  valor_transportadora: number;
  economia: number;
}

export function DespesasViagemBoard({ veiculo }: { veiculo: string }) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [novaDespesa, setNovaDespesa] = useState<Partial<Despesa> & { pedagioStr?: string, quantidadeStr?: string, combustivelStr?: string, hotelStr?: string, gastoExtraStr?: string }>({
    motorista: 50,
    gasto_extra_motivo: '',
    pedagioStr: '',
    quantidadeStr: '',
    combustivelStr: '',
    hotelStr: '',
    gastoExtraStr: '',
  });

  const fetchDespesas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('despesas_viagem')
        .select('*')
        .eq('veiculo', veiculo)
        .order('created_at', { ascending: false });

      if (error) {
        // Ignora erro se tabela não existir
        console.error("Tabela despesas_viagem pode não existir ainda.", error);
      } else if (data) {
        setDespesas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, [veiculo]);

  // Recalcular campos automáticos
  useEffect(() => {
    const loc = (novaDespesa.local || '').toUpperCase();
    
    let pedagioNum = novaDespesa.pedagioStr !== '' ? Number(novaDespesa.pedagioStr) : 0;

    const quantidadeNum = novaDespesa.quantidadeStr !== '' ? Number(novaDespesa.quantidadeStr) : 0;
    const valor_transportadora = quantidadeNum * 0.88;

    const combustivelNum = novaDespesa.combustivelStr !== '' ? Number(novaDespesa.combustivelStr) : 0;
    const hotelNum = novaDespesa.hotelStr !== '' ? Number(novaDespesa.hotelStr) : 0;
    const gastoExtraNum = novaDespesa.gastoExtraStr !== '' ? Number(novaDespesa.gastoExtraStr) : 0;

    const totalGastos = pedagioNum + 50.00 + combustivelNum + hotelNum + gastoExtraNum;
    const economia = valor_transportadora - totalGastos;

    setNovaDespesa(prev => ({
      ...prev,
      motorista: 50.00,
      valor_transportadora,
      economia
    }));
  }, [novaDespesa.local, novaDespesa.quantidadeStr, novaDespesa.pedagioStr, novaDespesa.combustivelStr, novaDespesa.hotelStr, novaDespesa.gastoExtraStr]);

  const handleAddRow = async () => {
    if (!novaDespesa.data || !novaDespesa.local || novaDespesa.quantidadeStr === '' || novaDespesa.combustivelStr === '') {
      toast.error('Preencha os campos obrigatórios: Data, Local, Quantidade e Combustível.');
      return;
    }

    const loc = (novaDespesa.local || '').toUpperCase();
    if (novaDespesa.pedagioStr === '') {
      toast.error('Informe o valor do pedágio.');
      return;
    }

    let pedagioNum = novaDespesa.pedagioStr !== '' ? Number(novaDespesa.pedagioStr) : 0;

    const payload = {
      veiculo,
      data: novaDespesa.data,
      local: loc,
      quantidade: Number(novaDespesa.quantidadeStr),
      pedagio: pedagioNum,
      motorista: novaDespesa.motorista,
      combustivel: Number(novaDespesa.combustivelStr),
      hotel: novaDespesa.hotelStr !== '' ? Number(novaDespesa.hotelStr) : 0,
      gasto_extra_valor: novaDespesa.gastoExtraStr !== '' ? Number(novaDespesa.gastoExtraStr) : 0,
      gasto_extra_motivo: novaDespesa.gasto_extra_motivo || '',
      valor_transportadora: novaDespesa.valor_transportadora,
      economia: novaDespesa.economia
    };

    try {
      const { data, error } = await supabase.from('despesas_viagem').insert([payload]).select();
      
      if (error) {
        console.error(error);
        toast.error('Erro ao salvar no banco. A tabela "despesas_viagem" foi criada?');
        // Adiciona localmente caso o banco falhe, para o usuário não travar
        setDespesas([{ ...payload, id: Math.random().toString() } as Despesa, ...despesas]);
      } else if (data) {
        setDespesas([...data, ...despesas]);
        toast.success('Despesa registrada com sucesso!');
      }

      // Reset
      setNovaDespesa({
        motorista: 50,
        gasto_extra_motivo: '',
        pedagioStr: '',
        quantidadeStr: '',
        combustivelStr: '',
        hotelStr: '',
        gastoExtraStr: '',
        data: '',
        local: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão.');
    }
  };


  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('despesas_viagem').delete().eq('id', id);
      if (error) throw error;
      setDespesas(despesas.filter(d => d.id !== id));
      toast.success('Despesa excluída.');
    } catch (err) {
      console.error(err);
      setDespesas(despesas.filter(d => d.id !== id)); // Tenta excluir localmente se falhar
    }
  };

  const formatCurrency = (val: number) => {
    return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatNumber = (val: number) => {
    return Number(val).toLocaleString('pt-BR');
  };

  // Ajuste do fuso para data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const [chartMode, setChartMode] = useState<'MENSAL' | 'ANUAL'>('MENSAL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  const chartData = useMemo(() => {
    if (chartMode === 'MENSAL') {
      const dailyData: Record<string, { dayStr: string, economia: number, rawDate: Date }> = {};
      const [y, m] = selectedMonth.split('-');
      
      despesas.forEach(item => {
        if (!item.data) return;
        const [year, month, day] = item.data.split('-');
        if (!year || !month || !day) return;
        
        if (year === y && month === m) {
          const d = new Date(Number(year), Number(month) - 1, Number(day));
          const dayKey = `${year}-${month}-${day}`;
          const dayStr = `${day}/${month}`;
          
          if (!dailyData[dayKey]) dailyData[dayKey] = { dayStr, economia: 0, rawDate: d };
          dailyData[dayKey].economia += Number(item.economia || 0);
        }
      });
      return Object.values(dailyData).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({
        name: d.dayStr,
        economia: d.economia,
      }));
    } else {
      const monthlyData: Record<string, { monthStr: string, economia: number, rawDate: Date }> = {};
      
      despesas.forEach(item => {
        if (!item.data) return;
        const [year, month, day] = item.data.split('-');
        if (!year || !month || !day) return;
        
        if (year === selectedYear) {
          const d = new Date(Number(year), Number(month) - 1, 1);
          const monthKey = `${year}-${month}`;
          const monthStr = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
          
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { monthStr, economia: 0, rawDate: d };
          monthlyData[monthKey].economia += Number(item.economia || 0);
        }
      });
      return Object.values(monthlyData).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({
        name: d.monthStr,
        economia: d.economia,
      }));
    }
  }, [despesas, chartMode, selectedMonth, selectedYear]);

  const totalEconomia = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.economia, 0);
  }, [chartData]);

  const years = Array.from(new Set(despesas.map(d => {
    if (!d.data) return null;
    return d.data.split('-')[0];
  }).filter(Boolean))).sort().reverse() as string[];
  if (years.length === 0) years.push(new Date().getFullYear().toString());
  if (!years.includes(selectedYear)) years.push(selectedYear);

  return (
    <div className="mt-4 mb-8">


      <div className="bg-[#131825] border border-white/5 shadow-2xl rounded-2xl overflow-hidden relative">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-white/5">
        <h3 className="font-bold text-slate-300 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>
          Despesas de Viagem
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Data*</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Local*</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Qtd (KG)*</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Pedágio</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Motorista</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Combustível*</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Hotel</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap min-w-[200px]">Gasto Extra</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Valor Transp.</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap">Economia</th>
              <th className="px-3 py-3 font-semibold text-slate-400 text-xs uppercase whitespace-nowrap text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* Linha de Cadastro (Inline) */}
            <tr className="border-b border-blue-500/20 bg-blue-500/5">
              <td className="px-2 py-2">
                <Input 
                  type="date"
                  value={novaDespesa.data || ''}
                  onChange={(e) => setNovaDespesa({...novaDespesa, data: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[120px]"
                />
              </td>
              <td className="px-2 py-2">
                <Input 
                  type="text"
                  placeholder="Ex: RJ"
                  value={novaDespesa.local || ''}
                  onChange={(e) => {
                    const newLocal = e.target.value.toUpperCase();
                    let newPedagioStr = novaDespesa.pedagioStr;
                    const oldLocal = (novaDespesa.local || '').toUpperCase();
                    
                    // Auto-fill toll when typing RJ or BH
                    if (newLocal === 'RJ') newPedagioStr = '126';
                    else if (newLocal === 'BH') newPedagioStr = '109.2';
                    // Clear toll if it was automatically filled and the user changes the location to something else
                    else if (oldLocal === 'RJ' || oldLocal === 'BH') newPedagioStr = '';

                    setNovaDespesa({...novaDespesa, local: newLocal, pedagioStr: newPedagioStr});
                  }}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[60px] uppercase"
                  maxLength={2}
                />
              </td>
              <td className="px-2 py-2">
                <Input 
                  type="number"
                  placeholder="KG"
                  value={novaDespesa.quantidadeStr}
                  onChange={(e) => setNovaDespesa({...novaDespesa, quantidadeStr: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[80px]"
                />
              </td>
              <td className="px-2 py-2">
                <Input 
                  type="number"
                  placeholder="R$"
                  value={novaDespesa.pedagioStr}
                  onChange={(e) => setNovaDespesa({...novaDespesa, pedagioStr: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[80px]"
                />
              </td>
              <td className="px-2 py-2 font-medium text-slate-300">
                {formatCurrency(50)}
              </td>
              <td className="px-2 py-2">
                <Input 
                  type="number"
                  placeholder="R$"
                  value={novaDespesa.combustivelStr}
                  onChange={(e) => setNovaDespesa({...novaDespesa, combustivelStr: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[90px]"
                />
              </td>
              <td className="px-2 py-2">
                <Input 
                  type="number"
                  placeholder="R$"
                  value={novaDespesa.hotelStr}
                  onChange={(e) => setNovaDespesa({...novaDespesa, hotelStr: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[80px]"
                />
              </td>
              <td className="px-2 py-2 flex gap-1">
                <Input 
                  type="number"
                  placeholder="R$"
                  value={novaDespesa.gastoExtraStr}
                  onChange={(e) => setNovaDespesa({...novaDespesa, gastoExtraStr: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white w-[70px]"
                />
                <Input 
                  type="text"
                  placeholder="Motivo..."
                  value={novaDespesa.gasto_extra_motivo || ''}
                  onChange={(e) => setNovaDespesa({...novaDespesa, gasto_extra_motivo: e.target.value})}
                  className="h-8 text-xs bg-black/20 border-white/10 text-white flex-1 min-w-[100px]"
                />
              </td>
              <td className="px-2 py-2 font-medium text-blue-400 whitespace-nowrap">
                {formatCurrency(novaDespesa.valor_transportadora || 0)}
              </td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">
                <span className={(novaDespesa.economia || 0) >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatCurrency(novaDespesa.economia || 0)}
                </span>
              </td>
              <td className="px-2 py-2 text-right">
                <Button size="sm" onClick={handleAddRow} className="h-8 bg-blue-500 hover:bg-blue-600 text-white px-2">
                  <Save className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </td>
            </tr>

            {/* Lista de Registros */}
            {despesas.map(item => (
              <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-3 py-3 text-slate-300">{item.data ? formatDate(item.data) : '-'}</td>
                <td className="px-3 py-3 text-slate-300 font-bold uppercase">{item.local}</td>
                <td className="px-3 py-3 text-slate-300">{formatNumber(item.quantidade)}</td>
                <td className="px-3 py-3 text-slate-400">{formatCurrency(item.pedagio)}</td>
                <td className="px-3 py-3 text-slate-400">{formatCurrency(item.motorista)}</td>
                <td className="px-3 py-3 text-slate-300">{formatCurrency(item.combustivel)}</td>
                <td className="px-3 py-3 text-slate-400">{item.hotel ? formatCurrency(item.hotel) : '-'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">
                  {item.gasto_extra_valor ? (
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-300">{formatCurrency(item.gasto_extra_valor)}</span>
                      <span className="text-slate-500 italic truncate max-w-[150px]" title={item.gasto_extra_motivo}>{item.gasto_extra_motivo}</span>
                    </span>
                  ) : '-'}
                </td>
                <td className="px-3 py-3 text-blue-400 font-medium">{formatCurrency(item.valor_transportadora)}</td>
                <td className="px-3 py-3 font-medium">
                  <span className={item.economia >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatCurrency(item.economia)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => item.id && handleDelete(item.id)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {despesas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-500 text-sm">
                  Nenhuma despesa registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {chartData.length > 0 || true ? (
        <div className="mt-6 bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm mb-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
              Economia {chartMode === 'MENSAL' ? 'Mensal' : 'Anual'} - {veiculo}
            </h2>
            <div className="flex items-center gap-2">
              <Select value={chartMode} onValueChange={(v: any) => setChartMode(v)}>
                <SelectTrigger className="w-[110px] bg-black/20 border-white/10 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSAL">Mensal</SelectItem>
                  <SelectItem value="ANUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
              
              {chartMode === 'MENSAL' ? (
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-[140px] bg-black/20 border-white/10 h-8 text-xs text-slate-300"
                />
              ) : (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px] bg-black/20 border-white/10 h-8 text-xs">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium">ECONOMIA TOTAL {chartMode === 'MENSAL' ? 'DO MÊS' : 'DO ANO'}</span>
              <span className={`text-xl font-bold ${totalEconomia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                R$ {totalEconomia.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${(value/1000).toFixed(1)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#cbd5e1' }}
                    cursor={{fill: '#ffffff05'}}
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Economia']}
                  />
                  <Bar dataKey="economia" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.economia >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              Nenhuma viagem registrada neste {chartMode === 'MENSAL' ? 'mês' : 'ano'}.
            </div>
          )}
        </div>
      ) : null}

  </div>
  );
}

