import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { NotaFiscal } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCachedData, setCachedData, FORCE_SYNC_EVENT } from '@/lib/localCache';

const CACHE_KEY = 'notas_fiscais_v1';

interface NotaFiscalContextType {
  notasFiscais: NotaFiscal[];
  fetchNotasByFornecedor: (fornecedorId: string) => NotaFiscal[];
  addNotaFiscal: (nota: Omit<NotaFiscal, 'id' | 'createdAt'>) => Promise<{ success: boolean; id?: string }>;
  importNotasFiscais: (notas: Omit<NotaFiscal, 'id' | 'createdAt'>[], fileName?: string) => Promise<{ success: boolean; count: number; updatedCount: number }>;
  updateNotaFiscal: (id: string, updates: Partial<NotaFiscal>) => Promise<{ success: boolean }>;
  deleteNotaFiscal: (id: string) => Promise<{ success: boolean }>;
  fetchNotasFiscais: (fornecedorId: string) => Promise<void>;
  loading: boolean;
}

const NotaFiscalContext = createContext<NotaFiscalContextType | undefined>(undefined);

export function NotaFiscalProvider({ children }: { children: React.ReactNode }) {
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodasNotas = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData<NotaFiscal[]>(CACHE_KEY);
      if (cached) {
        setNotasFiscais(cached.data);
        setLoading(false);
        if (cached.isFresh) return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.from('notas_fiscais').select('*').order('data_emissao', { ascending: false });
    if (error) {
      console.error('Erro ao buscar notas fiscais:', error);
      setLoading(false);
      return;
    }
    if (data) {
      setNotasFiscais(data as NotaFiscal[]);
      await setCachedData(CACHE_KEY, data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTodasNotas(false);
    const onForceSync = () => fetchTodasNotas(true);
    window.addEventListener(FORCE_SYNC_EVENT, onForceSync);
    return () => window.removeEventListener(FORCE_SYNC_EVENT, onForceSync);
  }, [fetchTodasNotas]);

  const fetchNotasByFornecedor = (fornecedorId: string) => {
    return notasFiscais.filter(nota => nota.fornecedor_id === fornecedorId);
  };

  const fetchNotasFiscais = async (_fornecedorId: string) => {
    await fetchTodasNotas(true);
  };

  const addNotaFiscal = async (nota: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    const newDoc: NotaFiscal = {
      ...nota,
      id: 'nota-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };

    const next = [newDoc, ...notasFiscais];
    setNotasFiscais(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('notas_fiscais').insert([newDoc]);
    if (error) {
      toast.error("Erro inserindo Nota Fiscal: " + error.message);
      return { success: false };
    }

    return { success: true, id: newDoc.id };
  };

  const importNotasFiscais = async (novasNotas: Omit<NotaFiscal, 'id' | 'createdAt'>[], fileName?: string) => {
    const docsToInsert: NotaFiscal[] = [];
    const docsToUpdate: NotaFiscal[] = [];

    const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'upload';
    const importPrefix = `imp-${safeFileName}-${Date.now()}`;

    novasNotas.forEach((n) => {
      const existing = notasFiscais.find(
        ex => ex.fornecedor_id === n.fornecedor_id &&
              ex.numero_nota === n.numero_nota &&
              ex.codigo === n.codigo
      );

      if (existing) {
        docsToUpdate.push({
          ...existing,
          ...n
        });
      } else {
        docsToInsert.push({
          ...n,
          id: `${importPrefix}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        });
      }
    });

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
      fetchTodasNotas(true);
      return { success: false, count: 0, updatedCount: 0 };
    }

    const next = [...notasFiscais];
    docsToUpdate.forEach(updatedDoc => {
      const idx = next.findIndex(n => n.id === updatedDoc.id);
      if (idx !== -1) next[idx] = updatedDoc;
    });
    const finalList = [...docsToInsert, ...next];
    setNotasFiscais(finalList);
    setCachedData(CACHE_KEY, finalList);

    return { success: true, count: docsToInsert.length, updatedCount: docsToUpdate.length };
  };

  const deleteNotaFiscal = async (id: string) => {
    const next = notasFiscais.filter(n => n.id !== id);
    setNotasFiscais(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('notas_fiscais').delete().eq('id', id);
    if (error) {
      toast.error("Erro excluindo Nota Fiscal: " + error.message);
      return { success: false };
    }

    return { success: true };
  };

  const updateNotaFiscal = async (id: string, updates: Partial<NotaFiscal>) => {
    const next = notasFiscais.map(n => n.id === id ? { ...n, ...updates } : n);
    setNotasFiscais(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('notas_fiscais').update(updates).eq('id', id);
    if (error) {
      toast.error("Erro ao atualizar Nota Fiscal: " + error.message);
      fetchTodasNotas(true);
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
      deleteNotaFiscal,
      fetchNotasFiscais,
      loading
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
