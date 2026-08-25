import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Search, Building2, Trash2, Plus, Download, FileUp, AlertTriangle, AlertCircle, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { FornecedorDialog } from '@/components/fornecedores/FornecedorDialog';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { useNotasFiscais } from '@/contexts/NotaFiscalContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Fornecedor, NotaFiscal } from '@/types';
import { supabase } from '@/lib/supabase';

const normalizeText = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function FornecedoresPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isDeleteNotasOpen, setIsDeleteNotasOpen] = useState(false);
  const { fornecedores, importFornecedores, deleteFornecedor } = useFornecedores();
  const { notasFiscais, importNotasFiscais, deleteNotaFiscal } = useNotasFiscais();

  const excelNotasGroups = useMemo(() => {
    const excelNotas = notasFiscais.filter(n => n.id.startsWith('imp-'));
    const groups = new Map<string, { label: string, ids: string[], count: number, timestamp: number }>();
    
    excelNotas.forEach(n => {
      // id format: imp-filename_xlsx-1710928374-xyz123
      const parts = n.id.split('-');
      if (parts.length >= 4) {
        const timestampStr = parts[parts.length - 2];
        const filename = parts.slice(1, parts.length - 2).join('-');
        
        const key = `imp-${filename}-${timestampStr}`;
        if (!groups.has(key)) {
          const ts = parseInt(timestampStr, 10);
          const dateObj = new Date(ts);
          const label = `${filename} (${dateObj.toLocaleDateString('pt-BR')} às ${dateObj.toLocaleTimeString('pt-BR')})`;
          groups.set(key, { label, ids: [], count: 0, timestamp: ts });
        }
        const group = groups.get(key)!;
        group.ids.push(n.id);
        group.count++;
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [notasFiscais]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notasFileInputRef = useRef<HTMLInputElement>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [unmatchedNotas, setUnmatchedNotas] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Filters
  const estadosUnicos = Array.from(new Set(fornecedores.map(f => f.estado).filter(Boolean))).sort();

  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter(f => {
      const searchNormalized = normalizeText(searchTerm);
      const matchSearch = !searchTerm || 
        normalizeText(f.razaoSocial || '').includes(searchNormalized) || 
        normalizeText(f.nomeFantasia || '').includes(searchNormalized) ||
        (f.cnpj && f.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')));
      
      const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
      const matchEstado = estadoFilter === 'todos' || f.estado === estadoFilter;

      return matchSearch && matchStatus && matchEstado;
    });
  }, [fornecedores, searchTerm, statusFilter, estadoFilter]);

  const totalNotasUnicas = useMemo(() => {
    const notasSet = new Set<string>();
    notasFiscais.forEach(nota => {
      notasSet.add(`${nota.fornecedor_id}-${nota.numero_nota}-${nota.data_emissao}`);
    });
    return notasSet.size;
  }, [notasFiscais]);

  const generateModelFornecedores = () => {
    const data = [{
      'Razao Social': 'Exemplo Fornecedor LTDA',
      'Nome Fantasia': 'Exemplo Fornecedor',
      'CNPJ': '00.000.000/0001-00',
      'Cidade': 'São Paulo',
      'Estado': 'SP'
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
    XLSX.writeFile(wb, 'modelo_importacao_fornecedores.xlsx');
  };

  const generateModelNotas = () => {
    const data = [{
      'Fornecedor (CNPJ ou Razão Social)': 'Razão Social Exemplo',
      'CNPJ': '00.000.000/0001-00',
      'Nota Fiscal': '12345',
      'Data de Emissão': '01/01/2026',
      'Código': 'PROD-001',
      'Descrição': 'Produto Exemplo',
      'Quantidade': 10,
      'Valor Unitário': 150.50
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas');
    XLSX.writeFile(wb, 'modelo_importacao_notas.xlsx');
  };

  const handleImportFornecedores = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const novosFornecedores: Omit<Fornecedor, 'id' | 'createdAt'>[] = json.map(row => ({
          razaoSocial: row['Razao Social'] || row['Razão Social'] || '',
          nomeFantasia: row['Nome Fantasia'] || '',
          cnpj: row['CNPJ'] || '',
          cidade: row['Cidade'] || '',
          estado: row['Estado'] || '',
          status: 'ativo' as const
        })).filter(f => f.razaoSocial && f.cnpj);

        if (novosFornecedores.length === 0) {
          toast.error("Nenhum fornecedor válido encontrado. Verifique as colunas da planilha.");
          return;
        }

        const res = await importFornecedores(novosFornecedores);
        if (res.success) {
          toast.success(`${res.count} fornecedores importados com sucesso!`);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao processar o arquivo.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportNotas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const notasInvalidas: any[] = [];
        const notasMap = new Map<string, Omit<NotaFiscal, 'id' | 'createdAt'>>();

        json.forEach(row => {
          const identifier1 = row['Fornecedor (CNPJ ou Razão Social)'] || row['Fornecedor'];
          const identifier2 = row['CNPJ'];
          
          if (!identifier1 && !identifier2) return;

          // Find Fornecedor
          const found = fornecedores.find(f => {
            const match1 = identifier1 && (
              normalizeText(f.razaoSocial) === normalizeText(String(identifier1)) ||
              (f.cnpj && String(f.cnpj).replace(/\D/g, '') === String(identifier1).replace(/\D/g, ''))
            );
            
            const match2 = identifier2 && (
              (f.cnpj && String(f.cnpj).replace(/\D/g, '') === String(identifier2).replace(/\D/g, '')) ||
              normalizeText(f.razaoSocial) === normalizeText(String(identifier2))
            );

            return match1 || match2;
          });

          if (found) {
            const numero_nota = String(row['Nota Fiscal'] || '');
            const codigo = String(row['Código'] || '');
            const quantidade = Number(row['Quantidade'] || 0);
            const valor_unitario = Number(row['Valor Unitário'] || 0);
            
            const key = `${found.id}-${numero_nota}-${codigo}`;
            
            if (notasMap.has(key)) {
              const existing = notasMap.get(key)!;
              existing.quantidade += quantidade;
            } else {
              notasMap.set(key, {
                fornecedor_id: found.id,
                numero_nota,
                data_emissao: String(row['Data de Emissão'] || ''),
                codigo,
                descricao: String(row['Descrição'] || ''),
                quantidade,
                valor_unitario
              });
            }
          } else {
            notasInvalidas.push(row);
          }
        });
        
        const notasValidas = Array.from(notasMap.values());

        if (notasValidas.length > 0) {
          const res = await importNotasFiscais(notasValidas, file.name);
          if (res.success) {
            let msg = '';
            if (res.count > 0) msg += `${res.count} notas inseridas. `;
            if (res.updatedCount > 0) msg += `${res.updatedCount} notas atualizadas.`;
            if (!msg) msg = 'Nenhuma nota foi modificada.';
            toast.success(msg.trim());
          }
        } else if (notasInvalidas.length === 0) {
          toast.error("Nenhuma nota válida encontrada. Verifique as colunas.");
        }

        if (notasInvalidas.length > 0) {
          setUnmatchedNotas(notasInvalidas);
          setIsAlertOpen(true);
        }

      } catch (error) {
        console.error(error);
        toast.error("Erro ao processar o arquivo.");
      }
    };
    reader.readAsBinaryString(file);
    if (notasFileInputRef.current) notasFileInputRef.current.value = '';
  };

  const fixDatabaseDuplicates = async () => {
    setIsFixing(true);
    try {
      const notasMap = new Map<string, NotaFiscal>();
      const toDelete: string[] = [];

      notasFiscais.forEach(n => {
        const key = `${n.fornecedor_id}-${n.numero_nota}-${n.codigo}`;
        if (notasMap.has(key)) {
          const existing = notasMap.get(key)!;
          existing.quantidade += n.quantidade;
          toDelete.push(n.id);
        } else {
          notasMap.set(key, { ...n });
        }
      });

      for (const id of toDelete) {
        await deleteNotaFiscal(id);
      }
      
      for (const nota of notasMap.values()) {
        const original = notasFiscais.find(n => n.id === nota.id);
        if (original && original.quantidade !== nota.quantidade) {
            await supabase.from('notas_fiscais').update({ quantidade: nota.quantidade }).eq('id', nota.id);
        }
      }
      
      toast.success("Base de notas corrigida com sucesso!");
    } catch (e) {
      toast.error("Erro ao consolidar notas.");
    } finally {
      setIsFixing(false);
    }
  };

  const handleExcluirTodosFornecedores = async () => {
    for (const f of fornecedores) {
      await deleteFornecedor(f.id);
    }
    toast.success("Todos os fornecedores foram excluídos.");
  };

  const handleExcluirTodasNotas = async () => {
    try {
      const { error } = await supabase.from('notas_fiscais').delete().neq('id', '0');
      if (error) throw error;
      toast.success("Todas as notas fiscais foram excluídas.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error("Erro ao excluir todas as notas.");
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col relative z-20 overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col space-y-6">
        
        {/* Header and Buttons */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-bold tracking-tight text-white">Fornecedores</h1>
            </div>
            <p className="text-slate-400 mt-2">
              {fornecedores.length} fornecedores encontrados na base
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 shadow-md transition-all hover:shadow-lg gap-2">
                  <Plus className="w-4 h-4" /> Novo Manual
                </Button>
                
                <Button variant="outline" onClick={generateModelFornecedores} className="border-white/10 hover:bg-white/5 bg-transparent text-slate-300 rounded-full px-4 gap-2">
                  <Download className="w-4 h-4" /> B. Modelo (Fornecedores)
                </Button>

                <Button variant="outline" onClick={generateModelNotas} className="border-white/10 hover:bg-white/5 bg-transparent text-slate-300 rounded-full px-4 gap-2">
                  <Download className="w-4 h-4" /> B. Modelo (Notas)
                </Button>

                <div>
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleImportFornecedores} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent rounded-full px-4 gap-2">
                    <FileUp className="w-4 h-4" /> Importar Fornecedores
                  </Button>
                </div>

                <div>
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={notasFileInputRef} onChange={handleImportNotas} />
                  <Button variant="outline" onClick={() => notasFileInputRef.current?.click()} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent rounded-full px-4 gap-2">
                    <FileUp className="w-4 h-4" /> Importar Notas
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full ml-1 font-medium border border-blue-500/30">
                      {totalNotasUnicas}
                    </span>
                  </Button>
                </div>

                <div>
                  <Button variant="outline" onClick={fixDatabaseDuplicates} disabled={isFixing} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent rounded-full px-4 gap-2">
                    <AlertCircle className="w-4 h-4" /> {isFixing ? 'Limpando...' : 'Corrigir Base de Notas'}
                  </Button>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent rounded-full px-4 gap-2">
                      <Trash2 className="w-4 h-4" /> Excluir Fornecedores
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#131825] border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir todos os fornecedores?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleExcluirTodosFornecedores} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Dialog open={isDeleteNotasOpen} onOpenChange={setIsDeleteNotasOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 bg-transparent rounded-full px-4 gap-2">
                      <Trash2 className="w-4 h-4" /> Excluir Notas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl border-white/10 text-white bg-[#131825]">
                    <DialogHeader>
                      <DialogTitle>Gerenciar Arquivos de Notas Fiscais</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Abaixo estão listados os arquivos Excel importados e o número de notas fiscais lidas a partir de cada um. Selecione qual arquivo deseja excluir.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4 pr-2">
                      {excelNotasGroups.length === 0 && (
                        <p className="text-center text-slate-500 py-4">Nenhuma nota importada via arquivo excel encontrada.</p>
                      )}
                      {excelNotasGroups.map((group, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-[#0b0f19]">
                          <div>
                            <p className="font-medium text-sm text-white">{group.label}</p>
                            <p className="text-xs text-slate-400 mt-1">{group.count} notas inseridas</p>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="bg-red-600 hover:bg-red-700 h-8 gap-1"
                            onClick={async () => {
                              if (window.confirm(`Tem certeza que deseja excluir as ${group.count} notas de "${group.label}"?`)) {
                                try {
                                  await Promise.all(group.ids.map(id => deleteNotaFiscal(id)));
                                  toast.success(`Excluídas com sucesso!`);
                                } catch (e) {
                                  toast.error("Erro ao excluir notas.");
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </Button>
                        </div>
                      ))}
                    </div>
                    {excelNotasGroups.length > 0 && (
                       <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
                          <Button variant="destructive" className="gap-2 bg-red-600 hover:bg-red-700" onClick={async () => {
                             if (window.confirm("Atenção: Isso excluirá TODAS as notas de todos os arquivos Excel. Continuar?")) {
                                try {
                                  const allIds = excelNotasGroups.flatMap(g => g.ids);
                                  await Promise.all(allIds.map(id => deleteNotaFiscal(id)));
                                  toast.success("Todas as notas importadas foram excluídas.");
                                  setIsDeleteNotasOpen(false);
                                } catch (e) {
                                  toast.error("Erro ao excluir notas.");
                                }
                             }
                          }}>
                             <Trash2 className="w-4 h-4" /> Excluir Tudo em Massa
                          </Button>
                       </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..." 
              className="pl-12 h-12 bg-[#131825] border-white/10 text-white rounded-full focus-visible:ring-1 focus-visible:ring-blue-500 w-full shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-12 bg-[#131825] border-white/10 text-white rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#131825] border-white/10 text-white">
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-full md:w-[150px] h-12 bg-[#131825] border-white/10 text-white rounded-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#131825] border-white/10 text-white">
              <SelectItem value="todos">Todos</SelectItem>
              {estadosUnicos.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredFornecedores.map((fornecedor, i) => (
              <motion.div
                key={fornecedor.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <div 
                  onClick={() => navigate(`/fornecedores/${fornecedor.id}`)}
                  className="bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-500/30 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1" title={fornecedor.razaoSocial}>
                        {fornecedor.razaoSocial}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-1" title={fornecedor.nomeFantasia}>
                        {fornecedor.nomeFantasia}
                      </p>
                    </div>
                    <StatusBadge status={fornecedor.status || 'ativo'} />
                  </div>
                  
                  <div className="mt-auto space-y-3">
                    <p className="text-sm font-medium text-slate-300">{fornecedor.cnpj}</p>
                    
                    <div className="space-y-2 pt-4 border-t border-white/5">
                      <div className="flex items-center text-sm text-slate-400">
                        <MapPin className="w-4 h-4 mr-3 text-slate-500" />
                        {fornecedor.cidade}/{fornecedor.estado}
                      </div>
                      {(fornecedor.telefone || fornecedor.email) && (
                        <div className="flex items-center text-sm text-slate-400">
                          <Building2 className="w-4 h-4 mr-3 text-slate-500" />
                          {fornecedor.telefone || fornecedor.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal Erro Notas Unmatched */}
        <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <DialogContent className="max-w-2xl bg-[#131825] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-orange-400">
                <AlertTriangle className="w-6 h-6" />
                Atenção: Fornecedores não encontrados
              </DialogTitle>
              <DialogDescription className="text-slate-400 pt-2">
                As notas abaixo tentaram ser importadas, porém os fornecedores vinculados não existem na base atual. 
                <strong> É necessário cadastrar esses fornecedores primeiro para importar essas notas.</strong>
                <br/><br/>
                As demais notas foram importadas com sucesso!
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto mt-4 p-4 bg-[#0b0f19] rounded-lg border border-white/5">
              <ul className="space-y-3">
                {unmatchedNotas.map((nota, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>
                      Fornecedor Planilha: <strong className="text-white">{nota['Fornecedor (CNPJ ou Razão Social)'] || nota['Fornecedor'] || nota['CNPJ']}</strong> <br/>
                      Nota: {nota['Nota Fiscal']} | Valor: R$ {nota['Valor Unitário']}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAlertOpen(false)} className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FornecedorDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
        />

      </div>
    </div>
  );
}
