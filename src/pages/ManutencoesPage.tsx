import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Search, Plus, CheckCircle2, Clock, Settings2, AlertTriangle, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ManutencoesPage() {
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [kmAtual, setKmAtual] = useState(() => localStorage.getItem('kmAtual') || '');
  const [kmAtualStrada, setKmAtualStrada] = useState(() => localStorage.getItem('kmAtualStrada') || '');
  
  const [isConcluirDialogOpen, setIsConcluirDialogOpen] = useState(false);
  const [selectedIdForConclusao, setSelectedIdForConclusao] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valorGasto, setValorGasto] = useState('');
  const [dataConclusao, setDataConclusao] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: '',
    servico: '',
    descricao: '',
    periodicidade_km: '',
    km_realizado: '',
    data_realizacao: '',
    km_proxima: '',
    tipo: 'PREVENTIVA',
    demanda: 'FIXA',
    status: 'pendente',
    veiculo: 'CAMINHAO'
  });

  const fetchManutencoes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('manutencoes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('Erro ao carregar manutenções.');
    } else {
      setManutencoes(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchManutencoes();
  }, []);

  const handleOpenNew = () => {
    setFormData({
      id: '',
      servico: '',
      descricao: '',
      periodicidade_km: '',
      km_realizado: '',
      data_realizacao: '',
      km_proxima: '',
      tipo: 'PREVENTIVA',
      demanda: 'FIXA',
      status: 'pendente',
      veiculo: 'CAMINHAO'
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setFormData(item);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleOpenConcluir = (id: string) => {
    setSelectedIdForConclusao(id);
    setObservacao('');
    setValorGasto('');
    setDataConclusao(new Date().toISOString().split('T')[0]);
    setIsConcluirDialogOpen(true);
  };

  const handleConfirmarConclusao = async () => {
    if (!selectedIdForConclusao) return;
    
    const valorFloat = parseFloat(valorGasto.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorFloat) || valorGasto.trim() === '') {
      toast.error('Informe o valor gasto na manutenção.');
      return;
    }

    setIsSaving(true);
    try {
      const mConcluida = manutencoes.find(m => m.id === selectedIdForConclusao);

      const { error } = await supabase.from('manutencoes').update({
        status: 'concluida',
        observacao: observacao,
        valor_gasto: valorFloat,
        data_realizacao: dataConclusao || null
      }).eq('id', selectedIdForConclusao);
      
      if (error) throw error;
      toast.success('Manutenção concluída com sucesso!');
      setIsConcluirDialogOpen(false);
      await fetchManutencoes();

      if (mConcluida && mConcluida.demanda === 'FIXA') {
        setFormData({
          id: '',
          servico: mConcluida.servico,
          descricao: mConcluida.descricao || '',
          periodicidade_km: mConcluida.periodicidade_km || '',
          km_realizado: '',
          data_realizacao: '',
          km_proxima: '',
          tipo: mConcluida.tipo || 'PREVENTIVA',
          demanda: 'FIXA',
          status: 'pendente',
          veiculo: mConcluida.veiculo || 'CAMINHAO'
        });
        setIsEditing(false);
        setTimeout(() => setIsDialogOpen(true), 400);
      }
    } catch (err) {
      toast.error('Erro ao concluir manutenção.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta manutenção?')) return;
    
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Manutenção excluída com sucesso!');
      fetchManutencoes();
    } catch (err) {
      toast.error('Erro ao excluir manutenção.');
    }
  };

  const handleRevertStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('manutencoes').update({
        status: newStatus,
        observacao: null
      }).eq('id', id);
      if (error) throw error;
      toast.success(`Manutenção retornada para ${newStatus === 'pendente' ? 'Pendente' : 'Em Andamento'}!`);
      fetchManutencoes();
    } catch (err) {
      toast.error('Erro ao reverter status.');
    }
  };

  const handleSave = async () => {
    if (!formData.servico) {
      toast.error('Preencha o nome do serviço.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        servico: formData.servico,
        descricao: formData.descricao || null,
        periodicidade_km: formData.periodicidade_km || null,
        km_realizado: formData.km_realizado || null,
        data_realizacao: formData.data_realizacao || null,
        km_proxima: formData.km_proxima || null,
        tipo: formData.tipo,
        demanda: formData.demanda,
        status: formData.status || 'pendente',
        veiculo: formData.veiculo
      };

      if (isEditing) {
        const { error } = await supabase.from('manutencoes').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast.success('Manutenção atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('manutencoes').insert([{ ...payload, status: 'pendente' }]);
        if (error) throw error;
        toast.success('Manutenção cadastrada com sucesso!');
      }
      setIsDialogOpen(false);
      fetchManutencoes();
    } catch (err: any) {
      console.error('Erro ao salvar manutenção:', err);
      toast.error(`Erro: ${err?.message || err?.details || JSON.stringify(err) || 'Desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const computeNextDate = (currentDateStr: string, daysStr: string): string => {
    if (!currentDateStr || !daysStr) return '';
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return '';
    const [year, month, day] = currentDateStr.split('-');
    if (!year || !month || !day) return '';
    
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    date.setDate(date.getDate() + days);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    
    return `${y}-${m}-${d}`;
  };

  const getDisplayStatus = (m: any) => {
    if (m.status === 'concluida') return m.status;
    
    if (m.veiculo === 'EQUIPAMENTO') {
      if (m.km_proxima) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = String(m.km_proxima).split('-');
        if (year && month && day) {
           const localDate = new Date(Number(year), Number(month) - 1, Number(day));
           if (localDate < today) return 'atrasada';
        }
      }
      return m.status;
    }

    const currentKm = parseInt(m.veiculo === 'STRADA' ? kmAtualStrada : kmAtual) || 0;
    const proximaKm = parseInt(String(m.km_proxima || '').replace(/\D/g, '')) || 0; 
    
    if (currentKm > proximaKm && proximaKm > 0) {
      return 'atrasada';
    }
    return m.status;
  };

  const manutencoesAtivas = manutencoes.filter(m => getDisplayStatus(m) !== 'concluida');
  const manutencoesConcluidas = manutencoes.filter(m => getDisplayStatus(m) === 'concluida');

  const filtered = manutencoesAtivas.filter(m => {
    const matchSearch = String(m.servico || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const displayStatus = getDisplayStatus(m);
    const matchStatus = statusFilter === 'todos' || displayStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredCaminhao = filtered.filter(m => m.veiculo !== 'STRADA' && m.veiculo !== 'EQUIPAMENTO');
  const filteredStrada = filtered.filter(m => m.veiculo === 'STRADA');
  const filteredEquipamento = filtered.filter(m => m.veiculo === 'EQUIPAMENTO');

  const formatarData = (dataOriginal: string) => {
    if (!dataOriginal) return '-';
    const partes = dataOriginal.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataOriginal;
  };

  const processMonthlyData = (data: any[]) => {
    const monthlyData: Record<string, { monthStr: string, total: number, prev: number, corr: number, rawDate: Date }> = {};
    
    data.forEach(m => {
      if (!m.valor_gasto) return;
      const dateVal = m.data_realizacao || m.created_at;
      if (!dateVal) return;
      
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return;
      
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStr = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase();
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { monthStr, total: 0, prev: 0, corr: 0, rawDate: d };
      }
      
      const val = Number(m.valor_gasto);
      monthlyData[monthKey].total += val;
      if (m.tipo === 'PREVENTIVA') {
        monthlyData[monthKey].prev += val;
      } else {
        monthlyData[monthKey].corr += val;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({
      name: d.monthStr,
      'Preventiva': d.prev,
      'Corretiva': d.corr,
      total: d.total,
      prevPercent: d.total > 0 ? ((d.prev / d.total) * 100).toFixed(1) : 0,
      corrPercent: d.total > 0 ? ((d.corr / d.total) * 100).toFixed(1) : 0,
    }));
  };

  const chartDataCaminhao = processMonthlyData(manutencoesConcluidas.filter(m => m.veiculo !== 'STRADA' && m.veiculo !== 'EQUIPAMENTO'));
  const chartDataStrada = processMonthlyData(manutencoesConcluidas.filter(m => m.veiculo === 'STRADA'));
  const chartDataEquipamento = processMonthlyData(manutencoesConcluidas.filter(m => m.veiculo === 'EQUIPAMENTO'));

  return (
    <div className="min-h-full w-full bg-[#0b0f19] text-white flex flex-col relative z-20 overflow-y-auto animate-in fade-in duration-500">
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1 flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Wrench className="w-7 h-7 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Manutenções</h1>
            </div>
            <p className="text-slate-400 mt-2">
              Gestão de equipamentos, revisões e ordens de serviço
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-[#131825] px-4 py-2 rounded-full border border-white/10 shadow-sm h-[40px]">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">KM CAMINHÃO</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={kmAtual} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setKmAtual(val);
                    localStorage.setItem('kmAtual', val);
                    window.dispatchEvent(new Event('kmAtualChanged'));
                  }
                }} 
                placeholder="Ex: 50000"
                className="w-24 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-right font-mono text-sm placeholder:text-white/20"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#131825] px-4 py-2 rounded-full border border-white/10 shadow-sm h-[40px]">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">KM STRADA</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={kmAtualStrada} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setKmAtualStrada(val);
                    localStorage.setItem('kmAtualStrada', val);
                    window.dispatchEvent(new Event('kmAtualChanged'));
                  }
                }} 
                placeholder="Ex: 30000"
                className="w-24 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-right font-mono text-sm placeholder:text-white/20"
              />
            </div>
            <Button onClick={handleOpenNew} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 shadow-md transition-all hover:shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Nova Manutenção
            </Button>
          </div>
        </div>

        {/* Dashboard Cards Simples */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#131825] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Ativas no Quadro</span>
            <span className="text-2xl font-bold text-white">{manutencoesAtivas.length}</span>
          </div>
          <div className="bg-[#131825] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Em Andamento</span>
            <span className="text-2xl font-bold text-blue-400">{manutencoesAtivas.filter(m => getDisplayStatus(m) === 'em_andamento').length}</span>
          </div>
          <div className="bg-[#131825] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Pendentes</span>
            <span className="text-2xl font-bold text-amber-400">{manutencoesAtivas.filter(m => getDisplayStatus(m) === 'pendente').length}</span>
          </div>
          <div className="bg-[#131825] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Atrasadas</span>
            <span className="text-2xl font-bold text-red-400">{manutencoesAtivas.filter(m => getDisplayStatus(m) === 'atrasada').length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Buscar por serviço..." 
              className="pl-12 h-12 bg-[#131825] border-white/10 text-white rounded-full focus-visible:ring-1 focus-visible:ring-blue-500 w-full shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[220px] h-12 bg-[#131825] border-white/10 text-white rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#131825] border-white/10 text-white">
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gráficos Mensais */}
        {(chartDataCaminhao.length > 0 || chartDataStrada.length > 0 || chartDataEquipamento.length > 0) && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {chartDataCaminhao.length > 0 && (
              <div className="bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-400" /> Custos Mensais - Caminhão
                </h2>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataCaminhao} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1' }}
                        cursor={{fill: '#ffffff05'}}
                        formatter={(value: any, name: string, props: any) => {
                          if (name === 'Preventiva' || name === 'Corretiva') {
                            const percent = name === 'Preventiva' ? props.payload.prevPercent : props.payload.corrPercent;
                            return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percent}%)`, name];
                          }
                          return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, name];
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Preventiva" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Corretiva" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {chartDataStrada.length > 0 && (
              <div className="bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" /> Custos Mensais - Strada
                </h2>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataStrada} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1' }}
                        cursor={{fill: '#ffffff05'}}
                        formatter={(value: any, name: string, props: any) => {
                          if (name === 'Preventiva' || name === 'Corretiva') {
                            const percent = name === 'Preventiva' ? props.payload.prevPercent : props.payload.corrPercent;
                            return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percent}%)`, name];
                          }
                          return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, name];
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Preventiva" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Corretiva" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartDataEquipamento.length > 0 && (
              <div className="bg-[#131825] p-6 rounded-2xl border border-white/5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-purple-400" /> Custos Mensais - Equipamentos
                </h2>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataEquipamento} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1' }}
                        cursor={{fill: '#ffffff05'}}
                        formatter={(value: any, name: string, props: any) => {
                          if (name === 'Preventiva' || name === 'Corretiva') {
                            const percent = name === 'Preventiva' ? props.payload.prevPercent : props.payload.corrPercent;
                            return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percent}%)`, name];
                          }
                          return [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, name];
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Preventiva" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Corretiva" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quadros Principais */}
        {[
          { id: 'caminhao', title: 'Caminhão', data: filteredCaminhao, icon: <Wrench className="w-5 h-5 text-blue-400" />, isEquip: false },
          { id: 'strada', title: 'Strada', data: filteredStrada, icon: <Wrench className="w-5 h-5 text-amber-400" />, isEquip: false },
          { id: 'equipamento', title: 'Equipamentos', data: filteredEquipamento, icon: <Settings2 className="w-5 h-5 text-purple-400" />, isEquip: true }
        ].map(quadro => (
          <div key={quadro.id} className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2 mb-3 px-1">
              {quadro.icon} {quadro.title}
            </h2>
            <div className="bg-[#131825] border border-white/5 shadow-2xl rounded-2xl overflow-hidden relative">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider min-w-[200px]">{quadro.isEquip ? 'Item' : 'Serviço'}</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider min-w-[150px] max-w-[250px]">Descrição</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">{quadro.isEquip ? 'Periodicidade (Dias)' : 'Periodicidade (KM)'}</th>
                      {!quadro.isEquip && <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">KM Realizado</th>}
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Data da Realização</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">{quadro.isEquip ? 'Data da Próxima' : 'KM da Próxima'}</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Tipo</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Demanda</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap text-right">Status</th>
                      <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap sticky right-0 bg-[#131825] z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.3)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quadro.data.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Nenhuma manutenção encontrada.
                        </td>
                      </tr>
                    ) : (
                      quadro.data.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-4 font-medium text-slate-200">
                            {item.servico}
                          </td>
                          <td className="px-4 py-4 text-slate-400 text-xs whitespace-normal line-clamp-2" title={item.descricao}>
                            {item.descricao || '-'}
                          </td>
                          <td className="px-4 py-4 text-slate-400 font-mono">
                            {item.periodicidade_km || '-'}
                          </td>
                          {!quadro.isEquip && (
                            <td className="px-4 py-4 text-slate-400 font-mono">
                              {item.km_realizado || '-'}
                            </td>
                          )}
                          <td className="px-4 py-4 text-slate-400">
                            {formatarData(item.data_realizacao)}
                          </td>
                          <td className="px-4 py-4 text-slate-400 font-mono">
                            {quadro.isEquip ? formatarData(item.km_proxima) : (item.km_proxima || '-')}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                              item.tipo === 'PREVENTIVA' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                              item.demanda === 'FIXA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {item.demanda}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            {getDisplayStatus(item) === 'concluida' ? (
                              <span className="text-emerald-500 flex items-center gap-1 justify-end font-medium text-xs">
                                <CheckCircle2 className="w-4 h-4" /> Concluído
                              </span>
                            ) : getDisplayStatus(item) === 'atrasada' ? (
                              <span className="text-red-500 flex items-center gap-1 justify-end font-medium text-xs">
                                <AlertTriangle className="w-4 h-4" /> Atrasada
                              </span>
                            ) : getDisplayStatus(item) === 'em_andamento' ? (
                              <span className="text-blue-500 flex items-center gap-1 justify-end font-medium text-xs">
                                <Settings2 className="w-4 h-4 animate-spin-slow" /> Em Andamento
                              </span>
                            ) : (
                              <span className="text-amber-500 flex items-center gap-1 justify-end font-medium text-xs">
                                <Clock className="w-4 h-4" /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 sticky right-0 bg-[#131825] z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.3)]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-8 gap-1 px-3 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300" size="sm">
                                  <span className="sr-only">Ações</span>
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#131825] border-white/10 text-white">
                                {getDisplayStatus(item) !== 'concluida' && (
                                  <DropdownMenuItem onClick={() => handleOpenConcluir(item.id)} className="gap-2 text-emerald-400 cursor-pointer hover:bg-emerald-500/10 focus:bg-emerald-500/10 focus:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" /> Concluir
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleOpenEdit(item)} className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5">
                                  <Edit2 className="w-4 h-4 text-slate-400" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="gap-2 text-red-400 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400">
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
          </div>
        ))}

        {/* Botão de Histórico */}
        <div className="flex justify-center mt-4">
          <Button 
            variant="ghost" 
            onClick={() => setShowHistorico(!showHistorico)} 
            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-6 gap-2"
          >
            {showHistorico ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 transition-transform" />}
            {showHistorico ? 'Ocultar Histórico de Concluídas' : 'Ver Histórico de Concluídas'}
          </Button>
        </div>

        {/* Quadro Histórico de Concluídas */}
        {showHistorico && [
          { id: 'caminhao-concluidas', title: 'Caminhão (Concluídas)', data: manutencoesConcluidas.filter(m => m.veiculo !== 'STRADA' && m.veiculo !== 'EQUIPAMENTO'), isEquip: false },
          { id: 'strada-concluidas', title: 'Strada (Concluídas)', data: manutencoesConcluidas.filter(m => m.veiculo === 'STRADA'), isEquip: false },
          { id: 'equipamento-concluidas', title: 'Equipamentos (Concluídas)', data: manutencoesConcluidas.filter(m => m.veiculo === 'EQUIPAMENTO'), isEquip: true }
        ].map(quadro => (
          <div key={quadro.id} className="bg-[#131825] border border-emerald-500/20 shadow-sm rounded-2xl overflow-hidden mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-emerald-400">{quadro.title}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider min-w-[200px]">{quadro.isEquip ? 'Item' : 'Serviço'}</th>
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider min-w-[150px] max-w-[250px]">Descrição</th>
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Data da Realização</th>
                    {!quadro.isEquip && <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">KM Realizado</th>}
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">Valor (R$)</th>
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider min-w-[300px]">Observação</th>
                    <th className="px-4 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-[#131825] z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.3)]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {quadro.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma manutenção concluída ainda.
                      </td>
                    </tr>
                  ) : (
                    quadro.data.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-200">
                          {item.servico}
                        </td>
                        <td className="px-4 py-4 text-slate-400 text-xs whitespace-normal line-clamp-2" title={item.descricao}>
                          {item.descricao || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                            item.tipo === 'PREVENTIVA' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {formatarData(item.data_realizacao)}
                        </td>
                        {!quadro.isEquip && (
                          <td className="px-4 py-4 text-slate-400 font-mono">
                            {item.km_realizado || '-'}
                          </td>
                        )}
                        <td className="px-4 py-4 text-slate-300 font-medium whitespace-nowrap">
                          {item.valor_gasto != null ? `R$ ${Number(item.valor_gasto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                        </td>
                        <td className="px-4 py-4 text-slate-400 italic text-xs max-w-sm truncate" title={item.observacao}>
                          {item.observacao || 'Sem observações.'}
                        </td>
                        <td className="px-4 py-4 text-right sticky right-0 bg-[#131825] z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.3)]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="h-8 gap-1 px-3 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300" size="sm">
                                <span className="sr-only">Ações</span>
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#131825] border-white/10 text-white">
                              <DropdownMenuItem onClick={() => handleRevertStatus(item.id, 'pendente')} className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5">
                                <Clock className="w-4 h-4 text-amber-500" /> Tornar Pendente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRevertStatus(item.id, 'em_andamento')} className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5">
                                <Settings2 className="w-4 h-4 text-blue-500" /> Em Andamento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="gap-2 text-red-400 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400">
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
        ))}

        {/* Dialog Nova/Editar Manutenção */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#0b0f19] text-white border border-white/10 max-w-2xl p-0 overflow-hidden">
            <div className="bg-[#131825] border-b border-white/10 p-5 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                {isEditing ? 'Editar Manutenção' : 'Nova Manutenção'}
              </DialogTitle>
              <DialogDescription className="sr-only">Formulário de Manutenção</DialogDescription>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-6">
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Manutenção</Label>
                <select 
                  value={formData.veiculo}
                  onChange={(e) => setFormData({...formData, veiculo: e.target.value})}
                  className="w-full h-11 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 px-3 appearance-none"
                >
                  <option value="CAMINHAO">Caminhão</option>
                  <option value="STRADA">Strada</option>
                  <option value="EQUIPAMENTO">Equipamentos</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300 flex items-center gap-2">{formData.veiculo === 'EQUIPAMENTO' ? 'Item' : 'Serviço'} <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.servico}
                  onChange={(e) => setFormData({...formData, servico: e.target.value})}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/20" 
                  placeholder={formData.veiculo === 'EQUIPAMENTO' ? 'Ex: Correia transportadora' : 'Ex: Troca de Óleo'} 
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Descrição (Opcional)</Label>
                <textarea 
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full h-20 p-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-sm placeholder:text-white/20"
                  placeholder="Detalhes sobre a manutenção a ser feita..."
                />
              </div>
              {formData.demanda === 'FIXA' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">{formData.veiculo === 'EQUIPAMENTO' ? 'Periodicidade (Dias)' : 'Periodicidade (KM)'}</Label>
                  {formData.veiculo === 'EQUIPAMENTO' ? (
                    <Input 
                      value={formData.periodicidade_km}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nextDate = computeNextDate(formData.data_realizacao, val);
                        setFormData({
                          ...formData, 
                          periodicidade_km: val,
                          ...(nextDate ? { km_proxima: nextDate } : {})
                        });
                      }}
                      className="bg-black/20 border-white/10 text-white" 
                      placeholder="Ex: 30" 
                    />
                  ) : (
                    <Input 
                      value={formData.periodicidade_km}
                      onChange={(e) => {
                        const val = e.target.value;
                        const p = parseInt(val.replace(/\D/g, '')) || 0;
                        const r = parseInt(formData.km_realizado.replace(/\D/g, '')) || 0;
                        setFormData({
                          ...formData, 
                          periodicidade_km: val,
                          km_proxima: (p > 0 || r > 0) ? (p + r).toLocaleString('pt-BR') : ''
                        });
                      }}
                      className="bg-black/20 border-white/10 text-white" 
                      placeholder="Ex: 10.000" 
                    />
                  )}
                </div>
              )}
              {formData.veiculo !== 'EQUIPAMENTO' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">KM Realizado</Label>
                  <Input 
                    value={formData.km_realizado}
                    onChange={(e) => {
                      const val = e.target.value;
                      const p = parseInt(formData.periodicidade_km.replace(/\D/g, '')) || 0;
                      const r = parseInt(val.replace(/\D/g, '')) || 0;
                      setFormData({
                        ...formData, 
                        km_realizado: val,
                        km_proxima: (p > 0 || r > 0) ? (p + r).toLocaleString('pt-BR') : ''
                      });
                    }}
                    className="bg-black/20 border-white/10 text-white" 
                    placeholder="Ex: 50.150" 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-300">Data da Realização</Label>
                <Input 
                  type="date"
                  value={formData.data_realizacao}
                  onChange={(e) => {
                    const val = e.target.value;
                    let nextDate = formData.km_proxima;
                    if (formData.veiculo === 'EQUIPAMENTO') {
                       const computed = computeNextDate(val, formData.periodicidade_km);
                       if (computed) nextDate = computed;
                    }
                    setFormData({...formData, data_realizacao: val, km_proxima: nextDate});
                  }}
                  className="bg-black/20 border-white/10 text-white" 
                />
              </div>
              {formData.demanda === 'FIXA' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">{formData.veiculo === 'EQUIPAMENTO' ? 'Data da Próxima' : 'KM Próxima'}</Label>
                  <Input 
                    type={formData.veiculo === 'EQUIPAMENTO' ? 'date' : 'text'}
                    value={formData.km_proxima}
                    onChange={(e) => setFormData({...formData, km_proxima: e.target.value})}
                    className="bg-black/20 border-white/10 text-white" 
                    placeholder={formData.veiculo === 'EQUIPAMENTO' ? '' : 'Ex: 60.150'} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(val) => setFormData({...formData, tipo: val})}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131825] border-white/10 text-white">
                    <SelectItem value="PREVENTIVA">PREVENTIVA</SelectItem>
                    <SelectItem value="CORRETIVA">CORRETIVA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Demanda</Label>
                <Select value={formData.demanda} onValueChange={(val) => {
                  if (val === 'SAZONAL') {
                    setFormData({...formData, demanda: val, periodicidade_km: '', km_proxima: ''});
                  } else {
                    setFormData({...formData, demanda: val});
                  }
                }}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131825] border-white/10 text-white">
                    <SelectItem value="FIXA">FIXA</SelectItem>
                    <SelectItem value="SAZONAL">SAZONAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-slate-300">Status</Label>
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131825] border-white/10 text-white">
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white/50 flex items-center">
                    Pendente (Automático)
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Concluir Pendência */}
        <Dialog open={isConcluirDialogOpen} onOpenChange={setIsConcluirDialogOpen}>
          <DialogContent className="bg-white text-slate-800 border-none max-w-lg p-0 overflow-hidden">
            <div className="bg-[#ecfdf5] p-6 pb-5 border-b border-emerald-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#16a34a] flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" /> Concluir Pendência
                </DialogTitle>
              </DialogHeader>
              <p className="text-slate-500 mt-2 text-[15px] leading-relaxed">
                Deseja adicionar alguma nota ou observação para ficar salva no histórico dessa conclusão?
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 tracking-wider">DATA DA CONCLUSÃO *</Label>
                    <Input 
                      type="date"
                      value={dataConclusao}
                      onChange={(e) => setDataConclusao(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl text-slate-700 h-12 focus:ring-[#22c55e]/20 focus:border-[#22c55e]" 
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 tracking-wider">VALOR GASTO (R$) *</Label>
                    <Input 
                      value={valorGasto}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        v = (Number(v) / 100).toFixed(2).replace('.', ',');
                        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
                        setValorGasto(v);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl text-slate-700 h-12 text-lg focus:ring-[#22c55e]/20 focus:border-[#22c55e]" 
                      placeholder="0,00" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-500 tracking-wider">OBSERVAÇÃO (OPCIONAL)</Label>
                  <textarea 
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e] resize-none text-[15px]" 
                    placeholder="Ex: Tarefa finalizada e enviada via email..." 
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 sm:justify-between border-t border-slate-100 mt-2">
              <Button variant="outline" onClick={() => setIsConcluirDialogOpen(false)} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-6 py-5 h-12 text-[15px] font-medium">
                Cancelar
              </Button>
              <Button onClick={handleConfirmarConclusao} disabled={isSaving} className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full px-6 py-5 h-12 text-[15px] font-semibold shadow-sm transition-colors">
                {isSaving ? 'Salvando...' : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Confirmar Conclusão
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
