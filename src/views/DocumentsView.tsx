import React, { useState } from 'react';
import {
  FolderArchive,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Tag,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { AppDocument, DocumentCategory, Client } from '../types';
import { createDocument, deleteDocument } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface DocumentsViewProps {
  documents: AppDocument[];
  clients: Client[];
  onRefresh: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  clients,
  onRefresh,
}) => {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    category: 'contrato' as DocumentCategory,
    fileUrl: '',
    fileSize: '1.2 MB',
    notes: '',
  });

  const categories: { id: DocumentCategory; label: string }[] = [
    { id: 'contrato', label: 'Contratos' },
    { id: 'comprovante', label: 'Comprovantes' },
    { id: 'briefing', label: 'Briefings' },
    { id: 'arte', label: 'Artes & Criativos' },
    { id: 'administrativo', label: 'Administrativos' },
  ];

  const filteredDocs = documents.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'todas' || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const cl = clients.find((c) => c.id === formData.clientId);

    try {
      await createDocument(
        {
          clientId: formData.clientId || undefined,
          clientName: cl?.companyName || 'Agência Raon',
          name: formData.name,
          category: formData.category,
          fileUrl: formData.fileUrl || 'https://storage.googleapis.com/raon-docs/exemplo.pdf',
          fileSize: formData.fileSize,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
        },
        user?.email || 'somosraon@gmail.com'
      );
      setIsNewModalOpen(false);
      setFormData({
        clientId: '',
        name: '',
        category: 'contrato',
        fileUrl: '',
        fileSize: '1.2 MB',
        notes: '',
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar documento.');
    }
  };

  const handleDelete = async (docItem: AppDocument) => {
    if (!confirm(`Deseja remover o registro de "${docItem.name}"?`)) return;
    try {
      await deleteDocument(docItem.id, docItem.name, user?.email || 'somosraon@gmail.com');
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
            Central de Documentos & Repositório
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Armazenamento seguro de contratos, comprovantes de pagamento, briefings e arquivos de clientes.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Documento</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do arquivo ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              categoryFilter === 'todas'
                ? 'bg-[#102B59] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Todas ({documents.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-[#0878D9] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-xs bg-white dark:bg-[#10192A] rounded-2xl border border-slate-200 dark:border-slate-800">
            Nenhum documento encontrado na categoria selecionada.
          </div>
        ) : (
          filteredDocs.map((docItem) => (
            <div
              key={docItem.id}
              className="p-4 bg-white dark:bg-[#10192A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#0878D9]/10 text-[#0878D9]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                      {docItem.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase text-[#FF7817]">
                      {docItem.category}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(docItem)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg"
                    title="Excluir arquivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <strong className="truncate max-w-[150px]">{docItem.clientName}</strong>
                </div>
                {docItem.notes && (
                  <p className="text-slate-500 text-[10px] line-clamp-1">{docItem.notes}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                <span>{new Date(docItem.createdAt || '').toLocaleDateString('pt-BR')}</span>
                <a
                  href={docItem.fileUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-[#0878D9] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Acessar</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Novo Documento */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Novo Documento</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Nome do Arquivo / Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Contrato Assinado — Studio Pilates"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Cliente</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                >
                  <option value="">Geral da Agência Raon</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  Link do Arquivo / Storage URL
                </label>
                <input
                  type="text"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="https://drive.google.com/... ou URL do arquivo"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Observações</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações de versão, detalhes do documento..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
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
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
