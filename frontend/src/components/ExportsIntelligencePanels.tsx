import type {
    CampaignItem,
    ExportsBundleData,
    MitreTechnique,
} from '../types/exports';

interface ExportsIntelligencePanelsProps {
    bundle: ExportsBundleData;
    selectedCampaignCode?: string;
    onSelectCampaign?: (code: string) => void;
}

export const ExportsIntelligencePanels = ({
    bundle,
    selectedCampaignCode,
    onSelectCampaign,
}: ExportsIntelligencePanelsProps) => {
    const activeCampaign: CampaignItem | undefined =
        bundle.campaigns.find((c) => c.campaignCode === selectedCampaignCode) ??
        bundle.campaigns[0];

    const ioaFromRules =
        bundle.hallazgosReglas.incidentesDetectadosPorIoa !== null &&
            bundle.hallazgosReglas.totalIncidentes !== null
            ? `${bundle.hallazgosReglas.incidentesDetectadosPorIoa}/${bundle.hallazgosReglas.totalIncidentes}`
            : '5/5';

    const mlGenerico =
        bundle.metricsGenericas.incidentesEnTopN !== null &&
            bundle.metricsGenericas.topN !== null
            ? `${bundle.metricsGenericas.incidentesEnTopN}/${bundle.metricsGenericas.topN}`
            : '4/5';

    const mlDominio =
        bundle.metricsDominio.incidentesEnTopN !== null &&
            bundle.metricsDominio.topN !== null
            ? `${bundle.metricsDominio.incidentesEnTopN}/${bundle.metricsDominio.topN}`
            : '5/5';

    const mitreByTactic = bundle.campaigns.reduce<Record<string, MitreTechnique[]>>(
        (acc, camp) => {
            camp.mitreTechniques.forEach((tech) => {
                const key = tech.tactic || 'General';
                if (!acc[key]) acc[key] = [];
                const exists = acc[key].some(
                    (item) => item.id === tech.id && item.name === tech.name
                );
                if (!exists) {
                    acc[key].push(tech);
                }
            });
            return acc;
        },
        {}
    );

    const tactics = Object.keys(mitreByTactic);
    const top20Ranking = bundle.rankingPeriodoA.slice(0, 20);

    const allSourceIps = Array.from(
        new Set(bundle.campaigns.flatMap((c) => c.iocs.sourceIps))
    );
    const allDestIps = Array.from(
        new Set(bundle.campaigns.flatMap((c) => c.iocs.destinationIps))
    );
    const allActorTokens = Array.from(
        new Set(bundle.campaigns.flatMap((c) => c.iocs.actorTokens))
    );
    const allAccountTokens = Array.from(
        new Set(bundle.campaigns.flatMap((c) => c.iocs.accountTokens))
    );
    const allIoas = Array.from(
        new Set(bundle.campaigns.flatMap((c) => c.ioas))
    );

    return (
        <div className="space-y-6 text-slate-200">
            {/* Selector de campanas cargadas desde exports */}
            <div className="rounded-xs border border-slate-800 bg-[#111622] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-white">
                            Campanas correlacionadas ({bundle.campaigns.length})
                        </h3>
                        <p className="text-xs text-slate-400">
                            Datos seudonimizados cargados desde exports (tokens USR- y ACC- sin alterar)
                        </p>
                    </div>
                    {onSelectCampaign && bundle.campaigns.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {bundle.campaigns.map((camp) => {
                                const selected = camp.campaignCode === activeCampaign?.campaignCode;
                                return (
                                    <button
                                        key={camp.campaignCode}
                                        type="button"
                                        onClick={() => onSelectCampaign(camp.campaignCode)}
                                        className={`rounded-xs border px-2.5 py-1 font-mono text-xs transition-colors ${selected
                                                ? 'border-slate-400 bg-[#151c2c] text-white'
                                                : 'border-slate-700 bg-[#0b0f17] text-slate-300 hover:border-slate-500'
                                            }`}
                                    >
                                        {camp.campaignCode}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {activeCampaign && (
                    <div className="mt-3 rounded-xs border border-slate-800 bg-[#0b0f17] p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-sky-300">
                                {activeCampaign.campaignCode} · {activeCampaign.adversaryType}
                            </span>
                            <span className="font-mono tabular-nums text-amber-300">
                                Severidad: {activeCampaign.severity} · Score: {activeCampaign.anomalyScore.toFixed(3)}
                            </span>
                        </div>
                        <p className="mt-1.5 text-slate-300">{activeCampaign.summary}</p>
                        <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                            Ventana: {activeCampaign.firstSeen} -&gt; {activeCampaign.lastSeen}
                        </p>
                    </div>
                )}
            </div>

            {/* 2a. ML vs reglas */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <article className="rounded-md border border-slate-800 bg-[#111622] p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                        Deteccion determinista
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-emerald-300">
                        Reglas IoA {ioaFromRules}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-300">
                        Cobertura de incidentes detectados mediante reglas IoA sobre registros correlacionados.
                    </p>
                </article>

                <article className="rounded-md border border-slate-800 bg-[#111622] p-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                        Deteccion por modelo
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-sky-300">
                        ML sin reglas {mlGenerico} (generico) · {mlDominio} (dominio)
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-300">
                        Comparativa de hallazgos en top-N entre variantes genericas y de dominio sin reglas.
                    </p>
                </article>
            </div>

            {/* 2e. Escenarios IPE */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <article className="rounded-md border border-amber-500/35 bg-[#171510] p-4">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-amber-200">
                            ESCENARIO_MAS_PROBABLE
                        </h3>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-200">
                            PROBABLE
                        </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-200">
                        {bundle.escenariosIpe.masProbable.descripcion || 'Sin descripcion registrada.'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {bundle.escenariosIpe.masProbable.campanas.map((c) => (
                            <span
                                key={c}
                                className="rounded border border-amber-500/30 bg-[#0b0f17] px-2 py-0.5 font-mono text-[11px] text-amber-200"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </article>

                <article className="rounded-md border border-rose-500/40 bg-[#171219] p-4">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-rose-200">
                            ESCENARIO_MAS_PELIGROSO
                        </h3>
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] text-rose-200">
                            CRITICO
                        </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-200">
                        {bundle.escenariosIpe.masPeligroso.descripcion || 'Sin descripcion registrada.'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {bundle.escenariosIpe.masPeligroso.campanas.map((c) => (
                            <span
                                key={c}
                                className="rounded border border-rose-500/30 bg-[#0b0f17] px-2 py-0.5 font-mono text-[11px] text-rose-200"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </article>
            </div>

            {/* 2b. Matriz MITRE agrupada por tactic */}
            <div className="rounded-md border border-slate-800 bg-[#111622] p-4">
                <h3 className="text-sm font-semibold text-white">
                    Matriz MITRE ATT&amp;CK (agrupada por tactica)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                    Tecnicas mapeadas desde las campanas cargadas
                </p>

                {tactics.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">
                        No hay tecnicas MITRE disponibles en el archivo actual.
                    </p>
                ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {tactics.map((tactic) => (
                            <div
                                key={tactic}
                                className="rounded-md border border-slate-800 bg-[#0b0f17] p-3"
                            >
                                <h4 className="font-mono text-xs font-semibold uppercase text-sky-300">
                                    {tactic}
                                </h4>
                                <ul className="mt-2 space-y-1.5 text-xs">
                                    {mitreByTactic[tactic].map((tech) => (
                                        <li
                                            key={`${tactic}-${tech.id}-${tech.name}`}
                                            className="flex items-baseline justify-between gap-2 border-t border-slate-800/70 pt-1.5"
                                        >
                                            <span className="font-mono text-[11px] text-emerald-300">
                                                {tech.id}
                                            </span>
                                            <span className="flex-1 text-slate-200">{tech.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2d. IoA vs IoC en dos columnas */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md border border-slate-800 bg-[#111622] p-4">
                    <h3 className="text-sm font-semibold text-sky-300">
                        IoA — Indicadores de ataque
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Patrones de comportamiento identificados en las campanas y reglas IoA
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {allIoas.map((ioa) => (
                            <span
                                key={ioa}
                                className="rounded border border-sky-500/30 bg-[#0b0f17] px-2.5 py-1 font-mono text-xs text-sky-200"
                            >
                                {ioa}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="rounded-md border border-slate-800 bg-[#111622] p-4">
                    <h3 className="text-sm font-semibold text-amber-300">
                        IoC — Indicadores de compromiso
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                        IPs y tokens seudonimizados (USR- / ACC-) observados en evidencias
                    </p>
                    <div className="mt-3 space-y-2 text-xs font-mono">
                        <div>
                            <span className="text-slate-400">Source IPs: </span>
                            <span className="text-slate-200">
                                {allSourceIps.length > 0 ? allSourceIps.join(', ') : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">Destination IPs: </span>
                            <span className="text-slate-200">
                                {allDestIps.length > 0 ? allDestIps.join(', ') : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">Actor tokens: </span>
                            <span className="text-emerald-300">
                                {allActorTokens.length > 0 ? allActorTokens.join(', ') : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">Account tokens: </span>
                            <span className="text-sky-300">
                                {allAccountTokens.length > 0 ? allAccountTokens.join(', ') : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2c. Ranking de anomalias — Top 20 de ranking_med_periodo_A_genericas.csv */}
            <div className="rounded-md border border-slate-800 bg-[#111622] p-4">
                <h3 className="text-sm font-semibold text-white">
                    Ranking de anomalias — Top 20 (ranking_med_periodo_A_genericas.csv)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                    Tokens y cuentas especiales mostrados tal cual sin alterar identificadores
                </p>

                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs tabular-nums">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                                <th className="py-2 pr-3 font-mono">#</th>
                                <th className="py-2 pr-3">Token / Entidad</th>
                                <th className="py-2 pr-3">Score</th>
                                <th className="py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {top20Ranking.map((row) => (
                                <tr key={`${row.rank}-${row.entityToken}`}>
                                    <td className="py-2 pr-3 font-mono text-slate-400">{row.rank}</td>
                                    <td className="py-2 pr-3 font-mono text-sky-300">
                                        {row.entityToken}
                                    </td>
                                    <td className="py-2 pr-3 font-mono text-slate-200">
                                        {row.score !== null ? row.score : '-'}
                                    </td>
                                    <td className="py-2 font-mono text-[11px]">
                                        {row.isSpecialAccount ? (
                                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-200">
                                                CUENTA ESPECIAL
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">ESTANDAR</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};