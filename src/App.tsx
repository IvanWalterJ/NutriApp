/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
import FormsSection from './components/forms/FormsSection';
import OmsPopulationMetrics from './components/OmsPopulationMetrics';
import ExcelExportButton from './components/ExcelExportButton';
import ExcelImportButton from './components/ExcelImportButton';
import DashboardPdfButton from './components/DashboardPdfButton';
import PatientDetailView from './components/PatientDetailView';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import { CompanyProvider } from './context/CompanyContext';
import { BRAND } from './lib/branding';
import { getBrandTemplate } from './lib/brandTemplates';

const ACTIVE_TAB_KEY = 'nutriapp.activeTab';
const VALID_TABS = new Set([
  'dashboard', 'empleados', 'antropometria', 'nueva-consulta',
  'parametros', 'generador', 'recetario', 'formularios', 'empresas',
]);

function readStoredTab(): string {
  if (typeof window === 'undefined') return 'dashboard';
  try {
    const stored = window.localStorage.getItem(ACTIVE_TAB_KEY);
    return stored && VALID_TABS.has(stored) ? stored : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  // Lazy init: leemos de localStorage para que la sección sobreviva refreshes
  // y nuevos logins en el mismo navegador. Whitelist evita estados zombies.
  const [activeTab, setActiveTabState] = useState<string>(() => readStoredTab());
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    try {
      if (VALID_TABS.has(tab)) window.localStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch {
      // localStorage puede fallar en modo privado / cuota — ignoramos.
    }
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  // Cuando hay un paciente seleccionado, el área principal muestra la vista
  // dedicada del paciente (con sidebar visible) en lugar del tab activo.
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  // Permite preseleccionar paciente al navegar a "Nueva consulta" / "Antropometría"
  // desde la vista del paciente.
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | null>(null);
  const [dashboardDateFrom, setDashboardDateFrom] = useState<string | undefined>(undefined);
  const [dashboardDateTo, setDashboardDateTo]     = useState<string | undefined>(undefined);
  const [dashboardCompany, setDashboardCompany]   = useState<string>('');
  const [dashboardCompanyType, setDashboardCompanyType] = useState<'fija' | 'feria' | undefined>(undefined);
  const [dashboardBrandKey, setDashboardBrandKey] = useState<string>('default');
  const [isPrintingDashboard, setIsPrintingDashboard] = useState(false);
  const [patientsRefreshKey, setPatientsRefreshKey] = useState(0);
  const prevTitleRef = useRef('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setIsPasswordRecovery(true);
        setLoading(false);
        return;
      }
      // Solo resetear el estado de recovery cuando el usuario cierra sesión
      if (!session) {
        setIsPasswordRecovery(false);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isPrintingDashboard) return;

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.title = prevTitleRef.current;
      document.body.classList.remove('dashboard-printing');
      setIsPrintingDashboard(false);
      setDashboardDateFrom(undefined);
      setDashboardDateTo(undefined);
      window.removeEventListener('afterprint', cleanup);
    };

    const timer = setTimeout(() => {
      window.addEventListener('afterprint', cleanup);
      try {
        window.print();
      } finally {
        // Fallback por si `afterprint` no se dispara (cancelar diálogo, navegador sin soporte).
        // `window.print()` bloquea hasta cerrar el diálogo, así que al llegar acá ya terminó.
        setTimeout(cleanup, 500);
      }
      // 2500ms le da tiempo a los refetches disparados por el cambio de
      // dateFrom/dateTo (Metrics + Charts + OmsPopulationMetrics queries en
      // paralelo) a completarse antes de capturar el PDF. Si lo dejábamos en
      // 1500ms, el PDF mostraba skeletons grises en lugar de los valores.
    }, 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, [isPrintingDashboard]);

  function handleDashboardPrint(dateFrom: string, dateTo: string, company: string, companyType: 'fija' | 'feria' | undefined, brandTemplateKey: string) {
    prevTitleRef.current = document.title;
    const from = new Date(dateFrom).toLocaleDateString('es-AR');
    const to   = new Date(dateTo).toLocaleDateString('es-AR');
    document.title = `Informe Dashboard ${company} ${from} – ${to}`;
    document.body.classList.add('dashboard-printing');
    setDashboardDateFrom(dateFrom);
    setDashboardDateTo(dateTo);
    setDashboardCompany(company);
    setDashboardCompanyType(companyType);
    setDashboardBrandKey(brandTemplateKey);
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

  if (isPasswordRecovery) {
    return <ResetPassword onDone={() => setIsPasswordRecovery(false)} />;
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

  // Cambiar de tab desde el sidebar siempre limpia la vista de paciente
  // para volver al flujo normal de la app.
  const handleSetActiveTab = (tab: string) => {
    setSelectedPatientId(null);
    setPreselectedPatientId(null);
    setActiveTab(tab);
  };

  return (
    <CompanyProvider>
      <div className="flex h-screen bg-bg text-text-main font-sans overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
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
              {selectedPatientId ? (
                <PatientDetailView
                  patientId={selectedPatientId}
                  onBack={() => setSelectedPatientId(null)}
                  onNavigate={(tab, pid) => {
                    setSelectedPatientId(null);
                    setPreselectedPatientId(pid);
                    setActiveTab(tab);
                  }}
                />
              ) : (
              <>
              {activeTab === 'dashboard' && (
                <>
                  <div className="flex justify-end mb-4 gap-2 print:hidden">
                    <ExcelImportButton onImported={() => setPatientsRefreshKey(k => k + 1)} />
                    <ExcelExportButton />
                    <DashboardPdfButton onPrint={handleDashboardPrint} isPrinting={isPrintingDashboard} />
                  </div>
                  {isPrintingDashboard && dashboardDateFrom && dashboardDateTo && (() => {
                    const tpl = getBrandTemplate(dashboardBrandKey);
                    const isSM = tpl.key === 'swiss_medical';
                    return isSM ? (
                      <div className="hidden print:block mb-6 bg-white border-2 p-6 rounded-2xl" style={{ borderColor: tpl.colors.primary }}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            {tpl.logoUrl && (
                              <img src={tpl.logoUrl} alt="Swiss Medical" style={{ height: `${tpl.logoHeightPx ?? 52}px`, width: 'auto' }} />
                            )}
                            <div className="pl-4 border-l-2" style={{ borderColor: tpl.colors.primary }}>
                              <div className="text-xs font-bold tracking-[3px] text-text-muted mb-1">
                                {dashboardCompanyType === 'feria' ? 'INFORME DE EVENTO / FERIA' : 'INFORME DE DASHBOARD'}
                              </div>
                              <h2 className="text-3xl font-black text-text-main">{dashboardCompany}</h2>
                              <div className="text-sm mt-1 text-text-muted">
                                <strong style={{ color: tpl.colors.primary }}>{tpl.professionalName}</strong> · {tpl.professionalRole} · Período: {new Date(dashboardDateFrom).toLocaleDateString('es-AR')} — {new Date(dashboardDateTo).toLocaleDateString('es-AR')}
                              </div>
                            </div>
                          </div>
                          {dashboardCompanyType === 'feria' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: `${tpl.colors.primary}15`, color: tpl.colors.primary, border: `1px solid ${tpl.colors.primary}30` }}>
                              Modo Feria · Sesión única
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="hidden print:block mb-6 bg-primary text-white p-6 rounded-2xl">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold tracking-[3px] text-white/70 mb-1">
                              {dashboardCompanyType === 'feria' ? 'INFORME DE EVENTO / FERIA' : 'INFORME DE DASHBOARD'}
                            </div>
                            <h2 className="text-3xl font-black">{dashboardCompany}</h2>
                            <div className="text-sm mt-1 text-white/80">
                              {BRAND.name} &nbsp;·&nbsp; Período: {new Date(dashboardDateFrom).toLocaleDateString('es-AR')} — {new Date(dashboardDateTo).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                          {dashboardCompanyType === 'feria' && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-accent/30 text-white border border-white/30 px-3 py-1.5 rounded-full whitespace-nowrap">
                              Modo Feria · Sesión única
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <Metrics dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} isPrinting={isPrintingDashboard} />
                  <Charts dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} isPrinting={isPrintingDashboard} />
                  <OmsPopulationMetrics dateFrom={dashboardDateFrom} dateTo={dashboardDateTo} isPrinting={isPrintingDashboard} />
                  {/* La tabla de pacientes se oculta del informe PDF por confidencialidad. */}
                  <div className="print:hidden">
                    <EmployeesTable onSelectPatient={(id) => setSelectedPatientId(id)} refreshKey={patientsRefreshKey} />
                  </div>
                </>
              )}

              {activeTab === 'empleados' && (
                <EmployeesTable onSelectPatient={(id) => setSelectedPatientId(id)} />
              )}

              {activeTab === 'antropometria' && (
                <AnthropometryForm
                  preselectedPatientId={preselectedPatientId}
                  onComplete={() => { setPreselectedPatientId(null); setActiveTab('dashboard'); }}
                />
              )}

              {activeTab === 'nueva-consulta' && (
                <ConsultationForm
                  preselectedPatientId={preselectedPatientId}
                  onComplete={() => { setPreselectedPatientId(null); setActiveTab('dashboard'); }}
                />
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

              {activeTab === 'formularios' && (
                <FormsSection />
              )}

              {activeTab === 'empresas' && (
                <EmpresasView />
              )}
              </>
              )}
            </div>
          </main>

        </div>
      </div>
    </CompanyProvider>
  );
}
