import { useEffect, useState } from 'react';
import { HourlyHeatmap24x31 } from '../components/HourlyHeatmap24x31';
import {
    createDefaultHeatmap24x31,
    dashboardSummaryFallback,
    obtenerDashboardSummaryApi,
    obtenerHourlyHeatmapApi,
    type DashboardSummaryResponse,
    type HourlyHeatmapResponse,
} from '../services/apiClient';

export interface DashboardPageProps {
    evidencia?: unknown;
    serieHoraria?: unknown;
    escenarios?: unknown;
    modoLectura?: 'simple' | 'tecnico';
    onIrAuditoria?: () => void;
    onVerLineaTiempo?: () => void;
}

const nombreSistemaLegible: Record<string, string> = {
    FIREWALL: 'Perímetro de red (FIREWALL)',
    MEDSYS: 'Sistema clínico (MEDSYS)',
};

export const DashboardPage = ({
    modoLectura = 'simple',
    onIrAuditoria,
    onVerLineaTiempo,
}: DashboardPageProps = {}) => {
    const [summary, setSummary] = useState<DashboardSummaryResponse>(
        dashboardSummaryFallback
    );
    const [heatmap, setHeatmap] = useState<HourlyHeatmapResponse>(() =>
        createDefaultHeatmap24x31()
    );
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let active = true;
        const loadData = async () => {
            setLoading(true);
            const [summaryRes, heatmapRes] = await Promise.all([
                obtenerDashboardSummaryApi(),
                obtenerHourlyHeatmapApi(),
            ]);
            if (!active) return;
            setSummary(summaryRes);
            setHeatmap(heatmapRes);
            setLoading(false);
        };
        void loadData();
        return () => {
            active = false;
        };
    }, []);

    const totalMalformedFromSources = summary.bySource.reduce(
        (acc, item) => acc + (item.malformedIpEvents || 0),
        0
    );
    const totalEventsFromSources = summary.bySource.reduce(
        (acc, item) => acc + (item.events || 0),
        0
    );

    const esTecnico = modoLectura === 'tecnico';

    return (
        <div className="space-y-5 text-slate-900">
            {/* Bloque de estado general */}
            <div className="rounded-sm border border-slate-200 border-l-4 border-l-teal-600 bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-lg font-bold text-slate-900">
                            Estado general del monitoreo
                        </h1>
                        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                            Se revisaron{' '}
                            <span className="font-mono font-bold tabular-nums text-slate-900">
                                {summary.totalEvents.toLocaleString('es-EC')}
                            </span>{' '}
                            eventos de red y sistema clínico durante 31 días. Se detectaron{' '}
                            <span className="font-mono font-bold tabular-nums text-amber-700">
                                {summary.malformedIpEvents.toLocaleString('es-EC')}
                            </span>{' '}
                            conexiones atípicas en cuentas técnicas y la privacidad LOPDP se mantiene activa.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {onVerLineaTiempo && (
                            <button
                                type="button"
                                onClick={onVerLineaTiempo}
                                className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-400 hover:bg-slate-50"
                            >
                                Ver campañas
                            </button>
                        )}
                        {onIrAuditoria && (
                            <button
                                type="button"
                                onClick={onIrAuditoria}
                                className="rounded-sm border border-teal-600 bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-xs transition-colors hover:bg-teal-700"
                            >
                                Abrir Reporte F-11
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 4 KPI cards con barra de acento lateral */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-teal-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Eventos revisados</p>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                        {loading ? '...' : summary.totalEvents.toLocaleString('es-EC')}
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        Red perimetral y sistema médico.
                    </p>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-amber-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Anomalías IP sin puntos</p>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
                        {loading ? '...' : summary.malformedIpEvents.toLocaleString('es-EC')}
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        Registros inusuales en cuentas técnicas.
                    </p>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-teal-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Cobertura de análisis</p>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                        {loading ? '...' : `${summary.hoursCovered} h`}
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        31 días continuos en horario UTC.
                    </p>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-teal-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Privacidad LOPDP</p>
                    <p
                        className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                            summary.pseudonymizationRecorded ? 'text-teal-600' : 'text-amber-600'
                        }`}
                    >
                        {summary.pseudonymizationRecorded ? 'ACTIVA' : 'PENDIENTE'}
                    </p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        Identidades protegidas (USR- / ACC-).
                    </p>
                </div>
            </div>

            {/* Bloques secundarios */}
            {!esTecnico ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="text-sm font-bold text-slate-800">
                            Sistemas incluidos en la revisión
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Se cruzaron registros del perímetro externo (5.01M eventos) y del sistema clínico (5.01M eventos) para detectar saltos entre redes.
                        </p>
                    </div>
                    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="text-sm font-bold text-slate-800">
                            Eficacia de detección automática
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            El análisis especializado identificó{' '}
                            <strong className="font-mono text-teal-700">
                                {summary.ml.domain.incidentsInTopN}
                            </strong>{' '}
                            incidentes prioritarios sin depender de reglas manuales previas.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">
                            Desglose por fuente
                        </h2>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs tabular-nums">
                                <thead>
                                    <tr className="border-b border-slate-200 font-mono text-[11px] text-slate-500">
                                        <th className="py-1.5 pr-3">Fuente</th>
                                        <th className="py-1.5 pr-3 text-right">Eventos</th>
                                        <th className="py-1.5 text-right">IP sin puntos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                    {summary.bySource.map((row) => (
                                        <tr key={row.source} className="hover:bg-slate-50">
                                            <td className="py-2 pr-3 font-semibold text-slate-700">
                                                {nombreSistemaLegible[row.source] ?? row.source}
                                            </td>
                                            <td className="py-2 pr-3 text-right text-slate-600">
                                                {row.events.toLocaleString('es-EC')}
                                            </td>
                                            <td className="py-2 text-right text-amber-700 font-bold">
                                                {row.malformedIpEvents.toLocaleString('es-EC')}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-slate-300 bg-slate-50 font-bold text-slate-900">
                                        <td className="py-2 pr-3">TOTAL</td>
                                        <td className="py-2 pr-3 text-right">
                                            {totalEventsFromSources.toLocaleString('es-EC')}
                                        </td>
                                        <td className="py-2 text-right text-amber-700">
                                            {totalMalformedFromSources.toLocaleString('es-EC')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                        <h2 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">
                            Resultados de detección ML (Top-N)
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xs border border-slate-200 bg-slate-50 p-3 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-mono">
                                    <span className="font-bold text-slate-600">GENERIC</span>
                                    <span className="font-bold tabular-nums text-slate-800">
                                        {summary.ml.generic.incidentsInTopN} (Top {summary.ml.generic.topN})
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 font-mono text-[11px] tabular-nums text-slate-500">
                                    <div className="flex justify-between">
                                        <span>firewallHourly</span>
                                        <span className="text-slate-700">{summary.ml.generic.unconfirmedAnomalies.firewallHourly}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>medsysHourly</span>
                                        <span className="text-slate-700">{summary.ml.generic.unconfirmedAnomalies.medsysHourly}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>medsysByPeriod</span>
                                        <span className="text-slate-700">{summary.ml.generic.unconfirmedAnomalies.medsysByPeriod}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xs border border-teal-100 bg-teal-50 p-3 text-xs">
                                <div className="flex items-center justify-between border-b border-teal-200 pb-1.5 font-mono">
                                    <span className="font-bold text-teal-700">DOMAIN</span>
                                    <span className="font-bold tabular-nums text-teal-800">
                                        {summary.ml.domain.incidentsInTopN} (Top {summary.ml.domain.topN})
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 font-mono text-[11px] tabular-nums text-slate-500">
                                    <div className="flex justify-between">
                                        <span>firewallHourly</span>
                                        <span className="text-slate-700">{summary.ml.domain.unconfirmedAnomalies.firewallHourly}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>medsysHourly</span>
                                        <span className="text-slate-700">{summary.ml.domain.unconfirmedAnomalies.medsysHourly}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>medsysByPeriod</span>
                                        <span className="text-slate-700">{summary.ml.domain.unconfirmedAnomalies.medsysByPeriod}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mapa de calor 24x31 */}
            <HourlyHeatmap24x31 heatmap={heatmap} loading={loading} modoLectura={modoLectura} />
        </div>
    );
};
