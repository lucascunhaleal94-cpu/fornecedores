import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Fornecedor } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCachedData, setCachedData, FORCE_SYNC_EVENT } from '@/lib/localCache';

const CACHE_KEY = 'fornecedores_v1';

interface FornecedorContextType {
  fornecedores: Fornecedor[];
  addFornecedor: (fornecedor: Omit<Fornecedor, 'id' | 'createdAt'>) => Promise<{ success: boolean; id?: string }>;
  updateFornecedor: (id: string, updates: Partial<Fornecedor>) => Promise<{ success: boolean }>;
  deleteFornecedor: (id: string) => Promise<{ success: boolean }>;
  importFornecedores: (novosFornecedores: Omit<Fornecedor, 'id' | 'createdAt'>[]) => Promise<{ success: boolean; count: number }>;
}

const FornecedorContext = createContext<FornecedorContextType | undefined>(undefined);

export function FornecedorProvider({ children }: { children: React.ReactNode }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const fetchFornecedores = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData<Fornecedor[]>(CACHE_KEY);
      if (cached) {
        setFornecedores(cached.data);
        if (cached.isFresh) return;
      }
    }

    const { data, error } = await supabase.from('fornecedores').select('*').order('razaoSocial', { ascending: true });
    if (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return;
    }
    if (data) {
      setFornecedores(data as Fornecedor[]);
      await setCachedData(CACHE_KEY, data);
    }
  }, []);

  useEffect(() => {
    fetchFornecedores(false);
    const onForceSync = () => fetchFornecedores(true);
    window.addEventListener(FORCE_SYNC_EVENT, onForceSync);
    return () => window.removeEventListener(FORCE_SYNC_EVENT, onForceSync);
  }, [fetchFornecedores]);

  const addFornecedor = async (fornecedor: Omit<Fornecedor, 'id' | 'createdAt'>) => {
    const newDoc: Fornecedor = {
      ...fornecedor,
      id: 'forn-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };

    const next = [newDoc, ...fornecedores];
    setFornecedores(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('fornecedores').insert([newDoc]);
    if (error) {
      toast.error("Erro inserindo Fornecedor: " + error.message);
      return { success: false };
    }

    return { success: true, id: newDoc.id };
  };

  const updateFornecedor = async (id: string, updates: Partial<Fornecedor>) => {
    const next = fornecedores.map(f => (f.id === id ? { ...f, ...updates } : f));
    setFornecedores(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('fornecedores').update(updates).eq('id', id);
    if (error) {
      toast.error("Erro atualizando Fornecedor: " + error.message);
      return { success: false };
    }

    return { success: true };
  };

  const deleteFornecedor = async (id: string) => {
    const next = fornecedores.filter(f => f.id !== id);
    setFornecedores(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) {
      toast.error("Erro excluindo Fornecedor: " + error.message);
      return { success: false };
    }

    return { success: true };
  };

  const importFornecedores = async (novosFornecedores: Omit<Fornecedor, 'id' | 'createdAt'>[]) => {
    const docsToInsert = novosFornecedores.map(f => ({
      ...f,
      id: 'forn-' + Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    }));

    const next = [...docsToInsert, ...fornecedores];
    setFornecedores(next);
    setCachedData(CACHE_KEY, next);

    const { error } = await supabase.from('fornecedores').insert(docsToInsert);
    if (error) {
      toast.error("Erro na importação: " + error.message);
      fetchFornecedores(true);
      return { success: false, count: 0 };
    }

    return { success: true, count: docsToInsert.length };
  };

  return (
    <FornecedorContext.Provider value={{ fornecedores, addFornecedor, updateFornecedor, deleteFornecedor, importFornecedores }}>
      {children}
    </FornecedorContext.Provider>
  );
}

export function useFornecedores() {
  const context = useContext(FornecedorContext);
  if (context === undefined) {
    throw new Error('useFornecedores must be used within a FornecedorProvider');
  }
  return context;
}
