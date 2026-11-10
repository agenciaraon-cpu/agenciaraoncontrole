import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RAON PAINEL - Erro crítico capturado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Erro ao limpar cache local:', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#102B59] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-[#172033] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/logo.png"
                alt="Agência Raon"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  // Fallback if logo fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Inicialização do Sistema</h2>
            <p className="text-gray-300 text-sm mb-6">
              Ocorreu uma instabilidade momentânea ao carregar a interface da Agência Raon.
            </p>

            {this.state.error && (
              <div className="text-left bg-black/30 rounded-lg p-3 text-xs text-red-300 font-mono mb-6 max-h-24 overflow-y-auto border border-red-500/20">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl font-semibold bg-[#0878D9] hover:bg-[#0878D9]/90 text-white transition-all shadow-md active:scale-98 cursor-pointer"
              >
                Recarregar Sistema
              </button>
              <button
                onClick={this.handleHardReset}
                className="w-full py-2.5 px-4 rounded-xl font-medium bg-white/10 hover:bg-white/15 text-gray-200 transition-all text-xs cursor-pointer"
              >
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
