import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  MessageCircle,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserPlus,
  Moon,
  Sun,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { AgencySettings, UserProfile, UserRole, AuditLog } from '../types';
import { getAgencySettings, updateAgencySettings, getAuditLogs } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsView: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [settings, setSettings] = useState<AgencySettings>({
    name: 'Agência Raon',
    tradeName: 'Raon Comunicação & Estratégia',
    instagram: '@somosraon',
    whatsapp: '(75) 98864-4742',
    adminEmail: 'somosraon@gmail.com',
    address: 'Feira de Santana, Bahia, Brasil',
    phone: '(75) 98864-4742',
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'dados' | 'usuarios' | 'auditoria'>('dados');
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Users simulated list in the agency
  const [usersList, setUsersList] = useState<UserProfile[]>([
    {
      id: 'usr_admin',
      name: 'Diretoria Executiva Raon',
      email: 'somosraon@gmail.com',
      role: 'ADMINISTRADOR',
      active: true,
    },
    {
      id: 'usr_admin2',
      name: 'Gestão de Contas',
      email: 'agenciaraon@gmail.com',
      role: 'ADMINISTRADOR',
      active: true,
    },
    {
      id: 'usr_finance',
      name: 'Coordenação Financeira',
      email: 'financeiro@agenciaraon.com',
      role: 'FINANCEIRO',
      active: true,
    },
    {
      id: 'usr_collab',
      name: 'Design & Audiovisual',
      email: 'criativo@agenciaraon.com',
      role: 'COLABORADOR',
      active: true,
    },
  ]);

  const [newCollab, setNewCollab] = useState({
    name: '',
    email: '',
    role: 'COLABORADOR' as UserRole,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getAgencySettings();
    if (s) setSettings(s);
    const logs = await getAuditLogs();
    setAuditLogs(logs);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAgencySettings(settings, user?.email || 'somosraon@gmail.com');
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3000);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar configurações.');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollab.name || !newCollab.email) return;

    setUsersList((prev) => [
      ...prev,
      {
        id: `usr_${Date.now()}`,
        name: newCollab.name,
        email: newCollab.email,
        role: newCollab.role,
        active: true,
      },
    ]);
    setNewCollab({ name: '', email: '', role: 'COLABORADOR' });
    alert('Colaborador adicionado à equipe com acesso autorizado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Configurações Institucionais & Acesso
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dados institucionais da Agência Raon, permissões RBAC e registro de auditoria do sistema.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('dados')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'dados'
                ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Dados da Agência
          </button>
          <button
            onClick={() => setActiveSubTab('usuarios')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'usuarios'
                ? 'bg-white dark:bg-[#10192A] text-[#FF7817] shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Usuários & Papéis ({usersList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('auditoria')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'auditoria'
                ? 'bg-white dark:bg-[#10192A] text-[#102B59] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Auditoria ({auditLogs.length})
          </button>
        </div>
      </div>

      {isSavedAlert && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configurações da Agência Raon salvas com sucesso!</span>
        </div>
      )}

      {/* ==================== SUB-TAB 1: DADOS INSTITUCIONAIS ==================== */}
      {activeSubTab === 'dados' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0878D9]" />
              Identidade Corporativa da Agência Raon
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Nome Oficial</label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Nome Fantasia / Assinatura</label>
                <input
                  type="text"
                  value={settings.tradeName}
                  onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">WhatsApp Oficial</label>
                <input
                  type="text"
                  required
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-[#25D366]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Instagram Oficial</label>
                <input
                  type="text"
                  required
                  value={settings.instagram}
                  onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-[#0878D9]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">E-mail do Administrador</label>
                <input
                  type="email"
                  required
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-[#FF7817]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Endereço da Sede</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Custom Logo Upload URL */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Logomarca Oficial da Agência Raon (URL da imagem anexada)
              </label>
              <input
                type="text"
                value={settings.logoUrl || ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="Insira a URL ou caminho da logo oficial (preserva proporções e formato original)"
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * Conforme regra obrigatória, a imagem oficial é renderizada sem distorção e sem modificação de fontes ou proporções.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================== SUB-TAB 2: USUÁRIOS & PERMISSÕES ==================== */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Add collaborator form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#FF7817]" />
              Cadastrar Novo Colaborador (Exclusivo Administrador)
            </h3>

            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-500">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newCollab.name}
                  onChange={(e) => setNewCollab({ ...newCollab, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500">E-mail Autorizado</label>
                <input
                  type="email"
                  required
                  value={newCollab.email}
                  onChange={(e) => setNewCollab({ ...newCollab, email: e.target.value })}
                  placeholder="carlos@agenciaraon.com"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500">Perfil / Papel</label>
                <select
                  value={newCollab.role}
                  onChange={(e) => setNewCollab({ ...newCollab, role: e.target.value as UserRole })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-[#0878D9]"
                >
                  <option value="COLABORADOR">COLABORADOR (Tarefas & Operação)</option>
                  <option value="FINANCEIRO">FINANCEIRO (Clientes & Contas)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Completo)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs hover:bg-[#0768BD]"
                >
                  Adicionar Colaborador
                </button>
              </div>
            </form>
          </div>

          {/* Users List */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                  <th className="py-3 px-4">Nome do Colaborador</th>
                  <th className="py-3 px-4">E-mail Autorizado</th>
                  <th className="py-3 px-4">Perfil de Acesso</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'ADMINISTRADOR'
                            ? 'bg-[#FF7817]/10 text-[#FF7817]'
                            : u.role === 'FINANCEIRO'
                            ? 'bg-[#0878D9]/10 text-[#0878D9]'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">Ativo ✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: AUDITORIA DO SISTEMA ==================== */}
      {activeSubTab === 'auditoria' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Trilha de Auditoria & Segurança (Imutável)
            </h3>
            <span className="text-[11px] text-slate-400">Registros protegidos contra exclusão</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Nenhum registro de auditoria gravado no momento.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.createdAt || '').toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {log.userEmail}
                      </td>
                      <td className="py-2.5 px-4 font-mono uppercase text-[10px] text-[#0878D9]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {log.entityType}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
