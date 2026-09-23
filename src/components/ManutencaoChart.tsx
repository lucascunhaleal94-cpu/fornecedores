import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Wrench, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ManutencaoChartProps {
  data: any[];
  veiculoId: string;
  veiculoTitle: string;
  isEquip: boolean;
}

export function ManutencaoChart({ data, veiculoId, veiculoTitle, isEquip }: ManutencaoChartProps) {
  const [mode, setMode] = useState<'MENSAL' | 'ANUAL'>('MENSAL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  const chartData = useMemo(() => {
    if (mode === 'MENSAL') {
      const dailyData: Record<string, { dayStr: string, total: number, prev: number, corr: number, rawDate: Date }> = {};
      const [y, m] = selectedMonth.split('-');
      
      data.forEach(item => {
        if (!item.valor_gasto) return;
        const dateVal = item.data_realizacao || item.created_at;
        if (!dateVal) return;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return;

        if (d.getFullYear().toString() === y && String(d.getMonth() + 1).padStart(2, '0') === m) {
          const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          
          if (!dailyData[dayKey]) dailyData[dayKey] = { dayStr, total: 0, prev: 0, corr: 0, rawDate: d };
          
          const val = Number(item.valor_gasto);
          dailyData[dayKey].total += val;
          if (item.tipo === 'PREVENTIVA') dailyData[dayKey].prev += val;
          else dailyData[dayKey].corr += val;
        }
      });

      return Object.values(dailyData).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({
        name: d.dayStr,
        'Preventiva': d.prev,
        'Corretiva': d.corr,
        total: d.total,
        prevPercent: d.total > 0 ? ((d.prev / d.total) * 100).toFixed(1) : 0,
        corrPercent: d.total > 0 ? ((d.corr / d.total) * 100).toFixed(1) : 0,
      }));

    } else {
      const monthlyData: Record<string, { monthStr: string, total: number, prev: number, corr: number, rawDate: Date }> = {};
      
      data.forEach(item => {
        if (!item.valor_gasto) return;
        const dateVal = item.data_realizacao || item.created_at;
        if (!dateVal) return;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return;

        if (d.getFullYear().toString() === selectedYear) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthStr = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
          
          if (!monthlyData[monthKey]) monthlyData[monthKey] = { monthStr, total: 0, prev: 0, corr: 0, rawDate: new Date(d.getFullYear(), d.getMonth(), 1) };
          
          const val = Number(item.valor_gasto);
          monthlyData[monthKey].total += val;
          if (item.tipo === 'PREVENTIVA') monthlyData[monthKey].prev += val;
          else monthlyData[monthKey].corr += val;
        }
      });

      return Object.values(monthlyData).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({
        name: d.monthStr,
        'Preventiva': d.prev,
        'Corretiva': d.corr,
        total: d.total,
        prevPercent: d.total > 0 ? ((d.prev / d.total) * 100).toFixed(1) : 0,
        corrPercent: d.total > 0 ? ((d.corr / d.total) * 100).toFixed(1) : 0,
      }));
    }
  }, [data, mode, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    let total = 0, prev = 0, corr = 0;
    chartData.forEach(d => {
      total += d.total;
      prev += d['Preventiva'];
      corr += d['Corretiva'];
    });
    return { total, prev, corr };
  }, [chartData]);

  if (data.length === 0) return null;

  const Icon = isEquip ? Settings2 : Wrench;
  const colorClass = veiculoId === 'caminhao' ? 'text-blue-400' : (veiculoId === 'strada' ? 'text-amber-400' : 'text-purple-400');

  const years = Array.from(new Set(data.map(d => {
    const dt = d.data_realizacao || d.created_at;
    return dt ? new Date(dt).getFullYear().toString() : null;
  }).filter(Boolean))).sort().reverse();
  if (years.length === 0) years.push(new Date().getFullYear().toString());
  if (!years.includes(selectedYear)) years.push(selectedYear);

  return (
    <div className="mt-6 mb-4 bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colorClass}`} /> 
          Custos de Manutenção - {veiculoTitle}
        </h2>
        <div className="flex items-center gap-2">
          <Select value={mode} onValueChange={(v: any) => setMode(v)}>
            <SelectTrigger className="w-[110px] bg-black/20 border-white/10 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MENSAL">Mensal</SelectItem>
              <SelectItem value="ANUAL">Anual</SelectItem>
            </SelectContent>
          </Select>
          
          {mode === 'MENSAL' ? (
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
                {years.map((y: string) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex gap-6 mb-6">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 font-medium">TOTAL {mode === 'MENSAL' ? 'DO MÊS' : 'DO ANO'}</span>
          <span className="text-xl font-bold text-slate-200">
            R$ {totals.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-blue-400/70 font-medium">PREVENTIVA</span>
          <span className="text-lg font-semibold text-blue-400">
            R$ {totals.prev.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-red-400/70 font-medium">CORRETIVA</span>
          <span className="text-lg font-semibold text-red-400">
            R$ {totals.corr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${(value/1000).toFixed(1)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#cbd5e1' }}
                cursor={{fill: '#ffffff05'}}
                formatter={(value: any, name: string, props: any) => {
                  if (name === 'Preventiva' || name === 'Corretiva') {
                    const percent = name === 'Preventiva' ? props.payload.prevPercent : props.payload.corrPercent;
                    return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percent}%)`, name];
                  }
                  return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, name];
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Preventiva" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Corretiva" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          Nenhum custo registrado neste {mode === 'MENSAL' ? 'mês' : 'ano'}.
        </div>
      )}
    </div>
  );
}
