import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Preencha e-mail e senha.');

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Credenciais inválidas.');
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Preencha o e-mail para redefinir a senha.');
      return;
    }
    
    setResetLoading(true);
    try {
      // Usando o supabase para enviar o email de redefinição de senha
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("Erro no reset:", error);
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.success('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      toast.error('Erro ao conectar.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none hidden md:block"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none hidden md:block"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-16 w-32 flex items-center justify-center mb-2">
            <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 rounded-full"></div>
            <img src="/logo-white.png" alt="Acquarela Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <span className="text-xs uppercase font-bold text-slate-400 tracking-[0.2em]">Suprimentos</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">E-mail</Label>
            <Input 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Senha</Label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Enviando...' : 'Esqueci a senha?'}
              </button>
            </div>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/20 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white border-0 mt-4"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
