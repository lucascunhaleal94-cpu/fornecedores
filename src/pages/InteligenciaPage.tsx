import React, { useState, useMemo } from 'react';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductAnalysis {
  codigo: string;
  descricao: string;
  prevAvg: number;
  currAvg: number;
  currQty: number;
  savings: number;
  lastPurchaseDate?: string;
}

export default function InteligenciaPage() {
  const { notasFiscais } = useNotasFiscais();
  const [analysisMonth, setAnalysisMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const analysisData = useMemo(() => {
    if (!analysisMonth || !analysisMonth.includes('-')) return [];

    const [year, month] = analysisMonth.split('-');
    if (!year || !month) return [];

    const currDate = new Date(parseInt(year), parseInt(month) - 1, 1);

    const getNotaDate = (d?: string) => {
      if (!d) return null;
      const parts = d.split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const currMonthIndex = currDate.getMonth();
    const currYear = currDate.getFullYear();

    const currNotas: typeof notasFiscais = [];
    const pastNotas: typeof notasFiscais = [];

    notasFiscais.forEach(n => {
      const d = getNotaDate(n.data_emissao);
      if (!d) return;

      if (d.getFullYear() === currYear && d.getMonth() === currMonthIndex) {
        currNotas.push(n);
      } else if (d < currDate) {
        pastNotas.push(n);
      }
    });

    // Group current month by product
    const currGrouped = currNotas.reduce((acc, nota) => {
      const key = nota.codigo;
      if (!acc[key]) {
        acc[key] = {
          codigo: nota.codigo,
          descricao: nota.descricao,
          sumUnit: 0,
          count: 0,
          qty: 0
        };
      }
      acc[key].sumUnit += nota.valor_unitario;
      acc[key].count += 1;
      acc[key].qty += nota.quantidade;
      return acc;
    }, {} as Record<string, { codigo: string; descricao: string; sumUnit: number; count: number; qty: number }>);

    // Combine and calculate savings
    const result: ProductAnalysis[] = [];
    
    for (const key in currGrouped) {
      const curr = currGrouped[key];
      const currAvg = curr.sumUnit / curr.count;
      const currQty = curr.qty;
      
      let prevAvg = 0;
      let savings = 0;
      let lastPurchaseDate: string | undefined;

      const productPastNotas = pastNotas.filter(n => n.codigo === key);

      if (productPastNotas.length > 0) {
        let latestDate = new Date(0);
        for (const n of productPastNotas) {
          const d = getNotaDate(n.data_emissao)!;
          if (d > latestDate) {
            latestDate = d;
          }
        }

        const latestMonth = latestDate.getMonth();
        const latestYear = latestDate.getFullYear();

        const latestMonthNotas = productPastNotas.filter(n => {
          const d = getNotaDate(n.data_emissao)!;
          return d.getMonth() === latestMonth && d.getFullYear() === latestYear;
        });

        const prevSum = latestMonthNotas.reduce((acc, n) => acc + n.valor_unitario, 0);
        prevAvg = prevSum / latestMonthNotas.length;
        savings = (prevAvg - currAvg) * currQty;
        
        lastPurchaseDate = format(new Date(latestYear, latestMonth, 1), 'MMMM/yyyy', { locale: ptBR });
        lastPurchaseDate = lastPurchaseDate.charAt(0).toUpperCase() + lastPurchaseDate.slice(1);
      }

      result.push({
        codigo: curr.codigo,
        descricao: curr.descricao,
        prevAvg,
        currAvg,
        currQty,
        savings,
        lastPurchaseDate
      });
    }

    return result.sort((a, b) => b.savings - a.savings);
  }, [notasFiscais, analysisMonth]);

  const totalSavings = analysisData.reduce((acc, item) => acc + item.savings, 0);

  return (
    <div className="px-10 pb-12 pt-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Inteligência
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Análise de impacto financeiro por oscilação de preços de produtos.
          </p>
        </div>
        <label className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/5 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Calendar size={18} className="text-cyan-400" />
          </div>
          <input 
            type="month" 
            value={analysisMonth}
            onChange={(e) => setAnalysisMonth(e.target.value)}
            className="bg-transparent text-white font-semibold outline-none border-none cursor-pointer p-2 color-scheme-dark"
            style={{ colorScheme: 'dark' }}
          />
        </label>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-transparent p-7 rounded-[2rem] border border-cyan-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full pointer-events-none blur-2xl"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
              <Wallet size={24} />
            </div>
          </div>
          <h3 className={`text-4xl font-black tracking-tight ${totalSavings >= 0 ? 'text-emerald-400' : 'text-pink-400'}`}>
            {totalSavings >= 0 ? '+' : '-'} R$ {Math.abs(totalSavings).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[15px] text-slate-400 font-semibold mt-2">
            Resultado no Mês (Economia / Custo Extra)
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-5 text-sm font-bold text-slate-300">Produto</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-300">Preço Médio (Última Compra)</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-300">Preço Médio (Mês Atual)</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-300">Qtd. Mês Atual</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-300">Resultado Financeiro</th>
              </tr>
            </thead>
            <tbody>
              {analysisData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Nenhuma compra registrada para o mês de análise.
                  </td>
                </tr>
              ) : (
                analysisData.map((item, index) => (
                  <tr key={`${item.codigo}-${index}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{item.descricao}</span>
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{item.codigo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-semibold text-slate-300">
                        {item.prevAvg > 0 ? `R$ ${item.prevAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </span>
                      {item.lastPurchaseDate && (
                        <span className="block text-xs text-slate-500 font-medium mt-1">
                          {item.lastPurchaseDate}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-semibold text-white">
                        R$ {item.currAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-semibold text-slate-300">
                        {item.currQty}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {item.savings === 0 ? (
                        <div className="flex items-center gap-2 text-slate-500 font-bold">
                          <Minus size={16} /> R$ 0,00
                        </div>
                      ) : item.savings > 0 ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 w-fit px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          <ArrowUpRight size={16} /> + R$ {item.savings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-pink-400 font-bold bg-pink-500/10 w-fit px-3 py-1.5 rounded-xl border border-pink-500/20">
                          <ArrowDownRight size={16} /> - R$ {Math.abs(item.savings).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
