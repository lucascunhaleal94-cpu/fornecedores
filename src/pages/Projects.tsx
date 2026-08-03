import React, { useState } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProjectBoard from "@/components/projects/ProjectBoard";
import ProjectCalendar from "@/components/projects/ProjectCalendar";
import ProjectDialog from "@/components/projects/ProjectDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/contexts/ProjectContext";
import { ProjectDepartment } from "@/types";

const ProjectsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");
  const { projects } = useProjects();

  const [filterResponsavel, setFilterResponsavel] = useState<string>("todos");
  const [filterDepartamento, setFilterDepartamento] = useState<string>("todos");
  const [filterPrazo, setFilterPrazo] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const responsaveis = Array.from(new Set(projects.map(p => p.responsavel).filter(Boolean)));

  return (
    <div className="bg-[#0b0f19] min-h-full w-full text-white flex flex-col relative z-20 overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Projetos</h1>
            <p className="text-slate-400 mt-2">
              Gerenciamento de projetos e tarefas.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[200px] hidden md:block">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all hover:shadow-lg">
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Button>
          </div>
        </div>
        
        {/* Mobile tabs */}
        <div className="md:hidden block mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="bg-[#0b0f19] p-4 rounded-xl shadow-sm border border-white/10 mb-2 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center text-slate-400 gap-2 font-medium w-full md:w-auto">
            <Filter className="w-4 h-4" />
            Filtros:
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:flex-1 md:justify-end">
            <div className="relative w-full md:w-[250px] shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar projeto..." 
                className="pl-9 bg-[#131825] h-10 border-white/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#131825] h-10 border-white/10">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Responsáveis</SelectItem>
                {responsaveis.map(resp => (
                  <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#131825] h-10 border-white/10">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Deptos</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="TÉCNICO">Técnico</SelectItem>
                <SelectItem value="COMERCIAL">Comercial</SelectItem>
                <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                <SelectItem value="CONTÁBIL">Contábil</SelectItem>
                <SelectItem value="JURÍDICO">Jurídico</SelectItem>
                <SelectItem value="COMPRAS">Compras</SelectItem>
                <SelectItem value="ALMOXARIFADO">Almoxarifado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPrazo} onValueChange={setFilterPrazo}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#131825] h-10 border-white/10">
                <SelectValue placeholder="Período do Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Prazos</SelectItem>
                <SelectItem value="atrasados">Atrasados</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 min-h-[500px]">
          {viewMode === "kanban" ? (
            <ProjectBoard 
              filters={{
                responsavel: filterResponsavel,
                departamento: filterDepartamento,
                prazo: filterPrazo,
                search: searchQuery
              }}
            />
          ) : (
            <ProjectCalendar 
              filters={{
                responsavel: filterResponsavel,
                departamento: filterDepartamento,
                prazo: filterPrazo,
                search: searchQuery
              }}
            />
          )}
        </div>

        <ProjectDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
        />
      </div>
    </div>
  );
};

export default ProjectsPage;
