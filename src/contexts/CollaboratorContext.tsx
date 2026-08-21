import React, { createContext, useContext, useEffect, useState } from 'react';
import { Collaborator, Pendency } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
}

const CollaboratorContext = createContext<CollaboratorContextType | undefined>(undefined);

export function CollaboratorProvider({ children }: { children: React.ReactNode }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendencies, setPendencies] = useState<Pendency[]>([]);

  const fetchData = async () => {
    const [{ data: colabData }, { data: pendData }] = await Promise.all([
      supabase.from('collaborators').select('*'),
      supabase.from('pendencies').select('*'),
    ]);
    if (colabData) setCollaborators(colabData as Collaborator[]);
    if (pendData) setPendencies(pendData as Pendency[]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCollaborator = async (colab: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingIndex = collaborators.findIndex(c => c.codigo === colab.codigo);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const targetId = collaborators[existingIndex].id;
      const updates = { ...colab, updatedAt: now };
      
      setCollaborators(prev => {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...updates };
        return next;
      });

      await supabase.from('collaborators').update(updates).eq('id', targetId);
      return { success: true, updated: true };
    }

    const newDoc: Collaborator = {
      ...colab,
      id: 'colab-' + Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Preparar dados para o banco adicionando defaults obrigatórios
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
    
    // Só atualiza o estado se o insert foi sucesso
    setCollaborators(prev => [newDoc, ...prev]);
    return { success: true };
  };

  const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
    const now = new Date().toISOString();
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c));
    
    await supabase.from('collaborators').update({ ...updates, updatedAt: now }).eq('id', id);
  };

  const deleteCollaborator = async (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    await supabase.from('collaborators').delete().eq('id', id);
  };

  const importCollaborators = async (colabsToImport: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    let duplicatedCount = 0;
    const now = new Date().toISOString();

    const newDocs: Collaborator[] = [];
    const updateDocs: Collaborator[] = [];

    setCollaborators(prev => {
      let nextColabs = [...prev];
      
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
      return nextColabs;
    });

    if (newDocs.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < newDocs.length; i += chunkSize) {
         const chunk = newDocs.slice(i, i + chunkSize).map((doc: any) => {
           return {
             ...doc,
             contratacao: doc.contratacao || 'CLT',
             salario: doc.salario || 0,
             encargos: doc.encargos || 0,
             total: doc.total || 0,
             valorHora: doc.valorHora || 0
           };
         });
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
    await supabase.from('collaborators').delete().neq('id', 'non-existent');
  };

  const addPendency = async (pendency: Omit<Pendency, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newDoc: Pendency = {
      ...pendency,
      id: 'pend-' + Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    setPendencies(prev => [newDoc, ...prev]);
    const { error } = await supabase.from('pendencies').insert([newDoc]);
    if (error) toast.error("Erro inserindo pendência: " + error.message);
    return { success: true };
  };

  const updatePendency = async (id: string, updates: Partial<Pendency>) => {
    const now = new Date().toISOString();
    setPendencies(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p));
    const { error } = await supabase.from('pendencies').update({ ...updates, updatedAt: now }).eq('id', id);
    if (error) {
      console.error('Error updating pendency:', error);
      toast.error('Erro ao atualizar no banco de dados: ' + error.message);
      throw error;
    }
  };

  const deletePendency = async (id: string) => {
    setPendencies(prev => prev.filter(p => p.id !== id));
    await supabase.from('pendencies').delete().eq('id', id);
  };

  return (
    <CollaboratorContext.Provider value={{ 
      collaborators, addCollaborator, updateCollaborator, deleteCollaborator, importCollaborators, deleteAllCollaborators,
      pendencies, addPendency, updatePendency, deletePendency
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
