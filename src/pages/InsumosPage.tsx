import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';
import { InsumoRow } from '@/components/insumos/InsumoRow';

export default function InsumosPage() {
  const { notasFiscais } = useNotasFiscais();

  const uniqueInsumos = useMemo(() => {
    const map = new Map<string, { codigo: string, descricao: string, data_emissao: number }>();
    
    notasFiscais.forEach(nota => {
      const key = nota.codigo;
      
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
        }
        return new Date(dStr).getTime();
      };
      
      const notaDate = parseDate(nota.data_emissao);

      if (!map.has(key)) {
        map.set(key, {
          codigo: nota.codigo,
          descricao: nota.descricao,
          data_emissao: notaDate
        });
      } else {
        const existing = map.get(key)!;
        // Se a nota atual for mais recente que a já salva, atualiza a descrição
        if (notaDate > existing.data_emissao) {
          map.set(key, {
            codigo: nota.codigo,
            descricao: nota.descricao,
            data_emissao: notaDate
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [notasFiscais]);

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col relative z-20 overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Package className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                Insumos
              </h1>
              <p className="text-slate-400 mt-1">
                {uniqueInsumos.length} insumos registrados na base
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#131825] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          {uniqueInsumos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300">Nenhum insumo encontrado</h3>
              <p className="text-slate-500">Importe notas fiscais para preencher a base de insumos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm uppercase tracking-wider bg-white/[0.02]">
                    <th className="py-4 px-4 font-semibold w-1/4">CÓDIGO</th>
                    <th className="py-4 px-4 font-semibold w-1/2">DESCRIÇÃO DO PRODUTO</th>
                    <th className="py-4 px-4 font-semibold text-right">HISTÓRICO</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {uniqueInsumos.map((insumo, index) => (
                    <InsumoRow key={`${insumo.codigo}-${index}`} insumo={insumo} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
