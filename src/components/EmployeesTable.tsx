import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useCompany } from '../context/CompanyContext';
import SuccessModal from './SuccessModal';
import AnthroReportButton from './AnthroReportButton';
import { Search, X, Activity, CalendarDays, Edit2, Save } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function EmployeesTable() {
  const { showToast } = useToast();
  const { selectedCompany } = useCompany();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    area: 'Administración',
    initial_weight: '',
    height: '',
    email: '',
    birth_date: '',
    phone: '',
    sex: 'Femenino',
    // OMS initial assessment
    adherence: '3',
    hydration: 'true',
    physical_activity: '≤150 min',
    consumo_frutas_verduras: '3',
    energy_level: '3',
    sleep_quality: '3',
  });
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editPatientData, setEditPatientData] = useState<any>({});

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompany]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          sessions (
            *
          )
        `)
        .eq('company', selectedCompany)
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

      const { data: patientResult, error } = await supabase
        .from('patients')
        .insert([{
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          area: newEmployee.area,
          email: newEmployee.email || null,
          birth_date: newEmployee.birth_date || null,
          phone: newEmployee.phone || null,
          initial_weight: parseFloat(newEmployee.initial_weight),
          height: parseFloat(newEmployee.height),
          sex: newEmployee.sex,
          status: 'En Progreso',
          company: selectedCompany,
          created_by: user?.id
        }])
        .select('id')
        .single();

      if (error) throw error;

      // Create initial session with OMS assessment data
      const { error: sessionError } = await supabase.from('sessions').insert([{
        patient_id: patientResult.id,
        nutritionist_id: user?.id,
        session_date: new Date().toISOString().split('T')[0],
        company: selectedCompany,
        session_type: 'Consulta',
        weight: parseFloat(newEmployee.initial_weight),
        height: parseFloat(newEmployee.height),
        adherence: parseInt(newEmployee.adherence),
        hydration: newEmployee.hydration === 'true',
        physical_activity: newEmployee.physical_activity,
        consumo_frutas_verduras: parseInt(newEmployee.consumo_frutas_verduras),
        energy_level: parseInt(newEmployee.energy_level),
        sleep_quality: parseInt(newEmployee.sleep_quality),
      }]);
      if (sessionError) throw sessionError;

      setShowAddModal(false);
      setNewEmployee({
        first_name: '',
        last_name: '',
        area: 'Administración',
        initial_weight: '',
        height: '',
        email: '',
        birth_date: '',
        phone: '',
        sex: 'Femenino',
        adherence: '3',
        hydration: 'true',
        physical_activity: '≤150 min',
        consumo_frutas_verduras: '3',
        energy_level: '3',
        sleep_quality: '3',
      });
      fetchEmployees();
      setShowSuccessModal(true);
      showToast('Paciente agregado con éxito', 'success');
    } catch (err) {
      console.error('Error adding patient:', err);
      showToast('Error al agregar paciente', 'error');
    }
  };

  const handleUpdatePatient = async () => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          area: editPatientData.area,
          email: editPatientData.email,
          birth_date: editPatientData.birth_date,
          phone: editPatientData.phone
        })
        .eq('id', selectedPatient.id);

      if (error) throw error;
      
      showToast('Datos actualizados correctamente', 'success');
      setIsEditingPatient(false);
      setSelectedPatient({ ...selectedPatient, ...editPatientData });
      fetchEmployees();
    } catch (err) {
      console.error('Error updating patient:', err);
      showToast('Error al actualizar datos', 'error');
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
        <h2 className="text-xl md:text-2xl font-bold">Pacientes en Programa</h2>
        <div className="flex flex-wrap gap-2 md:gap-4 items-center">
          <div className="relative flex-grow md:flex-grow-0">
            <input 
              type="text" 
              placeholder="Buscar paciente..."
              className="w-full md:w-64 pl-10 pr-4 py-2 border-2 border-border-color rounded-lg text-sm bg-surface focus:outline-none focus:border-primary transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto px-5 py-2 border-2 border-primary bg-primary/10 text-primary rounded-lg font-bold text-sm transition-all hover:bg-primary hover:text-white active:scale-95 flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nuevo
          </button>
          <div className="hidden md:block w-px h-8 bg-border-color"></div>
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
                    {['PACIENTE', 'ESTADO', 'SESIONES', 'PESO', 'PÉRDIDA', 'ADHERENCIA', 'IMC', 'ÚLTIMA SESIÓN'].map((th) => (
                      <th key={th} className="text-left p-4 text-[0.85rem] uppercase tracking-widest text-text-muted font-bold border-b-2 border-border-color">
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(emp => {
                    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
                    if (!matchesSearch) return false;
                    if (filter === 'Todos') return true;
                    if (filter === 'En Progreso' && (emp.status === 'En Progreso' || emp.status === 'Progreso')) return true;
                    if (filter === 'En Riesgo' && emp.status === 'En Riesgo') return true;
                    return false;
                  }).map((emp, i) => (
                    <tr key={i} onClick={() => setSelectedPatient(emp)} className="transition-all duration-300 hover:bg-white hover:scale-[1.01] hover:shadow-lg border-b border-border-color group cursor-pointer">
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
                const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchesSearch) return false;
                if (filter === 'Todos') return true;
                if (filter === 'En Progreso' && (emp.status === 'En Progreso' || emp.status === 'Progreso')) return true;
                if (filter === 'En Riesgo' && emp.status === 'En Riesgo') return true;
                return false;
              }).map((emp, i) => (
                <div key={i} onClick={() => setSelectedPatient(emp)} className="bg-bg rounded-xl p-5 border border-border-color hover:border-primary/30 transition-all shadow-sm cursor-pointer active:scale-[0.98]">
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

      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in px-4">
          <div className="bg-surface rounded-2xl p-8 w-full max-w-md shadow-2xl animate-scale-in border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Agregar Nuevo Paciente</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-main"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="relative">
                <div className="space-y-4 mb-2 max-h-[62vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
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
                <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                      placeholder="correo@ejemplo.com"
                      value={newEmployee.email}
                      onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1">WhatsApp</label>
                    <input
                      type="text"
                      className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                      placeholder="+54 9 11 1234..."
                      value={newEmployee.phone}
                      onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-muted mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                    value={newEmployee.birth_date}
                    onChange={e => setNewEmployee({ ...newEmployee, birth_date: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-muted mb-1">Sexo</label>
                  <select
                    className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                    value={newEmployee.sex}
                    onChange={e => setNewEmployee({ ...newEmployee, sex: e.target.value })}
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
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
                <div className="grid grid-cols-2 gap-4 mt-4">
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

                {/* Evaluación Inicial OMS */}
                <div className="mt-4 pt-4 border-t-2 border-border-color">
                  <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Evaluación Inicial OMS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Adherencia al Plan</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.adherence}
                        onChange={e => setNewEmployee({ ...newEmployee, adherence: e.target.value })}
                      >
                        <option value="1">1 - Muy baja</option>
                        <option value="2">2 - Baja</option>
                        <option value="3">3 - Regular</option>
                        <option value="4">4 - Buena</option>
                        <option value="5">5 - Excelente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Hidratación Adecuada</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.hydration}
                        onChange={e => setNewEmployee({ ...newEmployee, hydration: e.target.value })}
                      >
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Actividad Física Semanal</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.physical_activity}
                        onChange={e => setNewEmployee({ ...newEmployee, physical_activity: e.target.value })}
                      >
                        <option value="≤150 min">≤150 min/semana</option>
                        <option value="+150 min">+150 min/semana</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Consumo Frutas y Verduras</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.consumo_frutas_verduras}
                        onChange={e => setNewEmployee({ ...newEmployee, consumo_frutas_verduras: e.target.value })}
                      >
                        <option value="1">1 - Muy bajo</option>
                        <option value="2">2 - Bajo</option>
                        <option value="3">3 - Regular</option>
                        <option value="4">4 - Bueno</option>
                        <option value="5">5 - Excelente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Nivel de Energía</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.energy_level}
                        onChange={e => setNewEmployee({ ...newEmployee, energy_level: e.target.value })}
                      >
                        <option value="1">1 - Muy bajo</option>
                        <option value="2">2 - Bajo</option>
                        <option value="3">3 - Regular</option>
                        <option value="4">4 - Bueno</option>
                        <option value="5">5 - Excelente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-1">Calidad de Sueño</label>
                      <select
                        className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none"
                        value={newEmployee.sleep_quality}
                        onChange={e => setNewEmployee({ ...newEmployee, sleep_quality: e.target.value })}
                      >
                        <option value="1">1 - Muy mala</option>
                        <option value="2">2 - Mala</option>
                        <option value="3">3 - Regular</option>
                        <option value="4">4 - Buena</option>
                        <option value="5">5 - Excelente</option>
                      </select>
                    </div>
                  </div>
                </div>
                </div>
                {/* Indicador de scroll */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface to-transparent rounded-b-lg" />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border-color">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 border-2 border-border-color rounded-lg font-semibold hover:bg-bg transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Ficha Paciente Detallada */}
      {selectedPatient && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] animate-fade-in p-2 md:p-6 overflow-hidden max-h-screen">
          <div className="bg-surface rounded-2xl w-full max-w-4xl shadow-2xl animate-scale-in border border-white/20 flex flex-col max-h-full">
            <div className="flex justify-between items-start p-6 border-b-2 border-border-color bg-bg rounded-t-2xl shrink-0">
              <div className="grow">
                <div className="flex justify-between items-center w-full">
                  <h3 className="text-2xl font-black text-primary flex items-center gap-3">
                    {selectedPatient.name}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusClasses(selectedPatient.statusColor)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusDotClasses(selectedPatient.statusColor)}`}></span> {selectedPatient.status}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    {!isEditingPatient ? (
                      <button 
                        onClick={() => {
                          setEditPatientData({
                            area: selectedPatient.area,
                            email: selectedPatient.email || '',
                            phone: selectedPatient.phone || '',
                            birth_date: selectedPatient.birth_date || ''
                          });
                          setIsEditingPatient(true);
                        }}
                        className="p-2 border-2 border-border-color bg-surface hover:border-primary hover:text-primary rounded-xl transition-all shadow-sm active:scale-95 text-text-muted flex items-center gap-1.5"
                      >
                        <Edit2 size={16} /><span className="text-sm font-bold hidden sm:inline">Editar Perfil</span>
                      </button>
                    ) : (
                      <button 
                        onClick={handleUpdatePatient}
                        className="px-4 py-2 bg-primary text-white rounded-xl transition-all shadow-md hover:bg-primary-light hover:scale-105 active:scale-95 flex items-center gap-1.5 font-bold text-sm"
                      >
                        <Save size={16} /><span>Guardar Cambios</span>
                      </button>
                    )}
                    <button onClick={() => { setSelectedPatient(null); setIsEditingPatient(false); }} className="p-2 bg-surface hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-colors border-2 border-transparent">
                      <X size={20} strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>

                {!isEditingPatient ? (
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-text-muted font-medium bg-surface p-3 rounded-xl border border-border-color shadow-sm w-fit">
                    <div className="flex items-center gap-2"><span className="uppercase text-[10px] tracking-widest bg-primary/10 text-primary font-bold px-2 py-1 rounded">Área</span> {selectedPatient.area}</div>
                    <div className="flex items-center gap-2"><span className="uppercase text-[10px] tracking-widest bg-primary/10 text-primary font-bold px-2 py-1 rounded">Email</span> {selectedPatient.email || <span className="opacity-50 italic">N/A</span>}</div>
                    <div className="flex items-center gap-2"><span className="uppercase text-[10px] tracking-widest bg-primary/10 text-primary font-bold px-2 py-1 rounded">WhatsApp</span> {selectedPatient.phone || <span className="opacity-50 italic">N/A</span>}</div>
                    <div className="flex items-center gap-2"><span className="uppercase text-[10px] tracking-widest bg-primary/10 text-primary font-bold px-2 py-1 rounded">Nacimiento</span> {selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString() : <span className="opacity-50 italic">N/A</span>}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-surface p-4 rounded-xl border-2 border-primary/30 shadow-sm animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">Área / Depto</label>
                      <select 
                        className="w-full p-2 border border-border-color rounded focus:border-primary focus:outline-none text-sm bg-bg"
                        value={editPatientData.area} onChange={e => setEditPatientData({...editPatientData, area: e.target.value})}
                      >
                        <option>Administración</option><option>Operaciones</option><option>Marketing</option><option>IT</option><option>Ventas</option><option>Finanzas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">Email</label>
                      <input type="email" placeholder="Email" className="w-full p-2 border border-border-color rounded focus:border-primary focus:outline-none text-sm bg-bg" value={editPatientData.email} onChange={e => setEditPatientData({...editPatientData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">WhatsApp</label>
                      <input type="text" placeholder="+54 9..." className="w-full p-2 border border-border-color rounded focus:border-primary focus:outline-none text-sm bg-bg" value={editPatientData.phone} onChange={e => setEditPatientData({...editPatientData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">Nacimiento</label>
                      <input type="date" className="w-full p-2 border border-border-color rounded focus:border-primary focus:outline-none text-sm bg-bg" value={editPatientData.birth_date} onChange={e => setEditPatientData({...editPatientData, birth_date: e.target.value})} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar bg-surface grow">
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20">
                  <h4 className="text-[10px] uppercase tracking-widest font-black text-primary/70 mb-1">Peso Inicial</h4>
                  <p className="text-lg font-mono font-bold text-primary">{selectedPatient.initial_weight} kg</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border-color">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">Peso Actual</h4>
                  <p className="text-lg font-mono font-bold">{selectedPatient.weight}</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border-color">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">Variación</h4>
                  <p className={`text-lg font-mono font-bold ${selectedPatient.weightChangeColor === 'positive' ? 'text-accent-dark' : 'text-danger'}`}>{selectedPatient.weightChange}</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border-color">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">Pérdida (%)</h4>
                  <p className={`text-lg font-bold ${selectedPatient.loss.startsWith('-') ? 'text-accent-dark' : 'text-danger'}`}>{selectedPatient.loss}</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border-color">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">Últ. Adherencia</h4>
                  <p className="text-lg tracking-tighter">{selectedPatient.adherence > 0 ? '⭐'.repeat(selectedPatient.adherence) : '—'}</p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">Historial de Sesiones</h3>
                  <p className="text-xs text-text-muted">Total registradas: {selectedPatient.sessions?.length || 0}</p>
                </div>
              </div>

              {selectedPatient.sessions && selectedPatient.sessions.length > 0 ? (
                <div className="space-y-4">
                  {[...selectedPatient.sessions]
                    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                    .map((session: any, index: number) => {
                      const isAnthro = session.session_type === 'Antropometría';
                      // Find the most recent consultation for this patient (for PDF)
                      const lastConsult = [...selectedPatient.sessions]
                        .filter((s: any) => s.session_type === 'Consulta')
                        .sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0] || null;
                      return (
                        <div key={session.id} className={`bg-bg border-2 rounded-xl p-5 hover:border-primary/20 transition-all card-transition ${
                          isAnthro ? 'border-primary/30 bg-gradient-to-br from-bg to-primary/[0.02]' : 'border-border-color'
                        }`}>
                          <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
                            <div className="flex flex-wrap items-center gap-3 md:gap-6">
                              {/* Date pill */}
                              <div className="bg-primary text-white font-mono font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm">
                                {new Date(session.session_date).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>

                              {/* ── Session Type Badge ── */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isAnthro
                                  ? 'bg-primary/15 text-primary border border-primary/20'
                                  : 'bg-[#6366f1]/10 text-[#4f46e5] border border-[#6366f1]/20'
                              }`}>
                                {isAnthro
                                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                                }
                                {isAnthro ? 'Antropometría' : 'Consulta'}
                              </span>

                              {session.weight && (
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <span className="text-text-muted uppercase tracking-widest text-[9px]">Peso:</span>
                                  <span className="font-mono">{session.weight} kg</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <span className="text-text-muted uppercase tracking-widest text-[9px]">Modalidad:</span>
                                <span className="bg-surface px-2 shadow-sm py-0.5 rounded border border-border-color text-primary font-bold">{session.modality}</span>
                              </div>
                              {session.adherence > 0 && (
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <span className="text-text-muted uppercase tracking-widest text-[9px]">Adherencia:</span>
                                  <span className="tracking-tighter">{session.adherence > 0 ? '⭐'.repeat(session.adherence) : 'N/A'}</span>
                                </div>
                              )}
                            </div>

                            {/* Right side: status + report button */}
                            <div className="flex items-center gap-2 shrink-0">
                              {session.overall_status && (
                                <span className="text-xs font-bold uppercase tracking-wider text-text-muted bg-surface px-3 py-1.5 rounded-md border border-border-color">
                                  Estado: {session.overall_status}
                                </span>
                              )}
                              {/* ── Generate Report Button (only for Antropometría) ── */}
                              {isAnthro && (
                                <AnthroReportButton
                                  session={session}
                                  patient={selectedPatient}
                                  latestConsult={lastConsult}
                                />
                              )}
                            </div>
                          </div>

                          {/* Extra details */}
                          {(session.achievements || session.difficulties || session.laboratorio_alterado) && (
                            <div className="mt-4 pt-4 border-t border-border-color grid grid-cols-1 md:grid-cols-2 gap-4">
                              {session.laboratorio_alterado && (
                                <div className="md:col-span-2">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[#92400e] mb-1">Laboratorio Alterado</p>
                                  <p className="text-sm text-text-muted bg-warning/5 p-3 rounded-lg border border-warning/20">{session.laboratorio_alterado}</p>
                                </div>
                              )}
                              {session.achievements && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-accent-dark mb-1">Logros</p>
                                  <p className="text-sm text-text-muted bg-surface/50 p-3 rounded-lg border border-border-color/50 h-full">{session.achievements}</p>
                                </div>
                              )}
                              {session.difficulties && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Desafíos</p>
                                  <p className="text-sm text-text-muted bg-surface/50 p-3 rounded-lg border border-border-color/50 h-full">{session.difficulties}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="bg-surface border-2 border-dashed border-border-color rounded-2xl p-12 text-center">
                  <Activity size={48} className="text-border-color mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-text-muted">Aún no hay sesiones</h4>
                  <p className="text-sm text-text-muted/70 mt-1">Cuando registres métricas para este paciente, aparecerán aquí de forma detallada.</p>
                </div>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Registro Exitoso!"
        message="El nuevo paciente ha sido registrado correctamente en el sistema."
      />
    </div>
  );
}
