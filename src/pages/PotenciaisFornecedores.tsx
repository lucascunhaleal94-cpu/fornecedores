import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, UserPlus, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadStatus, Lead } from '@/types';
import { useLeads } from '@/contexts/LeadContext';
import { LeadDialog } from '@/components/leads/LeadDialog';
import LeadDetailsDialog from '@/components/leads/LeadDetailsDialog';
import { toast } from 'sonner';

const pipelineStages: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'novo', label: 'Potencial Fornecedor', color: 'border-info/30 bg-info/5' },
  { status: 'em_contato', label: 'Em Contato', color: 'border-primary/30 bg-primary/5' },
  { status: 'qualificado', label: 'Qualificado', color: 'border-accent/30 bg-accent/5' },
  { status: 'proposta', label: 'Proposta', color: 'border-warning/30 bg-warning/5' },
  { status: 'em_analise', label: 'Em análise', color: 'border-indigo-500/30 bg-indigo-500/5' },
  { status: 'convertido', label: 'Aprovado', color: 'border-success/30 bg-success/5' },
  { status: 'perdido', label: 'Reprovado', color: 'border-destructive/30 bg-destructive/5' },
];

export default function LeadsPage() {
  const { leads, updateLeadStatus, deleteLead } = useLeads();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [leadDetails, setLeadDetails] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.empresa.toLowerCase().includes(q) || l.contato.toLowerCase().includes(q) || l.cnpj.includes(q);
      const matchStatus = statusFilter === 'todos' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const handleOpenNew = () => {
    setLeadToEdit(null);
    setDialogOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setLeadToEdit(lead);
    setDialogOpen(true);
  };

  const handleViewDetails = (lead: Lead) => {
    setLeadDetails(lead);
    setDetailsOpen(true);
  };

  const handleDelete = (id: string, empresa: string) => {
    if (confirm(`Tem certeza que deseja excluir o lead ${empresa}?`)) {
      deleteLead(id);
      toast.success('Lead excluído com sucesso');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add small timeout to allow UI update before ghost drag image is captured
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      updateLeadStatus(leadId, status);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-accent" />
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} leads encontrados</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted/60 rounded-lg p-1">
            <Button variant={viewMode === 'pipeline' ? 'default' : 'ghost'} size="sm" className="h-8" onClick={() => setViewMode('pipeline')}>Pipeline</Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8" onClick={() => setViewMode('list')}>Lista</Button>
          </div>
          <Button size="sm" className="gap-2" onClick={handleOpenNew}>
            <Plus className="w-4 h-4" /> Potencial Fornecedor
          </Button>
          <LeadDialog 
            open={dialogOpen} 
            onOpenChange={setDialogOpen} 
            leadToEdit={leadToEdit} 
          />
          <LeadDetailsDialog 
            open={detailsOpen} 
            onOpenChange={setDetailsOpen} 
            lead={leadDetails} 
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {pipelineStages.map(s => <SelectItem key={s.status} value={s.status}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
          {pipelineStages.map(stage => {
            const stageLeads = filtered.filter(l => l.status === stage.status);
            return (
              <div 
                key={stage.status} 
                className={`min-w-[260px] flex-1 rounded-xl border-2 ${stage.color} p-3 flex flex-col`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.status)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                  <span className="text-xs font-medium text-muted-foreground bg-card rounded-full px-2 py-0.5 border border-border">{stageLeads.length}</span>
                </div>
                <div className="space-y-2 flex-1 relative">
                  {stageLeads.map((lead, i) => (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, lead.id)}
                      onDragEnd={(e) => handleDragEnd(e as unknown as React.DragEvent)}
                      onDoubleClick={(e) => { e.stopPropagation(); handleViewDetails(lead); }}
                      className="bg-card rounded-lg p-3.5 shadow-card border border-border hover:shadow-elevated hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing relative group"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                         <button onClick={(e) => { e.stopPropagation(); handleEdit(lead); }} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary">
                            <Edit className="w-3.5 h-3.5" />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id, lead.empresa); }} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>

                      <h4 className="font-semibold text-sm text-foreground pr-10">{lead.empresa}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{lead.contato} · {lead.cidade}/{lead.uf}</p>
                      <p className="text-xs text-muted-foreground mt-0.5" title={lead.segmento + ' - ' + lead.interesse}>
                        <span className="inline-block max-w-[200px] truncate">{lead.segmento} · {lead.interesse}</span>
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-muted-foreground py-0.5 px-2 bg-muted rounded-full">{lead.responsavel}</span>
                        <div className="flex items-center gap-2">
                          {lead.attachments && lead.attachments.length > 0 && (
                            <div className="flex items-center text-xs text-muted-foreground" title={`${lead.attachments.length} anexos`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {lead.attachments.length}
                            </div>
                          )}
                          {stage.status !== 'convertido' && stage.status !== 'perdido' && (
                            <ArrowRight className="w-3.5 h-3.5 text-primary/50" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">Arraste para cá</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Contato</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Segmento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Responsável</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onDoubleClick={(e) => { e.stopPropagation(); handleViewDetails(lead); }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{lead.empresa}</p>
                      <p className="text-xs text-muted-foreground">{lead.cidade}/{lead.uf}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{lead.contato}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.segmento}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} type="lead" /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.responsavel}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(lead)}>
                            <Edit className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(lead.id, lead.empresa)}>
                            <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum lead encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


