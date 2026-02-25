
// SVG icon components
const DashboardIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const UsersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ClipboardIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
  </svg>
);
const TrendingUpIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const tabs = [
  { id: 'dashboard', label: 'Dashboard General', Icon: DashboardIcon },
  { id: 'empleados', label: 'Empleados', Icon: UsersIcon },
  { id: 'nueva-sesion', label: 'Nueva Sesión', Icon: ClipboardIcon },
  { id: 'parametros', label: 'Parámetros OMS', Icon: TrendingUpIcon },
];

export default function Tabs({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  return (
    <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-2 mb-8 border-2 border-border-color flex flex-row overflow-x-auto md:overflow-x-visible no-scrollbar gap-2 scroll-smooth">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex-1 min-w-[140px] md:min-w-0 px-4 md:px-6 py-3 md:py-3.5 rounded-xl font-bold text-center transition-all duration-300 relative overflow-hidden group shrink-0 ${activeTab === id
            ? 'bg-primary text-white shadow-[0_4px_12px_rgba(10,77,60,0.2)] scale-[1.02]'
            : 'bg-transparent text-text-muted hover:bg-white hover:text-primary hover:shadow-sm'
            }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2 md:gap-2.5 group-active:scale-95 transition-transform text-xs md:text-base whitespace-nowrap">
            <Icon />
            {label}
          </span>
          {activeTab === id && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light brightness-110 animate-fade-in" />
          )}
        </button>
      ))}
    </div>
  );
}
