export default function Metrics() {
  const metrics = [
    {
      label: 'Empleados Activos',
      icon: '👥',
      iconBg: 'bg-accent/15',
      value: '156',
      change: '↑ +12 este mes',
      changeColor: 'text-accent-dark',
    },
    {
      label: 'Adherencia Promedio',
      icon: '⭐',
      iconBg: 'bg-info/15',
      value: (
        <>
          4.3<span className="text-2xl text-text-muted">/5</span>
        </>
      ),
      change: '↑ +0.4 vs mes anterior',
      changeColor: 'text-accent-dark',
    },
    {
      label: 'Pérdida Peso Promedio',
      icon: '📉',
      iconBg: 'bg-accent/15',
      value: (
        <>
          -3.8<span className="text-xl text-text-muted">kg</span>
        </>
      ),
      change: '↑ Objetivo: -2.5kg',
      changeColor: 'text-accent-dark',
    },
    {
      label: 'En Riesgo',
      icon: '⚠️',
      iconBg: 'bg-danger/15',
      value: '8',
      change: '+3 sin sesión >30 días',
      changeColor: 'text-danger',
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
            {metric.value}
          </div>
          <div className={`text-sm font-semibold flex items-center gap-2 ${metric.changeColor}`}>
            {metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}
