import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  LineChart, 
  KanbanSquare, 
  Users, 
  UserPlus, 
  Package, 
  Users2, 
  LogOut, 
  Bell, 
  Settings,
  Search,
  Wrench,
  Bot
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsDialog } from './SettingsDialog';

export default function Layout() {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] font-sans text-slate-200 overflow-hidden relative selection:bg-cyan-500/30">
      
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>

      {/* Sidebar */}
      <aside className="w-[280px] bg-white/[0.02] border-r border-white/10 flex flex-col hidden md:flex h-full flex-shrink-0 backdrop-blur-xl relative z-20">
        <div className="flex-shrink-0">
          {/* Logo */}
          <div className="p-8 flex justify-center items-center">
            <Link to="/" className="flex flex-col items-center group cursor-pointer">
              <div className="relative h-16 w-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full"></div>
                <img 
                  src="/logo-white.png" 
                  alt="Acquarela Logo" 
                  className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-2 tracking-[0.2em] group-hover:text-cyan-400 transition-colors">Suprimentos</span>
            </Link>
          </div>
        </div>
          
        <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto scrollbar-hide pb-4">
          <NavItem to="/" icon={<Home size={20} />} label="Início" currentPath={location.pathname} />
          <NavItem to="/inteligencia" icon={<LineChart size={20} />} label="Inteligência" currentPath={location.pathname} />
          <NavItem to="/colorista" icon={<Bot size={20} />} label="Colorista Virtual" currentPath={location.pathname} />
          <NavItem to="/projetos" icon={<KanbanSquare size={20} />} label="Projetos" currentPath={location.pathname} />
          <NavItem to="/fornecedores" icon={<Users size={20} />} label="Fornecedores" currentPath={location.pathname} />
          <NavItem to="/potenciais" icon={<UserPlus size={20} />} label="Potenciais Fornecedores" currentPath={location.pathname} />
          <NavItem to="/insumos" icon={<Package size={20} />} label="Insumos" currentPath={location.pathname} />
          <NavItem to="/manutencoes" icon={<Wrench size={20} />} label="Manutenções" currentPath={location.pathname} />
          <NavItem to="/equipe" icon={<Users2 size={20} />} label="Equipe" currentPath={location.pathname} />
        </nav>

        <div className="flex-shrink-0 p-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => setSettingsOpen(true)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-[#0b0f19] rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">{user?.email?.substring(0, 2).toUpperCase() || 'US'}</span>
              </div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">{isAdmin ? 'Administrador' : 'Convidado'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'Sem e-mail'}</p>
            </div>
            <Settings size={16} className="text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <button onClick={signOut} className="flex items-center justify-center gap-2 text-red-400 text-sm font-semibold hover:bg-red-500/10 hover:text-red-300 w-full p-3 rounded-xl transition-all border border-transparent hover:border-red-500/20">
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        
        {/* Header */}
        <header className="flex-shrink-0 flex justify-between items-center px-10 py-6 bg-[#0b0f19]/80 backdrop-blur-md z-30 border-b border-white/5">
          <GlobalSearch />
          
          <div className="flex items-center gap-4 ml-auto">
            <button onClick={() => setSettingsOpen(true)} className="text-slate-400 hover:text-cyan-400 p-2.5 rounded-full hover:bg-cyan-500/10 transition-all">
              <Settings size={20} />
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Outlet />
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function NavItem({ to, icon, label, currentPath }: { to: string, icon: React.ReactNode, label: string, currentPath: string }) {
  // Simple active state check
  const active = currentPath === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-semibold text-[15px] group relative overflow-hidden ${
        active 
          ? 'text-white' 
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/10 rounded-2xl"></div>
      )}
      {!active && (
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
      )}
      
      <span className={`relative z-10 ${active ? 'text-cyan-400' : 'group-hover:text-cyan-400 transition-colors'}`}>
        {icon}
      </span>
      <span className="relative z-10">{label}</span>
    </Link>
  );
}
