/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Tabs from './components/Tabs';
import Metrics from './components/Metrics';
import Charts from './components/Charts';
import EmployeesTable from './components/EmployeesTable';
import SessionForm from './components/SessionForm';
import Parameters from './components/Parameters';
import Footer from './components/Footer';
import Auth from './components/Auth';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

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

  /* Temporarily disabled for testing
  if (profile?.role === 'pending') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl border-2 border-border-color p-8 scale-in">
          <div className="text-5xl mb-6">⏳</div>
          <h2 className="text-2xl font-bold mb-4">Acceso Pendiente</h2>
          <p className="text-text-muted mb-6">
            Hola <strong>{profile.full_name}</strong>. Tu cuenta ha sido registrada correctamente, pero aún debe ser aprobada por la administración para acceder a los datos médicos.
          </p>
          <div className="p-4 bg-info/10 text-info rounded-lg text-sm mb-6">
            Te notificaremos por email cuando tu acceso sea habilitado.
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
  */

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans overflow-x-hidden">
      <Header profile={profile} />

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'dashboard' && (
          <>
            <Metrics />
            <Charts />
            <EmployeesTable />
          </>
        )}

        {activeTab === 'empleados' && (
          <EmployeesTable />
        )}

        {activeTab === 'nueva-sesion' && (
          <SessionForm onComplete={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'parametros' && (
          <Parameters />
        )}
      </main>

      <Footer />
    </div>
  );
}

