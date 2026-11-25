import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Project, ProjectStatus, ProjectAttachment } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCachedData, setCachedData, FORCE_SYNC_EVENT } from '@/lib/localCache';

const CACHE_KEY = 'projects_meta_v1';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ success: boolean }>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
  loadProjectAttachments: (projectId: string) => Promise<ProjectAttachment[]>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const stripAttachmentUrls = (items: Project[]): Project[] =>
  items.map(p => ({
    ...p,
    attachments: (p.attachments || []).map(({ id, name, type }) => ({ id, name, type, url: '' })),
  }));

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const loadedAttachmentsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedData<Project[]>(CACHE_KEY);
      if (cached) {
        setProjects(cached.data);
        if (cached.isFresh) return;
      }
    }

    // Busca apenas metadados dos anexos (sem o campo pesado `url` em Base64)
    const { data, error } = await supabase
      .from('projects')
      .select('*, attachments:project_attachments(id, name, type)');

    if (error) {
      console.error('Erro ao buscar projetos:', error);
      return;
    }

    if (data) {
      const normalized: Project[] = (data as any[]).map(p => ({
        ...p,
        attachments: (p.attachments || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          url: '',
        })),
      }));
      loadedAttachmentsRef.current.clear();
      setProjects(normalized);
      await setCachedData(CACHE_KEY, stripAttachmentUrls(normalized));
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    const onForceSync = () => fetchData(true);
    window.addEventListener(FORCE_SYNC_EVENT, onForceSync);
    return () => window.removeEventListener(FORCE_SYNC_EVENT, onForceSync);
  }, [fetchData]);

  const loadProjectAttachments = useCallback(async (projectId: string): Promise<ProjectAttachment[]> => {
    const existing = projects.find(p => p.id === projectId);
    if (loadedAttachmentsRef.current.has(projectId) && existing) {
      return existing.attachments || [];
    }

    const { data, error } = await supabase
      .from('project_attachments')
      .select('id, name, type, url')
      .eq('projectId', projectId);

    if (error) {
      console.error('Erro ao carregar anexos do projeto:', error);
      return existing?.attachments || [];
    }

    const fullAttachments = (data || []) as ProjectAttachment[];
    loadedAttachmentsRef.current.add(projectId);
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, attachments: fullAttachments } : p))
    );

    return fullAttachments;
  }, [projects]);

  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newId = 'proj-' + Date.now().toString();
    const newDoc: Project = {
      ...project,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    const nextList = [newDoc, ...projects];
    setProjects(nextList);
    loadedAttachmentsRef.current.add(newId);
    setCachedData(CACHE_KEY, stripAttachmentUrls(nextList));

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
    const now = new Date().toISOString();
    const existing = projects.find(p => p.id === id);

    const nextList = projects.map(p => (p.id === id ? { ...p, ...updates, updatedAt: now } : p));
    setProjects(nextList);
    setCachedData(CACHE_KEY, stripAttachmentUrls(nextList));

    const { attachments, ...dbUpdates } = updates;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('projects').update({ ...dbUpdates, updatedAt: now }).eq('id', id);
    }

    if (attachments !== undefined) {
      const oldIds = new Set((existing?.attachments || []).map(a => a.id));
      const newIds = new Set(attachments.map(a => a.id));

      const removedIds = Array.from(oldIds).filter(oldId => !newIds.has(oldId));
      const addedAttachments = attachments.filter(a => !oldIds.has(a.id) && Boolean(a.url));

      if (removedIds.length > 0) {
        await supabase.from('project_attachments').delete().in('id', removedIds);
      }
      if (addedAttachments.length > 0) {
        const mappedAtt = addedAttachments.map(a => ({ ...a, projectId: id }));
        await supabase.from('project_attachments').insert(mappedAtt);
      }
    }

    return { success: true };
  };

  const updateProjectStatus = async (id: string, status: ProjectStatus) => {
    const now = new Date().toISOString();
    const nextList = projects.map(p => (p.id === id ? { ...p, status, updatedAt: now } : p));
    setProjects(nextList);
    setCachedData(CACHE_KEY, stripAttachmentUrls(nextList));
    await supabase.from('projects').update({ status, updatedAt: now }).eq('id', id);
  };

  const deleteProject = async (id: string) => {
    const nextList = projects.filter(p => p.id !== id);
    setProjects(nextList);
    loadedAttachmentsRef.current.delete(id);
    setCachedData(CACHE_KEY, stripAttachmentUrls(nextList));
    await supabase.from('projects').delete().eq('id', id);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, updateProjectStatus, loadProjectAttachments }}>
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
