import React from "react";
import { Lead, ProjectAttachment } from "@/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { File, FileText, Image as ImageIcon, Download, Building, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

const AttachmentIcon = ({ type }: { type: ProjectAttachment['type'] }) => {
  if (type === 'image') return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (type === 'excel') return <File className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'novo': return 'bg-info/20 text-info';
    case 'em_contato': return 'bg-primary/20 text-primary';
    case 'qualificado': return 'bg-accent/20 text-accent';
    case 'proposta': return 'bg-warning/20 text-warning';
    case 'em_analise': return 'bg-indigo-500/20 text-indigo-500';
    case 'convertido': return 'bg-success/20 text-success';
    case 'perdido': return 'bg-destructive/20 text-destructive';
    default: return 'bg-white/5 text-white/90';
  }
};

const formatStatus = (status: string) => {
  if (status === 'novo') return 'Potencial Fornecedor';
  if (status === 'convertido') return 'Aprovado';
  if (status === 'perdido') return 'Reprovado';
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const LeadDetailsDialog = ({ open, onOpenChange, lead }: LeadDetailsDialogProps) => {
  if (!lead) return null;

  const handleDownload = (att: ProjectAttachment) => {
    const link = document.createElement("a");
    link.href = att.url;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl break-words pr-6 flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            {lead.empresa}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#131825] p-4 rounded-lg border border-white/5">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Responsável</p>
              <p className="font-medium text-white mt-1">{lead.responsavel || "Não atribuído"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Status</p>
              <Badge className={`mt-1 font-normal ${getStatusColor(lead.status)}`} variant="secondary">
                {formatStatus(lead.status)}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Segmento</p>
              <p className="font-medium text-white mt-1">{lead.segmento || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Origem</p>
              <p className="font-medium text-white mt-1">{lead.origem || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-[#0b0f19] border border-white/10 rounded-lg p-4 space-y-3">
                 <h3 className="font-semibold text-white border-b pb-2">Contato</h3>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <span className="font-medium text-white min-w-[70px]">Nome:</span>
                    <span>{lead.contato || "-"}</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{lead.telefone || "-"}</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{lead.email || "-"}</span>
                 </div>
             </div>
             
             <div className="bg-[#0b0f19] border border-white/10 rounded-lg p-4 space-y-3">
                 <h3 className="font-semibold text-white border-b pb-2">Endereço / Outros</h3>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <span className="font-medium text-white min-w-[50px]">CNPJ:</span>
                    <span>{lead.cnpj || "-"}</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{lead.cidade ? `${lead.cidade} / ${lead.uf}` : "-"}</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-white/70">
                    <span className="font-medium text-white min-w-[70px]">Interesse:</span>
                    <span>{lead.interesse || "-"}</span>
                 </div>
             </div>
          </div>

          {/* Observações */}
          {lead.observacoes && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Observações</h3>
              <div className="bg-[#0b0f19] border border-white/10 rounded-lg p-4 text-white/90 whitespace-pre-wrap">
                {lead.observacoes}
              </div>
            </div>
          )}

          {/* Anexos */}
          {lead.attachments && lead.attachments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <File className="w-5 h-5 mr-2" /> 
                Anexos ({lead.attachments.length})
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {lead.attachments.map((att) => (
                  <div key={att.id} className="border border-white/10 rounded-lg overflow-hidden bg-[#131825]">
                    
                    {/* Header do anexo com botão baixar */}
                    <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0b0f19]">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <AttachmentIcon type={att.type} />
                        <span className="font-medium text-sm text-white/90 truncate" title={att.name}>
                          {att.name}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="shrink-0 ml-2"
                        onClick={(e) => {
                           e.stopPropagation();
                           handleDownload(att);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" /> Baixar
                      </Button>
                    </div>

                    {/* Preview dependendo do tipo */}
                    <div className="p-2 flex justify-center bg-white/5">
                      {att.type === 'video' ? (
                        <video 
                          src={att.url} 
                          controls 
                          className="max-h-80 w-auto rounded border border-white/10 shadow-sm"
                        >
                          Seu navegador não suporta a tag de vídeo.
                        </video>
                      ) : att.type === 'image' && att.url.startsWith('data:image') ? (
                        <img 
                          src={att.url} 
                          alt={att.name} 
                          className="max-h-80 w-auto object-contain rounded border border-white/10 shadow-sm" 
                        />
                      ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                          <AttachmentIcon type={att.type} />
                          <p className="mt-2 text-sm">Visualização não disponível diretamente.</p>
                          <p className="text-xs">Utilize o botão Baixar acima.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;

