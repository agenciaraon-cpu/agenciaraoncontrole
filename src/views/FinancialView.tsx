import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  MessageCircle,
  FileText,
  FileCheck,
  ChevronDown,
  Sparkles,
  Layers,
  Briefcase,
  Package,
  RotateCcw,
  Trash2,
  Edit2,
  Undo2,
} from 'lucide-react';
import { Receivable, Expense, FinancialCategory, Client, ReceivableStatus, ExpenseStatus } from '../types';
import {
  createReceivable,
  updateReceivable,
  registerReceivablePayment,
  reverseReceivablePayment,
  deleteReceivable,
  confirmSalePayment,
  createExpense,
  updateExpense,
  deleteExpense,
  reverseExpensePayment,
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { WhatsAppModal, WhatsAppTemplateKey } from '../components/common/WhatsAppModal';

interface FinancialViewProps {
  receivables: Receivable[];
  expenses: Expense[];
  categories: FinancialCategory[];
  clients: Client[];
  sales?: any[];
  onRefresh: () => void;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  receivables,
  expenses,
  categories,
  clients,
  sales = [],
  onRefresh,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'receber' | 'pagar' | 'fluxo'>('receber');

  const now = new Date();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();
  const [selectedCompetence, setSelectedCompetence] = useState<string>(`${currentMonthNum}/${currentYear}`);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sourceFilter, setSourceFilter] = useState<'todas' | 'agencia' | 'produto' | 'servico_avulso'>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewReceivableOpen, setIsNewReceivableOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivableForPayment, setSelectedReceivableForPayment] = useState<Receivable | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // WhatsApp
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [targetClient, setTargetClient] = useState<{ id: string; name: string; responsible: string; phone: string } | null>(null);
  const [whatsAppTpl, setWhatsAppTpl] = useState<WhatsAppTemplateKey>('cobranca_hoje');
  const [whatsAppVars, setWhatsAppVars] = useState<any>({});

  // New Receivable state
  const [newRec, setNewRec] = useState({
    clientId: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    competence: `${currentMonthNum}/${currentYear}`,
    originalAmount: 0,
    paymentMethod: 'PIX',
  });

  // New Expense state
  const [newExp, setNewExp] = useState({
    categoryId: '',
    categoryName: 'Ferramentas de IA & Design (Canva, Midjourney, OpenAI)',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    competence: `${currentMonthNum}/${currentYear}`,
    amount: 0,
    supplierName: '',
    status: 'pendente' as ExpenseStatus,
    paymentMethod: 'Cartão Corporativo',
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Filtered Receivables with source filter (strictly counting from November 2026 onwards)
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      // Exclude pre-November debts
      if (r.dueDate && r.dueDate < '2026-11-01' && r.status !== 'recebido') {
        return false;
      }
      const matchComp = selectedCompetence === 'todas' || r.competence === selectedCompetence;
      const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
      const matchSearch =
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const rSource = r.revenueSource || (r.saleId ? 'produto' : 'agencia');
      const matchSource = sourceFilter === 'todas' || rSource === sourceFilter;

      return matchComp && matchStatus && matchSearch && matchSource;
    });
  }, [receivables, selectedCompetence, statusFilter, searchTerm, sourceFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchComp = selectedCompetence === 'todas' || e.competence === selectedCompetence;
      const matchStatus = statusFilter === 'todos' || e.status === statusFilter;
      const matchSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchComp && matchStatus && matchSearch;
    });
  }, [expenses, selectedCompetence, statusFilter, searchTerm]);

  // Cash Flow Metrics for Selected Competence
  const cashFlowMetrics = useMemo(() => {
    const recsInComp = receivables.filter((r) => {
      if (r.dueDate && r.dueDate < '2026-11-01' && r.status !== 'recebido') {
        return false;
      }
      return selectedCompetence === 'todas' || r.competence === selectedCompetence;
    });
    const expsInComp = expenses.filter((e) => selectedCompetence === 'todas' || e.competence === selectedCompetence);

    const totalPrevistoEntradas = recsInComp
      .filter((r) => r.status !== 'cancelado')
      .reduce((acc, r) => acc + (Number(r.originalAmount) - (Number(r.discountAmount) || 0)), 0);

    const totalRecebidoEntradas = recsInComp
      .filter((r) => r.status === 'recebido' || r.status === 'parcial')
      .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

    // Source breakdown of received funds
    const totalRecebidoAgencia = recsInComp
      .filter((r) => (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

    const totalRecebidoProdutos = recsInComp
      .filter((r) => r.revenueSource === 'produto' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

    const totalRecebidoServicos = recsInComp
      .filter((r) => r.revenueSource === 'servico_avulso' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);

    const totalPendenteEntradas = recsInComp
      .filter((r) => r.status === 'pendente')
      .reduce((acc, r) => acc + (Number(r.originalAmount) || 0), 0);

    const totalVencidoEntradas = recsInComp
      .filter((r) => r.status === 'vencido')
      .reduce((acc, r) => acc + (Number(r.originalAmount) - (Number(r.paidAmount) || 0)), 0);

    const totalPrevistoSaidas = expsInComp.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalPagoSaidas = expsInComp
      .filter((e) => e.status === 'pago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const saldoRealizado = totalRecebidoEntradas - totalPagoSaidas;
    const resultadoProjetado = totalPrevistoEntradas - totalPrevistoSaidas;

    return {
      totalPrevistoEntradas,
      totalRecebidoEntradas,
      totalRecebidoAgencia,
      totalRecebidoProdutos,
      totalRecebidoServicos,
      totalPendenteEntradas,
      totalVencidoEntradas,
      totalPrevistoSaidas,
      totalPagoSaidas,
      saldoRealizado,
      resultadoProjetado,
    };
  }, [receivables, expenses, selectedCompetence]);

  // Handle Register Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableForPayment) return;
    try {
      await registerReceivablePayment(
        selectedReceivableForPayment.id,
        Number(paymentAmount),
        Number(paymentDiscount) || 0,
        paymentMethod || selectedReceivableForPayment.paymentMethod || 'PIX',
        paymentDate || new Date().toISOString().split('T')[0],
        user?.email || 'somosraon@gmail.com',
        paymentNotes || 'Baixa de pagamento registrada no painel'
      );

      // If this receivable is linked to a standalone sale, also confirm sale payment
      if (selectedReceivableForPayment.saleId) {
        try {
          await confirmSalePayment(
            selectedReceivableForPayment.saleId,
            Number(paymentAmount),
            paymentDate || new Date().toISOString().split('T')[0],
            user?.email || 'somosraon@gmail.com'
          );
        } catch (saleErr) {
          console.warn('Venda vinculada atualizada via registerReceivablePayment:', saleErr);
        }
      }

      setIsPaymentModalOpen(false);
      setSelectedReceivableForPayment(null);
      alert('✓ Baixa no pagamento registrada com sucesso! O valor já foi computado no Faturamento Recebido.');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao dar baixa:', err);
      alert('Erro ao registrar baixa no pagamento: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Reverse Receivable Payment (Estorno)
  const handleReverseReceivable = async (rec: Receivable) => {
    const amount = Number(rec.paidAmount) || Number(rec.originalAmount);
    const confirmed = window.confirm(
      `Deseja realmente ESTORNAR o recebimento de ${formatCurrency(amount)} do cliente "${rec.clientName}"?\n\n` +
      `• O status da cobrança voltará para Pendente/Vencido.\n` +
      `• O valor será IMEDIATAMENTE removido do Total Recebido no Mês do Dashboard.\n` +
      `• Se houver venda vinculada, ela também voltará para pendente.`
    );
    if (!confirmed) return;

    try {
      await reverseReceivablePayment(rec.id, user?.email || 'somosraon@gmail.com');
      alert(`✓ Recebimento estornado com sucesso! O valor de ${formatCurrency(amount)} foi deduzido do Dashboard.`);
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao estornar:', err);
      alert('Erro ao estornar recebimento: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Delete Receivable (Exclusão definitiva)
  const handleDeleteReceivable = async (rec: Receivable) => {
    const amount = Number(rec.originalAmount);
    const confirmed = window.confirm(
      `Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta cobrança de ${formatCurrency(amount)} (${rec.clientName})?\n\n` +
      `• O registro será apagado do sistema.\n` +
      `• Se tiver sido dado baixa, o valor sairá imediatamente do Dashboard.\n` +
      `• Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      await deleteReceivable(rec.id, rec.description, user?.email || 'somosraon@gmail.com');
      alert('✓ Cobrança excluída com sucesso! Dashboard recalculado automaticamente.');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir cobrança:', err);
      alert('Erro ao excluir cobrança: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Reverse Expense Payment (Estorno de despesa paga)
  const handleReverseExpense = async (exp: Expense) => {
    const confirmed = window.confirm(
      `Deseja realmente ESTORNAR a quitação da despesa "${exp.description}" no valor de ${formatCurrency(exp.amount)}?\n\n` +
      `• O status voltará para Pendente/Vencido.\n` +
      `• As Despesas Pagas e o Resultado Líquido do Dashboard serão recalculados.`
    );
    if (!confirmed) return;

    try {
      await reverseExpensePayment(exp.id, user?.email || 'somosraon@gmail.com');
      alert('✓ Quitação estornada com sucesso! Dashboard recalculado.');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao estornar despesa:', err);
      alert('Erro ao estornar despesa: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Delete Expense (Exclusão definitiva de despesa)
  const handleDeleteExpense = async (exp: Expense) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja EXCLUIR DEFINITIVAMENTE a despesa "${exp.description}" (${formatCurrency(exp.amount)})?\n\n` +
      `• O registro será removido e o Dashboard atualizará automaticamente.`
    );
    if (!confirmed) return;

    try {
      await deleteExpense(exp.id, exp.description, user?.email || 'somosraon@gmail.com');
      alert('✓ Despesa excluída com sucesso! Dashboard atualizado.');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err);
      alert('Erro ao excluir despesa: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Save edited receivable
  const handleSaveEditReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceivable) return;
    try {
      await updateReceivable(
        editingReceivable.id,
        {
          description: editingReceivable.description,
          originalAmount: Number(editingReceivable.originalAmount),
          dueDate: editingReceivable.dueDate,
          competence: editingReceivable.competence,
          paymentMethod: editingReceivable.paymentMethod,
        },
        user?.email || 'somosraon@gmail.com'
      );
      setEditingReceivable(null);
      alert('✓ Cobrança atualizada com sucesso! O Dashboard foi atualizado.');
      onRefresh();
    } catch (err: any) {
      alert('Erro ao salvar alterações na cobrança: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Save edited expense
  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      await updateExpense(
        editingExpense.id,
        {
          description: editingExpense.description,
          amount: Number(editingExpense.amount),
          dueDate: editingExpense.dueDate,
          categoryName: editingExpense.categoryName,
          supplierName: editingExpense.supplierName,
        },
        user?.email || 'somosraon@gmail.com'
      );
      setEditingExpense(null);
      alert('✓ Despesa atualizada com sucesso! O Dashboard foi atualizado.');
      onRefresh();
    } catch (err: any) {
      alert('Erro ao salvar alterações na despesa: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Trigger WhatsApp Modal for Receivable
  const handleWhatsAppForReceivable = (rec: Receivable) => {
    const cl = clients.find((c) => c.id === rec.clientId);
    setTargetClient({
      id: rec.clientId,
      name: rec.clientName,
      responsible: cl?.responsibleName || rec.clientName,
      phone: cl?.whatsapp || '',
    });
    const isOverdue = rec.status === 'vencido';
    setWhatsAppTpl(isOverdue ? 'cobranca_atraso' : 'cobranca_hoje');
    setWhatsAppVars({
      valor: formatCurrency(rec.originalAmount),
      vencimento: rec.dueDate,
      plano: cl?.planName || 'Mensalidade',
    });
    setWhatsAppOpen(true);
  };

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRec.clientId || !newRec.originalAmount) return;
    const cl = clients.find((c) => c.id === newRec.clientId);
    try {
      await createReceivable(
        {
          clientId: newRec.clientId,
          clientName: cl?.companyName || 'Cliente',
          description: newRec.description || `Mensalidade ${newRec.competence} — ${cl?.companyName}`,
          dueDate: newRec.dueDate,
          competence: newRec.competence,
          originalAmount: Number(newRec.originalAmount),
          discountAmount: 0,
          paidAmount: 0,
          status: 'pendente',
          paymentMethod: newRec.paymentMethod,
        },
        user?.email || 'somosraon@gmail.com'
      );
      setIsNewReceivableOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.description || !newExp.amount) return;
    try {
      await createExpense(
        {
          ...newExp,
          amount: Number(newExp.amount),
        },
        user?.email || 'somosraon@gmail.com'
      );
      setIsNewExpenseOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Gestão Financeira Integrada
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Contas a Receber, Contas a Pagar e Fluxo de Caixa da Agência Raon.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewRec({
                clientId: clients[0]?.id || '',
                description: '',
                dueDate: new Date().toISOString().split('T')[0],
                competence: selectedCompetence === 'todas' ? `${currentMonthNum}/${currentYear}` : selectedCompetence,
                originalAmount: 0,
                paymentMethod: 'PIX',
              });
              setIsNewReceivableOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ A Receber</span>
          </button>

          <button
            onClick={() => {
              setNewExp({
                categoryId: categories[0]?.id || '',
                categoryName: categories[0]?.name || 'Ferramentas de IA & Design',
                description: '',
                dueDate: new Date().toISOString().split('T')[0],
                competence: selectedCompetence === 'todas' ? `${currentMonthNum}/${currentYear}` : selectedCompetence,
                amount: 0,
                supplierName: '',
                status: 'pendente',
                paymentMethod: 'Cartão Corporativo',
              });
              setIsNewExpenseOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF7817] hover:bg-[#E5680E] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ A Pagar (Despesa)</span>
          </button>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Recebido (Realizado)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            {formatCurrency(cashFlowMetrics.totalRecebidoEntradas)}
          </p>
          <span className="text-[10px] text-slate-400">Entradas liquidadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Despesas Pagas</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2 truncate">
            {formatCurrency(cashFlowMetrics.totalPagoSaidas)}
          </p>
          <span className="text-[10px] text-slate-400">Custos operacionais quitados</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Saldo Atual (Caixa)</span>
            <div className="p-2 rounded-xl bg-[#0878D9]/10 text-[#0878D9]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-black mt-2 truncate ${
              cashFlowMetrics.saldoRealizado >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(cashFlowMetrics.saldoRealizado)}
          </p>
          <span className="text-[10px] text-slate-400">Recebido menos pago</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Inadimplência / Vencido</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-red-600 dark:text-red-400 mt-2 truncate">
            {formatCurrency(cashFlowMetrics.totalVencidoEntradas)}
          </p>
          <span className="text-[10px] text-slate-400">Cobranças em atraso</span>
        </div>
      </div>

      {/* Tabs Bar & Competence Filter */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* SubTab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('receber')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'receber'
                ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Contas a Receber ({filteredReceivables.length})
          </button>

          <button
            onClick={() => setActiveSubTab('pagar')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'pagar'
                ? 'bg-white dark:bg-[#10192A] text-[#FF7817] shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Contas a Pagar ({filteredExpenses.length})
          </button>

          <button
            onClick={() => setActiveSubTab('fluxo')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'fluxo'
                ? 'bg-white dark:bg-[#10192A] text-[#102B59] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Fluxo de Caixa
          </button>
        </div>

        {/* Competence & Status select */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400">Competência:</span>
          <select
            value={selectedCompetence}
            onChange={(e) => setSelectedCompetence(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="todas">Todas as Competências</option>
            <option value="11/2026">11/2026 (Mês Atual)</option>
            <option value="12/2026">12/2026</option>
            <option value="01/2027">01/2027</option>
            <option value="10/2026">10/2026</option>
          </select>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: CONTAS A RECEBER ==================== */}
      {activeSubTab === 'receber' && (
        <div className="space-y-3.5">
          {/* Source Filter Switcher (Fonte A, Fonte B, Fonte C, Todas) */}
          <div className="p-3 bg-white dark:bg-[#10192A] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Fonte de Receita:
              </span>
              <button
                onClick={() => setSourceFilter('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sourceFilter === 'todas'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todas as Receitas
              </button>
              <button
                onClick={() => setSourceFilter('agencia')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceFilter === 'agencia'
                    ? 'bg-[#0878D9] text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-[#0878D9] hover:bg-blue-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Contratos da Agência (Fonte A)
              </button>
              <button
                onClick={() => setSourceFilter('produto')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceFilter === 'produto'
                    ? 'bg-[#FF7817] text-white shadow-xs'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7817] hover:bg-orange-100'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Produtos (Fonte B)
              </button>
              <button
                onClick={() => setSourceFilter('servico_avulso')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceFilter === 'servico_avulso'
                    ? 'bg-[#102B59] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-[#102B59] dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Serviços Avulsos (Fonte C)
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Mostrando <strong>{filteredReceivables.length}</strong> cobranças
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                  <th className="py-3 px-4">Cliente / Origem / Descrição</th>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor Original</th>
                  <th className="py-3 px-4">Valor Pago</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações & WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhum recebível registrado nesta categoria/competência.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((r) => {
                    const statusColors: Record<ReceivableStatus, string> = {
                      recebido: 'bg-emerald-500/10 text-emerald-600',
                      pendente: 'bg-amber-500/10 text-amber-600',
                      parcial: 'bg-blue-500/10 text-[#0878D9]',
                      vencido: 'bg-red-500/10 text-red-600',
                      cancelado: 'bg-slate-500/10 text-slate-400',
                    };

                    const rSource = r.revenueSource || (r.saleId ? 'produto' : 'agencia');

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {r.clientName}
                            </span>
                            {rSource === 'produto' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-[#FF7817] border border-orange-500/20 inline-flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" /> Produto
                              </span>
                            )}
                            {rSource === 'servico_avulso' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-1">
                                <Layers className="w-2.5 h-2.5" /> Serviço Avulso
                              </span>
                            )}
                            {rSource === 'agencia' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-[#0878D9] border border-blue-500/20 inline-flex items-center gap-1">
                                <Briefcase className="w-2.5 h-2.5" /> Agência
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{r.description}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">{r.competence}</td>
                        <td className="py-3 px-4">{r.dueDate}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                          {formatCurrency(r.originalAmount)}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          {formatCurrency(r.paidAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              statusColors[r.status] || statusColors.pendente
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* WhatsApp button */}
                          <button
                            onClick={() => handleWhatsAppForReceivable(r)}
                            className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-xs"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Se já foi recebido ou tem valor pago, permitir ESTORNAR */}
                          {(r.status === 'recebido' || (Number(r.paidAmount) || 0) > 0) && (
                            <button
                              onClick={() => handleReverseReceivable(r)}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-500/30 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs"
                              title="Estornar recebimento (reverte para pendente e deduz do Dashboard)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Estornar</span>
                            </button>
                          )}

                          {/* Se não está totalmente recebido, botão Dar Baixa */}
                          {r.status !== 'recebido' && (
                            <button
                              onClick={() => {
                                setSelectedReceivableForPayment(r);
                                setPaymentAmount(r.originalAmount - (r.paidAmount || 0));
                                setPaymentDiscount(0);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              title="Confirmar recebimento e lançar no Dashboard"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Dar Baixa</span>
                            </button>
                          )}

                          {/* Editar cobrança */}
                          <button
                            onClick={() => setEditingReceivable(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0878D9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar valor ou vencimento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir cobrança lançada errada */}
                          <button
                            onClick={() => handleDeleteReceivable(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Excluir cobrança lançada errada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* ==================== SUB-TAB 2: CONTAS A PAGAR ==================== */}
      {activeSubTab === 'pagar' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                <th className="py-3 px-4">Descrição / Fornecedor</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhuma despesa registrada nesta competência.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{e.description}</div>
                      <div className="text-[11px] text-slate-400">{e.supplierName || 'Despesa Operacional'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        {e.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4">{e.dueDate}</td>
                    <td className="py-3 px-4 font-bold text-rose-600">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          e.status === 'pago'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : e.status === 'vencido'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {e.status !== 'pago' ? (
                          <button
                            onClick={async () => {
                              await updateExpense(e.id, { status: 'pago', paymentDate: new Date().toISOString().split('T')[0] }, user?.email || 'somosraon@gmail.com');
                              onRefresh();
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                          >
                            Pagar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReverseExpense(e)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-500/30 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs"
                            title="Estornar quitação desta despesa (recalcula no Dashboard)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Estornar</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingExpense(e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0878D9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar despesa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteExpense(e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== SUB-TAB 3: FLUXO DE CAIXA ==================== */}
      {activeSubTab === 'fluxo' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-white">
              Demonstrativo Operacional do Fluxo de Caixa ({selectedCompetence})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Entradas */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-black uppercase text-emerald-600">Entradas (Receitas)</span>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Receitas Previstas (Mensalidades):</span>
                  <strong className="text-slate-800 dark:text-white">{formatCurrency(cashFlowMetrics.totalPrevistoEntradas)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Recebimentos Confirmados (Caixa):</span>
                  <strong className="text-emerald-600">{formatCurrency(cashFlowMetrics.totalRecebidoEntradas)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Pendentes no Mês:</span>
                  <strong className="text-amber-600">{formatCurrency(cashFlowMetrics.totalPendenteEntradas)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Vencidos / Atrasos:</span>
                  <strong className="text-red-600">{formatCurrency(cashFlowMetrics.totalVencidoEntradas)}</strong>
                </div>
              </div>

              {/* Saídas */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-black uppercase text-rose-600">Saídas (Despesas)</span>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Despesas Totais Previstas:</span>
                  <strong className="text-slate-800 dark:text-white">{formatCurrency(cashFlowMetrics.totalPrevistoSaidas)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Despesas Quitadas:</span>
                  <strong className="text-rose-600">{formatCurrency(cashFlowMetrics.totalPagoSaidas)}</strong>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Despesas Pendentes de Pagamento:</span>
                  <strong className="text-amber-600">{formatCurrency(cashFlowMetrics.totalPrevistoSaidas - cashFlowMetrics.totalPagoSaidas)}</strong>
                </div>
              </div>
            </div>

            {/* Resultado Líquido */}
            <div className="mt-4 p-4 rounded-xl bg-[#102B59] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-[#0878D9]">Resultado Operacional Realizado</span>
                <p className="text-sm text-slate-300">Receitas Recebidas menos Despesas Pagas no período</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${cashFlowMetrics.saldoRealizado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(cashFlowMetrics.saldoRealizado)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REGISTRAR BAIXA / PAGAMENTO ==================== */}
      {isPaymentModalOpen && selectedReceivableForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Recebimento / Baixa</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-400">Cliente:</span>
                <p className="font-bold text-slate-800 dark:text-white text-sm">
                  {selectedReceivableForPayment.clientName}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Valor Total: {formatCurrency(selectedReceivableForPayment.originalAmount)}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Valor Pago (Permite Pagamento Parcial) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Desconto Concedido (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentDiscount}
                  onChange={(e) => setPaymentDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Data do Recebimento</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVO RECEBÍVEL ==================== */}
      {isNewReceivableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Novo Lançamento a Receber</h3>
              <button
                onClick={() => setIsNewReceivableOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReceivable} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Cliente *</label>
                <select
                  required
                  value={newRec.clientId}
                  onChange={(e) => setNewRec({ ...newRec, clientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Descrição</label>
                <input
                  type="text"
                  value={newRec.description}
                  onChange={(e) => setNewRec({ ...newRec, description: e.target.value })}
                  placeholder="Ex: Mensalidade avulsa / Projeto Landing Page"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRec.originalAmount}
                    onChange={(e) => setNewRec({ ...newRec, originalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newRec.dueDate}
                    onChange={(e) => setNewRec({ ...newRec, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewReceivableOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVA DESPESA ==================== */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Novo Lançamento de Despesa</h3>
              <button
                onClick={() => setIsNewExpenseOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  placeholder="Ex: Assinatura Midjourney, Hospedagem, Internet..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Categoria</label>
                <select
                  value={newExp.categoryName}
                  onChange={(e) => setNewExp({ ...newExp, categoryName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExp.amount}
                    onChange={(e) => setNewExp({ ...newExp, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={newExp.dueDate}
                    onChange={(e) => setNewExp({ ...newExp, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Fornecedor / Favorecido</label>
                <input
                  type="text"
                  value={newExp.supplierName}
                  onChange={(e) => setNewExp({ ...newExp, supplierName: e.target.value })}
                  placeholder="Ex: Google Cloud, OpenAI, Provedor..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF7817] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR COBRANÇA ==================== */}
      {editingReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#0878D9] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Cobrança / Valor</h3>
              <button
                onClick={() => setEditingReceivable(null)}
                className="p-1 text-blue-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditReceivable} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Cliente</label>
                <input
                  type="text"
                  disabled
                  value={editingReceivable.clientName}
                  className="w-full mt-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Descrição *</label>
                <input
                  type="text"
                  required
                  value={editingReceivable.description}
                  onChange={(e) => setEditingReceivable({ ...editingReceivable, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Valor Original (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingReceivable.originalAmount}
                    onChange={(e) => setEditingReceivable({ ...editingReceivable, originalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={editingReceivable.dueDate}
                    onChange={(e) => setEditingReceivable({ ...editingReceivable, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Competência</label>
                  <input
                    type="text"
                    value={editingReceivable.competence}
                    onChange={(e) => setEditingReceivable({ ...editingReceivable, competence: e.target.value })}
                    placeholder="MM/AAAA"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Forma de Pagamento</label>
                  <select
                    value={editingReceivable.paymentMethod || 'PIX'}
                    onChange={(e) => setEditingReceivable({ ...editingReceivable, paymentMethod: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingReceivable(null)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDITAR DESPESA ==================== */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Despesa</h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Descrição da Despesa *</label>
                <input
                  type="text"
                  required
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.dueDate}
                    onChange={(e) => setEditingExpense({ ...editingExpense, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Fornecedor / Favorecido</label>
                <input
                  type="text"
                  value={editingExpense.supplierName || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, supplierName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF7817] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {targetClient && (
        <WhatsAppModal
          isOpen={whatsAppOpen}
          onClose={() => {
            setWhatsAppOpen(false);
            setTargetClient(null);
          }}
          clientId={targetClient.id}
          clientName={targetClient.name}
          responsibleName={targetClient.responsible}
          phone={targetClient.phone}
          userEmail={user?.email || 'somosraon@gmail.com'}
          defaultTemplate={whatsAppTpl}
          variables={whatsAppVars}
        />
      )}
    </div>
  );
};
