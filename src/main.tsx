import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import PublicFormPage from './components/public/PublicFormPage.tsx';
import './index.css';

import { ToastProvider } from './context/ToastContext.tsx';

/**
 * Routing trivial por pathname — evita sumar react-router-dom para una sola
 * ruta pública. Si el path empieza con /public/form/<slug>, se renderiza el
 * formulario público sin shell ni auth. Cualquier otra ruta cae a <App />.
 */
function Root() {
  const path = window.location.pathname;
  const publicFormMatch = path.match(/^\/public\/form\/([^\/]+)\/?$/);
  if (publicFormMatch) {
    return <PublicFormPage slug={decodeURIComponent(publicFormMatch[1])} />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </StrictMode>,
);
