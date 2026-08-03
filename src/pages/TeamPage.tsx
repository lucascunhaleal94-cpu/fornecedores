import React, { useState, useRef, useEffect } from 'react';
import { useCollaborators } from '@/contexts/CollaboratorContext';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { Briefcase, Search, Plus, Trash2, Edit2, ChevronDown, ChevronUp, Download, FileUp, CheckCircle, AlertCircle, Clock, CheckSquare, Paperclip, X, File, Image as ImageIcon, FileText, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Collaborator, ContratacaoType, Pendency, UrgenciaType, Fornecedor, ProjectAttachment } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';

const parseNum = (val: string) => {
  if (!val) return 0;
  let cleanStr = val.replace(/[^\d.,-]/g, '');
  if (cleanStr.includes(',') && !cleanStr.includes('.')) return parseFloat(cleanStr.replace(',', '.'));
  if (cleanStr.includes(',') && cleanStr.includes('.')) return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
  return parseFloat(cleanStr) || 0;
};

const FilterDropdown = ({ title, options, selected, onChange }: { title: string, options: {value: string, label: string}[], selected: string[], onChange: (val: string[]) => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-background border-dashed text-xs h-8">
          <Filter className="w-3 h-3" />
          {title}
          {selected.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {selected.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
        {options.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground text-center">Vazio</div>
        ) : (
          options.map(opt => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...selected, opt.value]);
                } else {
                  onChange(selected.filter(v => v !== opt.value));
                }
              }}
              className="text-sm cursor-pointer"
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function CollaboratorsPage() {
  const { collaborators, addCollaborator, updateCollaborator, deleteCollaborator, importCollaborators, deleteAllCollaborators, pendencies, addPendency, updatePendency, deletePendency } = useCollaborators();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const { fornecedores } = useFornecedores();
  const availableDepartments = [
    'MARKETING', 'TÉCNICO', 'COMERCIAL', 'FINANCEIRO', 
    'CONTÁBIL', 'JURÍDICO', 'COMPRAS', 'ALMOXARIFADO', 'MANUTENÇÃO'
  ];

  const [showPendencyModal, setShowPendencyModal] = useState(false);
  const [isEditingPendency, setIsEditingPendency] = useState(false);
  const [editingPendencyId, setEditingPendencyId] = useState('');
  
  const [pendColabs, setPendColabs] = useState<string[]>([]);
  const [pendDescricao, setPendDescricao] = useState('');
  const [pendPrazo, setPendPrazo] = useState('');
  const [pendUrgencia, setPendUrgencia] = useState<UrgenciaType>('baixa');
  const [pendFornecedorId, setPendFornecedorId] = useState<string>('');
  const [pendObservacao, setPendObservacao] = useState('');
  const [pendAnexos, setPendAnexos] = useState<ProjectAttachment[]>([]);

  const [filterColabs, setFilterColabs] = useState<string[]>([]);
  const [filterMeses, setFilterMeses] = useState<string[]>([]);
  const [filterUrgencias, setFilterUrgencias] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  const [selectedClientForPendencies, setSelectedClientForPendencies] = useState<Fornecedor | null>(null);

  const [showConclusaoModal, setShowConclusaoModal] = useState(false);
  const [concluindoId, setConcluindoId] = useState('');
  const [obsConclusao, setObsConclusao] = useState('');
  const [showConcluidas, setShowConcluidas] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [obs, setObs] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  const getDepartmentColor = (dept: string) => {
    if (!dept) return 'bg-muted text-muted-foreground border-border';
    const colors = [
      'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      'bg-rose-500/10 text-rose-500 border-rose-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };
  
  useEffect(() => {
    if (filterStatus.includes('concluido')) {
      setShowConcluidas(true);
    }
  }, [filterStatus]);

  
  const getProp = (row: any, keys: string[]) => {
    const foundKey = Object.keys(row).find(k => 
      keys.some(key => k.trim().toLowerCase() === key.toLowerCase())
    );
    return foundKey ? row[foundKey] : undefined;
  };

  const downloadTemplate = () => {
    const ws_data = [
      {
        'CÓDIGO': '1',
        'NOME': 'JOÃO DA SILVA',
        'CONTRATAÇÃO': 'CLT',
        'SALÁRIO': 1920.00,
        'TOTAL ENCARGOS': 732.29,
        'TOTAL': 2942.70,
        'VALOR POR HORA': 16.72,
        'OBS': 'Apenas uma nota de exemplo',
        'NASCIMENTO': '1990-05-15'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    XLSX.writeFile(wb, "Modelo_Importacao_Colaboradores.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const colabsToImport = data.map(row => {
          const codigo = String(getProp(row, ['CÓDIGO', 'CODIGO', 'COD']) || '').trim();
          const nome = String(getProp(row, ['NOME', 'COLABORADOR', 'FUNCIONARIO']) || '').trim().toUpperCase();
          
          let contratacao = String(getProp(row, ['CONTRATAÇÃO', 'CONTRATACAO', 'TIPO']) || '').trim();
          if (!['CLT', 'PJ', 'Estágio'].includes(contratacao)) {
            contratacao = 'CLT'; // fallback
          }

          const salario = parseNum(getProp(row, ['SALÁRIO', 'SALARIO', 'BRUTO']));
          const encargos = parseNum(getProp(row, ['TOTAL ENCARGOS', 'ENCARGOS']));
          const total = parseNum(getProp(row, ['TOTAL', 'CUSTO TOTAL']));
          const valorHora = parseNum(getProp(row, ['VALOR POR HORA', 'VALOR HORA', 'HORA']));
          const obs = String(getProp(row, ['OBS', 'OBSERVAÇÃO', 'OBSERVACAO', 'NOTAS']) || '').trim();
          const rawNascimento = getProp(row, ['NASCIMENTO', 'DATA DE NASCIMENTO', 'ANIVERSARIO', 'ANIVERSÁRIO']);
          
          let dataNascimento = '';
          if (rawNascimento) {
            // Very basic handle if user typed exactly a string or somehow an excel date block
            if (typeof rawNascimento === 'string' && rawNascimento.includes('-')) {
              dataNascimento = rawNascimento.trim();
            } else if (typeof rawNascimento === 'string' && rawNascimento.includes('/')) {
               const parts = rawNascimento.split('/');
               if(parts.length === 3) dataNascimento = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
          
          return { codigo, nome, contratacao: contratacao as ContratacaoType, salario, encargos, total, valorHora, obs, dataNascimento };
        }).filter(c => c.codigo && c.nome);

        if (colabsToImport.length > 0) {
          const res = await importCollaborators(colabsToImport);
          if (res.successCount > 0) {
            toast.success(`${res.successCount} novos colaboradores importados!`);
          }
          if (res.duplicatedCount > 0) {
            toast.info(`${res.duplicatedCount} colaborador(es) já existiam e foram atualizados.`);
          }
        } else {
          toast.warning('Nenhum colaborador válido encontrado.');
        }
      } catch (err) {
        toast.error('Erro ao ler a planilha. Formato inválido.');
      }
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const openForm = (colab?: Collaborator) => {
    if (colab) {
      setIsEditing(true);
      setEditingId(colab.id);
      setCodigo(colab.codigo);
      setNome(colab.nome);
      setDepartamento(colab.departamento || '');
      setObs(colab.obs || '');
      setDataNascimento(colab.dataNascimento || '');
    } else {
      setIsEditing(false);
      setEditingId('');
      setCodigo('');
      setNome('');
      setDepartamento(availableDepartments[0] || '');
      setObs('');
      setDataNascimento('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nome) return;

    if (isEditing) {
      updateCollaborator(editingId, {
        nome: nome.toUpperCase(),
        departamento,
        obs,
        dataNascimento
      });
      toast.success('Colaborador atualizado com sucesso!');
      setShowModal(false);
    } else {
      const res = await addCollaborator({
        codigo: codigo.trim(),
        nome: nome.toUpperCase(),
        departamento,
        obs,
        dataNascimento
      });
      if (res.success) {
        toast.success('Colaborador cadastrado com sucesso!');
        setShowModal(false);
      } else {
        toast.error(res.reason || 'Erro ao cadastrar colaborador.');
      }
    }
  };

  const filtered = collaborators.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    c.codigo.toLowerCase().includes(search.toLowerCase())
  );


  const availableMonths = Array.from(new Set(pendencies.map(p => {
    const date = new Date(p.prazo);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }))).sort((a,b) => {
    const [ma, ya] = a.split('/');
    const [mb, yb] = b.split('/');
    if (ya !== yb) return parseInt(ya) - parseInt(yb);
    return parseInt(ma) - parseInt(mb);
  });

  const filteredPendencies = pendencies.filter(p => {
    if (filterColabs.length > 0 && !p.colaboradoresIds.some(id => filterColabs.includes(id))) return false;
    
    if (filterMeses.length > 0) {
      const date = new Date(p.prazo);
      const monthStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      if (!filterMeses.includes(monthStr)) return false;
    }

    if (filterUrgencias.length > 0 && !filterUrgencias.includes(p.urgencia)) return false;

    if (filterStatus.length > 0) {
      const isVencido = !p.concluida && (new Date(p.prazo).getTime() < new Date().setHours(0,0,0,0));
      const status = p.concluida ? 'concluido' : (isVencido ? 'vencido' : 'pendente');
      if (!filterStatus.includes(status)) return false;
    }

    return true;
  });

  const sortedPendencies = [...filteredPendencies].sort((a,b) => {
    if (a.concluida && !b.concluida) return 1;
    if (!a.concluida && b.concluida) return -1;
  
    const dateA = new Date(a.prazo).getTime();
    const dateB = new Date(b.prazo).getTime();
    
    if (dateA !== dateB) return dateA - dateB;

    const urgMap = { 'alta': 3, 'media': 2, 'baixa': 1 };
    return urgMap[b.urgencia] - urgMap[a.urgencia];
  });

  const openPendencyForm = (pend?: Pendency) => {
    if (pend) {
      setIsEditingPendency(true);
      setEditingPendencyId(pend.id);
      setPendColabs(pend.colaboradoresIds);
      setPendDescricao(pend.descricao);
      setPendPrazo(pend.prazo);
      setPendUrgencia(pend.urgencia);
      setPendFornecedorId(pend.fornecedorId || '');
      setPendObservacao(pend.observacao || '');
      setPendAnexos(pend.anexos || []);
    } else {
      setIsEditingPendency(false);
      setEditingPendencyId('');
      setPendColabs([]);
      setPendDescricao('');
      setPendPrazo('');
      setPendUrgencia('baixa');
      setPendFornecedorId('');
      setPendObservacao('');
      setPendAnexos([]);
    }
    setShowPendencyModal(true);
  };

  const handlePendencyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        let type: ProjectAttachment['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type === 'application/pdf') type = 'pdf';
        else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'excel'; // Using excel icon for docs since it's an office file, or 'other'
        
        setPendAnexos(prev => [...prev, {
          id: 'attach-' + Date.now() + Math.random(),
          name: file.name,
          type,
          url: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePendencyAttachment = (id: string) => {
    setPendAnexos(prev => prev.filter(a => a.id !== id));
  };

  const AttachmentIcon = ({ type }: { type: ProjectAttachment['type'] }) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (type === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  const handeSubmitPendency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendDescricao || !pendPrazo || pendColabs.length === 0) {
      toast.warning('Preencha os campos obrigatórios (Descrição, Prazo, e ao menos 1 Colaborador).');
      return;
    }

    if (isEditingPendency) {
      updatePendency(editingPendencyId, {
        colaboradoresIds: pendColabs,
        descricao: pendDescricao,
        prazo: pendPrazo,
        urgencia: pendUrgencia,
        fornecedorId: pendFornecedorId || undefined,
        observacao: pendObservacao,
        anexos: pendAnexos
      });
      toast.success('Pendência atualizada!');
    } else {
      addPendency({
        colaboradoresIds: pendColabs,
        descricao: pendDescricao,
        prazo: pendPrazo,
        urgencia: pendUrgencia,
        concluida: false,
        fornecedorId: pendFornecedorId || undefined,
        observacao: pendObservacao,
        anexos: pendAnexos
      });
      toast.success('Pendência cadastrada!');
    }
    setShowPendencyModal(false);
  };
  
  const handleConcluir = () => {
    updatePendency(concluindoId, {
      concluida: true,
      obsConclusao
    });
    toast.success('Pendência marcada como concluída!');
    setShowConclusaoModal(false);
    setObsConclusao('');
    setConcluindoId('');
  };

  const renderPendencyRow = (p: Pendency) => {
    const isVencido = !p.concluida && (new Date(p.prazo).getTime() < new Date().setHours(0,0,0,0));
    
    return (
      <tr key={p.id} className={`border-b border-border last:border-0 transition-colors ${isVencido ? 'bg-red-500/5 hover:bg-red-500/10 border-l-[4px] border-l-red-500' : 'hover:bg-muted/30'} ${p.concluida ? 'opacity-60 bg-muted/20' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {p.colaboradoresIds.map(id => {
              const c = collaborators.find(col => col.id === id);
              return c ? <span key={id} className={`border px-2 py-0.5 rounded-md text-xs font-medium truncate max-w-[150px] inline-block ${isVencido ? 'bg-red-100 border-red-200 text-red-800' : 'bg-background border-border text-foreground'}`}>{c.nome}</span> : null;
            })}
          </div>
        </td>
        <td className="px-4 py-3 font-medium text-foreground">
          <div className={p.concluida ? 'line-through text-muted-foreground' : 'flex items-center flex-wrap gap-2'}>
            <span>{p.descricao}</span>
            {p.fornecedorId && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 truncate max-w-[200px]">
                <Briefcase className="w-3 h-3 shrink-0" />
                <span className="truncate">{fornecedores.find(c => c.id === p.fornecedorId)?.nomeFantasia || 'Fornecedor Vinculado'}</span>
              </span>
            )}
          </div>
          {p.observacao && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold">Obs:</span> {p.observacao}
            </div>
          )}
          {p.anexos && p.anexos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {p.anexos.map(anexo => (
                <a 
                  key={anexo.id} 
                  href={anexo.url} 
                  download={anexo.name}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] bg-muted/50 hover:bg-muted border border-border px-2 py-1 rounded-md text-foreground transition-colors"
                >
                  <AttachmentIcon type={anexo.type} />
                  <span className="truncate max-w-[150px]">{anexo.name}</span>
                </a>
              ))}
            </div>
          )}
          {p.concluida && p.obsConclusao && (
            <div className="mt-2 text-xs text-muted-foreground bg-background p-2 rounded-md border border-border/50">
              <strong>Obs da Conclusão:</strong> {p.obsConclusao}
            </div>
          )}
        </td>
        <td className={`px-4 py-3 whitespace-nowrap font-medium ${isVencido ? 'text-red-600' : 'text-foreground'}`}>
          {p.prazo.substring(0, 10).split('-').reverse().join('/')}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${p.urgencia === 'alta' ? 'bg-red-500/20 text-red-600' : p.urgencia === 'media' ? 'bg-orange-500/20 text-orange-600' : 'bg-blue-500/20 text-blue-600'}`}>
            {p.urgencia}
          </span>
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
           {p.concluida ? (
              <span className="text-green-500 flex items-center gap-1 justify-end font-medium text-xs"><CheckCircle className="w-4 h-4"/> Concluído</span>
           ) : isVencido ? (
              <span className="text-red-600 flex items-center gap-1 justify-end font-bold text-xs"><AlertCircle className="w-4 h-4"/> Estourado</span>
           ) : (
              <span className="text-orange-500 flex items-center gap-1 justify-end font-medium text-xs"><Clock className="w-4 h-4"/> Pendente</span>
           )}
        </td>
        <td className="px-4 py-3 text-right opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`h-8 gap-1 px-3 ${isVencido ? 'bg-background/80 hover:bg-background border-red-500/30' : 'bg-background'}`} size="sm">
                <span className="sr-only">Ações</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!p.concluida && (
                <DropdownMenuItem onClick={() => { setConcluindoId(p.id); setShowConclusaoModal(true); setObsConclusao(''); }} className="gap-2 cursor-pointer font-bold text-green-600 focus:text-green-700">
                  <CheckSquare className="w-4 h-4" /> Concluir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openPendencyForm(p)} className="gap-2 cursor-pointer">
                <Edit2 className="w-4 h-4 text-muted-foreground" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deletePendency(p.id)} className="gap-2 text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  };

  const uncompletedPendencies = pendencies.filter(p => !p.concluida && p.fornecedorId);
  const fornecedoresWithPendencies = fornecedores.filter(c => uncompletedPendencies.some(p => p.fornecedorId === c.id));
  
  const fornecedoresByState = fornecedoresWithPendencies.reduce((acc, fornecedor) => {
    const estado = fornecedor.estado || 'Sem Estado';
    if (!acc[estado]) acc[estado] = [];
    acc[estado].push(fornecedor);
    return acc;
  }, {} as Record<string, Fornecedor[]>);

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestão de Pessoas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie os colaboradores, salários e encargos da empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => openForm()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4" /> Novo Colaborador
          </Button>

          <Button variant="outline" className="gap-2" onClick={downloadTemplate} title="Baixar Modelo de Excel">
            <Download className="w-4 h-4 text-info" /> Modelo (XLSX)
          </Button>
          
          <Button variant="outline" className="gap-2 border-info/30 hover:bg-info/5" onClick={() => excelFileInputRef.current?.click()} title="Importar via XLSX">
            <FileUp className="w-4 h-4 text-info" /> Importar Planilha
          </Button>
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={excelFileInputRef} onChange={handleExcelUpload} />

          {collaborators.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2 px-3 bg-red-600 hover:bg-red-700" title="Apagar Todos">
                  <Trash2 className="w-4 h-4" /> Limpar Base
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Zerar Gestão de Pessoas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apagará permanentemente todos os <strong>{collaborators.length}</strong> colaboradores cadastrados. Tem certeza?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {
                    deleteAllCollaborators();
                    toast.success('Todos os colaboradores foram excluídos.');
                  }}>
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="bg-card border border-border shadow-card rounded-2xl overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código ou nome..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            Mostrando <span className="font-medium text-foreground">{filtered.length}</span> colaboradores
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Departamento</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{c.codigo}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.departamento ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getDepartmentColor(c.departamento)}`}>
                          {c.departamento}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Sem departamento</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-8 gap-1 px-3" size="sm">
                            <span className="sr-only">Ações</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openForm(c)} className="gap-2 cursor-pointer">
                            <Edit2 className="w-4 h-4 text-muted-foreground" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteCollaborator(c.id)} className="gap-2 text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 lg:p-6 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
               <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
               <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">Pendências</h2>
               <p className="text-sm text-muted-foreground">Acompanhe tarefas e prazos (Ordenadas por Próximo Prazo &gt; Urgência)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown 
              title="Colaboradores" 
              options={collaborators.map(c => ({ value: c.id, label: c.nome }))} 
              selected={filterColabs} 
              onChange={setFilterColabs} 
            />
            <FilterDropdown 
              title="Mês" 
              options={availableMonths.map(m => ({ value: m, label: m }))} 
              selected={filterMeses} 
              onChange={setFilterMeses} 
            />
            <FilterDropdown 
              title="Urgência" 
              options={[
                {value: 'alta', label: 'Alta'}, 
                {value: 'media', label: 'Média'}, 
                {value: 'baixa', label: 'Baixa'}
              ]} 
              selected={filterUrgencias} 
              onChange={setFilterUrgencias} 
            />
            <FilterDropdown 
              title="Status" 
              options={[
                {value: 'pendente', label: 'Pendente'}, 
                {value: 'vencido', label: 'Vencido'}, 
                {value: 'concluido', label: 'Concluído'}
              ]} 
              selected={filterStatus} 
              onChange={setFilterStatus} 
            />
            <Button onClick={() => openPendencyForm()} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shrink-0">
              <Plus className="w-4 h-4" /> Nova Pendência
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider min-w-[200px]">Colaborador(es)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider w-full">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">Prazo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Urgência</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedPendencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma pendência cadastrada.
                  </td>
                </tr>
              ) : (
                <>
                  {sortedPendencies.filter(p => !p.concluida).map(p => renderPendencyRow(p))}
                  
                  {sortedPendencies.some(p => p.concluida) && (
                    <>
                      <tr onClick={() => setShowConcluidas(!showConcluidas)} className="cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors border-y border-border">
                        <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground font-medium">
                          <div className="flex items-center justify-center gap-2">
                            {showConcluidas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showConcluidas ? 'Ocultar' : 'Mostrar'} {sortedPendencies.filter(p => p.concluida).length} Pendências Concluídas
                          </div>
                        </td>
                      </tr>
                      {showConcluidas && sortedPendencies.filter(p => p.concluida).map(p => renderPendencyRow(p))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo de Clientes com Pendências */}
      <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 lg:p-6 pb-6 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
             <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div>
             <h2 className="text-xl font-bold text-foreground tracking-tight uppercase">Resumo de Pendências por Fornecedor</h2>
             <p className="text-sm text-muted-foreground">Fornecedores com pendências em aberto, organizados por estado</p>
          </div>
        </div>

        {Object.keys(fornecedoresByState).length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl p-8 text-center bg-card/30">Nenhum fornecedor com pendências em aberto.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(fornecedoresByState).sort(([a], [b]) => a.localeCompare(b)).map(([estado, fornecedoresList]) => (
              <div key={estado} className="space-y-3">
                <h3 className="font-bold text-lg text-foreground border-b border-border/50 pb-2">{estado}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fornecedoresList.map(fornecedor => {
                    const fornecedorPendencies = uncompletedPendencies.filter(p => p.fornecedorId === fornecedor.id);
                    return (
                      <div 
                        key={fornecedor.id} 
                        onClick={() => setSelectedClientForPendencies(fornecedor)}
                        className="bg-background border border-border/60 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between h-full group"
                      >
                        <div>
                          <p className="font-semibold text-foreground truncate group-hover:text-blue-600 transition-colors">{fornecedor.nomeFantasia}</p>
                          <p className="text-xs text-muted-foreground truncate">{fornecedor.cidade} - {fornecedor.estado}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Pendências:</span>
                          <span className="bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
                            {fornecedorPendencies.length}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-elevated border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-muted/20 shrink-0">
              <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <p className="text-sm text-muted-foreground mt-1">Insira os dados do colaborador (Valores preenchidos manualmente).</p>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="colab-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Código <span className="text-destructive">*</span></label>
                    <Input 
                      value={codigo} 
                      onChange={e => setCodigo(e.target.value)} 
                      placeholder="Ex: 1" 
                      className="font-mono bg-background"
                      required
                      disabled={isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Nome <span className="text-destructive">*</span></label>
                    <Input 
                      value={nome} 
                      onChange={e => setNome(e.target.value)} 
                      placeholder="Ex: JOÃO DA SILVA" 
                      className="bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Departamento <span className="text-destructive">*</span></label>
                    <select 
                      value={departamento} 
                      onChange={e => setDepartamento(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Selecione um departamento</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Data de Nascimento (Opcional)</label>
                    <Input 
                      type="date"
                      value={dataNascimento} 
                      onChange={e => setDataNascimento(e.target.value)} 
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Observações / Peculiaridades</label>
                    <textarea 
                      value={obs} 
                      onChange={e => setObs(e.target.value)} 
                      placeholder="Insira detalhes sobre horas de banco, dia de pagamento, alergias, etc..." 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border bg-muted/20 shrink-0 flex gap-3 w-full">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="colab-form" className="flex-1 bg-primary text-primary-foreground">
                Salvar Colaborador
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Pendência */}
      {showPendencyModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowPendencyModal(false)}>
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-elevated border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-orange-500/5 shrink-0">
              <h2 className="text-xl font-bold text-foreground">{isEditingPendency ? 'Editar Pendência' : 'Nova Pendência'}</h2>
              <p className="text-sm text-muted-foreground mt-1">Crie uma tarefa atrelada a um ou mais colaboradores.</p>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="pendency-form" onSubmit={handeSubmitPendency} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Descrição / Tarefa <span className="text-destructive">*</span></label>
                  <Input 
                    value={pendDescricao} 
                    onChange={e => setPendDescricao(e.target.value)} 
                    placeholder="Ex: Entregar relatório final, Avaliação de Desempenho..." 
                    className="bg-background"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Prazo <span className="text-destructive">*</span></label>
                    <Input 
                      type="date"
                      value={pendPrazo} 
                      onChange={e => setPendPrazo(e.target.value)} 
                      className="bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Urgência <span className="text-destructive">*</span></label>
                    <select 
                      value={pendUrgencia} 
                      onChange={e => setPendUrgencia(e.target.value as UrgenciaType)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Fornecedor Vinculado (Opcional)</label>
                  <select 
                    value={pendFornecedorId} 
                    onChange={e => setPendFornecedorId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Nenhum fornecedor vinculado</option>
                    {fornecedores.map(c => (
                      <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Colaboradores Associados <span className="text-destructive">*</span></label>
                  <div className="bg-background border border-input rounded-md max-h-[150px] overflow-y-auto p-2 space-y-1">
                    {collaborators.map(c => (
                       <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors">
                          <input 
                             type="checkbox" 
                             className="w-4 h-4 rounded border-input text-orange-500 focus:ring-orange-500 flex-shrink-0"
                             checked={pendColabs.includes(c.id)}
                             onChange={(e) => {
                                if(e.target.checked) setPendColabs(prev => [...prev, c.id]);
                                else setPendColabs(prev => prev.filter(id => id !== c.id));
                             }}
                          />
                          <span className="text-sm font-medium">{c.nome}</span>
                       </label>
                    ))}
                    {collaborators.length === 0 && (
                       <p className="text-sm text-muted-foreground p-2 text-center">Nenhum colaborador cadastrado ainda.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Observação (Opcional)</label>
                  <textarea 
                    value={pendObservacao} 
                    onChange={e => setPendObservacao(e.target.value)} 
                    placeholder="Ex: Análise pendente do setor financeiro..." 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Anexos (PDF, Imagem, Word)</label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 shrink-0 bg-background hover:bg-muted"
                      onClick={() => document.getElementById('pendency-file-upload')?.click()}
                    >
                      <Paperclip className="w-4 h-4" /> Anexar Arquivos
                    </Button>
                    <input
                      id="pendency-file-upload"
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handlePendencyFileChange}
                    />
                    <span className="text-xs text-muted-foreground">Opcional</span>
                  </div>

                  {pendAnexos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {pendAnexos.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20 text-sm group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <AttachmentIcon type={file.type} />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removePendencyAttachment(file.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-border bg-muted/20 shrink-0 flex gap-3 w-full">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPendencyModal(false)}>Cancelar</Button>
              <Button type="submit" form="pendency-form" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-transparent">
                Salvar Pendência
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Concluir Pendência */}
      {showConclusaoModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowConclusaoModal(false)}>
          <div className="bg-card w-full max-w-md rounded-2xl shadow-elevated border border-border overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-green-500/10 shrink-0">
               <div className="flex items-center gap-2 text-green-600 mb-2">
                 <CheckCircle className="w-5 h-5" />
                 <h2 className="text-xl font-bold">Concluir Pendência</h2>
               </div>
              <p className="text-sm text-muted-foreground">Deseja adicionar alguma nota ou observação para ficar salva no histórico dessa conclusão?</p>
            </div>
            
            <div className="p-6">
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Observação (Opcional)</label>
                  <textarea 
                    value={obsConclusao} 
                    onChange={e => setObsConclusao(e.target.value)} 
                    placeholder="Ex: Tarefa finalizada e enviada via email..." 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  />
                </div>
            </div>

            <div className="p-5 border-t border-border bg-muted/20 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConclusaoModal(false)}>Cancelar</Button>
              <Button onClick={handleConcluir} className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2 border-transparent shadow-sm">
                <CheckSquare className="w-4 h-4" /> Confirmar Conclusão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pendências do Cliente */}
      {selectedClientForPendencies && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={() => setSelectedClientForPendencies(null)}>
          <div className="bg-card w-full max-w-3xl rounded-2xl shadow-elevated border border-border overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border bg-blue-500/5 shrink-0 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground">Pendências - {selectedClientForPendencies.nomeFantasia}</h2>
                <p className="text-sm text-muted-foreground mt-1">Lista de pendências em aberto vinculadas a este fornecedor.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedClientForPendencies(null)}>Fechar</Button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3">
                {uncompletedPendencies.filter(p => p.fornecedorId === selectedClientForPendencies.id).map(p => {
                  const isVencido = (new Date(p.prazo).getTime() < new Date().setHours(0,0,0,0));
                  return (
                    <div key={p.id} className={`border rounded-lg p-4 ${isVencido ? 'border-red-200 bg-red-50/50' : 'border-border bg-background'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-foreground">{p.descricao}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${p.urgencia === 'alta' ? 'bg-red-500/20 text-red-600' : p.urgencia === 'media' ? 'bg-orange-500/20 text-orange-600' : 'bg-blue-500/20 text-blue-600'}`}>
                          {p.urgencia}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Prazo</span>
                          <span className={isVencido ? 'text-red-600 font-medium' : ''}>{p.prazo.substring(0, 10).split('-').reverse().join('/')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold mb-1">Colaboradores</span>
                          <div className="flex flex-wrap gap-1">
                            {p.colaboradoresIds.map(id => {
                              const c = collaborators.find(col => col.id === id);
                              return c ? <span key={id} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">{c.nome}</span> : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
