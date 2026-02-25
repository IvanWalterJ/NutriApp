import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import SuccessModal from './SuccessModal';

export default function EmployeesTable() {
  const { showToast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    area: 'Administración',
    initial_weight: '',
    height: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          sessions (
            weight,
            session_date,
            adherence
          )
        `)
        .order('last_name', { ascending: true });

      if (error) throw error;

      // Process employees data
      const processed = data.map(emp => {
        const lastSession = emp.sessions?.sort((a: any, b: any) =>
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        )[0];

        const weightLossNum = lastSession
          ? parseFloat((lastSession.weight - emp.initial_weight).toFixed(1))
          : 0;

        const lossPercentageNum = lastSession
          ? parseFloat((((lastSession.weight - emp.initial_weight) / emp.initial_weight) * 100).toFixed(1))
          : 0;

        const weightLoss = weightLossNum.toString();
        const lossPercentage = lossPercentageNum.toString();

        const daysSinceLastSession = lastSession
          ? Math.floor((new Date().getTime() - new Date(lastSession.session_date).getTime()) / (1000 * 3600 * 24))
          : null;

        return {
          ...emp,
          name: `${emp.first_name} ${emp.last_name}`,
          weight: lastSession ? `${lastSession.weight} kg` : `${emp.initial_weight} kg`,
          weightChange: `${weightLossNum > 0 ? '+' : ''}${weightLoss}kg`,
          weightChangeColor: weightLossNum <= 0 ? 'positive' : 'negative',
          loss: `${lossPercentageNum > 0 ? '+' : ''}${lossPercentage}%`,
          adherence: lastSession?.adherence || 0,
          imc: lastSession && emp.height
            ? (lastSession.weight / Math.pow(emp.height / 100, 2)).toFixed(1)
            : (emp.initial_weight / Math.pow(emp.height / 100, 2)).toFixed(1),
          lastSessionText: daysSinceLastSession !== null
            ? (daysSinceLastSession === 0 ? 'Hoy' : `Hace ${daysSinceLastSession} días`)
            : 'Sin sesiones',
          statusColor: emp.status === 'Objetivo Alcanzado' ? 'success' : (emp.status === 'En Riesgo' ? 'danger' : 'warning')
        };
      });

      setEmployees(processed);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('patients')
        .insert([{
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          area: newEmployee.area,
          initial_weight: parseFloat(newEmployee.initial_weight),
          height: parseFloat(newEmployee.height),
          status: 'En Progreso',
          created_by: user?.id
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNewEmployee({
        first_name: '',
        last_name: '',
        area: 'Administración',
        initial_weight: '',
        height: ''
      });
      fetchEmployees();
      setShowSuccessModal(true);
      showToast('Empleado agregado con éxito', 'success');
    } catch (err) {
      console.error('Error adding employee:', err);
      showToast('Error al agregar empleado', 'error');
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-accent/15 text-primary';
      case 'warning':
        return 'bg-warning/15 text-[#D97706]';
      case 'danger':
        return 'bg-danger/15 text-danger';
      default:
        return '';
    }
  };

  const getStatusDotClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-accent-dark';
      case 'warning':
        return 'bg-warning';
      case 'danger':
        return 'bg-danger';
      default:
        return '';
    }
  };

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-4 md:p-8 mb-8 animate-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Empleados en Programa</h2>
        <div className="flex flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg font-semibold text-sm transition-all hover:shadow-[0_4px_12px_rgba(10,77,60,0.2)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 hover-lift"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nuevo Empleado
          </button>
          <div className="hidden md:block w-px h-10 bg-border-color"></div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {['Todos', 'En Progreso', 'En Riesgo'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 md:px-5 py-2 border-2 rounded-lg font-semibold text-xs md:text-sm transition-all whitespace-nowrap ${filter === t ? 'border-primary bg-primary text-white' : 'border-border-color bg-surface hover:border-primary hover:text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="text-text-muted text-sm">Cargando pacientes...</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-bg">
                  <tr>
                    {['EMPLEADO', 'ESTADO', 'SESIONES', 'PESO', 'PÉRDIDA', 'ADHERENCIA', 'IMC', 'ÚLTIMA SESIÓN'].map((th) => (
                      <th key={th} className="text-left p-4 text-[0.85rem] uppercase tracking-widest text-text-muted font-bold border-b-2 border-border-color">
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(emp => {
                    if (filter === 'Todos') return true;
                    if (filter === 'En Progreso' && (emp.status === 'En Progreso' || emp.status === 'Progreso')) return true;
                    if (filter === 'En Riesgo' && emp.status === 'En Riesgo') return true;
                    return false;
                  }).map((emp, i) => (
                    <tr key={i} className="transition-all duration-300 hover:bg-white hover:scale-[1.01] hover:shadow-lg border-b border-border-color group">
                      <td className="p-5">
                        <strong className="group-hover:text-primary transition-colors">{emp.name}</strong><br />
                        <span className="text-[0.85rem] text-text-muted">{emp.area}</span>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[0.85rem] font-semibold transition-all group-hover:shadow-sm ${getStatusClasses(emp.statusColor)}`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${getStatusDotClasses(emp.statusColor)}`}></span> {emp.status}
                        </span>
                      </td>
                      <td className="p-5"><strong>{emp.sessions?.length || 0}</strong></td>
                      <td className="p-5 font-mono font-bold">
                        {emp.weight}
                        <span className={`text-[0.8rem] px-2 py-1 rounded ml-2 ${emp.weightChangeColor === 'positive' ? 'bg-accent/15 text-accent-dark' : 'bg-danger/15 text-danger'}`}>
                          {emp.weightChange}
                        </span>
                      </td>
                      <td className="p-5">
                        <strong className={emp.loss.startsWith('-') ? 'text-accent-dark' : 'text-danger'}>{emp.loss}</strong>
                      </td>
                      <td className="p-5">
                        <div className="text-warning text-[1.1rem] tracking-widest">
                          {emp.adherence > 0 ? '⭐'.repeat(emp.adherence) : '—'}
                        </div>
                      </td>
                      <td className="p-5"><strong>{emp.imc}</strong></td>
                      <td className="p-5">{emp.lastSessionText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.filter(emp => {
                if (filter === 'Todos') return true;
                if (filter === 'En Progreso' && (emp.status === 'En Progreso' || emp.status === 'Progreso')) return true;
                if (filter === 'En Riesgo' && emp.status === 'En Riesgo') return true;
                return false;
              }).map((emp, i) => (
                <div key={i} className="bg-bg rounded-xl p-5 border border-border-color hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg leading-tight">{emp.name}</h4>
                      <p className="text-xs text-text-muted uppercase tracking-wider mt-1">{emp.area}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-black tracking-tighter uppercase transition-all ${getStatusClasses(emp.statusColor)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClasses(emp.statusColor)}`}></span> {emp.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="bg-surface/50 p-2.5 rounded-lg border border-border-color/50">
                      <p className="text-[0.65rem] text-text-muted uppercase font-bold mb-1">Peso Act / Var</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono">{emp.weight}</span>
                        <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold ${emp.weightChangeColor === 'positive' ? 'bg-accent/15 text-accent-dark' : 'bg-danger/15 text-danger'}`}>
                          {emp.weightChange}
                        </span>
                      </div>
                    </div>
                    <div className="bg-surface/50 p-2.5 rounded-lg border border-border-color/50">
                      <p className="text-[0.65rem] text-text-muted uppercase font-bold mb-1">Pérdida Total</p>
                      <span className={`font-bold text-sm ${emp.loss.startsWith('-') ? 'text-accent-dark' : 'text-danger'}`}>{emp.loss}</span>
                    </div>
                    <div className="bg-surface/50 p-2.5 rounded-lg border border-border-color/50">
                      <p className="text-[0.65rem] text-text-muted uppercase font-bold mb-1">IMC / Sesiones</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{emp.imc}</span>
                        <span className="text-xs text-text-muted">• {emp.sessions?.length || 0} ses.</span>
                      </div>
                    </div>
                    <div className="bg-surface/50 p-2.5 rounded-lg border border-border-color/50">
                      <p className="text-[0.65rem] text-text-muted uppercase font-bold mb-1">Adherencia</p>
                      <div className="text-warning text-xs tracking-tighter">
                        {emp.adherence > 0 ? '⭐'.repeat(emp.adherence) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border-color flex justify-between items-center text-[0.75rem]">
                    <span className="text-text-muted">Última sesión:</span>
                    <span className="font-semibold">{emp.lastSessionText}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-surface rounded-2xl p-8 w-full max-w-md shadow-2xl animate-scale-in border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Agregar Nuevo Empleado</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-main">✕</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                      placeholder="Juan"
                      value={newEmployee.first_name}
                      onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">Apellido</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                      placeholder="Pérez"
                      value={newEmployee.last_name}
                      onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Departamento</label>
                  <select
                    className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                    value={newEmployee.area}
                    onChange={e => setNewEmployee({ ...newEmployee, area: e.target.value })}
                  >
                    <option>Administración</option>
                    <option>Operaciones</option>
                    <option>Marketing</option>
                    <option>IT</option>
                    <option>Ventas</option>
                    <option>Finanzas</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">Peso Inicial (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none font-mono"
                      placeholder="80.0"
                      value={newEmployee.initial_weight}
                      onChange={e => setNewEmployee({ ...newEmployee, initial_weight: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      required
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none font-mono"
                      placeholder="170"
                      value={newEmployee.height}
                      onChange={e => setNewEmployee({ ...newEmployee, height: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 border-2 border-border-color rounded-lg font-semibold hover:bg-bg transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Registro Exitoso!"
        message="El nuevo empleado ha sido registrado correctamente en el sistema."
      />
    </div>
  );
}
