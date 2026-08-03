import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotaFiscal } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface NotaFiscalContextType {
  notasFiscais: NotaFiscal[];
  fetchNotasByFornecedor: (fornecedorId: string) => NotaFiscal[];
  addNotaFiscal: (nota: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<{ success: boolean; id?: string }>;
  importNotasFiscais: (notas: Omit<NotaFiscal, 'id' | 'createdAt'>[]) => Promise<{ success: boolean; count: number; updatedCount: number }>;
  updateNotaFiscal: (id: string, updates: Partial<NotaFiscal>) => Promise<{ success: boolean }>;
  deleteNotaFiscal: (id: string) => Promise<{ success: boolean }>;
}

const NotaFiscalContext = createContext<NotaFiscalContextType | undefined>(undefined);

export function NotaFiscalProvider({ children }: { children: React.ReactNode }) {
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);

  const fetchTodasNotas = async () => {
    const { data, error } = await supabase.from('notas_fiscais').select('*').order('data_emissao', { ascending: false });
    if (error) {
      console.error('Erro ao buscar notas fiscais:', error);
      return;
    }
    if (data) setNotasFiscais(data as NotaFiscal[]);
  };

  useEffect(() => {
    fetchTodasNotas();
  }, []);

  const fetchNotasByFornecedor = (fornecedorId: string) => {
    return notasFiscais.filter(nota => nota.fornecedor_id === fornecedorId);
  };

  const addNotaFiscal = async (nota: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    const newDoc: NotaFiscal = {
      ...nota,
      id: 'nota-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    
    setNotasFiscais(prev => [newDoc, ...prev]);
    
    const { error } = await supabase.from('notas_fiscais').insert([newDoc]);
    if (error) {
      toast.error("Erro inserindo Nota Fiscal: " + error.message);
      return { success: false };
    }
    
    return { success: true, id: newDoc.id };
  };

  const importNotasFiscais = async (novasNotas: Omit<NotaFiscal, 'id' | 'createdAt'>[]) => {
    const docsToInsert: NotaFiscal[] = [];
    const docsToUpdate: NotaFiscal[] = [];

    novasNotas.forEach(n => {
      // Find existing note matching the exact same criteria (fornecedor + nota + produto)
      const existing = notasFiscais.find(
        ex => ex.fornecedor_id === n.fornecedor_id && 
              ex.numero_nota === n.numero_nota && 
              ex.codigo === n.codigo
      );

      if (existing) {
        docsToUpdate.push({
          ...existing,
          ...n // update with new values (quantidade, valor, etc)
        });
      } else {
        docsToInsert.push({
          ...n,
          id: 'nota-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
        });
      }
    });

    // We do updates sequentially or via bulk if possible. Supabase allows bulk upsert, but we can just use updates
    let updateError = false;
    for (const doc of docsToUpdate) {
      const { error } = await supabase.from('notas_fiscais').update({
        data_emissao: doc.data_emissao,
        descricao: doc.descricao,
        quantidade: doc.quantidade,
        valor_unitario: doc.valor_unitario,
        motivo: doc.motivo
      }).eq('id', doc.id);
      
      if (error) {
        console.error("Error updating nota:", error);
        updateError = true;
      }
    }

    let insertError = false;
    if (docsToInsert.length > 0) {
      const { error } = await supabase.from('notas_fiscais').insert(docsToInsert);
      if (error) {
        console.error("Error inserting notas:", error);
        insertError = true;
      }
    }

    if (insertError || updateError) {
      toast.error("Alguns erros ocorreram durante a importação. A página será atualizada.");
      fetchTodasNotas();
      return { success: false, count: 0, updatedCount: 0 };
    }

    // Update local state
    setNotasFiscais(prev => {
      const next = [...prev];
      docsToUpdate.forEach(updatedDoc => {
        const idx = next.findIndex(n => n.id === updatedDoc.id);
        if (idx !== -1) next[idx] = updatedDoc;
      });
      return [...docsToInsert, ...next];
    });

    return { success: true, count: docsToInsert.length, updatedCount: docsToUpdate.length };
  };

  const deleteNotaFiscal = async (id: string) => {
    setNotasFiscais(prev => prev.filter(n => n.id !== id));
    
    const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
    if (error) {
      toast.error("Erro excluindo Nota Fiscal: " + error.message);
      return { success: false };
    }
    
    return { success: true };
  };

  const updateNotaFiscal = async (id: string, updates: Partial<NotaFiscal>) => {
    setNotasFiscais(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    
    const { error } = await supabase.from('notas_fiscais').update(updates).eq('id', id);
    if (error) {
      toast.error("Erro ao atualizar Nota Fiscal: " + error.message);
      fetchTodasNotas();
      return { success: false };
    }
    return { success: true };
  };

  return (
    <NotaFiscalContext.Provider value={{
      notasFiscais,
      fetchNotasByFornecedor,
      addNotaFiscal,
      importNotasFiscais,
      updateNotaFiscal,
      deleteNotaFiscal
    }}>
      {children}
    </NotaFiscalContext.Provider>
  );
}

export function useNotasFiscais() {
  const context = useContext(NotaFiscalContext);
  if (context === undefined) {
    throw new Error('useNotasFiscais must be used within a NotaFiscalProvider');
  }
  return context;
}
