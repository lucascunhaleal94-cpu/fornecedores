import React, { useState, useEffect } from "react";
import { Project, ProjectAttachment, UrgenciaType, ProjectDepartment } from "@/types";
import { useProjects } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X, File, Image as ImageIcon, FileText } from "lucide-react";
import { format } from "date-fns";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectToEdit?: Project;
}

const ProjectDialog = ({ open, onOpenChange, projectToEdit }: ProjectDialogProps) => {
  const { isAdmin } = useAuth();
  const { addProject, updateProject } = useProjects();

  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [departamento, setDepartamento] = useState<ProjectDepartment | "none">("none");
  const [urgencia, setUrgencia] = useState<UrgenciaType>("media");
  const [prazo, setPrazo] = useState("");
  const [obs, setObs] = useState("");
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);

  useEffect(() => {
    if (open) {
      if (projectToEdit) {
        setDescricao(projectToEdit.descricao);
        setResponsavel(projectToEdit.responsavel);
        setDepartamento(projectToEdit.departamento || "none");
        setUrgencia(projectToEdit.urgencia);
        setPrazo(projectToEdit.prazo.split('T')[0]); // ISO to YYYY-MM-DD
        setObs(projectToEdit.obs || "");
        setAttachments(projectToEdit.attachments || []);
      } else {
        setDescricao("");
        setResponsavel("");
        setDepartamento("none");
        setUrgencia("media");
        setPrazo(format(new Date(), "yyyy-MM-dd"));
        setObs("");
        setAttachments([]);
      }
    }
  }, [open, projectToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        let type: ProjectAttachment['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type === 'application/pdf') type = 'pdf';
        
        setAttachments(prev => [...prev, {
          id: 'attach-' + Date.now() + Math.random(),
          name: file.name,
          type,
          url: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projData = {
      descricao,
      responsavel,
      departamento: departamento === "none" ? undefined : (departamento as ProjectDepartment),
      urgencia,
      prazo: new Date(prazo).toISOString(),
      obs,
      attachments
    };

    if (projectToEdit) {
        updateProject(projectToEdit.id, projData);
    } else {
      addProject({
        ...projData,
        status: 'PENDENTE',
      });
    }
    onOpenChange(false);
  };

  const AttachmentIcon = ({ type }: { type: ProjectAttachment['type'] }) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (type === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{projectToEdit ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição / Título do Projeto *</Label>
            <Input 
              id="descricao" 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              required 
              placeholder="Ex: Campanhas de Marketing Q2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input 
                id="responsavel" 
                value={responsavel} 
                onChange={e => setResponsavel(e.target.value)} 
                placeholder="Digite o nome..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Select value={departamento} onValueChange={(val: ProjectDepartment | "none") => setDepartamento(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="TÉCNICO">Técnico</SelectItem>
                  <SelectItem value="COMERCIAL">Comercial</SelectItem>
                  <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                  <SelectItem value="CONTÁBIL">Contábil</SelectItem>
                  <SelectItem value="JURÍDICO">Jurídico</SelectItem>
                  <SelectItem value="COMPRAS">Compras</SelectItem>
                  <SelectItem value="ALMOXARIFADO">Almoxarifado</SelectItem>
                  <SelectItem value="MANUTENÇÃO">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgencia">Nível de Urgência</Label>
              <Select value={urgencia} onValueChange={(val: UrgenciaType) => setUrgencia(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo Final *</Label>
            <Input 
              id="prazo" 
              type="date" 
              value={prazo} 
              onChange={e => setPrazo(e.target.value)} 
              required 
              disabled={!isAdmin}
              title={!isAdmin ? "Apenas administradores podem definir o prazo" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea 
              id="obs" 
              value={obs} 
              onChange={e => setObs(e.target.value)} 
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label>Anexos</Label>
            <div className="flex items-center gap-2">
              <Label 
                htmlFor="file-upload" 
                className="flex cursor-pointer items-center justify-center rounded-md border border-white/20 bg-[#131825] px-4 py-2 text-sm font-medium text-white/90 shadow-sm hover:bg-white/5 transition-colors w-fit"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Anexar Arquivo
              </Label>
              <Input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                multiple 
                onChange={handleFileChange} 
                accept="image/*,video/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />
              <span className="text-xs text-slate-400">Imagens, vídeos, PDFs, Excel</span>
            </div>

            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2 border border-white/5 rounded-md p-2 bg-[#131825]">
                {attachments.map((file) => (
                  <li key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm bg-[#0b0f19] p-2 rounded border gap-2">
                    <div className="flex items-center overflow-hidden">
                      <AttachmentIcon type={file.type} />
                      <span className="ml-2 truncate max-w-[200px]" title={file.name}>{file.name}</span>
                    </div>
                    {/* Visualização para arquivos do tipo imagem */}
                    {file.type === 'image' && file.url.startsWith('data:image') && (
                        <div className="w-10 h-10 border rounded shrink-0 overflow-hidden bg-white/5 hidden sm:block">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => removeAttachment(file.id)}
                      className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 sm:ml-auto w-fit"
                    >
                      <X className="w-3 h-3 mr-1" /> Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-yellow-600 mt-1">
              Aviso: Anexos muito grandes podem exceder o limite de armazenamento do navegador.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDialog;
