import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export default function Charts() {
  const data = [
    { name: 'Ene', value: 45 },
    { name: 'Feb', value: 52 },
    { name: 'Mar', value: 61 },
    { name: 'Abr', value: 58 },
    { name: 'May', value: 67 },
    { name: 'Jun', value: 72 },
    { name: 'Jul', value: 68 },
    { name: 'Ago', value: 75 },
    { name: 'Sep', value: 81 },
    { name: 'Oct', value: 78 },
    { name: 'Nov', value: 85 },
    { name: 'Dic', value: 92 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in" style={{ animationDelay: '0.1s' }}>
      <div className="lg:col-span-2 bg-surface border-2 border-border-color rounded-xl p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Evolución Mensual Participación</h3>
          <p className="text-sm text-text-muted">Últimos 12 meses • Sesiones completadas</p>
        </div>
        <div className="h-[300px] bg-gradient-to-b from-accent/5 to-transparent rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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

      <div className="bg-surface border-2 border-border-color rounded-xl p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">Distribución Estado</h3>
          <p className="text-sm text-text-muted">Clasificación actual empleados</p>
        </div>
        <div className="grid gap-4">
          <div className="flex items-center gap-4 p-4 bg-bg rounded-lg">
            <div className="min-w-[120px] font-semibold text-sm">✅ Objetivo Alcanzado</div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-1000 w-[62%] bg-gradient-to-r from-primary to-accent-dark"></div>
            </div>
            <div className="min-w-[60px] text-right font-bold font-mono">97</div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-bg rounded-lg">
            <div className="min-w-[120px] font-semibold text-sm">🔄 En Progreso</div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-1000 w-[33%] bg-gradient-to-r from-info to-[#60A5FA]"></div>
            </div>
            <div className="min-w-[60px] text-right font-bold font-mono">51</div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-bg rounded-lg">
            <div className="min-w-[120px] font-semibold text-sm">⚠️ En Riesgo</div>
            <div className="flex-1 h-8 rounded-md bg-border-color overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-1000 w-[5%] bg-gradient-to-r from-danger to-[#F87171]"></div>
            </div>
            <div className="min-w-[60px] text-right font-bold font-mono">8</div>
          </div>
        </div>
      </div>
    </div>
  );
}
