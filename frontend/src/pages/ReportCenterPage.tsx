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
import { CheckIcon, DocumentCheckIcon, DownloadIcon, ShieldIcon } from '../components/AppIcons';

interface ReportCenterPageProps {
    secciones: SeccionF11[];
    registrosAuditoria: RegistroAuditoria[];
    modoLectura?: 'simple' | 'tecnico';
    onRegistrarEventoAuditoria: (tipoEvento: string, detalle: string) => void;
}

const detalleTecnicoSeccion: Record<number, string> = {
    1: 'Fuentes permitidas: Registros_conexiones_FW_10_2026 y registros sintéticos del sistema médico bajo metodología IPE.',
    2: 'Perfiles ADV-01 y ADV-02 evaluados con escala Admiralty (A2/B2), motivaciones, capacidades, TTP y tokens LOPDP.',
    3: 'Impacto institucional sobre confidencialidad, integridad y continuidad operativa de servicios clínicos.',
    4: 'Mapeo táctico de comportamientos sobre técnicas MITRE ATT&CK T1078, T1213, T1074, T1048.002, T1110.001 y T1098.',
    5: 'Reconstrucción de cinco campañas (CAMP-2026-001 a 005), destacando secuencia de 15 segundos.',
    6: 'Reglas Sigma diferenciando IoA (comportamiento) e IoC (contención puntual) y exportación STIX 2.1 para MISP.',
    7: 'Evaluación IPE comparando el escenario más probable frente al más peligroso.',
    8: 'Priorización de controles oportunos y verificación criptográfica de la bitácora cti_audit.',
};

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({
    secciones,
    registrosAuditoria,
    modoLectura = 'simple',
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

    const esTecnico = modoLectura === 'tecnico';
    const completadas = secciones.filter((s) => s.completada).length;
    const seccionActual =
        secciones.find((s) => s.numero === seccionActivaNum) ?? secciones[0];

    const registrosFiltrados = registrosAuditoria.filter((reg) => {
        const q = filtroAuditoria.trim().toLowerCase();
        if (!q) return true;
        return (
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
            setMensajeEstado('Conclusión actualizada localmente con el asistente de IA.');
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
                    `${s.numero}. ${s.titulo} [${s.completada ? 'OK' : 'PENDIENTE'}]: ${s.resumen}`
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

        setMensajeEstado('Archivo Reporte_CTI_Ficha_F11_AegisHealth.pdf descargado.');
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
        setMensajeEstado('Historial exportado en formato CSV.');
    };

    const handleVerificarHashChain = async () => {
        const res = await verificarCadenaAuditoriaApi(registrosAuditoria);
        setCadenaVerificada(res.valida);
        setMensajeEstado(
            res.valida
                ? 'Integridad confirmada: ningún registro de auditoría fue alterado.'
                : 'Advertencia: discrepancia detectada en los enlaces de verificación.'
        );
    };

    return (
        <section className="space-y-4 text-slate-900">
            {/* Centro Ficha F-11 */}
            <div className="rounded-xs border border-slate-300 border-l-4 border-l-teal-600 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                            <DocumentCheckIcon className="h-3.5 w-3.5 text-slate-700" />
                            <span>FICHA F-11 · {completadas}/{secciones.length} SECCIONES LISTAS</span>
                        </div>
                        <h3 className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">
                            Informe final para entrega (8 secciones)
                        </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRegenerarConclusion}
                            disabled={regenerando}
                            className="rounded-xs border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:opacity-50"
                        >
                            {regenerando ? 'Generando...' : 'Sugerir conclusión (IA local)'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDescargarPdf}
                            className="inline-flex items-center gap-1.5 rounded-xs border border-teal-600 bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:border-teal-700 hover:bg-teal-700"
                        >
                            <DownloadIcon className="h-3.5 w-3.5" />
                            Descargar PDF F-11
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-slate-300 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                    <div className="divide-y divide-slate-300 lg:col-span-5">
                        {secciones.map((sec) => {
                            const activa = sec.numero === seccionActivaNum;
                            return (
                                <button
                                    key={sec.numero}
                                    type="button"
                                    onClick={() => setSeccionActivaNum(sec.numero)}
                                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs transition-colors ${
                                        activa
                                            ? 'border-l-4 border-l-teal-600 bg-teal-50 font-bold text-slate-900'
                                            : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="tabular-nums">
                                        {sec.numero}. {sec.titulo}
                                    </span>
                                    <span className="rounded-xs border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-800">
                                        {sec.completada ? 'OK' : 'PEND'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-3 p-4 lg:col-span-7">
                        {seccionActual && (
                            <div className="rounded-xs border border-slate-300 border-l-4 border-l-teal-600 bg-slate-50 p-3">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
                                    Sección {seccionActual.numero} de 8
                                </span>
                                <h4 className="mt-0.5 text-sm font-semibold text-slate-900">
                                    {seccionActual.titulo}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                                    {seccionActual.resumen}
                                </p>
                                {esTecnico && detalleTecnicoSeccion[seccionActual.numero] && (
                                    <p className="mt-2 border-t border-slate-300 pt-2 text-xs text-slate-700">
                                        {detalleTecnicoSeccion[seccionActual.numero]}
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="editor-conclusion"
                                className="block text-xs font-medium text-slate-700"
                            >
                                Conclusión final (editable antes de descargar el PDF)
                            </label>
                            <textarea
                                id="editor-conclusion"
                                rows={4}
                                value={conclusionActual}
                                onChange={(e) => setConclusionActual(e.target.value)}
                                className="mt-1.5 w-full rounded-xs border border-slate-300 bg-white p-2.5 text-xs leading-relaxed text-slate-900 focus:border-slate-500 focus:outline-none"
                            />
                        </div>

                        {mensajeEstado && (
                            <div className="flex items-center gap-2 rounded-xs border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{mensajeEstado}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Auditoría: resumen compacto en simple, tabla completa en Detalle técnico */}
            {!esTecnico ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-slate-300 border-l-4 border-l-teal-600 bg-white px-4 py-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2.5">
                        <ShieldIcon className="h-4 w-4 text-emerald-700" />
                        <span>
                            <strong className="text-slate-900">Registro de auditoría:</strong> {registrosAuditoria.length} acciones guardadas con verificación de integridad intacta.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleVerificarHashChain}
                            className="rounded-xs border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-800 transition-colors hover:bg-emerald-100"
                        >
                            Verificar integridad
                        </button>
                        <button
                            type="button"
                            onClick={handleExportarAuditoriaCsv}
                            className="rounded-xs border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
                        >
                            Exportar historial (CSV)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="rounded-xs border border-slate-300 border-t-4 border-t-teal-600 bg-white">
                    <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Bitácora de auditoría inmutable (cti_audit)
                            </h3>
                            <span
                                className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 font-mono text-[11px] ${
                                    cadenaVerificada
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                        : 'border-rose-300 bg-rose-50 text-rose-800'
                                }`}
                            >
                                <ShieldIcon className="h-3 w-3" />
                                {cadenaVerificada ? 'SHA-256: ÍNTEGRO' : 'SHA-256: REVISAR'}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                            <input
                                type="search"
                                value={filtroAuditoria}
                                onChange={(e) => setFiltroAuditoria(e.target.value)}
                                placeholder="Filtrar registros..."
                                className="rounded-xs border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleVerificarHashChain}
                                className="rounded-xs border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-800 transition-colors hover:bg-emerald-100"
                            >
                                Verificar integridad
                            </button>
                            <button
                                type="button"
                                onClick={handleExportarAuditoriaCsv}
                                className="rounded-xs border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
                            >
                                Exportar historial (CSV)
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-700">
                                <tr>
                                    <th className="px-3 py-2">ID</th>
                                    <th className="px-3 py-2">Timestamp</th>
                                    <th className="px-3 py-2">Evento</th>
                                    <th className="px-3 py-2">Actor</th>
                                    <th className="px-3 py-2">Detalle</th>
                                    <th className="px-3 py-2">Hash Chain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 text-slate-700">
                                {registrosFiltrados.map((reg) => (
                                    <tr key={reg.id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-3 py-2 font-mono text-slate-900">{reg.id}</td>
                                        <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-slate-600">
                                            {reg.timestamp}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-900">
                                            {reg.tipoEvento}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-900">
                                            {reg.actorToken}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">{reg.detalle}</td>
                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] tabular-nums text-slate-600">
                                            {reg.hashPrevio.slice(0, 8)} → {reg.hashActual.slice(0, 8)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
};
