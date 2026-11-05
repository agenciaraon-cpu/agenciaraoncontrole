import React, { useState } from 'react';
import {
  FileSignature,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Ban,
  Archive,
  Clock,
  Sparkles,
  X,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { Contract, ContractStatus, Client, Plan } from '../types';
import { createContract, updateContract, generateReceivablesForContract } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface ContractsViewProps {
  contracts: Contract[];
  clients: Client[];
  plans: Plan[];
  onRefresh: () => void;
  onOpenWhatsAppForClient?: (clientId: string) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  clients,
  plans,
  onRefresh,
  onOpenWhatsAppForClient,
}) => {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    planName: 'Plano Start Bronze',
    monthlyFee: 650,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dueDay: 10,
    paymentMethod: 'PIX',
    discount: 0,
    notes: '',
  });

  const nextContractNum = `CTR-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`;

  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.planName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert('Selecione um cliente.');
      return;
    }

    const client = clients.find((cl) => cl.id === formData.clientId);
    if (!client) return;

    try {
      await createContract(
        {
          contractNumber: nextContractNum,
          clientId: client.id,
          clientName: client.companyName,
          planId: '',
          planName: formData.planName,
          monthlyFee: Number(formData.monthlyFee) || 0,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          dueDay: Number(formData.dueDay) || 10,
          paymentMethod: formData.paymentMethod,
          discount: Number(formData.discount) || 0,
          services: [],
          notes: formData.notes,
          status: 'vigente',
          createdAt: new Date().toISOString(),
        },
        user?.email || 'somosraon@gmail.com',
        6 // auto generate 6 months of receivables
      );

      setIsNewModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar contrato.');
    }
  };

  const handleUpdateStatus = async (contract: Contract, newStatus: ContractStatus) => {
    if (!confirm(`Confirmar alteração de status para "${newStatus.toUpperCase()}"?`)) return;
    try {
      await updateContract(
        contract.id,
        {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
        user?.email || 'somosraon@gmail.com'
      );
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMoreMonths = async (c: Contract) => {
    try {
      await generateReceivablesForContract(
        c.id,
        c.clientId,
        c.clientName,
        c.monthlyFee,
        c.dueDay,
        new Date().toISOString().split('T')[0],
        6
      );
      alert('Próximas 6 mensalidades verificadas e geradas sem duplicação!');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar mensalidades.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Gestão Contratual & Escopos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de vigências, renovações e automação de mensalidades recorrentes da Agência Raon.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              clientId: clients[0]?.id || '',
              planName: 'Plano Start Bronze',
              monthlyFee: 650,
              startDate: new Date().toISOString().split('T')[0],
              endDate: '',
              dueDay: 10,
              paymentMethod: 'PIX',
              discount: 0,
              notes: '',
            });
            setIsNewModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número do contrato ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0878D9]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['todos', 'vigente', 'renovado', 'suspenso', 'cancelado', 'encerrado'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-[#102B59] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
              <th className="py-3 px-4">Contrato</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Plano</th>
              <th className="py-3 px-4">Mensalidade</th>
              <th className="py-3 px-4">Vencimento</th>
              <th className="py-3 px-4">Vigência</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  Nenhum contrato cadastrado.
                </td>
              </tr>
            ) : (
              filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-bold text-[#0878D9]">
                    {c.contractNumber}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {c.clientName}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    {c.planName}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {formatCurrency(c.monthlyFee)}
                  </td>
                  <td className="py-3 px-4">Dia {c.dueDay}</td>
                  <td className="py-3 px-4 text-[11px] text-slate-500">
                    {c.startDate} {c.endDate ? `até ${c.endDate}` : '(Indeterminado)'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'vigente'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : c.status === 'renovado'
                          ? 'bg-blue-500/10 text-[#0878D9]'
                          : c.status === 'suspenso'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleGenerateMoreMonths(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0878D9] hover:bg-blue-50"
                        title="Gerar / Sincronizar Mensalidades Futuras"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      {c.status === 'vigente' && (
                        <button
                          onClick={() => handleUpdateStatus(c, 'suspenso')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Suspender contrato"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {c.status === 'suspenso' && (
                        <button
                          onClick={() => handleUpdateStatus(c, 'vigente')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Reativar contrato"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Contrato */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Criar Novo Contrato — {nextContractNum}</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Cliente *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => {
                    const c = clients.find((cl) => cl.id === e.target.value);
                    setFormData({
                      ...formData,
                      clientId: e.target.value,
                      monthlyFee: c?.monthlyFee || formData.monthlyFee,
                      dueDay: c?.dueDay || formData.dueDay,
                      planName: c?.planName || formData.planName,
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="">Selecione um cliente cadastrado...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Plano</label>
                  <select
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Plano Start Bronze">Plano Start Bronze</option>
                    <option value="Plano Prata Plus">Plano Prata Plus</option>
                    <option value="Plano Gold Essencial">Plano Gold Essencial</option>
                    <option value="Plano Personalizado">Plano Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Mensalidade (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Data de Término (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value, 10) || 10 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="PIX">PIX (Recomendado)</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-slate-600 dark:text-slate-300 text-[11px]">
                * Ao salvar, o sistema gerará automaticamente as próximas 6 cobranças mensais sem duplicar parcelas já existentes.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
