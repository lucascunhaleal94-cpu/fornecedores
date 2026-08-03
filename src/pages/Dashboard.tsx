import React from 'react';
import { 
  Users, 
  UserPlus, 
  Package, 
  TrendingUp,
  FileText,
  AlertCircle,
  Briefcase,
  ChevronRight,
  KanbanSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { useLeads } from '@/contexts/LeadContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useCollaborators } from '@/contexts/CollaboratorContext';

export default function Dashboard() {
  const { fornecedores } = useFornecedores();
  const { leads } = useLeads();
  const { projects } = useProjects();
  const { pendencies } = useCollaborators();

  const fornecedoresAtivos = fornecedores.filter(f => f.status === 'ativo' || !f.status).length;
  const potenciaisFornecedores = leads.filter(l => l.status !== 'convertido' && l.status !== 'perdido').length;
  const projetosEmAberto = projects.filter(p => p.status !== 'FINALIZADO').length;
  const pendenciasEmAberto = pendencies.filter(p => !p.concluida).length;
  return (
    <div className="px-10 pb-12 pt-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] p-16 text-center border border-white/10 shadow-2xl group">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 opacity-30 group-hover:opacity-50 transition-opacity duration-700 animate-gradient-x blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 inline-flex p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md animate-float">
            <div className="bg-gradient-to-br from-cyan-400 to-purple-500 p-3 rounded-xl shadow-lg">
              <Package size={32} className="text-white" />
            </div>
          </div>
          
          <h1 className="text-[3rem] leading-tight font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight mb-6">
            Plataforma de Suprimentos
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
            Ecossistema centralizado de gestão de <span className="text-cyan-400">fornecedores</span>, 
            controle inteligente de <span className="text-purple-400">insumos</span> e 
            motor das <span className="text-pink-400">atividades</span> da empresa.
          </p>
          
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          icon={<Users size={22} className="text-cyan-400" />} 
          iconBg="bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          number={fornecedoresAtivos.toString()} 
          label="Fornecedores Ativos" 
        />
        <KPICard 
          icon={<UserPlus size={22} className="text-purple-400" />} 
          iconBg="bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          number={potenciaisFornecedores.toString()} 
          label="Potenciais Fornecedores" 
        />
        <KPICard 
          icon={<FileText size={22} className="text-pink-400" />} 
          iconBg="bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
          number={projetosEmAberto.toString()} 
          label="Projetos em Aberto" 
        />
        <KPICard 
          icon={<AlertCircle size={22} className="text-amber-400" />} 
          iconBg="bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
          number={pendenciasEmAberto.toString()} 
          label="Pendências em Aberto" 
        />
      </section>

      {/* Module Cards */}
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-xl font-bold text-white">Módulos do Sistema</h2>
        <button className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          Ver todos <ChevronRight size={16} />
        </button>
      </div>
      
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/projetos" className="block h-full">
          <ModuleCard 
            icon={<KanbanSquare size={26} className="text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            borderColor="hover:border-cyan-500/50"
            shadowColor="hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
            title="Projetos"
            description="Módulo Kanban para gestão de atividades, prazos e prioridades da equipe de compras."
            footerText={`${projetosEmAberto} em aberto`}
            footerIcon={<Briefcase size={14} />}
          />
        </Link>
        <Link to="/fornecedores" className="block h-full">
          <ModuleCard 
            icon={<Users size={26} className="text-purple-400" />}
            iconBg="bg-purple-500/10"
            borderColor="hover:border-purple-500/50"
            shadowColor="hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
            title="Fornecedores"
            description="Cadastro, histórico de compras, documentação, tabela de preços e insights por IA."
            footerText={`${fornecedoresAtivos} ativos`}
            footerIcon={<FileText size={14} />}
          />
        </Link>
        <Link to="/potenciais" className="block h-full">
          <ModuleCard 
            icon={<UserPlus size={26} className="text-pink-400" />}
            iconBg="bg-pink-500/10"
            borderColor="hover:border-pink-500/50"
            shadowColor="hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]"
            title="Pipeline"
            description="Prospecção de novos parceiros com gestão visual de status, qualificação e aprovação."
            footerText={`${potenciaisFornecedores} em aberto`}
            footerIcon={<Users size={14} />}
          />
        </Link>
        <Link to="/insumos" className="block h-full">
          <ModuleCard 
            icon={<Package size={26} className="text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            borderColor="hover:border-emerald-500/50"
            shadowColor="hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
            title="Insumos"
            description="Catálogo geral padronizado de matérias-primas, códigos, descrições e custos de reposição."
            footerText="Gestão de SKUs"
            footerIcon={<Package size={14} />}
          />
        </Link>
      </section>

    </div>
  );
}

// Subcomponents specifically for Dashboard
function KPICard({ icon, iconBg, number, label, trend, trendColor }: any) {
  return (
    <div className="bg-white/[0.02] p-7 rounded-[2rem] border border-white/5 flex flex-col hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/5 ${trendColor}`}>
            <TrendingUp size={14} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-4xl font-black text-white mb-2 tracking-tight">{number}</h3>
        <p className="text-[15px] text-slate-400 font-semibold">{label}</p>
      </div>
    </div>
  );
}

function ModuleCard({ icon, iconBg, borderColor, shadowColor, title, description, footerText, footerIcon }: any) {
  return (
    <div className={`bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 flex flex-col h-full hover:-translate-y-2 transition-all duration-300 relative group cursor-pointer ${borderColor} ${shadowColor}`}>
      
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] pointer-events-none"></div>
      
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative z-10 transition-transform group-hover:scale-110 duration-300 ${iconBg}`}>
        {icon}
      </div>
      
      <h3 className="text-xl font-bold text-white mb-3 relative z-10">{title}</h3>
      <p className="text-[15px] text-slate-400 leading-relaxed flex-grow mb-8 font-medium relative z-10">
        {description}
      </p>
      
      <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500 mt-auto pt-5 border-t border-white/5 relative z-10 group-hover:text-slate-300 transition-colors">
        {footerIcon}
        <span>{footerText}</span>
      </div>
    </div>
  );
}
