import { useState } from 'react';

export default function Parameters() {
  const [selectedPatient, setSelectedPatient] = useState('Laura Fernández');

  const allPatients = [
    'Laura Fernández',
    'Carlos Mendoza',
    'Valentina Ruiz',
    'Diego Sánchez',
    'Sofía Torres',
    'Martín Gómez'
  ];

  const patientsData: Record<string, any> = {
    'Laura Fernández': {
      eval: {
        cumple: 6,
        total: 6,
        text: 'Progreso excelente en todos los indicadores nutricionales y de actividad física.',
        rec: 'Mantener plan actual. Próxima revisión en 2 semanas.'
      },
      params: [
        {
          name: 'Índice de Masa Corporal (IMC)',
          status: 'Normal',
          statusColor: 'normal',
          initial: '25.6',
          actual: '22.8',
          target: '22.0',
          progress: 92,
          note: 'OMS: 18.5-24.9 = Normal • Reducción:',
          noteValue: '-2.8 puntos',
        },
        {
          name: 'Perímetro de Cintura',
          status: 'Normal',
          statusColor: 'normal',
          initial: '92 cm',
          actual: '82.5 cm',
          target: '80 cm',
          progress: 88,
          note: 'OMS Mujer: <88cm = Bajo riesgo • Reducción:',
          noteValue: '-9.5 cm',
        },
        {
          name: 'Porcentaje Grasa Corporal',
          status: 'Normal',
          statusColor: 'normal',
          initial: '32.4%',
          actual: '24.3%',
          target: '22.0%',
          progress: 81,
          note: 'OMS Mujer: 21-32% = Normal • Reducción:',
          noteValue: '-8.1%',
        },
        {
          name: 'Presión Arterial',
          status: 'Normal',
          statusColor: 'normal',
          initial: '132/88',
          actual: '118/76',
          target: '120/80',
          progress: 95,
          note: 'OMS: <120/80 = Óptima • Mejoría:',
          noteValue: '-14/-12 mmHg',
        },
        {
          name: 'Masa Muscular',
          status: 'Normal',
          statusColor: 'normal',
          initial: '42.1%',
          actual: '44.8%',
          target: '45.0%',
          progress: 96,
          note: 'OMS Mujer: >40% = Saludable • Aumento:',
          noteValue: '+2.7%',
        },
        {
          name: 'Actividad Física OMS',
          status: 'Cumple',
          statusColor: 'normal',
          initial: '45 min',
          actual: '180 min',
          target: '150 min',
          progress: 100,
          note: 'OMS: 150-300 min/semana • Aumento:',
          noteValue: '+135 min/sem',
        },
      ]
    },
    'Martín Gómez': {
      eval: {
        cumple: 2,
        total: 6,
        text: 'Requiere atención. Parámetros de riesgo cardiovascular elevados.',
        rec: 'Ajustar plan calórico. Aumentar actividad física gradualmente. Revisión semanal.'
      },
      params: [
        {
          name: 'Índice de Masa Corporal (IMC)',
          status: 'Riesgo',
          statusColor: 'risk',
          initial: '28.5',
          actual: '28.9',
          target: '24.9',
          progress: 30,
          note: 'OMS: 25.0-29.9 = Sobrepeso • Aumento:',
          noteValue: '+0.4 puntos',
        },
        {
          name: 'Perímetro de Cintura',
          status: 'Riesgo',
          statusColor: 'risk',
          initial: '102 cm',
          actual: '104 cm',
          target: '94 cm',
          progress: 40,
          note: 'OMS Hombre: >102cm = Riesgo alto • Aumento:',
          noteValue: '+2 cm',
        },
        {
          name: 'Porcentaje Grasa Corporal',
          status: 'Alerta',
          statusColor: 'alert',
          initial: '26.0%',
          actual: '26.5%',
          target: '20.0%',
          progress: 50,
          note: 'OMS Hombre: 11-21% = Normal • Aumento:',
          noteValue: '+0.5%',
        },
        {
          name: 'Presión Arterial',
          status: 'Alerta',
          statusColor: 'alert',
          initial: '135/85',
          actual: '138/88',
          target: '120/80',
          progress: 60,
          note: 'OMS: 130-139 = Normal Alta • Empeoramiento:',
          noteValue: '+3/+3 mmHg',
        },
        {
          name: 'Masa Muscular',
          status: 'Normal',
          statusColor: 'normal',
          initial: '38.0%',
          actual: '37.5%',
          target: '40.0%',
          progress: 85,
          note: 'OMS Hombre: >40% = Saludable • Reducción:',
          noteValue: '-0.5%',
        },
        {
          name: 'Actividad Física OMS',
          status: 'No Cumple',
          statusColor: 'risk',
          initial: '30 min',
          actual: '20 min',
          target: '150 min',
          progress: 15,
          note: 'OMS: 150-300 min/semana • Reducción:',
          noteValue: '-10 min/sem',
        },
      ]
    }
  };

  const currentData = patientsData[selectedPatient] || {
    eval: {
      cumple: 4,
      total: 6,
      text: 'Progreso estable. Manteniendo la mayoría de los indicadores.',
      rec: 'Continuar con el plan actual y monitorear.'
    },
    params: patientsData['Laura Fernández'].params
  };
  const parameters = currentData.params;
  const evaluation = currentData.eval;

  const getStatusClasses = (statusColor: string) => {
    switch (statusColor) {
      case 'normal':
        return 'bg-accent/15 text-primary';
      case 'alert':
        return 'bg-warning/15 text-[#D97706]';
      case 'risk':
        return 'bg-danger/15 text-danger';
      default:
        return '';
    }
  };

  const getProgressClasses = (statusColor: string) => {
    switch (statusColor) {
      case 'normal':
        return 'bg-accent-dark';
      case 'alert':
        return 'bg-warning';
      case 'risk':
        return 'bg-danger';
      default:
        return '';
    }
  };

  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 animate-in" style={{ animationDelay: '0.4s' }}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">📈 Parámetros OMS</h2>
          <div className="text-text-muted text-sm">Evolución según estándares internacionales</div>
        </div>
        <div className="flex items-center gap-3 relative">
          <label className="text-[0.85rem] font-semibold uppercase tracking-widest text-text-muted">Paciente:</label>
          <input 
            list="patients-list"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            placeholder="Buscar paciente..."
            className="p-2 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-semibold w-[250px]"
          />
          <datalist id="patients-list">
            {allPatients.map(p => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parameters.map((param, i) => (
          <div key={i} className="bg-bg border-l-4 border-primary rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-base">{param.name}</span>
              <span className={`px-3 py-1 rounded-md text-[0.8rem] font-semibold ${getStatusClasses(param.statusColor)}`}>
                {param.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-[0.75rem] text-text-muted uppercase mb-1">Inicial</div>
                <div className="font-mono font-bold text-[1.1rem]">{param.initial}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.75rem] text-text-muted uppercase mb-1">Actual</div>
                <div className="font-mono font-bold text-[1.1rem] text-accent-dark">{param.actual}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.75rem] text-text-muted uppercase mb-1">Objetivo</div>
                <div className="font-mono font-bold text-[1.1rem]">{param.target}</div>
              </div>
            </div>
            <div className="h-2 bg-border-color rounded-full relative overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${getProgressClasses(param.statusColor)}`} style={{ width: `${param.progress}%` }}></div>
            </div>
            <div className="mt-3 text-[0.85rem] text-text-muted">
              {param.note} <strong className="text-accent-dark">{param.noteValue}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-8 mt-8 text-white ${evaluation.cumple >= 4 ? 'bg-gradient-to-br from-primary to-primary-light' : 'bg-gradient-to-br from-danger to-red-700'}`}>
        <h3 className="text-[1.3rem] font-bold mb-4">
          {evaluation.cumple >= 4 ? '✅' : '⚠️'} Evaluación General OMS
        </h3>
        <div className="text-[1.1rem] leading-[1.8]">
          <strong>{selectedPatient}</strong> cumple con <strong>{evaluation.cumple} de {evaluation.total}</strong> parámetros de salud de la OMS.<br />
          <strong>{evaluation.text}</strong><br />
          <strong>Recomendación:</strong> {evaluation.rec}
        </div>
      </div>
    </div>
  );
}
