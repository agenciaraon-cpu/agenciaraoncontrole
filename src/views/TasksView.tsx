import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  MessageSquare,
  X,
  Send,
  Kanban,
  List,
  AlertCircle,
  Tag,
  Building2,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, Client } from '../types';
import { createTask, updateTask, addTaskComment, deleteTask } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface TasksViewProps {
  tasks: Task[];
  clients: Client[];
  onRefresh: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, clients, onRefresh }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'lista' | 'calendario'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('todas');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    serviceName: 'Redes Sociais',
    title: '',
    description: '',
    assignedTo: 'Equipe Raon',
    priority: 'media' as TaskPriority,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'a_fazer' as TaskStatus,
  });

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'a_fazer', label: 'A Fazer', color: 'border-slate-400 bg-slate-500/10' },
    { id: 'em_andamento', label: 'Em Andamento', color: 'border-[#0878D9] bg-[#0878D9]/10' },
    { id: 'aguardando_cliente', label: 'Aguardando Cliente', color: 'border-amber-500 bg-amber-500/10' },
    { id: 'em_revisao', label: 'Em Revisão', color: 'border-purple-500 bg-purple-500/10' },
    { id: 'concluida', label: 'Concluída', color: 'border-emerald-500 bg-emerald-500/10' },
    { id: 'cancelada', label: 'Cancelada', color: 'border-red-500 bg-red-500/10' },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchPriority = priorityFilter === 'todas' || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    const cl = clients.find((c) => c.id === formData.clientId);

    try {
      await createTask(
        {
          clientId: formData.clientId || undefined,
          clientName: cl?.companyName || 'Geral Raon',
          serviceName: formData.serviceName,
          title: formData.title,
          description: formData.description,
          assignedTo: formData.assignedTo,
          priority: formData.priority,
          dueDate: formData.dueDate,
          status: formData.status,
          comments: [],
        },
        user?.email || 'somosraon@gmail.com'
      );
      setIsNewTaskOpen(false);
      setFormData({
        clientId: '',
        serviceName: 'Redes Sociais',
        title: '',
        description: '',
        assignedTo: 'Equipe Raon',
        priority: 'media',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'a_fazer',
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar tarefa.');
    }
  };

  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, { status: newStatus }, user?.email || 'somosraon@gmail.com');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newCommentText.trim()) return;
    try {
      await addTaskComment(selectedTask.id, {
        userName: user?.displayName || user?.email || 'Equipe Raon',
        userRole: 'Colaborador',
        content: newCommentText,
        createdAt: new Date().toISOString(),
      });
      setNewCommentText('');
      onRefresh();
      // Update local view
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              comments: [
                ...(prev.comments || []),
                {
                  id: `comm_${Date.now()}`,
                  userName: user?.displayName || user?.email || 'Equipe Raon',
                  userRole: 'Colaborador',
                  content: newCommentText,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : null
      );
    } catch (err) {
      console.error(err);
    }
  };

  const priorityBadge: Record<TaskPriority, { text: string; bg: string }> = {
    baixa: { text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
    media: { text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    alta: { text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    urgente: { text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Tarefas & Entregas Operacionais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão de produção por cliente com visualização em Kanban, Lista e Calendário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'lista'
                  ? 'bg-white dark:bg-[#10192A] text-[#0878D9] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, cliente ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Prioridade:</span>
          {(['todas', 'urgente', 'alta', 'media', 'baixa'] as const).map((pr) => (
            <button
              key={pr}
              onClick={() => setPriorityFilter(pr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                priorityFilter === pr
                  ? 'bg-[#102B59] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {pr}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== VIEW 1: KANBAN ==================== */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col bg-slate-100/60 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0878D9]" />
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[65vh]">
                  {colTasks.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-[11px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="p-3 bg-white dark:bg-[#10192A] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#0878D9] hover:shadow-md transition-all cursor-pointer group space-y-2"
                      >
                        {/* Client & Priority */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-[#0878D9] truncate max-w-[120px]">
                            {task.clientName || 'Geral'}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              priorityBadge[task.priority]?.bg
                            } ${priorityBadge[task.priority]?.text}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Footer info */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                          {task.comments && task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3 text-[#FF7817]" />
                              {task.comments.length}
                            </span>
                          )}
                        </div>

                        {/* Fast Move select */}
                        <div onClick={(e) => e.stopPropagation()} className="pt-1">
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateStatus(task, e.target.value as TaskStatus)}
                            className="w-full text-[10px] font-bold p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                          >
                            <option value="a_fazer">Mover: A Fazer</option>
                            <option value="em_andamento">Mover: Em Andamento</option>
                            <option value="aguardando_cliente">Mover: Aguardando Cliente</option>
                            <option value="em_revisao">Mover: Em Revisão</option>
                            <option value="concluida">Mover: Concluída</option>
                            <option value="cancelada">Mover: Cancelada</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== VIEW 2: LISTA ==================== */}
      {viewMode === 'lista' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                <th className="py-3 px-4">Tarefa</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Prazo</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                >
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {t.title}
                  </td>
                  <td className="py-3 px-4 text-[#0878D9] font-semibold">{t.clientName}</td>
                  <td className="py-3 px-4 text-slate-500">{t.serviceName}</td>
                  <td className="py-3 px-4">{t.assignedTo || 'Equipe Raon'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        priorityBadge[t.priority]?.bg
                      } ${priorityBadge[t.priority]?.text}`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{t.dueDate}</td>
                  <td className="py-3 px-4 font-black uppercase text-[10px]">
                    {t.status.replace('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== MODAL: DETALHES DA TAREFA & COMENTÁRIOS ==================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7817]">
                  {selectedTask.serviceName || 'Serviço Agência Raon'}
                </span>
                <h3 className="font-bold text-base leading-tight mt-0.5">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <strong className="text-slate-800 dark:text-white">{selectedTask.clientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prazo:</span>
                  <strong className="text-slate-800 dark:text-white">{selectedTask.dueDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Responsável:</span>
                  <strong className="text-slate-800 dark:text-white">{selectedTask.assignedTo}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição / Briefing</h4>
                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'Nenhum detalhe adicional fornecido.'}
                </p>
              </div>

              {/* Comments Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#0878D9]" />
                  Comentários & Alinhamentos ({selectedTask.comments?.length || 0})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                    <p className="text-slate-400 text-center py-3">Nenhum comentário ainda.</p>
                  ) : (
                    selectedTask.comments.map((comm) => (
                      <div
                        key={comm.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {comm.userName}
                          </span>
                          <span>{new Date(comm.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300 leading-normal">
                          {comm.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Adicionar nota ou atualização..."
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-2 bg-[#0878D9] text-white rounded-xl hover:bg-[#0768BD]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVA TAREFA ==================== */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Criar Nova Tarefa / Entrega</h3>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Roteiro e Edição de 4 Reels Semanais"
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Cliente</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Geral / Agência Raon</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Serviço Relacionado</label>
                  <input
                    type="text"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    placeholder="Ex: Reels, Tráfego Pago, Design..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Prazo de Entrega</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Status Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="a_fazer">A Fazer</option>
                    <option value="em_andamento">Em Andamento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Descrição / Briefing</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Orientações de produção, links de referências e requisitos..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0878D9] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
