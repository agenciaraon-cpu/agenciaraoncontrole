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
  ShoppingBag,
  Package,
  Layers,
  Briefcase,
  PieChart as PieIcon,
  BarChart2,
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
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Client, Contract, Receivable, Expense, ActiveTab, Sale, ProductService } from '../types';
import { useAuth } from '../context/AuthContext';
import { registerReceivablePayment } from '../services/db';

interface DashboardViewProps {
  clients: Client[];
  contracts: Contract[];
  receivables: Receivable[];
  expenses: Expense[];
  sales?: Sale[];
  productsServices?: ProductService[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenWhatsAppForClient?: (client: Client) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  contracts,
  receivables,
  expenses,
  sales = [],
  productsServices = [],
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

  // Mostra APENAS as cobranças vencidas aguardando confirmação / dar baixa (contagem a partir de Novembro/2026)
  const overdueReceivables = useMemo(() => {
    return receivables
      .filter((r) => {
        if (r.status === 'recebido' || r.status === 'cancelado') return false;
        // Filtro estrito solicitado: apenas os vencidos (status 'vencido' OU data de vencimento <= hoje)
        const isPastOrToday = r.dueDate ? r.dueDate <= todayStr : false;
        const isOverdueStatus = r.status === 'vencido';
        const isNovemberOnwards = !r.dueDate || r.dueDate >= '2026-11-01';
        return (isPastOrToday || isOverdueStatus) && isNovemberOnwards;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [receivables, todayStr]);

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
        `✓ Pagamento de ${formatCurrency(amount)} (${r.clientName}) confirmado com sucesso!\nO valor entrou instantaneamente no Faturamento Recebido e no Resultado Financeiro do Dashboard.`
      );
      onRefresh?.();
    } catch (err: any) {
      console.error('Erro ao confirmar recebimento no dashboard:', err);
      alert('Erro ao confirmar recebimento: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setConfirmingRecId(null);
    }
  };

  // ==================== CALCULATION OF METRICS BY REVENUE SOURCE ====================
  const metrics = useMemo(() => {
    // 1. Clients metrics
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.status === 'ativo').length;
    const pausedClients = clients.filter((c) => c.status === 'pausado').length;
    const inactiveClients = clients.filter((c) => c.status === 'inativo' || c.status === 'cancelado').length;
    const newClientsThisMonth = clients.filter((c) => {
      const dateStr = c.entryDate || c.createdAt || '';
      return dateStr.startsWith(`${currentYear}-${currentMonthNum}`);
    }).length;

    // 2. Agency Recurring (Fonte A)
    const activeContracts = contracts.filter((c) => c.status === 'vigente' || c.status === 'renovado');
    const mrrContracted = activeContracts.reduce((acc, c) => acc + (Number(c.monthlyFee) || 0), 0);

    // Filter receivables for current month
    const currentMonthReceivables = receivables.filter((r) => r.competence === currentCompetence);

    // Received this month by source
    const receivedAgency = currentMonthReceivables
      .filter(
        (r) =>
          (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) &&
          (r.status === 'recebido' || r.status === 'parcial')
      )
      .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

    const receivedProducts = currentMonthReceivables
      .filter((r) => r.revenueSource === 'produto' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

    const receivedServices = currentMonthReceivables
      .filter((r) => r.revenueSource === 'servico_avulso' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

    // CONSOLIDATED TOTAL RECEIVED
    const totalReceivedConsolidated = receivedAgency + receivedProducts + receivedServices;

    // Sales registered in current month (Gross Sales / Volume)
    const currentMonthSales = sales.filter((s) => s.saleDate.startsWith(`${currentYear}-${currentMonthNum}`));

    const productSalesVolume = currentMonthSales
      .filter((s) => s.itemType === 'produto' && s.status !== 'cancelado')
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    const serviceSalesVolume = currentMonthSales
      .filter((s) => s.itemType === 'servico' && s.status !== 'cancelado')
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    const productSalesCount = currentMonthSales.filter((s) => s.itemType === 'produto' && s.status !== 'cancelado').length;
    const serviceSalesCount = currentMonthSales.filter((s) => s.itemType === 'servico' && s.status !== 'cancelado').length;

    // Pending Receivables
    const pendingAgency = currentMonthReceivables
      .filter((r) => (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) && r.status === 'pendente')
      .reduce((sum, r) => sum + (Number(r.originalAmount) - (Number(r.discountAmount) || 0)), 0);

    const pendingStandalone = currentMonthReceivables
      .filter((r) => (r.revenueSource === 'produto' || r.revenueSource === 'servico_avulso') && r.status === 'pendente')
      .reduce((sum, r) => sum + (Number(r.originalAmount) - (Number(r.discountAmount) || 0)), 0);

    const totalPendingMonth = pendingAgency + pendingStandalone;

    // Overdue (counting strictly from November / Mês 11 de 2026 onwards)
    const overdueTotal = receivables
      .filter((r) => r.status === 'vencido' && (!r.dueDate || r.dueDate >= '2026-11-01'))
      .reduce((acc, r) => acc + (Number(r.originalAmount) - (Number(r.paidAmount) || 0)), 0);

    // Expenses (current month)
    const monthlyExpenses = expenses
      .filter((e) => e.competence === currentCompetence && e.status === 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // Net Result
    const netResult = totalReceivedConsolidated - monthlyExpenses;

    // Contracts expiring
    const next30DaysDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const contractsExpiringSoon = contracts.filter(
      (c) => c.endDate && c.endDate >= todayStr && c.endDate <= next30DaysDate && c.status === 'vigente'
    ).length;

    // Birthdays
    const birthdaysThisMonth = clients.filter((c) => {
      if (!c.responsibleBirthDate) return false;
      const parts = c.responsibleBirthDate.split('-');
      return parts[1] === currentMonthNum;
    });

    return {
      totalClients,
      activeClients,
      pausedClients,
      inactiveClients,
      newClientsThisMonth,
      mrrContracted,
      receivedAgency,
      receivedProducts,
      receivedServices,
      totalReceivedConsolidated,
      productSalesVolume,
      serviceSalesVolume,
      productSalesCount,
      serviceSalesCount,
      pendingAgency,
      pendingStandalone,
      totalPendingMonth,
      overdueTotal,
      monthlyExpenses,
      netResult,
      contractsExpiringSoon,
      birthdaysCount: birthdaysThisMonth.length,
    };
  }, [clients, contracts, receivables, expenses, sales, currentMonthNum, currentYear, currentCompetence, todayStr]);

  // ==================== CHARTS DATA ====================

  // Chart 1: Proporção das Receitas por Fonte (Donut)
  const revenueSourceDonutData = useMemo(() => {
    const data = [
      { name: 'Agência (Contratos)', value: metrics.receivedAgency, color: '#0878D9' },
      { name: 'Produtos (Físicos/Digitais)', value: metrics.receivedProducts, color: '#FF7817' },
      { name: 'Serviços Avulsos', value: metrics.receivedServices, color: '#102B59' },
    ].filter((item) => item.value > 0);

    return data.length > 0
      ? data
      : [
          { name: 'Agência (Contratos)', value: 1, color: '#0878D9' },
          { name: 'Produtos', value: 0, color: '#FF7817' },
          { name: 'Serviços Avulsos', value: 0, color: '#102B59' },
        ];
  }, [metrics.receivedAgency, metrics.receivedProducts, metrics.receivedServices]);

  // Chart 2: Evolução Mensal por Fonte (Últimos 12 Meses)
  const monthlyEvolutionBySource = useMemo(() => {
    const list = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mNum = String(d.getMonth() + 1).padStart(2, '0');
      const yNum = d.getFullYear();
      const comp = `${mNum}/${yNum}`;
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

      const recAgency = receivables
        .filter(
          (r) =>
            r.competence === comp &&
            (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) &&
            (r.status === 'recebido' || r.status === 'parcial')
        )
        .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

      const recProd = receivables
        .filter((r) => r.competence === comp && r.revenueSource === 'produto' && (r.status === 'recebido' || r.status === 'parcial'))
        .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

      const recServ = receivables
        .filter((r) => r.competence === comp && r.revenueSource === 'servico_avulso' && (r.status === 'recebido' || r.status === 'parcial'))
        .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

      const exp = expenses
        .filter((e) => e.competence === comp && e.status === 'pago')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      list.push({
        mes: `${monthLabel}/${String(yNum).slice(2)}`,
        agencia: recAgency,
        produtos: recProd,
        servicos: recServ,
        total: recAgency + recProd + recServ,
        despesa: exp,
      });
    }
    return list;
  }, [receivables, expenses]);

  // Chart 3: Vendas de Produtos vs Serviços Avulsos (Vendido vs Recebido no Mês)
  const productsVsServicesData = useMemo(() => {
    return [
      {
        categoria: 'Produtos Físicos/Digitais',
        vendido: metrics.productSalesVolume,
        recebido: metrics.receivedProducts,
      },
      {
        categoria: 'Serviços Avulsos',
        vendido: metrics.serviceSalesVolume,
        recebido: metrics.receivedServices,
      },
    ];
  }, [metrics.productSalesVolume, metrics.receivedProducts, metrics.serviceSalesVolume, metrics.receivedServices]);

  // Chart 4: Receita da Agência vs Vendas Avulsas
  const agencyVsStandaloneData = useMemo(() => {
    return [
      {
        tipo: 'Agência (Contratos)',
        valor: metrics.receivedAgency,
        fill: '#0878D9',
      },
      {
        tipo: 'Vendas Avulsas (Prod + Serv)',
        valor: metrics.receivedProducts + metrics.receivedServices,
        fill: '#FF7817',
      },
    ];
  }, [metrics.receivedAgency, metrics.receivedProducts, metrics.receivedServices]);

  // Chart 5: Itens Mais Vendidos (Produtos e Serviços)
  const topSellingItemsData = useMemo(() => {
    const itemMap: Record<string, { name: string; count: number; total: number }> = {};
    sales
      .filter((s) => s.status !== 'cancelado')
      .forEach((s) => {
        if (!itemMap[s.itemName]) {
          itemMap[s.itemName] = { name: s.itemName, count: 0, total: 0 };
        }
        itemMap[s.itemName].count += Number(s.quantity) || 1;
        itemMap[s.itemName].total += Number(s.totalAmount) || 0;
      });

    const list = Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5);
    return list;
  }, [sales]);

  // Calculate percentages for the hero card
  const agencyPct = metrics.totalReceivedConsolidated > 0
    ? Math.round((metrics.receivedAgency / metrics.totalReceivedConsolidated) * 100)
    : 0;
  const prodPct = metrics.totalReceivedConsolidated > 0
    ? Math.round((metrics.receivedProducts / metrics.totalReceivedConsolidated) * 100)
    : 0;
  const servPct = metrics.totalReceivedConsolidated > 0
    ? Math.round((metrics.receivedServices / metrics.totalReceivedConsolidated) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ==================== 1. DESTAQUE PRINCIPAL — TOTAL RECEBIDO NO MÊS (CONSOLIDADO) ==================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102B59] via-[#0B3A75] to-[#0878D9] p-6 sm:p-8 text-white shadow-2xl border border-white/10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#FF7817] text-white text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Faturamento Consolidado
              </span>
              <span className="text-xs font-semibold text-blue-200">Competência {currentCompetence}</span>
            </div>

            <p className="text-xs uppercase tracking-widest text-blue-200 font-bold">
              Total Recebido no Mês (Agência + Produtos + Serviços Avulsos)
            </p>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-1">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.totalReceivedConsolidated)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-2">
              Valor líquido compensado em caixa em todas as fontes de receita da Agência Raon.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('products_services')}
              className="px-4 py-2.5 bg-[#FF7817] hover:bg-[#E5680E] text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Registrar Nova Venda</span>
            </button>
            <button
              onClick={() => onNavigate('clients')}
              className="px-4 py-2.5 bg-white text-[#102B59] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>+ Novo Cliente</span>
            </button>
            <button
              onClick={() => onNavigate('financial')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Financeiro</span>
            </button>
          </div>
        </div>

        {/* ==================== 3 SUB-CARDS DETALHANDO AS FONTES DE RECEITA ==================== */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/15">
          {/* Fonte A: Agência Raon */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#0878D9]" />
                Agência (Contratos)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 text-[10px] font-black">
                {agencyPct}% do total
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.receivedAgency)}
            </p>
            <p className="text-[11px] text-blue-200/80 mt-0.5">Mensalidades e fee de clientes</p>
          </div>

          {/* Fonte B: Produtos */}
          <div
            onClick={() => onNavigate('products_services')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-200 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#FF7817]" />
                Produtos (Físicos/Digitais)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-100 text-[10px] font-black">
                {prodPct}% do total
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.receivedProducts)}
            </p>
            <p className="text-[11px] text-orange-200/80 mt-0.5">
              {metrics.productSalesCount} venda(s) registrada(s)
            </p>
          </div>

          {/* Fonte C: Serviços Avulsos */}
          <div
            onClick={() => onNavigate('products_services')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-300" />
                Serviços Avulsos
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 text-[10px] font-black">
                {servPct}% do total
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.receivedServices)}
            </p>
            <p className="text-[11px] text-indigo-200/80 mt-0.5">
              {metrics.serviceSalesCount} serviço(s) avulso(s)
            </p>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#FF7817]/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ==================== AVISO & CONFIRMAÇÃO DE COBRANÇAS VENCIDAS (DAR BAIXA) ==================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-red-200 dark:border-red-900/40 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                Cobranças Vencidas — Aguardando Confirmação (Dar Baixa)
                {overdueReceivables.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                    {overdueReceivables.length} {overdueReceivables.length === 1 ? 'vencido para dar baixa' : 'vencidos para dar baixa'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando apenas contas vencidas a partir deste mês (Novembro/2026). O valor só entra no <strong>Total Recebido no Mês</strong> após você confirmar o recebimento.
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

        {overdueReceivables.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Excelente! Não há cobranças vencidas pendentes no momento. Todas as empresas cadastradas estão com pagamentos em dia ou já confirmados.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {overdueReceivables.map((r) => {
              const sourceLabel =
                r.revenueSource === 'produto'
                  ? 'Produto'
                  : r.revenueSource === 'servico_avulso'
                  ? 'Serviço Avulso'
                  : 'Agência';

              return (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-red-50/40 dark:bg-slate-900/60 border border-red-200 dark:border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-red-400 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg shrink-0 mt-0.5 bg-red-500/10 text-red-600">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-white">
                          {r.clientName}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {sourceLabel}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                          Vencido ({r.dueDate})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {r.description} • Competência: <strong>{r.competence}</strong> • Vencimento original: <strong>{r.dueDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                    <span className="text-sm font-black text-red-600 dark:text-red-400">
                      {formatCurrency(Number(r.originalAmount) - (Number(r.paidAmount) || 0))}
                    </span>
                    <button
                      onClick={() => handleConfirmReceipt(r)}
                      disabled={confirmingRecId === r.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                      title="Confirmar recebimento e lançar no Dashboard"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{confirmingRecId === r.id ? 'Confirmando...' : '✓ Confirmar que Já Recebi'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== INDICADORES ESTRATÉGICOS INDIVIDUAIS ==================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FF7817]" />
            Indicadores Estratégicos Oficiais
          </h2>
          <span className="text-xs text-slate-400">Separação por fontes de faturamento</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* MRR Contratada da Agência */}
          <div
            onClick={() => onNavigate('contracts')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">MRR Contratada</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-[#0878D9]">
                <FileSignature className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.mrrContracted)}
            </p>
            <span className="text-[10px] text-slate-400">Mensalidade recorrente nominal</span>
          </div>

          {/* Total Vendido de Produtos */}
          <div
            onClick={() => onNavigate('products_services')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#FF7817] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Vendido Produtos</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF7817]">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-[#FF7817] mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.productSalesVolume)}
            </p>
            <span className="text-[10px] text-slate-400">{metrics.productSalesCount} vendas no mês</span>
          </div>

          {/* Total Vendido de Serviços Avulsos */}
          <div
            onClick={() => onNavigate('products_services')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#102B59] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Vendido Serviços Avulsos</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.serviceSalesVolume)}
            </p>
            <span className="text-[10px] text-slate-400">{metrics.serviceSalesCount} serviços avulsos</span>
          </div>

          {/* A Receber Pendente Total */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">A Receber Pendente</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.totalPendingMonth)}
            </p>
            <span className="text-[10px] text-slate-400">Vence no mês atual</span>
          </div>

          {/* Despesas Pagas */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Despesas Pagas</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.monthlyExpenses)}
            </p>
            <span className="text-[10px] text-slate-400">Custos operacionais liquidados</span>
          </div>

          {/* Resultado Líquido Consolidado */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Resultado Líquido</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
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
            <span className="text-[10px] text-slate-400">Total recebido - Despesas pagas</span>
          </div>

          {/* Clientes Ativos vs Pausados */}
          <div
            onClick={() => onNavigate('clients')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Clientes Ativos</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.activeClients}{' '}
              {metrics.pausedClients > 0 && (
                <span className="text-xs font-semibold text-amber-500">({metrics.pausedClients} pausados)</span>
              )}
            </p>
            <span className="text-[10px] text-slate-400">Total cadastrados: {metrics.totalClients}</span>
          </div>

          {/* Inadimplência Acumulada */}
          <div
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-red-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Inadimplência</span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-red-600 dark:text-red-400 mt-2 truncate">
              {isCollaborator ? 'R$ •••••' : formatCurrency(metrics.overdueTotal)}
            </p>
            <span className="text-[10px] text-slate-400">Boletos/Cobranças vencidas</span>
          </div>
        </div>
      </div>

      {/* ==================== 6 GRÁFICOS MODERNOS COM DADOS REAIS ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: Proporção das Receitas por Fonte (Pizza/Rosca) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#0878D9]" />
                Proporção das Receitas por Fonte (Mês Atual)
              </h3>
              <p className="text-xs text-slate-400">Agência (Contratos) vs Produtos vs Serviços Avulsos</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueSourceDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueSourceDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
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
          </div>
        </div>

        {/* GRÁFICO 2: Evolução Mensal do Faturamento por Fonte (12 Meses) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#FF7817]" />
                Evolução Mensal do Faturamento por Fonte (12 Meses)
              </h3>
              <p className="text-xs text-slate-400">Histórico detalhado por categoria de receita</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEvolutionBySource} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="agencia" name="Agência (Contratos)" stackId="a" fill="#0878D9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="produtos" name="Produtos" stackId="a" fill="#FF7817" radius={[0, 0, 0, 0]} />
                <Bar dataKey="servicos" name="Serviços Avulsos" stackId="a" fill="#102B59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Vendas de Produtos vs Serviços Avulsos (Vendido vs Recebido) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Produtos vs Serviços Avulsos (Vendido vs Recebido)
              </h3>
              <p className="text-xs text-slate-400">Volume total emitido em vendas versus valores compensados</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productsVsServicesData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="vendido" name="Total Vendido (Emitido)" fill="#102B59" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recebido" name="Total Recebido (Compensado)" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 4: Receita da Agência vs Vendas Avulsas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Receitas da Agência vs Vendas Avulsas
              </h3>
              <p className="text-xs text-slate-400">Comparação direta de arrecadação no mês</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agencyVsStandaloneData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11 }} width={140} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="valor" name="Recebido (R$)" fill="#0878D9" radius={[0, 6, 6, 0]}>
                  {agencyVsStandaloneData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 5: Faturamento Consolidado vs Despesas (12 Meses) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Faturamento Consolidado versus Despesas
              </h3>
              <p className="text-xs text-slate-400">Total arrecadado em todas as fontes versus custos pagos</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEvolutionBySource} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalRevenueColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0878D9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0878D9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#10192A',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="total" name="Total Recebido" stroke="#0878D9" strokeWidth={2.5} fill="url(#totalRevenueColor)" />
                <Area type="monotone" dataKey="despesa" name="Despesas Pagas" stroke="#EF4444" strokeWidth={2} fill="url(#expenseColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 6: Produtos e Serviços Mais Vendidos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Itens Mais Vendidos (Produtos & Serviços Avulsos)
              </h3>
              <p className="text-xs text-slate-400">Ranking por faturamento bruto gerado</p>
            </div>
            <button
              onClick={() => onNavigate('products_services')}
              className="text-xs font-bold text-[#FF7817] hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="h-64">
            {topSellingItemsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingItemsData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#10192A',
                      color: '#fff',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="total" name="Total Vendido (R$)" fill="#FF7817" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <span>Nenhuma venda de produto ou serviço avulso registrada ainda.</span>
                <button
                  onClick={() => onNavigate('products_services')}
                  className="px-3 py-1.5 rounded-lg bg-[#FF7817] text-white font-bold text-xs"
                >
                  + Fazer primeiro lançamento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
