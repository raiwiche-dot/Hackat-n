import { useState } from 'react';
import type { PerfilAdversario, ReglaArtefacto } from '../mocks/mockData';
import { CheckIcon, CopyIcon, DownloadIcon, TargetIcon } from '../components/AppIcons';

interface ThreatIntelPageProps {
  adversarios: PerfilAdversario[];
  artefactos: ReglaArtefacto[];
  onExportarStix: () => void;
}

const detalleTecnicasMitre: Record<string, { nombre: string; tactica: string; nota: string }> = {
  T1213: { nombre: 'Data from Information Repositories', tactica: 'Collection', nota: 'Consultas y descargas masivas desde el repositorio médico 10.10.100.30.' },
  T1074: { nombre: 'Data Staged', tactica: 'Collection', nota: 'Transferencias acumuladas en ráfaga previa al egreso (CAMP-2026-002).' },
  'T1048.002': { nombre: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol', tactica: 'Exfiltration', nota: 'Egreso hacia 186.46.219[.]18:8443/tcp (dato sintético TLP:RED).' },
  'T1021.004': { nombre: 'Remote Services: SSH', tactica: 'Lateral Movement', nota: '30 sesiones Protocolo=="SSH" + 826 sesiones Aplicacion=="SSH".' },
  'T1110.001': { nombre: 'Brute Force: Password Guessing', tactica: 'Credential Access', nota: '2,000 intentos negados sobre Telnet 23/tcp (CAMP-2026-003).' },
  'T1110.003': { nombre: 'Password Spraying', tactica: 'Credential Access', nota: 'Escaneo 4x250 + 1,076 ACCESO FALLIDO en cuenta técnica.' },
  T1046: { nombre: 'Network Service Discovery', tactica: 'Discovery', nota: 'Sondeo horizontal sobre 137/udp, 445/tcp, 3389/tcp y 8471/tcp.' },
  'T1021.001': { nombre: 'Remote Desktop Protocol', tactica: 'Lateral Movement', nota: 'Únicos 250 registros sobre puerto 3389/tcp en todo el dataset.' },
  'T1021.002': { nombre: 'SMB/Windows Admin Shares', tactica: 'Lateral Movement', nota: '250 intentos negados sobre SMBv1 445/tcp.' },
  T1078: { nombre: 'Valid Accounts', tactica: 'Initial Access / Persistence', nota: 'Uso de cuentas técnicas activas con 787 IPs sin puntos.' },
  T1098: { nombre: 'Account Manipulation', tactica: 'Privilege Escalation', nota: 'Escalamiento de nivel, activaciones (1,098) y reactivaciones (826).' },
  T1531: { nombre: 'Account Access Removal', tactica: 'Impact', nota: 'Inactivaciones masivas de usuarios en cuentas especiales.' },
};

export const ThreatIntelPage = ({
  adversarios,
  artefactos,
  onExportarStix,
}: ThreatIntelPageProps) => {
  const [pestanaYaml, setPestanaYaml] = useState<'IoA' | 'IoC'>('IoA');
  const [reglaSeleccionadaId, setReglaSeleccionadaId] = useState<string>(artefactos[0]?.id ?? '');
  const [tecnicaActiva, setTecnicaActiva] = useState<string>('T1213');
  const [copiado, setCopiado] = useState(false);
  const [stixMsg, setStixMsg] = useState(false);

  const reglasIoA = artefactos.filter((a) => a.tipo === 'IoA');
  const reglasIoC = artefactos.filter((a) => a.tipo === 'IoC');
  const reglaActiva =
    artefactos.find((a) => a.id === reglaSeleccionadaId && a.tipo === pestanaYaml) ??
    (pestanaYaml === 'IoA' ? reglasIoA[0] : reglasIoC[0]) ??
    artefactos[0];

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

  const infoTecnica = detalleTecnicasMitre[tecnicaActiva];
  const lineasYaml = reglaActiva ? reglaActiva.sigmaYaml.split('\n') : [];

  return (
    <section className="space-y-5 text-[#073B2C]">
      <div className="inst-panel flex flex-col justify-between gap-4 border-l-4 border-l-[#0B5D46] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#063729]">
            <TargetIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />
            <span>MITRE ATT&amp;CK · SEPARACIÓN ESTRICTA IOA VS IOC · STIX 2.1</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            Reglas de comportamiento generalizables (IoA) separadas de contención puntual (IoC) con etiqueta sintética TLP:RED.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onExportarStix();
            setStixMsg(true);
            setTimeout(() => setStixMsg(false), 3200);
          }}
          className="btn-touch inline-flex min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0B5D46] px-5 py-2.5 font-mono text-sm font-bold text-white shadow-xs hover:bg-[#063729] lg:w-auto"
        >
          <DownloadIcon className="h-4 w-4" />
          Exportar STIX 2.1 (TLP:RED)
        </button>
      </div>

      {stixMsg && (
        <div className="rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2.5 font-mono text-xs font-semibold text-[#063729]">
          Bundle aegishealth_stix21_bundle.json exportado con labels synthetic-exercise-data.
        </div>
      )}

      {/* Perfiles de adversarios */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {adversarios.map((adv) => (
          <article key={adv.id} className="inst-panel-accent p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6F1EC] pb-2.5 font-mono text-xs">
              <span className="font-bold text-[#063729]">
                {adv.id} · {adv.tipoActor} · {adv.campanaAsociada}
              </span>
              <div className="flex gap-1.5">
                <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 text-xs font-semibold text-[#0B5D46]">
                  Admiralty {adv.calificacionAdmiralty}
                </span>
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  ML {adv.anomalyScore.toFixed(3)}
                </span>
              </div>
            </div>
            <h3 className="mt-3 text-base font-bold text-[#073B2C]">{adv.nombreClave}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{adv.resumen}</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {adv.tecnicasMitre.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTecnicaActiva(t)}
                  className={`btn-touch min-h-[36px] cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${
                    tecnicaActiva === t
                      ? 'border-[#0B5D46] bg-[#0B5D46] text-white'
                      : 'border-[#CDE2D7] bg-[#F4FAF7] text-[#063729] hover:border-[#0B5D46]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* Inspector técnica MITRE */}
      {infoTecnica && (
        <div className="inst-panel border-l-4 border-l-[#108A65] p-4 font-mono text-xs sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#0B5D46]">{tecnicaActiva}</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-[#073B2C]">{infoTecnica.nombre}</span>
            <span className="rounded-md border border-[#CDE2D7] bg-[#E3F2EC] px-2.5 py-0.5 text-xs font-bold text-[#063729]">
              {infoTecnica.tactica}
            </span>
          </div>
          <p className="mt-2 font-sans text-sm leading-relaxed text-slate-700">{infoTecnica.nota}</p>
        </div>
      )}

      {/* IoA vs IoC + Visor Sigma YAML */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="inst-panel border-t-4 border-t-[#0B5D46] p-4 sm:p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#063729]">
              REGLAS IOA (COMPORTAMIENTO GENERAL)
            </h3>
            <div className="mt-3 space-y-2.5">
              {reglasIoA.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setPestanaYaml('IoA');
                    setReglaSeleccionadaId(r.id);
                  }}
                  className={`btn-touch w-full cursor-pointer rounded-xl border p-3.5 text-left ${
                    reglaActiva?.id === r.id
                      ? 'border-[#0B5D46] bg-[#E3F2EC] text-[#073B2C]'
                      : 'border-[#CDE2D7] bg-[#F8FCFA] text-slate-700 hover:border-[#0B5D46]/60'
                  }`}
                >
                  <p className="text-sm font-bold text-[#073B2C]">{r.nombre}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{r.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="inst-panel border-t-4 border-t-amber-500 p-4 sm:p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">
              REGLAS IOC (CONTENCIÓN PUNTUAL)
            </h3>
            <div className="mt-3 space-y-2.5">
              {reglasIoC.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setPestanaYaml('IoC');
                    setReglaSeleccionadaId(r.id);
                  }}
                  className={`btn-touch w-full cursor-pointer rounded-xl border p-3.5 text-left ${
                    reglaActiva?.id === r.id
                      ? 'border-amber-500 bg-amber-50 text-[#073B2C]'
                      : 'border-[#CDE2D7] bg-[#F8FCFA] text-slate-700 hover:border-amber-400'
                  }`}
                >
                  <p className="text-sm font-bold text-[#073B2C]">{r.nombre}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{r.descripcion}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="inst-panel flex flex-col overflow-hidden lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPestanaYaml('IoA');
                  if (reglasIoA[0]) setReglaSeleccionadaId(reglasIoA[0].id);
                }}
                className={`btn-touch min-h-[38px] cursor-pointer rounded-lg border px-3.5 py-1.5 font-bold ${
                  pestanaYaml === 'IoA'
                    ? 'border-[#0B5D46] bg-[#0B5D46] text-white'
                    : 'border-[#CDE2D7] bg-white text-[#073B2C] hover:bg-[#E3F2EC]'
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
                className={`btn-touch min-h-[38px] cursor-pointer rounded-lg border px-3.5 py-1.5 font-bold ${
                  pestanaYaml === 'IoC'
                    ? 'border-amber-600 bg-amber-500 text-white'
                    : 'border-[#CDE2D7] bg-white text-[#073B2C] hover:bg-amber-50'
                }`}
              >
                IoC
              </button>
              <span className="font-semibold text-[#063729]">
                {reglaActiva?.id.toLowerCase()}.sigma.yml
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopiarYaml}
              className="btn-touch inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#CDE2D7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#E3F2EC]"
            >
              {copiado ? (
                <>
                  <CheckIcon className="h-4 w-4 text-[#0B5D46]" />
                  Copiado
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  Copiar YAML
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto bg-[#F9FCFA] p-4 font-mono text-xs leading-6 sm:p-5 sm:text-sm">
            {lineasYaml.map((linea, idx) => {
              const sep = linea.indexOf(':');
              const tieneClave = sep > 0 && !linea.trimStart().startsWith('-');
              return (
                <div key={idx} className="flex">
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-slate-400">
                    {idx + 1}
                  </span>
                  {tieneClave ? (
                    <span className="whitespace-pre">
                      <span className="font-semibold text-[#063729]">{linea.slice(0, sep + 1)}</span>
                      <span className="text-[#0D6E52]">{linea.slice(sep + 1)}</span>
                    </span>
                  ) : (
                    <span className="whitespace-pre text-amber-800">{linea || ' '}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
