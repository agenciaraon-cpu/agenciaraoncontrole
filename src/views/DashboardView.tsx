import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileSignature,
  Gift,
  Calendar,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Client, Contract, Receivable, Expense, ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { registerReceivablePayment } from '../services/db';

interface DashboardViewProps {
  clients: Client[];
  contracts: Contract[];
  receivables: Receivable[];
  expenses: Expense[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenWhatsAppForClient?: (client: Client) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  contracts,
  receivables,
  expenses,
  onNavigate,
  onOpenWhatsAppForClient,
  onRefresh,
}) => {
  const { isCollaborator } = useAuth();
  const [confirmingRecId, setConfirmingRecId] = useState<string | null>(null);

  const now = new Date();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();
  const currentCompetence = `${currentMonthNum}/${currentYear}`;
  const todayStr = now.toISOString().split('T')[0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Pending receivables that have reached or passed their due date (or current competence)
  const pendingDueReceivables = useMemo(() => {
    return receivables
      .filter((r) => r.status !== 'recebido')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [receivables]);

  // Handler to confirm receipt directly from Dashboard
  const handleConfirmReceipt = async (r: Receivable) => {
    setConfirmingRecId(r.id);
    try {
      const amount = Number(r.originalAmount) - (Number(r.paidAmount) || 0);
      const userEmail = 'agenciaraon@gmail.com';
      await registerReceivablePayment(
        r.id,
        amount,
        0,
        'PIX',
        todayStr,
        userEmail,
        'Recebimento confirmado diretamente pelo Dashboard'
      );
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert(
        `✓ Pagamento de ${formatCurrency(amount)} de ${r.clientName} confirmado com sucesso!\nO valor entrou instantaneamente no Faturamento Recebido e no Resultado Financeiro do Dashboard.`
      );
      onRefresh?.();
    } catch (err: any) {
      console.error('Erro ao confirmar recebimento no dashboard:', err);
      alert('Erro ao confirmar recebimento: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setConfirmingRecId(null);
    }
  };

  // 12 Mandatory Indicators calculated from real data
  const metrics = useMemo(() => {
    // 1. Total clients
    const totalClients = clients.length;

    // 2. Active clients
    const activeClients = clients.filter((c) => c.status === 'ativo').length;

    // 3. Inactive clients
    const inactiveClients = clients.filter((c) => c.status !== 'ativo').length;

    // 4. New clients of the month
    const newClientsThisMonth = clients.filter((c) => {
      const dateStr = c.entryDate || c.createdAt || '';
      return dateStr.startsWith(`${currentYear}-${currentMonthNum}`);
    }).length;

    // 5. Contracted MRR (Monthly Recurring Revenue)
    const activeContracts = contracts.filter((c) => c.status === 'vigente' || c.status === 'renovado');
    const mrrContracted = activeContracts.reduce((acc, c) => acc + (Number(c.monthlyFee) || 0), 0);

    // 6. Revenue received in the month
    const receivedThisMonth = receivables
      .filter((r) => r.competence === currentCompetence && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

    // 7. Pending receivables in current month
    const pendingThisMonth = receivables
      .filter((r) => r.competence === currentCompetence && r.status === 'pendente')
      .reduce((acc, r) => acc + (Number(r.originalAmount) - (Number(r.discountAmount) || 0)), 0);

    // 8. Overdue receivables (all months)
    const overdueTotal = receivables
      .filter((r) => r.status === 'vencido')
      .reduce((acc, r) => acc + (Number(r.originalAmount) - (Number(r.paidAmount) || 0)), 0);

    // 9. Monthly expenses (current month)
    const monthlyExpenses = expenses
      .filter((e) => e.competence === currentCompetence)
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // 10. Financial Net Result
    const netResult = receivedThisMonth - monthlyExpenses;

    // 11. Contracts expiring in next 30 days
    const next30DaysDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    const contractsExpiringSoon = contracts.filter(
      (c) => c.endDate && c.endDate >= todayStr && c.endDate <= next30DaysDate && c.status === 'vigente'
    ).length;

    // 12. Birthdays of the month
    const birthdaysThisMonth = clients.filter((c) => {
      if (!c.responsibleBirthDate) return false;
      const parts = c.responsibleBirthDate.split('-');
      return parts[1] === currentMonthNum;
    });

    return {
      totalClients,
      activeClients,
      inactiveClients,
      newClientsThisMonth,
      mrrContracted,
      receivedThisMonth,
      pendingThisMonth,
      overdueTotal,
      monthlyExpenses,
      netResult,
      contractsExpiringSoon,
      birthdaysCount: birthdaysThisMonth.length,
      birthdaysList: birthdaysThisMonth,
    };
  }, [clients, contracts, receivables, expenses, currentMonthNum, currentYear, currentCompetence]);

  // Chart 1: Revenue last 12 months (dynamically grouped)
  const revenue12MonthsData = useMemo(() => {
    const list = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = String(d.getMonth() + 1).padStart(2, '0');
      const yNum = d.getFullYear();
      const comp = `${mNum}/${yNum}`;
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

      const rec = receivables
        .filter((r) => r.competence === comp && (r.status === 'recebido' || r.status === 'parcial'))
        .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

      const exp = expenses
        .filter((e) => e.competence === comp && e.status === 'pago')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      list.push({
        name: `${monthLabel}/${String(yNum).slice(2)}`,
        receita: rec,
        despesa: exp,
      });
    }
    return list;
  }, [receivables, expenses]);

  // Chart 2: Clients by Plan
  const clientsByPlanData = useMemo(() => {
    const map: Record<string, number> = {
      'Start Bronze': 0,
      'Prata Plus': 0,
      'Gold Essencial': 0,
      Personalizado: 0,
    };

    clients.forEach((c) => {
      const pName = c.planName || 'Personalizado';
      if (pName.includes('Bronze')) map['Start Bronze']++;
      else if (pName.includes('Prata')) map['Prata Plus']++;
      else if (pName.includes('Gold')) map['Gold Essencial']++;
      else map['Personalizado']++;
    });

    return [
      { name: 'Start Bronze', value: map['Start Bronze'], color: '#CD7F32' },
      { name: 'Prata Plus', value: map['Prata Plus'], color: '#0878D9' },
      { name: 'Gold Essencial', value: map['Gold Essencial'], color: '#FF7817' },
      { name: 'Personalizado', value: map['Personalizado'], color: '#102B59' },
    ].filter((item) => item.value > 0);
  }, [clients]);

  // Chart 3: Client Evolution
  const clientEvolutionData = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = String(d.getMonth() + 1).padStart(2, '0');
      const yNum = d.getFullYear();
      const prefix = `${yNum}-${mNum}`;
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' });

      const totalUntilMonth = clients.filter((c) => {
        const cDate = c.entryDate || c.createdAt || '';
        return cDate.slice(0, 7) <= prefix;
      }).length;

      list.push({
        mes: monthLabel,
        clientes: totalUntilMonth,
      });
    }
    return list;
  }, [clients]);

  // Chart 4: Top Contracted Services
  const topServicesData = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    contracts.forEach((c) => {
      if (Array.isArray(c.services)) {
        c.services.forEach((s) => {
          serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
        });
      }
    });

    return Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [contracts]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102B59] via-[#0878D9] to-[#102B59] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF7817] text-white text-[10px] font-black uppercase tracking-wider">
                Painel Executivo
              </span>
              <span className="text-xs text-white/80">Competência {currentCompetence}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Agência Raon — Gestão Integrada
            </h1>
            <p className="text-sm text-slate-200 mt-1 max-w-xl">
              Acompanhe os principais indicadores de faturamento, novos contratos e entregas em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('clients')}
              className="px-4 py-2 bg-white text-[#102B59] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
            >
              + Novo Cliente
            </button>
            {!isCollaborator && (
              <button
                onClick={() => onNavigate('financial')}
                className="px-4 py-2 bg-[#FF7817] hover:bg-[#E5680E] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
              >
                + Lançamento Financeiro
              </button>
            )}
            <button
              onClick={() => onNavigate('tasks')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Ver Kanban
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#FF7817]/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ==================== AVISO & CONFIRMAÇÃO DE RECEBIMENTOS NO VENCIMENTO ==================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-blue-200 dark:border-blue-900/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0878D9]/10 text-[#0878D9]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                Pagamentos no Vencimento — Aguardando Confirmação
                {pendingDueReceivables.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                    {pendingDueReceivables.length} para confirmar
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O valor só entra no <strong>Faturamento Recebido</strong> e no <strong>Resultado Financeiro</strong> após você confirmar o recebimento abaixo.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('financial')}
            className="text-xs font-bold text-[#0878D9] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            Ver módulo financeiro completo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingDueReceivables.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Excelente! Não há cobranças pendentes aguardando confirmação no momento. Todos os recebimentos confirmados já constam nas métricas abaixo.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingDueReceivables.slice(0, 4).map((r) => {
              const isOverdue = r.dueDate < todayStr;
              const isDueToday = r.dueDate === todayStr;

              return (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#0878D9] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isOverdue
                          ? 'bg-red-500/10 text-red-600'
                          : isDueToday
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-blue-500/10 text-[#0878D9]'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-white">
                          {r.clientName}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-red-500/10 text-red-600'
                              : isDueToday
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-blue-500/10 text-[#0878D9]'
                          }`}
                        >
                          {isOverdue ? 'Vencido' : isDueToday ? 'Vence Hoje' : 'No Vencimento'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {r.description} • Competência: <strong>{r.competence}</strong> • Vencimento: <strong>{r.dueDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {formatCurrency(Number(r.originalAmount) - (Number(r.paidAmount) || 0))}
                    </span>
                    <button
                      onClick={() => handleConfirmReceipt(r)}
                      disabled={confirmingRecId === r.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                      title="Confirmar que você já recebeu este valor e debitar para o financeiro do Dashboard"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{confirmingRecId === r.id ? 'Confirmando...' : '✓ Confirmar que Já Recebi'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {pendingDueReceivables.length > 4 && (
              <div className="text-center pt-1">
                <button
                  onClick={() => onNavigate('financial')}
                  className="text-xs font-bold text-[#0878D9] hover:underline"
                >
                  Ver mais {pendingDueReceivables.length - 4} cobranças no financeiro
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 12 Mandated Indicators Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FF7817]" />
            12 Indicadores Estratégicos Oficiais
          </h2>
          <span className="text-xs text-slate-400">Atualizado com dados reais</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Clientes */}
          <div
            onClick={() => onNavigate('clients')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Clientes</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-[#0878D9] group-hover:bg-[#0878D9] group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">
              {metrics.totalClients}
            </p>
            <span className="text-[10px] text-slate-400">Na base cadastrada</span>
          </div>

          {/* 2. Clientes Ativos */}
          <div
            onClick={() => onNavigate('clients')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Clientes Ativos</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.activeClients}
            </p>
            <span className="text-[10px] text-slate-400">Com serviços em vigor</span>
          </div>

          {/* 3. Clientes Inativos */}
          <div
            onClick={() => onNavigate('clients')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Inativos / Suspensos</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-colors">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-2">
              {metrics.inactiveClients}
            </p>
            <span className="text-[10px] text-slate-400">Oportunidade de reativação</span>
          </div>

          {/* 4. Novos Clientes do Mês */}
          <div
            onClick={() => onNavigate('clients')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#FF7817] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Novos no Mês</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF7817] group-hover:bg-[#FF7817] group-hover:text-white transition-colors">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#FF7817] mt-2">
              +{metrics.newClientsThisMonth}
            </p>
            <span className="text-[10px] text-slate-400">Entrada recente</span>
          </div>

          {/* 5. Receita Recorrente Contratada (MRR) */}
          <div
            onClick={() => onNavigate('contracts')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">MRR Contratada</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-[#0878D9] transition-colors">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.mrrContracted)}
            </p>
            <span className="text-[10px] text-slate-400">Mensalidade nominal ativa</span>
          </div>

          {/* 6. Faturamento Recebido no Mês */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Recebido no Mês</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.receivedThisMonth)}
            </p>
            <span className="text-[10px] text-slate-400">Liquidados no caixa</span>
          </div>

          {/* 7. Valores Pendentes de Recebimento */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">A Receber no Mês</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.pendingThisMonth)}
            </p>
            <span className="text-[10px] text-slate-400">Vencimento a vencer</span>
          </div>

          {/* 8. Valores Vencidos */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-red-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Valores Vencidos</span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-red-600 dark:text-red-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.overdueTotal)}
            </p>
            <span className="text-[10px] text-slate-400">Inadimplência acumulada</span>
          </div>

          {/* 9. Despesas Mensais */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Despesas do Mês</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 transition-colors">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.monthlyExpenses)}
            </p>
            <span className="text-[10px] text-slate-400">Custos operacionais</span>
          </div>

          {/* 10. Resultado Financeiro */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Resultado Líquido</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-xl font-black mt-2 truncate ${
                metrics.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
              }`}
            >
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.netResult)}
            </p>
            <span className="text-[10px] text-slate-400">Receitas pagas - Despesas</span>
          </div>

          {/* 11. Contratos Próximos do Vencimento */}
          <div
            onClick={() => onNavigate('contracts')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#102B59] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Contratos a Vencer</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 transition-colors">
                <FileSignature className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">
              {metrics.contractsExpiringSoon}
            </p>
            <span className="text-[10px] text-slate-400">Próximos 30 dias</span>
          </div>

          {/* 12. Aniversariantes do Mês */}
          <div
            onClick={() => onNavigate('birthdays')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#FF7817] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Aniversariantes</span>
              <div className="p-2 rounded-xl bg-[#FF7817]/10 text-[#FF7817] transition-colors">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#FF7817] mt-2">
              {metrics.birthdaysCount}
            </p>
            <span className="text-[10px] text-slate-400">Responsáveis neste mês</span>
          </div>
        </div>
      </div>

      {/* Charts Section: 6 modern graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Receitas vs Despesas (12 Meses) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Receitas versus Despesas (Últimos 12 Meses)
              </h3>
              <p className="text-xs text-slate-400">Comparativo financeiro mensal</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue12MonthsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="receita" name="Receita Recebida" fill="#0878D9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa Paga" fill="#FF7817" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Clientes por Plano */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Distribuição de Clientes por Plano
              </h3>
              <p className="text-xs text-slate-400">Start Bronze, Prata Plus, Gold & Personalizado</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {clientsByPlanData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientsByPlanData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {clientsByPlanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#10192A',
                      color: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Nenhum plano alocado ainda.</p>
            )}
          </div>
        </div>

        {/* Graph 3: Evolução da Carteira de Clientes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Evolução da Carteira de Clientes
              </h3>
              <p className="text-xs text-slate-400">Crescimento cumulativo nos últimos meses</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientEvolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="clientColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0878D9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0878D9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="clientes"
                  name="Total de Clientes"
                  stroke="#0878D9"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#clientColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Serviços Mais Contratados */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Serviços Mais Contratados
              </h3>
              <p className="text-xs text-slate-400">Mapeamento de demanda da Agência Raon</p>
            </div>
          </div>
          <div className="h-64">
            {topServicesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topServicesData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#10192A',
                      color: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="count" name="Contratos" fill="#102B59" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum serviço mapeado ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Alerts Section */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              Alertas Prioritários de Gestão
            </h3>
          </div>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Ações Imediatas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Alert 1 */}
          <div className="p-3.5 bg-white dark:bg-[#10192A] rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {metrics.overdueTotal > 0 ? 'Inadimplência Ativa' : 'Cobranças em Dia'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.overdueTotal > 0
                  ? `Total de ${formatCurrency(metrics.overdueTotal)} aguardando quitação.`
                  : 'Nenhuma cobrança vencida registrada.'}
              </p>
              {metrics.overdueTotal > 0 && (
                <button
                  onClick={() => onNavigate('financial')}
                  className="mt-2 text-xs font-bold text-[#0878D9] flex items-center gap-1 hover:underline"
                >
                  Cobrar no WhatsApp <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Alert 2 */}
          <div className="p-3.5 bg-white dark:bg-[#10192A] rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#FF7817]/10 text-[#FF7817]">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Aniversários da Semana
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.birthdaysCount} clientes com aniversário em novembro.
              </p>
              <button
                onClick={() => onNavigate('birthdays')}
                className="mt-2 text-xs font-bold text-[#FF7817] flex items-center gap-1 hover:underline"
              >
                Ver Aniversariantes <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Alert 3 */}
          <div className="p-3.5 bg-white dark:bg-[#10192A] rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-[#0878D9]">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Ciclos de Contrato
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {metrics.contractsExpiringSoon > 0
                  ? `${metrics.contractsExpiringSoon} contratos encerram nos próximos 30 dias.`
                  : 'Todos os contratos vigentes com prazo regular.'}
              </p>
              <button
                onClick={() => onNavigate('contracts')}
                className="mt-2 text-xs font-bold text-[#0878D9] flex items-center gap-1 hover:underline"
              >
                Revisar Contratos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
