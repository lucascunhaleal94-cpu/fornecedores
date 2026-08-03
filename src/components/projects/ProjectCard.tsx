import React, { useState } from "react";
import { Project } from "@/types";
import { useProjects } from "@/contexts/ProjectContext";
import { CalendarIcon, PaperclipIcon, Trash2, MoreHorizontal, Edit2 } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ProjectDialog from "./ProjectDialog";
import ProjectDetailsDialog from "./ProjectDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { getDepartmentColor } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const { deleteProject } = useProjects();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("projectId", project.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(true);
  };

  const isOverdue = project.status !== 'FINALIZADO' && isBefore(new Date(project.prazo.substring(0, 10) + 'T12:00:00'), startOfDay(new Date()));

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case 'baixa': return 'bg-white/5 text-white/90 hover:bg-white/10';
      case 'media': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'alta': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      default: return 'bg-white/5 text-white/90';
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDoubleClick={handleDoubleClick}
        className={`bg-[#0b0f19] p-4 rounded-lg shadow-sm border ${
          isOverdue ? 'border-red-400 ring-1 ring-red-400/50' : 'border-white/10'
        } cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-2">
            {project.departamento && (
              <Badge className={`${getDepartmentColor(project.departamento)} font-normal text-[10px] uppercase`} variant="secondary">
                {project.departamento}
              </Badge>
            )}
            <Badge className={`${getUrgencyColor(project.urgencia)} capitalize font-normal text-[10px]`} variant="secondary">
              {project.urgencia}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditOpen(true); }} className="cursor-pointer">
                <Edit2 className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Deseja realmente remover este projeto?")) {
                    deleteProject(project.id);
                  }
                }} 
                className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-medium text-white mb-1 line-clamp-2" title={project.descricao}>
          {project.descricao}
        </h3>
        
        <div className="text-sm text-white/70 mb-3 whitespace-nowrap overflow-hidden text-ellipsis">
          Resp: <span className="font-medium">{project.responsavel || "Não atribuído"}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-white/5">
          <div className={`flex items-center ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
            <CalendarIcon className="w-3.5 h-3.5 mr-1" />
            {format(new Date(project.prazo.substring(0, 10) + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
          </div>
          
          {project.attachments && project.attachments.length > 0 && (
            <div className="flex items-center">
              <PaperclipIcon className="w-3.5 h-3.5 mr-1" />
              {project.attachments.length}
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <ProjectDialog 
          open={isEditOpen} 
          onOpenChange={setIsEditOpen} 
          projectToEdit={project} 
        />
      )}

      {isDetailsOpen && (
        <ProjectDetailsDialog 
          open={isDetailsOpen} 
          onOpenChange={setIsDetailsOpen} 
          project={project} 
        />
      )}
    </>
  );
};

export default ProjectCard;
