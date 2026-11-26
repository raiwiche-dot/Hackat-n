import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
    CampanaDetalle,
    CampanaId,
} from '../mocks/mockData';
import { enviarRevelacionBreakGlassApi } from '../services/apiClient';

interface TimelinePageProps {
    campanas: CampanaDetalle[];
    onRegistrarBreakGlass: (analistaId: string, motivo: string, campanaId: CampanaId) => void;
}

const titulosHumanosAccion: Record<string, string> = {
    SSH_TUNNEL_INIT: 'Ingreso mediante túnel SSH hacia la red interna',
    MED_RECORD_QUERY_BURST: 'Consultas rápidas y masivas de historias clínicas',
    BULK_EXPORT_STAGED: 'Empaquetado de datos en directorio temporal',
    EGRESS_8443_TCP: 'Envío de datos hacia IP externa (186.46.219.18:8443)',
    PRIVILEGED_SESSION_REUSE: 'Reutilización de sesión privilegiada desde otro origen',
    AUTH_FAIL_BURST: 'Múltiples intentos fallidos antes de lograr acceso',
    OFF_HOURS_MED_READ: 'Lectura de registros médicos durante la madrugada',
    INTERNAL_PROBE_SEQ: 'Exploración secuencial de rutas internas del sistema médico',
};

const badgeSeveridad: Record<string, { clase: string; texto: string }> = {
    CRITICA: { clase: 'bg-red-50 text-red-700 border-red-200', texto: 'Severidad crítica' },
    ALTA: { clase: 'bg-amber-50 text-amber-800 border-amber-200', texto: 'Severidad alta' },
    MEDIA: { clase: 'bg-blue-50 text-blue-800 border-blue-200', texto: 'Severidad media' },
    BAJA: { clase: 'bg-slate-100 text-slate-700 border-slate-200', texto: 'Severidad baja' },
};

export const TimelinePage = ({
    campanas,
    onRegistrarBreakGlass,
}: TimelinePageProps) => {
    const [campanaSeleccionadaId, setCampanaSeleccionadaId] =
        useState<CampanaId>('CAMP-2026-001');
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroCarril, setFiltroCarril] = useState<'TODOS' | 'FIREWALL' | 'MEDSYS'>('TODOS');
    const [modoVista, setModoVista] = useState<'carriles' | 'tabla'>('carriles');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [identificadorAnalista, setIdentificadorAnalista] = useState('');
    const [motivoAuditoria, setMotivoAuditoria] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [breakGlassActivo, setBreakGlassActivo] = useState(false);
    const [mensajeAuditoria, setMensajeAuditoria] = useState('');

    const campanaActual =
        campanas.find((c) => c.id === campanaSeleccionadaId) ?? campanas[0];

    const eventosFiltrados = campanaActual.eventos.filter((ev) => {
        if (filtroCarril !== 'TODOS' && ev.carril !== filtroCarril) {
            return false;
        }
        const q = filtroTexto.trim().toLowerCase();
        if (!q) return true;
        const tituloHumano = (titulosHumanosAccion[ev.accion] ?? '').toLowerCase();
        return (
            tituloHumano.includes(q) ||
            ev.accion.toLowerCase().includes(q) ||
            ev.detalle.toLowerCase().includes(q) ||
            ev.usuarioToken.toLowerCase().includes(q) ||
            ev.cuentaToken.toLowerCase().includes(q) ||
            (breakGlassActivo && ev.cuentaTecnicaReal.toLowerCase().includes(q))
        );
    });

    useEffect(() => {
        if (!modalAbierto) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setModalAbierto(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [modalAbierto]);

    const handleConfirmarBreakGlass = async (e: FormEvent) => {
        e.preventDefault();
        const analystId = identificadorAnalista.trim();
        const reason = motivoAuditoria.trim();

        if (!analystId) {
            setErrorModal('Por favor ingresa tu identificador de analista.');
            return;
        }
        if (reason.length < 10) {
            setErrorModal('Explica el motivo de la revisión (mínimo 10 caracteres).');
            return;
        }

        await enviarRevelacionBreakGlassApi({
            analystId,
            reason,
            campanaId: campanaActual.id,
        });

        onRegistrarBreakGlass(analystId, reason, campanaActual.id);
        setBreakGlassActivo(true);
        setModalAbierto(false);
        setErrorModal('');
        setMensajeAuditoria(
            `Acceso autorizado y registrado en bitácora por ${analystId} para ${campanaActual.id}. Ahora puedes ver la cuenta técnica involucrada.`
        );
    };

    const handleOcultarIdentidades = () => {
        setBreakGlassActivo(false);
        setMensajeAuditoria(
            'Privacidad restablecida: las cuentas vuelven a mostrarse protegidas con códigos LOPDP.'
        );
    };

    return (
        <section className="space-y-5">
            {/* Encabezado explicativo + selector de campañas */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                                Reconstrucción cronológica de las campañas
                            </h1>
                            {campanaActual.clockSkewAdjusted && (
                                <span
                                    title="Se alineó una diferencia de 12 horas entre los relojes del firewall y del sistema médico."
                                    className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                                >
                                    Relojes sincronizados (+12h entre fuentes)
                                </span>
                            )}
                        </div>

                        <p className="max-w-3xl text-sm text-slate-600">
                            Selecciona una campaña para ver cómo se conectaron los eventos del perímetro con la red médica interna.
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <label htmlFor="selector-campana" className="sr-only">
                                Seleccionar campaña
                            </label>
                            <select
                                id="selector-campana"
                                value={campanaActual.id}
                                onChange={(e) => setCampanaSeleccionadaId(e.target.value as CampanaId)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-700 focus:outline-none"
                            >
                                {campanas.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.id} — {c.nombre}
                                    </option>
                                ))}
                            </select>

                            {campanaActual.id === 'CAMP-2026-001' && (
                                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
                                    Todo el ataque ocurrió en <strong>15 segundos</strong> (02:14:01 → 02:14:16)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Control de privacidad Break-Glass */}
                    <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3.5 lg:max-w-xs">
                        <p className="text-xs font-semibold text-slate-900">
                            Privacidad de cuentas (LOPDP)
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                            {breakGlassActivo
                                ? 'Las cuentas técnicas están visibles temporalmente bajo registro de auditoría.'
                                : 'Las identidades aparecen ocultas bajo códigos (ACC-xxxx).'}
                        </p>
                        <div className="mt-2.5">
                            {!breakGlassActivo ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setErrorModal('');
                                        setModalAbierto(true);
                                    }}
                                    className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                    Revelar cuenta responsable (Break-Glass)
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleOcultarIdentidades}
                                    className="w-full rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-900"
                                >
                                    Volver a ocultar cuentas
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pestañas rápidas entre campañas + filtros */}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                        {campanas.map((c) => {
                            const activa = c.id === campanaActual.id;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setCampanaSeleccionadaId(c.id)}
                                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                                        activa
                                            ? 'bg-blue-800 font-semibold text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {c.id}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="search"
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                            placeholder="Buscar paso o detalle..."
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                        />
                        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
                            {(['TODOS', 'FIREWALL', 'MEDSYS'] as const).map((carril) => (
                                <button
                                    key={carril}
                                    type="button"
                                    onClick={() => setFiltroCarril(carril)}
                                    className={`rounded px-2 py-1 font-medium ${
                                        filtroCarril === carril
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600'
                                    }`}
                                >
                                    {carril === 'TODOS'
                                        ? 'Todos'
                                        : carril === 'FIREWALL'
                                            ? 'Firewall'
                                            : 'Sistema médico'}
                                </button>
                            ))}
                        </div>
                        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setModoVista('carriles')}
                                className={`rounded px-2 py-1 font-medium ${
                                    modoVista === 'carriles'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600'
                                }`}
                            >
                                Paso a paso
                            </button>
                            <button
                                type="button"
                                onClick={() => setModoVista('tabla')}
                                className={`rounded px-2 py-1 font-medium ${
                                    modoVista === 'tabla'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600'
                                }`}
                            >
                                Tabla
                            </button>
                        </div>
                    </div>
                </div>

                {mensajeAuditoria && (
                    <div
                        className={`mt-3 rounded-md border px-3.5 py-2 text-xs ${
                            breakGlassActivo
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        {mensajeAuditoria}
                    </div>
                )}
            </div>

            {/* Vista Paso a paso o Tabla */}
            {modoVista === 'tabla' ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold">Hora</th>
                                <th className="px-4 py-2.5 font-semibold">Dónde ocurrió</th>
                                <th className="px-4 py-2.5 font-semibold">Qué pasó</th>
                                <th className="px-4 py-2.5 font-semibold">Cuenta</th>
                                <th className="px-4 py-2.5 font-semibold">Nivel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {eventosFiltrados.map((ev) => {
                                const cuentaMostrada = breakGlassActivo
                                    ? ev.cuentaTecnicaReal
                                    : ev.cuentaToken;
                                const sev = badgeSeveridad[ev.severidad] ?? badgeSeveridad.MEDIA;
                                return (
                                    <tr key={ev.id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-900">
                                            {ev.timestamp}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                            {ev.carril === 'FIREWALL' ? 'Firewall perimetral' : 'Sistema médico'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900">
                                                {titulosHumanosAccion[ev.accion] ?? ev.accion}
                                            </p>
                                            <p className="text-slate-600">{ev.detalle}</p>
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-4 py-3 font-mono ${
                                                breakGlassActivo ? 'font-bold text-red-700' : 'text-blue-800'
                                            }`}
                                        >
                                            {cuentaMostrada}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${sev.clase}`}>
                                                {sev.texto}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
                    <div className="mb-4 grid grid-cols-1 gap-3 border-b border-slate-200 pb-3 md:grid-cols-2">
                        <div className="rounded-md bg-blue-50/70 px-3.5 py-2">
                            <h2 className="text-xs font-bold uppercase tracking-wide text-blue-900">
                                1. Perímetro externo (Firewall)
                            </h2>
                            <p className="text-[11px] text-slate-600">
                                Conexiones de entrada y salida registradas en Registros_conexiones_FW_10_2026
                            </p>
                        </div>
                        <div className="rounded-md bg-slate-100 px-3.5 py-2">
                            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                2. Red clínica interna (Sistema médico)
                            </h2>
                            <p className="text-[11px] text-slate-600">
                                Consultas y movimientos internos sobre registros clínicos sintéticos
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {eventosFiltrados.map((ev, idx) => {
                            const esFirewall = ev.carril === 'FIREWALL';
                            const cuentaMostrada = breakGlassActivo
                                ? ev.cuentaTecnicaReal
                                : ev.cuentaToken;
                            const sev = badgeSeveridad[ev.severidad] ?? badgeSeveridad.MEDIA;

                            const tarjeta = (
                                <article className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                                                {idx + 1}
                                            </span>
                                            <span className="font-mono font-semibold text-slate-800">
                                                {ev.timestamp}
                                            </span>
                                        </div>
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sev.clase}`}>
                                            {sev.texto}
                                        </span>
                                    </div>

                                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                                        {titulosHumanosAccion[ev.accion] ?? ev.accion}
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                        {ev.detalle}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-500">
                                            Evento: {ev.accion}
                                        </span>
                                        <span className="rounded bg-white px-2 py-0.5 font-mono text-slate-700">
                                            Usuario: {ev.usuarioToken}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-0.5 font-mono ${
                                                breakGlassActivo
                                                    ? 'bg-red-100 font-bold text-red-800'
                                                    : 'bg-blue-50 font-semibold text-blue-800'
                                            }`}
                                        >
                                            {breakGlassActivo ? 'Cuenta real: ' : 'Código cuenta: '}
                                            {cuentaMostrada}
                                        </span>
                                    </div>
                                </article>
                            );

                            return (
                                <div key={ev.id} className="grid grid-cols-1 items-center gap-3 md:grid-cols-2">
                                    <div>
                                        {esFirewall ? (
                                            tarjeta
                                        ) : (
                                            <div className="hidden justify-end pr-4 text-xs text-slate-400 md:flex">
                                                <span>Pasa a la red clínica →</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {!esFirewall ? (
                                            tarjeta
                                        ) : (
                                            <div className="hidden justify-start pl-4 text-xs text-slate-400 md:flex">
                                                <span>← Registrado en el perímetro</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {eventosFiltrados.length === 0 && (
                            <p className="py-6 text-center text-xs text-slate-500">
                                No hay pasos que coincidan con tu búsqueda.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Break-Glass */}
            {modalAbierto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="titulo-break-glass"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setModalAbierto(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
                        <h3 id="titulo-break-glass" className="text-base font-bold text-slate-900">
                            Solicitar acceso a cuenta técnica ({campanaActual.id})
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            Por cumplimiento de privacidad, toda revelación de identidad queda registrada en la bitácora de auditoría.
                        </p>

                        <form onSubmit={handleConfirmarBreakGlass} className="mt-4 space-y-3.5">
                            <div>
                                <label
                                    htmlFor="analista-id"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Tu nombre o código de analista
                                </label>
                                <input
                                    id="analista-id"
                                    type="text"
                                    autoFocus
                                    value={identificadorAnalista}
                                    onChange={(e) => setIdentificadorAnalista(e.target.value)}
                                    placeholder="Ej. ANALISTA-01"
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="motivo-auditoria"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    ¿Por qué necesitas ver esta cuenta? (mín. 10 caracteres)
                                </label>
                                <textarea
                                    id="motivo-auditoria"
                                    rows={3}
                                    value={motivoAuditoria}
                                    onChange={(e) => setMotivoAuditoria(e.target.value)}
                                    placeholder="Ej. Confirmar cuenta de servicio involucrada en la salida por puerto 8443..."
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                                />
                            </div>

                            {errorModal && (
                                <p className="text-xs font-medium text-red-700">{errorModal}</p>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(false)}
                                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
                                >
                                    Confirmar y registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};
