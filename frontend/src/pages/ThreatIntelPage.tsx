import { useState } from 'react';
import type {
    PerfilAdversario,
    ReglaArtefacto,
} from '../mocks/mockData';
import {
    CheckIcon,
    CopyIcon,
    DownloadIcon,
    TargetIcon,
} from '../components/AppIcons';

interface ThreatIntelPageProps {
    adversarios: PerfilAdversario[];
    artefactos: ReglaArtefacto[];
    modoLectura?: 'simple' | 'tecnico';
    onExportarStix: () => void;
}

const detalleTecnicasMitre: Record<string, { nombre: string; tactica: string; explicacion: string }> = {
    T1213: {
        nombre: 'Data from Information Repositories',
        tactica: 'Collection',
        explicacion: 'Consultas rápidas y masivas sobre repositorios de registros clínicos.',
    },
    T1074: {
        nombre: 'Data Staged',
        tactica: 'Collection',
        explicacion: 'Agrupación temporal de archivos previa a la transferencia saliente.',
    },
    'T1110.001': {
        nombre: 'Brute Force: Password Guessing',
        tactica: 'Credential Access',
        explicacion: 'Ráfagas de intentos fallidos sobre puertos administrativos.',
    },
    T1078: {
        nombre: 'Valid Accounts',
        tactica: 'Initial Access / Persistence',
        explicacion: 'Uso o reutilización de credenciales técnicas existentes.',
    },
    T1098: {
        nombre: 'Account Manipulation',
        tactica: 'Persistence / Privilege Escalation',
        explicacion: 'Alteración o abuso de atributos y sesiones privilegiadas.',
    },
    'T1048.002': {
        nombre: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol',
        tactica: 'Exfiltration',
        explicacion: 'Salida cifrada hacia puerto 8443/tcp fuera de canales autorizados.',
    },
};

const tecnicasMitreReferencia = Object.keys(detalleTecnicasMitre);

export const ThreatIntelPage = ({
    adversarios,
    artefactos,
    modoLectura = 'simple',
    onExportarStix,
}: ThreatIntelPageProps) => {
    const [pestanaYaml, setPestanaYaml] = useState<'IoA' | 'IoC'>('IoA');
    const [reglaSeleccionadaId, setReglaSeleccionadaId] = useState<string>(
        artefactos[0]?.id ?? ''
    );
    const [tecnicaActiva, setTecnicaActiva] = useState<string>('T1048.002');
    const [copiado, setCopiado] = useState(false);
    const [stixMsg, setStixMsg] = useState(false);

    const esTecnico = modoLectura === 'tecnico';
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
        <section className="space-y-4 text-slate-900">
            {/* Cabecera concisa */}
            <div className="rounded-xs border border-slate-300 border-l-4 border-l-teal-600 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                            <TargetIcon className="h-3.5 w-3.5 text-slate-700" />
                            <span>PERFILES DE AMENAZA Y CONTROLES</span>
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                            Adversarios identificados y reglas para bloquearlos
                        </h2>
                        <p className="text-xs text-slate-600">
                            Resumen de quién realiza los ataques y qué alertas se activan para proteger la red clínica.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleExportarClick}
                        className="inline-flex shrink-0 items-center gap-2 self-start rounded-xs border border-teal-600 bg-teal-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:border-teal-700 hover:bg-teal-700 lg:self-center"
                    >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        Exportar alertas (MISP / STIX)
                    </button>
                </div>

                {stixMsg && (
                    <div className="mt-3 rounded-xs border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Archivo aegishealth_stix_2_1_sintetico.json descargado y registrado en auditoría.
                    </div>
                )}
            </div>

            {/* Perfiles de Adversarios */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {adversarios.map((adv) => (
                    <article
                        key={adv.id}
                        className="rounded-xs border border-slate-300 border-l-4 border-l-teal-500 bg-white p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2 text-xs">
                            <span className="rounded-xs border border-teal-200 bg-teal-50 px-2 py-1 font-mono font-bold text-teal-800">
                                {adv.id} · {adv.tipoActor}
                            </span>
                            {esTecnico && (
                                <div className="flex items-center gap-2 font-mono">
                                    <span className="rounded-xs border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-800">
                                        Admiralty: {adv.calificacionAdmiralty}
                                    </span>
                                    <span className="rounded-xs border border-amber-300 bg-amber-50 px-2 py-0.5 tabular-nums text-amber-800">
                                        Score: {adv.anomalyScore == null ? 'Sin puntaje disponible' : adv.anomalyScore.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
                            {adv.nombreClave}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {adv.resumen}
                        </p>

                        {esTecnico && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {adv.tecnicasMitre.map((tec) => (
                                    <button
                                        key={tec}
                                        type="button"
                                        onClick={() => setTecnicaActiva(tec)}
                                        className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                                            tecnicaActiva === tec
                                                ? 'border-slate-500 bg-slate-200 font-semibold text-slate-900'
                                                : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400'
                                        }`}
                                    >
                                        {tec}
                                    </button>
                                ))}
                            </div>
                        )}
                    </article>
                ))}
            </div>

            {/* Diccionario MITRE solo en Detalle técnico */}
            {esTecnico && (
                <div className="rounded-xs border border-slate-300 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                            MATRIZ MITRE ATT&amp;CK:
                        </span>
                        {tecnicasMitreReferencia.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTecnicaActiva(t)}
                                className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                                    tecnicaActiva === t
                                        ? 'border-slate-500 bg-slate-200 font-semibold text-slate-900'
                                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    {infoTecnica && (
                        <div className="mt-2.5 rounded-xs border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
                            <span className="font-mono font-semibold text-slate-900">{tecnicaActiva}</span>
                            <span className="mx-2 text-slate-500">|</span>
                            <span className="font-medium text-slate-700">{infoTecnica.nombre}</span>
                            <span className="ml-2 rounded-xs border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                                {infoTecnica.tactica}
                            </span>
                            <p className="mt-1 text-slate-600">{infoTecnica.explicacion}</p>
                        </div>
                    )}
                </div>
            )}

            {/* IoA vs IoC: vista limpia en simple, visor Sigma YAML completo en técnico */}
            <div className={`grid grid-cols-1 gap-4 ${esTecnico ? 'lg:grid-cols-12' : 'md:grid-cols-2'}`}>
                <div className={esTecnico ? 'space-y-3 lg:col-span-5' : 'contents'}>
                    <div className="rounded-xs border border-slate-300 border-t-4 border-t-teal-600 bg-white p-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <span className="rounded-xs border border-teal-300 bg-teal-50 px-2 py-0.5 font-mono text-[11px] text-teal-800">IOA</span>
                            Detección preventiva
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                            Vigila secuencias sospechosas aunque cambie la dirección IP.
                        </p>
                        <div className="mt-2.5 space-y-2">
                            {reglasIoA.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleSeleccionarRegla(r)}
                                    className={`w-full rounded-xs border p-2.5 text-left text-xs transition-colors ${
                                        esTecnico && reglaActiva?.id === r.id
                                            ? 'border-slate-500 bg-slate-100'
                                            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900">{r.nombre}</p>
                                    <p className="mt-1 text-slate-600">{r.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xs border border-slate-300 border-t-4 border-t-amber-500 bg-white p-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <span className="rounded-xs border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] text-amber-800">IOC</span>
                            Bloqueo puntual
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                            Bloquea de forma directa la IP y puerto observados en el incidente.
                        </p>
                        <div className="mt-2.5 space-y-2">
                            {reglasIoC.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleSeleccionarRegla(r)}
                                    className={`w-full rounded-xs border p-2.5 text-left text-xs transition-colors ${
                                        esTecnico && reglaActiva?.id === r.id
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900">{r.nombre}</p>
                                    <p className="mt-1 text-slate-600">{r.descripcion}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Visor de código Sigma YAML solo en Detalle técnico */}
                {esTecnico && (
                    <div className="flex flex-col overflow-hidden rounded-xs border border-slate-300 bg-white lg:col-span-7">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-3.5 py-2">
                            <div className="flex items-center gap-2 font-mono text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPestanaYaml('IoA');
                                        if (reglasIoA[0]) setReglaSeleccionadaId(reglasIoA[0].id);
                                    }}
                                    className={`rounded-xs border px-2 py-1 transition-colors ${
                                        pestanaYaml === 'IoA'
                                            ? 'border-slate-500 bg-slate-200 font-semibold text-slate-900'
                                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'
                                    }`}
                                >
                                    IoA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPestanaYaml('IoC');
                                        if (reglasIoC[0]) setReglaSeleccionadaId(reglasIoC[0].id);
                                    }}
                                    className={`rounded-xs border px-2 py-1 transition-colors ${
                                        pestanaYaml === 'IoC'
                                            ? 'border-amber-500 bg-amber-100 font-semibold text-amber-900'
                                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'
                                    }`}
                                >
                                    IoC
                                </button>
                                {reglaActiva && (
                                    <span className="text-slate-600">
                                        {reglaActiva.id.toLowerCase()}.sigma.yml
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleCopiarYaml}
                                className="inline-flex items-center gap-1.5 rounded-xs border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100"
                            >
                                {copiado ? (
                                    <>
                                        <CheckIcon className="h-3.5 w-3.5 text-emerald-700" />
                                        Copiado
                                    </>
                                ) : (
                                    <>
                                        <CopyIcon className="h-3.5 w-3.5" />
                                        Copiar YAML
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="overflow-x-auto p-3.5 font-mono text-xs leading-6">
                            {lineasYaml.map((linea, idx) => {
                                const separadorIdx = linea.indexOf(':');
                                const tieneClave = separadorIdx > 0 && !linea.trimStart().startsWith('-');
                                return (
                                    <div key={idx} className="flex">
                                        <span className="w-8 shrink-0 select-none pr-3 text-right tabular-nums text-slate-500">
                                            {idx + 1}
                                        </span>
                                        {tieneClave ? (
                                            <span className="whitespace-pre">
                                                <span className="text-slate-900">{linea.slice(0, separadorIdx + 1)}</span>
                                                <span className="text-emerald-700">{linea.slice(separadorIdx + 1)}</span>
                                            </span>
                                        ) : (
                                            <span className="whitespace-pre text-amber-800">{linea || ' '}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
