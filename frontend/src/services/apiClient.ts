import { campanasMock, generarMatrizHeatmapRealistaMock } from '../mocks/mockData';

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
  ports?: number[];
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
  admiraltyRating?: string | null;
  eventCount?: number | null;
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
  id: number;
  timestamp: string;
  source: 'FIREWALL' | 'MEDSYS' | string;
  actorToken: string | null;
  accountToken: string | null;
  summary: string | null;
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
    eventCount: c.volumenEventos,
    anomalyScore: c.id === 'CAMP-2026-001' ? 0.985 : 0.93,
    mitreTechniques: [],
    iocs: {
      ports: c.puertos,
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
  return import.meta.env.VITE_USE_MOCKS === 'true';
}

export async function solicitarApi<T>(ruta: string, mensaje: string, init?: RequestInit): Promise<T> {
  const respuesta = await consultarApi(ruta, mensaje, init);
  return respuesta.json() as Promise<T>;
}

async function consultarApi(ruta: string, mensaje: string, init?: RequestInit): Promise<Response> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, init);
  } catch {
    throw new Error(mensaje);
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null) as { detail?: unknown } | null;
    throw new Error(typeof cuerpo?.detail === 'string' ? cuerpo.detail : `${mensaje} (HTTP ${respuesta.status})`);
  }
  return respuesta;
}

export const saludNoDisponible: EstadoSaludApi = {
  postgresReady: false,
  ollamaReady: false,
  zeroEgress: false,
  apiDisponible: false,
};

export async function obtenerEstadoSaludApi(): Promise<EstadoSaludApi> {
  if (estaEnModoMock()) return saludEjemploMock;
  try {
    const estado = await solicitarApi<Omit<EstadoSaludApi, 'apiDisponible'>>('/api/v1/health', 'API no disponible.');
    return { ...estado, apiDisponible: true };
  } catch {
    return saludNoDisponible;
  }
}

export async function obtenerDashboardSummaryApi(): Promise<DashboardSummaryResponse> {
  if (estaEnModoMock()) return dashboardSummaryFallback;
  return solicitarApi('/api/v1/dashboard/summary', 'No se pudo cargar el resumen.');
}

export async function obtenerHourlyHeatmapApi(): Promise<HourlyHeatmapResponse> {
  if (estaEnModoMock()) return createDefaultHeatmap24x31();
  const mapa = await solicitarApi<{
    hours: Array<number | string>;
    days: string[];
    matrix: number[][];
  }>('/api/v1/analytics/hourly-heatmap', 'No se pudo cargar el mapa horario.');
  return { ...mapa, hours: mapa.hours.map((hora) => String(hora).padStart(2, '0')) };
}

export async function obtenerCampaignsApi(): Promise<CampaignsApiResponse> {
  if (estaEnModoMock()) return campaignsApiFallback;
  const respuesta = await solicitarApi<{
    campaigns: Array<Omit<CampaignRecord, 'mitreTechniques'> & { mitreTechniques: string[] }>;
    ipeScenarios: Array<IpeScenarioBlock & { code: string; name: string }>;
  }>('/api/v1/campaigns', 'No se pudieron cargar las campañas.');
  const escenario = (code: string): IpeScenarioBlock => {
    const item = respuesta.ipeScenarios.find((valor) => valor.code === code);
    return item ? { ...item, label: item.name } : { description: 'Sin datos', campaignCodes: [] };
  };

  return {
    campaigns: respuesta.campaigns.map((campana) => ({
      ...campana,
      title: campana.title || campana.campaignCode,
      severity: campana.severity || 'Sin clasificar',
      mitreTechniques: campana.mitreTechniques.map((id) => ({ id, name: id })),
    })),
    ipeScenarios: {
      mostProbable: escenario('ESCENARIO_MAS_PROBABLE'),
      mostDangerous: escenario('ESCENARIO_MAS_PELIGROSO'),
    },
  };
}

export async function obtenerTimelineCampanaApi(campaignCode: string): Promise<CampaignTimelineResponse> {
  if (estaEnModoMock()) {
    const campana = campanasMock.find((item) => item.id === campaignCode);
    return {
      campaignCode,
      events: (campana?.eventos ?? []).map((evento, indice) => ({
        id: indice + 1,
        timestamp: evento.timestamp,
        source: evento.carril,
        actorToken: evento.usuarioToken,
        accountToken: evento.cuentaToken,
        summary: evento.detalle,
        clockSkewAdjusted: evento.clockSkewAdjusted,
      })),
    };
  }
  return solicitarApi(`/api/v1/campaigns/${encodeURIComponent(campaignCode)}/timeline`, 'No se pudo cargar la cronología.');
}

export function enviarRevelacionBreakGlassApi(
  payload: { analystId: string; reason: string; accountToken: string },
  clave: string
): Promise<{ accountToken: string; technicalAccount: string; auditId: number }> {
  return solicitarApi('/api/v1/audit/reveal', 'No se pudo revelar la cuenta.', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
}

export function regenerarSeccionLlmApi(): Promise<{ section: 'conclusions'; text: string }> {
  return solicitarApi('/api/v1/llm/regenerate-section', 'No se pudo regenerar la conclusión.', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: 'conclusions' }),
  });
}

export interface EventoAuditoriaApi {
  auditId: number;
  executedAt: string | null;
  operation: string;
  datasetName: string | null;
  rowHash: string;
}

export async function obtenerEventosAuditoriaApi(): Promise<EventoAuditoriaApi[]> {
  const respuesta = await solicitarApi<{ events: EventoAuditoriaApi[] }>('/api/v1/audit/events', 'No se pudo cargar la bitácora.');
  return respuesta.events;
}

export function verificarCadenaAuditoriaApi(): Promise<{ intact: boolean; checkedRows: number }> {
  return solicitarApi('/api/v1/audit/verify-chain', 'No se pudo verificar la cadena.');
}

interface ArchivoDescarga {
  blob: Blob;
  filename: string;
}

async function obtenerArchivo(ruta: string, nombre: string, tipo: string, init?: RequestInit): Promise<ArchivoDescarga> {
  const mensaje = 'No se pudo preparar el archivo.';
  const respuesta = await consultarApi(ruta, mensaje, init);
  if (!respuesta.headers.get('Content-Type')?.startsWith(tipo)) {
    throw new Error(mensaje);
  }
  const nombreServidor = /filename="([^"]+)"/i.exec(respuesta.headers.get('Content-Disposition') ?? '')?.[1];
  return { blob: await respuesta.blob(), filename: nombreServidor || nombre };
}

export function solicitarReportePorAudienciaApi(audience: AudienciaReporte, summary?: string): Promise<ArchivoDescarga> {
  const medico = audience === 'medical';
  return obtenerArchivo(
    '/api/v1/reports/generate-pdf',
    medico ? 'Reporte_Ejecutivo_Medico_AegisHealth.pdf' : 'Reporte_CTI_Tecnico_F11_AegisHealth.pdf',
    'application/pdf',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience, format: medico ? 'EJECUTIVO_MEDICO' : 'F-11', summary }),
    }
  );
}

export function solicitarStixApi(): Promise<ArchivoDescarga> {
  return obtenerArchivo('/api/v1/exports/stix', 'aegishealth_stix21_bundle.json', 'application/stix+json');
}

export function descargarArchivo({ blob, filename }: ArchivoDescarga): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = filename;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
