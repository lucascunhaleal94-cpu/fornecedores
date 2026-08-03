import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, ProjectStatus, ProjectAttachment } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ success: boolean }>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchData = async () => {
    const { data, error } = await supabase.from('projects').select('*, attachments:project_attachments(*)');
    if (data) {
      setProjects(data as Project[]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newId = 'proj-' + Date.now().toString();
    const newDoc: Project = {
      ...project,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    
    setProjects(prev => [newDoc, ...prev]);

    const { attachments, ...dbProj } = newDoc;
    const { error } = await supabase.from('projects').insert([dbProj]);
    if (error) {
      toast.error('Erro salvando projeto: ' + error.message);
      return { success: false };
    }

    if (attachments && attachments.length > 0) {
       const mappedAtt = attachments.map(a => ({ ...a, projectId: newId }));
       await supabase.from('project_attachments').insert(mappedAtt);
    }

    return { success: true };
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, ...updates, updatedAt: new Date().toISOString() };
      }
      return p;
    }));

    const { attachments, ...dbUpdates } = updates;
    
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('projects').update({ ...dbUpdates, updatedAt: new Date().toISOString() }).eq('id', id);
    }
    
    if (attachments) {
       // Sobrescreve os attachments apagando velhos e inserindo novos
       await supabase.from('project_attachments').delete().eq('projectId', id);
       if (attachments.length > 0) {
          const mappedAtt = attachments.map(a => ({ ...a, projectId: id }));
          await supabase.from('project_attachments').insert(mappedAtt);
       }
    }

    return { success: true };
  };

  const updateProjectStatus = async (id: string, status: ProjectStatus) => {
    const now = new Date().toISOString();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status, updatedAt: now } : p));
    await supabase.from('projects').update({ status, updatedAt: now }).eq('id', id);
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await supabase.from('projects').delete().eq('id', id);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, updateProjectStatus }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
