import { useEffect, useState } from 'react';
import { HourlyHeatmap24x31 } from '../components/HourlyHeatmap24x31';
import {
  obtenerCampaignsApi,
  type CampaignsApiResponse,
  obtenerDashboardSummaryApi,
  obtenerHourlyHeatmapApi,
  type DashboardSummaryResponse,
  type HourlyHeatmapResponse,
} from '../services/apiClient';

export interface DashboardPageProps {
  onIrAuditoria?: () => void;
  onVerLineaTiempo?: () => void;
}

const nombreCapa: Record<string, string> = {
  FIREWALL: 'FW Perimetral (Registros_conexiones_FW_10_2026)',
  MEDSYS: 'Sistema Médico (Registros_conexiones_sist_med_iess)',
};

export const DashboardPage = ({
  onIrAuditoria,
  onVerLineaTiempo,
}: DashboardPageProps = {}) => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HourlyHeatmapResponse | null>(null);
  const [escenarios, setEscenarios] = useState<CampaignsApiResponse['ipeScenarios'] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerDashboardSummaryApi(), obtenerHourlyHeatmapApi(), obtenerCampaignsApi()])
      .then(([resumen, mapa, campanas]) => {
        if (!vigente) return;
        setSummary(resumen);
        setHeatmap(mapa);
        setEscenarios(campanas.ipeScenarios);
      })
      .catch((fallo: Error) => {
        if (vigente) setError(fallo.message);
      });
    return () => { vigente = false; };
  }, []);

  if (!summary || !heatmap || !escenarios) {
    return <p className="inst-panel p-4" role={error ? 'alert' : 'status'}>{error || 'Cargando telemetría…'}</p>;
  }

  const { generic, domain } = summary.ml;
  const totalMalformedFromSources = summary.bySource.reduce(
    (acc, item) => acc + (item.malformedIpEvents || 0),
    0
  );
  const totalEventsFromSources = summary.bySource.reduce(
    (acc, item) => acc + (item.events || 0),
    0
  );

  return (
    <div className="space-y-5 text-[#073B2C]">
      {/* Cinta de evidencia criptográfica institucional */}
      <div className="inst-panel flex flex-col justify-between gap-4 border-l-4 border-l-[#0B5D46] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">
              FUENTES INTERNAS · POLARS STREAMING
            </span>
            <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-1 text-slate-600">
              Seudonimización: <strong>{summary.pseudonymizationRecorded === null ? 'Sin evidencia de ingesta' : summary.pseudonymizationRecorded ? 'Registrada' : 'Sin registrar'}</strong>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Cruce completo de <strong className="font-mono text-[#073B2C]">{summary.totalEvents.toLocaleString('es-EC')}</strong> registros en Parquet + PostgreSQL 16 (LOPDP Art. 25, 0 PII expuesta).
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {onVerLineaTiempo && (
            <button
              type="button"
              onClick={onVerLineaTiempo}
              className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#0B5D46] bg-white px-4 py-2 font-mono text-xs font-bold text-[#0B5D46] hover:bg-[#E3F2EC] sm:w-auto sm:text-sm"
            >
              Abrir Kill Chain (CAMP-001)
            </button>
          )}
          {onIrAuditoria && (
            <button
              type="button"
              onClick={onIrAuditoria}
              className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg bg-[#0B5D46] px-4 py-2 font-mono text-xs font-bold text-white shadow-xs hover:bg-[#063729] sm:w-auto sm:text-sm"
            >
              Reporte F-11 &amp; Hash-Chain
            </button>
          )}
        </div>
      </div>

      {/* 4 tarjetas KPI con tipografía amplia y legible */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="inst-panel-accent p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
            Eventos Correlacionados
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#063729] sm:text-4xl">
            {summary.totalEvents.toLocaleString('es-EC')}
          </p>
          <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs font-semibold text-[#0D6E52]">
            5,009,031 FW · 5,014,501 MedSys
          </p>
        </div>

        <div className="inst-panel border-t-4 border-t-amber-500 p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
            IPs Sin Puntos (^10\d&#123;9&#125;$)
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-700 sm:text-4xl">
            {summary.malformedIpEvents.toLocaleString('es-EC')}
          </p>
          <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
            493 FW · 787 MedSys (100% esp.)
          </p>
        </div>

        <div className="inst-panel border-t-4 border-t-[#108A65] p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
            Detección ML Sin Reglas
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#0D6E52] sm:text-4xl">
            {generic?.incidentsInTopN ?? '—'} <span className="text-lg text-slate-400">→</span> {domain?.incidentsInTopN ?? '—'}
          </p>
          <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
            IsolationForest Genérico vs Dominio
          </p>
        </div>

        <div className="inst-panel border-t-4 border-t-[#0B5D46] p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
            Cobertura UTC · Colisiones
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#0B5D46] sm:text-4xl">
            {summary.hoursCovered} h
          </p>
          <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
            31 días · 1 IP pública (186.46.219[.]18)
          </p>
        </div>
      </div>

      {/* Tabla exacta por fuente + Escenarios IPE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="inst-panel p-5 lg:col-span-6">
          <h2 className="border-b border-[#E6F1EC] pb-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
            Matriz de Ingesta, Trampas Forenses y ML Top-N
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs tabular-nums sm:text-sm">
              <thead>
                <tr className="border-b border-[#CDE2D7] bg-[#F4FAF7] text-xs text-slate-600">
                  <th className="px-3 py-2.5 text-left">CAPA</th>
                  <th className="px-3 py-2.5 text-right">FILAS</th>
                  <th className="px-3 py-2.5 text-right">IP SIN PUNTOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6F1EC]">
                {summary.bySource.map((row) => (
                  <tr key={row.source} className="hover:bg-[#F8FCFA]">
                    <td className="px-3 py-2.5 text-slate-700">{nombreCapa[row.source] ?? row.source}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#073B2C]">
                      {row.events.toLocaleString('es-EC')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-700">
                      {row.malformedIpEvents.toLocaleString('es-EC')}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[#CDE2D7] bg-[#E3F2EC] font-bold text-[#063729]">
                  <td className="px-3 py-2.5">TOTAL CONSOLIDADO</td>
                  <td className="px-3 py-2.5 text-right">{totalEventsFromSources.toLocaleString('es-EC')}</td>
                  <td className="px-3 py-2.5 text-right text-amber-800">{totalMalformedFromSources.toLocaleString('es-EC')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-[#CDE2D7] bg-[#F8FCFA] p-3">
              <span className="block text-[11px] font-bold text-slate-500">MODELO GENÉRICO</span>
              <span className="mt-0.5 block text-sm font-bold text-[#073B2C]">
                {generic ? `${generic.incidentsInTopN} (Top ${generic.topN})` : 'Sin métricas'}
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                {generic && `No conf.: FW ${generic.unconfirmedAnomalies.firewallHourly} / Med ${generic.unconfirmedAnomalies.medsysHourly}`}
              </span>
            </div>
            <div className="rounded-lg border border-[#0B5D46]/30 bg-[#E3F2EC] p-3">
              <span className="block text-[11px] font-bold text-[#063729]">MODELO DOMINIO</span>
              <span className="mt-0.5 block text-sm font-bold text-[#0B5D46]">
                {domain ? `${domain.incidentsInTopN} (Top ${domain.topN})` : 'Sin métricas'}
              </span>
              <span className="mt-1 block text-xs text-slate-700">
                {domain && `No conf.: FW ${domain.unconfirmedAnomalies.firewallHourly} / Med ${domain.unconfirmedAnomalies.medsysHourly}`}
              </span>
            </div>
          </div>
        </div>

        {/* 2 Escenarios Globales IPE */}
        <div className="inst-panel p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6F1EC] pb-2.5">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
              Evaluación Global IPE (2 Cursos de Acción)
            </h2>
            <span className="rounded-md bg-[#E3F2EC] px-2.5 py-1 font-mono text-xs font-bold text-[#063729]">
              ADMIRALTY A2–B3
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            <article className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-amber-900">ESCENARIO MÁS PROBABLE</span>
                <span className="rounded-md border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  {escenarios.mostProbable.campaignCodes.join(' · ')}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {escenarios.mostProbable.description}
              </p>
            </article>

            <article className="rounded-xl border border-rose-300 border-l-4 border-l-rose-600 bg-rose-50/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-rose-900">ESCENARIO MÁS PELIGROSO</span>
                <span className="rounded-md border border-rose-300 bg-white px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                  {escenarios.mostDangerous.campaignCodes.join(' · ')}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {escenarios.mostDangerous.description}
              </p>
            </article>
          </div>
        </div>
      </div>

      {/* Mapa de calor 24x31 */}
      <HourlyHeatmap24x31 heatmap={heatmap} />
    </div>
  );
};
