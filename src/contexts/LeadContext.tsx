import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lead, LeadStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<{ success: boolean; id: string }>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<{ success: boolean }>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export function LeadProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);

  const fetchData = async () => {
    const { data, error } = await supabase.from('leads').select('*');
    if (data) {
      setLeads(data as Lead[]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt'>) => {
    const newDoc: Lead = {
      ...lead,
      id: 'lead-' + Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    setLeads(prev => [newDoc, ...prev]);
    
    const { error } = await supabase.from('leads').insert([newDoc]);
    if (error) {
      toast.error("Erro inserindo Potencial Fornecedor: " + error.message);
      return { success: false, id: '' };
    }
    
    return { success: true, id: newDoc.id };
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
    
    const { error } = await supabase.from('leads').update(updates).eq('id', id);
    if (error) {
      toast.error("Erro atualizando Potencial Fornecedor: " + error.message);
      return { success: false };
    }
    
    return { success: true };
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
    await supabase.from('leads').update({ status }).eq('id', id);
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from('leads').delete().eq('id', id);
  };

  return (
    <LeadContext.Provider value={{ leads, addLead, updateLead, updateLeadStatus, deleteLead }}>
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
