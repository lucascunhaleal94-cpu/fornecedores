import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Collaborator, Pendency, ProjectAttachment } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCachedData, setCachedData, FORCE_SYNC_EVENT } from '@/lib/localCache';

const CACHE_KEY_COLABS = 'collaborators_v1';
const CACHE_KEY_PENDS = 'pendencies_meta_v2';

interface CollaboratorContextType {
  collaborators: Collaborator[];
  addCollaborator: (colab: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean, reason?: string, updated?: boolean }>;
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  importCollaborators: (colabsToImport: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<{ successCount: number, duplicatedCount: number }>;
  deleteAllCollaborators: () => Promise<void>;

  pendencies: Pendency[];
  addPendency: (pendency: Omit<Pendency, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean }>;
  updatePendency: (id: string, updates: Partial<Pendency>) => Promise<void>;
  deletePendency: (id: string) => Promise<void>;
  loadPendencyAttachments: (pendencyId: string) => Promise<ProjectAttachment[]>;
  loadedPendencyAttachmentIds: Set<string>;
}

const CollaboratorContext = createContext<CollaboratorContextType | undefined>(undefined);

const stripPendencyAnexos = (items: Pendency[]): Pendency[] =>
  items.map(({ anexos, hasAnexos, ...rest }) => ({
    ...rest,
    anexos: [],
    hasAnexos: typeof hasAnexos === 'boolean' ? hasAnexos : (anexos?.length || 0) > 0,
  }));

export function CollaboratorProvider({ children }: { children: React.ReactNode }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendencies, setPendencies] = useState<Pendency[]>([]);
  const [loadedPendencyAttachmentIds, setLoadedPendencyAttachmentIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const [cachedColabs, cachedPends] = await Promise.all([
        getCachedData<Collaborator[]>(CACHE_KEY_COLABS),
        getCachedData<Pendency[]>(CACHE_KEY_PENDS),
      ]);
      if (cachedColabs) setCollaborators(cachedColabs.data);
      if (cachedPends) setPendencies(cachedPends.data);
      if (cachedColabs?.isFresh && cachedPends?.isFresh) return;
    }

    // Exclui a coluna pesada `anexos` (Base64) da carga inicial das pendências
    // e consulta apenas os IDs das pendências que realmente possuem anexos
    const [{ data: colabData }, pendRes, pendWithAnexosRes] = await Promise.all([
      supabase.from('collaborators').select('*'),
      supabase
        .from('pendencies')
        .select('id, fornecedorId, colaboradoresIds, descricao, prazo, urgencia, concluida, dataConclusao, obsConclusao, observacao, interacoes, createdAt, updatedAt'),
      supabase
        .from('pendencies')
        .select('id')
        .not('anexos->0', 'is', null),
    ]);

    let pendData: any[] | null = pendRes.data;
    if (pendRes.error) {
      const retry = await supabase.from('pendencies').select('*');
      pendData = retry.data;
    }

    let idsWithAnexos: Set<string> | null = null;
    if (!pendWithAnexosRes.error && pendWithAnexosRes.data) {
      idsWithAnexos = new Set((pendWithAnexosRes.data as { id: string }[]).map(row => row.id));
    } else if (pendWithAnexosRes.error) {
      const fallbackRes = await supabase
        .from('pendencies')
        .select('id')
        .not('anexos', 'is', null)
        .neq('anexos', '[]');
      if (!fallbackRes.error && fallbackRes.data) {
        idsWithAnexos = new Set((fallbackRes.data as { id: string }[]).map(row => row.id));
      }
    }

    if (colabData) {
      setCollaborators(colabData as Collaborator[]);
      await setCachedData(CACHE_KEY_COLABS, colabData);
    }
    if (pendData) {
      const normalized = (pendData as Pendency[]).map(p => {
        const hasLoadedAnexos = Array.isArray(p.anexos) && p.anexos.length > 0;
        const hasAnexos = hasLoadedAnexos || (idsWithAnexos ? idsWithAnexos.has(p.id) : false);
        return { ...p, anexos: p.anexos || [], hasAnexos };
      });
      loadedRef.current = new Set();
      setLoadedPendencyAttachmentIds(new Set());
      setPendencies(normalized);
      await setCachedData(CACHE_KEY_PENDS, stripPendencyAnexos(normalized));
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    const onForceSync = () => fetchData(true);
    window.addEventListener(FORCE_SYNC_EVENT, onForceSync);
    return () => window.removeEventListener(FORCE_SYNC_EVENT, onForceSync);
  }, [fetchData]);

  const loadPendencyAttachments = useCallback(async (pendencyId: string): Promise<ProjectAttachment[]> => {
    const existing = pendencies.find(p => p.id === pendencyId);
    if (loadedRef.current.has(pendencyId) && existing) {
      return existing.anexos || [];
    }

    const { data, error } = await supabase
      .from('pendencies')
      .select('anexos')
      .eq('id', pendencyId)
      .single();

    if (error || !data) {
      console.error('Erro ao carregar anexos da pendência:', error);
      return existing?.anexos || [];
    }

    const fullAnexos = ((data as any).anexos || []) as ProjectAttachment[];
    loadedRef.current.add(pendencyId);
    setLoadedPendencyAttachmentIds(new Set(loadedRef.current));
    setPendencies(prev => {
      const next = prev.map(p =>
        p.id === pendencyId ? { ...p, anexos: fullAnexos, hasAnexos: fullAnexos.length > 0 } : p
      );
      setCachedData(CACHE_KEY_PENDS, stripPendencyAnexos(next));
      return next;
    });

    return fullAnexos;
  }, [pendencies]);

  const addCollaborator = async (colab: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingIndex = collaborators.findIndex(c => c.codigo === colab.codigo);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const targetId = collaborators[existingIndex].id;
      const updates = { ...colab, updatedAt: now };

      const next = [...collaborators];
      next[existingIndex] = { ...next[existingIndex], ...updates };
      setCollaborators(next);
      setCachedData(CACHE_KEY_COLABS, next);

      await supabase.from('collaborators').update(updates).eq('id', targetId);
      return { success: true, updated: true };
    }

    const newDoc: Collaborator = {
      ...colab,
      id: 'colab-' + Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    const dbDoc: any = {
      ...newDoc,
      contratacao: (colab as any).contratacao || 'CLT',
      salario: (colab as any).salario || 0,
      encargos: (colab as any).encargos || 0,
      total: (colab as any).total || 0,
      valorHora: (colab as any).valorHora || 0,
    };

    const { error } = await supabase.from('collaborators').insert([dbDoc]);
    if (error) {
      toast.error("Erro inserindo colaborador: " + error.message);
      return { success: false, reason: error.message };
    }

    const next = [newDoc, ...collaborators];
    setCollaborators(next);
    setCachedData(CACHE_KEY_COLABS, next);
    return { success: true };
  };

  const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
    const now = new Date().toISOString();
    const next = collaborators.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c);
    setCollaborators(next);
    setCachedData(CACHE_KEY_COLABS, next);
    await supabase.from('collaborators').update({ ...updates, updatedAt: now }).eq('id', id);
  };

  const deleteCollaborator = async (id: string) => {
    const next = collaborators.filter(c => c.id !== id);
    setCollaborators(next);
    setCachedData(CACHE_KEY_COLABS, next);
    await supabase.from('collaborators').delete().eq('id', id);
  };

  const importCollaborators = async (colabsToImport: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    let duplicatedCount = 0;
    const now = new Date().toISOString();

    const newDocs: Collaborator[] = [];
    const updateDocs: Collaborator[] = [];
    let nextColabs = [...collaborators];

    colabsToImport.forEach((c, i) => {
      const existingIndex = nextColabs.findIndex(existing => existing.codigo === c.codigo);

      if (existingIndex !== -1) {
        duplicatedCount++;
        const up = { ...nextColabs[existingIndex], ...c, updatedAt: now };
        nextColabs[existingIndex] = up;
        updateDocs.push(up);
      } else {
        const newDoc: Collaborator = {
          ...c,
          id: 'colab-imp-' + Date.now().toString() + '-' + i,
          createdAt: now,
          updatedAt: now
        };
        newDocs.push(newDoc);
        nextColabs.unshift(newDoc);
      }
    });

    setCollaborators(nextColabs);
    setCachedData(CACHE_KEY_COLABS, nextColabs);

    if (newDocs.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < newDocs.length; i += chunkSize) {
        const chunk = newDocs.slice(i, i + chunkSize).map((doc: any) => ({
          ...doc,
          contratacao: doc.contratacao || 'CLT',
          salario: doc.salario || 0,
          encargos: doc.encargos || 0,
          total: doc.total || 0,
          valorHora: doc.valorHora || 0
        }));
        await supabase.from('collaborators').insert(chunk);
      }
    }

    if (updateDocs.length > 0) {
      for (const doc of updateDocs) {
        await supabase.from('collaborators').update({ ...doc, id: undefined }).eq('id', doc.id);
      }
    }

    return { successCount: colabsToImport.length - duplicatedCount, duplicatedCount };
  };

  const deleteAllCollaborators = async () => {
    setCollaborators([]);
    setCachedData(CACHE_KEY_COLABS, []);
    await supabase.from('collaborators').delete().neq('id', 'non-existent');
  };

  const addPendency = async (pendency: Omit<Pendency, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const { hasAnexos: _ignored, ...cleanPendency } = pendency;
    const hasAnexos = (cleanPendency.anexos?.length || 0) > 0;
    const newDoc: Pendency = {
      ...cleanPendency,
      id: 'pend-' + Date.now().toString(),
      hasAnexos,
      createdAt: now,
      updatedAt: now,
    };
    const next = [newDoc, ...pendencies];
    setPendencies(next);
    loadedRef.current.add(newDoc.id);
    setLoadedPendencyAttachmentIds(new Set(loadedRef.current));
    setCachedData(CACHE_KEY_PENDS, stripPendencyAnexos(next));

    const { hasAnexos: _dbIgnored, ...dbDoc } = newDoc;
    const { error } = await supabase.from('pendencies').insert([dbDoc]);
    if (error) toast.error("Erro inserindo pendência: " + error.message);
    return { success: true };
  };

  const updatePendency = async (id: string, updates: Partial<Pendency>) => {
    const now = new Date().toISOString();
    const { hasAnexos: _ignored, ...cleanUpdates } = updates;
    const hasAnexosUpdate = 'anexos' in cleanUpdates;
    const next = pendencies.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...cleanUpdates,
        hasAnexos: hasAnexosUpdate ? (cleanUpdates.anexos?.length || 0) > 0 : p.hasAnexos,
        updatedAt: now,
      };
    });
    setPendencies(next);
    if (hasAnexosUpdate) {
      loadedRef.current.add(id);
      setLoadedPendencyAttachmentIds(new Set(loadedRef.current));
    }
    setCachedData(CACHE_KEY_PENDS, stripPendencyAnexos(next));

    const dbUpdates: any = { ...cleanUpdates, updatedAt: now };
    if (!hasAnexosUpdate) {
      delete dbUpdates.anexos;
    }

    const { error } = await supabase.from('pendencies').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating pendency:', error);
      toast.error('Erro ao atualizar no banco de dados: ' + error.message);
      throw error;
    }
  };

  const deletePendency = async (id: string) => {
    const next = pendencies.filter(p => p.id !== id);
    setPendencies(next);
    loadedRef.current.delete(id);
    setLoadedPendencyAttachmentIds(new Set(loadedRef.current));
    setCachedData(CACHE_KEY_PENDS, stripPendencyAnexos(next));
    await supabase.from('pendencies').delete().eq('id', id);
  };

  return (
    <CollaboratorContext.Provider value={{
      collaborators, addCollaborator, updateCollaborator, deleteCollaborator, importCollaborators, deleteAllCollaborators,
      pendencies, addPendency, updatePendency, deletePendency, loadPendencyAttachments, loadedPendencyAttachmentIds
    }}>
      {children}
    </CollaboratorContext.Provider>
  );
}

export function useCollaborators() {
  const context = useContext(CollaboratorContext);
  if (context === undefined) {
    throw new Error('useCollaborators must be used within a CollaboratorProvider');
  }
  return context;
}
