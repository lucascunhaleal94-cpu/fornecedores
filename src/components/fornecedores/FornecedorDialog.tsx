import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Fornecedor } from '@/types';
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFornecedores } from '@/contexts/FornecedorContext';
import { toast } from 'sonner';

const fornecedorSchema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().min(1, 'Nome Fantasia é obrigatório'),
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  cidade: z.string(),
  estado: z.string(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  status: z.enum(['ativo', 'inativo', 'bloqueado']),
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface FornecedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedorToEdit?: Fornecedor | null;
}

export function FornecedorDialog({ open, onOpenChange, fornecedorToEdit }: FornecedorDialogProps) {
  const { addFornecedor, updateFornecedor } = useFornecedores();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      status: 'ativo',
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      cidade: '',
      estado: '',
      telefone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (fornecedorToEdit) {
        setValue('razaoSocial', fornecedorToEdit.razaoSocial);
        setValue('nomeFantasia', fornecedorToEdit.nomeFantasia);
        setValue('cnpj', fornecedorToEdit.cnpj);
        setValue('cidade', fornecedorToEdit.cidade);
        setValue('estado', fornecedorToEdit.estado);
        setValue('telefone', fornecedorToEdit.telefone || '');
        setValue('email', fornecedorToEdit.email || '');
        setValue('status', fornecedorToEdit.status || 'ativo');
      } else {
        reset();
      }
    }
  }, [open, fornecedorToEdit, setValue, reset]);

  const onSubmit = async (data: FornecedorFormData) => {
    try {
      if (fornecedorToEdit) {
        await updateFornecedor(fornecedorToEdit.id, data);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await addFornecedor(data);
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error saving fornecedor:', error);
      toast.error('Ocorreu um erro ao salvar os dados.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#131825] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {fornecedorToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Razão Social *</Label>
              <Input
                {...register('razaoSocial')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Ex: Indústria Química S/A"
              />
              {errors.razaoSocial && (
                <p className="text-sm text-red-400">{errors.razaoSocial.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nome Fantasia *</Label>
              <Input
                {...register('nomeFantasia')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Ex: Química Brasil"
              />
              {errors.nomeFantasia && (
                <p className="text-sm text-red-400">{errors.nomeFantasia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">CNPJ *</Label>
              <Input
                {...register('cnpj')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="00.000.000/0000-00"
              />
              {errors.cnpj && (
                <p className="text-sm text-red-400">{errors.cnpj.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Telefone</Label>
              <Input
                {...register('telefone')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">E-mail</Label>
              <Input
                {...register('email')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="contato@empresa.com"
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select
                defaultValue={fornecedorToEdit?.status || 'ativo'}
                onValueChange={(value: any) => setValue('status', value)}
              >
                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent className="bg-[#131825] border-white/10 text-white">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Cidade</Label>
              <Input
                {...register('cidade')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="São Paulo"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Estado (UF)</Label>
              <Input
                {...register('estado')}
                className="bg-black/20 border-white/10 text-white"
                placeholder="SP"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Fornecedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
