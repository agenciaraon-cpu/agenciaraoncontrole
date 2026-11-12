import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  ArrowUpDown,
  Sparkles,
  Trash2,
  MessageCircle,
  Bell,
  BellRing,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
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
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'dueDate' | 'requestedDate' | 'priority'>('dueDate');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Celular & Notificações WhatsApp / Push
  const [notificationPhone, setNotificationPhone] = useState<string>(() => {
    return localStorage.getItem('raon_admin_notification_phone') || '(75) 98864-4742';
  });
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [tempPhone, setTempPhone] = useState(notificationPhone);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationTargetTask, setNotificationTargetTask] = useState<Task | null>(null);
  const [isDigestMode, setIsDigestMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    serviceName: 'Redes Sociais',
    title: '',
    description: '',
    assignedTo: 'Equipe Raon',
    priority: 'media' as TaskPriority,
    requestedDate: todayStr,
    dueDate: todayStr,
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

  const priorityWeights: Record<TaskPriority, number> = {
    urgente: 4,
    alta: 3,
    media: 2,
    baixa: 1,
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchSearch =
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchPriority = priorityFilter === 'todas' || t.priority === priorityFilter;
        return matchSearch && matchPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortBy === 'requestedDate') {
          const reqA = a.requestedDate || a.createdAt || '';
          const reqB = b.requestedDate || b.createdAt || '';
          return reqB.localeCompare(reqA); // Most recent requests first
        }
        if (sortBy === 'priority') {
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        }
        return 0;
      });
  }, [tasks, searchTerm, priorityFilter, sortBy]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Por favor, informe o título da tarefa.');
      return;
    }
    const cl = clients.find((c) => c.id === formData.clientId);

    setIsSavingTask(true);
    try {
      const taskPayload: Record<string, any> = {
        clientName: cl?.companyName || 'Geral Raon',
        serviceName: formData.serviceName.trim() || 'Geral',
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        assignedTo: formData.assignedTo.trim() || 'Equipe Raon',
        priority: formData.priority || 'media',
        requestedDate: formData.requestedDate || todayStr,
        dueDate: formData.dueDate || todayStr,
        status: formData.status || 'a_fazer',
        comments: [],
      };

      if (formData.clientId) {
        taskPayload.clientId = formData.clientId;
      }
      if (formData.status === 'concluida') {
        taskPayload.completedAt = todayStr;
      }

      await createTask(taskPayload as any, user?.email || 'agenciaraon@gmail.com');
      setIsNewTaskOpen(false);
      setFormData({
        clientId: '',
        serviceName: 'Redes Sociais',
        title: '',
        description: '',
        assignedTo: 'Equipe Raon',
        priority: 'media',
        requestedDate: todayStr,
        dueDate: todayStr,
        status: 'a_fazer',
      });
      alert('✓ Tarefa criada e salva com sucesso!');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err);
      alert('Não foi possível salvar a tarefa: ' + (err?.message || 'Verifique a conexão.'));
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus) => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'concluida') {
        updateData.completedAt = todayStr;
      }
      await updateTask(task.id, updateData, user?.email || 'agenciaraon@gmail.com');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao atualizar status da tarefa:', err);
      alert('Erro ao atualizar status: ' + (err?.message || 'Tente novamente.'));
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Deseja realmente excluir a tarefa "${task.title}"?`)) return;
    setIsDeletingTask(true);
    try {
      await deleteTask(task.id, task.title, user?.email || 'agenciaraon@gmail.com');
      setSelectedTask(null);
      alert('✓ Tarefa excluída com sucesso!');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao excluir tarefa:', err);
      alert('Erro ao excluir tarefa: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsDeletingTask(false);
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

  // Tarefas com vencimento HOJE e atrasadas
  const tasksDueToday = useMemo(() => {
    return tasks.filter(
      (t) => t.dueDate === todayStr && t.status !== 'concluida' && t.status !== 'cancelada'
    );
  }, [tasks, todayStr]);

  const tasksOverdue = useMemo(() => {
    return tasks.filter(
      (t) => t.dueDate < todayStr && t.status !== 'concluida' && t.status !== 'cancelada'
    );
  }, [tasks, todayStr]);

  const generateSingleTaskMessage = (t: Task) => {
    const priorityEmoji = t.priority === 'urgente' ? '🔴' : t.priority === 'alta' ? '🟠' : '🔵';
    return (
      `🚨 *LEMBRETE DE TAREFA NO VENCIMENTO — AGÊNCIA RAON* 🚀\n\n` +
      `📌 *Tarefa:* ${t.title}\n` +
      `🏢 *Cliente:* ${t.clientName || 'Geral Raon'}\n` +
      `🛠️ *Serviço:* ${t.serviceName || 'Operacional'}\n` +
      `📅 *Prazo de Entrega:* HOJE (${t.dueDate})\n` +
      `⚡ *Prioridade:* ${priorityEmoji} ${t.priority.toUpperCase()}\n` +
      `👤 *Responsável:* ${t.assignedTo || 'Equipe Raon'}\n` +
      (t.description ? `📝 *Briefing:* ${t.description}\n` : '') +
      `\n🌐 _Acesse o RAON PAINEL para atualizar ou concluir a entrega._`
    );
  };

  const generateDigestMessage = () => {
    const todayFormatted = new Date().toLocaleDateString('pt-BR');
    let msg = `🚨 *AGENDA DE TAREFAS DE HOJE (${todayFormatted}) — AGÊNCIA RAON* 🚀\n\n`;
    if (tasksDueToday.length === 0) {
      msg += `✅ Nenhuma tarefa com vencimento para hoje! Todas as entregas estão em dia.\n\n`;
    } else {
      msg += `Você tem *${tasksDueToday.length} tarefa(s)* com vencimento para *HOJE*:\n\n`;
      tasksDueToday.forEach((t, i) => {
        const pEmoji = t.priority === 'urgente' ? '🔴' : t.priority === 'alta' ? '🟠' : '🔹';
        msg += `${i + 1}. ${pEmoji} *${t.title}*\n   🏢 Cliente: ${t.clientName || 'Geral'}\n   🛠️ Serviço: ${t.serviceName || 'Geral'}\n   👤 Responsável: ${t.assignedTo}\n\n`;
      });
    }
    if (tasksOverdue.length > 0) {
      msg += `⚠️ *Atenção:* Há também *${tasksOverdue.length} tarefa(s) atrasada(s)* pendentes!\n\n`;
    }
    msg += `🌐 _Acesse o RAON PAINEL para gerenciar e acompanhar a equipe._`;
    return msg;
  };

  const handleSendWhatsApp = (message: string) => {
    const clean = notificationPhone.replace(/\D/g, '');
    const formatted = clean.startsWith('55')
      ? clean
      : clean.length >= 10
      ? `55${clean}`
      : clean;
    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleOpenWhatsAppDigest = () => {
    setIsDigestMode(true);
    setNotificationTargetTask(null);
    setCopied(false);
    setNotificationModalOpen(true);
  };

  const handleOpenWhatsAppTaskAlert = (task: Task) => {
    setIsDigestMode(false);
    setNotificationTargetTask(task);
    setCopied(false);
    setNotificationModalOpen(true);
  };

  const handleSavePhone = (newPhone: string) => {
    setNotificationPhone(newPhone);
    localStorage.setItem('raon_admin_notification_phone', newPhone);
    setIsPhoneModalOpen(false);
    alert('✓ Número de WhatsApp para notificações salvo com sucesso!');
  };

  const handleEnableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador atual não suporta notificações nativas push. Você pode utilizar o botão de envio para o seu WhatsApp!');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        if (tasksDueToday.length > 0) {
          new Notification('Agência Raon — Tarefas no Vencimento!', {
            body: `Você possui ${tasksDueToday.length} tarefa(s) com vencimento para HOJE!`,
            icon: '/favicon.ico',
          });
        } else {
          new Notification('Agência Raon — Alertas Ativados!', {
            body: 'Você receberá avisos no celular/navegador quando houver tarefas no dia do vencimento.',
            icon: '/favicon.ico',
          });
        }
        alert('✓ Notificações no celular/navegador ativadas com sucesso!');
      } else {
        alert('Permissão de notificações não foi concedida nas configurações do dispositivo.');
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#0878D9]" />
            Tarefas & Entregas Operacionais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão de pedidos com rastreamento da data de solicitação, prazo de entrega e conclusão.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            <span>+ Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* ==================== BANNER DE NOTIFICAÇÕES NO CELULAR / WHATSAPP ==================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#102B59] to-[#0B407A] text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-400/20">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#25D366]/20 text-[#25D366] shrink-0 border border-[#25D366]/30">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-white">
                Notificações de Vencimento no Celular & WhatsApp
              </h3>
              {tasksDueToday.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black animate-pulse">
                  {tasksDueToday.length} {tasksDueToday.length === 1 ? 'vence hoje' : 'vencem hoje'}
                </span>
              )}
              {tasksOverdue.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-black">
                  {tasksOverdue.length} {tasksOverdue.length === 1 ? 'atrasada' : 'atrasadas'}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-100/80 mt-1 max-w-2xl leading-relaxed">
              Receba os alertas de tarefas no dia do vencimento direto no seu celular. Você pode disparar o resumo diário com 1 clique para o WhatsApp pessoal <strong>{notificationPhone}</strong> ou ativar notificações push.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto w-full md:w-auto justify-end">
          <button
            onClick={handleOpenWhatsAppDigest}
            className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
            title="Disparar resumo das tarefas de hoje para o WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar Resumo para Meu WhatsApp</span>
          </button>

          <button
            onClick={handleEnableBrowserNotifications}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
            title="Ativar alertas na tela do celular / navegador"
          >
            <Bell className="w-4 h-4 text-amber-300" />
            <span>Ativar Alertas no Celular</span>
          </button>

          <button
            onClick={() => {
              setTempPhone(notificationPhone);
              setIsPhoneModalOpen(true);
            }}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
            title="Alterar número de celular para notificações"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Sorting bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, cliente ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Prioridade:</span>
            {(['todas', 'urgente', 'alta', 'media', 'baixa'] as const).map((pr) => (
              <button
                key={pr}
                onClick={() => setPriorityFilter(pr)}
                className={`px-2 py-1 rounded-lg text-xs font-bold capitalize ${
                  priorityFilter === pr
                    ? 'bg-[#102B59] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-400">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="dueDate">Prazo de Entrega</option>
              <option value="requestedDate">Data do Pedido (Recentes)</option>
              <option value="priority">Prioridade</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================== VIEW 1: KANBAN ==================== */}
      {viewMode === 'kanban' && (
        <div className="flex items-start gap-4 overflow-x-auto pb-6 pt-1 px-1">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col bg-slate-100/70 dark:bg-slate-900/70 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 w-[300px] sm:w-[325px] shrink-0 shadow-xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      col.id === 'concluida' ? 'bg-emerald-500' :
                      col.id === 'em_andamento' ? 'bg-[#0878D9]' :
                      col.id === 'aguardando_cliente' ? 'bg-amber-500' :
                      col.id === 'em_revisao' ? 'bg-purple-500' :
                      col.id === 'cancelada' ? 'bg-red-500' : 'bg-slate-400'
                    }`} />
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List - Ample space, no text clipped */}
                <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[76vh] p-1">
                  {colTasks.length === 0 ? (
                    <div className="p-5 text-center text-slate-400 text-[11px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Nenhuma tarefa nesta etapa
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isOverdue = task.dueDate < todayStr && task.status !== 'concluida' && task.status !== 'cancelada';
                      const isDueToday = task.dueDate === todayStr && task.status !== 'concluida' && task.status !== 'cancelada';
                      const isUrgent = task.priority === 'urgente';

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`relative p-3.5 rounded-2xl transition-all cursor-pointer group space-y-2.5 ${
                            isUrgent
                              ? 'urgent-task-glow bg-red-50/70 dark:bg-red-950/30'
                              : isOverdue
                              ? 'bg-white dark:bg-[#10192A] border-2 border-red-300 dark:border-red-900/60 shadow-xs hover:border-red-400'
                              : 'bg-white dark:bg-[#10192A] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-[#0878D9] hover:shadow-md'
                          }`}
                        >
                          {/* Client & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-[#0878D9] dark:text-[#38BDF8] break-words block leading-tight">
                                {task.clientName || 'Geral Raon'}
                              </span>
                              {task.serviceName && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {task.serviceName}
                                </span>
                              )}
                            </div>

                            {isUrgent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-600 text-white animate-pulse shadow-xs shrink-0">
                                <AlertCircle className="w-3 h-3" />
                                URGENTE
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                                  priorityBadge[task.priority]?.bg
                                } ${priorityBadge[task.priority]?.text}`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>

                          {/* Task Title - completely visible in full, no truncation or line clamp */}
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug break-words">
                            {task.title}
                          </h4>

                          {/* Briefing / Description preview (if exists) */}
                          {task.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 break-words leading-relaxed whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}

                          {/* Tracking Dates: Solicitação, Prazo de Entrega, Conclusão, Responsável */}
                          <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {task.requestedDate && (
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  Solicitado:
                                </span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{task.requestedDate}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-black' : isDueToday ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                <Clock className="w-3 h-3" />
                                {isOverdue ? 'Atrasado:' : isDueToday ? 'Entrega Hoje:' : 'Prazo de Entrega:'}
                              </span>
                              <span
                                className={`font-black ${
                                  isOverdue
                                    ? 'text-red-600 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded'
                                    : isDueToday
                                    ? 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {task.dueDate}
                              </span>
                            </div>

                            {task.completedAt && (
                              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-500/20">
                                <span className="font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Concluído em:
                                </span>
                                <span className="font-black">{task.completedAt}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-0.5">
                              <span className="flex items-center gap-1 text-slate-400">
                                <User className="w-3 h-3" />
                                Responsável:
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{task.assignedTo || 'Equipe Raon'}</span>
                            </div>
                          </div>

                          {/* Fast Move select, WhatsApp reminder button, Quick Delete */}
                          <div onClick={(e) => e.stopPropagation()} className="pt-2 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateStatus(task, e.target.value as TaskStatus)}
                              className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-[#0878D9]"
                            >
                              <option value="a_fazer">Mover: A Fazer</option>
                              <option value="em_andamento">Mover: Em Andamento</option>
                              <option value="aguardando_cliente">Mover: Aguardando Cliente</option>
                              <option value="em_revisao">Mover: Em Revisão</option>
                              <option value="concluida">Mover: Concluída</option>
                              <option value="cancelada">Mover: Cancelada</option>
                            </select>

                            <button
                              onClick={() => handleOpenWhatsAppTaskAlert(task)}
                              className="p-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white text-[#25D366] transition-colors shrink-0 shadow-xs"
                              title="Enviar lembrete desta tarefa para o WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== VIEW 2: LISTA DETALHADA ==================== */}
      {viewMode === 'lista' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500">
                <th className="py-3 px-4">Tarefa / Cliente</th>
                <th className="py-3 px-4">Data Pedido</th>
                <th className="py-3 px-4">Prazo de Entrega</th>
                <th className="py-3 px-4">Conclusão</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isOverdue = t.dueDate < todayStr && t.status !== 'concluida' && t.status !== 'cancelada';
                  const isUrgent = t.priority === 'urgente';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isUrgent
                          ? 'bg-red-50/60 dark:bg-red-950/25 border-l-4 border-l-red-600'
                          : isOverdue
                          ? 'border-l-4 border-l-amber-500'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase animate-pulse shrink-0">
                              🚨 URGENTE
                            </span>
                          )}
                          <div className="font-bold text-slate-800 dark:text-slate-200">{t.title}</div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{t.clientName} • {t.serviceName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{t.requestedDate || '—'}</td>
                      <td className={`py-3 px-4 font-mono font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                        {t.dueDate}
                        {isOverdue && <span className="ml-1 text-[10px] text-red-500 uppercase font-black">(Atrasada)</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{t.completedAt || '—'}</td>
                      <td className="py-3 px-4">
                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-600 text-white animate-pulse shadow-xs">
                            <AlertCircle className="w-3 h-3" />
                            URGENTE
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${priorityBadge[t.priority]?.bg} ${priorityBadge[t.priority]?.text}`}>
                            {t.priority}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenWhatsAppTaskAlert(t)}
                            className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white text-[#25D366] transition-colors"
                            title="Enviar lembrete desta tarefa para o WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(t, t.status === 'concluida' ? 'em_andamento' : 'concluida')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                              t.status === 'concluida'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {t.status === 'concluida' ? 'Reabrir' : 'Concluir'}
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
      )}

      {/* ==================== MODAL: DETALHE DA TAREFA ==================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-300 tracking-wider">
                  {selectedTask.serviceName || 'Geral'}
                </span>
                <h3 className="font-bold text-base text-white">{selectedTask.title}</h3>
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
                  <span className="text-slate-400">Data do Pedido / Solicitação:</span>
                  <strong className="text-slate-800 dark:text-white">{selectedTask.requestedDate || '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prazo de Entrega:</span>
                  <strong className="text-slate-800 dark:text-white">{selectedTask.dueDate}</strong>
                </div>
                {selectedTask.completedAt && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="font-bold">Data de Conclusão:</span>
                    <strong className="font-black">{selectedTask.completedAt}</strong>
                  </div>
                )}
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

            {/* Modal Footer with Actions */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask)}
                disabled={isDeletingTask}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingTask ? 'Excluindo...' : 'Excluir Tarefa'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const newSt = selectedTask.status === 'concluida' ? 'em_andamento' : 'concluida';
                  handleUpdateStatus(selectedTask, newSt);
                  setSelectedTask((prev) => (prev ? { ...prev, status: newSt, completedAt: newSt === 'concluida' ? todayStr : undefined } : null));
                }}
                className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-xs transition-colors ${
                  selectedTask.status === 'concluida'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {selectedTask.status === 'concluida' ? 'Reabrir Tarefa' : '✓ Marcar como Concluída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVA TAREFA ==================== */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Criar Nova Tarefa / Solicitação</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Data do Pedido / Solicitação *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.requestedDate}
                    onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Data do Prazo / Entrega *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="font-bold text-slate-600 dark:text-slate-400">Status Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="a_fazer">A Fazer</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
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
                  disabled={isSavingTask}
                  className="px-5 py-2 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSavingTask ? 'Salvando Tarefa...' : 'Salvar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DISPARO DE NOTIFICAÇÃO NO WHATSAPP ==================== */}
      {notificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#25D366] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {isDigestMode
                    ? 'Resumo de Tarefas de Hoje no WhatsApp'
                    : `Lembrete de Vencimento: ${notificationTargetTask?.title}`}
                </h3>
              </div>
              <button
                onClick={() => setNotificationModalOpen(false)}
                className="p-1 text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Recipient Phone info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Número de Destino (Seu Celular / WhatsApp)
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {notificationPhone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempPhone(notificationPhone);
                    setIsPhoneModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#0878D9] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                >
                  Alterar Número
                </button>
              </div>

              {/* Message preview */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Mensagem Formatada para Envio
                </label>
                <textarea
                  readOnly
                  rows={9}
                  value={
                    isDigestMode
                      ? generateDigestMessage()
                      : notificationTargetTask
                      ? generateSingleTaskMessage(notificationTargetTask)
                      : ''
                  }
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl leading-relaxed text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-[11px]">
                💡 <strong>Como funciona:</strong> Ao clicar em <em>"Abrir no WhatsApp"</em>, o aplicativo do WhatsApp será aberto no seu celular ou computador com o número <strong>{notificationPhone}</strong> e o texto prontos para envio.
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const text = isDigestMode
                      ? generateDigestMessage()
                      : notificationTargetTask
                      ? generateSingleTaskMessage(notificationTargetTask)
                      : '';
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotificationModalOpen(false)}
                    className="px-3 py-2 text-slate-500 font-bold text-xs"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = isDigestMode
                        ? generateDigestMessage()
                        : notificationTargetTask
                        ? generateSingleTaskMessage(notificationTargetTask)
                        : '';
                      handleSendWhatsApp(text);
                    }}
                    className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir no WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONFIGURAR NÚMERO DE NOTIFICAÇÃO ==================== */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#10192A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-[#102B59] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                <h3 className="font-bold text-sm">Seu Celular para Notificações</h3>
              </div>
              <button
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Número com DDD (WhatsApp)
                </label>
                <input
                  type="text"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="Ex: (75) 98864-4742"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm text-[#25D366]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Este número será usado para receber resumos das tarefas e alertas de vencimento com 1 clique.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-3 py-2 text-slate-500 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePhone(tempPhone)}
                  className="px-4 py-2 bg-[#0878D9] hover:bg-[#0768BD] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Celular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
