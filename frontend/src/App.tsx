import { useEffect, useState } from 'react';
import { HeaderConfianza } from './components/HeaderConfianza';
import type { EstadoSaludApi, VistaActiva } from './components/HeaderConfianza';
import {
  adversariosMock,
  artefactosMock,
  auditoriaInicialMock,
  campanasMock,
  seccionesF11Mock,
} from './mocks/mockData';
import type { CampanaId, RegistroAuditoria } from './mocks/mockData';
import {
  estaEnModoMock,
  obtenerEstadoSaludApi,
  saludEjemploMock,
} from './services/apiClient';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { ThreatIntelPage } from './pages/ThreatIntelPage';
import { ReportCenterPage } from './pages/ReportCenterPage';

export type ModoLectura = 'simple' | 'tecnico';

const infoVistaActual: Record<VistaActiva, { titulo: string; subtitulo: string }> = {
  dashboard: {
    titulo: 'Resumen general y mapa horario',
    subtitulo: 'Estado de la actividad registrada, alertas detectadas y horarios de mayor movimiento',
  },
  timeline: {
    titulo: 'Secuencia de eventos y privacidad',
    subtitulo: 'Orden cronológico de cada incidente y resguardo de identidades LOPDP',
  },
  'threat-intel': {
    titulo: 'Adversarios y reglas de protección',
    subtitulo: 'Perfiles de riesgo, comportamientos detectados y exportación para alertas',
  },
  'report-center': {
    titulo: 'Reporte F-11 y auditoría',
    subtitulo: 'Las 8 secciones requeridas para entrega y verificación de integridad',
  },
};

export function App() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('dashboard');
  const [modoLectura, setModoLectura] = useState<ModoLectura>('simple');
  const [registrosAuditoria, setRegistrosAuditoria] =
    useState<RegistroAuditoria[]>(auditoriaInicialMock);
  const [estadoSalud, setEstadoSalud] = useState<EstadoSaludApi>(saludEjemploMock);

  const usandoMocks = estaEnModoMock();

  useEffect(() => {
    obtenerEstadoSaludApi().then(setEstadoSalud);
  }, []);

  const agregarRegistroAuditoria = (
    tipoEvento: string,
    detalle: string,
    actorToken = 'ANALISTA-ACTIVO'
  ) => {
    setRegistrosAuditoria((prev) => {
      const ultimoHash =
        prev.length > 0 ? prev[prev.length - 1].hashActual : '0000000000000000';
      const nuevoHash = ((ultimoHash.length * 997 + prev.length * 131) % 0xffffffff)
        .toString(16)
        .padStart(16, '0');

      const nuevoRegistro: RegistroAuditoria = {
        id: `AUD-${100 + prev.length + 1}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        tipoEvento,
        actorToken,
        detalle,
        hashPrevio: ultimoHash,
        hashActual: nuevoHash,
      };
      return [...prev, nuevoRegistro];
    });
  };

  const handleRegistrarBreakGlass = (
    analistaId: string,
    motivo: string,
    campanaId: CampanaId
  ) => {
    agregarRegistroAuditoria(
      'BREAK_GLASS_REVEAL',
      `Revelación temporal de cuentas técnicas en ${campanaId}. Motivo: ${motivo}`,
      analistaId
    );
  };

  const handleExportarStix = () => {
    const bundleStix = {
      type: 'bundle',
      id: 'bundle--aegishealth-cti-synthetic-001',
      x_synthetic_data: true,
      x_disclaimer: 'Generado exclusivamente sobre datos sintéticos de laboratorio.',
      objects: [
        {
          type: 'indicator',
          id: 'indicator--camp-2026-001-egress',
          name: 'Conexión saliente hacia 186.46.219.18:8443 (Sintético)',
          pattern: "[ipv4-addr:value = '186.46.219.18' AND network-traffic:dst_port = 8443]",
          pattern_type: 'stix',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(bundleStix, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'aegishealth_stix_2_1_sintetico.json';
    enlace.click();
    URL.revokeObjectURL(url);

    agregarRegistroAuditoria(
      'EXPORT_STIX_2_1',
      'Exportación de bundle STIX 2.1 etiquetado como dato sintético.'
    );
  };

  const cabeceraVista = infoVistaActual[vistaActiva];

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row">
      <HeaderConfianza
        estado={estadoSalud}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        usandoMocks={usandoMocks}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra contextual superior */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xs sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                {cabeceraVista.titulo}
              </h2>
              <p className="text-xs text-slate-500">{cabeceraVista.subtitulo}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Interruptor Lectura simple vs Detalle técnico */}
              <div
                className="inline-flex rounded-sm border border-slate-300 bg-slate-100 p-0.5 text-xs shadow-xs"
                role="group"
                aria-label="Nivel de lectura"
              >
                <button
                  type="button"
                  onClick={() => setModoLectura('simple')}
                  className={`rounded-xs px-3 py-1.5 font-semibold transition-all ${
                    modoLectura === 'simple'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Lectura simple
                </button>
                <button
                  type="button"
                  onClick={() => setModoLectura('tecnico')}
                  className={`rounded-xs px-3 py-1.5 font-semibold transition-all ${
                    modoLectura === 'tecnico'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Detalle técnico
                </button>
              </div>

              {vistaActiva !== 'report-center' && (
                <button
                  type="button"
                  onClick={() => setVistaActiva('report-center')}
                  className="rounded-sm border border-teal-600 bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-700"
                >
                  Reporte F-11
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
          {vistaActiva === 'dashboard' && (
            <DashboardPage
              modoLectura={modoLectura}
              onIrAuditoria={() => setVistaActiva('report-center')}
              onVerLineaTiempo={() => setVistaActiva('timeline')}
            />
          )}

          {vistaActiva === 'timeline' && (
            <TimelinePage
              campanas={campanasMock}
              modoLectura={modoLectura}
              onRegistrarBreakGlass={handleRegistrarBreakGlass}
            />
          )}

          {vistaActiva === 'threat-intel' && (
            <ThreatIntelPage
              adversarios={adversariosMock}
              artefactos={artefactosMock}
              modoLectura={modoLectura}
              onExportarStix={handleExportarStix}
            />
          )}

          {vistaActiva === 'report-center' && (
            <ReportCenterPage
              secciones={seccionesF11Mock}
              registrosAuditoria={registrosAuditoria}
              modoLectura={modoLectura}
              onRegistrarEventoAuditoria={(tipo, det) =>
                agregarRegistroAuditoria(tipo, det)
              }
            />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-2.5 text-center text-[11px] text-slate-400">
          AegisHealth-CTI · Análisis local sobre datos sintéticos de práctica · Privacidad LOPDP protegida
        </footer>
      </div>
    </div>
  );
}

export default App;
