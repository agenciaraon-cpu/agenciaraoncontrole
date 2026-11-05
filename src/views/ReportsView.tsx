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
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Client, Contract, Receivable, Expense, Task } from '../types';

interface ReportsViewProps {
  clients: Client[];
  contracts: Contract[];
  receivables: Receivable[];
  expenses: Expense[];
  tasks: Task[];
}

export type ReportType =
  | 'clientes_status'
  | 'clientes_plano'
  | 'receita_plano'
  | 'receita_recorrente'
  | 'pagamentos_recebidos'
  | 'valores_pendentes'
  | 'inadimplencia'
  | 'despesas'
  | 'resultado_financeiro'
  | 'servicos_contratados'
  | 'contratos_status'
  | 'tarefas_concluidas';

export const ReportsView: React.FC<ReportsViewProps> = ({
  clients,
  contracts,
  receivables,
  expenses,
  tasks,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('resultado_financeiro');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const reportList: { id: ReportType; title: string; category: string }[] = [
    { id: 'resultado_financeiro', title: '1. Resultado Financeiro Consolidado', category: 'Financeiro' },
    { id: 'pagamentos_recebidos', title: '2. Pagamentos Recebidos no Período', category: 'Financeiro' },
    { id: 'valores_pendentes', title: '3. Valores Pendentes de Recebimento', category: 'Financeiro' },
    { id: 'inadimplencia', title: '4. Relatório de Inadimplência e Cobranças Vencidas', category: 'Financeiro' },
    { id: 'despesas', title: '5. Despesas Operacionais e Ferramentas', category: 'Financeiro' },
    { id: 'receita_recorrente', title: '6. Receita Recorrente Mensal (MRR)', category: 'Financeiro' },
    { id: 'receita_plano', title: '7. Receita por Plano de Contratação', category: 'Comercial' },
    { id: 'clientes_status', title: '8. Clientes Ativos, Inativos e Suspensos', category: 'Comercial' },
    { id: 'clientes_plano', title: '9. Clientes por Plano Contratado', category: 'Comercial' },
    { id: 'servicos_contratados', title: '10. Serviços Mais Contratados da Agência', category: 'Operacional' },
    { id: 'contratos_status', title: '11. Contratos Vigentes, Renovados e Encerrados', category: 'Contratual' },
    { id: 'tarefas_concluidas', title: '12. Tarefas e Entregas Concluídas', category: 'Operacional' },
  ];

  // Compute table data based on selected report
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'resultado_financeiro': {
        const headers = ['Competência', 'Receitas Recebidas (R$)', 'Despesas Pagas (R$)', 'Resultado Líquido (R$)'];
        const comps = Array.from(new Set([...receivables.map((r) => r.competence), ...expenses.map((e) => e.competence)]));
        const rows = comps.map((comp) => {
          const rec = receivables
            .filter((r) => r.competence === comp && (r.status === 'recebido' || r.status === 'parcial'))
            .reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
          const exp = expenses
            .filter((e) => e.competence === comp && e.status === 'pago')
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);
          const net = rec - exp;
          return [comp, formatCurrency(rec), formatCurrency(exp), formatCurrency(net)];
        });
        return { headers, rows, rawRows: rows };
      }

      case 'pagamentos_recebidos': {
        const headers = ['Cliente', 'Descrição', 'Data Pagamento', 'Forma', 'Valor Pago (R$)'];
        const list = receivables.filter((r) => r.status === 'recebido' || r.status === 'parcial');
        const rows = list.map((r) => [
          r.clientName,
          r.description,
          r.paymentDate || r.dueDate,
          r.paymentMethod || 'PIX',
          formatCurrency(r.paidAmount),
        ]);
        return { headers, rows, rawRows: rows };
      }

      case 'valores_pendentes': {
        const headers = ['Cliente', 'Descrição', 'Vencimento', 'Competência', 'Valor a Receber (R$)'];
        const list = receivables.filter((r) => r.status === 'pendente');
        const rows = list.map((r) => [
          r.clientName,
          r.description,
          r.dueDate,
          r.competence,
          formatCurrency(r.originalAmount),
        ]);
        return { headers, rows, rawRows: rows };
      }

      case 'inadimplencia': {
        const headers = ['Cliente', 'Descrição', 'Vencimento Original', 'Valor Vencido (R$)'];
        const list = receivables.filter((r) => r.status === 'vencido');
        const rows = list.map((r) => [
          r.clientName,
          r.description,
          r.dueDate,
          formatCurrency(r.originalAmount - (r.paidAmount || 0)),
        ]);
        return { headers, rows, rawRows: rows };
      }

      case 'despesas': {
        const headers = ['Descrição', 'Categoria', 'Vencimento', 'Fornecedor', 'Valor (R$)', 'Status'];
        const rows = expenses.map((e) => [
          e.description,
          e.categoryName,
          e.dueDate,
          e.supplierName || '—',
          formatCurrency(e.amount),
          e.status.toUpperCase(),
        ]);
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
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
        return { headers, rows, rawRows: rows };
      }

      default:
        return { headers: [], rows: [], rawRows: [] };
    }
  }, [selectedReport, clients, contracts, receivables, expenses, tasks]);

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
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório Oficial: ${currentRep?.title} | Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 18);

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
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
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
        fontSize: 8,
      },
    });

    doc.save(`raon_relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel (XLSX)
  const handleExportExcel = () => {
    const currentRep = reportList.find((r) => r.id === selectedReport);
    const wsData = [
      ['AGÊNCIA RAON — SISTEMA DE GESTÃO INTERNA'],
      [`Relatório: ${currentRep?.title}`],
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
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Relatórios Administrativos & Financeiros
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Extração consolidada de 12 relatórios com exportação nativa em PDF, Excel (XLSX) e CSV.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
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

      {/* Report Selector Dropdown & Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Selecione um dos 12 Relatórios Oficiais
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
            Total de Linhas Extraídas
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
            Pré-Visualização do Relatório
          </h3>
          <span className="text-[11px] text-slate-400">Pronto para exportação</span>
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
