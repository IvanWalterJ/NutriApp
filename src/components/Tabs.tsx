export default function Tabs({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard General' },
    { id: 'empleados', label: '👥 Empleados' },
    { id: 'nueva-sesion', label: '📝 Nueva Sesión' },
    { id: 'parametros', label: '📈 Parámetros OMS' },
  ];

  return (
    <div className="bg-surface rounded-xl p-4 mb-8 border-2 border-border-color flex flex-col md:flex-row gap-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 px-6 py-4 rounded-lg font-semibold text-center transition-all duration-300 border-2 ${
            activeTab === tab.id
              ? 'bg-gradient-to-br from-primary to-primary-light text-white border-primary'
              : 'bg-transparent border-transparent hover:bg-bg hover:border-border-color'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
