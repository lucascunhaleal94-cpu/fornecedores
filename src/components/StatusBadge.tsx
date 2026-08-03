import { ClientStatus, LeadStatus } from '@/types';

const clientStatusConfig: Record<ClientStatus, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success border-success/20' },
  inativo: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-border' },
  bloqueado: { label: 'Bloqueado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  prospecto: { label: 'Prospecto', className: 'bg-info/10 text-info border-info/20' },
};

const leadStatusConfig: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: 'Potencial Fornecedor', className: 'bg-info/10 text-info border-info/20' },
  em_contato: { label: 'Em Contato', className: 'bg-primary/10 text-primary border-primary/20' },
  qualificado: { label: 'Qualificado', className: 'bg-accent/10 text-accent border-accent/20' },
  proposta: { label: 'Proposta', className: 'bg-warning/10 text-warning border-warning/20' },
  em_analise: { label: 'Em análise', className: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  convertido: { label: 'Aprovado', className: 'bg-success/10 text-success border-success/20' },
  perdido: { label: 'Reprovado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function StatusBadge({ status, type = 'client' }: { status: string; type?: 'client' | 'lead' }) {
  const config = type === 'lead' 
    ? leadStatusConfig[status as LeadStatus] 
    : clientStatusConfig[status as ClientStatus];
  
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
