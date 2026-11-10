import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { ClientsView } from './views/ClientsView';
import { PlansServicesView } from './views/PlansServicesView';
import { ContractsView } from './views/ContractsView';
import { FinancialView } from './views/FinancialView';
import { BirthdaysView } from './views/BirthdaysView';
import { TasksView } from './views/TasksView';
import { DocumentsView } from './views/DocumentsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { ProductsServicesView } from './views/ProductsServicesView';
import {
  ActiveTab,
  Client,
  ServiceItem,
  Plan,
  Contract,
  Receivable,
  Expense,
  FinancialCategory,
  Task,
  AppDocument,
  NotificationItem,
  ContactLog,
  ProductService,
  ProductCategory,
  Sale,
} from './types';
import {
  seedInitialDataIfEmpty,
  getClients,
  getServices,
  getPlans,
  getContracts,
  getReceivables,
  getExpenses,
  getFinancialCategories,
  getTasks,
  getDocuments,
  getNotifications,
  getContactLogs,
  getProductsServices,
  getProductCategories,
  getSales,
  purgeDebtsBeforeNovember,
} from './services/db';
import { testFirestoreConnection } from './lib/firebase';

const AppContent: React.FC = () => {
  const { user, profile, loading: authLoading, activeRole } = useAuth();

  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [productsServices, setProductsServices] = useState<ProductService[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load all operational data
  const loadAllData = useCallback(async () => {
    try {
      await testFirestoreConnection();
      await seedInitialDataIfEmpty();
      await purgeDebtsBeforeNovember();

      const [
        cList,
        sList,
        pList,
        ctrList,
        rList,
        eList,
        catList,
        tList,
        dList,
        nList,
        logList,
        psList,
        pcList,
        salesList,
      ] = await Promise.all([
        getClients().catch(() => []),
        getServices().catch(() => []),
        getPlans().catch(() => []),
        getContracts().catch(() => []),
        getReceivables().catch(() => []),
        getExpenses().catch(() => []),
        getFinancialCategories().catch(() => []),
        getTasks().catch(() => []),
        getDocuments().catch(() => []),
        getNotifications().catch(() => []),
        getContactLogs().catch(() => []),
        getProductsServices().catch(() => []),
        getProductCategories().catch(() => []),
        getSales().catch(() => []),
      ]);

      setClients(cList || []);
      setServices(sList || []);
      setPlans(pList || []);
      setContracts(ctrList || []);
      setReceivables(rList || []);
      setExpenses(eList || []);
      setCategories(catList || []);
      setTasks(tList || []);
      setDocuments(dList || []);
      setNotifications(nList || []);
      setContactLogs(logList || []);
      setProductsServices(psList || []);
      setProductCategories(pcList || []);
      setSales(salesList || []);
    } catch (err) {
      console.error('Erro ao sincronizar dados operacionais:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user || profile) {
      loadAllData();
    } else {
      setDataLoading(false);
    }
  }, [user, profile, loadAllData]);

  // Register service worker for PWA installation
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('RAON PAINEL: PWA Service Worker registrado');
          reg.update();
        })
        .catch((err) => console.log('Service Worker bypass no dev:', err));
    }
  }, []);

  // If waiting for auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#102B59] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0878D9] border-t-[#FF7817] rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Carregando RAON PAINEL...
          </span>
        </div>
      </div>
    );
  }

  // If not authenticated, show Login View
  if (!user && !profile) {
    return <LoginView />;
  }

  // Count pending items for sidebar badges
  const pendingReceivablesCount = receivables.filter((r) => r.status === 'pendente' || r.status === 'vencido').length;
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const birthdaysThisMonthCount = clients.filter((c) => {
    if (!c.responsibleBirthDate) return false;
    return c.responsibleBirthDate.split('-')[1] === currentMonthNum;
  }).length;

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B111E] text-[#172033] dark:text-[#F1F5F9] flex">
      {/* Retractable Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        birthdaysCount={birthdaysThisMonthCount}
        pendingReceivablesCount={pendingReceivablesCount}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-68'
        }`}
      >
        {/* Top Header */}
        <Header
          notifications={notifications}
          onRefreshNotifications={loadAllData}
          onNavigate={setCurrentTab}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {dataLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-[#0878D9] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Sincronizando dados em tempo real...</span>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  clients={clients}
                  contracts={contracts}
                  receivables={receivables}
                  expenses={expenses}
                  sales={sales}
                  productsServices={productsServices}
                  onNavigate={setCurrentTab}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  contracts={contracts}
                  receivables={receivables}
                  tasks={tasks}
                  documents={documents}
                  contactLogs={contactLogs}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'plans' && (
                <PlansServicesView
                  plans={plans}
                  services={services}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'contracts' && (
                <ContractsView
                  contracts={contracts}
                  clients={clients}
                  plans={plans}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'financial' && (
                <FinancialView
                  receivables={receivables}
                  expenses={expenses}
                  categories={categories}
                  clients={clients}
                  sales={sales}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'products_services' && (
                <ProductsServicesView
                  productsServices={productsServices}
                  productCategories={productCategories}
                  sales={sales}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'birthdays' && (
                <BirthdaysView
                  clients={clients}
                  contactLogs={contactLogs}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  clients={clients}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'documents' && (
                <DocumentsView
                  documents={documents}
                  clients={clients}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  clients={clients}
                  contracts={contracts}
                  receivables={receivables}
                  expenses={expenses}
                  tasks={tasks}
                  sales={sales}
                  productsServices={productsServices}
                />
              )}

              {currentTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
