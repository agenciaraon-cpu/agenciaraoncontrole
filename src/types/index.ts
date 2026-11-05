export type UserRole = 'ADMINISTRADOR' | 'FINANCEIRO' | 'COLABORADOR';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ClientStatus = 'ativo' | 'inativo' | 'suspenso' | 'cancelado';

export interface Client {
  id: string;
  code: string;
  companyName: string;
  tradeName?: string;
  responsibleName: string;
  taxId?: string; // CPF or CNPJ
  phone?: string;
  whatsapp: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  googleProfile?: string;
  responsibleBirthDate?: string; // YYYY-MM-DD
  companyAnniversaryDate?: string; // YYYY-MM-DD
  entryDate?: string; // YYYY-MM-DD
  planId?: string;
  planName?: string;
  monthlyFee: number;
  dueDay: number;
  status: ClientStatus;
  notes?: string;
  congratulatedYear?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  frequency: string;
  estimatedQty?: number;
  referencePrice?: number;
  active: boolean;
  createdAt?: string;
}

export interface PlanServiceDetail {
  serviceId: string;
  name: string;
  frequency?: string;
  quantity?: number;
  customPrice?: number;
  notes?: string;
}

export interface Plan {
  id: string;
  code: 'START_BRONZE' | 'PRATA_PLUS' | 'GOLD_ESSENCIAL' | 'PERSONALIZADO';
  name: string;
  description: string;
  defaultServiceIds: string[];
  active: boolean;
  tagColor?: string;
}

export type ContractStatus = 'vigente' | 'renovado' | 'suspenso' | 'cancelado' | 'encerrado';

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  planId: string;
  planName: string;
  monthlyFee: number;
  startDate: string;
  endDate?: string;
  dueDay: number;
  paymentMethod: string;
  discount: number;
  services: PlanServiceDetail[];
  notes?: string;
  status: ContractStatus;
  documentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReceivableStatus = 'pendente' | 'recebido' | 'parcial' | 'vencido' | 'cancelado';

export interface Receivable {
  id: string;
  clientId: string;
  clientName: string;
  contractId?: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  competence: string; // MM/YYYY
  originalAmount: number;
  discountAmount: number;
  paidAmount: number;
  status: ReceivableStatus;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseStatus = 'pendente' | 'pago' | 'vencido';

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  dueDate: string;
  competence: string;
  amount: number;
  supplierName?: string;
  status: ExpenseStatus;
  paymentDate?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'receita' | 'despesa_fixa' | 'despesa_variavel' | 'ferramenta' | 'operacional';
  active: boolean;
}

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'aguardando_cliente' | 'em_revisao' | 'concluida' | 'cancelada';
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface TaskComment {
  id: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  clientId?: string;
  clientName?: string;
  serviceName?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  comments?: TaskComment[];
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentCategory = 'contrato' | 'comprovante' | 'briefing' | 'arte' | 'administrativo';

export interface AppDocument {
  id: string;
  clientId?: string;
  clientName?: string;
  contractId?: string;
  receivableId?: string;
  expenseId?: string;
  name: string;
  category: DocumentCategory;
  fileUrl?: string;
  fileSize?: string;
  notes?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'aniversario' | 'vencimento' | 'inadimplencia' | 'contrato' | 'tarefa';
  priority: 'baixa' | 'media' | 'alta';
  read: boolean;
  linkUrl?: string;
  createdAt?: string;
}

export interface ContactLog {
  id: string;
  clientId: string;
  clientName: string;
  type: 'whatsapp' | 'email' | 'telefone';
  templateUsed?: string;
  messageContent: string;
  sentBy: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt?: string;
}

export interface AgencySettings {
  name: string;
  tradeName: string;
  instagram: string;
  whatsapp: string;
  adminEmail: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  updatedAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'plans'
  | 'contracts'
  | 'financial'
  | 'birthdays'
  | 'tasks'
  | 'documents'
  | 'reports'
  | 'settings';
