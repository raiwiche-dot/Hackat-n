import {
  auditoriaInicialMock,
  campanasMock,
  evidenciaIngestaMock,
  generarMatrizHeatmapRealistaMock,
  seccionesF11Mock,
  resumenEjecutivoMedicoMock,
} from '../mocks/mockData';
import type { CampanaId, RegistroAuditoria } from '../mocks/mockData';
import {
  generarPdfEjecutivoMedicoBlob,
  generarPdfTecnicoF11Blob,
} from '../utils/pdfGenerator';

export interface EstadoSaludApi {
  postgresReady: boolean;
  ollamaReady: boolean;
  zeroEgress: boolean;
  apiDisponible: boolean;
}

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

export type AudienciaReporte = 'technical' | 'medical';

export const saludEjemploMock: EstadoSaludApi = {
  postgresReady: true,
  ollamaReady: true,
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
  campaigns: campanasMock.map((c) => ({
    campaignCode: c.id,
    title: c.nombre,
    adversaryType: c.id === 'CAMP-2026-001' ? 'HYBRID' : c.id === 'CAMP-2026-002' || c.id === 'CAMP-2026-005' ? 'INSIDER_THREAT' : 'EXTERNAL_ACTOR',
    severity: c.severidad,
    admiraltyRating: c.admiralty,
    anomalyScore: c.id === 'CAMP-2026-001' ? 0.985 : 0.93,
    mitreTechniques: [],
    iocs: {
      sourceIps: [c.ipOrigenFw],
      destinationIps: [c.ipDestinoFw],
      actorTokens: c.eventos.map((e) => e.usuarioToken),
      accountTokens: c.eventos.map((e) => e.cuentaToken),
    },
    ioas: [c.descripcion],
    summary: c.descripcion,
  })),
  ipeScenarios: {
    mostProbable: {
      label: 'Escenario Más Probable',
      description:
        'Abuso persistente de privilegios y manipulación de 16 cuentas especiales acompañado de fuerza bruta Telnet y escaneo de puertos heredados.',
      campaignCodes: ['CAMP-2026-005', 'CAMP-2026-003', 'CAMP-2026-004'],
    },
    mostDangerous: {
      label: 'Escenario Más Peligroso',
      description:
        'Operación multifase (005 -> 001 + 002) con descarga clínica y salida cifrada hacia 186.46.219[.]18:8443 en 30 segundos.',
      campaignCodes: ['CAMP-2026-005', 'CAMP-2026-001', 'CAMP-2026-002'],
    },
  },
};

export function createDefaultHeatmap24x31(): HourlyHeatmapResponse {
  return generarMatrizHeatmapRealistaMock();
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
      typeof item.title === 'string' && item.title.trim() ? item.title.trim() : code;

    const rawScore = item.anomalyScore;
    const anomalyScore =
      typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;

    const mitreRaw = Array.isArray(item.mitreTechniques) ? item.mitreTechniques : [];
    const mitreTechniques: CampaignMitreItem[] = mitreRaw.map((t, tIdx) => {
      if (typeof t === 'string') {
        return { id: t, name: t };
      }
      const obj = (t ?? {}) as Record<string, unknown>;
      return {
        id: typeof obj.id === 'string' ? obj.id : `T-${tIdx + 1}`,
        name: typeof obj.name === 'string' ? obj.name : 'Técnica registrada',
        tactic: typeof obj.tactic === 'string' ? obj.tactic : undefined,
      };
    });

    const ioas = Array.isArray(item.ioas) ? item.ioas.map((x) => String(x)) : [];

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
  const rawProbable = (rawIpe.mostProbable ?? rawIpe.masProbable ?? {}) as Record<
    string,
    unknown
  >;
  const rawDangerous = (rawIpe.mostDangerous ?? rawIpe.masPeligroso ?? {}) as Record<
    string,
    unknown
  >;

  const parseCodes = (val: unknown, fallbackCodes: string[]): string[] =>
    Array.isArray(val) ? val.map((c) => String(c)) : fallbackCodes;

  return {
    campaigns: campaigns.length > 0 ? campaigns : campaignsApiFallback.campaigns,
    ipeScenarios: {
      mostProbable: {
        label: 'Escenario Más Probable',
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
        label: 'Escenario Más Peligroso',
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
          typeof json.campaignCode === 'string' ? json.campaignCode : campaignCode,
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
      'Síntesis local Ollama (Sección 8): Migrar servicios heredados 8470–8478 hacia puertos cifrados TLS 9470–9476, deshabilitar Telnet (23/tcp) y SMBv1 (445/tcp), forzar sincronización NTP 24h para evitar desfases de 12h y auditar las 16 cuentas especiales bajo reglas Sigma IoA/IoC.',
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

  const res = await fetchRelativoConFallback<{
    intact?: boolean;
    valid?: boolean;
    valida?: boolean;
  }>('/api/v1/audit/verify-chain', { valida: validaLocal });

  if (typeof res.data.intact === 'boolean') {
    return { valida: res.data.intact };
  }
  if (typeof res.data.valid === 'boolean') {
    return { valida: res.data.valid };
  }
  if (typeof res.data.valida === 'boolean') {
    return { valida: res.data.valida };
  }
  return { valida: validaLocal };
}

export async function solicitarReportePorAudienciaApi(
  audience: AudienciaReporte,
  conclusionTexto = ''
): Promise<{ blob: Blob; filename: string; desdeBackend: boolean }> {
  const filename =
    audience === 'medical'
      ? 'Reporte_Ejecutivo_Medico_AegisHealth.pdf'
      : 'Reporte_CTI_Tecnico_F11_AegisHealth.pdf';

  if (!estaEnModoMock()) {
    try {
      const resp = await fetch('/api/v1/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          format: audience === 'medical' ? 'EJECUTIVO_MEDICO' : 'F-11',
          summary: conclusionTexto,
        }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        return { blob, filename, desdeBackend: true };
      }
    } catch {
      // Respaldo local garantizado para no romper descarga
    }
  }

  const blob =
    audience === 'medical'
      ? generarPdfEjecutivoMedicoBlob({
          periodo: resumenEjecutivoMedicoMock.periodoAnalizado,
          resumenSencillo: resumenEjecutivoMedicoMock.resumenSencillo,
          hallazgos: resumenEjecutivoMedicoMock.hallazgosClaros,
          acciones: resumenEjecutivoMedicoMock.accionesParaDireccion,
        })
      : generarPdfTecnicoF11Blob(
          seccionesF11Mock,
          conclusionTexto || seccionesF11Mock[7].resumen
        );

  return { blob, filename, desdeBackend: false };
}

export const recursosLocales = {
  evidenciaIngestaMock,
  seccionesF11Mock,
  auditoriaInicialMock,
};
