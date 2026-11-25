import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Lead, LeadStatus, ProjectAttachment } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCachedData, setCachedData, FORCE_SYNC_EVENT } from '@/lib/localCache';

const CACHE_KEY = 'leads_meta_v1';

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<{ success: boolean; id: string }>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<{ success: boolean }>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  loadLeadAttachments: (leadId: string) => Promise<ProjectAttachment[]>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

const stripLeadAttachments = (items: Lead[]): Lead[] =>
  items.map(({ attachments, ...rest }) => ({ ...rest, attachments: [] }));

export function LeadProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const loadedAttachmentsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData<Lead[]>(CACHE_KEY);
      if (cached) {
        setLeads(cached.data);
        if (cached.isFresh) return;
      }
    }

    // Exclui coluna pesada `attachments` (Base64) da carga inicial
    let { data, error } = await supabase
      .from('leads')
      .select('id, empresa, cnpj, contato, telefone, email, cidade, uf, origem, segmento, interesse, status, responsavel, observacoes, createdAt');

    if (error) {
      const retry = await supabase.from('leads').select('*');
      data = retry.data as any;
      error = retry.error;
    }

    if (data) {
      const normalized = (data as Lead[]).map(l => ({ ...l, attachments: l.attachments || [] }));
      loadedAttachmentsRef.current.clear();
      setLeads(normalized);
      await setCachedData(CACHE_KEY, stripLeadAttachments(normalized));
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    const onForceSync = () => fetchData(true);
    window.addEventListener(FORCE_SYNC_EVENT, onForceSync);
    return () => window.removeEventListener(FORCE_SYNC_EVENT, onForceSync);
  }, [fetchData]);

  const loadLeadAttachments = useCallback(async (leadId: string): Promise<ProjectAttachment[]> => {
    const existing = leads.find(l => l.id === leadId);
    if (loadedAttachmentsRef.current.has(leadId) && existing) {
      return existing.attachments || [];
    }

    const { data, error } = await supabase
      .from('leads')
      .select('attachments')
      .eq('id', leadId)
      .single();

    if (error || !data) {
      console.error('Erro ao carregar anexos do potencial fornecedor:', error);
      return existing?.attachments || [];
    }

    const fullAttachments = ((data as any).attachments || []) as ProjectAttachment[];
    loadedAttachmentsRef.current.add(leadId);
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, attachments: fullAttachments } : l))
    );

    return fullAttachments;
  }, [leads]);

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt'>) => {
    const newDoc: Lead = {
      ...lead,
      id: 'lead-' + Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const nextList = [newDoc, ...leads];
    setLeads(nextList);
    loadedAttachmentsRef.current.add(newDoc.id);
    setCachedData(CACHE_KEY, stripLeadAttachments(nextList));

    const { error } = await supabase.from('leads').insert([newDoc]);
    if (error) {
      toast.error("Erro inserindo Potencial Fornecedor: " + error.message);
      return { success: false, id: '' };
    }

    return { success: true, id: newDoc.id };
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const nextList = leads.map(l => (l.id === id ? { ...l, ...updates } : l));
    setLeads(nextList);
    setCachedData(CACHE_KEY, stripLeadAttachments(nextList));

    const { error } = await supabase.from('leads').update(updates).eq('id', id);
    if (error) {
      toast.error("Erro atualizando Potencial Fornecedor: " + error.message);
      return { success: false };
    }

    return { success: true };
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    const nextList = leads.map(l => (l.id === id ? { ...l, status } : l));
    setLeads(nextList);
    setCachedData(CACHE_KEY, stripLeadAttachments(nextList));
    await supabase.from('leads').update({ status }).eq('id', id);
  };

  const deleteLead = async (id: string) => {
    const nextList = leads.filter(l => l.id !== id);
    setLeads(nextList);
    loadedAttachmentsRef.current.delete(id);
    setCachedData(CACHE_KEY, stripLeadAttachments(nextList));
    await supabase.from('leads').delete().eq('id', id);
  };

  return (
    <LeadContext.Provider value={{ leads, addLead, updateLead, updateLeadStatus, deleteLead, loadLeadAttachments }}>
      {children}
    </LeadContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}
