import React, { useState } from 'react';
import type {
    RegistroAuditoria,
    SeccionF11,
} from '../mocks/mockData';
import {
    estaEnModoMock,
    regenerarSeccionLlmApi,
    solicitarPdfReporteF11Api,
    verificarCadenaAuditoriaApi,
} from '../services/apiClient';
import { sanitizarCeldaCsv } from '../utils/csvSanitizer';
import { generarPdfReporteF11Blob } from '../utils/pdfGenerator';

interface ReportCenterPageProps {
    secciones: SeccionF11[];
    registrosAuditoria: RegistroAuditoria[];
    onRegistrarEventoAuditoria: (tipoEvento: string, detalle: string) => void;
}

const detalleHumanoSeccion: Record<number, string> = {
    1: 'Sustentado en Registros_conexiones_FW_10_2026 y logs sintéticos del sistema médico bajo metodología IPE.',
    2: 'Evaluación de los perfiles ADV-01 y ADV-02 con sus capacidades, técnicas y nivel de confiabilidad de evidencia.',
    3: 'Análisis del impacto sobre la confidencialidad de datos de salud y la continuidad operativa.',
    4: 'Comportamientos detallados paso a paso mapeados a técnicas MITRE ATT&CK.',
    5: 'Cinco campañas correlacionadas (CAMP-2026-001 a 005), destacando el caso de exfiltración en 15 segundos.',
    6: 'Reglas Sigma listas para operar (IoA por comportamiento e IoC por bloqueo puntual) y exportación STIX 2.1.',
    7: 'Comparación clara entre el escenario más frecuente y el de mayor riesgo institucional.',
    8: 'Conclusiones finales y priorización de acciones oportunas respaldadas por bitácora inmutable.',
};

const nombresEventosHumanos: Record<string, string> = {
    INGESTA_STREAMING_LOCAL: 'Carga local de registros',
    VERIFICACION_ZERO_EGRESS: 'Prueba sin salida externa',
    BREAK_GLASS_REVEAL: 'Consulta de cuenta técnica (Break-Glass)',
    EXPORT_STIX_2_1: 'Exportación para MISP (STIX 2.1)',
    LLM_LOCAL_REGENERATE: 'Redacción asistida por IA local',
    EXPORT_REPORT_PDF: 'Descarga de informe PDF F-11',
};

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({
    secciones,
    registrosAuditoria,
    onRegistrarEventoAuditoria,
}) => {
    const [conclusionActual, setConclusionActual] = useState(
        'Las cinco campañas correlacionadas evidencian la necesidad de combinar reglas de comportamiento (IoA) con monitoreo de egresos atípicos y controles estrictos sobre cuentas especiales, manteniendo la seudonimización LOPDP y la cadena de custodia verificable.'
    );
    const [regenerando, setRegenerando] = useState(false);
    const [cadenaVerificada, setCadenaVerificada] = useState(true);
    const [mensajeEstado, setMensajeEstado] = useState('');
    const [seccionActivaNum, setSeccionActivaNum] = useState<number>(8);
    const [filtroAuditoria, setFiltroAuditoria] = useState('');

    const seccionActual =
        secciones.find((s) => s.numero === seccionActivaNum) ?? secciones[0];

    const registrosFiltrados = registrosAuditoria.filter((reg) => {
        const q = filtroAuditoria.trim().toLowerCase();
        if (!q) return true;
        const nombreHumano = (nombresEventosHumanos[reg.tipoEvento] ?? '').toLowerCase();
        return (
            nombreHumano.includes(q) ||
            reg.id.toLowerCase().includes(q) ||
            reg.tipoEvento.toLowerCase().includes(q) ||
            reg.actorToken.toLowerCase().includes(q) ||
            reg.detalle.toLowerCase().includes(q)
        );
    });

    const handleRegenerarConclusion = async () => {
        setRegenerando(true);
        try {
            const respuesta = await regenerarSeccionLlmApi(8);
            setConclusionActual(respuesta.texto);
            setMensajeEstado('Conclusión actualizada con el asistente local (Ollama).');
            onRegistrarEventoAuditoria(
                'LLM_LOCAL_REGENERATE',
                'Regeneración de conclusiones de Sección 8 mediante modelo local.'
            );
        } finally {
            setRegenerando(false);
        }
    };

    const handleDescargarPdf = async () => {
        const lineasReporte = [
            'AEGISHEALTH-CTI - REPORTE DE INTELIGENCIA DE AMENAZAS (FICHA F-11)',
            'Entorno: Datos sinteticos de practica | Procesamiento 100% local',
            '',
            'SECCIONES:',
            ...secciones.map(
                (s) =>
                    `${s.numero}. ${s.titulo} [${s.completada ? 'COMPLETA' : 'PENDIENTE'}]: ${s.resumen}`
            ),
            '',
            '8. CONCLUSIONES Y CONTROLES:',
            conclusionActual,
        ];

        const blob = estaEnModoMock()
            ? generarPdfReporteF11Blob(
                  'AegisHealth-CTI - Reporte CTI Ficha F-11 (Datos Sinteticos)',
                  lineasReporte
              )
            : await solicitarPdfReporteF11Api(lineasReporte.join('\n'));

        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'Reporte_CTI_Ficha_F11_AegisHealth.pdf';
        enlace.click();
        URL.revokeObjectURL(url);

        setMensajeEstado('Se descargó el informe PDF (Reporte_CTI_Ficha_F11_AegisHealth.pdf).');
        onRegistrarEventoAuditoria(
            'EXPORT_REPORT_PDF',
            'Descarga de Reporte CTI (PDF Ficha F-11).'
        );
    };

    const handleExportarAuditoriaCsv = () => {
        const encabezados = ['ID', 'Timestamp', 'TipoEvento', 'ActorToken', 'Detalle', 'HashPrevio', 'HashActual'];
        const filas = registrosAuditoria.map((r) =>
            [
                r.id,
                r.timestamp,
                r.tipoEvento,
                r.actorToken,
                r.detalle,
                r.hashPrevio,
                r.hashActual,
            ]
                .map(sanitizarCeldaCsv)
                .join(',')
        );
        const csvContenido = [encabezados.map(sanitizarCeldaCsv).join(','), ...filas].join('\n');
        const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'cti_audit_log_sanitizado.csv';
        enlace.click();
        URL.revokeObjectURL(url);
        setMensajeEstado('Historial exportado en formato CSV sanitizado.');
    };

    const handleVerificarHashChain = async () => {
        const res = await verificarCadenaAuditoriaApi(registrosAuditoria);
        setCadenaVerificada(res.valida);
        setMensajeEstado(
            res.valida
                ? 'Verificación correcta: ningún registro de la bitácora fue alterado.'
                : 'Atención: se detectó una diferencia en el encadenamiento de hashes.'
        );
    };

    return (
        <section className="space-y-6">
            {/* Centro del Informe F-11 (8 secciones obligatorias) */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                            Informe de Inteligencia de Amenazas (Ficha F-11)
                        </h1>
                        <p className="text-xs text-slate-600">
                            {secciones.filter((s) => s.completada).length} de {secciones.length} secciones listas · Puedes revisar cada apartado y ajustar la conclusión antes de descargar el PDF.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRegenerarConclusion}
                            disabled={regenerando}
                            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            {regenerando ? 'Redactando...' : 'Sugerir conclusión (IA local)'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDescargarPdf}
                            className="rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-900"
                        >
                            Descargar informe PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                    {/* Lista de las 8 secciones */}
                    <div className="divide-y divide-slate-100 lg:col-span-5">
                        {secciones.map((sec) => {
                            const activa = sec.numero === seccionActivaNum;
                            return (
                                <button
                                    key={sec.numero}
                                    type="button"
                                    onClick={() => setSeccionActivaNum(sec.numero)}
                                    className={`flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-xs transition ${
                                        activa
                                            ? 'bg-blue-50 font-semibold text-blue-900'
                                            : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>
                                        {sec.numero}. {sec.titulo}
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        {sec.completada ? 'Lista' : 'Pendiente'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Contenido detallado + editor de conclusión */}
                    <div className="space-y-4 p-5 lg:col-span-7">
                        {seccionActual && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                                    Apartado {seccionActual.numero} de 8
                                </span>
                                <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                                    {seccionActual.titulo}
                                </h2>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                                    {seccionActual.resumen}
                                </p>
                                {detalleHumanoSeccion[seccionActual.numero] && (
                                    <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                                        {detalleHumanoSeccion[seccionActual.numero]}
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="editor-conclusion"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Conclusión ejecutiva final (puedes editar este texto antes de generar el PDF)
                            </label>
                            <textarea
                                id="editor-conclusion"
                                rows={4}
                                value={conclusionActual}
                                onChange={(e) => setConclusionActual(e.target.value)}
                                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-blue-700 focus:outline-none"
                            />
                        </div>

                        {mensajeEstado && (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
                                {mensajeEstado}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Historial de acciones y respaldo criptográfico */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-sm font-bold text-slate-900">
                            Historial de acciones (Auditoría inmutable)
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                cadenaVerificada
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                            }`}
                        >
                            {cadenaVerificada ? 'Integridad verificada' : 'Revisar integridad'}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="search"
                            value={filtroAuditoria}
                            onChange={(e) => setFiltroAuditoria(e.target.value)}
                            placeholder="Buscar en el historial..."
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleVerificarHashChain}
                            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                            Verificar integridad
                        </button>
                        <button
                            type="button"
                            onClick={handleExportarAuditoriaCsv}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Exportar CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold">Fecha y hora</th>
                                <th className="px-4 py-2.5 font-semibold">Acción realizada</th>
                                <th className="px-4 py-2.5 font-semibold">Responsable</th>
                                <th className="px-4 py-2.5 font-semibold">Descripción</th>
                                <th className="px-4 py-2.5 font-semibold">Sello de cadena</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {registrosFiltrados.map((reg) => (
                                <tr key={reg.id} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-500">
                                        {reg.timestamp}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="block font-semibold text-slate-900">
                                            {nombresEventosHumanos[reg.tipoEvento] ?? reg.tipoEvento}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">
                                            {reg.id} · {reg.tipoEvento}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-blue-800">
                                        {reg.actorToken}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{reg.detalle}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                                        {reg.hashPrevio.slice(0, 8)} → {reg.hashActual.slice(0, 8)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {registrosFiltrados.length === 0 && (
                        <p className="p-4 text-center text-xs text-slate-500">
                            No hay registros que coincidan con tu búsqueda.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};
