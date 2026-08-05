import React, { useState } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { Project } from "@/types";
import { getDepartmentColor } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectDetailsDialog from "./ProjectDetailsDialog";
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isBefore, startOfDay, isToday,
  isThisWeek, isThisMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ProjectCalendarProps {
  filters?: {
    responsavel: string;
    departamento: string;
    prazo: string;
    search?: string;
  };
}

const ProjectCalendar = ({ filters }: ProjectCalendarProps) => {
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Aplicar filtros
  const filteredProjects = projects.filter((p) => {
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
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
      start: startDate,
      end: endDate
  });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getUrgencyBorder = (urgencia: string) => {
    switch (urgencia) {
      case 'baixa': return 'border-l-4 border-l-slate-400';
      case 'media': return 'border-l-4 border-l-blue-400';
      case 'alta': return 'border-l-4 border-l-orange-400';
      default: return 'border-l-4 border-l-slate-400';
    }
  };

  return (
    <div className="bg-[#0b0f19] rounded-xl border border-white/10 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#131825]">
        <h2 className="text-lg font-semibold text-white/90 capitalize">
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-[#131825]">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-sm font-medium text-white/70">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, idx) => {
          const isSameMon = isSameMonth(day, monthStart);
          const isTdy = isSameDay(day, new Date());
          
          // Projetos do dia
          const dayProjects = filteredProjects.filter(p => {
             if (!p.prazo) return false;
             const prazoDate = new Date(p.prazo.substring(0, 10) + 'T12:00:00');
             return isSameDay(prazoDate, day);
          });

          return (
            <div 
              key={day.toString()} 
              className={`min-h-[100px] border-b border-r border-white/10 p-1 flex flex-col transition-colors
                ${!isSameMon ? 'bg-white/5' : 'bg-[#0b0f19]'} 
                ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
              `}
            >
              <div className="flex justify-end p-1">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${isTdy ? 'bg-primary text-primary-foreground' : (!isSameMon ? 'text-slate-400' : 'text-white/90')}
                `}>
                  {format(day, "d")}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 custom-scrollbar">
                {dayProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`text-xs p-1.5 rounded cursor-pointer truncate shadow-sm bg-[#0b0f19] border border-white/5 hover:shadow-md transition-shadow ${getUrgencyBorder(project.urgencia)}`}
                    title={project.descricao}
                  >
                    <div className="flex items-center justify-between mb-0.5 gap-1">
                      <span className="font-semibold truncate text-white/90">{project.descricao}</span>
                      {project.status === 'FINALIZADO' && (
                         <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Finalizado" />
                      )}
                    </div>
                    {project.departamento && (
                      <Badge className={`text-[9px] px-1 py-0 font-normal mt-0.5 ${getDepartmentColor(project.departamento)}`} variant="secondary">
                        {project.departamento}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedProject && (
        <ProjectDetailsDialog
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </div>
  );
};

export default ProjectCalendar;
