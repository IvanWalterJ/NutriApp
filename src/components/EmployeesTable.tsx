import { useState } from 'react';

export default function EmployeesTable() {
  const [filter, setFilter] = useState('Todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const employees = [
    {
      name: 'Laura Fernández',
      dept: 'Administración',
      status: 'Objetivo',
      statusColor: 'success',
      sessions: 12,
      weight: '68.5 kg',
      weightChange: '-8.2kg',
      weightChangeColor: 'positive',
      loss: '-10.7%',
      adherence: 5,
      imc: 22.8,
      lastSession: 'Hace 4 días',
    },
    {
      name: 'Carlos Mendoza',
      dept: 'Operaciones',
      status: 'Objetivo',
      statusColor: 'success',
      sessions: 10,
      weight: '82.3 kg',
      weightChange: '-6.5kg',
      weightChangeColor: 'positive',
      loss: '-7.3%',
      adherence: 5,
      imc: 24.1,
      lastSession: 'Hace 6 días',
    },
    {
      name: 'Valentina Ruiz',
      dept: 'Marketing',
      status: 'Progreso',
      statusColor: 'warning',
      sessions: 8,
      weight: '72.1 kg',
      weightChange: '-3.2kg',
      weightChangeColor: 'positive',
      loss: '-4.2%',
      adherence: 4,
      imc: 26.3,
      lastSession: 'Hace 8 días',
    },
    {
      name: 'Diego Sánchez',
      dept: 'IT',
      status: 'Objetivo',
      statusColor: 'success',
      sessions: 11,
      weight: '78.9 kg',
      weightChange: '-7.8kg',
      weightChangeColor: 'positive',
      loss: '-9.0%',
      adherence: 5,
      imc: 23.7,
      lastSession: 'Hace 3 días',
    },
    {
      name: 'Sofía Torres',
      dept: 'Ventas',
      status: 'Progreso',
      statusColor: 'warning',
      sessions: 6,
      weight: '65.4 kg',
      weightChange: '-2.1kg',
      weightChangeColor: 'positive',
      loss: '-3.1%',
      adherence: 4,
      imc: 25.1,
      lastSession: 'Hace 12 días',
    },
    {
      name: 'Martín Gómez',
      dept: 'Finanzas',
      status: 'Riesgo',
      statusColor: 'danger',
      sessions: 3,
      weight: '91.2 kg',
      weightChange: '+1.3kg',
      weightChangeColor: 'negative',
      loss: '+1.4%',
      adherence: 2,
      imc: 28.9,
      lastSession: 'Hace 38 días',
    },
  ];

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
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 animate-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Empleados en Programa</h2>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg font-semibold text-sm transition-all hover:shadow-[0_4px_12px_rgba(10,77,60,0.2)] flex items-center gap-2"
          >
            <span>➕</span> Nuevo Empleado
          </button>
          <div className="w-px h-10 bg-border-color hidden md:block"></div>
          <button 
            onClick={() => setFilter('Todos')}
            className={`px-5 py-2 border-2 rounded-lg font-semibold text-sm transition-all ${filter === 'Todos' ? 'border-primary bg-primary text-white' : 'border-border-color bg-surface hover:border-primary hover:text-primary'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('En Progreso')}
            className={`px-5 py-2 border-2 rounded-lg font-semibold text-sm transition-all ${filter === 'En Progreso' ? 'border-primary bg-primary text-white' : 'border-border-color bg-surface hover:border-primary hover:text-primary'}`}
          >
            En Progreso
          </button>
          <button 
            onClick={() => setFilter('En Riesgo')}
            className={`px-5 py-2 border-2 rounded-lg font-semibold text-sm transition-all ${filter === 'En Riesgo' ? 'border-primary bg-primary text-white' : 'border-border-color bg-surface hover:border-primary hover:text-primary'}`}
          >
            En Riesgo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
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
              if (filter === 'En Progreso' && emp.status === 'Progreso') return true;
              if (filter === 'En Riesgo' && emp.status === 'Riesgo') return true;
              return false;
            }).map((emp, i) => (
              <tr key={i} className="transition-colors duration-200 hover:bg-bg border-b border-border-color">
                <td className="p-5">
                  <strong>{emp.name}</strong><br />
                  <span className="text-[0.85rem] text-text-muted">{emp.dept}</span>
                </td>
                <td className="p-5">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[0.85rem] font-semibold ${getStatusClasses(emp.statusColor)}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusDotClasses(emp.statusColor)}`}></span> {emp.status}
                  </span>
                </td>
                <td className="p-5"><strong>{emp.sessions}</strong></td>
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
                    {'⭐'.repeat(emp.adherence)}
                  </div>
                </td>
                <td className="p-5"><strong>{emp.imc}</strong></td>
                <td className="p-5">{emp.lastSession}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Agregar Nuevo Empleado</h3>
            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Nombre Completo</label>
                  <input type="text" required className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none" placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Departamento</label>
                  <select className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none">
                    <option>Administración</option>
                    <option>Operaciones</option>
                    <option>Marketing</option>
                    <option>IT</option>
                    <option>Ventas</option>
                    <option>Finanzas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Peso Inicial (kg)</label>
                  <input type="number" step="0.1" required className="w-full p-3 border-2 border-border-color rounded-lg focus:border-primary focus:outline-none font-mono" placeholder="0.0" />
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
    </div>
  );
}
