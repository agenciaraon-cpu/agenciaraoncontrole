import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Check,
  Plus,
  Sliders,
  DollarSign,
  Tag,
  Clock,
  Edit2,
  Trash2,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';
import { Plan, ServiceItem } from '../types';
import { createService, updateService, deleteService } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface PlansServicesViewProps {
  plans: Plan[];
  services: ServiceItem[];
  onRefresh: () => void;
}

export const PlansServicesView: React.FC<PlansServicesViewProps> = ({
  plans,
  services,
  onRefresh,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'planos' | 'catalogo' | 'construtor'>('planos');

  // New service modal
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    category: 'Redes Sociais',
    description: '',
    frequency: 'Mensal',
    estimatedQty: 1,
    referencePrice: 0,
    active: true,
  });

  // Custom Plan Builder State
  const [customPlanName, setCustomPlanName] = useState('Plano Sob Medida');
  const [selectedServices, setSelectedServices] = useState<Record<string, { quantity: number; frequency: string; customPrice: number }>>({});
  const [negotiatedMonthlyTotal, setNegotiatedMonthlyTotal] = useState<number>(0);
  const [customNotes, setCustomNotes] = useState('');

  const toggleCustomService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const copy = { ...prev };
      if (copy[serviceId]) {
        delete copy[serviceId];
      } else {
        const s = services.find((item) => item.id === serviceId);
        copy[serviceId] = {
          quantity: s?.estimatedQty || 1,
          frequency: s?.frequency || 'Mensal',
          customPrice: s?.referencePrice || 0,
        };
      }
      return copy;
    });
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceData.name) return;
    try {
      await createService(
        {
          ...newServiceData,
          estimatedQty: Number(newServiceData.estimatedQty) || 1,
          referencePrice: Number(newServiceData.referencePrice) || 0,
        },
        user?.email || 'somosraon@gmail.com'
      );
      setIsNewServiceModalOpen(false);
      setNewServiceData({
        name: '',
        category: 'Redes Sociais',
        description: '',
        frequency: 'Mensal',
        estimatedQty: 1,
        referencePrice: 0,
        active: true,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar serviço.');
    }
  };

  const handleDeleteService = async (s: ServiceItem) => {
    if (!confirm(`Deseja realmente desativar o serviço "${s.name}"?`)) return;
    try {
      await deleteService(s.id, s.name, user?.email || 'somosraon@gmail.com');
      onRefresh();
    } catch (err) {
      console.error(err);
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
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Planos Oficiais & Catálogo de Serviços
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Modalidades padrão da Agência Raon e construtor sob medida para contratos personalizados.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('planos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'planos'
                ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Planos Oficiais
          </button>
          <button
            onClick={() => setActiveSubTab('construtor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'construtor'
                ? 'bg-white dark:bg-[#10192A] text-[#FF7817] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Montar Personalizado
          </button>
          <button
            onClick={() => setActiveSubTab('catalogo')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'catalogo'
                ? 'bg-white dark:bg-[#10192A] text-[#102B59] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Catálogo ({services.length})
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: PLANOS OFICIAIS ==================== */}
      {activeSubTab === 'planos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. START BRONZE */}
            <div className="relative rounded-2xl bg-white dark:bg-[#10192A] border-2 border-[#CD7F32]/40 shadow-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#CD7F32]/10 text-[#CD7F32]">
                    Entrada Profissional
                  </span>
                  <span className="text-xs font-bold text-slate-400">Bronze</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  Plano Start Bronze
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Ideal para empresas que desejam iniciar sua presença digital de maneira profissional.
                </p>

                <div className="my-4 py-3 border-y border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Serviços Inclusos:
                  </span>
                  <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CD7F32] shrink-0" />
                      <span>Gestão básica do Instagram</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CD7F32] shrink-0" />
                      <span>Artes promocionais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CD7F32] shrink-0" />
                      <span>Stories estratégicos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CD7F32] shrink-0" />
                      <span>Planejamento de conteúdo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#CD7F32] shrink-0" />
                      <span>Suporte online</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                <span className="text-[11px] text-slate-500 font-medium">
                  Valor definido sob negociação do administrador
                </span>
              </div>
            </div>

            {/* 2. PRATA PLUS (RECOMENDADO / MAIS POPULAR) */}
            <div className="relative rounded-2xl bg-white dark:bg-[#10192A] border-2 border-[#0878D9] shadow-xl p-6 flex flex-col justify-between ring-2 ring-[#0878D9]/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#0878D9] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                Mais Contratado
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#0878D9]/10 text-[#0878D9]">
                    Crescimento & Vendas
                  </span>
                  <span className="text-xs font-bold text-slate-400">Prata</span>
                </div>
                <h3 className="text-xl font-black text-[#102B59] dark:text-white">
                  Plano Prata Plus
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Ideal para empresas que desejam crescer, fortalecer seus serviços e conquistar mais clientes.
                </p>

                <div className="my-4 py-3 border-y border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Serviços Inclusos:
                  </span>
                  <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Posicionamento digital</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Reels estratégicos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Gestão de redes sociais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Tráfego pago</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Consultoria estratégica</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#0878D9] shrink-0" />
                      <span>Relatórios de desempenho</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl text-center">
                <span className="text-[11px] text-[#0878D9] font-bold">
                  Estratégia completa de alta performance
                </span>
              </div>
            </div>

            {/* 3. GOLD ESSENCIAL */}
            <div className="relative rounded-2xl bg-white dark:bg-[#10192A] border-2 border-[#FF7817]/40 shadow-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FF7817]/10 text-[#FF7817]">
                    Domínio Digital & IA
                  </span>
                  <span className="text-xs font-bold text-slate-400">Gold</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  Plano Gold Essencial
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Ideal para empresas que desejam dominar o digital com estratégias avançadas e tecnologia.
                </p>

                <div className="my-4 py-3 border-y border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Serviços Inclusos:
                  </span>
                  <ul className="mt-2.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>Branding premium</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>IA aplicada ao marketing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>Gestão completa de redes sociais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>Site e landing page</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>Gestão de tráfego pago</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#FF7817] shrink-0" />
                      <span>Estratégia avançada</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl text-center">
                <span className="text-[11px] text-[#FF7817] font-bold">
                  Máxima autoridade e escala tecnológica
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: CONSTRUTOR DE PLANO PERSONALIZADO ==================== */}
      {activeSubTab === 'construtor' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#FF7817]" />
                  Montador de Plano Personalizado
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione qualquer combinação de serviços de todos os planos, ajuste quantidades e defina o valor negociado.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Serviços Selecionados:</span>
                <p className="text-lg font-black text-[#0878D9]">
                  {Object.keys(selectedServices).length} itens
                </p>
              </div>
            </div>

            {/* Checklist of all available services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((s) => {
                const isSelected = !!selectedServices[s.id];

                return (
                  <div
                    key={s.id}
                    onClick={() => toggleCustomService(s.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#0878D9] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-[#0878D9] rounded-sm focus:ring-[#0878D9]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {s.name}
                        </h4>
                      </div>
                      <span className="text-[10px] text-[#0878D9] font-bold uppercase">
                        {s.category}
                      </span>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {s.description || 'Serviço sob demanda'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Config of selected items */}
            {Object.keys(selectedServices).length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Detalhamento de Frequência e Mensalidade Negociada
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Mensalidade Total Negociada (R$) *
                    </label>
                    <input
                      type="number"
                      value={negotiatedMonthlyTotal}
                      onChange={(e) => setNegotiatedMonthlyTotal(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-[#102B59] dark:text-white"
                      placeholder="Ex: 1850.00"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Observações Contratuais da Combinação
                    </label>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                      placeholder="Ex: Ajuste acordado na renovação anual..."
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Ao cadastrar ou editar um contrato de cliente, você pode aplicar esta combinação personalizada diretamente!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: CATÁLOGO DE SERVIÇOS ==================== */}
      {activeSubTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Lista Completa de Serviços da Agência
            </h3>

            <button
              onClick={() => setIsNewServiceModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Serviço</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                  <th className="py-3 px-4">Nome do Serviço</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Frequência</th>
                  <th className="py-3 px-4">Qtd Prevista</th>
                  <th className="py-3 px-4">Preço Ref. (Opcional)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{s.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{s.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">{s.frequency}</td>
                    <td className="py-3 px-4 font-mono">{s.estimatedQty || 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(s.referencePrice || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteService(s)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desativar serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Novo Serviço */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Adicionar Novo Serviço ao Catálogo</h3>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={newServiceData.name}
                  onChange={(e) => setNewServiceData({ ...newServiceData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  placeholder="Ex: Produção de Podcasts"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Categoria</label>
                <input
                  type="text"
                  value={newServiceData.category}
                  onChange={(e) => setNewServiceData({ ...newServiceData, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  placeholder="Ex: Audiovisual, Redes Sociais, Design..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Descrição</label>
                <textarea
                  rows={2}
                  value={newServiceData.description}
                  onChange={(e) => setNewServiceData({ ...newServiceData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  placeholder="Detalhes do que será entregue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Frequência</label>
                  <input
                    type="text"
                    value={newServiceData.frequency}
                    onChange={(e) => setNewServiceData({ ...newServiceData, frequency: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    placeholder="Mensal, Semanal..."
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Preço de Ref. (R$)
                  </label>
                  <input
                    type="number"
                    value={newServiceData.referencePrice}
                    onChange={(e) => setNewServiceData({ ...newServiceData, referencePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
