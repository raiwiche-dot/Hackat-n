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

// Ejemplo base pedido por backend para pruebas con mocks en desarrollo local
export const saludEjemploMock: EstadoSaludApi = {
    postgresReady: true,
    ollamaReady: false,
    zeroEgress: true,
    apiDisponible: true,
};

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

export async function obtenerSerieHorariaApi(): Promise<PuntoHorario[]> {
    const res = await fetchRelativoConFallback('/api/v1/analytics/hourly-heatmap', serieHorariaMock);
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