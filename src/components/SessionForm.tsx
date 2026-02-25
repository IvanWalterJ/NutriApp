export default function SessionForm() {
  return (
    <div className="bg-surface border-2 border-border-color rounded-xl p-8 mb-8 animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📝 Registro de Sesión</h2>
        <div className="text-text-muted text-sm">Completar después de cada consulta (2-3 minutos)</div>
      </div>

      <form>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Paciente</label>
            <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
              <option>Seleccionar empleado...</option>
              <option>Laura Fernández</option>
              <option>Carlos Mendoza</option>
              <option>Valentina Ruiz</option>
              <option>Diego Sánchez</option>
              <option>Sofía Torres</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Fecha Sesión</label>
            <input type="date" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all" defaultValue="2026-02-13" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Duración</label>
            <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
              <option>30 minutos</option>
              <option defaultValue="45 minutos">45 minutos</option>
              <option>60 minutos</option>
            </select>
          </div>
        </div>

        <div className="bg-bg p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold mb-4 text-primary">📊 Métricas Físicas (OMS)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Peso Actual (kg)</label>
              <input type="number" step="0.1" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="68.5" defaultValue="68.5" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">% Grasa Corporal</label>
              <input type="number" step="0.1" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="24.3" defaultValue="24.3" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Perímetro Cintura (cm)</label>
              <input type="number" step="0.1" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="82.5" defaultValue="82.5" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Presión Sistólica</label>
              <input type="number" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="120" defaultValue="118" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Presión Diastólica</label>
              <input type="number" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="80" defaultValue="76" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Frecuencia Cardíaca</label>
              <input type="number" className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all font-mono font-bold" placeholder="72" defaultValue="68" />
            </div>
          </div>
        </div>

        <div className="bg-bg p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold mb-4 text-primary">⭐ Evaluación Nutricional</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Adherencia al Plan</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option>1 - Muy Baja</option>
                <option>2 - Baja</option>
                <option>3 - Media</option>
                <option>4 - Alta</option>
                <option defaultValue="5 - Muy Alta">5 - Muy Alta</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Nivel de Energía</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option>1 - Muy Bajo</option>
                <option>2 - Bajo</option>
                <option>3 - Normal</option>
                <option defaultValue="4 - Alto">4 - Alto</option>
                <option>5 - Muy Alto</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Calidad de Sueño</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option>1 - Muy Mala</option>
                <option>2 - Mala</option>
                <option>3 - Regular</option>
                <option defaultValue="4 - Buena">4 - Buena</option>
                <option>5 - Excelente</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Hidratación Adecuada</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option>No</option>
                <option defaultValue="Sí">Sí</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Actividad Física Semanal</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option>0 días</option>
                <option>1-2 días</option>
                <option defaultValue="3-4 días">3-4 días</option>
                <option>5+ días</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Estado General</label>
              <select className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all cursor-pointer">
                <option defaultValue="En Progreso">En Progreso</option>
                <option>Objetivo Alcanzado</option>
                <option>En Riesgo</option>
                <option>Requiere Derivación</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Principales Logros</label>
            <textarea className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all min-h-[100px] resize-y" placeholder="Ej: Completó 4 días de actividad física. Mejoró hidratación. Redujo consumo de azúcares." defaultValue="Completó 4 días de actividad física esta semana. Mejoró significativamente la hidratación. Redujo consumo de azúcares procesados."></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold uppercase tracking-widest">Dificultades y Ajustes</label>
            <textarea className="p-3 border-2 border-border-color rounded-lg text-base bg-surface focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all min-h-[100px] resize-y" placeholder="Ej: Dificultad para cenar temprano por horarios laborales. Ajustamos distribución de macros." defaultValue="Reporta dificultad para mantener horarios de cena por reuniones laborales tardías. Se ajustó plan para permitir mayor flexibilidad horaria manteniendo calidad nutricional."></textarea>
          </div>
        </div>

        <div className="flex gap-4 justify-end mt-8 pt-6 border-t-2 border-border-color">
          <button type="button" className="px-8 py-4 bg-bg text-text-main border-2 border-border-color rounded-lg font-bold text-base transition-all hover:bg-surface hover:border-primary">Cancelar</button>
          <button type="button" className="px-8 py-4 bg-bg text-text-main border-2 border-border-color rounded-lg font-bold text-base transition-all hover:bg-surface hover:border-primary">Guardar Borrador</button>
          <button type="submit" className="px-8 py-4 bg-gradient-to-br from-primary to-primary-light text-white rounded-lg font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(10,77,60,0.3)]">✓ Registrar Sesión</button>
        </div>
      </form>
    </div>
  );
}
