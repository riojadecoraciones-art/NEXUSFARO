/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Toast } from './components/Toast';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LoginScreen } from './components/LoginScreen';
import { TerminalAuthScreen } from './components/TerminalAuthScreen';
import { StoreSuspendedScreen } from './components/StoreSuspendedScreen';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { POSView } from './components/POSView';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { EmployeesView } from './components/EmployeesView';
import { CashRegisterView } from './components/CashRegisterView';
import { CashShiftModal } from './components/CashShiftModal';
import { ExpensesView } from './components/ExpensesView';
import { SupportModal } from './components/SupportModal';
import { MasterAuthModal } from './components/MasterAuthModal';
import { MasterPortalView } from './components/MasterPortalView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Wrench, ArrowRight, LogOut } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeView,
    isLoginModalOpen,
    isSupportMode,
    setIsSupportModalOpen,
    storeInfo,
    hasTerminalSession,
    isCheckingTerminalSession,
    isCheckingStoreStatus,
    isStoreSuspended,
    isImpersonating,
    exitImpersonation,
  } = useApp();
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);

  // Mientras se resuelve si esta terminal ya tiene sesión, no mostramos ninguna
  // pantalla de acceso: evita el parpadeo del formulario en cada recarga.
  if (isCheckingTerminalSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Conectando terminal…</span>
        </div>
      </div>
    );
  }

  // Sin sesión de Supabase la base no devuelve nada: primero se activa el equipo.
  if (!hasTerminalSession) {
    return (
      <>
        <TerminalAuthScreen />
        <Toast />
      </>
    );
  }

  // Mismo criterio que isCheckingTerminalSession: evitar el parpadeo de la
  // pantalla de PIN antes de saber si este comercio puede entrar.
  if (isCheckingStoreStatus) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Verificando cuenta…</span>
        </div>
      </div>
    );
  }

  if (isStoreSuspended) {
    return (
      <>
        <StoreSuspendedScreen />
        <Toast />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <MasterAuthModal />
        <SupportModal />
        <Toast />
      </>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Support Mode Top Ribbon Indicator */}
        {isSupportMode && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-950" />
              <span>
                🛠️ MODO ASISTENCIA TÉCNICA ACTIVO — Sesión Desarrollador para <strong>{storeInfo?.storeName || 'FARO POS'}</strong> ({storeInfo?.branchName || 'Sucursal Principal'})
              </span>
            </div>
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="px-2.5 py-0.5 bg-slate-950 hover:bg-slate-800 text-white rounded-md text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <span>Abrir Herramientas de Soporte</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Antes "Asistir a este Negocio" no tenía vuelta: exitImpersonation
            ya existía en el contexto pero ningún componente lo llamaba, y
            ningún indicador distinguía "estás auditando otro comercio" de un
            modo soporte cualquiera. */}
        {isImpersonating && (
          <div className="bg-indigo-600 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>
                🔍 MODO AUDITORÍA — Viendo <strong>{storeInfo?.storeName}</strong> como soporte
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="px-2.5 py-0.5 bg-white/15 hover:bg-white/25 text-white rounded-md text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Salir al Portal Maestro</span>
            </button>
          </div>
        )}

        {/* Top Header Navbar */}
        <Navbar onOpenCashModal={() => setIsCashModalOpen(true)} />

        {/* Dynamic View Router */}
        <main className="flex-1 flex overflow-hidden relative min-h-0">
          {activeView === 'pos' && <POSView />}
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'inventory' && <InventoryView />}
          {activeView === 'expenses' && <ExpensesView />}
          {activeView === 'history' && <HistoryView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'cash_register' && <CashRegisterView />}
          {activeView === 'employees' && <EmployeesView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'master_portal' && <MasterPortalView />}
        </main>
      </div>

      {/* Global Cash Shift Modal triggerable from navbar or shortcuts */}
      <CashShiftModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
      />

      {/* Master Support Diagnostic & Backup Modal */}
      <SupportModal />

      {/* Master Developer Authentication Modal */}
      <MasterAuthModal />

      {/* User Switch Modal (PIN screen) */}
      {isLoginModalOpen && <LoginScreen />}

      {/* Persistent Side-Over Notification Drawer */}
      <NotificationDrawer />

      {/* Global Notification Toast Container */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
