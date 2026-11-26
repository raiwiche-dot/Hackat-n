import { useState } from 'react';
import type {
    PerfilAdversario,
    ReglaArtefacto,
} from '../mocks/mockData';

interface ThreatIntelPageProps {
    adversarios: PerfilAdversario[];
    artefactos: ReglaArtefacto[];
    onExportarStix: () => void;
}

const detalleTecnicasMitre: Record<string, { nombre: string; explicacion: string }> = {
    T1213: {
        nombre: 'Extracción de repositorios',
        explicacion: 'Consultas rápidas y masivas sobre bases o historias clínicas.',
    },
    T1074: {
        nombre: 'Preparación de datos',
        explicacion: 'Agrupación de archivos en una carpeta temporal antes de sacarlos.',
    },
    'T1110.001': {
        nombre: 'Adivinación de contraseñas',
        explicacion: 'Intentos repetidos de acceso en ráfaga sobre servicios administrativos.',
    },
    T1078: {
        nombre: 'Uso de cuentas válidas',
        explicacion: 'Acceso mediante credenciales técnicas existentes o reutilizadas.',
    },
    T1098: {
        nombre: 'Manipulación de cuentas',
        explicacion: 'Cambios o abuso de permisos para sostener el acceso.',
    },
    'T1048.002': {
        nombre: 'Exfiltración cifrada (puerto 8443)',
        explicacion: 'Envío de información hacia el exterior fuera de los canales habituales.',
    },
};

const tecnicasMitreReferencia = Object.keys(detalleTecnicasMitre);

const traduccionAdmiralty: Record<string, string> = {
    A2: 'Evidencia muy confiable (A2)',
    B2: 'Evidencia confiable (B2)',
};

const traduccionActor: Record<PerfilAdversario['tipoActor'], string> = {
    HIBRIDO: 'Actúa desde el exterior hacia la red interna',
    EXTERNO: 'Ataque desde el perímetro externo',
    INTERNO: 'Actividad originada dentro de la red',
};

export const ThreatIntelPage = ({
    adversarios,
    artefactos,
    onExportarStix,
}: ThreatIntelPageProps) => {
    const [pestanaYaml, setPestanaYaml] = useState<'IoA' | 'IoC'>('IoA');
    const [reglaSeleccionadaId, setReglaSeleccionadaId] = useState<string>(
        artefactos[0]?.id ?? ''
    );
    const [tecnicaActiva, setTecnicaActiva] = useState<string>('T1048.002');
    const [copiado, setCopiado] = useState(false);
    const [stixMsg, setStixMsg] = useState(false);

    const reglasIoA = artefactos.filter((a) => a.tipo === 'IoA');
    const reglasIoC = artefactos.filter((a) => a.tipo === 'IoC');

    const reglaActiva =
        artefactos.find((a) => a.id === reglaSeleccionadaId && a.tipo === pestanaYaml) ??
        (pestanaYaml === 'IoA' ? reglasIoA[0] : reglasIoC[0]) ??
        artefactos[0];

    const handleSeleccionarRegla = (regla: ReglaArtefacto) => {
        setPestanaYaml(regla.tipo);
        setReglaSeleccionadaId(regla.id);
    };

    const handleCopiarYaml = async () => {
        if (!reglaActiva) return;
        try {
            await navigator.clipboard.writeText(reglaActiva.sigmaYaml);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            setCopiado(false);
        }
    };

    const handleExportarClick = () => {
        onExportarStix();
        setStixMsg(true);
        setTimeout(() => setStixMsg(false), 3200);
    };

    const lineasYaml = reglaActiva ? reglaActiva.sigmaYaml.split('\n') : [];
    const infoTecnica = detalleTecnicasMitre[tecnicaActiva];

    return (
        <section className="space-y-6">
            {/* Encabezado y botón MISP / STIX 2.1 */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                            ¿Quién está detrás y cómo lo detectamos?
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Perfilamiento de adversarios, técnicas usadas y reglas listas para compartir en herramientas libres como MISP (STIX 2.1).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleExportarClick}
                        className="shrink-0 self-start rounded-lg bg-blue-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-900 sm:text-sm lg:self-center"
                    >
                        Exportar para MISP (STIX 2.1)
                    </button>
                </div>

                {stixMsg && (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
                        Se descargó <code>aegishealth_stix_2_1_sintetico.json</code> marcado como dato sintético y se registró en la auditoría.
                    </div>
                )}
            </div>

            {/* Perfiles de Adversarios */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {adversarios.map((adv) => {
                    const nivelPct = Math.round(adv.anomalyScore * 100);
                    return (
                        <article
                            key={adv.id}
                            className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                    {adv.id} · {traduccionActor[adv.tipoActor]}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-800">
                                    {traduccionAdmiralty[adv.calificacionAdmiralty] ?? adv.calificacionAdmiralty}
                                </span>
                            </div>

                            <h2 className="mt-3 text-base font-bold text-slate-900">
                                {adv.nombreClave}
                            </h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                                {adv.resumen}
                            </p>

                            <div className="mt-4 rounded-md bg-slate-50 p-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-700">
                                        Nivel de comportamiento anómalo
                                    </span>
                                    <span className="font-bold text-amber-800">{nivelPct}%</span>
                                </div>
                                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-amber-600"
                                        style={{ width: `${nivelPct}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-500">Técnicas:</span>
                                {adv.tecnicasMitre.map((tec) => (
                                    <button
                                        key={tec}
                                        type="button"
                                        onClick={() => setTecnicaActiva(tec)}
                                        className={`rounded border px-2 py-0.5 font-mono text-xs transition ${
                                            tecnicaActiva === tec
                                                ? 'border-blue-700 bg-blue-800 font-semibold text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {tec}
                                    </button>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* Explicador interactivo de técnicas MITRE */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                        ¿Qué significa cada técnica MITRE?
                    </span>
                    {tecnicasMitreReferencia.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTecnicaActiva(t)}
                            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                                tecnicaActiva === t
                                    ? 'border-blue-700 bg-blue-800 font-semibold text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {infoTecnica && (
                    <p className="mt-2.5 rounded-md bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
                        <strong className="text-slate-900">
                            {tecnicaActiva} — {infoTecnica.nombre}:
                        </strong>{' '}
                        {infoTecnica.explicacion}
                    </p>
                )}
            </div>

            {/* Reglas de detección: IoA (comportamiento) vs IoC (indicador puntual) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-5">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                        <h3 className="text-sm font-bold text-blue-900">
                            IoA · Detectar por comportamiento
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                            Sirve incluso si el atacante cambia de IP, porque vigila la secuencia de acciones.
                        </p>
                        <div className="mt-3 space-y-2">
                            {reglasIoA.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleSeleccionarRegla(r)}
                                    className={`w-full rounded-md border p-3 text-left text-xs transition ${
                                        reglaActiva?.id === r.id
                                            ? 'border-blue-600 bg-blue-50/70'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900">{r.nombre}</p>
                                    <p className="mt-1 text-slate-600">{r.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
                        <h3 className="text-sm font-bold text-amber-900">
                            IoC · Bloqueo puntual inmediato
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                            Bloquea de forma directa la IP y puerto específicos detectados en la evidencia.
                        </p>
                        <div className="mt-3 space-y-2">
                            {reglasIoC.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleSeleccionarRegla(r)}
                                    className={`w-full rounded-md border p-3 text-left text-xs transition ${
                                        reglaActiva?.id === r.id
                                            ? 'border-amber-600 bg-amber-50/70'
                                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900">{r.nombre}</p>
                                    <p className="mt-1 text-slate-600">{r.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Visor de regla Sigma */}
                <div className="flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-900 shadow-2xs lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2.5">
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setPestanaYaml('IoA');
                                    if (reglasIoA[0]) setReglaSeleccionadaId(reglasIoA[0].id);
                                }}
                                className={`rounded px-2.5 py-1 font-semibold ${
                                    pestanaYaml === 'IoA'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                Regla IoA
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPestanaYaml('IoC');
                                    if (reglasIoC[0]) setReglaSeleccionadaId(reglasIoC[0].id);
                                }}
                                className={`rounded px-2.5 py-1 font-semibold ${
                                    pestanaYaml === 'IoC'
                                        ? 'bg-amber-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                Regla IoC
                            </button>
                            {reglaActiva && (
                                <span className="font-mono text-slate-300">
                                    {reglaActiva.id.toLowerCase()}.sigma.yml
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleCopiarYaml}
                            className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600"
                        >
                            {copiado ? 'Copiado' : 'Copiar regla'}
                        </button>
                    </div>

                    <div className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-100">
                        {lineasYaml.map((linea, idx) => (
                            <div key={idx} className="flex">
                                <span className="w-8 shrink-0 select-none pr-3 text-right text-slate-500">
                                    {idx + 1}
                                </span>
                                <span className="whitespace-pre text-emerald-300">{linea || ' '}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
