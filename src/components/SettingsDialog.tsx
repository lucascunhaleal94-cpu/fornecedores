import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Lock, Mail, UserPlus2, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Cliente separado para não deslogar o admin ao criar novo usuário
const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://xjafuykankwjaucivrzj.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYWZ1eWthbmt3amF1Y2l2cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDAxODgsImV4cCI6MjA5OTQxNjE4OH0.AVjsr8FyfbYfHYbryl4Qg6M-gNWXRo5KOo5C4Sj7ssk',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, isAdmin } = useAuth();
  
  // Settings States
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  
  // Create User States
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('convidado');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Erro ao atualizar senha: ' + error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      setNewPassword('');
    }
  };

  const handleResetPassword = async () => {
    const emailToReset = resetEmail || user?.email;
    if (!emailToReset) return toast.error('Informe um e-mail.');
    
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset);
    if (error) {
      toast.error('Erro ao enviar e-mail: ' + error.message);
    } else {
      toast.success(`E-mail de redefinição enviado para ${emailToReset}!`);
      setResetEmail('');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      return toast.error('Preencha o e-mail e a senha.');
    }
    if (newUserPassword.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres.');
    }
    
    setIsCreatingUser(true);
    try {
      const { data, error } = await adminSupabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            role: newUserRole
          }
        }
      });
      
      if (error) throw error;
      toast.success('Usuário criado com sucesso!');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('convidado');
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#131825] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Configurações</DialogTitle>
          <DialogDescription className="text-slate-400">
            Gerencie sua conta e configurações do sistema.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="conta" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/5">
            <TabsTrigger value="conta" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Minha Conta</TabsTrigger>
            {isAdmin && <TabsTrigger value="usuarios" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Usuários</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="conta" className="space-y-6 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2 text-slate-300">
                <Lock className="w-4 h-4" /> Alterar Senha
              </h4>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder="Nova senha (mín. 6 caracteres)" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                />
                <Button onClick={handleUpdatePassword} size="icon" className="bg-pink-600 hover:bg-pink-700 text-white border-0"><Check className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <h4 className="text-sm font-medium flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4" /> Redefinir por E-mail
              </h4>
              <p className="text-xs text-slate-400">
                Você receberá um link no seu e-mail cadastrado ({user?.email}) para redefinir sua senha, caso tenha esquecido ou queira alterá-ela externamente.
              </p>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input 
                  type="email" 
                  placeholder="E-mail (opcional, padrão: atual)" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="bg-black/20 border-white/10 text-white"
                />
                <Button onClick={handleResetPassword} variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/5 hover:text-white">Enviar Link</Button>
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="usuarios" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-300">
                  <UserPlus2 className="w-4 h-4" /> Cadastrar Novo Usuário
                </h4>
                <div className="space-y-2">
                  <Label className="text-slate-400">E-mail</Label>
                  <Input 
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Senha</Label>
                  <Input 
                    type="password" 
                    placeholder="Senha inicial"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Tipo de Acesso</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131825] border-white/10 text-white">
                      <SelectItem value="convidado" className="focus:bg-white/10 focus:text-white cursor-pointer">Convidado (Restrito)</SelectItem>
                      <SelectItem value="admin" className="focus:bg-white/10 focus:text-white cursor-pointer">Administrador (Total)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white border-0" 
                  onClick={handleCreateUser}
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? 'Cadastrando...' : 'Criar Usuário'}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
