// Cliente del piloto Centinela (reportes ciudadanos) y Guardián (alertas y casos).
// Contrato: guardian-centinela-frontend.md. Los tokens se reciben por parámetro y
// solo viven en memoria (estado de React); nunca se guardan en storage.

import { ApiError, estaEnModoMock, json, postJson, request } from './apiClient';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface IndicadoresReporte {
  domains: string[];
  phones: string[];
  accounts: string[];
}

export interface ReporteCentinela {
  reportId: string;
  province: string;
  receivedAt: string;
  summary: string;
  indicators: IndicadoresReporte;
}

export interface ResultadoReporte {
  reporte: ReporteCentinela;
  /** true si el servidor respondió 200 (reenvío de un reporte ya existente). */
  reenviado: boolean;
}

export type EstadoCampanaCentinela = 'EN_OBSERVACION' | 'AVISO_A_AFILIADOS' | string;

export interface CampanaCentinela {
  campaignId: string;
  reportCount: number;
  /** Provincia -> número de reportantes. */
  byProvince: Record<string, number>;
  domains: string[];
  status: EstadoCampanaCentinela;
}

export interface PasoAlerta {
  eventId: string;
  timestamp: string;
  event: string;
  channel: string;
}

export interface AlertaGuardian {
  rule: string;
  severity: string;
  confidence: number | string | null;
  action: string;
  explanation: string;
  timeline: PasoAlerta[];
  phishingLink?: string | null;
  phishingReportId?: string | null;
  caseId: string | null;
}

export type EstadoCaso = 'EN_REVISION' | 'CONFIRMADO' | 'DESCARTADO' | string;
export type EstadoOperacion = 'RETENIDA' | 'LIBERADA' | string;

export interface CasoGuardian {
  caseId: string;
  status: EstadoCaso;
  operationStatus: EstadoOperacion;
  evidence: Record<string, unknown> & { rule?: string };
  createdAt: string;
  simulated: boolean;
  auditId?: string | null;
  decidedBy?: string | null;
  decisionReason?: string | null;
}

export interface EvaluacionGuardian {
  alerts: AlertaGuardian[];
  cases: CasoGuardian[];
  evaluatedEvents: number;
  ignoredEvents: number;
}

export type DecisionCaso = 'CONFIRMAR' | 'DESCARTAR';

export interface CredencialAnalista {
  analystId: string;
  analystToken: string;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const PROVINCIAS_ECUADOR = [
  'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas',
  'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo',
  'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas',
  'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe',
];

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

function normalizarPorProvincia(v: unknown): Record<string, number> {
  if (Array.isArray(v)) {
    // [{province, count}] o [{province, reporters}]
    const out: Record<string, number> = {};
    v.forEach((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      const p = String(o.province ?? o.provincia ?? '');
      const n = Number(o.count ?? o.reporters ?? o.reportCount ?? 0);
      if (p) out[p] = (out[p] ?? 0) + n;
    });
    return out;
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, n]) => [k, Number(n) || 0]));
  }
  return {};
}

function cabecerasAnalista(c: CredencialAnalista): Record<string, string> {
  return { Authorization: `Bearer ${c.analystToken}`, 'X-Analyst-Id': c.analystId };
}

function normalizarCaso(o: Record<string, unknown>): CasoGuardian {
  return {
    caseId: String(o.caseId ?? ''),
    status: String(o.status ?? ''),
    operationStatus: String(o.operationStatus ?? ''),
    evidence: (o.evidence && typeof o.evidence === 'object' ? o.evidence : {}) as CasoGuardian['evidence'],
    createdAt: String(o.createdAt ?? ''),
    simulated: o.simulated !== false,
    auditId: (o.auditId as string | null | undefined) ?? null,
    decidedBy: (o.decidedBy as string | null | undefined) ?? null,
    decisionReason: (o.decisionReason as string | null | undefined) ?? null,
  };
}

function normalizarAlerta(o: Record<string, unknown>): AlertaGuardian {
  return {
    rule: String(o.rule ?? ''),
    severity: String(o.severity ?? ''),
    confidence: (o.confidence as number | string | null | undefined) ?? null,
    action: String(o.action ?? ''),
    explanation: String(o.explanation ?? ''),
    timeline: Array.isArray(o.timeline)
      ? o.timeline.map((p) => {
          const s = (p ?? {}) as Record<string, unknown>;
          return {
            eventId: String(s.eventId ?? ''),
            timestamp: String(s.timestamp ?? ''),
            event: String(s.event ?? ''),
            channel: String(s.channel ?? ''),
          };
        })
      : [],
    phishingLink: (o.phishingLink as string | null | undefined) ?? null,
    phishingReportId: (o.phishingReportId as string | null | undefined) ?? null,
    caseId: (o.caseId as string | null | undefined) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Simulación (solo VITE_USE_MOCKS)                                    */
/* ------------------------------------------------------------------ */

const sim = {
  reportes: new Map<string, ReporteCentinela & { reporter: string }>(),
  casos: new Map<string, CasoGuardian>(),
};

function simEvaluar(): EvaluacionGuardian {
  const primero = [...sim.reportes.values()][0];
  if (sim.casos.size === 0) {
    const ahora = new Date().toISOString();
    sim.casos.set('CASE-SIM-001', {
      caseId: 'CASE-SIM-001', status: 'EN_REVISION', operationStatus: 'RETENIDA',
      evidence: { rule: 'GUARD-01', descripcion: 'Cambio de cuenta destino tras clic en enlace reportado.' },
      createdAt: ahora, simulated: true,
    });
    sim.casos.set('CASE-SIM-002', {
      caseId: 'CASE-SIM-002', status: 'EN_REVISION', operationStatus: 'RETENIDA',
      evidence: { rule: 'GUARD-03', descripcion: 'Transferencia atípica fuera de horario.' },
      createdAt: ahora, simulated: true,
    });
  }
  const t = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  return {
    alerts: [
      {
        rule: 'GUARD-01', severity: 'CRITICA', confidence: 0.94, action: 'RETENER_OPERACION',
        explanation: 'El afiliado abrió un enlace reportado y luego cambió la cuenta destino de su pago.',
        timeline: [
          { eventId: 'EV-1', timestamp: t(40), event: 'SMS con enlace', channel: 'SMS' },
          { eventId: 'EV-2', timestamp: t(25), event: 'Inicio de sesión desde dispositivo nuevo', channel: 'WEB' },
          { eventId: 'EV-3', timestamp: t(2), event: 'Cambio de cuenta destino', channel: 'WEB' },
        ],
        phishingLink: primero?.indicators.domains[0] ?? 'alerta.example',
        phishingReportId: primero?.reportId ?? null,
        caseId: 'CASE-SIM-001',
      },
      {
        rule: 'GUARD-03', severity: 'ALTA', confidence: 0.81, action: 'RETENER_OPERACION',
        explanation: 'Transferencia de monto atípico fuera del horario habitual.',
        timeline: [{ eventId: 'EV-4', timestamp: t(15), event: 'Transferencia', channel: 'APP' }],
        caseId: 'CASE-SIM-002',
      },
      {
        rule: 'GUARD-05', severity: 'BAJA', confidence: 0.4, action: 'INFORMAR',
        explanation: 'Validación biométrica con reintento.',
        timeline: [{ eventId: 'EV-5', timestamp: t(10), event: 'Biometría reintentada', channel: 'APP' }],
        caseId: null,
      },
    ],
    cases: [...sim.casos.values()],
    evaluatedEvents: 21,
    ignoredEvents: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Centinela                                                           */
/* ------------------------------------------------------------------ */

export async function obtenerProvinciasApi(): Promise<string[]> {
  if (estaEnModoMock()) return PROVINCIAS_ECUADOR;
  try {
    const spec = await json<unknown>('/openapi.json');
    // Busca en el esquema el primer enum que contenga "Pichincha".
    let encontrado: string[] | null = null;
    const recorrer = (n: unknown) => {
      if (encontrado || !n || typeof n !== 'object') return;
      const o = n as Record<string, unknown>;
      if (Array.isArray(o.enum) && o.enum.includes('Pichincha')) {
        encontrado = o.enum.map(String);
        return;
      }
      Object.values(o).forEach(recorrer);
    };
    recorrer(spec);
    return encontrado ?? PROVINCIAS_ECUADOR;
  } catch {
    return PROVINCIAS_ECUADOR;
  }
}

export async function enviarReporteCentinelaApi(
  sesionToken: string,
  text: string,
  province: string
): Promise<ResultadoReporte> {
  if (estaEnModoMock()) {
    if (!sesionToken.trim()) throw new ApiError('Sesión inválida.', 401);
    const domains = Array.from(text.matchAll(/https?:\/\/([^\s/]+)/gi), (m) => m[1]);
    const accounts = Array.from(text.matchAll(/\b\d{10}\b/g), (m) => m[0]);
    const phones = Array.from(text.matchAll(/\b09\d{8}\b/g), (m) => m[0]);
    if (domains.length + accounts.length + phones.length === 0) {
      throw new ApiError('El reporte no contiene indicadores.', 422);
    }
    const clave = `${sesionToken}|${text}`;
    const previo = sim.reportes.get(clave);
    if (previo) return { reporte: previo, reenviado: true };
    const reporte = {
      reportId: `REP-${String(sim.reportes.size + 1).padStart(4, '0')}`,
      province,
      receivedAt: new Date().toISOString(),
      summary: `Reporte con ${domains.length} dominio(s), ${phones.length} teléfono(s) y ${accounts.length} cuenta(s).`,
      indicators: { domains, phones, accounts },
      reporter: sesionToken,
    };
    sim.reportes.set(clave, reporte);
    return { reporte, reenviado: false };
  }

  const response = await request(
    '/api/v1/centinela/reportes',
    postJson({ text, province }, { Authorization: `Bearer ${sesionToken}` })
  );
  const r = (await response.json()) as Record<string, unknown>;
  const ind = (r.indicators ?? {}) as Record<string, unknown>;
  return {
    reenviado: response.status === 200,
    reporte: {
      reportId: String(r.reportId ?? ''),
      province: String(r.province ?? province),
      receivedAt: String(r.receivedAt ?? ''),
      summary: String(r.summary ?? ''),
      indicators: { domains: strList(ind.domains), phones: strList(ind.phones), accounts: strList(ind.accounts) },
    },
  };
}

export async function obtenerCampanasCentinelaApi(): Promise<CampanaCentinela[]> {
  if (estaEnModoMock()) {
    const grupos = new Map<string, { id: string; reporters: Map<string, string>; domains: Set<string>; count: number }>();
    for (const r of sim.reportes.values()) {
      const d = r.indicators.domains[0] ?? r.indicators.accounts[0] ?? r.indicators.phones[0];
      const g = grupos.get(d) ?? { id: r.reportId, reporters: new Map(), domains: new Set(), count: 0 };
      if (!g.reporters.has(r.reporter)) g.reporters.set(r.reporter, r.province);
      r.indicators.domains.forEach((x) => g.domains.add(x));
      g.count += 1;
      grupos.set(d, g);
    }
    return [...grupos.values()].map((g) => {
      const byProvince: Record<string, number> = {};
      g.reporters.forEach((p) => (byProvince[p] = (byProvince[p] ?? 0) + 1));
      return {
        campaignId: g.id,
        reportCount: g.count,
        byProvince,
        domains: [...g.domains],
        status: g.reporters.size >= 3 ? 'AVISO_A_AFILIADOS' : 'EN_OBSERVACION',
      };
    });
  }
  const r = await json<unknown>('/api/v1/centinela/campanas');
  const lista = Array.isArray(r) ? r : ((r as { campaigns?: unknown[] })?.campaigns ?? []);
  return lista.map((c) => {
    const o = (c ?? {}) as Record<string, unknown>;
    return {
      campaignId: String(o.campaignId ?? ''),
      reportCount: Number(o.reportCount ?? 0),
      byProvince: normalizarPorProvincia(o.byProvince),
      domains: strList(o.domains),
      status: String(o.status ?? ''),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Guardián                                                            */
/* ------------------------------------------------------------------ */

export async function evaluarGuardianApi(c: CredencialAnalista): Promise<EvaluacionGuardian> {
  if (estaEnModoMock()) {
    if (!c.analystToken.trim() || !c.analystId.trim()) throw new ApiError('Credencial inválida.', 401);
    return simEvaluar();
  }
  const r = await json<Record<string, unknown>>('/api/v1/guardian/evaluar', {
    method: 'POST',
    headers: cabecerasAnalista(c),
  });
  return {
    alerts: (Array.isArray(r.alerts) ? r.alerts : []).map((a) => normalizarAlerta((a ?? {}) as Record<string, unknown>)),
    cases: (Array.isArray(r.cases) ? r.cases : []).map((x) => normalizarCaso((x ?? {}) as Record<string, unknown>)),
    evaluatedEvents: Number(r.evaluatedEvents ?? 0),
    ignoredEvents: Number(r.ignoredEvents ?? 0),
  };
}

export async function obtenerCasosGuardianApi(c: CredencialAnalista): Promise<CasoGuardian[]> {
  if (estaEnModoMock()) {
    if (!c.analystToken.trim()) throw new ApiError('Credencial inválida.', 401);
    return [...sim.casos.values()];
  }
  const r = await json<unknown>('/api/v1/guardian/casos', { headers: cabecerasAnalista(c) });
  const lista = Array.isArray(r) ? r : ((r as { cases?: unknown[] })?.cases ?? []);
  return lista.map((x) => normalizarCaso((x ?? {}) as Record<string, unknown>));
}

export async function obtenerCasoGuardianApi(c: CredencialAnalista, caseId: string): Promise<CasoGuardian> {
  if (estaEnModoMock()) {
    const caso = sim.casos.get(caseId);
    if (!caso) throw new ApiError('Caso inexistente.', 404);
    return caso;
  }
  const r = await json<Record<string, unknown>>(`/api/v1/guardian/casos/${encodeURIComponent(caseId)}`, {
    headers: cabecerasAnalista(c),
  });
  return normalizarCaso(r);
}

export async function decidirCasoGuardianApi(
  c: CredencialAnalista,
  caseId: string,
  decision: DecisionCaso,
  reason: string
): Promise<CasoGuardian> {
  if (estaEnModoMock()) {
    const caso = sim.casos.get(caseId);
    if (!caso) throw new ApiError('Caso inexistente.', 404);
    if (caso.status !== 'EN_REVISION') {
      const igual = caso.decidedBy === c.analystId && caso.decisionReason === reason &&
        caso.status === (decision === 'CONFIRMAR' ? 'CONFIRMADO' : 'DESCARTADO');
      if (igual) return caso;
      throw new ApiError('El caso ya fue resuelto.', 409);
    }
    const resuelto: CasoGuardian = {
      ...caso,
      status: decision === 'CONFIRMAR' ? 'CONFIRMADO' : 'DESCARTADO',
      operationStatus: decision === 'CONFIRMAR' ? 'RETENIDA' : 'LIBERADA',
      auditId: `AUD-SIM-${caseId.slice(-3)}`,
      decidedBy: c.analystId,
      decisionReason: reason,
    };
    sim.casos.set(caseId, resuelto);
    return resuelto;
  }
  const r = await json<Record<string, unknown>>(
    `/api/v1/guardian/casos/${encodeURIComponent(caseId)}/decision`,
    postJson({ decision, reason }, cabecerasAnalista(c))
  );
  return normalizarCaso(r);
}
