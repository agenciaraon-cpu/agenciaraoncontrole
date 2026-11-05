import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  Search,
  MessageCircle,
  ShieldCheck,
  CheckCheck,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationItem, ActiveTab, UserRole } from '../../types';
import { markNotificationRead, markAllNotificationsRead } from '../../services/db';

interface HeaderProps {
  notifications: NotificationItem[];
  onRefreshNotifications: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onToggleSidebarMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  onRefreshNotifications,
  onNavigate,
  onToggleSidebarMobile,
}) => {
  const { user, profile, activeRole, isAdmin, logout, setSimulatedRole, isSimulatingRole, resetSimulatedRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    onRefreshNotifications();
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    await markNotificationRead(notif.id);
    onRefreshNotifications();
    setIsNotifOpen(false);
    if (notif.linkUrl) {
      onNavigate(notif.linkUrl as ActiveTab);
    }
  };

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    ADMINISTRADOR: { bg: 'bg-[#FF7817]/10 dark:bg-[#FF7817]/20', text: 'text-[#FF7817]', border: 'border-[#FF7817]/30' },
    FINANCEIRO: { bg: 'bg-[#0878D9]/10 dark:bg-[#0878D9]/20', text: 'text-[#0878D9]', border: 'border-[#0878D9]/30' },
    COLABORADOR: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#10192A]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left: Mobile trigger & Agency Quick Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebarMobile}
            className="p-2 lg:hidden rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Agência Raon Operacional</span>
            <span className="text-slate-400">|</span>
            <a
              href="https://instagram.com/somosraon"
              target="_blank"
              rel="noreferrer"
              className="text-[#0878D9] font-semibold hover:underline"
            >
              @somosraon
            </a>
          </div>
        </div>

        {/* Center / Right: Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simulation alert if active */}
          {isSimulatingRole && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-in fade-in">
              <span>Simulando: {activeRole}</span>
              <button
                onClick={resetSimulatedRole}
                className="underline hover:text-amber-700 ml-1 cursor-pointer"
                title="Voltar ao perfil real"
              >
                Voltar
              </button>
            </div>
          )}

          {/* Quick WhatsApp Link to Agency Phone */}
          <a
            href="https://api.whatsapp.com/send?phone=5575988644742"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold rounded-xl border border-[#25D366]/30 transition-all hover:scale-[1.02]"
            title="WhatsApp Oficial da Agência Raon: (75) 98864-4742"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>(75) 98864-4742</span>
          </a>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#102B59]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notificações e Alertas"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF7817] text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 py-3 bg-[#102B59] text-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#FF7817]" />
                    <span className="font-bold text-sm">Central de Alertas Raon</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Nenhum alerta pendente no momento.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          !notif.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {notif.title}
                          </h4>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              notif.priority === 'alta'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {notif.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {notif.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onNavigate('birthdays');
                    }}
                    className="text-xs font-semibold text-[#0878D9] hover:underline"
                  >
                    Ver Todos os Aniversariantes & Cobranças
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Selector */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#102B59] to-[#0878D9] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {(profile?.name || user?.displayName || 'R').charAt(0).toUpperCase()}
              </div>

              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {profile?.name || user?.displayName || 'Usuário Raon'}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase mt-0.5 inline-block px-1.5 py-0.2 rounded border ${
                    roleColors[activeRole]?.bg
                  } ${roleColors[activeRole]?.text} ${roleColors[activeRole]?.border}`}
                >
                  {activeRole}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {profile?.name || user?.displayName || 'Usuário Raon'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {profile?.email || user?.email || 'somosraon@gmail.com'}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        roleColors[activeRole]?.bg
                      } ${roleColors[activeRole]?.text} ${roleColors[activeRole]?.border}`}
                    >
                      Acesso: {activeRole}
                    </span>
                  </div>
                </div>

                {/* Role Switcher for verification */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#0878D9]" />
                    Simular Nível de Acesso:
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {(['ADMINISTRADOR', 'FINANCEIRO', 'COLABORADOR'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSimulatedRole(r);
                          setIsProfileOpen(false);
                        }}
                        className={`text-left text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                          activeRole === r
                            ? 'bg-[#0878D9] text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{r}</span>
                        {activeRole === r && <span className="text-[10px]">Ativo</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logout */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Encerrar Sessão</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
