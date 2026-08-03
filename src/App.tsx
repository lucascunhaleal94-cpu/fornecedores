import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import { ProjectProvider } from './contexts/ProjectContext';
import { CollaboratorProvider } from './contexts/CollaboratorContext';
import { FornecedorProvider } from './contexts/FornecedorContext';
import { LeadProvider } from './contexts/LeadContext';
import { NotaFiscalProvider } from './contexts/NotaFiscalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TeamPage from './pages/TeamPage';
import PotenciaisFornecedores from './pages/PotenciaisFornecedores';
import FornecedoresPage from './pages/FornecedoresPage';
import FornecedorDetailPage from './pages/FornecedorDetailPage';
import InsumosPage from './pages/InsumosPage';
import InteligenciaPage from './pages/InteligenciaPage';
import ManutencoesPage from './pages/ManutencoesPage';
import ColoristaVirtualPage from './pages/ColoristaVirtualPage';
import Login from './pages/Login';
import { Toaster as Sonner } from './components/ui/sonner';
import { Toaster } from './components/ui/toaster';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ProjectProvider>
      <FornecedorProvider>
        <CollaboratorProvider>
          <LeadProvider>
            <NotaFiscalProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="fornecedores" element={<FornecedoresPage />} />
                    <Route path="fornecedores/:id" element={<FornecedorDetailPage />} />
                    <Route path="projetos" element={<Projects />} />
                    <Route path="equipe" element={<TeamPage />} />
                    <Route path="potenciais" element={<PotenciaisFornecedores />} />
                    <Route path="insumos" element={<InsumosPage />} />
                    <Route path="inteligencia" element={<InteligenciaPage />} />
                    <Route path="manutencoes" element={<ManutencoesPage />} />
                    <Route path="colorista" element={<ColoristaVirtualPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </NotaFiscalProvider>
          </LeadProvider>
        </CollaboratorProvider>
      </FornecedorProvider>
    </ProjectProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
