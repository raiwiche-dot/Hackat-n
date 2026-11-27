import { useEffect, useState } from 'react';
import {
  cerrarSesionLocal,
  guardarSesionLocal,
  leerSesionLocal,
  type SesionUsuario,
} from './auth/rolesAuth';
import { HeaderConfianza } from './components/HeaderConfianza';
import type { EstadoSaludApi, VistaActiva } from './components/HeaderConfianza';
import { seccionesF11Mock } from './mocks/mockData';
import { estaEnModoMock, obtenerEstadoSaludApi } from './services/apiClient';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MedicalPortalPage } from './pages/MedicalPortalPage';
import { ReportCenterPage } from './pages/ReportCenterPage';
import { ThreatIntelPage } from './pages/ThreatIntelPage';
import { TimelinePage } from './pages/TimelinePage';

const infoVistaSoc: Record<VistaActiva, { titulo: string; subtitulo: string }> = {
  dashboard: {
    titulo: 'Consola de Telemetría & Escenarios IPE',
    subtitulo: 'Fuentes internas: 10,023,532 registros auditados, ML sin reglas y matriz 24×31',
  },
  timeline: {
    titulo: 'Kill Chain Cross-Layer & Break-Glass',
    subtitulo: 'Correlación Firewall <-> MedSys con ajuste selectivo +12h y bóveda account_vault',
  },
  'threat-intel': {
    titulo: 'MITRE ATT&CK · Reglas Sigma (IoA/IoC) · STIX 2.1',
    subtitulo: 'Separación estricta entre indicadores de comportamiento y contención puntual',
  },
  'report-center': {
    titulo: 'Centro de Reporte Técnico F-11 & Hash-Chain',
    subtitulo: 'Generación de PDF técnico de 8 secciones y verificación SHA-256 en cti_audit',
  },
};

export function App() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(() => leerSesionLocal());
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('dashboard');
  const [estadoSalud, setEstadoSalud] = useState<EstadoSaludApi>({
    postgresReady: false,
    ollamaReady: false,
    zeroEgress: false,
    apiDisponible: false,
  });

  const usandoMocks = estaEnModoMock();

  useEffect(() => {
    let active = true;
    const consultar = () =>
      obtenerEstadoSaludApi().then((r) => {
        if (active) setEstadoSalud(r);
      });
    void consultar();
    const id = window.setInterval(consultar, 30000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const handleLoginExitoso = (nuevaSesion: SesionUsuario) => {
    guardarSesionLocal(nuevaSesion);
    setSesion(nuevaSesion);
    setVistaActiva('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCerrarSesion = () => {
    cerrarSesionLocal();
    setSesion(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (!sesion) {
    return <LoginPage onLoginExitoso={handleLoginExitoso} />;
  }

  if (sesion.rol === 'medico') {
    return (
      <MedicalPortalPage
        sesion={sesion}
        onCerrarSesion={handleCerrarSesion}
      />
    );
  }

  const cabeceraVista = infoVistaSoc[vistaActiva];

  return (
    <div className="bg-institutional-canvas flex min-h-screen flex-col overflow-x-hidden text-[#073B2C] lg:flex-row">
      <HeaderConfianza
        estado={estadoSalud}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        usandoMocks={usandoMocks}
        sesion={sesion}
        onCerrarSesion={handleCerrarSesion}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 border-b border-[#CDE2D7] bg-white/95 px-4 py-3.5 shadow-2xs backdrop-blur-xs sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#073B2C] sm:text-lg">
                {cabeceraVista.titulo}
              </h2>
              <p className="text-xs text-slate-600 sm:text-sm">{cabeceraVista.subtitulo}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <span className="inline-flex min-h-[38px] items-center rounded-lg border border-[#0B5D46]/30 bg-[#E3F2EC] px-3 py-1.5 font-bold text-[#063729]">
                ROL: SOC TÉCNICO
              </span>
              {vistaActiva !== 'report-center' && (
                <button
                  type="button"
                  onClick={() => setVistaActiva('report-center')}
                  className="btn-touch min-h-[42px] cursor-pointer rounded-lg bg-[#0B5D46] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#063729]"
                >
                  PDF Técnico F-11
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {vistaActiva === 'dashboard' && (
            <DashboardPage
              onIrAuditoria={() => setVistaActiva('report-center')}
              onVerLineaTiempo={() => setVistaActiva('timeline')}
            />
          )}

          {vistaActiva === 'timeline' && (
            <TimelinePage analistaPorDefecto={sesion.usuario} />
          )}

          {vistaActiva === 'threat-intel' && (
            <ThreatIntelPage />
          )}

          {vistaActiva === 'report-center' && (
            <ReportCenterPage secciones={seccionesF11Mock} />
          )}
        </main>

        <footer className="border-t border-[#CDE2D7] bg-white px-4 py-3 text-center font-mono text-xs text-slate-600">
          AEGISHEALTH-CTI · ZERO-EGRESS VERIFICADO · LOPDP ART. 25 · DATOS SINTÉTICOS TLP:RED
        </footer>
      </div>
    </div>
  );
}

export default App;
