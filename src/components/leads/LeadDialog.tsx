import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead, LeadStatus, ProjectAttachment } from '@/types';
import { Paperclip, X, File, Image as ImageIcon, FileText } from "lucide-react";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeads } from '@/contexts/LeadContext';
import { toast } from 'sonner';

const leadSchema = z.object({
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  cnpj: z.string(),
  contato: z.string(),
  telefone: z.string(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  cidade: z.string(),
  uf: z.string(),
  origem: z.string(),
  segmento: z.string(),
  interesse: z.string(),
  status: z.string(),
  responsavel: z.string(),
  observacoes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadToEdit?: Lead | null;
}

export function LeadDialog({ open, onOpenChange, leadToEdit }: LeadDialogProps) {
  const { addLead, updateLead } = useLeads();
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: 'novo',
    },
  });

  // Effect to populate form when editing
  React.useEffect(() => {
    if (open) {
      if (leadToEdit) {
        setValue('empresa', leadToEdit.empresa || '');
        setValue('cnpj', leadToEdit.cnpj || '');
        setValue('contato', leadToEdit.contato || '');
        setValue('telefone', leadToEdit.telefone || '');
        setValue('email', leadToEdit.email || '');
        setValue('cidade', leadToEdit.cidade || '');
        setValue('uf', leadToEdit.uf || '');
        setValue('origem', leadToEdit.origem || '');
        setValue('segmento', leadToEdit.segmento || '');
        setValue('interesse', leadToEdit.interesse || '');
        setValue('status', leadToEdit.status || 'novo');
        setValue('responsavel', leadToEdit.responsavel || '');
        setValue('observacoes', leadToEdit.observacoes || '');
        setAttachments(leadToEdit.attachments || []);
      } else {
        setAttachments([]);
        reset({
          empresa: '',
          cnpj: '',
          contato: '',
          telefone: '',
          email: '',
          cidade: '',
          uf: '',
          origem: '',
          segmento: '',
          interesse: '',
          status: 'novo',
          responsavel: '',
          observacoes: '',
        });
      }
    }
  }, [open, leadToEdit, setValue, reset]);

  const onSubmit = (data: LeadFormData) => {
    const payload = { ...data, attachments };
    
    if (leadToEdit) {
      updateLead(leadToEdit.id, payload as Partial<Lead>);
      toast.success('Lead atualizado com sucesso!');
    } else {
      addLead(payload as unknown as Omit<Lead, 'id' | 'createdAt'>);
      toast.success('Lead cadastrado com sucesso!');
    }
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        setAttachments(prev => [...prev, {
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

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const AttachmentIcon = ({ type }: { type: ProjectAttachment['type'] }) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (type === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{leadToEdit ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input id="empresa" {...register('empresa')} className="mt-1" />
              {errors.empresa && <p className="text-xs text-destructive mt-1">{errors.empresa.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" {...register('cnpj')} className="mt-1" />
              {errors.cnpj && <p className="text-xs text-destructive mt-1">{errors.cnpj.message}</p>}
            </div>

            <div>
              <Label htmlFor="responsavel">Responsável</Label>
              <Input id="responsavel" {...register('responsavel')} className="mt-1" />
              {errors.responsavel && <p className="text-xs text-destructive mt-1">{errors.responsavel.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" {...register('contato')} className="mt-1" />
              {errors.contato && <p className="text-xs text-destructive mt-1">{errors.contato.message}</p>}
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register('telefone')} className="mt-1" />
              {errors.telefone && <p className="text-xs text-destructive mt-1">{errors.telefone.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} className="mt-1" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" {...register('cidade')} className="mt-1" />
                {errors.cidade && <p className="text-xs text-destructive mt-1">{errors.cidade.message}</p>}
              </div>
              <div className="w-20">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" {...register('uf')} className="mt-1" maxLength={2} />
                {errors.uf && <p className="text-xs text-destructive mt-1">{errors.uf.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="origem">Origem</Label>
              <Input id="origem" placeholder="Ex: Feira, Site, Indicação" {...register('origem')} className="mt-1" />
              {errors.origem && <p className="text-xs text-destructive mt-1">{errors.origem.message}</p>}
            </div>

            <div>
              <Label htmlFor="segmento">Segmento</Label>
              <Input id="segmento" placeholder="Ex: Offset, Flexo" {...register('segmento')} className="mt-1" />
              {errors.segmento && <p className="text-xs text-destructive mt-1">{errors.segmento.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="interesse">Interesse</Label>
              <Input id="interesse" placeholder="Produtos de interesse" {...register('interesse')} className="mt-1" />
              {errors.interesse && <p className="text-xs text-destructive mt-1">{errors.interesse.message}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" {...register('observacoes')} className="mt-1" />
            </div>
            
            <div className="md:col-span-2 space-y-3 pt-2">
              <Label>Anexos</Label>
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor="lead-file-upload" 
                  className="flex cursor-pointer items-center justify-center rounded-md border border-white/20 bg-[#131825] px-4 py-2 text-sm font-medium text-white/90 shadow-sm hover:bg-white/5 transition-colors w-fit"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Anexar Arquivo
                </Label>
                <Input 
                  id="lead-file-upload" 
                  type="file" 
                  className="hidden" 
                  multiple 
                  onChange={handleFileChange} 
                  accept="image/*,video/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
                <span className="text-xs text-slate-400">Imagens, vídeos, PDFs, Excel</span>
              </div>

              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2 border border-white/5 rounded-md p-2 bg-[#131825]">
                  {attachments.map((file) => (
                    <li key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm bg-[#0b0f19] p-2 rounded border gap-2">
                      <div className="flex items-center overflow-hidden">
                        <AttachmentIcon type={file.type} />
                        <span className="ml-2 truncate max-w-[200px]" title={file.name}>{file.name}</span>
                      </div>
                      {file.type === 'image' && file.url.startsWith('data:image') && (
                          <div className="w-10 h-10 border rounded shrink-0 overflow-hidden bg-white/5 hidden sm:block">
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                      )}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => removeAttachment(file.id)}
                        className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 sm:ml-auto w-fit"
                      >
                        <X className="w-3 h-3 mr-1" /> Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {leadToEdit ? 'Salvar Alterações' : 'Cadastrar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

