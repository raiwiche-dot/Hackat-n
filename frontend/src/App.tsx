import { useEffect, useState } from 'react';
import { HeaderConfianza } from './components/HeaderConfianza';
import type { EstadoSaludApi, VistaActiva } from './components/HeaderConfianza';
import {
  adversariosMock,
  artefactosMock,
  auditoriaInicialMock,
  campanasMock,
  escenariosIpeMock,
  evidenciaIngestaMock,
  seccionesF11Mock,
  serieHorariaMock,
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

export function App() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('dashboard');
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

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8fb] text-slate-800">
      <HeaderConfianza
        estado={estadoSalud}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        usandoMocks={usandoMocks}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {vistaActiva === 'dashboard' && (
          <DashboardPage
            evidencia={evidenciaIngestaMock}
            serieHoraria={serieHorariaMock}
            escenarios={escenariosIpeMock}
            onIrAuditoria={() => setVistaActiva('report-center')}
          />
        )}

        {vistaActiva === 'timeline' && (
          <TimelinePage
            campanas={campanasMock}
            onRegistrarBreakGlass={handleRegistrarBreakGlass}
          />
        )}

        {vistaActiva === 'threat-intel' && (
          <ThreatIntelPage
            adversarios={adversariosMock}
            artefactos={artefactosMock}
            onExportarStix={handleExportarStix}
          />
        )}

        {vistaActiva === 'report-center' && (
          <ReportCenterPage
            secciones={seccionesF11Mock}
            registrosAuditoria={registrosAuditoria}
            onRegistrarEventoAuditoria={(tipo, det) =>
              agregarRegistroAuditoria(tipo, det)
            }
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
        AegisHealth-CTI · Procesamiento local sobre datos sintéticos de práctica · Cumplimiento LOPDP y cero conexión con sistemas reales.
      </footer>
    </div>
  );
}

export default App;
