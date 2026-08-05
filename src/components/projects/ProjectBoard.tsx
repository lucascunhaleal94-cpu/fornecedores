import React from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { ProjectStatus } from "@/types";
import ProjectCard from "./ProjectCard";
import { isBefore, isToday, isThisWeek, isThisMonth, startOfDay } from "date-fns";

interface ProjectBoardProps {
  filters?: {
    responsavel: string;
    departamento: string;
    prazo: string;
    search?: string;
  };
}

const COLUMNS: { id: ProjectStatus; label: string; bgColor: string; borderColor: string }[] = [
  { id: 'PENDENTE', label: 'Pendente', bgColor: 'bg-[#131825]', borderColor: 'border-white/10' },
  { id: 'EM ANDAMENTO', label: 'Em Andamento', bgColor: 'bg-blue-900/20', borderColor: 'border-blue-500/30' },
  { id: 'FINALIZADO', label: 'Finalizado', bgColor: 'bg-emerald-900/20', borderColor: 'border-emerald-500/30' }
];

const ProjectBoard = ({ filters }: ProjectBoardProps) => {
  const { projects, updateProjectStatus } = useProjects();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("projectId");
    if (projectId) {
      updateProjectStatus(projectId, status);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
      {COLUMNS.map((col) => {
        const columnProjects = projects
          .filter((p) => p.status === col.id)
          .filter((p) => {
            if (!filters) return true;
            
            if (filters.search && !p.descricao.toLowerCase().includes(filters.search.toLowerCase())) {
              return false;
            }
            
            if (filters.responsavel !== "todos" && p.responsavel !== filters.responsavel) {
              return false;
            }
            
            if (filters.departamento !== "todos" && p.departamento !== filters.departamento) {
              return false;
            }
            
            if (filters.prazo !== "todos") {
              if (!p.prazo) return false;
              const prazoDate = new Date(p.prazo.substring(0, 10) + 'T12:00:00');
              if (filters.prazo === "atrasados") {
                return p.status !== 'FINALIZADO' && isBefore(prazoDate, startOfDay(new Date()));
              }
              if (filters.prazo === "hoje") {
                return isToday(prazoDate);
              }
              if (filters.prazo === "semana") {
                return isThisWeek(prazoDate);
              }
              if (filters.prazo === "mes") {
                return isThisMonth(prazoDate);
              }
            }
            
            return true;
          })
          .sort((a, b) => {
            const dateA = a.prazo ? new Date(a.prazo.substring(0, 10) + 'T12:00:00').getTime() : 9999999999999;
            const dateB = b.prazo ? new Date(b.prazo.substring(0, 10) + 'T12:00:00').getTime() : 9999999999999;
            if (dateA !== dateB) return dateA - dateB;
            
            const urgMap: Record<string, number> = { 'alta': 1, 'media': 2, 'baixa': 3 };
            return (urgMap[a.urgencia] || 99) - (urgMap[b.urgencia] || 99);
          });

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-xl border ${col.borderColor} ${col.bgColor} p-4 h-full min-h-[500px] shadow-sm transition-colors`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white/90">{col.label}</h2>
              <span className="bg-white/10 text-white/70 text-xs py-1 px-2 rounded-full font-medium">
                {columnProjects.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1 custom-scrollbar">
              {columnProjects.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-8 border-2 border-dashed border-white/10 rounded-lg h-full flex items-center justify-center">
                  Solte projetos aqui
                </div>
              ) : (
                columnProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectBoard;
