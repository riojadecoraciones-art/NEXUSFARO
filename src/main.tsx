import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';

// registerType 'autoUpdate' (ver vite.config.ts) hace que una versión nueva
// se active sola, sin pedirle confirmación a nadie — pero el navegador sólo
// revisa si hay una versión nueva al navegar a la página. Una terminal que
// se queda abierta toda la jornada (el caso normal de una caja) podía
// tardar horas en enterarse de una actualización, y el único apuro manual
// era un refresco forzado (Ctrl+Shift+R) que un dueño de comercio no
// técnico no tiene por qué conocer. Este chequeo periódico es lo que
// faltaba: cada 60s le pregunta al servidor si el service worker cambió.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update();
    }, 60 * 1000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
