import {
    adversariosMock,
    artefactosMock,
    auditoriaInicialMock,
    campanasMock,
    escenariosIpeMock,
    evidenciaIngestaMock,
    seccionesF11Mock,
    serieHorariaMock,
} from '../mocks/mockData';
import type {
    CampanaId,
    PuntoHorario,
    RegistroAuditoria,
} from '../mocks/mockData';
import type { EstadoSaludApi } from '../components/HeaderConfianza';

export interface SourceSummaryItem {
    source: 'FIREWALL' | 'MEDSYS' | string;
    events: number;
    malformedIpEvents: number;
}

export interface MlVariantSummary {
    incidentsInTopN: string;
    topN: number;
    unconfirmedAnomalies: {
        firewallHourly: number;
        medsysHourly: number;
        medsysByPeriod: number;
    };
}

export interface DashboardSummaryResponse {
    totalEvents: number;
    malformedIpEvents: number;
    hoursCovered: number;
    bySource: SourceSummaryItem[];
    pseudonymizationRecorded: boolean;
    ml: {
        generic: MlVariantSummary;
        domain: MlVariantSummary;
    };
}

export interface HourlyHeatmapResponse {
    hours: string[];
    days: string[];
    matrix: number[][];
}

export interface CampaignMitreItem {
    id: string;
    name: string;
    tactic?: string;
}

export interface CampaignIndicators {
    sourceIps?: string[];
    destinationIps?: string[];
    actorTokens?: string[];
    accountTokens?: string[];
    [key: string]: unknown;
}

export interface CampaignRecord {
    campaignCode: string;
    title: string;
    adversaryType: string;
    severity: string;
    admiraltyRating?: string;
    anomalyScore: number | null;
    mitreTechniques: CampaignMitreItem[];
    iocs?: CampaignIndicators | string[];
    ioas?: string[];
    summary?: string;
}

export interface IpeScenarioBlock {
    label?: string;
    description: string;
    campaignCodes: string[];
}

export interface CampaignsApiResponse {
    campaigns: CampaignRecord[];
    ipeScenarios: {
        mostProbable: IpeScenarioBlock;
        mostDangerous: IpeScenarioBlock;
    };
}

export interface CampaignTimelineEvent {
    id?: string;
    timestamp: string;
    source: 'FIREWALL' | 'MEDSYS' | string;
    actorToken?: string;
    accountToken?: string;
    action?: string;
    detail?: string;
    clockSkewAdjusted?: boolean;
    [key: string]: unknown;
}

export interface CampaignTimelineResponse {
    campaignCode: string;
    clockSkewAdjusted?: boolean;
    events: CampaignTimelineEvent[];
}

// Ejemplo base pedido por backend para pruebas con mocks en desarrollo local
export const saludEjemploMock: EstadoSaludApi = {
    postgresReady: true,
    ollamaReady: false,
    zeroEgress: true,
    apiDisponible: true,
};

export const dashboardSummaryFallback: DashboardSummaryResponse = {
    totalEvents: 10023532,
    malformedIpEvents: 1280,
    hoursCovered: 744,
    bySource: [
        { source: 'FIREWALL', events: 5009031, malformedIpEvents: 493 },
        { source: 'MEDSYS', events: 5014501, malformedIpEvents: 787 },
    ],
    pseudonymizationRecorded: true,
    ml: {
        generic: {
            incidentsInTopN: '4/5',
            topN: 50,
            unconfirmedAnomalies: {
                firewallHourly: 47,
                medsysHourly: 47,
                medsysByPeriod: 47,
            },
        },
        domain: {
            incidentsInTopN: '5/5',
            topN: 50,
            unconfirmedAnomalies: {
                firewallHourly: 46,
                medsysHourly: 49,
                medsysByPeriod: 47,
            },
        },
    },
};

export const campaignsApiFallback: CampaignsApiResponse = {
    campaigns: [
        {
            campaignCode: 'CAMP-2026-001',
            title: 'Campana CAMP-2026-001',
            adversaryType: 'HYBRID',
            severity: 'CRITICA',
            admiraltyRating: 'B2',
            anomalyScore: null,
            mitreTechniques: [],
            iocs: {
                sourceIps: [],
                destinationIps: [],
                actorTokens: [],
                accountTokens: [],
            },
            ioas: [],
        },
    ],
    ipeScenarios: {
        mostProbable: {
            label: 'Mas probable',
            description: 'Escenario mas probable segun correlacion de eventos.',
            campaignCodes: ['CAMP-2026-005', 'CAMP-2026-001'],
        },
        mostDangerous: {
            label: 'Mas peligroso',
            description: 'Escenario mas peligroso por impacto operativo y datos.',
            campaignCodes: ['CAMP-2026-005', 'CAMP-2026-001'],
        },
    },
};

export function createDefaultHeatmap24x31(): HourlyHeatmapResponse {
    const hours = Array.from({ length: 24 }, (_, h) =>
        `${String(h).padStart(2, '0')}:00`
    );
    const days = Array.from({ length: 31 }, (_, d) =>
        `2026-10-${String(d + 1).padStart(2, '0')}`
    );
    const matrix = hours.map(() => days.map(() => 0));
    return { hours, days, matrix };
}

export function estaEnModoMock(): boolean {
    return import.meta.env.VITE_USE_MOCKS !== 'false';
}

async function fetchRelativoConFallback<T>(
    rutaRelativa: string,
    fallback: T,
    init?: RequestInit
): Promise<{ data: T; okRed: boolean }> {
    if (estaEnModoMock()) {
        return { data: fallback, okRed: true };
    }

    try {
        const respuesta = await fetch(rutaRelativa, {
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers || {}),
            },
            ...init,
        });

        if (!respuesta.ok) {
            return { data: fallback, okRed: false };
        }

        const json = (await respuesta.json()) as T;
        return { data: json, okRed: true };
    } catch {
        return { data: fallback, okRed: false };
    }
}

export async function obtenerEstadoSaludApi(): Promise<EstadoSaludApi> {
    if (estaEnModoMock()) {
        return saludEjemploMock;
    }

    const res = await fetchRelativoConFallback<{
        postgresReady?: boolean;
        ollamaReady?: boolean;
        zeroEgress?: boolean;
    }>('/api/v1/health', {});

    if (!res.okRed) {
        return {
            postgresReady: false,
            ollamaReady: false,
            zeroEgress: false,
            apiDisponible: false,
        };
    }

    return {
        postgresReady: Boolean(res.data.postgresReady),
        ollamaReady: Boolean(res.data.ollamaReady),
        zeroEgress: Boolean(res.data.zeroEgress),
        apiDisponible: true,
    };
}

export async function obtenerDashboardSummaryApi(): Promise<DashboardSummaryResponse> {
    const res = await fetchRelativoConFallback<Partial<DashboardSummaryResponse>>(
        '/api/v1/dashboard/summary',
        dashboardSummaryFallback
    );

    const raw = res.data;
    const bySource =
        Array.isArray(raw.bySource) && raw.bySource.length > 0
            ? raw.bySource
            : dashboardSummaryFallback.bySource;

    return {
        totalEvents:
            typeof raw.totalEvents === 'number'
                ? raw.totalEvents
                : dashboardSummaryFallback.totalEvents,
        malformedIpEvents:
            typeof raw.malformedIpEvents === 'number'
                ? raw.malformedIpEvents
                : dashboardSummaryFallback.malformedIpEvents,
        hoursCovered:
            typeof raw.hoursCovered === 'number'
                ? raw.hoursCovered
                : dashboardSummaryFallback.hoursCovered,
        bySource,
        pseudonymizationRecorded:
            typeof raw.pseudonymizationRecorded === 'boolean'
                ? raw.pseudonymizationRecorded
                : dashboardSummaryFallback.pseudonymizationRecorded,
        ml: {
            generic: raw.ml?.generic ?? dashboardSummaryFallback.ml.generic,
            domain: raw.ml?.domain ?? dashboardSummaryFallback.ml.domain,
        },
    };
}

export async function obtenerHourlyHeatmapApi(): Promise<HourlyHeatmapResponse> {
    const fallback = createDefaultHeatmap24x31();
    const res = await fetchRelativoConFallback<Partial<HourlyHeatmapResponse>>(
        '/api/v1/analytics/hourly-heatmap',
        fallback
    );

    const hours =
        Array.isArray(res.data.hours) && res.data.hours.length === 24
            ? res.data.hours
            : fallback.hours;
    const days =
        Array.isArray(res.data.days) && res.data.days.length === 31
            ? res.data.days
            : fallback.days;
    const matrix =
        Array.isArray(res.data.matrix) && res.data.matrix.length > 0
            ? res.data.matrix
            : fallback.matrix;

    return { hours, days, matrix };
}

export async function obtenerCampaignsApi(): Promise<CampaignsApiResponse> {
    const res = await fetchRelativoConFallback<Record<string, unknown>>(
        '/api/v1/campaigns',
        campaignsApiFallback as unknown as Record<string, unknown>
    );

    const raw = res.data;
    const rawCampaigns = Array.isArray(raw.campaigns)
        ? (raw.campaigns as Record<string, unknown>[])
        : campaignsApiFallback.campaigns;

    const campaigns: CampaignRecord[] = rawCampaigns.map((item, idx) => {
        const code =
            typeof item.campaignCode === 'string' && item.campaignCode.trim()
                ? item.campaignCode.trim()
                : `CAMP-2026-${String(idx + 1).padStart(3, '0')}`;

        const title =
            typeof item.title === 'string' && item.title.trim()
                ? item.title.trim()
                : code;

        const rawScore = item.anomalyScore;
        const anomalyScore =
            typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;

        const mitreRaw = Array.isArray(item.mitreTechniques)
            ? item.mitreTechniques
            : [];
        const mitreTechniques: CampaignMitreItem[] = mitreRaw.map((t, tIdx) => {
            if (typeof t === 'string') {
                return { id: t, name: t };
            }
            const obj = (t ?? {}) as Record<string, unknown>;
            return {
                id: typeof obj.id === 'string' ? obj.id : `T-${tIdx + 1}`,
                name: typeof obj.name === 'string' ? obj.name : 'Tecnica registrada',
                tactic: typeof obj.tactic === 'string' ? obj.tactic : undefined,
            };
        });

        const ioas = Array.isArray(item.ioas)
            ? item.ioas.map((x) => String(x))
            : [];

        return {
            campaignCode: code,
            title,
            adversaryType:
                typeof item.adversaryType === 'string' ? item.adversaryType : 'NO_ESPECIFICADO',
            severity: typeof item.severity === 'string' ? item.severity : 'MEDIA',
            admiraltyRating:
                typeof item.admiraltyRating === 'string' ? item.admiraltyRating : 'N/A',
            anomalyScore,
            mitreTechniques,
            iocs:
                (item.iocs as CampaignIndicators | string[] | undefined) ?? {
                    sourceIps: [],
                    destinationIps: [],
                    actorTokens: [],
                    accountTokens: [],
                },
            ioas,
            summary: typeof item.summary === 'string' ? item.summary : undefined,
        };
    });

    const rawIpe = (raw.ipeScenarios ?? {}) as Record<string, unknown>;
    const rawProbable = (rawIpe.mostProbable ??
        rawIpe.masProbable ??
        {}) as Record<string, unknown>;
    const rawDangerous = (rawIpe.mostDangerous ??
        rawIpe.masPeligroso ??
        {}) as Record<string, unknown>;

    const parseCodes = (val: unknown, fallbackCodes: string[]): string[] =>
        Array.isArray(val) ? val.map((c) => String(c)) : fallbackCodes;

    return {
        campaigns: campaigns.length > 0 ? campaigns : campaignsApiFallback.campaigns,
        ipeScenarios: {
            mostProbable: {
                label: 'Mas probable',
                description:
                    typeof rawProbable.description === 'string'
                        ? rawProbable.description
                        : typeof rawProbable.descripcion === 'string'
                            ? rawProbable.descripcion
                            : campaignsApiFallback.ipeScenarios.mostProbable.description,
                campaignCodes: parseCodes(
                    rawProbable.campaignCodes ?? rawProbable.campanas,
                    campaignsApiFallback.ipeScenarios.mostProbable.campaignCodes
                ),
            },
            mostDangerous: {
                label: 'Mas peligroso',
                description:
                    typeof rawDangerous.description === 'string'
                        ? rawDangerous.description
                        : typeof rawDangerous.descripcion === 'string'
                            ? rawDangerous.descripcion
                            : campaignsApiFallback.ipeScenarios.mostDangerous.description,
                campaignCodes: parseCodes(
                    rawDangerous.campaignCodes ?? rawDangerous.campanas,
                    campaignsApiFallback.ipeScenarios.mostDangerous.campaignCodes
                ),
            },
        },
    };
}

export async function obtenerTimelineCampanaApi(
    campaignCode: string
): Promise<{ data: CampaignTimelineResponse | null; notFound: boolean }> {
    const safeCode = encodeURIComponent(campaignCode.trim());
    const fallback: CampaignTimelineResponse = {
        campaignCode,
        clockSkewAdjusted: false,
        events: [],
    };

    if (estaEnModoMock()) {
        return { data: fallback, notFound: false };
    }

    try {
        const respuesta = await fetch(`/api/v1/campaigns/${safeCode}/timeline`, {
            headers: { Accept: 'application/json' },
        });

        if (respuesta.status === 404) {
            return { data: null, notFound: true };
        }

        if (!respuesta.ok) {
            return { data: fallback, notFound: false };
        }

        const json = (await respuesta.json()) as Partial<CampaignTimelineResponse>;
        return {
            data: {
                campaignCode:
                    typeof json.campaignCode === 'string'
                        ? json.campaignCode
                        : campaignCode,
                clockSkewAdjusted: Boolean(json.clockSkewAdjusted),
                events: Array.isArray(json.events)
                    ? (json.events as CampaignTimelineEvent[])
                    : [],
            },
            notFound: false,
        };
    } catch {
        return { data: fallback, notFound: false };
    }
}

export async function obtenerSerieHorariaApi(): Promise<PuntoHorario[]> {
    const res = await fetchRelativoConFallback(
        '/api/v1/analytics/hourly-heatmap',
        serieHorariaMock
    );
    return res.data;
}

export async function enviarRevelacionBreakGlassApi(payload: {
    analystId: string;
    reason: string;
    campanaId: CampanaId;
}): Promise<{ registrado: boolean }> {
    const res = await fetchRelativoConFallback(
        '/api/v1/audit/reveal',
        { registrado: true },
        {
            method: 'POST',
            body: JSON.stringify({
                analystId: payload.analystId,
                reason: payload.reason,
                campanaId: payload.campanaId,
            }),
        }
    );
    return res.data;
}

export async function regenerarSeccionLlmApi(
    seccionNumero = 8
): Promise<{ texto: string }> {
    const fallback = {
        texto:
            'Sintesis local actualizada (Ollama): La secuencia rapida de acceso interno a egreso en puerto 8443/tcp y los accesos fuera de ventana refuerzan priorizar segmentacion, alertas de anomalias y auditoria continua de cuentas tecnicas sobre datos sinteticos.',
    };

    const res = await fetchRelativoConFallback<{ texto?: string; conclusion?: string }>(
        '/api/v1/llm/regenerate-section',
        fallback,
        {
            method: 'POST',
            body: JSON.stringify({ section: seccionNumero }),
        }
    );

    return {
        texto: res.data.texto || res.data.conclusion || fallback.texto,
    };
}

export async function verificarCadenaAuditoriaApi(
    registros: RegistroAuditoria[]
): Promise<{ valida: boolean }> {
    const validaLocal = registros.every(
        (item, idx) => idx === 0 || item.hashPrevio === registros[idx - 1].hashActual
    );

    const res = await fetchRelativoConFallback<{ valid?: boolean; valida?: boolean }>(
        '/api/v1/audit/verify-chain',
        { valida: validaLocal }
    );

    if (typeof res.data.valid === 'boolean') {
        return { valida: res.data.valid };
    }
    if (typeof res.data.valida === 'boolean') {
        return { valida: res.data.valida };
    }
    return { valida: validaLocal };
}

export async function solicitarPdfReporteF11Api(
    resumenTexto: string
): Promise<Blob> {
    if (!estaEnModoMock()) {
        try {
            const resp = await fetch('/api/v1/reports/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format: 'F-11', summary: resumenTexto }),
            });
            if (resp.ok) {
                return await resp.blob();
            }
        } catch {
            // Caida segura a generacion local de respaldo
        }
    }

    return new Blob([resumenTexto], { type: 'application/pdf' });
}

export const endpointsPlanBackend = {
    health: '/api/v1/health',
    dashboardSummary: '/api/v1/dashboard/summary',
    hourlyHeatmap: '/api/v1/analytics/hourly-heatmap',
    campaigns: '/api/v1/campaigns',
    campaignTimeline: (code: string) => `/api/v1/campaigns/${code}/timeline`,
    auditReveal: '/api/v1/audit/reveal',
    exportSigma: '/api/v1/exports/sigma',
    exportStix: '/api/v1/exports/stix',
    generatePdf: '/api/v1/reports/generate-pdf',
    regenerateSection: '/api/v1/llm/regenerate-section',
    auditEvents: '/api/v1/audit/events',
    verifyChain: '/api/v1/audit/verify-chain',
};

export const recursosLocales = {
    evidenciaIngestaMock,
    escenariosIpeMock,
    campanasMock,
    adversariosMock,
    artefactosMock,
    seccionesF11Mock,
    auditoriaInicialMock,
};