import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Package, UserPlus, KanbanSquare, FileWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFornecedores } from './../contexts/FornecedorContext';
import { useLeads } from './../contexts/LeadContext';
import { useNotasFiscais } from './../contexts/NotaFiscalContext';
import { useProjects } from './../contexts/ProjectContext';
import { useCollaborators } from './../contexts/CollaboratorContext';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { fornecedores } = useFornecedores();
  const { leads } = useLeads();
  const { notasFiscais } = useNotasFiscais();
  const { projects } = useProjects();
  const { pendencies } = useCollaborators();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  // Derive unique insumos from notasFiscais
  const uniqueInsumos = React.useMemo(() => {
    const map = new Map<string, { codigo: string; descricao: string }>();
    notasFiscais.forEach(nota => {
      if (!map.has(nota.codigo)) {
        map.set(nota.codigo, { codigo: nota.codigo, descricao: nota.descricao });
      }
    });
    return Array.from(map.values());
  }, [notasFiscais]);

  const getFilteredResults = () => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const results = [];

    // Fornecedores
    const fMatches = (fornecedores || []).filter(f => 
      (f?.razaoSocial?.toLowerCase() || '').includes(q) || 
      (f?.nomeFantasia?.toLowerCase() || '').includes(q) ||
      (f?.cnpj || '').includes(q)
    ).slice(0, 5);
    
    if (fMatches.length > 0) {
      results.push({
        category: 'Fornecedores',
        icon: <Building2 className="w-4 h-4 text-blue-400" />,
        items: fMatches.map(f => ({
          id: f.id,
          title: f.razaoSocial || 'Sem Nome',
          subtitle: f.cnpj || 'Sem CNPJ',
          onClick: () => {
            navigate(`/fornecedores/${f.id}`);
            setIsOpen(false);
            setQuery('');
          }
        }))
      });
    }

    // Insumos
    const iMatches = (uniqueInsumos || []).filter(i => 
      (i?.codigo?.toLowerCase() || '').includes(q) || 
      (i?.descricao?.toLowerCase() || '').includes(q)
    ).slice(0, 5);

    if (iMatches.length > 0) {
      results.push({
        category: 'Insumos',
        icon: <Package className="w-4 h-4 text-emerald-400" />,
        items: iMatches.map(i => ({
          id: i.codigo,
          title: i.descricao || 'Sem descrição',
          subtitle: `Cód: ${i.codigo}`,
          onClick: () => {
            navigate('/insumos');
            setIsOpen(false);
            setQuery('');
          }
        }))
      });
    }

    // Projetos
    const pMatches = (projects || []).filter(p => 
      (p?.descricao?.toLowerCase() || '').includes(q) || 
      (p?.responsavel?.toLowerCase() || '').includes(q)
    ).slice(0, 5);

    if (pMatches.length > 0) {
      results.push({
        category: 'Projetos',
        icon: <KanbanSquare className="w-4 h-4 text-purple-400" />,
        items: pMatches.map(p => ({
          id: p.id,
          title: p.descricao || 'Sem descrição',
          subtitle: p.responsavel || 'Sem responsável',
          onClick: () => {
            navigate('/projetos');
            setIsOpen(false);
            setQuery('');
          }
        }))
      });
    }

    // Leads (Potenciais Fornecedores)
    const lMatches = (leads || []).filter(l => 
      (l?.empresa?.toLowerCase() || '').includes(q) || 
      (l?.contato?.toLowerCase() || '').includes(q)
    ).slice(0, 5);

    if (lMatches.length > 0) {
      results.push({
        category: 'Potenciais Fornecedores',
        icon: <UserPlus className="w-4 h-4 text-orange-400" />,
        items: lMatches.map(l => ({
          id: l.id,
          title: l.empresa || 'Sem empresa',
          subtitle: l.contato || 'Sem contato',
          onClick: () => {
            navigate('/potenciais');
            setIsOpen(false);
            setQuery('');
          }
        }))
      });
    }

    // Pendências
    const pendMatches = (pendencies || []).filter(p => 
      (p?.descricao?.toLowerCase() || '').includes(q)
    ).slice(0, 5);

    if (pendMatches.length > 0) {
      results.push({
        category: 'Pendências',
        icon: <FileWarning className="w-4 h-4 text-red-400" />,
        items: pendMatches.map(p => ({
          id: p.id,
          title: p.descricao || 'Sem descrição',
          subtitle: p.prazo ? `Prazo: ${new Date(p.prazo).toLocaleDateString()}` : 'Sem prazo',
          onClick: () => {
            navigate('/equipe');
            setIsOpen(false);
            setQuery('');
          }
        }))
      });
    }

    return results;
  };

  const results = getFilteredResults();

  return (
    <div className="relative w-96 hidden lg:block" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input 
        type="text" 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar fornecedores, insumos, projetos..." 
        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
      />

      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#131825] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Nenhum resultado encontrado para "{query}"
              </div>
            ) : (
              <div className="py-2">
                {results.map((group, index) => (
                  <div key={group.category} className={index > 0 ? "border-t border-white/5 mt-2 pt-2" : ""}>
                    <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {group.icon}
                      {group.category}
                    </div>
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex flex-col gap-1"
                      >
                        <span className="text-sm font-medium text-white truncate w-full">{item.title}</span>
                        <span className="text-xs text-slate-400 truncate w-full">{item.subtitle}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
