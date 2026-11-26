import { useState } from 'react';
import type {
    EscenarioIpe,
    EvidenciaIngesta,
    PuntoHorario,
} from '../mocks/mockData';

interface DashboardPageProps {
    evidencia: EvidenciaIngesta;
    serieHoraria: PuntoHorario[];
    escenarios: EscenarioIpe[];
    onIrAuditoria: () => void;
}

const planAccionPriorizado = [
    {
        paso: '1',
        urgencia: 'Hoy mismo',
        responsable: 'Redes y Firewall',
        accion: 'Bloquear salida hacia 186.46.219.18:8443',
        razon: 'Cortar de inmediato el canal de exfiltración observado en la campaña crítica (CAMP-2026-001).',
    },
    {
        paso: '2',
        urgencia: 'Esta semana',
        responsable: 'Identidades y TI',
        accion: 'Restringir horarios y exigir MFA en cuentas especiales',
        razon: 'Todas las conexiones anómalas sin puntaje previo se originaron desde cuentas técnicas o de servicio.',
    },
    {
        paso: '3',
        urgencia: 'Continuo',
        responsable: 'Equipo SOC / Defensa',
        accion: 'Activar reglas Sigma (IoA + IoC) e importar STIX en MISP',
        razon: 'Detectar la secuencia completa (consulta masiva + egreso en 15s) aunque cambie la IP de destino.',
    },
];

export const DashboardPage = ({
    evidencia,
    serieHoraria,
    escenarios,
    onIrAuditoria,
}: DashboardPageProps) => {
    const picoInicial = serieHoraria.reduce(
        (maxIdx, item, idx, arr) => (item.anomalias > arr[maxIdx].anomalias ? idx : maxIdx),
        0
    );
    const [indiceActivo, setIndiceActivo] = useState<number>(picoInicial);
    const [hashCopiado, setHashCopiado] = useState(false);

    const maxBarra = Math.max(
        ...serieHoraria.flatMap((p) => [p.firewallEventos, p.medSysEventos]),
        1
    );
    const techoEscala = Math.ceil(maxBarra / 500) * 500;

    const anchoSvg = 700;
    const altoSvg = 220;
    const padIzq = 48;
    const padDer = 16;
    const padTop = 26;
    const padBot = 30;
    const areaW = anchoSvg - padIzq - padDer;
    const areaH = altoSvg - padTop - padBot;

    const ticksY = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
        valor: Math.round(techoEscala * r),
        y: padTop + areaH - r * areaH,
    }));

    const anchoGrupo = serieHoraria.length > 0 ? areaW / serieHoraria.length : areaW;
    const anchoBarra = Math.min(20, Math.max(11, anchoGrupo * 0.26));
    const puntoActivo = serieHoraria[indiceActivo] ?? serieHoraria[0];

    const handleCopiarHash = async () => {
        try {
            await navigator.clipboard.writeText(evidencia.sha256Dataset);
            setHashCopiado(true);
            setTimeout(() => setHashCopiado(false), 1800);
        } catch {
            setHashCopiado(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* Hallazgo principal contado en lenguaje claro */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-semibold text-red-700">
                                Hallazgo prioritario
                            </span>
                            <span className="text-slate-500">
                                Análisis local sobre {evidencia.totalEventos.toLocaleString('es-EC')} registros sintéticos
                            </span>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Detectamos una extracción de datos en 15 segundos hacia la IP externa 186.46.219.18:8443
                        </h1>
                        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                            Al cruzar los registros de <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-blue-800">Registros_conexiones_FW_10_2026</code> con el sistema médico de práctica, el modelo local identificó <strong>5 campañas sospechosas</strong> (3 de ellas sin reglas previas).
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                            <span>Integridad del conjunto analizado:</span>
                            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                                SHA-256: {evidencia.sha256Dataset.slice(0, 14)}…{evidencia.sha256Dataset.slice(-8)}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopiarHash}
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                                {hashCopiado ? 'Copiado' : 'Copiar huella'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onIrAuditoria}
                        className="shrink-0 self-start rounded-lg bg-blue-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-900 sm:text-sm lg:self-center"
                    >
                        Abrir informe final (F-11) →
                    </button>
                </div>
            </div>

            {/* 4 cifras clave entendibles por cualquier perfil */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Eventos revisados</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                        {evidencia.totalEventos.toLocaleString('es-EC')}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        {(evidencia.eventosFirewall / 1_000_000).toFixed(2)}M del firewall y{' '}
                        {(evidencia.eventosSistemaMedico / 1_000_000).toFixed(2)}M de la red médica.
                    </p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Campañas sospechosas</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                        {evidencia.campanasCorrelacionadas} campañas
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                        {evidencia.deteccionSoloMlSinReglas} fueron descubiertas por IA local sin reglas previas.
                    </p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Cuentas especiales en riesgo</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                        {evidencia.ipsSinPuntosDetectadas.toLocaleString('es-EC')} orígenes
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        El 100% corresponde a cuentas técnicas o de servicio sin monitoreo habitual.
                    </p>
                </article>

                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Protección de privacidad (LOPDP)</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-700">
                        {evidencia.cumplimientoLopdp} protegida
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        {evidencia.piiExpuesta} datos personales reales expuestos · Auditoría verificada.
                    </p>
                </article>
            </div>

            {/* Gráfico horario con explicación humana */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            ¿A qué hora ocurren las alertas?
                        </h2>
                        <p className="text-xs text-slate-600">
                            El uso clínico normal ocurre entre las 09:00 y 15:00, pero las anomalías más altas aparecen en la madrugada (03:00) y noche (21:00).
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-blue-700" />
                            Firewall
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-slate-400" />
                            Sistema médico
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                            Pico de alerta (≥ 15)
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="overflow-x-auto lg:col-span-2">
                        <svg
                            viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
                            className="h-56 w-full min-w-[500px]"
                            role="img"
                            aria-label="Actividad por franja horaria y alertas"
                        >
                            {ticksY.map((t) => (
                                <g key={t.valor}>
                                    <line
                                        x1={padIzq}
                                        y1={t.y}
                                        x2={anchoSvg - padDer}
                                        y2={t.y}
                                        stroke={t.valor === 0 ? '#cbd5e1' : '#f1f5f9'}
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={padIzq - 8}
                                        y={t.y + 3}
                                        textAnchor="end"
                                        fill="#64748b"
                                        fontSize="10"
                                        fontFamily="ui-monospace, Menlo, monospace"
                                    >
                                        {t.valor}
                                    </text>
                                </g>
                            ))}

                            {serieHoraria.map((p, idx) => {
                                const centroX = padIzq + anchoGrupo * idx + anchoGrupo / 2;
                                const fwH = (p.firewallEventos / techoEscala) * areaH;
                                const medH = (p.medSysEventos / techoEscala) * areaH;
                                const maxTopY = padTop + areaH - Math.max(fwH, medH);
                                const seleccionado = idx === indiceActivo;
                                const pico = p.anomalias >= 15;

                                return (
                                    <g
                                        key={p.hora}
                                        className="cursor-pointer"
                                        onClick={() => setIndiceActivo(idx)}
                                    >
                                        {seleccionado && (
                                            <rect
                                                x={padIzq + anchoGrupo * idx + 4}
                                                y={padTop - 4}
                                                width={anchoGrupo - 8}
                                                height={areaH + 8}
                                                fill="#eff6ff"
                                                rx="4"
                                            />
                                        )}

                                        <rect
                                            x={centroX - anchoBarra - 1.5}
                                            y={padTop + areaH - fwH}
                                            width={anchoBarra}
                                            height={Math.max(fwH, 2)}
                                            fill="#1d4ed8"
                                            rx="2"
                                        />
                                        <rect
                                            x={centroX + 1.5}
                                            y={padTop + areaH - medH}
                                            width={anchoBarra}
                                            height={Math.max(medH, 2)}
                                            fill="#94a3b8"
                                            rx="2"
                                        />

                                        <text
                                            x={centroX}
                                            y={Math.max(maxTopY - 7, 14)}
                                            textAnchor="middle"
                                            fill={pico ? '#dc2626' : '#475569'}
                                            fontWeight={pico ? '700' : '500'}
                                            fontSize="10"
                                        >
                                            {p.anomalias} alertas
                                        </text>

                                        <text
                                            x={centroX}
                                            y={altoSvg - 8}
                                            textAnchor="middle"
                                            fill={seleccionado ? '#0f172a' : '#64748b'}
                                            fontWeight={seleccionado ? '700' : '400'}
                                            fontSize="11"
                                            fontFamily="ui-monospace, Menlo, monospace"
                                        >
                                            {p.hora}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Resumen de la hora seleccionada + selector rápido */}
                    <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {puntoActivo && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Franja seleccionada
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            puntoActivo.anomalias >= 15
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        {puntoActivo.anomalias} alertas
                                    </span>
                                </div>
                                <p className="text-xl font-bold text-slate-900">{puntoActivo.hora} hrs</p>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    {puntoActivo.anomalias >= 15
                                        ? 'Concentración inusual fuera del horario laboral. Coincide con accesos nocturnos y pruebas de extracción.'
                                        : 'Volumen dentro del comportamiento habitual de atención clínica.'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                    <div className="rounded border border-slate-200 bg-white p-2">
                                        <span className="block text-[11px] text-slate-500">Firewall</span>
                                        <strong className="font-mono text-slate-900">
                                            {puntoActivo.firewallEventos.toLocaleString('es-EC')}
                                        </strong>
                                    </div>
                                    <div className="rounded border border-slate-200 bg-white p-2">
                                        <span className="block text-[11px] text-slate-500">Sistema médico</span>
                                        <strong className="font-mono text-slate-900">
                                            {puntoActivo.medSysEventos.toLocaleString('es-EC')}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-200 pt-2.5">
                            <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                                Cambiar franja horaria:
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {serieHoraria.map((p, idx) => (
                                    <button
                                        key={p.hora}
                                        type="button"
                                        onClick={() => setIndiceActivo(idx)}
                                        className={`rounded px-2 py-1 font-mono text-[11px] transition ${
                                            idx === indiceActivo
                                                ? 'bg-blue-800 font-semibold text-white'
                                                : p.anomalias >= 15
                                                    ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {p.hora}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Escenarios IPE explicados claramente */}
            <div className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        Evaluación de escenarios (Metodología IPE)
                    </h2>
                    <p className="text-xs text-slate-600">
                        Comparamos el comportamiento más frecuente frente al escenario de mayor impacto para la institución.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {escenarios.map((esc) => {
                        const esPeligroso = esc.id === 'PELIGROSO';
                        const cadenaTexto = esPeligroso
                            ? 'CAMP-2026-005 → CAMP-2026-001 (186.46.219.18:8443) + CAMP-2026-002'
                            : esc.campanasClave;

                        return (
                            <article
                                key={esc.id}
                                className={`rounded-lg border border-slate-200 border-l-4 bg-white p-5 shadow-2xs ${
                                    esPeligroso ? 'border-l-red-600' : 'border-l-amber-500'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-slate-900">
                                        {esc.titulo}
                                    </h3>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            esPeligroso
                                                ? 'bg-red-50 text-red-700'
                                                : 'bg-amber-50 text-amber-800'
                                        }`}
                                    >
                                        {esPeligroso ? 'Mayor impacto' : 'Más frecuente'}
                                    </span>
                                </div>
                                <p className="mt-2 font-mono text-xs text-blue-800">{cadenaTexto}</p>
                                <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                                    {esc.resumen}
                                </p>
                                <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                                    <strong className="text-slate-900">Qué está en juego: </strong>
                                    {esc.impacto}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {/* Plan de acción prioritario (Resultado esperado F-11) */}
            <div className="rounded-lg border border-blue-200 bg-white p-5 shadow-2xs">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                            Resultado esperado · Ficha F-11
                        </span>
                        <h2 className="text-base font-semibold text-slate-900">
                            ¿Qué recomendamos hacer primero?
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {planAccionPriorizado.map((item) => (
                        <div
                            key={item.paso}
                            className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-800 text-xs font-bold text-white">
                                    {item.paso}
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                                    {item.urgencia} · {item.responsable}
                                </span>
                            </div>
                            <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
                                {item.accion}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                {item.razon}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
