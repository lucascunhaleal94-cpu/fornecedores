import React from "react";
import { Project, ProjectAttachment } from "@/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { File, FileText, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDepartmentColor } from "@/lib/utils";

interface ProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

const AttachmentIcon = ({ type }: { type: ProjectAttachment['type'] }) => {
  if (type === 'image') return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (type === 'excel') return <File className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
};

const getUrgencyColor = (urgencia: string) => {
  switch (urgencia) {
    case 'baixa': return 'bg-white/5 text-white/90';
    case 'media': return 'bg-blue-100 text-blue-700';
    case 'alta': return 'bg-orange-100 text-orange-700';
    default: return 'bg-white/5 text-white/90';
  }
};

const ProjectDetailsDialog = ({ open, onOpenChange, project }: ProjectDetailsDialogProps) => {
  if (!project) return null;

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
          <DialogTitle className="text-2xl break-words pr-6">
            {project.descricao}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-[#131825] p-4 rounded-lg border border-white/5">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Responsável</p>
              <p className="font-medium text-white mt-1">{project.responsavel || "Não atribuído"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Departamento</p>
              {project.departamento ? (
                <Badge className={`mt-1 font-normal ${getDepartmentColor(project.departamento)}`} variant="secondary">
                  {project.departamento}
                </Badge>
              ) : (
                <p className="font-medium text-slate-400 mt-1 text-sm">Não informado</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Urgência</p>
              <Badge className={`mt-1 capitalize font-normal ${getUrgencyColor(project.urgencia)}`} variant="secondary">
                {project.urgencia}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Prazo Final</p>
              <p className="font-medium text-white mt-1">
                {project.prazo ? format(new Date(project.prazo.substring(0, 10) + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Sem prazo'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Status</p>
              <p className="font-medium text-white mt-1">{project.status}</p>
            </div>
          </div>

          {/* Observações */}
          {project.obs && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Observações</h3>
              <div className="bg-[#0b0f19] border border-white/10 rounded-lg p-4 text-white/90 whitespace-pre-wrap">
                {project.obs}
              </div>
            </div>
          )}

          {/* Anexos */}
          {project.attachments && project.attachments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <File className="w-5 h-5 mr-2" /> 
                Anexos ({project.attachments.length})
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {project.attachments.map((att) => (
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

export default ProjectDetailsDialog;
