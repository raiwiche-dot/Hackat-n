// Cliente de la API AegisHealth-CTI (FastAPI) según docs "Endpoints para conectar y probar el frontend".
// - Modo API (VITE_USE_MOCKS=false): todas las vistas leen del backend y muestran el error de cada bloque.
// - Modo simulación (VITE_USE_MOCKS distinto de "false"): se usan los datos sintéticos locales.

import {
  artefactosMock,
  auditoriaInicialMock,
  campanasMock,
  generarMatrizHeatmapRealistaMock,
  resumenEjecutivoMedicoMock,
  seccionesF11Mock,
} from '../mocks/mockData';
import {
  generarPdfEjecutivoMedicoBlob,
  generarPdfTecnicoF11Blob,
} from '../utils/pdfGenerator';

/* ------------------------------------------------------------------ */
/* Base HTTP                                                           */
/* ------------------------------------------------------------------ */

// Vacío = rutas relativas a través del proxy de Vite (/api y /health -> 127.0.0.1:8081).
// Así se leen las cabeceras X-Audit-Id, X-Report-SHA256 y Content-Disposition sin depender de CORS.
// Para llamar directo al backend: VITE_API_URL=http://127.0.0.1:8081
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function estaEnModoMock(): boolean {
  return import.meta.env.VITE_USE_MOCKS !== 'false';
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function mensajeDesdeDetalle(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // 422 de FastAPI: [{loc, msg, type}]
    return detail
      .map((d) => {
        const item = (d ?? {}) as { loc?: unknown[]; msg?: string };
        const loc = Array.isArray(item.loc) ? item.loc.filter((x) => x !== 'body').join('.') : '';
        return loc ? `${loc}: ${item.msg ?? 'valor inválido'}` : item.msg ?? 'valor inválido';
      })
      .join(' · ');
  }
  if (status === 503) return 'Servicio no disponible (503).';
  return 'Revisá los campos enviados.';
}

export async function request(path: string, options: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    throw new ApiError(`No se pudo conectar con la API${API_BASE ? ` en ${API_BASE}` : ''}.`, 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
    throw new ApiError(mensajeDesdeDetalle(body.detail, response.status), response.status);
  }
  return response;
}

export async function json<T>(path: string, options?: RequestInit): Promise<T> {
  return (await request(path, options)).json() as Promise<T>;
}

export function postJson(body: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

export function describirError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status ? `${err.status} · ${err.message}` : err.message;
  }
  return err instanceof Error ? err.message : 'Error desconocido.';
}

async function guardarArchivo(response: Response, nombreAlternativo: string): Promise<string> {
  const disposition = response.headers.get('Content-Disposition') || '';
  const nombre = disposition.match(/filename="?([^";]+)"?/i)?.[1] || nombreAlternativo;
  descargarBlob(await response.blob(), nombre);
  return nombre;
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Tipos de respuesta                                                  */
/* ------------------------------------------------------------------ */

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
  pseudonymizationRecorded: boolean | null;
  ml: {
    generic: MlVariantSummary | null;
    domain: MlVariantSummary | null;
  };
}

export interface HourlyHeatmapResponse {
  timezone?: string;
  hours: string[];
  days: string[];
  /** matrix[h][d] */
  matrix: number[][];
}

export interface CampaignMitreItem {
  id: string;
  name: string;
  tactic?: string;
}

export interface CampaignIocs {
  ports: number[];
  sourceIps: string[];
  destinationIps: string[];
  actorTokens: string[];
  accountTokens: string[];
}

export interface CampaignRecord {
  campaignCode: string;
  title: string;
  adversaryType: string | null;
  severity: string | null;
  admiraltyRating: string | null;
  anomalyScore: number | null;
  eventCount: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  mitreTechniques: CampaignMitreItem[];
  ioas: string[];
  iocs: CampaignIocs;
}

export interface IpeScenario {
  code: string;
  name: string;
  campaignCodes: string[];
  description: string;
  hypothesis: string;
}

export interface CampaignsApiResponse {
  campaigns: CampaignRecord[];
  ipeScenarios: IpeScenario[];
}

export interface CampaignTimelineEvent {
  id: string;
  timestamp: string;
  source: 'FIREWALL' | 'MEDSYS' | string;
  summary: string;
  actorToken: string | null;
  accountToken: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  destinationPort: number | null;
  clockSkewAdjusted: boolean;
}

export interface CampaignTimelineResponse {
  campaignCode: string;
  events: CampaignTimelineEvent[];
}

export interface SigmaRule {
  filename: string;
  title: string;
  yaml: string;
}

export interface SigmaRulesResponse {
  ioa: SigmaRule[];
  ioc: SigmaRule[];
}

export interface AuditEvent {
  auditId: string;
  executedAt: string;
  operation: string;
  datasetName: string | null;
  datasetSha256: string | null;
  totalRowsRead: number | null;
  rowsPersisted: number | null;
  piiScrubbed: boolean | null;
  rowHash: string;
}

export interface VerifyChainResponse {
  intact: boolean;
  checkedRows: number;
}

export interface RevealResponse {
  accountToken: string;
  technicalAccount: string;
  auditId: string;
}

export interface MispEstado {
  lastVerifiedAt: string;
  eventCount: number;
  distribution: string | number | null;
  exports: string[];
}

export type AudienciaReporte = 'technical' | 'medical';

export interface DescargaReporte {
  filename: string;
  auditId: string | null;
  sha256: string | null;
  desdeBackend: boolean;
}

/* ------------------------------------------------------------------ */
/* Datos de simulación (solo modo mock)                                */
/* ------------------------------------------------------------------ */

const saludSimulada: EstadoSaludApi = {
  postgresReady: true,
  ollamaReady: true,
  zeroEgress: true,
  apiDisponible: true,
};

const resumenSimulado: DashboardSummaryResponse = {
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
      unconfirmedAnomalies: { firewallHourly: 47, medsysHourly: 47, medsysByPeriod: 47 },
    },
    domain: {
      incidentsInTopN: '5/5',
      topN: 50,
      unconfirmedAnomalies: { firewallHourly: 46, medsysHourly: 49, medsysByPeriod: 47 },
    },
  },
};

const mitreSimulado: Record<string, string[]> = {
  'CAMP-2026-001': ['T1078', 'T1021.004', 'T1213', 'T1048.002'],
  'CAMP-2026-002': ['T1213', 'T1074', 'T1021.004'],
  'CAMP-2026-003': ['T1110.001'],
  'CAMP-2026-004': ['T1046', 'T1021.001', 'T1021.002', 'T1110.003'],
  'CAMP-2026-005': ['T1078', 'T1098', 'T1531'],
};

function campanasSimuladas(): CampaignsApiResponse {
  return {
    campaigns: campanasMock.map((c) => ({
      campaignCode: c.id,
      title: c.nombre,
      adversaryType:
        c.id === 'CAMP-2026-001'
          ? 'HYBRID'
          : c.id === 'CAMP-2026-002' || c.id === 'CAMP-2026-005'
            ? 'INSIDER_THREAT'
            : 'EXTERNAL_ACTOR',
      severity: c.severidad,
      admiraltyRating: c.admiralty,
      anomalyScore: c.id === 'CAMP-2026-001' ? 0.985 : 0.93,
      eventCount: c.volumenEventos,
      firstSeen: c.eventos[0]?.timestamp ?? null,
      lastSeen: c.eventos[c.eventos.length - 1]?.timestamp ?? null,
      mitreTechniques: (mitreSimulado[c.id] ?? []).map((id) => ({ id, name: id })),
      ioas: [c.descripcion],
      iocs: {
        ports: c.puertos,
        sourceIps: [c.ipOrigenFw],
        destinationIps: [c.ipDestinoFw],
        actorTokens: Array.from(new Set(c.eventos.map((e) => e.usuarioToken))),
        accountTokens: Array.from(new Set(c.eventos.map((e) => e.cuentaToken))),
      },
    })),
    ipeScenarios: [
      {
        code: 'ESCENARIO_MAS_PROBABLE',
        name: 'Escenario más probable',
        campaignCodes: ['CAMP-2026-005', 'CAMP-2026-003', 'CAMP-2026-004'],
        description:
          'Abuso persistente de privilegios en 16 cuentas especiales acompañado de fuerza bruta Telnet y escaneo de puertos heredados.',
        hypothesis: 'Actor interno con privilegios mantiene acceso y reconoce servicios heredados.',
      },
      {
        code: 'ESCENARIO_MAS_PELIGROSO',
        name: 'Escenario más peligroso',
        campaignCodes: ['CAMP-2026-005', 'CAMP-2026-001', 'CAMP-2026-002'],
        description:
          'Operación multifase (005 -> 001 + 002) con descarga clínica y salida cifrada hacia 186.46.219[.]18:8443 en 30 segundos.',
        hypothesis: 'Exfiltración de datos clínicos con apoyo de una cuenta técnica comprometida.',
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Normalización ligera de respuestas                                  */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

function normalizarMitre(v: unknown): CampaignMitreItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((t, i) => {
    if (typeof t === 'string') return { id: t, name: t };
    const o = (t ?? {}) as Record<string, unknown>;
    const id = str(o.id) ?? str(o.techniqueId) ?? `T-${i + 1}`;
    return { id, name: str(o.name) ?? id, tactic: str(o.tactic) ?? undefined };
  });
}

function normalizarCampana(item: Record<string, unknown>): CampaignRecord {
  const iocs = (item.iocs ?? {}) as Record<string, unknown>;
  const code = String(item.campaignCode ?? '');
  return {
    campaignCode: code,
    title: str(item.title) ?? code,
    adversaryType: str(item.adversaryType),
    severity: str(item.severity),
    admiraltyRating: str(item.admiraltyRating),
    anomalyScore: num(item.anomalyScore),
    eventCount: num(item.eventCount),
    firstSeen: str(item.firstSeen),
    lastSeen: str(item.lastSeen),
    mitreTechniques: normalizarMitre(item.mitreTechniques),
    ioas: strList(item.ioas),
    iocs: {
      ports: Array.isArray(iocs.ports) ? iocs.ports.map((p) => Number(p)) : [],
      sourceIps: strList(iocs.sourceIps),
      destinationIps: strList(iocs.destinationIps),
      actorTokens: strList(iocs.actorTokens),
      accountTokens: strList(iocs.accountTokens),
    },
  };
}

/* ------------------------------------------------------------------ */
/* GET                                                                 */
/* ------------------------------------------------------------------ */

export async function comprobarBackend(): Promise<boolean> {
  if (estaEnModoMock()) return true;
  try {
    const r = await json<{ status?: string }>('/health');
    return r.status === 'healthy';
  } catch {
    return false;
  }
}

export async function obtenerEstadoSaludApi(): Promise<EstadoSaludApi> {
  if (estaEnModoMock()) return saludSimulada;
  try {
    const r = await json<Partial<EstadoSaludApi>>('/api/v1/health');
    return {
      postgresReady: Boolean(r.postgresReady),
      ollamaReady: Boolean(r.ollamaReady),
      zeroEgress: Boolean(r.zeroEgress),
      apiDisponible: true,
    };
  } catch {
    return { postgresReady: false, ollamaReady: false, zeroEgress: false, apiDisponible: false };
  }
}

export async function obtenerDashboardSummaryApi(): Promise<DashboardSummaryResponse> {
  if (estaEnModoMock()) return resumenSimulado;
  const r = await json<Partial<DashboardSummaryResponse>>('/api/v1/dashboard/summary');
  return {
    totalEvents: num(r.totalEvents) ?? 0,
    malformedIpEvents: num(r.malformedIpEvents) ?? 0,
    hoursCovered: num(r.hoursCovered) ?? 0,
    bySource: Array.isArray(r.bySource) ? r.bySource : [],
    pseudonymizationRecorded:
      typeof r.pseudonymizationRecorded === 'boolean' ? r.pseudonymizationRecorded : null,
    ml: {
      generic: r.ml?.generic ?? null,
      domain: r.ml?.domain ?? null,
    },
  };
}

export async function obtenerHourlyHeatmapApi(): Promise<HourlyHeatmapResponse> {
  if (estaEnModoMock()) return { timezone: 'UTC', ...generarMatrizHeatmapRealistaMock() };
  const r = await json<Partial<HourlyHeatmapResponse>>('/api/v1/analytics/hourly-heatmap');
  return {
    timezone: r.timezone ?? 'UTC',
    // Las fechas se conservan como texto: sin conversión a hora local.
    hours: strList(r.hours),
    days: strList(r.days),
    matrix: Array.isArray(r.matrix) ? r.matrix : [],
  };
}

export async function obtenerCampaignsApi(): Promise<CampaignsApiResponse> {
  if (estaEnModoMock()) return campanasSimuladas();
  const r = await json<{ campaigns?: unknown[]; ipeScenarios?: unknown[] }>('/api/v1/campaigns');
  return {
    campaigns: (r.campaigns ?? []).map((c) => normalizarCampana((c ?? {}) as Record<string, unknown>)),
    ipeScenarios: (r.ipeScenarios ?? []).map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        code: String(o.code ?? ''),
        name: str(o.name) ?? String(o.code ?? ''),
        campaignCodes: strList(o.campaignCodes),
        description: str(o.description) ?? '',
        hypothesis: str(o.hypothesis) ?? '',
      };
    }),
  };
}

export async function obtenerTimelineCampanaApi(
  campaignCode: string
): Promise<CampaignTimelineResponse> {
  if (estaEnModoMock()) {
    const c = campanasMock.find((x) => x.id === campaignCode);
    if (!c) throw new ApiError('Campaña desconocida.', 404);
    return {
      campaignCode,
      events: c.eventos.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        source: e.carril,
        summary: `${e.accion} · ${e.detalle}`,
        actorToken: e.usuarioToken,
        accountToken: e.cuentaToken,
        sourceIp: c.ipOrigenFw,
        destinationIp: c.ipDestinoFw,
        destinationPort: c.puertos[c.puertos.length - 1] ?? null,
        clockSkewAdjusted: Boolean(e.clockSkewAdjusted),
      })),
    };
  }
  const code = encodeURIComponent(campaignCode);
  const r = await json<{ campaignCode?: string; events?: unknown[] }>(
    `/api/v1/campaigns/${code}/timeline`
  );
  return {
    campaignCode: r.campaignCode ?? campaignCode,
    events: (r.events ?? []).map((e, i) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? i),
        timestamp: String(o.timestamp ?? ''),
        source: String(o.source ?? ''),
        summary: str(o.summary) ?? '',
        actorToken: str(o.actorToken),
        accountToken: str(o.accountToken),
        sourceIp: str(o.sourceIp),
        destinationIp: str(o.destinationIp),
        destinationPort: num(o.destinationPort),
        clockSkewAdjusted: Boolean(o.clockSkewAdjusted),
      };
    }),
  };
}

export async function obtenerReglasSigmaApi(): Promise<SigmaRulesResponse> {
  if (estaEnModoMock()) {
    const map = (tipo: 'IoA' | 'IoC') =>
      artefactosMock
        .filter((a) => a.tipo === tipo)
        .map((a) => ({ filename: `${a.id.toLowerCase()}.yml`, title: a.nombre, yaml: a.sigmaYaml }));
    return { ioa: map('IoA'), ioc: map('IoC') };
  }
  const r = await json<Partial<SigmaRulesResponse>>('/api/v1/exports/sigma');
  return { ioa: r.ioa ?? [], ioc: r.ioc ?? [] };
}

export async function obtenerEventosAuditoriaApi(): Promise<AuditEvent[]> {
  if (estaEnModoMock()) {
    return [...auditoriaInicialMock].reverse().map((r) => ({
      auditId: r.id,
      executedAt: r.timestamp,
      operation: r.tipoEvento,
      datasetName: null,
      datasetSha256: null,
      totalRowsRead: null,
      rowsPersisted: null,
      piiScrubbed: true,
      rowHash: r.hashActual,
    }));
  }
  const r = await json<{ events?: AuditEvent[] }>('/api/v1/audit/events');
  return r.events ?? [];
}

export async function verificarCadenaAuditoriaApi(): Promise<VerifyChainResponse> {
  if (estaEnModoMock()) return { intact: true, checkedRows: auditoriaInicialMock.length };
  const r = await json<Partial<VerifyChainResponse>>('/api/v1/audit/verify-chain');
  return { intact: r.intact === true, checkedRows: num(r.checkedRows) ?? 0 };
}

export async function obtenerEstadoMispApi(): Promise<MispEstado> {
  if (estaEnModoMock()) {
    return {
      lastVerifiedAt: '2026-10-31T23:59:00Z',
      eventCount: 5,
      distribution: 'Your organisation only',
      exports: ['aegishealth_stix21_bundle.json'],
    };
  }
  const r = await json<Partial<MispEstado>>('/api/v1/misp/estado');
  return {
    lastVerifiedAt: String(r.lastVerifiedAt ?? ''),
    eventCount: num(r.eventCount) ?? 0,
    distribution: r.distribution ?? null,
    exports: strList(r.exports),
  };
}

export async function descargarStixApi(): Promise<string> {
  const nombre = 'aegishealth_stix21_bundle.json';
  if (estaEnModoMock()) {
    const bundle = {
      type: 'bundle',
      id: 'bundle--aegishealth-cti-synthetic-001',
      objects: [
        {
          type: 'indicator',
          spec_version: '2.1',
          id: 'indicator--camp-2026-001-egress',
          name: 'Egreso sintético 186.46.219.18:8443',
          labels: ['synthetic-exercise-data'],
          pattern: "[ipv4-addr:value = '186.46.219.18' AND network-traffic:dst_port = 8443]",
          pattern_type: 'stix',
        },
      ],
    };
    descargarBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), nombre);
    return nombre;
  }
  return guardarArchivo(await request('/api/v1/exports/stix'), nombre);
}

/* ------------------------------------------------------------------ */
/* POST                                                                */
/* ------------------------------------------------------------------ */

export async function revelarCuentaApi(
  analystId: string,
  reason: string,
  accountToken: string,
  clave: string
): Promise<RevealResponse> {
  if (estaEnModoMock()) {
    const ev = campanasMock.flatMap((c) => c.eventos).find((e) => e.cuentaToken === accountToken);
    if (!ev) throw new ApiError('Cuenta desconocida.', 404);
    return { accountToken, technicalAccount: ev.cuentaTecnicaReal, auditId: 'AUD-SIMULADO' };
  }
  return json<RevealResponse>(
    '/api/v1/audit/reveal',
    postJson({ analystId, reason, accountToken }, clave ? { Authorization: `Bearer ${clave}` } : {})
  );
}

export async function regenerarConclusionesApi(): Promise<string> {
  if (estaEnModoMock()) {
    return 'Síntesis local (simulación): migrar servicios heredados 8470–8478 hacia TLS 9470–9476, deshabilitar Telnet (23/tcp) y SMBv1 (445/tcp), sincronizar NTP y auditar las 16 cuentas especiales con reglas Sigma IoA/IoC.';
  }
  const r = await json<{ section: string; text: string }>(
    '/api/v1/llm/regenerate-section',
    postJson({ section: 'conclusions' })
  );
  return r.text;
}

export async function descargarReportePdfApi(
  audience: AudienciaReporte,
  summary?: string
): Promise<DescargaReporte> {
  const alternativo =
    audience === 'medical'
      ? 'Reporte_Ejecutivo_Medico_AegisHealth.pdf'
      : 'Reporte_CTI_Tecnico_F11_AegisHealth.pdf';

  if (estaEnModoMock()) {
    const r = resumenEjecutivoMedicoMock;
    const blob =
      audience === 'medical'
        ? generarPdfEjecutivoMedicoBlob({
            periodo: r.periodoAnalizado,
            resumenSencillo: r.resumenSencillo,
            hallazgos: r.hallazgosClaros,
            acciones: r.accionesParaDireccion,
          })
        : generarPdfTecnicoF11Blob(seccionesF11Mock, summary || seccionesF11Mock[7].resumen);
    descargarBlob(blob, alternativo);
    return { filename: alternativo, auditId: null, sha256: null, desdeBackend: false };
  }

  const body =
    audience === 'medical'
      ? { audience, format: 'EJECUTIVO_MEDICO' }
      : { audience: 'technical', format: 'F-11', ...(summary?.trim() ? { summary } : {}) };
  const response = await request('/api/v1/reports/generate-pdf', postJson(body));
  const filename = await guardarArchivo(response, alternativo);
  return {
    filename,
    auditId: response.headers.get('X-Audit-Id'),
    sha256: response.headers.get('X-Report-SHA256'),
    desdeBackend: true,
  };
}
