import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Client,
  ServiceItem,
  Plan,
  Contract,
  Receivable,
  Expense,
  FinancialCategory,
  Task,
  TaskComment,
  AppDocument,
  NotificationItem,
  ContactLog,
  AuditLog,
  AgencySettings,
  ProductService,
  ProductCategory,
  Sale,
  RevenueSource,
} from '../types';

// ==================== AUDIT LOGGING ====================
export async function logAudit(
  userEmail: string,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details: string
) {
  try {
    const colRef = collection(db, 'audit_logs');
    const logItem: Omit<AuditLog, 'id'> = {
      userId,
      userEmail,
      entityType,
      entityId,
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    await addDoc(colRef, logItem);
  } catch (err) {
    console.error('Falha ao registrar auditoria:', err);
  }
}

// ==================== AGENCY SETTINGS ====================
const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  name: 'Agência Raon',
  tradeName: 'Raon Comunicação & Estratégia',
  instagram: '@somosraon',
  whatsapp: '(75) 98864-4742',
  adminEmail: 'somosraon@gmail.com',
  address: 'Bahia, Brasil',
  phone: '(75) 98864-4742',
  updatedAt: new Date().toISOString(),
};

export async function getAgencySettings(): Promise<AgencySettings> {
  try {
    const docRef = doc(db, 'agency_settings', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AgencySettings;
    }
    await setDoc(docRef, DEFAULT_AGENCY_SETTINGS);
    return DEFAULT_AGENCY_SETTINGS;
  } catch (err) {
    console.warn('Erro ao carregar configurações da agência:', err);
    return DEFAULT_AGENCY_SETTINGS;
  }
}

export async function updateAgencySettings(settings: Partial<AgencySettings>, userEmail: string): Promise<void> {
  try {
    const docRef = doc(db, 'agency_settings', 'main');
    const updated = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, updated, { merge: true });
    await logAudit(userEmail, 'user', 'agency_settings', 'main', 'update', 'Atualização dos dados institucionais');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'agency_settings/main');
  }
}

// ==================== CLIENTS ====================
export async function getClients(): Promise<Client[]> {
  try {
    const colRef = collection(db, 'clients');
    const snap = await getDocs(colRef);
    const list: Client[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Client);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'clients');
  }
}

export async function createClient(client: Omit<Client, 'id'>, userEmail: string): Promise<string> {
  try {
    const colRef = collection(db, 'clients');
    const docRef = await addDoc(colRef, {
      ...client,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'client', docRef.id, 'create', `Cadastro do cliente ${client.companyName} (${client.code})`);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'clients');
  }
}

export async function updateClient(id: string, updates: Partial<Client>, userEmail: string): Promise<void> {
  try {
    const docRef = doc(db, 'clients', id);
    
    // Clean any undefined keys to prevent Firestore crashes
    const cleanUpdates: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    Object.keys(cleanUpdates).forEach((k) => {
      if (cleanUpdates[k] === undefined) delete cleanUpdates[k];
    });

    await updateDoc(docRef, cleanUpdates);

    // If client dueDay, monthlyFee, companyName, or planName changed, synchronize associated active contracts & pending receivables
    if (
      updates.dueDay !== undefined ||
      updates.monthlyFee !== undefined ||
      updates.companyName !== undefined ||
      updates.planName !== undefined
    ) {
      try {
        // 1. Sync matching contracts
        const contractsSnap = await getDocs(
          query(collection(db, 'contracts'), where('clientId', '==', id))
        );
        for (const cDoc of contractsSnap.docs) {
          const cUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
          if (updates.companyName) cUpdates.clientName = updates.companyName;
          if (updates.monthlyFee !== undefined) cUpdates.monthlyFee = Number(updates.monthlyFee);
          if (updates.dueDay !== undefined) cUpdates.dueDay = Number(updates.dueDay);
          if (updates.planName) cUpdates.planName = updates.planName;
          await updateDoc(cDoc.ref, cUpdates);
        }

        // 2. Sync pending receivables (not yet paid)
        const recSnap = await getDocs(
          query(collection(db, 'receivables'), where('clientId', '==', id))
        );
        const todayStr = new Date().toISOString().split('T')[0];

        for (const rDoc of recSnap.docs) {
          const r = rDoc.data() as Receivable;
          if (r.status !== 'recebido') {
            const rUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
            if (updates.companyName) rUpdates.clientName = updates.companyName;
            if (updates.monthlyFee !== undefined && (!r.paidAmount || r.paidAmount === 0)) {
              rUpdates.originalAmount = Number(updates.monthlyFee);
            }
            if (updates.dueDay !== undefined && r.dueDate) {
              const parts = r.dueDate.split('-');
              if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const daysInMonth = new Date(year, month, 0).getDate();
                const newDay = Math.min(Number(updates.dueDay), daysInMonth);
                const newDueDate = `${parts[0]}-${parts[1]}-${String(newDay).padStart(2, '0')}`;
                rUpdates.dueDate = newDueDate;
                rUpdates.status = newDueDate < todayStr ? 'vencido' : 'pendente';
              }
            }
            await updateDoc(rDoc.ref, rUpdates);
          }
        }
      } catch (syncErr) {
        console.warn('Aviso na sincronização de contratos/cobranças do cliente:', syncErr);
      }
    }

    await logAudit(userEmail, 'user', 'client', id, 'update', `Atualização cadastral do cliente ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
  }
}

export async function deleteClient(id: string, clientName: string, userEmail: string, permanent: boolean = true): Promise<void> {
  try {
    if (permanent) {
      await deleteDoc(doc(db, 'clients', id));
      await logAudit(userEmail, 'user', 'client', id, 'delete', `Exclusão permanente do cliente ${clientName}`);
    } else {
      const docRef = doc(db, 'clients', id);
      await updateDoc(docRef, {
        status: 'cancelado',
        updatedAt: new Date().toISOString(),
      });
      await logAudit(userEmail, 'user', 'client', id, 'cancel', `Cancelamento do cliente ${clientName}`);
    }
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
  }
}

export async function pauseClient(
  id: string,
  clientName: string,
  pauseReason: string,
  suspendBilling: boolean,
  userEmail: string
): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'clients', id);
    await updateDoc(docRef, {
      status: 'pausado',
      pausedAt: todayStr,
      pauseReason: pauseReason || 'Pausa temporária solicitada pelo cliente',
      suspendFutureBilling: suspendBilling,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(
      userEmail,
      'user',
      'client',
      id,
      'pause',
      `Cliente ${clientName} pausado em ${todayStr}. Motivo: ${pauseReason}. Suspensão de mensalidades: ${suspendBilling ? 'Sim' : 'Não'}`
    );
  } catch (err) {
    console.error('Erro ao pausar cliente:', err);
    handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
  }
}

export async function reactivateClient(
  id: string,
  clientName: string,
  resumedBillingDate: string,
  userEmail: string
): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'clients', id);
    await updateDoc(docRef, {
      status: 'ativo',
      reactivatedAt: todayStr,
      suspendFutureBilling: false,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(
      userEmail,
      'user',
      'client',
      id,
      'reactivate',
      `Cliente ${clientName} reativado em ${todayStr}. Próxima competência faturada a partir de: ${resumedBillingDate || todayStr}`
    );
  } catch (err) {
    console.error('Erro ao reativar cliente:', err);
    handleFirestoreError(err, OperationType.UPDATE, `clients/${id}`);
  }
}

// ==================== SERVICES ====================
export async function getServices(): Promise<ServiceItem[]> {
  try {
    const snap = await getDocs(collection(db, 'services'));
    const list: ServiceItem[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as ServiceItem);
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'services');
  }
}

export async function createService(service: Omit<ServiceItem, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'services'), {
      ...service,
      createdAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'service', docRef.id, 'create', `Criação do serviço ${service.name}`);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'services');
  }
}

export async function updateService(id: string, updates: Partial<ServiceItem>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'services', id), updates);
    await logAudit(userEmail, 'user', 'service', id, 'update', `Alteração de serviço ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `services/${id}`);
  }
}

export async function deleteService(id: string, serviceName: string, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'services', id), { active: false });
    await logAudit(userEmail, 'user', 'service', id, 'deactivate', `Desativação do serviço ${serviceName}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `services/${id}`);
  }
}

// ==================== PLANS ====================
export async function getPlans(): Promise<Plan[]> {
  try {
    const snap = await getDocs(collection(db, 'plans'));
    const list: Plan[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Plan);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'plans');
  }
}

export async function updatePlan(id: string, updates: Partial<Plan>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'plans', id), updates);
    await logAudit(userEmail, 'user', 'plan', id, 'update', `Atualização do plano ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `plans/${id}`);
  }
}

// ==================== CONTRACTS ====================
export async function getContracts(): Promise<Contract[]> {
  try {
    const snap = await getDocs(collection(db, 'contracts'));
    const list: Contract[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Contract);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'contracts');
  }
}

export async function createContract(
  contract: Omit<Contract, 'id'>,
  userEmail: string,
  autoGenerateMonths: number = 6
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'contracts'), {
      ...contract,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await logAudit(
      userEmail,
      'user',
      'contract',
      docRef.id,
      'create',
      `Contrato #${contract.contractNumber} criado para ${contract.clientName} (R$ ${contract.monthlyFee})`
    );

    // Auto-generate upcoming receivables without duplicates
    if (contract.monthlyFee > 0 && autoGenerateMonths > 0) {
      await generateReceivablesForContract(
        docRef.id,
        contract.clientId,
        contract.clientName,
        contract.monthlyFee,
        contract.dueDay,
        contract.startDate,
        autoGenerateMonths
      );
    }

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'contracts');
  }
}

export async function updateContract(id: string, updates: Partial<Contract>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'contracts', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'contract', id, 'update', `Alteração de contrato ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contracts/${id}`);
  }
}

// Helper to generate monthly invoices for a contract starting strictly from November 2026 (month 11)
export async function generateReceivablesForContract(
  contractId: string,
  clientId: string,
  clientName: string,
  monthlyFee: number,
  dueDay: number,
  startDateStr: string,
  monthsCount: number = 6
) {
  const existingReceivables = await getReceivables();

  // REGRA OBRIGATÓRIA: Contar cobranças estritamente a partir de Novembro (Mês 11 de 2026)
  // Não gerar débitos retroativos desde a data de entrada do cliente
  const now = new Date();
  const currentYear = now.getFullYear();
  // 10 is November in 0-indexed JS Month (mês 11)
  const novemberStart = new Date(currentYear, 10, 1);

  let baseDate = novemberStart;
  if (startDateStr) {
    const candidate = new Date(startDateStr);
    if (!isNaN(candidate.getTime())) {
      const candidateMonthStart = new Date(candidate.getFullYear(), candidate.getMonth(), 1);
      // Se a data de entrada for posterior a Novembro/2026, inicia a partir dela; caso contrário, inicia estritamente em Novembro
      if (candidateMonthStart > novemberStart) {
        baseDate = candidateMonthStart;
      }
    }
  }

  for (let i = 0; i < monthsCount; i++) {
    const targetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);

    // Garantia estrita: nunca gerar cobrança para meses anteriores a Novembro/2026
    if (targetMonth < novemberStart) {
      continue;
    }

    const monthNum = String(targetMonth.getMonth() + 1).padStart(2, '0');
    const yearNum = targetMonth.getFullYear();
    const competence = `${monthNum}/${yearNum}`;

    // Check if receivable already exists for this client and competence
    const exists = existingReceivables.some(
      (r) => r.clientId === clientId && r.competence === competence && r.status !== 'cancelado'
    );

    if (!exists) {
      // Calculate due date
      const daysInTargetMonth = new Date(yearNum, targetMonth.getMonth() + 1, 0).getDate();
      const actualDueDay = Math.min(dueDay || 10, daysInTargetMonth);
      const dueDate = `${yearNum}-${monthNum}-${String(actualDueDay).padStart(2, '0')}`;

      // Check if already overdue
      const todayStr = new Date().toISOString().split('T')[0];
      const initialStatus = dueDate < todayStr ? 'vencido' : 'pendente';

      await addDoc(collection(db, 'receivables'), {
        clientId,
        clientName,
        contractId,
        description: `Mensalidade ${competence} — ${clientName}`,
        dueDate,
        competence,
        originalAmount: monthlyFee,
        discountAmount: 0,
        paidAmount: 0,
        status: initialStatus,
        paymentMethod: 'PIX',
        revenueSource: 'agencia',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

// ==================== RECEIVABLES ====================
export async function getReceivables(): Promise<Receivable[]> {
  try {
    const snap = await getDocs(collection(db, 'receivables'));
    const list: Receivable[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Receivable);
    });
    return list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'receivables');
  }
}

export async function createReceivable(receivable: Omit<Receivable, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'receivables'), {
      ...receivable,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAudit(
      userEmail,
      'user',
      'receivable',
      docRef.id,
      'create',
      `Lançamento a receber: ${receivable.description} (R$ ${receivable.originalAmount})`
    );
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'receivables');
  }
}

export async function updateReceivable(id: string, updates: Partial<Receivable>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'receivables', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'receivable', id, 'update', `Atualização de cobrança ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `receivables/${id}`);
  }
}

export async function registerReceivablePayment(
  id: string,
  paidAmount: number,
  discountAmount: number,
  paymentMethod: string,
  paymentDate: string,
  userEmail: string,
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'receivables', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Cobrança não encontrada no banco de dados');
    const current = snap.data() as Receivable;

    const numericPaid = Number(paidAmount) || 0;
    const numericDiscount = Number(discountAmount) || 0;
    const totalPaid = (Number(current.paidAmount) || 0) + numericPaid;
    const finalOriginal = Number(current.originalAmount) - numericDiscount;
    const newStatus = totalPaid >= finalOriginal ? 'recebido' : totalPaid > 0 ? 'parcial' : 'pendente';

    const safePaymentDate = paymentDate || new Date().toISOString().split('T')[0];
    const safePaymentMethod = paymentMethod || current.paymentMethod || 'PIX';
    const safeNotes = notes !== undefined ? notes : (current.notes || '');

    const updates: Record<string, any> = {
      paidAmount: totalPaid,
      discountAmount: numericDiscount,
      paymentMethod: safePaymentMethod,
      paymentDate: safePaymentDate,
      status: newStatus,
      notes: safeNotes,
      updatedAt: new Date().toISOString(),
    };

    // Strip any potential undefined to prevent Firestore "Unsupported field value: undefined"
    Object.keys(updates).forEach((k) => {
      if (updates[k] === undefined) delete updates[k];
    });

    await updateDoc(docRef, updates);

    // If receivable is linked to a standalone sale, also sync the sale safely
    if (current.saleId) {
      try {
        const saleRef = doc(db, 'sales', current.saleId);
        const saleSnap = await getDoc(saleRef);
        if (saleSnap.exists()) {
          const sale = saleSnap.data() as Sale;
          const isFull = totalPaid >= Number(sale.totalAmount);
          await updateDoc(saleRef, {
            financialStatus: isFull ? 'pago' : 'parcial',
            paidAmount: totalPaid,
            paymentDate: safePaymentDate,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (saleErr) {
        console.warn('Aviso ao sincronizar venda vinculada:', saleErr);
      }
    }

    try {
      await logAudit(
        userEmail || 'agenciaraon@gmail.com',
        'user',
        'receivable',
        id,
        'payment_registered',
        `Baixa de pagamento no valor de R$ ${numericPaid} (${newStatus}) via ${safePaymentMethod}`
      );
    } catch (auditErr) {
      console.warn('Aviso em auditoria de baixa:', auditErr);
    }
  } catch (err) {
    console.error('Erro em registerReceivablePayment:', err);
    handleFirestoreError(err, OperationType.UPDATE, `receivables/${id}`);
  }
}

// Helper to remove any un-paid debts generated prior to November 2026 (mês 11)
export async function purgeDebtsBeforeNovember(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'receivables'));
    for (const d of snap.docs) {
      const r = d.data() as Receivable;
      // If dueDate is strictly prior to 2026-11-01 and it wasn't paid (or pending/vencido from past entryDate)
      if (r.dueDate && r.dueDate < '2026-11-01' && r.status !== 'recebido') {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Sincronização de cobranças a partir de Novembro:', err);
  }
}

// ==================== EXPENSES ====================
export async function getExpenses(): Promise<Expense[]> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    const list: Expense[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Expense);
    });
    return list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'expenses');
  }
}

export async function createExpense(expense: Omit<Expense, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expense,
      createdAt: new Date().toISOString(),
    });
    await logAudit(
      userEmail,
      'user',
      'expense',
      docRef.id,
      'create',
      `Lançamento de despesa: ${expense.description} (R$ ${expense.amount})`
    );
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'expenses');
  }
}

export async function updateExpense(id: string, updates: Partial<Expense>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'expenses', id), updates);
    await logAudit(userEmail, 'user', 'expense', id, 'update', `Atualização de despesa ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
  }
}

export async function deleteExpense(id: string, description: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', id));
    await logAudit(userEmail, 'user', 'expense', id, 'delete', `Exclusão da despesa ${description}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
  }
}

// ==================== FINANCIAL CATEGORIES ====================
export async function getFinancialCategories(): Promise<FinancialCategory[]> {
  try {
    const snap = await getDocs(collection(db, 'financial_categories'));
    const list: FinancialCategory[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as FinancialCategory);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'financial_categories');
  }
}

export async function createFinancialCategory(category: Omit<FinancialCategory, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'financial_categories'), category);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'financial_categories');
  }
}

// ==================== TASKS ====================
export async function getTasks(): Promise<Task[]> {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    const list: Task[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Task);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'tasks');
  }
}

export async function createTask(task: Omit<Task, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...task,
      comments: task.comments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'task', docRef.id, 'create', `Criação da tarefa: ${task.title}`);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'tasks');
  }
}

export async function updateTask(id: string, updates: Partial<Task>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'tasks', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'task', id, 'update', `Atualização da tarefa ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
  }
}

export async function addTaskComment(taskId: string, comment: Omit<TaskComment, 'id'>): Promise<void> {
  try {
    const docRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const task = snap.data() as Task;
    const currentComments = task.comments || [];
    const newComment: TaskComment = {
      ...comment,
      id: `comm_${Date.now()}`,
    };
    await updateDoc(docRef, {
      comments: [...currentComments, newComment],
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
  }
}

export async function deleteTask(id: string, title: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tasks', id));
    await logAudit(userEmail, 'user', 'task', id, 'delete', `Exclusão da tarefa: ${title}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
  }
}

// ==================== DOCUMENTS ====================
export async function getDocuments(): Promise<AppDocument[]> {
  try {
    const snap = await getDocs(collection(db, 'documents'));
    const list: AppDocument[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as AppDocument);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'documents');
  }
}

export async function createDocument(docItem: Omit<AppDocument, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      ...docItem,
      createdAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'document', docRef.id, 'upload', `Armazenamento do documento: ${docItem.name}`);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'documents');
  }
}

export async function deleteDocument(id: string, name: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'documents', id));
    await logAudit(userEmail, 'user', 'document', id, 'delete', `Exclusão de documento: ${name}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `documents/${id}`);
  }
}

// ==================== NOTIFICATIONS ====================
export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const list: NotificationItem[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as NotificationItem);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'notifications');
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const promises: Promise<any>[] = [];
    snap.forEach((d) => {
      if (!d.data().read) {
        promises.push(updateDoc(doc(db, 'notifications', d.id), { read: true }));
      }
    });
    await Promise.all(promises);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export async function createNotification(notif: Omit<NotificationItem, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notif,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'notifications');
  }
}

// ==================== CONTACT LOGS ====================
export async function getContactLogs(clientId?: string): Promise<ContactLog[]> {
  try {
    const snap = await getDocs(collection(db, 'contact_logs'));
    const list: ContactLog[] = [];
    snap.forEach((d) => {
      const data = d.data() as ContactLog;
      if (!clientId || data.clientId === clientId) {
        list.push({ ...data, id: d.id });
      }
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'contact_logs');
  }
}

export async function createContactLog(logItem: Omit<ContactLog, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'contact_logs'), {
      ...logItem,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'contact_logs');
  }
}

// ==================== AUDIT LOGS ====================
export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const list: AuditLog[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as AuditLog);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'audit_logs');
    return [];
  }
}

// ==================== PRODUTOS E SERVIÇOS AVULSOS ====================
export async function getProductsServices(): Promise<ProductService[]> {
  try {
    const snap = await getDocs(collection(db, 'products_services'));
    const list: ProductService[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as ProductService);
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'products_services');
  }
}

export async function createProductService(item: Omit<ProductService, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'products_services'), {
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAudit(
      userEmail,
      'user',
      'product_service',
      docRef.id,
      'create',
      `Cadastro de ${item.type}: ${item.name} (${item.code || ''}) - R$ ${item.defaultPrice}`
    );
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'products_services');
  }
}

export async function updateProductService(id: string, updates: Partial<ProductService>, userEmail: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products_services', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'product_service', id, 'update', `Atualização do item ID ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products_services/${id}`);
  }
}

export async function deleteProductService(id: string, itemName: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products_services', id));
    await logAudit(userEmail, 'user', 'product_service', id, 'delete', `Exclusão do item ${itemName}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products_services/${id}`);
  }
}

// ==================== CATEGORIAS DE PRODUTOS E SERVIÇOS ====================
export async function getProductCategories(): Promise<ProductCategory[]> {
  try {
    const snap = await getDocs(collection(db, 'product_categories'));
    const list: ProductCategory[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as ProductCategory);
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'product_categories');
  }
}

export async function createProductCategory(cat: Omit<ProductCategory, 'id'>, userEmail: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'product_categories'), {
      ...cat,
      createdAt: new Date().toISOString(),
    });
    await logAudit(userEmail, 'user', 'product_category', docRef.id, 'create', `Criação da categoria: ${cat.name}`);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'product_categories');
  }
}

export async function deleteProductCategory(id: string, catName: string, userEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'product_categories', id));
    await logAudit(userEmail, 'user', 'product_category', id, 'delete', `Exclusão da categoria ${catName}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `product_categories/${id}`);
  }
}

// ==================== REGISTRO MANUAL DE VENDAS & INTEGRAÇÃO FINANCEIRA ====================
export async function getSales(): Promise<Sale[]> {
  try {
    const snap = await getDocs(collection(db, 'sales'));
    const list: Sale[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as Sale);
    });
    return list.sort((a, b) => (b.saleDate || '').localeCompare(a.saleDate || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'sales');
  }
}

export async function createSale(saleData: Omit<Sale, 'id'>, userEmail: string): Promise<string> {
  try {
    // 1. Create Sale document
    const saleCol = collection(db, 'sales');
    const saleDocRef = await addDoc(saleCol, {
      ...saleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const saleId = saleDocRef.id;
    const isPaid = saleData.financialStatus === 'pago';
    const isPartial = saleData.financialStatus === 'parcial';
    const finalPaid = isPaid ? saleData.totalAmount : isPartial ? (saleData.paidAmount || 0) : 0;
    const finalStatus = isPaid ? 'recebido' : isPartial ? 'parcial' : saleData.financialStatus === 'cancelado' ? 'cancelado' : 'pendente';
    const paymentDate = (isPaid || isPartial) ? (saleData.paymentDate || saleData.saleDate) : undefined;

    // Derive competence MM/YYYY from saleDate (YYYY-MM-DD)
    const [y, m] = saleData.saleDate.split('-');
    const competence = m && y ? `${m}/${y}` : `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

    // 2. Automatically create matching Receivable with revenueSource: 'produto' or 'servico_avulso'
    // This integrates directly into the financial module with zero duplication!
    const recRef = await addDoc(collection(db, 'receivables'), {
      clientId: '',
      clientName: saleData.buyerName ? `${saleData.buyerName} (${saleData.itemType === 'produto' ? 'Venda Produto' : 'Serviço Avulso'})` : `Venda Avulsa (${saleData.itemType === 'produto' ? 'Produto' : 'Serviço'})`,
      revenueSource: saleData.itemType === 'produto' ? 'produto' : 'servico_avulso',
      saleId: saleId,
      itemType: saleData.itemType,
      category: saleData.category,
      description: `Venda ${saleData.code || 'AVULSA'}: ${saleData.itemName} (${saleData.quantity}x)`,
      dueDate: saleData.saleDate,
      competence,
      originalAmount: saleData.totalAmount,
      discountAmount: saleData.discount || 0,
      paidAmount: finalPaid,
      status: finalStatus,
      paymentMethod: saleData.paymentMethod || 'PIX',
      paymentDate,
      notes: saleData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Update sale with receivableId link
    await updateDoc(saleDocRef, { receivableId: recRef.id });

    // 4. Update stock if physical product
    if (saleData.itemType === 'produto' && saleData.itemId) {
      try {
        const itemDocRef = doc(db, 'products_services', saleData.itemId);
        const itemSnap = await getDoc(itemDocRef);
        if (itemSnap.exists()) {
          const itemData = itemSnap.data() as ProductService;
          if (typeof itemData.stockQuantity === 'number') {
            const newStock = Math.max(0, itemData.stockQuantity - saleData.quantity);
            await updateDoc(itemDocRef, { stockQuantity: newStock, updatedAt: new Date().toISOString() });
          }
        }
      } catch (stockErr) {
        console.warn('Aviso ao atualizar estoque:', stockErr);
      }
    }

    await logAudit(
      userEmail,
      'user',
      'sale',
      saleId,
      'create',
      `Venda registrada: ${saleData.itemName} (${saleData.quantity}x) - Total: R$ ${saleData.totalAmount}. Status: ${saleData.financialStatus}`
    );

    return saleId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'sales');
  }
}

export async function confirmSalePayment(
  saleId: string,
  paidAmount: number,
  paymentDate: string,
  userEmail: string
): Promise<void> {
  try {
    const saleDocRef = doc(db, 'sales', saleId);
    const saleSnap = await getDoc(saleDocRef);
    if (!saleSnap.exists()) throw new Error('Venda não encontrada');
    const sale = saleSnap.data() as Sale;

    const actualPaymentDate = paymentDate || new Date().toISOString().split('T')[0];
    const isFull = paidAmount >= sale.totalAmount;
    const newFinancialStatus = isFull ? 'pago' : 'parcial';

    // Update sale
    await updateDoc(saleDocRef, {
      financialStatus: newFinancialStatus,
      paidAmount,
      paymentDate: actualPaymentDate,
      updatedAt: new Date().toISOString(),
    });

    // Sync matching receivable
    if (sale.receivableId) {
      const recDocRef = doc(db, 'receivables', sale.receivableId);
      await updateDoc(recDocRef, {
        status: isFull ? 'recebido' : 'parcial',
        paidAmount,
        paymentDate: actualPaymentDate,
        updatedAt: new Date().toISOString(),
      });
    }

    await logAudit(
      userEmail,
      'user',
      'sale',
      saleId,
      'confirm_payment',
      `Pagamento confirmado para a venda ${sale.code} (${sale.itemName}): R$ ${paidAmount} recebido em ${actualPaymentDate}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}`);
  }
}

export async function cancelSale(saleId: string, userEmail: string): Promise<void> {
  try {
    const saleDocRef = doc(db, 'sales', saleId);
    const saleSnap = await getDoc(saleDocRef);
    if (!saleSnap.exists()) throw new Error('Venda não encontrada');
    const sale = saleSnap.data() as Sale;

    // Update sale to cancelado
    await updateDoc(saleDocRef, {
      financialStatus: 'cancelado',
      updatedAt: new Date().toISOString(),
    });

    // Sync matching receivable
    if (sale.receivableId) {
      const recDocRef = doc(db, 'receivables', sale.receivableId);
      await updateDoc(recDocRef, {
        status: 'cancelado',
        updatedAt: new Date().toISOString(),
      });
    }

    // Revert stock if physical product
    if (sale.itemType === 'produto' && sale.itemId) {
      try {
        const itemDocRef = doc(db, 'products_services', sale.itemId);
        const itemSnap = await getDoc(itemDocRef);
        if (itemSnap.exists()) {
          const itemData = itemSnap.data() as ProductService;
          if (typeof itemData.stockQuantity === 'number') {
            await updateDoc(itemDocRef, {
              stockQuantity: itemData.stockQuantity + (sale.quantity || 1),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (stockErr) {
        console.warn('Aviso ao reverter estoque:', stockErr);
      }
    }

    await logAudit(userEmail, 'user', 'sale', saleId, 'cancel', `Venda ${sale.code} cancelada`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}`);
  }
}

// ==================== SEED INITIAL DATA ====================
export async function seedInitialDataIfEmpty() {
  try {
    // Check if plans exist
    const planSnap = await getDocs(collection(db, 'plans'));
    if (!planSnap.empty) return; // already seeded

    console.log('Populando dados iniciais da Agência Raon...');

    // 1. Services Catalog
    const servicesCatalog: Omit<ServiceItem, 'id'>[] = [
      { name: 'Gestão Básica do Instagram', category: 'Redes Sociais', description: 'Curadoria de feed, postagens e monitoramento.', frequency: 'Mensal', estimatedQty: 12, referencePrice: 450, active: true },
      { name: 'Artes Promocionais', category: 'Design Criativo', description: 'Criação de artes institucionais e ofertas para feed.', frequency: 'Mensal', estimatedQty: 8, referencePrice: 350, active: true },
      { name: 'Stories Estratégicos', category: 'Redes Sociais', description: 'Sequências de stories focadas em engajamento e vendas.', frequency: 'Semanal', estimatedQty: 20, referencePrice: 400, active: true },
      { name: 'Planejamento de Conteúdo', category: 'Estratégia', description: 'Linha editorial mensal alinhada ao público-alvo.', frequency: 'Mensal', estimatedQty: 1, referencePrice: 300, active: true },
      { name: 'Suporte Online', category: 'Atendimento', description: 'Atendimento e esclarecimento de dúvidas da conta.', frequency: 'Contínuo', estimatedQty: 1, referencePrice: 200, active: true },
      { name: 'Posicionamento Digital', category: 'Estratégia', description: 'Análise de autoridade de marca e proposta de valor.', frequency: 'Mensal', estimatedQty: 1, referencePrice: 600, active: true },
      { name: 'Reels Estratégicos', category: 'Audiovisual', description: 'Roteirização, edição e publicação de vídeos curtos.', frequency: 'Semanal', estimatedQty: 8, referencePrice: 700, active: true },
      { name: 'Gestão de Redes Sociais', category: 'Redes Sociais', description: 'Gestão completa com interação, SAC 2.0 e cronograma.', frequency: 'Mensal', estimatedQty: 16, referencePrice: 800, active: true },
      { name: 'Tráfego Pago', category: 'Performance', description: 'Gestão de campanhas de Meta Ads e Google Ads.', frequency: 'Mensal', estimatedQty: 4, referencePrice: 900, active: true },
      { name: 'Consultoria Estratégica', category: 'Estratégia', description: 'Sessão mensal de alinhamento de metas e conversão.', frequency: 'Mensal', estimatedQty: 2, referencePrice: 500, active: true },
      { name: 'Relatórios de Desempenho', category: 'BI & Analytics', description: 'Dashboard mensal com métricas de alcance e ROI.', frequency: 'Mensal', estimatedQty: 1, referencePrice: 250, active: true },
      { name: 'Branding Premium', category: 'Design Criativo', description: 'Manual de marca, paleta, tipografia e diretrizes de identidade.', frequency: 'Único / Semestral', estimatedQty: 1, referencePrice: 1500, active: true },
      { name: 'IA Aplicada ao Marketing', category: 'Tecnologia & Inovação', description: 'Automações inteligentes, prompts e geração de ativos.', frequency: 'Mensal', estimatedQty: 1, referencePrice: 1000, active: true },
      { name: 'Site e Landing Page', category: 'Desenvolvimento Web', description: 'Criação e manutenção de páginas de captura de alta conversão.', frequency: 'Mensal / Projeto', estimatedQty: 1, referencePrice: 1800, active: true },
      { name: 'Estratégia Avançada', category: 'Estratégia', description: 'Funis de vendas complexos, lançamentos e remarketing.', frequency: 'Mensal', estimatedQty: 1, referencePrice: 1200, active: true },
    ];

    const serviceIdMap: Record<string, string> = {};
    for (const s of servicesCatalog) {
      const docRef = await addDoc(collection(db, 'services'), {
        ...s,
        createdAt: new Date().toISOString(),
      });
      serviceIdMap[s.name] = docRef.id;
    }

    // 2. Official Plans
    const plansToSeed: Omit<Plan, 'id'>[] = [
      {
        code: 'START_BRONZE',
        name: 'Plano Start Bronze',
        description: 'Ideal para empresas que desejam iniciar sua presença digital de maneira profissional.',
        defaultServiceIds: [
          serviceIdMap['Gestão Básica do Instagram'],
          serviceIdMap['Artes Promocionais'],
          serviceIdMap['Stories Estratégicos'],
          serviceIdMap['Planejamento de Conteúdo'],
          serviceIdMap['Suporte Online'],
        ].filter(Boolean),
        active: true,
        tagColor: '#CD7F32',
      },
      {
        code: 'PRATA_PLUS',
        name: 'Plano Prata Plus',
        description: 'Ideal para empresas que desejam crescer, fortalecer seus serviços e conquistar mais clientes.',
        defaultServiceIds: [
          serviceIdMap['Posicionamento Digital'],
          serviceIdMap['Reels Estratégicos'],
          serviceIdMap['Gestão de Redes Sociais'],
          serviceIdMap['Tráfego Pago'],
          serviceIdMap['Consultoria Estratégica'],
          serviceIdMap['Relatórios de Desempenho'],
        ].filter(Boolean),
        active: true,
        tagColor: '#A0AEC0',
      },
      {
        code: 'GOLD_ESSENCIAL',
        name: 'Plano Gold Essencial',
        description: 'Ideal para empresas que desejam dominar o digital com estratégias avançadas e tecnologia.',
        defaultServiceIds: [
          serviceIdMap['Branding Premium'],
          serviceIdMap['IA Aplicada ao Marketing'],
          serviceIdMap['Gestão de Redes Sociais'],
          serviceIdMap['Site e Landing Page'],
          serviceIdMap['Tráfego Pago'],
          serviceIdMap['Estratégia Avançada'],
        ].filter(Boolean),
        active: true,
        tagColor: '#D97706',
      },
      {
        code: 'PERSONALIZADO',
        name: 'Plano Personalizado',
        description: 'Estruturação sob medida com seleção livre de serviços e precificação customizada.',
        defaultServiceIds: [],
        active: true,
        tagColor: '#0878D9',
      },
    ];

    const planIdMap: Record<string, string> = {};
    for (const p of plansToSeed) {
      const docRef = await addDoc(collection(db, 'plans'), p);
      planIdMap[p.code] = docRef.id;
    }

    // 3. Financial Categories
    const categories: Omit<FinancialCategory, 'id'>[] = [
      { name: 'Mensalidades de Clientes', type: 'receita', active: true },
      { name: 'Serviços Avulsos & Projetos', type: 'receita', active: true },
      { name: 'Ferramentas de IA & Design (Canva, Midjourney, OpenAI)', type: 'ferramenta', active: true },
      { name: 'Hospedagem & Infraestrutura Cloud', type: 'ferramenta', active: true },
      { name: 'Equipe & Prestadores de Serviços', type: 'operacional', active: true },
      { name: 'Internet & Telefonia', type: 'despesa_fixa', active: true },
      { name: 'Marketing & Anúncios Próprios', type: 'despesa_variavel', active: true },
      { name: 'Contabilidade & Impostos', type: 'despesa_fixa', active: true },
    ];
    const categoryIdMap: Record<string, string> = {};
    for (const c of categories) {
      const docRef = await addDoc(collection(db, 'financial_categories'), c);
      categoryIdMap[c.name] = docRef.id;
    }

    // 4. Agency Settings
    await setDoc(doc(db, 'agency_settings', 'main'), DEFAULT_AGENCY_SETTINGS);

    // 5. Seed Real Initial Clients with active contracts and billing
    const now = new Date();
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    const currentCompetence = `${currentMonthNum}/${currentYear}`;

    // Sample Client 1: Start Bronze
    const client1Ref = await addDoc(collection(db, 'clients'), {
      code: 'RAON-001',
      companyName: 'Studio Pilates Viver Bem',
      tradeName: 'Viver Bem Pilates',
      responsibleName: 'Juliana Castro',
      taxId: '28.914.782/0001-44',
      phone: '(75) 98822-1133',
      whatsapp: '5575988221133',
      email: 'contato@viverbempilates.com.br',
      address: 'Av. Senhor dos Passos, 450, Centro',
      city: 'Feira de Santana',
      state: 'BA',
      instagram: '@viverbempilates',
      responsibleBirthDate: `${currentYear}-11-08`, // Upcoming in 3 days!
      companyAnniversaryDate: `${currentYear}-03-15`,
      entryDate: `${currentYear}-01-10`,
      planId: planIdMap['START_BRONZE'],
      planName: 'Plano Start Bronze',
      monthlyFee: 650,
      dueDay: 10,
      status: 'ativo',
      notes: 'Foco em aquisição de novos alunos para turmas da manhã.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Contract 1
    const contract1Ref = await addDoc(collection(db, 'contracts'), {
      contractNumber: 'CTR-2026-001',
      clientId: client1Ref.id,
      clientName: 'Studio Pilates Viver Bem',
      planId: planIdMap['START_BRONZE'],
      planName: 'Plano Start Bronze',
      monthlyFee: 650,
      startDate: `${currentYear}-01-10`,
      dueDay: 10,
      paymentMethod: 'PIX',
      discount: 0,
      services: [
        { serviceId: serviceIdMap['Gestão Básica do Instagram'], name: 'Gestão Básica do Instagram', quantity: 1 },
        { serviceId: serviceIdMap['Artes Promocionais'], name: 'Artes Promocionais', quantity: 8 },
        { serviceId: serviceIdMap['Stories Estratégicos'], name: 'Stories Estratégicos', quantity: 20 },
      ],
      status: 'vigente',
      createdAt: new Date().toISOString(),
    });

    // Client 2: Prata Plus
    const client2Ref = await addDoc(collection(db, 'clients'), {
      code: 'RAON-002',
      companyName: 'Clínica Odonto Prime',
      tradeName: 'Odonto Prime',
      responsibleName: 'Dr. Roberto Magalhães',
      taxId: '33.125.678/0001-90',
      phone: '(75) 99144-8899',
      whatsapp: '5575991448899',
      email: 'dr.roberto@odontoprime.com',
      address: 'Rua Getúlio Vargas, 1200',
      city: 'Feira de Santana',
      state: 'BA',
      instagram: '@odontoprime.oficial',
      responsibleBirthDate: `${currentYear}-11-05`, // Today!
      companyAnniversaryDate: `${currentYear}-08-20`,
      entryDate: `${currentYear}-02-01`,
      planId: planIdMap['PRATA_PLUS'],
      planName: 'Plano Prata Plus',
      monthlyFee: 1400,
      dueDay: 5,
      status: 'ativo',
      notes: 'Campanhas focadas em implantes e estética dental.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Contract 2
    const contract2Ref = await addDoc(collection(db, 'contracts'), {
      contractNumber: 'CTR-2026-002',
      clientId: client2Ref.id,
      clientName: 'Clínica Odonto Prime',
      planId: planIdMap['PRATA_PLUS'],
      planName: 'Plano Prata Plus',
      monthlyFee: 1400,
      startDate: `${currentYear}-02-01`,
      dueDay: 5,
      paymentMethod: 'PIX',
      discount: 0,
      services: [
        { serviceId: serviceIdMap['Tráfego Pago'], name: 'Tráfego Pago' },
        { serviceId: serviceIdMap['Reels Estratégicos'], name: 'Reels Estratégicos' },
        { serviceId: serviceIdMap['Gestão de Redes Sociais'], name: 'Gestão de Redes Sociais' },
      ],
      status: 'vigente',
      createdAt: new Date().toISOString(),
    });

    // Client 3: Gold Essencial
    const client3Ref = await addDoc(collection(db, 'clients'), {
      code: 'RAON-003',
      companyName: 'SolarTech Energia Renovável',
      tradeName: 'SolarTech Energia',
      responsibleName: 'Mariana Duarte',
      taxId: '45.890.123/0001-12',
      phone: '(75) 98111-5544',
      whatsapp: '5575981115544',
      email: 'mariana@solartechbahia.com.br',
      address: 'Av. Maria Quitéria, 890',
      city: 'Feira de Santana',
      state: 'BA',
      instagram: '@solartechbahia',
      responsibleBirthDate: `${currentYear}-11-20`,
      entryDate: `${currentYear}-03-15`,
      planId: planIdMap['GOLD_ESSENCIAL'],
      planName: 'Plano Gold Essencial',
      monthlyFee: 2800,
      dueDay: 15,
      status: 'ativo',
      notes: 'Geração qualificada de leads para projetos comerciais e rurais.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Contract 3
    await addDoc(collection(db, 'contracts'), {
      contractNumber: 'CTR-2026-003',
      clientId: client3Ref.id,
      clientName: 'SolarTech Energia Renovável',
      planId: planIdMap['GOLD_ESSENCIAL'],
      planName: 'Plano Gold Essencial',
      monthlyFee: 2800,
      startDate: `${currentYear}-03-15`,
      dueDay: 15,
      paymentMethod: 'Boleto Bancário',
      discount: 0,
      services: [
        { serviceId: serviceIdMap['Branding Premium'], name: 'Branding Premium' },
        { serviceId: serviceIdMap['Tráfego Pago'], name: 'Tráfego Pago' },
        { serviceId: serviceIdMap['Site e Landing Page'], name: 'Site e Landing Page' },
      ],
      status: 'vigente',
      createdAt: new Date().toISOString(),
    });

    // Seed Receivables for current and previous months
    // 1. Client 1: current month paid
    await addDoc(collection(db, 'receivables'), {
      clientId: client1Ref.id,
      clientName: 'Studio Pilates Viver Bem',
      contractId: contract1Ref.id,
      description: `Mensalidade ${currentCompetence} — Studio Pilates Viver Bem`,
      dueDate: `${currentYear}-${currentMonthNum}-10`,
      competence: currentCompetence,
      originalAmount: 650,
      discountAmount: 0,
      paidAmount: 650,
      status: 'recebido',
      paymentMethod: 'PIX',
      paymentDate: `${currentYear}-${currentMonthNum}-08`,
      createdAt: new Date().toISOString(),
    });

    // 2. Client 2: due today / pending
    await addDoc(collection(db, 'receivables'), {
      clientId: client2Ref.id,
      clientName: 'Clínica Odonto Prime',
      contractId: contract2Ref.id,
      description: `Mensalidade ${currentCompetence} — Clínica Odonto Prime`,
      dueDate: `${currentYear}-${currentMonthNum}-05`,
      competence: currentCompetence,
      originalAmount: 1400,
      discountAmount: 0,
      paidAmount: 0,
      status: 'pendente',
      paymentMethod: 'PIX',
      createdAt: new Date().toISOString(),
    });

    // 3. Client 3: due in 10 days
    await addDoc(collection(db, 'receivables'), {
      clientId: client3Ref.id,
      clientName: 'SolarTech Energia Renovável',
      contractId: '',
      description: `Mensalidade ${currentCompetence} — SolarTech Energia`,
      dueDate: `${currentYear}-${currentMonthNum}-15`,
      competence: currentCompetence,
      originalAmount: 2800,
      discountAmount: 0,
      paidAmount: 0,
      status: 'pendente',
      paymentMethod: 'Boleto Bancário',
      createdAt: new Date().toISOString(),
    });

    // 4. Seed Expenses
    await addDoc(collection(db, 'expenses'), {
      categoryId: categoryIdMap['Ferramentas de IA & Design (Canva, Midjourney, OpenAI)'] || '',
      categoryName: 'Ferramentas de IA & Design (Canva, Midjourney, OpenAI)',
      description: 'Assinatura Midjourney & ChatGPT Plus da Equipe',
      dueDate: `${currentYear}-${currentMonthNum}-10`,
      competence: currentCompetence,
      amount: 220,
      supplierName: 'OpenAI / Midjourney',
      status: 'pago',
      paymentDate: `${currentYear}-${currentMonthNum}-02`,
      paymentMethod: 'Cartão Corporativo',
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'expenses'), {
      categoryId: categoryIdMap['Hospedagem & Infraestrutura Cloud'] || '',
      categoryName: 'Hospedagem & Infraestrutura Cloud',
      description: 'Servidores Google Cloud & Domínios',
      dueDate: `${currentYear}-${currentMonthNum}-15`,
      competence: currentCompetence,
      amount: 185,
      supplierName: 'Google Cloud Platform',
      status: 'pendente',
      paymentMethod: 'Cartão de Crédito',
      createdAt: new Date().toISOString(),
    });

    // 5. Seed Tasks for Kanban
    await addDoc(collection(db, 'tasks'), {
      clientId: client1Ref.id,
      clientName: 'Studio Pilates Viver Bem',
      serviceName: 'Stories Estratégicos',
      title: 'Sequência de Stories: Benefícios do Pilates na Terceira Idade',
      description: 'Roteirizar 5 quadros interativos com enquete e chamada para aula experimental.',
      assignedTo: 'Equipe de Conteúdo',
      priority: 'alta',
      dueDate: `${currentYear}-${currentMonthNum}-07`,
      status: 'em_andamento',
      comments: [
        {
          id: 'comm_1',
          userName: 'Juliana Castro (Cliente)',
          userRole: 'Cliente',
          content: 'Podem enfatizar a instrutora especialista em coluna?',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'tasks'), {
      clientId: client2Ref.id,
      clientName: 'Clínica Odonto Prime',
      serviceName: 'Tráfego Pago',
      title: 'Otimização de Campanha Meta Ads: Clareamento a Laser',
      description: 'Testar novos criativos em vídeo e ajustar raio de alcance para 15km.',
      assignedTo: 'Gestor de Tráfego',
      priority: 'urgente',
      dueDate: `${currentYear}-${currentMonthNum}-06`,
      status: 'a_fazer',
      comments: [],
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'tasks'), {
      clientId: client3Ref.id,
      clientName: 'SolarTech Energia Renovável',
      serviceName: 'Site e Landing Page',
      title: 'Revisão de Copy da Landing Page de Simulação de Economia',
      description: 'Ajustar calculadora interativa e depoimentos em vídeo de clientes rurais.',
      assignedTo: 'Desenvolvimento Web',
      priority: 'media',
      dueDate: `${currentYear}-${currentMonthNum}-12`,
      status: 'em_revisao',
      comments: [],
      createdAt: new Date().toISOString(),
    });

    // 6. Seed Proactive Notifications
    await addDoc(collection(db, 'notifications'), {
      title: '🎂 Aniversário Hoje: Dr. Roberto Magalhães',
      description: 'Hoje é aniversário do responsável da Clínica Odonto Prime! Clique para enviar uma mensagem carinhosa pelo WhatsApp.',
      category: 'aniversario',
      priority: 'alta',
      read: false,
      linkUrl: 'birthdays',
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'notifications'), {
      title: '🎉 Aniversário Próximo: Juliana Castro em 3 dias',
      description: 'Aniversário da responsável do Studio Pilates Viver Bem em 08/11. Prepare o comunicado.',
      category: 'aniversario',
      priority: 'media',
      read: false,
      linkUrl: 'birthdays',
      createdAt: new Date().toISOString(),
    });

    await addDoc(collection(db, 'notifications'), {
      title: '💵 Cobrança com Vencimento Hoje: Clínica Odonto Prime',
      description: 'Mensalidade no valor de R$ 1.400,00 vence na data de hoje. Envie o lembrete via WhatsApp.',
      category: 'vencimento',
      priority: 'alta',
      read: false,
      linkUrl: 'financial',
      createdAt: new Date().toISOString(),
    });

    // Call products and services seeder if needed
    await seedProductsAndServicesIfEmpty();

    console.log('Dados iniciais populados com sucesso no Firestore.');
  } catch (err) {
    console.error('Erro ao popular dados iniciais:', err);
  }
}

export async function seedProductsAndServicesIfEmpty() {
  try {
    const snap = await getDocs(collection(db, 'products_services'));
    if (!snap.empty) return;

    // 1. Seed Categories
    const catCol = collection(db, 'product_categories');
    const defaultCats = [
      { name: 'Sistemas & Aplicativos', type: 'ambos' as const },
      { name: 'Sites & Landing Pages', type: 'servico' as const },
      { name: 'Consultorias & Estratégia', type: 'servico' as const },
      { name: 'Serviços Digitais Avulsos', type: 'servico' as const },
      { name: 'Equipamentos & Hardware', type: 'produto' as const },
      { name: 'Materiais & Merchandising', type: 'produto' as const },
    ];
    for (const c of defaultCats) {
      await addDoc(catCol, { ...c, createdAt: new Date().toISOString() });
    }

    // 2. Seed Initial Products and Standalone Services
    const prodCol = collection(db, 'products_services');
    await addDoc(prodCol, {
      code: 'PRD-001',
      name: 'Totem Digital Interativo 43"',
      type: 'produto',
      category: 'Equipamentos & Hardware',
      defaultPrice: 4800,
      costPrice: 3200,
      stockQuantity: 4,
      description: 'Totem touch screen vertical para recepção e eventos corporativos.',
      status: 'ativo',
      notes: 'Garantia de 12 meses direto com fornecedor.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(prodCol, {
      code: 'PRD-002',
      name: 'Kit de Boas-Vindas Corporativo (50 un)',
      type: 'produto',
      category: 'Materiais & Merchandising',
      defaultPrice: 1250,
      costPrice: 750,
      stockQuantity: 15,
      description: 'Cadernos personalizados, canetas metálicas e squeeze térmico.',
      status: 'ativo',
      notes: 'Prazo de entrega física de 5 dias úteis.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(prodCol, {
      code: 'SRV-001',
      name: 'Desenvolvimento de Landing Page de Alta Conversão',
      type: 'servico',
      category: 'Sites & Landing Pages',
      defaultPrice: 1800,
      costPrice: 400,
      description: 'Página de captura responsiva, integrada com WhatsApp e pixel Meta/Google.',
      status: 'ativo',
      notes: 'Entrega em até 7 dias úteis.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(prodCol, {
      code: 'SRV-002',
      name: 'Consultoria de Posicionamento e Tráfego (4h)',
      type: 'servico',
      category: 'Consultorias & Estratégia',
      defaultPrice: 1200,
      costPrice: 0,
      description: 'Diagnóstico de funil de vendas, auditoria de anúncios e plano de ação.',
      status: 'ativo',
      notes: 'Sessão online com gravação disponibilizada.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await addDoc(prodCol, {
      code: 'SRV-003',
      name: 'Desenvolvimento de Sistema Web Sob Demanda',
      type: 'servico',
      category: 'Sistemas & Aplicativos',
      defaultPrice: 5500,
      costPrice: 1200,
      description: 'Sistema administrativo com painel, autenticação e banco de dados em nuvem.',
      status: 'ativo',
      notes: 'Escopo sob medida para médias e grandes empresas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Aviso ao popular produtos/serviços:', err);
  }
}
