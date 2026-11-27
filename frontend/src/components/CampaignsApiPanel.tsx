import { useEffect, useState } from 'react';
import {
    campaignsApiFallback,
    obtenerCampaignsApi,
    obtenerTimelineCampanaApi,
    type CampaignIndicators,
    type CampaignsApiResponse,
    type CampaignTimelineResponse,
} from '../services/apiClient';

interface CampaignsApiPanelProps {
    modoLectura?: 'simple' | 'tecnico';
}

function renderIocsList(iocs: CampaignIndicators | string[] | undefined) {
    if (!iocs) {
        return <p className="text-xs text-slate-400">Sin indicadores puntuales registrados.</p>;
    }

    if (Array.isArray(iocs)) {
        if (iocs.length === 0) {
            return <p className="text-xs text-slate-400">Sin indicadores puntuales registrados.</p>;
        }
        return (
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {iocs.map((item) => (
                    <span
                        key={item}
                        className="rounded-xs border border-slate-700 bg-[#0b0f17] px-2 py-0.5 text-slate-200"
                    >
                        {item}
                    </span>
                ))}
            </div>
        );
    }

    const groups: { label: string; values: string[] }[] = [
        { label: 'IPs de origen', values: Array.isArray(iocs.sourceIps) ? iocs.sourceIps : [] },
        { label: 'IPs de destino', values: Array.isArray(iocs.destinationIps) ? iocs.destinationIps : [] },
        { label: 'Actor tokens', values: Array.isArray(iocs.actorTokens) ? iocs.actorTokens : [] },
        { label: 'Account tokens', values: Array.isArray(iocs.accountTokens) ? iocs.accountTokens : [] },
    ];

    const hasAny = groups.some((g) => g.values.length > 0);
    if (!hasAny) {
        return <p className="text-xs text-slate-400">Sin indicadores puntuales registrados.</p>;
    }

    return (
        <div className="space-y-1.5 text-xs">
            {groups.map((g) => (
                <div key={g.label} className="flex flex-wrap gap-1.5">
                    <span className="text-slate-400">{g.label}:</span>
                    <span className="font-mono text-slate-200">
                        {g.values.length > 0 ? g.values.join(', ') : 'Sin registro'}
                    </span>
                </div>
            ))}
        </div>
    );
}

export const CampaignsApiPanel = ({
    modoLectura = 'tecnico',
}: CampaignsApiPanelProps) => {
    const [data, setData] = useState<CampaignsApiResponse>(campaignsApiFallback);
    const [selectedCode, setSelectedCode] = useState<string>('CAMP-2026-001');
    const [loading, setLoading] = useState<boolean>(true);
    const [campaignError, setCampaignError] = useState('');

    const [timeline, setTimeline] = useState<CampaignTimelineResponse | null>(null);
    const [timelineError, setTimelineError] = useState('');
    const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            const res = await obtenerCampaignsApi().catch((error: Error) => {
                if (active) setCampaignError(error.message);
                return null;
            });
            if (!active) return;
            setLoading(false);
            if (!res) return;
            setData(res);
            const hasDefault = res.campaigns.some(
                (c) => c.campaignCode === 'CAMP-2026-001'
            );
            if (hasDefault) {
                setSelectedCode('CAMP-2026-001');
            } else if (res.campaigns[0]) {
                setSelectedCode(res.campaigns[0].campaignCode);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    const currentCampaign =
        !loading && !campaignError
            ? data.campaigns.find((c) => c.campaignCode === selectedCode) ?? data.campaigns[0]
            : undefined;

    const activeCode = currentCampaign?.campaignCode;

    useEffect(() => {
        if (!activeCode) return;
        let active = true;

        const loadTimeline = async () => {
            setLoadingTimeline(true);
            setTimelineError('');
            const res = await obtenerTimelineCampanaApi(activeCode).catch((error: Error) => {
                if (active) setTimelineError(error.message);
                return null;
            });
            if (!active) return;
            setTimeline(res);
            setLoadingTimeline(false);
        };

        void loadTimeline();
        return () => {
            active = false;
        };
    }, [activeCode]);

    const findTitleByCode = (code: string) => {
        const match = data.campaigns.find(
            (c) =>
                c.campaignCode === code ||
                c.campaignCode.endsWith(`-${code}`) ||
                c.campaignCode.endsWith(code)
        );
        return match ? `${match.campaignCode} — ${match.title}` : code;
    };

    const jumpToCampaign = (code: string) => {
        const matched = data.campaigns.find(
            (c) =>
                c.campaignCode === code ||
                c.campaignCode.endsWith(`-${code}`) ||
                c.campaignCode.endsWith(code)
        );
        if (matched) {
            setSelectedCode(matched.campaignCode);
        }
    };

    const hasCampaignSkew = Boolean(timeline?.clockSkewAdjusted);
    const esTecnico = modoLectura === 'tecnico';

    if (loading || campaignError || !activeCode) {
        return <p role={campaignError ? 'alert' : 'status'}>{campaignError || (loading ? 'Cargando campañas…' : 'No hay campañas disponibles.')}</p>;
    }

    return (
        <section className="space-y-4 bg-[#0b0f17] text-slate-200">
            {/* Selector de campañas */}
            <div className="rounded-xs border border-slate-800 bg-[#111622] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-100">
                            Campañas detectadas ({data.campaigns.length})
                        </h2>
                        <p className="text-xs text-slate-400">
                            Seleccione una campaña para ver su resumen y secuencia de eventos.
                        </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                        {loading ? 'Cargando...' : activeCode}
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {data.campaigns.map((camp) => {
                        const active = camp.campaignCode === activeCode;
                        return (
                            <button
                                key={camp.campaignCode}
                                type="button"
                                onClick={() => setSelectedCode(camp.campaignCode)}
                                className={`rounded-xs border px-3 py-2 text-left text-xs transition-colors ${
                                    active
                                        ? 'border-slate-400 bg-[#151c2c] text-white'
                                        : 'border-slate-800 bg-[#0b0f17] text-slate-300 hover:border-slate-600'
                                }`}
                            >
                                <span className="block font-mono text-[11px] text-slate-400">
                                    {camp.campaignCode}
                                </span>
                                <span className="mt-0.5 block font-medium leading-snug">
                                    {camp.title}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tarjeta de campaña */}
            {currentCampaign && (
                <div className="rounded-xs border border-slate-800 bg-[#111622] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-100">
                                {currentCampaign.title}
                            </h3>
                            {currentCampaign.summary && (
                                <p className="mt-1 max-w-3xl text-xs text-slate-300">
                                    {currentCampaign.summary}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 font-mono text-xs">
                            <span className="rounded-xs border border-slate-700 bg-[#0b0f17] px-2.5 py-1 text-slate-200">
                                Severidad: {currentCampaign.severity}
                            </span>
                            {esTecnico && (
                                <span className="rounded-xs border border-slate-700 bg-[#0b0f17] px-2.5 py-1 text-slate-200">
                                    Admiralty: {currentCampaign.admiraltyRating ?? 'N/A'}
                                </span>
                            )}
                        </div>
                    </div>

                    {esTecnico && (
                        <>
                            <div className="mt-3 grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
                                <div className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <span className="block text-[11px] text-slate-400">
                                        adversaryType
                                    </span>
                                    <span className="mt-1 block font-semibold text-slate-100">
                                        {currentCampaign.adversaryType}
                                    </span>
                                </div>

                                <div className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <span className="block text-[11px] text-slate-400">
                                        anomalyScore
                                    </span>
                                    <span className="mt-1 block font-semibold tabular-nums text-amber-300">
                                        {currentCampaign.anomalyScore === null
                                            ? 'Sin puntaje disponible'
                                            : currentCampaign.anomalyScore}
                                    </span>
                                </div>

                                <div className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <span className="block text-[11px] text-slate-400">
                                        mitreTechniques
                                    </span>
                                    <span className="mt-1 block font-semibold tabular-nums text-slate-100">
                                        {currentCampaign.mitreTechniques.length} técnicas
                                    </span>
                                </div>
                            </div>

                            {currentCampaign.mitreTechniques.length > 0 && (
                                <div className="mt-3 rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <h4 className="font-mono text-xs font-semibold text-slate-300">
                                        Técnicas MITRE ATT&amp;CK
                                    </h4>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        {currentCampaign.mitreTechniques.map((tech, idx) => (
                                            <span
                                                key={`${tech.id}-${tech.name}-${idx}`}
                                                className="rounded-xs border border-slate-700 bg-[#151c2c] px-2.5 py-1 font-mono text-slate-200"
                                            >
                                                {tech.id} · {tech.name}
                                                {tech.tactic ? ` (${tech.tactic})` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <h4 className="font-mono text-xs font-semibold text-amber-300">
                                        IoC (Indicadores de compromiso)
                                    </h4>
                                    <div className="mt-2">{renderIocsList(currentCampaign.iocs)}</div>
                                </div>

                                <div className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                                    <h4 className="font-mono text-xs font-semibold text-slate-200">
                                        IoA (Indicadores de ataque)
                                    </h4>
                                    {!currentCampaign.ioas || currentCampaign.ioas.length === 0 ? (
                                        <p className="mt-2 font-mono text-xs text-slate-400">
                                            Sin IoA registrados.
                                        </p>
                                    ) : (
                                        <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-xs">
                                            {currentCampaign.ioas.map((ioa) => (
                                                <span
                                                    key={ioa}
                                                    className="rounded-xs border border-slate-700 bg-[#151c2c] px-2 py-0.5 text-slate-200"
                                                >
                                                    {ioa}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Línea de tiempo */}
            <div className="rounded-xs border border-slate-800 bg-[#111622] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-100">
                        Línea de tiempo · {activeCode}
                    </h3>
                    <div className="flex items-center gap-2">
                        {hasCampaignSkew && (
                            <span className="rounded-xs border border-amber-700/60 bg-amber-950/40 px-2.5 py-1 font-mono text-xs text-amber-300">
                                Ajuste de reloj +12 h
                            </span>
                        )}
                        <span className="font-mono text-[11px] tabular-nums text-slate-400">
                            {loadingTimeline
                                ? 'Consultando...'
                                : `${timeline?.events.length ?? 0} eventos`}
                        </span>
                    </div>
                </div>

                {timelineError ? (
                    <div role="alert" className="mt-3 rounded-xs border border-rose-900/70 bg-[#0b0f17] p-3 text-xs text-rose-300">
                        {timelineError}
                    </div>
                ) : (timeline?.events.length ?? 0) === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">
                        Sin eventos registrados para {activeCode}.
                    </p>
                ) : (
                    <ol className="mt-3 space-y-2">
                        {timeline?.events.map((ev, idx) => {
                            const isFirewall =
                                String(ev.source).toUpperCase().includes('FIREWALL') ||
                                String(ev.source).toUpperCase() === 'FW';
                            const showSkewBadge =
                                Boolean(ev.clockSkewAdjusted) || hasCampaignSkew;

                            return (
                                <li
                                    key={ev.id ?? `${ev.timestamp}-${idx}`}
                                    className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3 text-xs"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="tabular-nums text-slate-100">
                                                {ev.timestamp}
                                            </span>
                                            <span
                                                className={`rounded-xs border px-2 py-0.5 text-[11px] ${
                                                    isFirewall
                                                        ? 'border-slate-600 bg-[#151c2c] text-slate-200'
                                                        : 'border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
                                                }`}
                                            >
                                                {isFirewall ? 'FIREWALL' : 'MEDSYS'} ({ev.source})
                                            </span>
                                            {showSkewBadge && (
                                                <span className="rounded-xs border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[11px] text-amber-300">
                                                    Ajuste de reloj +12 h
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-500">#{idx + 1}</span>
                                    </div>

                                    {ev.summary && (
                                        <p className="mt-1.5 text-slate-300">
                                            {ev.summary}
                                        </p>
                                    )}

                                    <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-slate-400">
                                        <span>actorToken: {ev.actorToken ?? 'N/A'}</span>
                                        <span>accountToken: {ev.accountToken ?? 'N/A'}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>

            {/* Escenarios IPE */}
            <div className="rounded-xs border border-slate-800 bg-[#111622] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-100">
                        Escenarios de riesgo (IPE)
                    </h3>
                    <span className="rounded-xs border border-amber-700/60 bg-amber-950/40 px-2.5 py-1 font-mono text-xs text-amber-300">
                        Hipótesis: 005 → 001
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <article className="rounded-xs border border-slate-800 bg-[#0b0f17] p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                            Más probable
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-300">
                            {data.ipeScenarios.mostProbable.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {data.ipeScenarios.mostProbable.campaignCodes.map((code) => (
                                <button
                                    key={`prob-${code}`}
                                    type="button"
                                    onClick={() => jumpToCampaign(code)}
                                    className="rounded-xs border border-slate-700 bg-[#151c2c] px-2 py-0.5 font-mono text-[11px] text-slate-200 hover:border-slate-400"
                                >
                                    {findTitleByCode(code)}
                                </button>
                            ))}
                        </div>
                    </article>

                    <article className="rounded-xs border border-rose-900/70 bg-[#0b0f17] p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                            Más peligroso
                        </h4>
                        <p className="mt-1.5 text-xs text-slate-300">
                            {data.ipeScenarios.mostDangerous.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {data.ipeScenarios.mostDangerous.campaignCodes.map((code) => (
                                <button
                                    key={`dang-${code}`}
                                    type="button"
                                    onClick={() => jumpToCampaign(code)}
                                    className="rounded-xs border border-slate-700 bg-[#151c2c] px-2 py-0.5 font-mono text-[11px] text-slate-200 hover:border-slate-400"
                                >
                                    {findTitleByCode(code)}
                                </button>
                            ))}
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
};
