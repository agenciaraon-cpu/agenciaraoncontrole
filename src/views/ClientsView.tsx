import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  MessageCircle,
  ExternalLink,
  Edit2,
  Eye,
  Calendar,
  Building2,
  Phone,
  Mail,
  Instagram,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase,
  X,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';
import { Client, ClientStatus, Contract, Receivable, Task, AppDocument, ContactLog } from '../types';
import { createClient, updateClient, deleteClient, createContract } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { WhatsAppModal, WhatsAppTemplateKey } from '../components/common/WhatsAppModal';

interface ClientsViewProps {
  clients: Client[];
  contracts: Contract[];
  receivables: Receivable[];
  tasks: Task[];
  documents: AppDocument[];
  contactLogs: ContactLog[];
  onRefresh: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  contracts,
  receivables,
  tasks,
  documents,
  contactLogs,
  onRefresh,
}) => {
  const { user, isAdmin, isFinancial } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);

  // WhatsApp Modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [targetWhatsAppClient, setTargetWhatsAppClient] = useState<Client | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<WhatsAppTemplateKey>('boas_vindas');
  const [whatsAppVariables, setWhatsAppVariables] = useState<any>({});

  // Form State for New Client
  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    responsibleName: '',
    taxId: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Feira de Santana',
    state: 'BA',
    instagram: '',
    responsibleBirthDate: '',
    companyAnniversaryDate: '',
    entryDate: new Date().toISOString().split('T')[0],
    planName: 'Plano Start Bronze',
    monthlyFee: 650,
    dueDay: 10,
    status: 'ativo' as ClientStatus,
    notes: '',
  });

  const nextAutoCode = useMemo(() => {
    const nums = clients
      .map((c) => {
        const m = (c.code || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `RAON-${String(max + 1).padStart(3, '0')}`;
  }, [clients]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.whatsapp || '').includes(searchTerm);

      const matchStatus = statusFilter === 'todos' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const handleOpenWhatsApp = (
    client: Client,
    template: WhatsAppTemplateKey = 'boas_vindas',
    variables: any = {}
  ) => {
    setTargetWhatsAppClient(client);
    setWhatsAppTemplate(template);
    setWhatsAppVariables({
      valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.monthlyFee || 0),
      vencimento: `dia ${client.dueDay}`,
      plano: client.planName,
      ...variables,
    });
    setWhatsAppModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.responsibleName || !formData.whatsapp) {
      alert('Por favor, preencha os campos obrigatórios (Razão Social, Responsável e WhatsApp).');
      return;
    }

    try {
      const userEmail = user?.email || 'somosraon@gmail.com';
      const newClientId = await createClient(
        {
          ...formData,
          code: nextAutoCode,
          monthlyFee: Number(formData.monthlyFee) || 0,
          dueDay: Number(formData.dueDay) || 10,
        },
        userEmail
      );

      // Automatically generate contract and recurring receivables
      if (Number(formData.monthlyFee) > 0) {
        await createContract(
          {
            contractNumber: `CTR-${new Date().getFullYear()}-${String(clients.length + 1).padStart(3, '0')}`,
            clientId: newClientId,
            clientName: formData.companyName,
            planId: '',
            planName: formData.planName,
            monthlyFee: Number(formData.monthlyFee),
            startDate: formData.entryDate,
            dueDay: Number(formData.dueDay),
            paymentMethod: 'PIX',
            discount: 0,
            services: [],
            status: 'vigente',
            createdAt: new Date().toISOString(),
          },
          userEmail,
          6 // 6 months of receivables generated
        );
      }

      setIsNewModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
      alert('Não foi possível salvar o cliente. Verifique as permissões.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Gestão de Clientes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0878D9]/10 text-[#0878D9] text-xs font-bold">
              {filteredClients.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle comercial, histórico de contratos e contato direto com os clientes da Agência Raon.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              companyName: '',
              tradeName: '',
              responsibleName: '',
              taxId: '',
              phone: '',
              whatsapp: '',
              email: '',
              address: '',
              city: 'Feira de Santana',
              state: 'BA',
              instagram: '',
              responsibleBirthDate: '',
              companyAnniversaryDate: '',
              entryDate: new Date().toISOString().split('T')[0],
              planName: 'Plano Start Bronze',
              monthlyFee: 650,
              dueDay: 10,
              status: 'ativo',
              notes: '',
            });
            setIsNewModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md shadow-[#0878D9]/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa, responsável, código ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0878D9]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 shrink-0">Status:</span>
          {(['todos', 'ativo', 'inativo', 'suspenso', 'cancelado'] as const).map((st) => (
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

      {/* Clients Table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Empresa / Responsável</th>
                <th className="py-3 px-4">Plano Contratado</th>
                <th className="py-3 px-4">Mensalidade</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const statusStyles: Record<ClientStatus, string> = {
                    ativo: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                    inativo: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
                    suspenso: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
                    cancelado: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
                  };

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0878D9]">
                        {client.code || 'RAON'}
                      </td>

                      {/* Company & Responsible */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {client.companyName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{client.responsibleName}</span>
                          {client.instagram && (
                            <span className="text-[#0878D9]">{client.instagram}</span>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {client.planName || 'Plano Personalizado'}
                        </span>
                      </td>

                      {/* Monthly Fee */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">
                        {formatCurrency(client.monthlyFee)}
                      </td>

                      {/* Due Day */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Dia {client.dueDay}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                            statusStyles[client.status] || statusStyles.ativo
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mandatory WhatsApp Button in every row */}
                          <button
                            onClick={() => handleOpenWhatsApp(client, 'lembrete_vencimento')}
                            className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white transition-all shadow-xs"
                            title={`Abrir WhatsApp com ${client.responsibleName}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Full Client File Trigger */}
                          <button
                            onClick={() => setSelectedClientForDetail(client)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0878D9]/10 hover:bg-[#0878D9] text-[#0878D9] hover:text-white font-bold text-xs transition-colors"
                            title="Abrir Ficha Completa do Cliente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ficha</span>
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

      {/* ==================== MODAL: NOVO CLIENTE ==================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#102B59] text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FF7817]" />
                <h3 className="font-bold text-lg">Novo Cadastro de Cliente — Agência Raon</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#0878D9]">Código Automático Gerado:</span>
                  <p className="font-mono text-base font-black text-slate-800 dark:text-white">
                    {nextAutoCode}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  Cadastrado na base interna da Raon
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="Ex: Studio Pilates Viver Bem Ltda"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="Ex: Viver Bem Pilates"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsibleName}
                    onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="Ex: Juliana Castro"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="Ex: 00.000.000/0001-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    WhatsApp Oficial (com DDD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="Ex: 75988221133"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    E-mail do Cliente
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="contato@cliente.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Instagram do Cliente
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="@perfil.cliente"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Data de Nascimento do Responsável
                  </label>
                  <input
                    type="date"
                    value={formData.responsibleBirthDate}
                    onChange={(e) => setFormData({ ...formData, responsibleBirthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Plano Contratado
                  </label>
                  <select
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                  >
                    <option value="Plano Start Bronze">Plano Start Bronze</option>
                    <option value="Plano Prata Plus">Plano Prata Plus</option>
                    <option value="Plano Gold Essencial">Plano Gold Essencial</option>
                    <option value="Plano Personalizado">Plano Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Valor Mensal Negociado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="650.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Dia de Vencimento da Mensalidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value, 10) || 10 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Data de Entrada na Agência
                  </label>
                  <input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Observações e Diretrizes Estratégicas
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0878D9]"
                  placeholder="Objetivos do cliente, nicho, observações da negociação..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Salvar Cliente e Gerar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== FICHA INDIVIDUAL DO CLIENTE (7 ABAS OBRIGATÓRIAS) ==================== */}
      {selectedClientForDetail && (
        <ClientDetailModal
          client={selectedClientForDetail}
          contracts={contracts.filter((c) => c.clientId === selectedClientForDetail.id)}
          receivables={receivables.filter((r) => r.clientId === selectedClientForDetail.id)}
          tasks={tasks.filter((t) => t.clientId === selectedClientForDetail.id)}
          documents={documents.filter((d) => d.clientId === selectedClientForDetail.id)}
          contactLogs={contactLogs.filter((l) => l.clientId === selectedClientForDetail.id)}
          onClose={() => setSelectedClientForDetail(null)}
          onOpenWhatsApp={(tpl) => handleOpenWhatsApp(selectedClientForDetail, tpl)}
          onRefresh={onRefresh}
        />
      )}

      {/* ==================== WHATSAPP DISPATCHER MODAL ==================== */}
      {targetWhatsAppClient && (
        <WhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setTargetWhatsAppClient(null);
          }}
          clientId={targetWhatsAppClient.id}
          clientName={targetWhatsAppClient.companyName}
          responsibleName={targetWhatsAppClient.responsibleName}
          phone={targetWhatsAppClient.whatsapp}
          userEmail={user?.email || 'somosraon@gmail.com'}
          defaultTemplate={whatsAppTemplate}
          variables={whatsAppVariables}
        />
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTE: FICHA INDIVIDUAL DO CLIENTE ====================
interface ClientDetailModalProps {
  client: Client;
  contracts: Contract[];
  receivables: Receivable[];
  tasks: Task[];
  documents: AppDocument[];
  contactLogs: ContactLog[];
  onClose: () => void;
  onOpenWhatsApp: (tpl?: WhatsAppTemplateKey) => void;
  onRefresh: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  contracts,
  receivables,
  tasks,
  documents,
  contactLogs,
  onClose,
  onOpenWhatsApp,
  onRefresh,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dados' | 'plano' | 'contratos' | 'financeiro' | 'tarefas' | 'documentos' | 'contatos'
  >('dados');

  const [editClient, setEditClient] = useState({ ...client });
  const [isSaving, setIsSaving] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const handleSaveGeneralData = async () => {
    setIsSaving(true);
    try {
      await updateClient(
        client.id,
        {
          companyName: editClient.companyName,
          tradeName: editClient.tradeName,
          responsibleName: editClient.responsibleName,
          taxId: editClient.taxId,
          phone: editClient.phone,
          whatsapp: editClient.whatsapp,
          email: editClient.email,
          address: editClient.address,
          city: editClient.city,
          state: editClient.state,
          instagram: editClient.instagram,
          monthlyFee: Number(editClient.monthlyFee),
          dueDay: Number(editClient.dueDay),
          status: editClient.status,
          notes: editClient.notes,
        },
        user?.email || 'somosraon@gmail.com'
      );
      onRefresh();
      alert('Dados do cliente atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0878D9] text-white font-mono font-black text-sm">
              {client.code || 'RAON'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{client.companyName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white">
                  {client.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Responsável: <strong className="text-white">{client.responsibleName}</strong> |{' '}
                {client.planName || 'Plano Personalizado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct WhatsApp in all Client Files */}
            <button
              onClick={() => onOpenWhatsApp('lembrete_vencimento')}
              className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7 Functional Tabs Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-x-auto shrink-0">
          {[
            { id: 'dados', label: '1. Dados Gerais' },
            { id: 'plano', label: '2. Plano & Serviços' },
            { id: 'contratos', label: `3. Contratos (${contracts.length})` },
            { id: 'financeiro', label: `4. Financeiro (${receivables.length})` },
            { id: 'tarefas', label: `5. Tarefas (${tasks.length})` },
            { id: 'documentos', label: `6. Documentos (${documents.length})` },
            { id: 'contatos', label: `7. Histórico Contatos (${contactLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#0878D9] text-[#0878D9] bg-white dark:bg-[#10192A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DADOS GERAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">Razão Social</label>
                  <input
                    type="text"
                    value={editClient.companyName}
                    onChange={(e) => setEditClient({ ...editClient, companyName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Nome Fantasia</label>
                  <input
                    type="text"
                    value={editClient.tradeName || ''}
                    onChange={(e) => setEditClient({ ...editClient, tradeName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Responsável</label>
                  <input
                    type="text"
                    value={editClient.responsibleName}
                    onChange={(e) => setEditClient({ ...editClient, responsibleName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">WhatsApp</label>
                  <input
                    type="text"
                    value={editClient.whatsapp}
                    onChange={(e) => setEditClient({ ...editClient, whatsapp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">E-mail</label>
                  <input
                    type="email"
                    value={editClient.email || ''}
                    onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Instagram</label>
                  <input
                    type="text"
                    value={editClient.instagram || ''}
                    onChange={(e) => setEditClient({ ...editClient, instagram: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Endereço & Cidade</label>
                  <input
                    type="text"
                    value={editClient.address || ''}
                    onChange={(e) => setEditClient({ ...editClient, address: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Status</label>
                  <select
                    value={editClient.status}
                    onChange={(e) => setEditClient({ ...editClient, status: e.target.value as ClientStatus })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">Observações Internas</label>
                <textarea
                  rows={3}
                  value={editClient.notes || ''}
                  onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveGeneralData}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PLANO & SERVIÇOS */}
          {activeTab === 'plano' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400">Modalidade Oficial Contratada:</span>
                <h3 className="text-lg font-black text-[#102B59] dark:text-white mt-1">
                  {client.planName || 'Plano Personalizado'}
                </h3>
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Mensalidade: <strong className="text-slate-900 dark:text-white">{formatCurrency(client.monthlyFee)}</strong></span>
                  <span>Vencimento: <strong className="text-slate-900 dark:text-white">Dia {client.dueDay}</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Os serviços inclusos neste plano são gerenciados no módulo de contratos.
              </p>
            </div>
          )}

          {/* TAB 3: CONTRATOS */}
          {activeTab === 'contratos' && (
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum contrato formal registrado para este cliente.
                </div>
              ) : (
                contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#0878D9]">{c.contractNumber}</span>
                        <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        {c.planName} — Mensalidade de {formatCurrency(c.monthlyFee)} (Vencimento dia {c.dueDay})
                      </p>
                      <span className="text-[11px] text-slate-400">
                        Início: {c.startDate} {c.endDate ? `até ${c.endDate}` : '(Recorrente sem término)'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: FINANCEIRO (EXTRATO) */}
          {activeTab === 'financeiro' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase">Total Recebido</span>
                  <p className="text-lg font-black mt-1">
                    {formatCurrency(
                      receivables.reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0)
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase">Pendente</span>
                  <p className="text-lg font-black mt-1">
                    {formatCurrency(
                      receivables
                        .filter((r) => r.status === 'pendente')
                        .reduce((acc, r) => acc + (Number(r.originalAmount) || 0), 0)
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20">
                  <span className="text-[10px] font-bold uppercase">Vencido</span>
                  <p className="text-lg font-black mt-1">
                    {formatCurrency(
                      receivables
                        .filter((r) => r.status === 'vencido')
                        .reduce((acc, r) => acc + (Number(r.originalAmount) || 0), 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-2">Competência</th>
                      <th className="py-2">Vencimento</th>
                      <th className="py-2">Valor</th>
                      <th className="py-2">Pago</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receivables.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 font-bold">{r.competence}</td>
                        <td className="py-2.5">{r.dueDate}</td>
                        <td className="py-2.5">{formatCurrency(r.originalAmount)}</td>
                        <td className="py-2.5 font-bold text-emerald-600">{formatCurrency(r.paidAmount)}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'recebido'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : r.status === 'vencido'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() =>
                              onOpenWhatsApp(
                                r.status === 'vencido' ? 'cobranca_atraso' : 'cobranca_hoje'
                              )
                            }
                            className="p-1 rounded text-[#25D366] hover:bg-[#25D366]/10"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TAREFAS */}
          {activeTab === 'tarefas' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma tarefa vinculada a este cliente.
                </div>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>
                      <span className="text-[10px] text-slate-400">Prazo: {t.dueDate}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-[#0878D9]">
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum documento anexado.
                </div>
              ) : (
                documents.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0878D9]" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.name}</p>
                        <span className="text-[10px] text-slate-400 uppercase">{d.category}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: HISTÓRICO DE CONTATOS */}
          {activeTab === 'contatos' && (
            <div className="space-y-3">
              {contactLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum registro de contato efetuado ainda.
                </div>
              ) : (
                contactLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0878D9] flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                        {log.templateUsed || 'Mensagem WhatsApp'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt || '').toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-white dark:bg-[#10192A] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                      {log.messageContent}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Enviado por: {log.sentBy}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
