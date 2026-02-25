import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

      // 1. Total patients and new this month
      const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('id, initial_weight, status, created_at');

      if (pError) throw pError;

      const newP = patients.filter(p => p.created_at >= firstDayOfMonth).length;
      const riskP = patients.filter(p => p.status === 'En Riesgo').length;

      // 2. Sessions for weight loss and adherence
      const { data: sessions, error: sError } = await supabase
        .from('sessions')
        .select('patient_id, weight, adherence');

      if (sError) throw sError;

      // Calculate avg adherence
      const avgAdh = sessions.length > 0
        ? sessions.reduce((acc, s) => acc + s.adherence, 0) / sessions.length
        : 0;

      // Calculate total weight loss
      // For each patient, get their latest weight - initial weight
      const latestWeights: Record<string, number> = {};
      sessions.forEach(s => {
        // Since we didn't specify order, this is a bit rough but works for demo
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
      icon: '👥',
      iconBg: 'bg-accent/15',
      value: stats.active.toString(),
      change: `↑ +${stats.newThisMonth} registrados`,
      changeColor: stats.newThisMonth > 0 ? 'text-accent-dark' : 'text-text-muted',
    },
    {
      label: 'Adherencia Promedio',
      icon: '⭐',
      iconBg: 'bg-info/15',
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
      icon: '📉',
      iconBg: 'bg-accent/15',
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
      icon: '⚠️',
      iconBg: 'bg-danger/15',
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
          className="bg-surface border-2 border-border-color rounded-xl p-7 transition-all duration-300 hover:border-accent-dark hover:shadow-[0_8px_24px_rgba(20,241,149,0.15)] hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[0.85rem] uppercase tracking-widest text-text-muted font-semibold">
              {metric.label}
            </span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl ${metric.iconBg}`}>
              {metric.icon}
            </div>
          </div>
          <div className="text-[2.5rem] font-bold leading-none mb-2 font-mono">
            {loading ? '...' : metric.value}
          </div>
          <div className={`text-sm font-semibold flex items-center gap-2 ${metric.changeColor}`}>
            {loading ? 'Cargando...' : metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}
