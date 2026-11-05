import React from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  FileSignature,
  DollarSign,
  Gift,
  CheckSquare,
  FolderArchive,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { ActiveTab, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  birthdaysCount?: number;
  pendingReceivablesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  birthdaysCount = 0,
  pendingReceivablesCount = 0,
}) => {
  const { activeRole, isAdmin, isFinancial } = useAuth();

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    allowedRoles?: UserRole[];
    description?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Indicadores e Visão Geral',
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      description: 'Carteira & Ficha Completa',
    },
    {
      id: 'plans',
      label: 'Planos & Serviços',
      icon: Layers,
      description: 'Bronze, Prata, Gold & Catálogo',
    },
    {
      id: 'contracts',
      label: 'Contratos',
      icon: FileSignature,
      description: 'Gestão Contratual & Escopos',
      allowedRoles: ['ADMINISTRADOR', 'FINANCEIRO'],
    },
    {
      id: 'financial',
      label: 'Financeiro',
      icon: DollarSign,
      badge: pendingReceivablesCount > 0 ? pendingReceivablesCount : undefined,
      badgeColor: 'bg-[#FF7817]',
      allowedRoles: ['ADMINISTRADOR', 'FINANCEIRO'],
      description: 'Recebíveis, Despesas & Fluxo',
    },
    {
      id: 'birthdays',
      label: 'Aniversariantes',
      icon: Gift,
      badge: birthdaysCount > 0 ? birthdaysCount : undefined,
      badgeColor: 'bg-emerald-500',
      description: 'Felicitações & WhatsApp',
    },
    {
      id: 'tasks',
      label: 'Tarefas & Entregas',
      icon: CheckSquare,
      description: 'Kanban, Lista & Calendário',
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: FolderArchive,
      description: 'Contratos, Briefings & Artes',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: BarChart3,
      allowedRoles: ['ADMINISTRADOR', 'FINANCEIRO'],
      description: 'Exportação PDF, Excel & CSV',
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      allowedRoles: ['ADMINISTRADOR'],
      description: 'Agência, Usuários & Auditoria',
    },
  ];

  const handleItemClick = (tabId: ActiveTab) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#102B59] text-white border-r border-[#102B59]/60 shadow-xl transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-68'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <Logo size="md" collapsed={collapsed} />

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <div className={`px-2 mb-2 ${collapsed ? 'hidden' : 'block'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0878D9]">
              Módulos do Sistema
            </span>
          </div>

          {navItems.map((item) => {
            const hasAccess = !item.allowedRoles || item.allowedRoles.includes(activeRole);
            if (!hasAccess) return null;

            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0878D9] to-[#0878D9]/80 text-white shadow-md shadow-[#0878D9]/25 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-300 group-hover:text-[#FF7817]'
                  }`}
                />

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white ${
                          item.badgeColor || 'bg-[#FF7817]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Badge indicator */}
                {collapsed && item.badge !== undefined && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#102B59] ${
                      item.badgeColor || 'bg-[#FF7817]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Agency Footer Card in Sidebar */}
        <div className="p-3 border-t border-white/10 shrink-0">
          {!collapsed ? (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#FF7817]" />
                <span className="text-xs font-bold text-white">Agência Raon</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                Sistema exclusivo de gestão integrada.
              </p>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span>Versão 2.4 PRO</span>
                <span className="text-[#0878D9] font-bold">Online</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Sistema Conectado" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
