import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Printer,
  Package,
  Layers,
  Briefcase,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Client, Contract, Receivable, Expense, Task, Sale, ProductService } from '../types';

interface ReportsViewProps {
  clients: Client[];
  contracts: Contract[];
  receivables: Receivable[];
  expenses: Expense[];
  tasks: Task[];
  sales?: Sale[];
  productsServices?: ProductService[];
}

export type ReportType =
  | 'faturamento_fontes'
  | 'vendas_produtos_servicos'
  | 'resultado_financeiro'
  | 'pagamentos_recebidos'
  | 'valores_pendentes'
  | 'inadimplencia'
  | 'despesas'
  | 'receita_recorrente'
  | 'receita_plano'
  | 'comparativo_anual'
  | 'clientes_status'
  | 'clientes_plano'
  | 'servicos_contratados'
  | 'contratos_status'
  | 'tarefas_concluidas';

type PeriodFilter =
  | 'mes_atual'
  | 'mes_anterior'
  | 'ultimos_3'
  | 'ultimos_6'
  | 'ultimos_12'
  | 'ultimos_24'
  | 'ultimos_36'
  | 'personalizado';

export const ReportsView: React.FC<ReportsViewProps> = ({
  clients,
  contracts,
  receivables,
  expenses,
  tasks,
  sales = [],
  productsServices = [],
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('faturamento_fontes');
  const [periodPreset, setPeriodPreset] = useState<PeriodFilter>('ultimos_12');

  const now = new Date();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();

  // Custom dates
  const [customStartDate, setCustomStartDate] = useState(
    new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Determine active date range based on periodPreset
  const { dateStart, dateEnd, periodLabel } = useMemo(() => {
    const end = now.toISOString().split('T')[0];

    if (periodPreset === 'mes_atual') {
      const start = `${currentYear}-${currentMonthNum}-01`;
      return { dateStart: start, dateEnd: end, periodLabel: `Mês Atual (${currentMonthNum}/${currentYear})` };
    }
    if (periodPreset === 'mes_anterior') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const py = prevMonthDate.getFullYear();
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      return {
        dateStart: `${py}-${pm}-01`,
        dateEnd: `${py}-${pm}-${String(lastDayPrevMonth).padStart(2, '0')}`,
        periodLabel: `Mês Anterior (${pm}/${py})`,
      };
    }
    if (periodPreset === 'ultimos_3') {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return {
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: end,
        periodLabel: 'Últimos 3 Meses',
      };
    }
    if (periodPreset === 'ultimos_6') {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return {
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: end,
        periodLabel: 'Últimos 6 Meses',
      };
    }
    if (periodPreset === 'ultimos_12') {
      const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      return {
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: end,
        periodLabel: 'Últimos 12 Meses (1 Ano)',
      };
    }
    if (periodPreset === 'ultimos_24') {
      const d = new Date(now.getFullYear() - 2, now.getMonth(), 1);
      return {
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: end,
        periodLabel: 'Últimos 24 Meses (2 Anos)',
      };
    }
    if (periodPreset === 'ultimos_36') {
      const d = new Date(now.getFullYear() - 3, now.getMonth(), 1);
      return {
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: end,
        periodLabel: 'Últimos 36 Meses (3 Anos)',
      };
    }
    return {
      dateStart: customStartDate,
      dateEnd: customEndDate,
      periodLabel: `Personalizado (${customStartDate} até ${customEndDate})`,
    };
  }, [periodPreset, customStartDate, customEndDate, currentYear, currentMonthNum, now]);

  const reportList: { id: ReportType; title: string; category: string }[] = [
    { id: 'faturamento_fontes', title: '1. Faturamento por Fontes (Agência vs Produtos vs Serviços)', category: 'Fontes & Receitas' },
    { id: 'vendas_produtos_servicos', title: '2. Histórico de Vendas Avulsas (Produtos & Serviços)', category: 'Fontes & Receitas' },
    { id: 'resultado_financeiro', title: '3. Resultado Financeiro Consolidado (Receitas - Despesas)', category: 'Financeiro' },
    { id: 'pagamentos_recebidos', title: '4. Pagamentos Recebidos e Baixas Compensadas', category: 'Financeiro' },
    { id: 'valores_pendentes', title: '5. Valores Pendentes de Recebimento', category: 'Financeiro' },
    { id: 'inadimplencia', title: '6. Inadimplência e Cobranças Vencidas', category: 'Financeiro' },
    { id: 'despesas', title: '7. Despesas Operacionais e Ferramentas', category: 'Financeiro' },
    { id: 'receita_recorrente', title: '8. Receita Recorrente Mensal (MRR Contratada)', category: 'Financeiro' },
    { id: 'receita_plano', title: '9. Receita por Plano de Contratação', category: 'Comercial' },
    { id: 'comparativo_anual', title: '10. Comparativo Anual de Arrecadação', category: 'Estratégico' },
    { id: 'clientes_status', title: '11. Clientes Ativos, Pausados e Inativos', category: 'Comercial' },
    { id: 'clientes_plano', title: '12. Clientes por Plano Contratado', category: 'Comercial' },
    { id: 'servicos_contratados', title: '13. Serviços Mais Contratados da Agência', category: 'Operacional' },
    { id: 'contratos_status', title: '14. Contratos Vigentes, Renovados e Encerrados', category: 'Contratual' },
    { id: 'tarefas_concluidas', title: '15. Tarefas e Entregas Concluídas', category: 'Operacional' },
  ];

  // Helper date checker
  const isInPeriod = (dateStr?: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.slice(0, 10);
    return cleanDate >= dateStart && cleanDate <= dateEnd;
  };

  // Helper competence checker
  const isCompInPeriod = (compStr?: string) => {
    if (!compStr) return true;
    const parts = compStr.split('/');
    if (parts.length !== 2) return true;
    const compDate = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
    return compDate >= dateStart.slice(0, 7) + '-01' && compDate <= dateEnd.slice(0, 7) + '-28';
  };

  // Filtered collections
  const periodReceivables = useMemo(() => {
    return receivables.filter((r) => isCompInPeriod(r.competence) || isInPeriod(r.paymentDate || r.dueDate));
  }, [receivables, dateStart, dateEnd]);

  const periodExpenses = useMemo(() => {
    return expenses.filter((e) => isCompInPeriod(e.competence) || isInPeriod(e.paymentDate || e.dueDate));
  }, [expenses, dateStart, dateEnd]);

  const periodSales = useMemo(() => {
    return sales.filter((s) => isInPeriod(s.saleDate));
  }, [sales, dateStart, dateEnd]);

  // Summary KPIs for current report period
  const summaryKPIs = useMemo(() => {
    const receivedAgencia = periodReceivables
      .filter((r) => (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

    const receivedProdutos = periodReceivables
      .filter((r) => r.revenueSource === 'produto' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

    const receivedServicos = periodReceivables
      .filter((r) => r.revenueSource === 'servico_avulso' && (r.status === 'recebido' || r.status === 'parcial'))
      .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

    const totalConsolidado = receivedAgencia + receivedProdutos + receivedServicos;

    const despesasPagas = periodExpenses
      .filter((e) => e.status === 'pago')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const resultadoLiquido = totalConsolidado - despesasPagas;

    return {
      receivedAgencia,
      receivedProdutos,
      receivedServicos,
      totalConsolidado,
      despesasPagas,
      resultadoLiquido,
    };
  }, [periodReceivables, periodExpenses]);

  // Compute table data based on selected report
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'faturamento_fontes': {
        const headers = [
          'Competência',
          'Agência (Contratos) R$',
          'Produtos R$',
          'Serviços Avulsos R$',
          'Total Consolidado R$',
          'Despesas Pagas R$',
          'Resultado Líquido R$',
        ];

        const comps = Array.from(new Set([...periodReceivables.map((r) => r.competence), ...periodExpenses.map((e) => e.competence)]))
          .sort((a, b) => {
            const [mA, yA] = a.split('/');
            const [mB, yB] = b.split('/');
            return `${yA}-${mA}`.localeCompare(`${yB}-${mB}`);
          });

        const rows = comps.map((comp) => {
          const ag = periodReceivables
            .filter((r) => r.competence === comp && (r.revenueSource === 'agencia' || (!r.revenueSource && !r.saleId)) && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

          const pr = periodReceivables
            .filter((r) => r.competence === comp && r.revenueSource === 'produto' && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

          const sr = periodReceivables
            .filter((r) => r.competence === comp && r.revenueSource === 'servico_avulso' && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

          const tot = ag + pr + sr;
          const exp = periodExpenses
            .filter((e) => e.competence === comp && e.status === 'pago')
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);

          const res = tot - exp;

          return [
            comp,
            formatCurrency(ag),
            formatCurrency(pr),
            formatCurrency(sr),
            formatCurrency(tot),
            formatCurrency(exp),
            formatCurrency(res),
          ];
        });

        return { headers, rows };
      }

      case 'vendas_produtos_servicos': {
        const headers = ['Data Venda', 'Item Vendido', 'Tipo', 'Categoria', 'Comprador', 'Valor Total', 'Status', 'Recebido'];
        const rows = periodSales.map((s) => [
          s.saleDate,
          s.itemName,
          s.itemType.toUpperCase(),
          s.category,
          s.buyerName || 'Consumidor Final',
          formatCurrency(s.totalAmount),
          (s.status || s.financialStatus || 'pendente').toUpperCase(),
          (s.status || s.financialStatus) === 'pago' ? s.paymentDate || 'Sim' : 'Pendente',
        ]);
        return { headers, rows };
      }

      case 'resultado_financeiro': {
        const headers = ['Competência', 'Receitas Recebidas (R$)', 'Despesas Pagas (R$)', 'Resultado Líquido (R$)'];
        const comps = Array.from(new Set([...periodReceivables.map((r) => r.competence), ...periodExpenses.map((e) => e.competence)]));
        const rows = comps.map((comp) => {
          const rec = periodReceivables
            .filter((r) => r.competence === comp && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
          const exp = periodExpenses
            .filter((e) => e.competence === comp && e.status === 'pago')
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);
          const net = rec - exp;
          return [comp, formatCurrency(rec), formatCurrency(exp), formatCurrency(net)];
        });
        return { headers, rows };
      }

      case 'pagamentos_recebidos': {
        const headers = ['Origem', 'Cliente / Comprador', 'Descrição', 'Data Pagamento', 'Forma', 'Valor Pago (R$)'];
        const list = periodReceivables.filter((r) => r.status === 'recebido' || r.status === 'parcial');
        const rows = list.map((r) => {
          const source = r.revenueSource === 'produto' ? 'Produto' : r.revenueSource === 'servico_avulso' ? 'Serviço Avulso' : 'Agência';
          return [
            source,
            r.clientName,
            r.description,
            r.paymentDate || r.dueDate,
            r.paymentMethod || 'PIX',
            formatCurrency(r.paidAmount),
          ];
        });
        return { headers, rows };
      }

      case 'valores_pendentes': {
        const headers = ['Origem', 'Cliente', 'Descrição', 'Vencimento', 'Competência', 'Valor a Receber (R$)'];
        const list = periodReceivables.filter((r) => r.status === 'pendente');
        const rows = list.map((r) => {
          const source = r.revenueSource === 'produto' ? 'Produto' : r.revenueSource === 'servico_avulso' ? 'Serviço Avulso' : 'Agência';
          return [
            source,
            r.clientName,
            r.description,
            r.dueDate,
            r.competence,
            formatCurrency(r.originalAmount),
          ];
        });
        return { headers, rows };
      }

      case 'inadimplencia': {
        const headers = ['Cliente', 'Descrição', 'Vencimento Original', 'Valor Vencido (R$)'];
        const list = periodReceivables.filter((r) => r.status === 'vencido');
        const rows = list.map((r) => [
          r.clientName,
          r.description,
          r.dueDate,
          formatCurrency(r.originalAmount - (r.paidAmount || 0)),
        ]);
        return { headers, rows };
      }

      case 'despesas': {
        const headers = ['Descrição', 'Categoria', 'Vencimento', 'Fornecedor', 'Valor (R$)', 'Status'];
        const rows = periodExpenses.map((e) => [
          e.description,
          e.categoryName,
          e.dueDate,
          e.supplierName || '—',
          formatCurrency(e.amount),
          e.status.toUpperCase(),
        ]);
        return { headers, rows };
      }

      case 'receita_recorrente': {
        const headers = ['Cliente', 'Plano', 'Vencimento', 'MRR Mensalidade (R$)'];
        const activeContracts = contracts.filter((c) => c.status === 'vigente' || c.status === 'renovado');
        const rows = activeContracts.map((c) => [
          c.clientName,
          c.planName,
          `Dia ${c.dueDay}`,
          formatCurrency(c.monthlyFee),
        ]);
        return { headers, rows };
      }

      case 'receita_plano': {
        const headers = ['Plano Oficial', 'Clientes Ativos', 'Receita Total Mensal (R$)'];
        const planMap: Record<string, { count: number; total: number }> = {};
        contracts
          .filter((c) => c.status === 'vigente')
          .forEach((c) => {
            const p = c.planName || 'Personalizado';
            if (!planMap[p]) planMap[p] = { count: 0, total: 0 };
            planMap[p].count++;
            planMap[p].total += Number(c.monthlyFee) || 0;
          });
        const rows = Object.entries(planMap).map(([p, data]) => [
          p,
          data.count.toString(),
          formatCurrency(data.total),
        ]);
        return { headers, rows };
      }

      case 'comparativo_anual': {
        const headers = ['Mês / Comparativo', 'Ano Vigente (2026)', 'Ano Anterior (2025/Estimado)', 'Variação (%)'];
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const rows = months.map((m) => {
          const rec2026 = receivables
            .filter((r) => r.competence === `${m}/2026` && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);

          const rec2025 = rec2026 > 0 ? rec2026 * 0.8 : 0; // baseline comparison
          const varPct = rec2025 > 0 ? Math.round(((rec2026 - rec2025) / rec2025) * 100) : 0;

          return [
            `Mês ${m}`,
            formatCurrency(rec2026),
            formatCurrency(rec2025),
            varPct >= 0 ? `+${varPct}%` : `${varPct}%`,
          ];
        });
        return { headers, rows };
      }

      case 'clientes_status': {
        const headers = ['Código', 'Empresa', 'Responsável', 'WhatsApp', 'Status', 'Entrada'];
        const rows = clients.map((c) => [
          c.code,
          c.companyName,
          c.responsibleName,
          c.whatsapp,
          c.status.toUpperCase(),
          c.entryDate || '—',
        ]);
        return { headers, rows };
      }

      case 'clientes_plano': {
        const headers = ['Código', 'Empresa', 'Plano', 'Mensalidade', 'Vencimento'];
        const rows = clients.map((c) => [
          c.code,
          c.companyName,
          c.planName || 'Personalizado',
          formatCurrency(c.monthlyFee),
          `Dia ${c.dueDay}`,
        ]);
        return { headers, rows };
      }

      case 'servicos_contratados': {
        const headers = ['Serviço', 'Ocorrências em Contratos'];
        const counts: Record<string, number> = {};
        contracts.forEach((c) => {
          if (Array.isArray(c.services)) {
            c.services.forEach((s) => {
              counts[s.name] = (counts[s.name] || 0) + 1;
            });
          }
        });
        const rows = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, qty]) => [name, qty.toString()]);
        return { headers, rows };
      }

      case 'contratos_status': {
        const headers = ['Nº Contrato', 'Cliente', 'Plano', 'Início', 'Término', 'Status'];
        const rows = contracts.map((c) => [
          c.contractNumber,
          c.clientName,
          c.planName,
          c.startDate,
          c.endDate || 'Indeterminado',
          c.status.toUpperCase(),
        ]);
        return { headers, rows };
      }

      case 'tarefas_concluidas': {
        const headers = ['Título da Tarefa', 'Cliente', 'Serviço', 'Responsável', 'Data'];
        const completed = tasks.filter((t) => t.status === 'concluida');
        const rows = completed.map((t) => [
          t.title,
          t.clientName || 'Geral',
          t.serviceName || '—',
          t.assignedTo || 'Equipe',
          t.dueDate,
        ]);
        return { headers, rows };
      }

      default:
        return { headers: [], rows: [] };
    }
  }, [selectedReport, periodReceivables, periodExpenses, periodSales, contracts, clients, tasks, receivables]);

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const currentRep = reportList.find((r) => r.id === selectedReport);

    // Header Branding
    doc.setFillColor(16, 43, 89); // #102B59
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AGÊNCIA RAON — SISTEMA DE GESTÃO INTERNA', 14, 12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório Oficial: ${currentRep?.title} | Período: ${periodLabel} | Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 18);

    // Content table
    autoTable(doc, {
      startY: 30,
      head: [reportData.headers],
      body: reportData.rows,
      theme: 'striped',
      headStyles: {
        fillColor: [8, 120, 217], // #0878D9
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      foot: [
        [
          `Total de registros: ${reportData.rows.length}`,
          '',
          '',
          `Gerado por RAON PAINEL`,
        ],
      ],
      footStyles: {
        fillColor: [240, 243, 248],
        textColor: 100,
        fontSize: 7.5,
      },
    });

    doc.save(`raon_relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel (XLSX)
  const handleExportExcel = () => {
    const currentRep = reportList.find((r) => r.id === selectedReport);
    const wsData = [
      ['AGÊNCIA RAON — SISTEMA DE GESTÃO INTERNA'],
      [`Relatório Oficial: ${currentRep?.title}`],
      [`Período de Referência: ${periodLabel}`],
      [`Data de Extração: ${new Date().toLocaleString('pt-BR')}`],
      [],
      reportData.headers,
      ...reportData.rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Raon');
    XLSX.writeFile(wb, `raon_relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [reportData.headers.join(','), ...reportData.rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `raon_relatorio_${selectedReport}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0878D9]" />
            Relatórios Administrativos & Financeiros
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Histórico completo de até 36 meses (3 anos) com consolidação e separação por fontes de faturamento.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#102B59] hover:bg-[#1A3F7A] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ==================== FILTROS DE PERÍODO (HISTÓRICO ATÉ 36 MESES) ==================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#0878D9]" />
            Período de Análise (Histórico de até 36 meses / 3 anos)
          </span>
          <span className="text-xs font-black text-[#0878D9]">
            {periodLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPeriodPreset('mes_atual')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'mes_atual'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Mês Atual
          </button>

          <button
            onClick={() => setPeriodPreset('mes_anterior')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'mes_anterior'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Mês Anterior
          </button>

          <button
            onClick={() => setPeriodPreset('ultimos_3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'ultimos_3'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Últimos 3 Meses
          </button>

          <button
            onClick={() => setPeriodPreset('ultimos_6')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'ultimos_6'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Últimos 6 Meses
          </button>

          <button
            onClick={() => setPeriodPreset('ultimos_12')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'ultimos_12'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Últimos 12 Meses (1 Ano)
          </button>

          <button
            onClick={() => setPeriodPreset('ultimos_24')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'ultimos_24'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Últimos 24 Meses (2 Anos)
          </button>

          <button
            onClick={() => setPeriodPreset('ultimos_36')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'ultimos_36'
                ? 'bg-[#0878D9] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Últimos 36 Meses (3 Anos)
          </button>

          <button
            onClick={() => setPeriodPreset('personalizado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'personalizado'
                ? 'bg-[#FF7817] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Personalizado
          </button>
        </div>

        {periodPreset === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* ==================== CARDS RESUMO DO PERÍODO SELECIONADO ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Agência
          </span>
          <p className="text-base font-black text-slate-800 dark:text-white mt-1 truncate">
            {formatCurrency(summaryKPIs.receivedAgencia)}
          </p>
          <span className="text-[10px] text-slate-400">Contratos</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3 h-3" /> Produtos
          </span>
          <p className="text-base font-black text-[#FF7817] mt-1 truncate">
            {formatCurrency(summaryKPIs.receivedProdutos)}
          </p>
          <span className="text-[10px] text-slate-400">Vendas avulsas</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" /> Serviços Avulsos
          </span>
          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {formatCurrency(summaryKPIs.receivedServicos)}
          </p>
          <span className="text-[10px] text-slate-400">Demandas pontuais</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Total Consolidado
          </span>
          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            {formatCurrency(summaryKPIs.totalConsolidado)}
          </p>
          <span className="text-[10px] text-slate-400">Todas as fontes</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
            Despesas Pagas
          </span>
          <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 truncate">
            {formatCurrency(summaryKPIs.despesasPagas)}
          </p>
          <span className="text-[10px] text-slate-400">Custos operacionais</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-[#102B59] dark:text-blue-200 uppercase tracking-wider">
            Resultado Líquido
          </span>
          <p className={`text-base font-black mt-1 truncate ${summaryKPIs.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(summaryKPIs.resultadoLiquido)}
          </p>
          <span className="text-[10px] text-slate-400">Recebido - Despesas</span>
        </div>
      </div>

      {/* Report Selector Dropdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Selecione o Modelo de Relatório
          </label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value as ReportType)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {reportList.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.category}] {r.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Total de Registros
          </label>
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-[#0878D9]">
            {reportData.rows.length} registros computados
          </div>
        </div>
      </div>

      {/* Table Data Preview */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Pré-Visualização do Relatório — {reportList.find((r) => r.id === selectedReport)?.title}
          </h3>
          <span className="text-[11px] text-slate-400">Período: {periodLabel}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">
                {reportData.headers.map((h, idx) => (
                  <th key={idx} className="py-3 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.headers.length || 1} className="py-12 text-center text-slate-400">
                    Nenhum dado encontrado para os parâmetros selecionados.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
