/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Metrics from './components/Metrics';
import Charts from './components/Charts';
import EmployeesTable from './components/EmployeesTable';
import ConsultationForm from './components/ConsultationForm';
import AnthropometryForm from './components/AnthropometryForm';
import Parameters from './components/Parameters';
import MealPlanGenerator from './components/MealPlanGenerator';
import RecipeGenerator from './components/RecipeGenerator';
import EmpresasView from './components/EmpresasView';
import OmsPopulationMetrics from './components/OmsPopulationMetrics';
import ExcelExportButton from './components/ExcelExportButton';
import DashboardPdfButton from './components/DashboardPdfButton';
import Auth from './components/Auth';
import { CompanyProvider } from './context/CompanyContext';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [dashboardDateFrom, setDashboardDateFrom] = useState<string | undefined>(undefined);
  const [dashboardDateTo, setDashboardDateTo]     = useState<string | undefined>(undefined);
  const [isPrintingDashboard, setIsPrintingDashboard] = useState(false);
  const prevTitleRef = useRef('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isPrintingDashboard) return;
    const timer = setTimeout(() => {
      window.print();
      const cleanup = () => {
        document.title = prevTitleRef.current;
        document.body.classList.remove('dashboard-printing');
        setIsPrintingDashboard(false);
        setDashboardDateFrom(undefined);
        setDashboardDateTo(undefined);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
    }, 600);
    return () => clearTimeout(timer);
  }, [isPrintingDashboard]);

  function handleDashboardPrint(dateFrom: string, dateTo: string) {
    prevTitleRef.current = document.title;
    const from = new Date(dateFrom).toLocaleDateString('es-AR');
    const to   = new Date(dateTo).toLocaleDateString('es-AR');
    document.title = `Informe Dashboard ${from} – ${to}`;
    document.body.classList.add('dashboard-printing');
    setDashboardDateFrom(dateFrom);
    setDashboardDateTo(dateTo);
    setIsPrintingDashboard(true);
  }

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!profile || profile?.role === 'pending') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 scale-in">
          <div className="text-5xl mb-6">⏳</div>
          <h2 className="text-2xl font-bold mb-4">Acceso Pendiente</h2>
          <p className="text-text-muted mb-6">
            Hola <strong>{profile?.full_name || session.user.email}</strong>. Tu cuenta ha sido registrada correctamente, pero aún debe ser aprobada por la administración para acceder a los datos médicos de los pacientes.
          </p>
          <div className="p-4 bg-primary/10 text-primary border border-primary/20 font-medium rounded-lg text-sm mb-6">
            Te notificaremos o habilitaremos a la brevedad. Vuelve a intentarlo pronto.
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-primary font-semibold hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <CompanyProvider>
      <div className="flex h-screen bg-bg text-text-main font-sans overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={sidebarMobileOpen}
          setMobileOpen={setSidebarMobileOpen}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            profile={profile}
            activeTab={activeTab}
            onMenuClick={() => setSidebarMobileOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto">
              {activeTab === 'dashboard' && (
                <>
                  <div className="flex justify-end mb-4 gap-2 print:hidden">
                    <ExcelExportButton />
                    <DashboardPdfButton onPrint={handleDashboardPrint} isPrinting={isPrintingDashboard} />
                  </div>
                  {isPrintingDashboard && dashboardDateFrom && dashboardDateTo && (
                    <div className="hidden print:block mb-6 p-4 border-2 border-primary/30 rounded-xl bg-primary/5">
                      <p className="text-sm font-bold text-primary">
                        Período del informe: {new Date(dashboardDateFrom).toLocaleDateString('es-AR')} — {new Date(dashboardDateTo).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  )}
                  <Metrics dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} />
                  <Charts dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} />
                  <OmsPopulationMetrics dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} />
                  <EmployeesTable />
                </>
              )}

              {activeTab === 'empleados' && (
                <EmployeesTable />
              )}

              {activeTab === 'antropometria' && (
                <AnthropometryForm onComplete={() => setActiveTab('dashboard')} />
              )}

              {activeTab === 'nueva-consulta' && (
                <ConsultationForm onComplete={() => setActiveTab('dashboard')} />
              )}

              {activeTab === 'parametros' && (
                <Parameters />
              )}

              {activeTab === 'generador' && (
                <MealPlanGenerator />
              )}

              {activeTab === 'recetario' && (
                <RecipeGenerator />
              )}

              {activeTab === 'empresas' && (
                <EmpresasView />
              )}
            </div>
          </main>

        </div>
      </div>
    </CompanyProvider>
  );
}
