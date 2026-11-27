import { useEffect, useState } from 'react';
import { HourlyHeatmap24x31 } from '../components/HourlyHeatmap24x31';
import {
  describirError,
  obtenerCampaignsApi,
  obtenerDashboardSummaryApi,
  obtenerHourlyHeatmapApi,
  type DashboardSummaryResponse,
  type HourlyHeatmapResponse,
  type IpeScenario,
  type MlVariantSummary,
} from '../services/apiClient';

export interface DashboardPageProps {
  onIrAuditoria?: () => void;
  onVerLineaTiempo?: () => void;
}

const nombreCapa: Record<string, string> = {
  FIREWALL: 'FW Perimetral (Registros_conexiones_FW_10_2026)',
  MEDSYS: 'Sistema Médico (Registros_conexiones_sist_med_iess)',
};

const fmt = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString('es-EC') : 'Sin dato';

const BloqueError = ({ titulo, error }: { titulo: string; error: string }) => (
  <div className="inst-panel border-l-4 border-l-rose-600 p-4 font-mono text-xs text-rose-800">
    <strong>{titulo}:</strong> {error}
  </div>
);

const TarjetaMl = ({
  etiqueta,
  ml,
  destacado,
}: {
  etiqueta: string;
  ml: MlVariantSummary | null;
  destacado?: boolean;
}) => (
  <div
    className={`rounded-lg border p-3 ${
      destacado ? 'border-[#0B5D46]/30 bg-[#E3F2EC]' : 'border-[#CDE2D7] bg-[#F8FCFA]'
    }`}
  >
    <span className="block text-[11px] font-bold text-slate-500">{etiqueta}</span>
    {ml ? (
      <>
        <span className="mt-0.5 block text-sm font-bold text-[#073B2C]">
          {ml.incidentsInTopN} (Top {ml.topN})
        </span>
        <span className="mt-1 block text-xs text-slate-600">
          No conf.: FW {ml.unconfirmedAnomalies.firewallHourly} / Med h{' '}
          {ml.unconfirmedAnomalies.medsysHourly} / Med per. {ml.unconfirmedAnomalies.medsysByPeriod}
        </span>
      </>
    ) : (
      <span className="mt-0.5 block text-sm font-bold text-slate-500">Sin dato</span>
    )}
  </div>
);

export const DashboardPage = ({ onIrAuditoria, onVerLineaTiempo }: DashboardPageProps = {}) => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HourlyHeatmapResponse | null>(null);
  const [escenarios, setEscenarios] = useState<IpeScenario[]>([]);
  const [errores, setErrores] = useState<{ summary?: string; heatmap?: string; ipe?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Se cargan en paralelo; si una falla, los demás bloques siguen visibles.
      const [s, h, c] = await Promise.allSettled([
        obtenerDashboardSummaryApi(),
        obtenerHourlyHeatmapApi(),
        obtenerCampaignsApi(),
      ]);
      if (!active) return;
      const err: typeof errores = {};
      if (s.status === 'fulfilled') setSummary(s.value);
      else err.summary = describirError(s.reason);
      if (h.status === 'fulfilled') setHeatmap(h.value);
      else err.heatmap = describirError(h.reason);
      if (c.status === 'fulfilled') setEscenarios(c.value.ipeScenarios);
      else err.ipe = describirError(c.reason);
      setErrores(err);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const fuente = (src: string) => summary?.bySource.find((b) => b.source === src);
  const fw = fuente('FIREWALL');
  const med = fuente('MEDSYS');
  const totalMalformedFromSources = summary?.bySource.reduce((a, i) => a + (i.malformedIpEvents || 0), 0) ?? 0;
  const totalEventsFromSources = summary?.bySource.reduce((a, i) => a + (i.events || 0), 0) ?? 0;

  const seudonimizacion =
    summary?.pseudonymizationRecorded === true
      ? 'Seudonimización registrada en ingesta'
      : summary?.pseudonymizationRecorded === false
        ? 'Seudonimización NO registrada'
        : 'Sin evidencia de ingesta';

  return (
    <div className="space-y-5 text-[#073B2C]">
      {/* Cinta de evidencia */}
      <div className="inst-panel flex flex-col justify-between gap-4 border-l-4 border-l-[#0B5D46] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">
              FUENTES INTERNAS · POLARS STREAMING
            </span>
            <span
              className={`rounded-md border px-2.5 py-1 font-bold ${
                summary?.pseudonymizationRecorded === true
                  ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {loading ? '...' : seudonimizacion}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Cruce completo de{' '}
            <strong className="font-mono text-[#073B2C]">{loading ? '...' : fmt(summary?.totalEvents)}</strong>{' '}
            registros en Parquet + PostgreSQL 16 (LOPDP Art. 25).
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {onVerLineaTiempo && (
            <button
              type="button"
              onClick={onVerLineaTiempo}
              className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#0B5D46] bg-white px-4 py-2 font-mono text-xs font-bold text-[#0B5D46] hover:bg-[#E3F2EC] sm:w-auto sm:text-sm"
            >
              Abrir Kill Chain
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

      {errores.summary && <BloqueError titulo="Resumen del panel" error={errores.summary} />}

      {/* Tarjetas KPI */}
      {(loading || summary) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="inst-panel-accent p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              Eventos Correlacionados
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#063729] sm:text-4xl">
              {loading ? '...' : fmt(summary?.totalEvents)}
            </p>
            <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs font-semibold text-[#0D6E52]">
              {fmt(fw?.events)} FW · {fmt(med?.events)} MedSys
            </p>
          </div>

          <div className="inst-panel border-t-4 border-t-amber-500 p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              IPs Sin Puntos (^10\d&#123;9&#125;$)
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-700 sm:text-4xl">
              {loading ? '...' : fmt(summary?.malformedIpEvents)}
            </p>
            <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
              {fmt(fw?.malformedIpEvents)} FW · {fmt(med?.malformedIpEvents)} MedSys
            </p>
          </div>

          <div className="inst-panel border-t-4 border-t-[#108A65] p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              Detección ML Sin Reglas
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#0D6E52] sm:text-4xl">
              {loading ? '...' : summary?.ml.generic?.incidentsInTopN ?? 'Sin dato'}{' '}
              <span className="text-lg text-slate-400">→</span>{' '}
              {loading ? '...' : summary?.ml.domain?.incidentsInTopN ?? 'Sin dato'}
            </p>
            <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
              IsolationForest Genérico vs Dominio
            </p>
          </div>

          <div className="inst-panel border-t-4 border-t-[#0B5D46] p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
              Cobertura UTC
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#0B5D46] sm:text-4xl">
              {loading ? '...' : `${fmt(summary?.hoursCovered)}h`}
            </p>
            <p className="mt-3 border-t border-[#E6F1EC] pt-2.5 font-mono text-xs text-slate-600">
              Horas con eventos en el periodo analizado
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Tabla por fuente + ML */}
        {summary && (
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
                      <td className="px-3 py-2.5 text-right font-semibold text-[#073B2C]">{fmt(row.events)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-700">
                        {fmt(row.malformedIpEvents)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#CDE2D7] bg-[#E3F2EC] font-bold text-[#063729]">
                    <td className="px-3 py-2.5">TOTAL CONSOLIDADO</td>
                    <td className="px-3 py-2.5 text-right">{fmt(totalEventsFromSources)}</td>
                    <td className="px-3 py-2.5 text-right text-amber-800">{fmt(totalMalformedFromSources)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
              <TarjetaMl etiqueta="MODELO GENÉRICO" ml={summary.ml.generic} />
              <TarjetaMl etiqueta="MODELO DOMINIO" ml={summary.ml.domain} destacado />
            </div>
          </div>
        )}

        {/* Escenarios IPE desde /api/v1/campaigns */}
        <div className={`inst-panel p-5 ${summary ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6F1EC] pb-2.5">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
              Evaluación Global IPE
            </h2>
          </div>

          {errores.ipe ? (
            <p className="mt-4 font-mono text-xs text-rose-800">Escenarios IPE: {errores.ipe}</p>
          ) : loading ? (
            <p className="mt-4 font-mono text-xs text-slate-500">Cargando escenarios...</p>
          ) : escenarios.length === 0 ? (
            <p className="mt-4 font-mono text-xs text-slate-500">Sin escenarios registrados.</p>
          ) : (
            <div className="mt-4 space-y-3.5">
              {escenarios.map((esc, i) => {
                const peligroso = /PELIGRO|DANGER/i.test(esc.code) || i === 1;
                return (
                  <article
                    key={esc.code || i}
                    className={`rounded-xl border border-l-4 p-4 ${
                      peligroso
                        ? 'border-rose-300 border-l-rose-600 bg-rose-50/75'
                        : 'border-amber-300 border-l-amber-500 bg-amber-50/75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                      <span className={`font-bold ${peligroso ? 'text-rose-900' : 'text-amber-900'}`}>
                        {esc.name.toUpperCase()}
                      </span>
                      <span className="rounded-md border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {esc.campaignCodes.join(' + ') || 'Sin campañas'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{esc.description}</p>
                    {esc.hypothesis && (
                      <p className="mt-1.5 text-xs italic leading-relaxed text-slate-600">
                        Hipótesis: {esc.hypothesis}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mapa de calor */}
      {errores.heatmap ? (
        <BloqueError titulo="Mapa de calor" error={errores.heatmap} />
      ) : (
        <HourlyHeatmap24x31
          heatmap={heatmap ?? { hours: [], days: [], matrix: [] }}
          loading={loading || !heatmap}
        />
      )}
    </div>
  );
};
