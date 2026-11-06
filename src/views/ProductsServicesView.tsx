import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Tag,
  Layers,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building,
  User,
  Check,
  Ban,
  FileText,
  Boxes,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ProductService,
  ProductCategory,
  Sale,
  ProductServiceType,
  ProductServiceStatus,
  SaleFinancialStatus,
} from '../types';
import {
  createProductService,
  updateProductService,
  deleteProductService,
  createProductCategory,
  deleteProductCategory,
  createSale,
  confirmSalePayment,
  cancelSale,
} from '../services/db';
import { useAuth } from '../context/AuthContext';

interface ProductsServicesViewProps {
  productsServices: ProductService[];
  productCategories: ProductCategory[];
  sales: Sale[];
  onRefresh: () => void;
}

export const ProductsServicesView: React.FC<ProductsServicesViewProps> = ({
  productsServices,
  productCategories,
  sales,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'vendas' | 'categorias'>('catalogo');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'produto' | 'servico'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modals state
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductService | null>(null);
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [confirmPaymentSale, setConfirmPaymentSale] = useState<Sale | null>(null);
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'produto' | 'servico' | 'ambos'>('ambos');

  // New Item form state
  const [itemFormData, setItemFormData] = useState({
    name: '',
    type: 'servico' as ProductServiceType,
    category: '',
    defaultPrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    description: '',
    status: 'ativo' as ProductServiceStatus,
    notes: '',
  });

  // New Sale form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [saleFormData, setSaleFormData] = useState({
    itemId: '',
    itemName: '',
    itemType: 'servico' as ProductServiceType,
    category: '',
    saleDate: todayStr,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    buyerName: '',
    buyerContact: '',
    paymentMethod: 'PIX',
    financialStatus: 'pago' as SaleFinancialStatus,
    paymentDate: todayStr,
    notes: '',
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Next automatic codes
  const nextItemCode = useMemo(() => {
    const isProd = itemFormData.type === 'produto';
    const prefix = isProd ? 'PRD' : 'SRV';
    const nums = productsServices
      .filter((p) => p.type === itemFormData.type)
      .map((p) => {
        const m = (p.code || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }, [productsServices, itemFormData.type]);

  const nextSaleCode = useMemo(() => {
    const year = new Date().getFullYear();
    const count = sales.length + 1;
    return `VND-${year}-${String(count).padStart(3, '0')}`;
  }, [sales]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return productsServices.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'todos' || item.type === typeFilter;
      const matchCat = categoryFilter === 'todas' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'todos' || item.status === statusFilter;
      return matchSearch && matchType && matchCat && matchStatus;
    });
  }, [productsServices, searchTerm, typeFilter, categoryFilter, statusFilter]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'todos' || s.itemType === typeFilter;
      const matchCat = categoryFilter === 'todas' || s.category === categoryFilter;
      return matchSearch && matchType && matchCat;
    });
  }, [sales, searchTerm, typeFilter, categoryFilter]);

  // Calculated Sale Total
  const calculatedSaleTotal = useMemo(() => {
    const subtotal = (Number(saleFormData.quantity) || 0) * (Number(saleFormData.unitPrice) || 0);
    const discount = Number(saleFormData.discount) || 0;
    return Math.max(0, subtotal - discount);
  }, [saleFormData.quantity, saleFormData.unitPrice, saleFormData.discount]);

  // Metrics for Sales
  const salesMetrics = useMemo(() => {
    const totalSold = sales
      .filter((s) => s.financialStatus !== 'cancelado')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const totalReceived = sales
      .filter((s) => s.financialStatus === 'pago' || s.financialStatus === 'parcial')
      .reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);

    const totalPending = sales
      .filter((s) => s.financialStatus === 'pendente')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const totalCount = sales.filter((s) => s.financialStatus !== 'cancelado').length;

    return { totalSold, totalReceived, totalPending, totalCount };
  }, [sales]);

  // Handlers for Products/Services
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      name: '',
      type: 'servico',
      category: productCategories[0]?.name || 'Serviços Digitais Avulsos',
      defaultPrice: 0,
      costPrice: 0,
      stockQuantity: 0,
      description: '',
      status: 'ativo',
      notes: '',
    });
    setIsNewItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ProductService) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      type: item.type,
      category: item.category,
      defaultPrice: item.defaultPrice,
      costPrice: item.costPrice || 0,
      stockQuantity: item.stockQuantity || 0,
      description: item.description || '',
      status: item.status,
      notes: item.notes || '',
    });
    setIsNewItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name || !itemFormData.category || itemFormData.defaultPrice <= 0) {
      alert('Preencha os campos obrigatórios: Nome, Categoria e Valor de Venda Padrão (maior que zero).');
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = user?.email || 'agenciaraon@gmail.com';
      if (editingItem) {
        await updateProductService(
          editingItem.id,
          {
            ...itemFormData,
            defaultPrice: Number(itemFormData.defaultPrice),
            costPrice: Number(itemFormData.costPrice) || 0,
            stockQuantity: itemFormData.type === 'produto' ? Number(itemFormData.stockQuantity) || 0 : undefined,
          },
          userEmail
        );
        alert(`Item "${itemFormData.name}" atualizado com sucesso!`);
      } else {
        await createProductService(
          {
            ...itemFormData,
            code: nextItemCode,
            defaultPrice: Number(itemFormData.defaultPrice),
            costPrice: Number(itemFormData.costPrice) || 0,
            stockQuantity: itemFormData.type === 'produto' ? Number(itemFormData.stockQuantity) || 0 : undefined,
          },
          userEmail
        );
        alert(`Item "${itemFormData.name}" (${nextItemCode}) cadastrado no catálogo!`);
      }
      setIsNewItemModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar item:', err);
      alert('Erro ao salvar item: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleItemStatus = async (item: ProductService) => {
    const newStatus: ProductServiceStatus = item.status === 'ativo' ? 'inativo' : 'ativo';
    const userEmail = user?.email || 'agenciaraon@gmail.com';
    try {
      await updateProductService(item.id, { status: newStatus }, userEmail);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + (err?.message || ''));
    }
  };

  const handleDeleteItem = async (item: ProductService) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}" do catálogo?`)) return;
    const userEmail = user?.email || 'agenciaraon@gmail.com';
    try {
      await deleteProductService(item.id, item.name, userEmail);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir item: ' + (err?.message || ''));
    }
  };

  // Handlers for Categories
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    try {
      const userEmail = user?.email || 'agenciaraon@gmail.com';
      await createProductCategory({ name: newCatName.trim(), type: newCatType }, userEmail);
      setNewCatName('');
      setIsNewCategoryModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + (err?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
    const userEmail = user?.email || 'agenciaraon@gmail.com';
    try {
      await deleteProductCategory(cat.id, cat.name, userEmail);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir categoria: ' + (err?.message || ''));
    }
  };

  // Handlers for Sales
  const handleOpenNewSale = (presetItem?: ProductService) => {
    const defaultItem = presetItem || productsServices.find((p) => p.status === 'ativo') || productsServices[0];
    if (defaultItem) {
      setSaleFormData({
        itemId: defaultItem.id,
        itemName: defaultItem.name,
        itemType: defaultItem.type,
        category: defaultItem.category,
        saleDate: todayStr,
        quantity: 1,
        unitPrice: defaultItem.defaultPrice,
        discount: 0,
        buyerName: '',
        buyerContact: '',
        paymentMethod: 'PIX',
        financialStatus: 'pago',
        paymentDate: todayStr,
        notes: '',
      });
    } else {
      setSaleFormData({
        itemId: '',
        itemName: '',
        itemType: 'servico',
        category: 'Geral',
        saleDate: todayStr,
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        buyerName: '',
        buyerContact: '',
        paymentMethod: 'PIX',
        financialStatus: 'pago',
        paymentDate: todayStr,
        notes: '',
      });
    }
    setIsNewSaleModalOpen(true);
  };

  const handleSelectItemForSale = (itemId: string) => {
    const found = productsServices.find((p) => p.id === itemId);
    if (found) {
      setSaleFormData((prev) => ({
        ...prev,
        itemId: found.id,
        itemName: found.name,
        itemType: found.type,
        category: found.category,
        unitPrice: found.defaultPrice,
      }));
    }
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleFormData.itemName || saleFormData.unitPrice <= 0 || saleFormData.quantity <= 0) {
      alert('Preencha os dados da venda corretamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = user?.email || 'agenciaraon@gmail.com';
      const isPaid = saleFormData.financialStatus === 'pago';
      const isPartial = saleFormData.financialStatus === 'parcial';
      const paymentDate = (isPaid || isPartial) ? (saleFormData.paymentDate || saleFormData.saleDate) : undefined;
      const paidAmount = isPaid ? calculatedSaleTotal : isPartial ? calculatedSaleTotal : 0;

      await createSale(
        {
          code: nextSaleCode,
          itemId: saleFormData.itemId,
          itemName: saleFormData.itemName,
          itemType: saleFormData.itemType,
          category: saleFormData.category,
          saleDate: saleFormData.saleDate,
          quantity: Number(saleFormData.quantity),
          unitPrice: Number(saleFormData.unitPrice),
          discount: Number(saleFormData.discount) || 0,
          totalAmount: calculatedSaleTotal,
          buyerName: saleFormData.buyerName.trim() || undefined,
          buyerContact: saleFormData.buyerContact.trim() || undefined,
          paymentMethod: saleFormData.paymentMethod,
          financialStatus: saleFormData.financialStatus,
          paymentDate,
          paidAmount,
          notes: saleFormData.notes.trim() || undefined,
        },
        userEmail
      );

      setIsNewSaleModalOpen(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert(
        `✓ Venda ${nextSaleCode} registrada com sucesso!\nO lançamento já integrou automaticamente o módulo Financeiro e o Dashboard como "${
          saleFormData.itemType === 'produto' ? 'FONTE B: PRODUTO' : 'FONTE C: SERVIÇO AVULSO'
        }".`
      );
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao registrar venda:', err);
      alert('Erro ao registrar venda: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSaleReceipt = async () => {
    if (!confirmPaymentSale) return;
    setIsSubmitting(true);
    try {
      const userEmail = user?.email || 'agenciaraon@gmail.com';
      await confirmSalePayment(
        confirmPaymentSale.id,
        confirmPaymentSale.totalAmount,
        paymentDateInput,
        userEmail
      );
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      alert(`✓ Pagamento da venda ${confirmPaymentSale.code} (${formatCurrency(confirmPaymentSale.totalAmount)}) confirmado com sucesso!\nO valor entrou instantaneamente no Faturamento Recebido.`);
      setConfirmPaymentSale(null);
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao confirmar pagamento: ' + (err?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSale = async (sale: Sale) => {
    if (!confirm(`Tem certeza que deseja cancelar a venda ${sale.code}? O recebível correspondente será cancelado.`)) return;
    const userEmail = user?.email || 'agenciaraon@gmail.com';
    try {
      await cancelSale(sale.id, userEmail);
      alert(`Venda ${sale.code} cancelada.`);
      onRefresh();
    } catch (err: any) {
      alert('Erro ao cancelar venda: ' + (err?.message || ''));
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================== VIEW HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0878D9]/10 text-[#0878D9]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Produtos & Serviços Avulsos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF7817]/10 text-[#FF7817] text-xs font-bold">
              Fonte B & C
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão independente de produtos físicos, produtos digitais e serviços comercializados fora dos contratos recorrentes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Action: Register Sale */}
          <button
            onClick={() => handleOpenNewSale()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7817] hover:bg-[#E5680E] text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            <span>+ REGISTRAR NOVA VENDA</span>
          </button>

          {/* Action: New Item */}
          <button
            onClick={handleOpenCreateItem}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0878D9] hover:bg-[#0768BD] text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Item</span>
          </button>
        </div>
      </div>

      {/* ==================== SUMMARY CARDS (VENDAS AVULSAS) ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Vendido</span>
          <p className="text-xl font-black text-slate-800 dark:text-white mt-1">
            {formatCurrency(salesMetrics.totalSold)}
          </p>
          <span className="text-[10px] text-slate-400">{salesMetrics.totalCount} vendas registradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-emerald-200 dark:border-emerald-900/40 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Efetivamente Recebido</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(salesMetrics.totalReceived)}
          </p>
          <span className="text-[10px] text-emerald-600/80">Entrou no faturamento</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-amber-200 dark:border-amber-900/40 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-amber-600">A Receber (Pendente)</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(salesMetrics.totalPending)}
          </p>
          <span className="text-[10px] text-amber-600/80">Aguardando quitação</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Itens no Catálogo</span>
          <p className="text-xl font-black text-slate-800 dark:text-white mt-1">
            {productsServices.length}
          </p>
          <span className="text-[10px] text-slate-400">
            {productsServices.filter((p) => p.type === 'produto').length} produtos • {productsServices.filter((p) => p.type === 'servico').length} serviços
          </span>
        </div>
      </div>

      {/* ==================== SUB-TABS & FILTERS BAR ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-900 rounded-2xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('catalogo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'catalogo'
                ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Catálogo ({productsServices.length})
          </button>

          <button
            onClick={() => setActiveSubTab('vendas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'vendas'
                ? 'bg-white dark:bg-[#10192A] text-[#FF7817] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Histórico de Vendas ({sales.length})</span>
            {sales.some((s) => s.financialStatus === 'pendente') && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('categorias')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'categorias'
                ? 'bg-white dark:bg-[#10192A] text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Categorias ({productCategories.length})
          </button>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0878D9]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="produto">Apenas Produtos</option>
            <option value="servico">Apenas Serviços Avulsos</option>
          </select>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: CATÁLOGO ==================== */}
      {activeSubTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Item & Descrição</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Valor Padrão</th>
                  <th className="py-3 px-4">Estoque / Custo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum produto ou serviço cadastrado ou encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0878D9]">
                        {item.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.type === 'produto'
                              ? 'bg-blue-500/10 text-[#0878D9] border border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                          }`}
                        >
                          {item.type === 'produto' ? <Package className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          {item.type === 'produto' ? 'Produto' : 'Serviço Avulso'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-800 dark:text-white">
                        {formatCurrency(item.defaultPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.type === 'produto' ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-300">
                              Estoque: {item.stockQuantity ?? '—'}
                            </span>
                            {item.costPrice ? (
                              <p className="text-slate-400 text-[10px]">Custo: {formatCurrency(item.costPrice)}</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {item.costPrice ? `Custo: ${formatCurrency(item.costPrice)}` : 'Serviço sob demanda'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleItemStatus(item)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-colors ${
                            item.status === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                          }`}
                          title="Clique para alternar entre Ativo e Inativo"
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenNewSale(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#FF7817]/10 hover:bg-[#FF7817] text-[#FF7817] hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                            title="Lançar Venda deste Item"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Vender</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0878D9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Editar Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Excluir Item"
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
        </div>
      )}

      {/* ==================== SUB-TAB 2: HISTÓRICO DE VENDAS ==================== */}
      {activeSubTab === 'vendas' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Venda</th>
                  <th className="py-3 px-4">Data da Venda</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Item & Tipo</th>
                  <th className="py-3 px-4">Qtd & Preço</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Forma / Status</th>
                  <th className="py-3 px-4 text-right">Recebimento & Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhuma venda registrada até o momento. Clique em "+ REGISTRAR NOVA VENDA" acima.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isPaid = sale.financialStatus === 'pago';
                    const isPending = sale.financialStatus === 'pendente';
                    const isCanceled = sale.financialStatus === 'cancelado';

                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF7817]">
                          {sale.code}
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          {sale.saleDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {sale.buyerName || 'Cliente Balcão / Avulso'}
                          </span>
                          {sale.buyerContact && (
                            <p className="text-[10px] text-slate-400">{sale.buyerContact}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {sale.itemName}
                          </div>
                          <span className="text-[10px] text-[#0878D9] font-semibold">
                            {sale.itemType === 'produto' ? '📦 Produto' : '⚡ Serviço Avulso'} • {sale.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span>{sale.quantity}x de {formatCurrency(sale.unitPrice)}</span>
                          {sale.discount > 0 && (
                            <span className="text-red-500 text-[10px] block">
                              Desc: -{formatCurrency(sale.discount)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPaid
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : isPending
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : isCanceled
                                  ? 'bg-red-500/10 text-red-600'
                                  : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {sale.financialStatus}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {sale.paymentMethod}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => {
                                  setConfirmPaymentSale(sale);
                                  setPaymentDateInput(todayStr);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                                title="Confirmar que o pagamento foi recebido"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirmar Recebimento</span>
                              </button>
                            )}
                            {isPaid && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                Recebido em {sale.paymentDate || sale.saleDate} ✓
                              </span>
                            )}
                            {!isCanceled && (
                              <button
                                onClick={() => handleCancelSale(sale)}
                                className="p-1 rounded text-slate-400 hover:text-red-600"
                                title="Cancelar Venda"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* ==================== SUB-TAB 3: CATEGORIAS ==================== */}
      {activeSubTab === 'categorias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Categorias Personalizadas de Produtos & Serviços
              </h3>
              <p className="text-xs text-slate-400">
                Crie e organize categorias conforme as necessidades da Agência Raon.
              </p>
            </div>
            <button
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {productCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs hover:border-[#0878D9] transition-all"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {cat.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 capitalize">
                    Aplica-se a: {cat.type || 'ambos'}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Excluir Categoria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MODAL: REGISTRAR NOVA VENDA ==================== */}
      {isNewSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#FF7817] text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-bold text-base">Registrar Nova Venda Avulsa</h3>
              </div>
              <button
                onClick={() => setIsNewSaleModalOpen(false)}
                className="p-1 text-orange-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSale} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#FF7817]">Código da Venda:</span>
                  <p className="font-mono text-base font-black text-slate-800 dark:text-white">
                    {nextSaleCode}
                  </p>
                </div>
                <span className="text-[11px] text-orange-800 dark:text-orange-300 font-semibold">
                  Gera recebível automático no Financeiro
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Product or Service */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Produto ou Serviço Vendido *
                  </label>
                  <select
                    required
                    value={saleFormData.itemId}
                    onChange={(e) => handleSelectItemForSale(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF7817]"
                  >
                    <option value="">Selecione o item do catálogo...</option>
                    {productsServices
                      .filter((p) => p.status === 'ativo')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          [{item.type === 'produto' ? 'PRODUTO' : 'SERVIÇO'}] {item.name} — Padrão: {formatCurrency(item.defaultPrice)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Auto fields */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Tipo de Item
                  </label>
                  <input
                    type="text"
                    disabled
                    value={saleFormData.itemType === 'produto' ? 'FONTE B: PRODUTO' : 'FONTE C: SERVIÇO AVULSO'}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#0878D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={saleFormData.category}
                    onChange={(e) => setSaleFormData({ ...saleFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Data da Venda *
                  </label>
                  <input
                    type="date"
                    required
                    value={saleFormData.saleDate}
                    onChange={(e) => setSaleFormData({ ...saleFormData, saleDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF7817]"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={saleFormData.quantity}
                    onChange={(e) => setSaleFormData({ ...saleFormData, quantity: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF7817]"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Valor Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={saleFormData.unitPrice}
                    onChange={(e) => setSaleFormData({ ...saleFormData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF7817]"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleFormData.discount}
                    onChange={(e) => setSaleFormData({ ...saleFormData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF7817]"
                  />
                </div>

                {/* Buyer info */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Nome do Comprador (Opcional)
                  </label>
                  <input
                    type="text"
                    value={saleFormData.buyerName}
                    onChange={(e) => setSaleFormData({ ...saleFormData, buyerName: e.target.value })}
                    placeholder="Ex: Empresa Parceira LTDA / Fulano"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Contato do Comprador (WhatsApp / E-mail)
                  </label>
                  <input
                    type="text"
                    value={saleFormData.buyerContact}
                    onChange={(e) => setSaleFormData({ ...saleFormData, buyerContact: e.target.value })}
                    placeholder="(75) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={saleFormData.paymentMethod}
                    onChange={(e) => setSaleFormData({ ...saleFormData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>

                {/* Financial Status */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={saleFormData.financialStatus}
                    onChange={(e) => setSaleFormData({ ...saleFormData, financialStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="pago">Pago (Dinheiro já recebido)</option>
                    <option value="pendente">Pendente (A receber)</option>
                    <option value="parcial">Parcialmente pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Payment Date if Paid */}
                {saleFormData.financialStatus === 'pago' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Data Real do Recebimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={saleFormData.paymentDate}
                      onChange={(e) => setSaleFormData({ ...saleFormData, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Total Calculation Highlight */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Valor Total Calculado:</span>
                  <p className="text-xl font-black text-[#FF7817]">
                    {formatCurrency(calculatedSaleTotal)}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  {saleFormData.quantity}x de {formatCurrency(saleFormData.unitPrice)}
                  {saleFormData.discount > 0 && ` - ${formatCurrency(saleFormData.discount)} desc`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Observações da Venda
                </label>
                <textarea
                  rows={2}
                  value={saleFormData.notes}
                  onChange={(e) => setSaleFormData({ ...saleFormData, notes: e.target.value })}
                  placeholder="Detalhes da negociação, canal de venda..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewSaleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#FF7817] hover:bg-[#E5680E] text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Gravando Venda...' : 'Confirmar e Registrar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CADASTRO / EDIÇÃO DE PRODUTO OU SERVIÇO ==================== */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#102B59] text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#FF7817]" />
                <h3 className="font-bold text-base">
                  {editingItem ? 'Editar Item do Catálogo' : 'Cadastrar Produto ou Serviço Avulso'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
                <strong>Regra:</strong> O cadastro de um produto ou serviço <strong>não gera faturamento automaticamente</strong>. O faturamento só é registrado quando você realizar a venda através do botão <em>"+ REGISTRAR NOVA VENDA"</em>.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Tipo do Item *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setItemFormData({ ...itemFormData, type: 'servico' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        itemFormData.type === 'servico'
                          ? 'border-[#0878D9] bg-[#0878D9]/10 text-[#0878D9]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Serviço Avulso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemFormData({ ...itemFormData, type: 'produto' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        itemFormData.type === 'produto'
                          ? 'border-[#0878D9] bg-[#0878D9]/10 text-[#0878D9]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Produto (Físico / Digital)</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Nome do Produto ou Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="Ex: Totem Digital 43, Criação de Site Institucional..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0878D9]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Categoria *
                  </label>
                  <select
                    required
                    value={itemFormData.category}
                    onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0878D9]"
                  >
                    <option value="">Selecione...</option>
                    {productCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Sale Price */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Valor de Venda Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={itemFormData.defaultPrice}
                    onChange={(e) => setItemFormData({ ...itemFormData, defaultPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="1500.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0878D9]"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Custo do Produto ou Serviço (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.costPrice}
                    onChange={(e) => setItemFormData({ ...itemFormData, costPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="700.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Stock (if product) */}
                {itemFormData.type === 'produto' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Quantidade em Estoque
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemFormData.stockQuantity}
                      onChange={(e) => setItemFormData({ ...itemFormData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                      placeholder="10"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={itemFormData.status}
                    onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value as ProductServiceStatus })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Descrição Técnica e Comercial
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Características, garantia, entregáveis..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={itemFormData.notes}
                  onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                  placeholder="Fornecedor, condições de entrega..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVA CATEGORIA ==================== */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#102B59] text-white">
              <h3 className="font-bold text-sm">Criar Nova Categoria</h3>
              <button
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Aplicativos Mobile, Equipamentos de TI..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0878D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Tipo de Aplicação
                </label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="ambos">Produtos e Serviços</option>
                  <option value="produto">Apenas Produtos</option>
                  <option value="servico">Apenas Serviços</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0878D9] hover:bg-[#0768BD] text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONFIRMAR RECEBIMENTO DE VENDA ==================== */}
      {confirmPaymentSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-900/50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Confirmar Recebimento da Venda</h3>
              </div>
              <button
                onClick={() => setConfirmPaymentSale(null)}
                className="p-1 text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-200">
                <p className="font-bold text-sm mb-1">{confirmPaymentSale.itemName}</p>
                <p>Venda: <span className="font-mono font-bold">{confirmPaymentSale.code}</span> | Valor: <strong>{formatCurrency(confirmPaymentSale.totalAmount)}</strong></p>
                {confirmPaymentSale.buyerName && (
                  <p className="text-[11px] mt-0.5">Comprador: {confirmPaymentSale.buyerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Data Real do Recebimento *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDateInput}
                  onChange={(e) => setPaymentDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O valor será computado no Faturamento Recebido com base nesta data.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmPaymentSale(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSaleReceipt}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirmando...' : 'Confirmar e Creditar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
