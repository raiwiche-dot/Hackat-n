import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
    CampanaDetalle,
    CampanaId,
} from '../mocks/mockData';
import { enviarRevelacionBreakGlassApi } from '../services/apiClient';
import { EyeIcon, LockIcon, TimelineIcon } from '../components/AppIcons';

interface TimelinePageProps {
    campanas: CampanaDetalle[];
    modoLectura?: 'simple' | 'tecnico';
    onRegistrarBreakGlass: (analistaId: string, motivo: string, campanaId: CampanaId) => void;
}

const titulosOperativosAccion: Record<string, string> = {
    SSH_TUNNEL_INIT: 'Ingreso por túnel SSH hacia la red interna',
    MED_RECORD_QUERY_BURST: 'Consultas rápidas y masivas sobre registros clínicos',
    BULK_EXPORT_STAGED: 'Empaquetado de datos en directorio temporal local',
    EGRESS_8443_TCP: 'Salida de datos hacia destino externo (186.46.219.18:8443)',
    PRIVILEGED_SESSION_REUSE: 'Reutilización de sesión privilegiada desde otro origen',
    AUTH_FAIL_BURST: 'Múltiples intentos fallidos previos a un acceso válido',
    OFF_HOURS_MED_READ: 'Lectura de registros médicos fuera del horario regular',
    INTERNAL_PROBE_SEQ: 'Exploración secuencial hacia la subred del sistema médico',
};

const badgeSeveridad: Record<string, string> = {
    CRITICA: 'border-rose-300 bg-rose-50 text-rose-700',
    ALTA: 'border-amber-300 bg-amber-50 text-amber-700',
    MEDIA: 'border-slate-300 bg-slate-50 text-slate-600',
    BAJA: 'border-slate-200 bg-white text-slate-400',
};

export const TimelinePage = ({
    campanas,
    modoLectura = 'simple',
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

    const esTecnico = modoLectura === 'tecnico';

    const eventosFiltrados = campanaActual.eventos.filter((ev) => {
        if (esTecnico && filtroCarril !== 'TODOS' && ev.carril !== filtroCarril) {
            return false;
        }
        const q = filtroTexto.trim().toLowerCase();
        if (!q || !esTecnico) return true;
        const tituloOperativo = (titulosOperativosAccion[ev.accion] ?? '').toLowerCase();
        return (
            tituloOperativo.includes(q) ||
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
            setErrorModal('Ingrese el identificador del analista.');
            return;
        }
        if (reason.length < 10) {
            setErrorModal('El motivo debe tener al menos 10 caracteres.');
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
            `Acceso registrado en auditoría por ${analystId} para ${campanaActual.id}.`
        );
    };

    const handleOcultarIdentidades = () => {
        setBreakGlassActivo(false);
        setMensajeAuditoria('Seudonimización LOPDP restablecida (códigos ACC- activos).');
    };

    return (
        <section className="space-y-5 text-slate-900">
            {/* Selector de las 5 campañas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {campanas.map((c) => {
                    const activa = c.id === campanaActual.id;
                    const esCritica = c.id === 'CAMP-2026-001';
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCampanaSeleccionadaId(c.id)}
                            className={`rounded-sm border p-3 text-left transition-all duration-150 shadow-xs ${
                                activa
                                    ? 'border-teal-300 border-l-4 border-l-teal-600 bg-teal-50 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/40'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1 font-mono text-[11px]">
                                <span className={`font-bold ${activa ? 'text-teal-800' : 'text-slate-600'}`}>{c.id}</span>
                                <span
                                    className={`rounded-xs border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                        esCritica
                                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-500'
                                    }`}
                                >
                                    {c.eventos.length} {c.eventos.length === 1 ? 'paso' : 'pasos'}
                                </span>
                            </div>
                            <p className={`mt-1.5 line-clamp-2 text-xs font-semibold ${activa ? 'text-teal-800' : 'text-slate-700'}`}>
                                {c.nombre}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Cabecera de campaña + Break-Glass */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-xs border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                                {campanaActual.id}
                            </span>
                            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                                {campanaActual.nombre}
                            </h2>
                            {campanaActual.clockSkewAdjusted && (
                                <span className="inline-flex items-center gap-1 rounded-xs border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700">
                                    <TimelineIcon className="h-3 w-3" />
                                    Ajuste de reloj +12 h
                                </span>
                            )}
                        </div>

                        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                            {campanaActual.descripcion}
                        </p>
                    </div>

                    {/* Bloque LOPDP + Break-Glass */}
                    <div className="shrink-0 rounded-sm border border-slate-200 border-l-4 border-l-teal-600 bg-slate-50 p-4 lg:w-72">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            {breakGlassActivo ? (
                                <EyeIcon className="h-4 w-4 text-rose-600" />
                            ) : (
                                <LockIcon className="h-4 w-4 text-teal-600" />
                            )}
                            Privacidad LOPDP
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {breakGlassActivo
                                ? 'Cuentas técnicas visibles bajo auditoría.'
                                : 'Identidades protegidas con códigos ACC-.'}
                        </p>
                        <div className="mt-3">
                            {!breakGlassActivo ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setErrorModal('');
                                        setModalAbierto(true);
                                    }}
                                    className="w-full rounded-sm border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
                                >
                                    Revelar cuentas (Break-Glass)
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleOcultarIdentidades}
                                    className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                    Ocultar cuentas
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filtros técnicos */}
                {esTecnico && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="search"
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                                placeholder="Filtrar acción, código o detalle..."
                                className="rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                            />
                            <div className="inline-flex rounded-sm border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                                {(['TODOS', 'FIREWALL', 'MEDSYS'] as const).map((carril) => (
                                    <button
                                        key={carril}
                                        type="button"
                                        onClick={() => setFiltroCarril(carril)}
                                        className={`rounded-xs px-2.5 py-1 font-semibold transition-colors ${
                                            filtroCarril === carril
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {carril}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="inline-flex self-start rounded-sm border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setModoVista('carriles')}
                                className={`rounded-xs px-2.5 py-1 font-semibold transition-colors ${
                                    modoVista === 'carriles'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Carriles
                            </button>
                            <button
                                type="button"
                                onClick={() => setModoVista('tabla')}
                                className={`rounded-xs px-2.5 py-1 font-semibold transition-colors ${
                                    modoVista === 'tabla'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Tabla
                            </button>
                        </div>
                    </div>
                )}

                {mensajeAuditoria && (
                    <div
                        className={`mt-3 rounded-sm border px-3 py-2 text-xs font-semibold ${
                            breakGlassActivo
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-teal-200 bg-teal-50 text-teal-700'
                        }`}
                    >
                        {mensajeAuditoria}
                    </div>
                )}
            </div>

            {/* Vista simple: tarjetas ordenadas */}
            {!esTecnico ? (
                <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                    <h3 className="mb-4 border-b border-slate-100 pb-2 text-base font-bold text-slate-900">
                        Qué ocurrió en orden ({eventosFiltrados.length} pasos)
                    </h3>
                    <ol className="relative space-y-3 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-teal-200 sm:before:left-[21px]">
                        {eventosFiltrados.map((ev, idx) => {
                            const cuentaMostrada = breakGlassActivo
                                ? ev.cuentaTecnicaReal
                                : ev.cuentaToken;
                            const esCritica = ev.severidad === 'CRITICA';
                            const borderAccent = esCritica
                                ? 'border-l-4 border-l-rose-500'
                                : ev.severidad === 'ALTA'
                                    ? 'border-l-4 border-l-amber-500'
                                    : 'border-l-4 border-l-teal-300';
                            return (
                                <li
                                    key={ev.id}
                                    className={`relative ml-9 rounded-sm border border-slate-200 bg-slate-50 p-4 text-sm shadow-xs sm:ml-11 ${borderAccent}`}
                                >
                                    {/* Top row */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-xs border border-teal-300 bg-teal-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-teal-700">
                                                Paso {idx + 1}
                                            </span>
                                            <span className="font-mono text-xs tabular-nums text-slate-600">
                                                {ev.timestamp}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {ev.carril === 'FIREWALL' ? 'Red externa (Firewall)' : 'Sistema clínico'}
                                            </span>
                                        </div>
                                        <span
                                            className={`rounded-xs border px-2.5 py-0.5 font-mono text-xs font-bold ${
                                                badgeSeveridad[ev.severidad] ?? badgeSeveridad.MEDIA
                                            }`}
                                        >
                                            {ev.severidad}
                                        </span>
                                    </div>
                                    {/* Título */}
                                    <p className="mt-2 text-sm font-bold text-slate-900">
                                        {titulosOperativosAccion[ev.accion] ?? ev.accion}
                                    </p>
                                    {/* Descripción */}
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{ev.detalle}</p>
                                    {/* Identificador */}
                                    <p className="mt-2 font-mono text-[11px] text-slate-400">
                                        Identificador:{' '}
                                        <span className="text-slate-600">{ev.usuarioToken}</span>
                                        {' · '}
                                        <span className={breakGlassActivo ? 'font-bold text-rose-700' : 'text-slate-600'}>
                                            {cuentaMostrada}
                                        </span>
                                    </p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            ) : modoVista === 'tabla' ? (
                <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Timestamp</th>
                                <th className="px-3 py-2 font-semibold">Fuente</th>
                                <th className="px-3 py-2 font-semibold">Acción y detalle</th>
                                <th className="px-3 py-2 font-semibold">Identidad</th>
                                <th className="px-3 py-2 font-semibold">Severidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {eventosFiltrados.map((ev) => (
                                <tr key={ev.id} className="transition-colors hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-800">
                                        {ev.timestamp}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">
                                        {ev.carril}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <p className="font-semibold text-slate-900">
                                            {titulosOperativosAccion[ev.accion] ?? ev.accion}
                                        </p>
                                        <p className="mt-0.5 text-slate-500">
                                            <code className="text-slate-600">{ev.accion}</code> · {ev.detalle}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700">
                                        {breakGlassActivo
                                            ? ev.cuentaTecnicaReal
                                            : `${ev.usuarioToken} / ${ev.cuentaToken}`}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                                        <span
                                            className={`rounded-xs border px-2 py-0.5 text-[11px] font-bold ${
                                                badgeSeveridad[ev.severidad] ?? badgeSeveridad.MEDIA
                                            }`}
                                        >
                                            {ev.severidad}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="mb-4 grid grid-cols-1 gap-3 border-b border-slate-100 pb-3 md:grid-cols-2">
                        <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                                FIREWALL (Perímetro)
                            </h3>
                        </div>
                        <div className="rounded-sm border border-teal-200 bg-teal-50 px-3 py-2">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-teal-700">
                                MEDSYS (Sistema clínico)
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {eventosFiltrados.map((ev, idx) => {
                            const esFirewall = ev.carril === 'FIREWALL';
                            const cuentaMostrada = breakGlassActivo
                                ? ev.cuentaTecnicaReal
                                : ev.cuentaToken;

                            const tarjeta = (
                                <article className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-xs border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-teal-700">
                                                Paso {idx + 1}
                                            </span>
                                            <span className="tabular-nums text-slate-600">
                                                {ev.timestamp}
                                            </span>
                                        </div>
                                        <span
                                            className={`rounded-xs border px-2 py-0.5 text-[11px] font-bold ${
                                                badgeSeveridad[ev.severidad] ?? badgeSeveridad.MEDIA
                                            }`}
                                        >
                                            {ev.severidad}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs font-bold text-slate-900">
                                        {titulosOperativosAccion[ev.accion] ?? ev.accion}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">{ev.detalle}</p>
                                    <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px]">
                                        <span className="rounded-xs border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
                                            {ev.accion}
                                        </span>
                                        <span className="rounded-xs border border-slate-200 bg-white px-2 py-0.5 text-slate-700">
                                            {ev.usuarioToken}
                                        </span>
                                        <span
                                            className={`rounded-xs border px-2 py-0.5 ${
                                                breakGlassActivo
                                                    ? 'border-rose-200 bg-rose-50 font-bold text-rose-700'
                                                    : 'border-slate-200 bg-white text-slate-700'
                                            }`}
                                        >
                                            {cuentaMostrada}
                                        </span>
                                    </div>
                                </article>
                            );

                            return (
                                <div key={ev.id} className="grid grid-cols-1 items-center gap-3 md:grid-cols-2">
                                    <div>{esFirewall ? tarjeta : null}</div>
                                    <div>{!esFirewall ? tarjeta : null}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal Break-Glass */}
            {modalAbierto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="titulo-break-glass"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setModalAbierto(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-6 shadow-lg">
                        <h3 id="titulo-break-glass" className="text-base font-bold text-slate-900">
                            Autorización Break-Glass ({campanaActual.id})
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Revela temporalmente las cuentas técnicas y registra la consulta en auditoría.
                        </p>

                        <form onSubmit={handleConfirmarBreakGlass} className="mt-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="analista-id"
                                    className="block text-sm font-semibold text-slate-700"
                                >
                                    Identificador del analista
                                </label>
                                <input
                                    id="analista-id"
                                    type="text"
                                    autoFocus
                                    value={identificadorAnalista}
                                    onChange={(e) => setIdentificadorAnalista(e.target.value)}
                                    placeholder="ANALISTA-01"
                                    className="mt-1.5 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="motivo-auditoria"
                                    className="block text-sm font-semibold text-slate-700"
                                >
                                    Motivo de la revisión (mínimo 10 caracteres)
                                </label>
                                <textarea
                                    id="motivo-auditoria"
                                    rows={3}
                                    value={motivoAuditoria}
                                    onChange={(e) => setMotivoAuditoria(e.target.value)}
                                    placeholder="Describa la razón de la consulta..."
                                    className="mt-1.5 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            {errorModal && (
                                <p className="text-sm font-semibold text-rose-600">{errorModal}</p>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setModalAbierto(false)}
                                    className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-sm border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
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
