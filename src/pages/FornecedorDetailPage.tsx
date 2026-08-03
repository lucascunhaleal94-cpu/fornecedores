import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowLeft,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  Trash2,
  ArrowDown,
  ArrowUp,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FornecedorDialog } from '@/components/fornecedores/FornecedorDialog';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';
import { NotaFiscal } from '@/types';
import { toast } from 'sonner';

// Componente para a linha expansível da Nota Fiscal
function NotaRow({ notaGroup, onDeleteItem, onDeleteGroup }: { notaGroup: any, onDeleteItem: (id: string) => void, onDeleteGroup: (group: any) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
        <td className="py-4 px-2 font-bold text-white">{notaGroup.numero_nota}</td>
        <td className="py-4 px-2 text-slate-400">{notaGroup.data_emissao}</td>
        <td className="py-4 px-2 font-bold text-white">
          R$ {notaGroup.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td className="py-4 px-2 text-slate-300">{notaGroup.peso_liquido} kg</td>
        <td className="py-4 px-2 flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium bg-blue-500/10 px-3 py-1.5 rounded-full text-sm"
          >
            <Package className="w-4 h-4" />
            {notaGroup.itens.length} {notaGroup.itens.length === 1 ? 'item' : 'itens'}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => onDeleteGroup(notaGroup)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-full hover:bg-white/5"
            title="Excluir Nota Inteira"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-black/20 border-b border-white/5"
          >
            <td colSpan={5} className="p-0">
              <div className="p-4 pl-8">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5">
                      <th className="pb-2 font-medium">Cód.</th>
                      <th className="pb-2 font-medium">Descrição do Produto</th>
                      <th className="pb-2 font-medium text-right">Qtd</th>
                      <th className="pb-2 font-medium text-right">V. Unit</th>
                      <th className="pb-2 font-medium text-right">V. Total</th>
                      <th className="pb-2 font-medium text-center w-[50px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notaGroup.itens.map((item: NotaFiscal) => (
                      <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="py-3 text-slate-400">{item.codigo}</td>
                        <td className="py-3 text-white font-medium">{item.descricao}</td>
                        <td className="py-3 text-right text-slate-400">{item.quantidade}</td>
                        <td className="py-3 text-right text-slate-400">
                          R$ {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right font-medium text-blue-400">
                          R$ {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => onDeleteItem(item.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Excluir item"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function FornecedorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fornecedores, deleteFornecedor } = useFornecedores();
  const { fetchNotasByFornecedor, deleteNotaFiscal } = useNotasFiscais();
  
  const [activeTab, setActiveTab] = useState('compras');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  type SortField = 'numero_nota' | 'data_emissao' | 'valor_total' | 'peso_liquido';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('data_emissao');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const fornecedor = fornecedores.find(f => f.id === id);
  
  if (!fornecedor) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Building2 className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-medium">Fornecedor não encontrado</h2>
        <Button variant="link" onClick={() => navigate('/fornecedores')} className="text-blue-500 mt-2">
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteFornecedor(fornecedor.id);
      toast.success('Fornecedor excluído com sucesso!');
      navigate('/fornecedores');
    } catch (error) {
      toast.error('Erro ao excluir fornecedor');
    }
  };

  const notas = fetchNotasByFornecedor(fornecedor.id);

  const notasGrouped = useMemo(() => {
    const map = new Map<string, { numero_nota: string, data_emissao: string, valor_total: number, peso_liquido: number, itens: NotaFiscal[] }>();
    
    notas.forEach(nota => {
      const key = `${nota.numero_nota}-${nota.data_emissao}`;
      if (!map.has(key)) {
        map.set(key, {
          numero_nota: nota.numero_nota,
          data_emissao: nota.data_emissao,
          valor_total: 0,
          peso_liquido: 0,
          itens: []
        });
      }
      const group = map.get(key)!;
      group.valor_total += nota.quantidade * nota.valor_unitario;
      group.peso_liquido += nota.quantidade;
      group.itens.push(nota);
    });

    const groups = Array.from(map.values());
    
    return groups.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'numero_nota':
          comparison = a.numero_nota.localeCompare(b.numero_nota);
          break;
        case 'valor_total':
          comparison = a.valor_total - b.valor_total;
          break;
        case 'peso_liquido':
          comparison = a.peso_liquido - b.peso_liquido;
          break;
        case 'data_emissao':
        default:
          const parseDate = (dStr: string) => {
            if (!dStr) return 0;
            const parts = dStr.split('/');
            if (parts.length === 3) {
              return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
            }
            return new Date(dStr).getTime(); // fallback
          };
          comparison = parseDate(a.data_emissao) - parseDate(b.data_emissao);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [notas, sortField, sortDirection]);

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col relative z-20 overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col space-y-6">
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/fornecedores')}
          className="w-fit text-slate-400 hover:text-white hover:bg-white/5 -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Fornecedores
        </Button>

        {/* Header Profile */}
        <div className="bg-[#131825] border border-white/5 rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Building2 className="w-48 h-48" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-10 h-10 text-blue-500" />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white">{fornecedor.razaoSocial}</h1>
                  <StatusBadge status={fornecedor.status || 'ativo'} />
                </div>
                <p className="text-lg text-slate-400">{fornecedor.nomeFantasia}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-end mt-4 lg:mt-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 gap-2 border border-red-500/20" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-400 text-right lg:text-left">
                <div className="flex items-center justify-end lg:justify-start gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>CNPJ: <strong className="text-white">{fornecedor.cnpj}</strong></span>
                </div>
                <div className="flex items-center justify-end lg:justify-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{fornecedor.cidade} - {fornecedor.estado}</span>
                </div>
                {fornecedor.telefone && (
                  <div className="flex items-center justify-end lg:justify-start gap-3">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{fornecedor.telefone}</span>
                  </div>
                )}
                {fornecedor.email && (
                  <div className="flex items-center justify-end lg:justify-start gap-3">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{fornecedor.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
          <TabsList className="bg-[#131825] border border-white/5 p-1 w-full justify-start h-auto rounded-xl">
            <TabsTrigger value="compras" className="rounded-lg px-6 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-400">
              <Receipt className="w-4 h-4 mr-2" />
              Compras (Notas)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compras" className="mt-6 outline-none">
            <div className="bg-[#131825] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  Histórico de Compras
                </h3>
                <span className="text-sm text-slate-400">{notasGrouped.length} notas registradas</span>
              </div>

              {notasGrouped.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">Nenhuma nota encontrada</h3>
                  <p className="text-slate-500">Importe notas fiscais para este fornecedor na tela anterior.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#0b0f19] rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                        <th 
                          className="py-4 px-4 font-semibold cursor-pointer hover:text-white transition-colors group select-none"
                          onClick={() => handleSort('numero_nota')}
                        >
                          <div className="flex items-center gap-1">
                            NÚMERO
                            {sortField === 'numero_nota' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="py-4 px-2 font-semibold cursor-pointer hover:text-white transition-colors group select-none"
                          onClick={() => handleSort('data_emissao')}
                        >
                          <div className="flex items-center gap-1">
                            DATA
                            {sortField === 'data_emissao' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="py-4 px-2 font-semibold cursor-pointer hover:text-white transition-colors group select-none"
                          onClick={() => handleSort('valor_total')}
                        >
                          <div className="flex items-center gap-1">
                            VALOR TOTAL
                            {sortField === 'valor_total' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="py-4 px-2 font-semibold cursor-pointer hover:text-white transition-colors group select-none"
                          onClick={() => handleSort('peso_liquido')}
                        >
                          <div className="flex items-center gap-1">
                            PESO LÍQ.
                            {sortField === 'peso_liquido' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        </th>
                        <th className="py-4 px-2 font-semibold">ITENS</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {notasGrouped.map((group, i) => (
                        <NotaRow 
                          key={`${group.numero_nota}-${i}`} 
                          notaGroup={group} 
                          onDeleteItem={async (id) => {
                            if (window.confirm('Tem certeza que deseja excluir este item da nota fiscal?')) {
                              await deleteNotaFiscal(id);
                              toast.success('Item excluído com sucesso!');
                            }
                          }}
                          onDeleteGroup={async (g) => {
                            if (window.confirm(`Tem certeza que deseja excluir a nota fiscal ${g.numero_nota} inteira (${g.itens.length} itens)?`)) {
                              // Delete all items in the group
                              let allSuccess = true;
                              for (const item of g.itens) {
                                const res = await deleteNotaFiscal(item.id);
                                if (!res.success) allSuccess = false;
                              }
                              if (allSuccess) {
                                toast.success(`Nota fiscal ${g.numero_nota} excluída com sucesso!`);
                              } else {
                                toast.error('Alguns itens não puderam ser excluídos.');
                              }
                            }
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <FornecedorDialog 
          open={isEditing} 
          onOpenChange={setIsEditing} 
          fornecedorToEdit={fornecedor}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#131825] border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Tem certeza que deseja excluir o fornecedor {fornecedor.razaoSocial}? Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
