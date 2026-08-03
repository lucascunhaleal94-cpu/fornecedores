import { useMemo, useState, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useCollaborators } from '@/contexts/CollaboratorContext';
import { differenceInDays, isBefore, startOfDay } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export type NotificationCategory = 'Projetos' | 'Pendências' | 'Manutenções';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'danger' | 'warning' | 'info';
  category: NotificationCategory;
  date: Date;
  link?: string;
}

export function useNotifications() {
  const { projects } = useProjects();
  const { pendencies } = useCollaborators();
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [kmUpdateTick, setKmUpdateTick] = useState(0);

  useEffect(() => {
    const handleKmChange = () => setKmUpdateTick(tick => tick + 1);
    window.addEventListener('kmAtualChanged', handleKmChange);
    return () => window.removeEventListener('kmAtualChanged', handleKmChange);
  }, []);

  useEffect(() => {
    const fetchManutencoes = async () => {
      const { data } = await supabase.from('manutencoes').select('*').neq('status', 'concluida');
      if (data) setManutencoes(data);
    };
    
    fetchManutencoes();
    
    // Configura um intervalo pequeno caso haja mudanças (ou pode ficar só no mount)
    const interval = setInterval(fetchManutencoes, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const notifications = useMemo(() => {
    const alerts: AppNotification[] = [];
    const today = startOfDay(new Date());

    // 1. Alertas de Projetos
    projects.forEach(project => {
      if (project.status === 'FINALIZADO' || !project.prazo) return;
      
      const prazoDate = startOfDay(parseLocalDate(project.prazo));
      const diffDays = differenceInDays(prazoDate, today);

      if (isBefore(prazoDate, today)) {
        alerts.push({
          id: `proj-atraso-${project.id}`,
          title: 'Projeto Atrasado',
          description: `O projeto "${project.descricao}" passou do prazo.`,
          type: 'danger',
          category: 'Projetos',
          date: prazoDate,
          link: '/projetos'
        });
      } else if (diffDays >= 0 && diffDays <= 3) {
        alerts.push({
          id: `proj-prazo-${project.id}`,
          title: 'Prazo Próximo (Projeto)',
          description: `O projeto "${project.descricao}" vence em ${diffDays === 0 ? 'hoje' : `${diffDays} dia(s)`}.`,
          type: 'warning',
          category: 'Projetos',
          date: prazoDate,
          link: '/projetos'
        });
      }
    });

    // 2. Alertas de Pendências
    pendencies.forEach(pendency => {
      if (pendency.concluida || !pendency.prazo) return;
      
      const prazoDate = startOfDay(parseLocalDate(pendency.prazo));
      const diffDays = differenceInDays(prazoDate, today);

      if (isBefore(prazoDate, today)) {
        alerts.push({
          id: `pend-atraso-${pendency.id}`,
          title: 'Pendência Atrasada',
          description: `A pendência "${pendency.descricao}" passou do prazo.`,
          type: 'danger',
          category: 'Pendências',
          date: prazoDate,
          link: '/equipe'
        });
      } else if (diffDays >= 0 && diffDays <= 3) {
        alerts.push({
          id: `pend-prazo-${pendency.id}`,
          title: 'Prazo Próximo (Pendência)',
          description: `A pendência "${pendency.descricao}" vence em ${diffDays === 0 ? 'hoje' : `${diffDays} dia(s)`}.`,
          type: 'warning',
          category: 'Pendências',
          date: prazoDate,
          link: '/equipe'
        });
      }
    });

    // 3. Alertas de Manutenções
    const kmAtual = parseInt(localStorage.getItem('kmAtual') || '0') || 0;
    const kmAtualStrada = parseInt(localStorage.getItem('kmAtualStrada') || '0') || 0;

    manutencoes.forEach(m => {
      if (m.veiculo === 'EQUIPAMENTO') {
        if (!m.km_proxima) return;
        
        const prazoDate = startOfDay(parseLocalDate(m.km_proxima));
        const diffDays = differenceInDays(prazoDate, today);

        if (isBefore(prazoDate, today)) {
          alerts.push({
            id: `manut-atraso-${m.id}`,
            title: 'Equipamento Atrasado',
            description: `A manutenção "${m.servico}" do equipamento passou do prazo.`,
            type: 'danger',
            category: 'Manutenções',
            date: prazoDate,
            link: '/manutencoes'
          });
        } else if (diffDays >= 0 && diffDays <= 3) {
          alerts.push({
            id: `manut-prazo-${m.id}`,
            title: 'Prazo Próximo (Equipamento)',
            description: `A manutenção "${m.servico}" do equipamento vence em ${diffDays === 0 ? 'hoje' : `${diffDays} dia(s)`}.`,
            type: 'warning',
            category: 'Manutenções',
            date: prazoDate,
            link: '/manutencoes'
          });
        }
      } else {
        const currentKm = m.veiculo === 'STRADA' ? kmAtualStrada : kmAtual;
        const proximaKm = parseInt(String(m.km_proxima || '').replace(/\D/g, '')) || 0;
        
        if (proximaKm > 0) {
          const diffKm = proximaKm - currentKm;
          
          if (diffKm < 0) {
            alerts.push({
              id: `manut-atraso-${m.id}`,
              title: 'Manutenção Atrasada',
              description: `O veículo ${m.veiculo === 'STRADA' ? 'Strada' : 'Caminhão'} passou da KM para o serviço "${m.servico}".`,
              type: 'danger',
              category: 'Manutenções',
              date: today,
              link: '/manutencoes'
            });
          } else if (diffKm <= 3000) {
            alerts.push({
              id: `manut-prazo-${m.id}`,
              title: 'Prazo Próximo (Manutenção)',
              description: `Faltam ${diffKm} KM para o serviço "${m.servico}" do veículo ${m.veiculo === 'STRADA' ? 'Strada' : 'Caminhão'}.`,
              type: 'warning',
              category: 'Manutenções',
              date: today,
              link: '/manutencoes'
            });
          }
        }
      }
    });

    // Ordenar: danger (críticos/atrasados) -> warning -> info, depois por data decrescente
    const priority = { danger: 1, warning: 2, info: 3 };
    
    return alerts.sort((a, b) => {
      if (priority[a.type] !== priority[b.type]) {
        return priority[a.type] - priority[b.type];
      }
      return b.date.getTime() - a.date.getTime();
    });
  }, [projects, pendencies, manutencoes, kmUpdateTick]);

  return { notifications };
}
