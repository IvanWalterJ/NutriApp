import React, { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { supabase } from '../lib/supabase';

export default function Charts() {
  const [sessionStats, setSessionStats] = useState<any[]>([]);
  const [statusStats, setStatusStats] = useState({
    objetivo: 0,
    progreso: 0,
    riesgo: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // 1. Fetch sessions for the bar chart (last 12 months)
      const { data: sessions, error: sError } = await supabase
        .from('sessions')
        .select('session_date');

      if (sError) throw sError;

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyCount: Record<string, number> = {};

      // Initialize months
      months.forEach(m => monthlyCount[m] = 0);

      sessions?.forEach(s => {
        const date = new Date(s.session_date);
        const monthName = months[date.getMonth()];
        monthlyCount[monthName]++;
      });

      setSessionStats(months.map(m => ({ name: m, value: monthlyCount[m] })));

      // 2. Fetch patients for status distribution
      const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('status');

      if (pError) throw pError;

      const counts = {
        objetivo: patients?.filter(p => p.status === 'Objetivo Alcanzado').length || 0,
        progreso: patients?.filter(p => p.status === 'En Progreso').length || 0,
        riesgo: patients?.filter(p => p.status === 'En Riesgo').length || 0,
        total: patients?.length || 0
      };

      setStatusStats(counts);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  }

  const getPercentage = (count: number) => {
    return statusStats.total > 0 ? (count / statusStats.total * 100).toFixed(0) : '0';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in" style={{ animationDelay: '0.1s' }}>
      <div className="lg:col-span-2 bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 hover-lift card-transition shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Evolución Mensual Participación</h3>
          <p className="text-sm text-text-muted">Últimos meses • Sesiones completadas</p>
        </div>
        <div className="h-[300px] bg-gradient-to-b from-accent/5 to-transparent rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionStats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }} dy={10} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="url(#colorUv)" className="hover:opacity-80 transition-opacity" />
              <defs>
                <linearGradient id="colorUv" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-accent-dark)" stopOpacity={1} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border-2 border-border-color rounded-xl p-5 md:p-8 hover-lift card-transition shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Distribución Estado</h3>
          <p className="text-sm text-text-muted">Clasificación actual empleados</p>
        </div>
        <div className="grid gap-4">
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-bg rounded-lg border border-transparent hover:border-accent group transition-all">
            <div className="min-w-[100px] md:min-w-[120px] font-semibold text-xs md:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-dark"><polyline points="20 6 9 17 4 12" /></svg>
              Objetivo
            </div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-md transition-all duration-1000 bg-gradient-to-r from-primary to-accent-dark"
                style={{ width: `${getPercentage(statusStats.objetivo)}%` }}
              ></div>
            </div>
            <div className="min-w-[40px] text-right font-bold font-mono">{statusStats.objetivo}</div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-bg rounded-lg">
            <div className="min-w-[100px] md:min-w-[120px] font-semibold text-xs md:text-sm flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-info"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              En Progreso
            </div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-1000 bg-gradient-to-r from-info to-[#60A5FA]"
                style={{ width: `${getPercentage(statusStats.progreso)}%` }}
              ></div>
            </div>
            <div className="min-w-[40px] text-right font-bold font-mono">{statusStats.progreso}</div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-bg rounded-lg">
            <div className="min-w-[100px] md:min-w-[120px] font-semibold text-xs md:text-sm flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              En Riesgo
            </div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-1000 bg-gradient-to-r from-danger to-[#F87171]"
                style={{ width: `${getPercentage(statusStats.riesgo)}%` }}
              ></div>
            </div>
            <div className="min-w-[40px] text-right font-bold font-mono">{statusStats.riesgo}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
