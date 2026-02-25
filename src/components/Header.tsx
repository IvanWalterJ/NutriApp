export default function Header() {
  return (
    <header className="bg-surface border-b-2 border-border-color px-8 py-6 sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center">
        <div className="font-mono text-2xl font-bold text-primary tracking-tight">
          NU<span className="text-accent-dark">PLAN</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="bg-gradient-to-br from-primary to-primary-light text-white px-5 py-2 rounded-lg font-semibold text-sm">
            🏢 Galeno Seguros
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold text-sm">María Rodríguez</div>
              <div className="text-xs text-text-muted">Gerente RRHH</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-primary">
              MR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
