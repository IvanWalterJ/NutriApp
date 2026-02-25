import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const StarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function Metrics() {
  const [stats, setStats] = useState({
    active: 0,
    adherence: 0,
    weightLoss: 0,
    atRisk: 0,
    newThisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('id, initial_weight, status, created_at');

      if (pError) throw pError;

      const newP = patients.filter(p => p.created_at >= firstDayOfMonth).length;
      const riskP = patients.filter(p => p.status === 'En Riesgo').length;

      const { data: sessions, error: sError } = await supabase
        .from('sessions')
        .select('patient_id, weight, adherence');

      if (sError) throw sError;

      const avgAdh = sessions.length > 0
        ? sessions.reduce((acc, s) => acc + s.adherence, 0) / sessions.length
        : 0;

      const latestWeights: Record<string, number> = {};
      sessions.forEach(s => {
        latestWeights[s.patient_id] = s.weight;
      });

      let totalLoss = 0;
      let countLoss = 0;
      patients.forEach(p => {
        if (latestWeights[p.id]) {
          totalLoss += (latestWeights[p.id] - p.initial_weight);
          countLoss++;
        }
      });

      const avgLoss = countLoss > 0 ? totalLoss / countLoss : 0;

      setStats({
        active: patients.length,
        adherence: avgAdh,
        weightLoss: avgLoss,
        atRisk: riskP,
        newThisMonth: newP
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = [
    {
      label: 'Empleados Activos',
      Icon: UsersIcon,
      iconBg: 'bg-primary/10 text-primary',
      value: stats.active.toString(),
      change: `+${stats.newThisMonth} registrados este mes`,
      changeColor: stats.newThisMonth > 0 ? 'text-accent-dark' : 'text-text-muted',
    },
    {
      label: 'Adherencia Promedio',
      Icon: StarIcon,
      iconBg: 'bg-info/10 text-info',
      value: (
        <>
          {stats.adherence.toFixed(1)}<span className="text-2xl text-text-muted">/5</span>
        </>
      ),
      change: 'Meta institucional: 4.5',
      changeColor: stats.adherence >= 4.5 ? 'text-accent-dark' : 'text-warning',
    },
    {
      label: 'Pérdida Peso Promedio',
      Icon: TrendingDownIcon,
      iconBg: 'bg-accent/10 text-accent-dark',
      value: (
        <>
          {stats.weightLoss.toFixed(1)}<span className="text-xl text-text-muted">kg</span>
        </>
      ),
      change: 'Basado en últimas sesiones',
      changeColor: stats.weightLoss <= -2 ? 'text-accent-dark' : 'text-text-muted',
    },
    {
      label: 'En Riesgo',
      Icon: AlertTriangleIcon,
      iconBg: 'bg-danger/10 text-danger',
      value: stats.atRisk.toString(),
      change: 'Requieren atención urgente',
      changeColor: stats.atRisk > 0 ? 'text-danger' : 'text-accent-dark',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className="bg-surface border-2 border-border-color rounded-xl p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(10,77,60,0.08)] hover-lift group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[0.82rem] uppercase tracking-widest text-text-muted font-bold group-hover:text-primary transition-colors">
              {metric.label}
            </span>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${metric.iconBg}`}>
              <metric.Icon />
            </div>
          </div>
          <div className="text-[2.5rem] font-bold leading-none mb-2 font-mono group-hover:scale-105 transition-transform origin-left">
            {loading ? (
              <div className="h-10 w-20 bg-border-color animate-pulse rounded-lg" />
            ) : metric.value}
          </div>
          <div className={`text-sm font-semibold flex items-center gap-2 ${metric.changeColor}`}>
            {loading ? 'Cargando...' : metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}
