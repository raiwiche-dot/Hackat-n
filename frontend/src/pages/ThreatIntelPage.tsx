import { useEffect, useState } from 'react';
import {
  describirError,
  descargarStixApi,
  obtenerCampaignsApi,
  obtenerEstadoMispApi,
  obtenerReglasSigmaApi,
  type CampaignRecord,
  type MispEstado,
  type SigmaRule,
  type SigmaRulesResponse,
} from '../services/apiClient';
import { CheckIcon, CopyIcon, DownloadIcon, TargetIcon } from '../components/AppIcons';

interface ThreatIntelPageProps {
  onStixDescargado?: (filename: string) => void;
}

// Notas locales de apoyo para las técnicas conocidas (el catálogo viene de /api/v1/campaigns).
const detalleTecnicasMitre: Record<string, { nombre: string; tactica: string; nota: string }> = {
  T1213: { nombre: 'Data from Information Repositories', tactica: 'Collection', nota: 'Consultas y descargas masivas desde el repositorio médico.' },
  T1074: { nombre: 'Data Staged', tactica: 'Collection', nota: 'Transferencias acumuladas en ráfaga previa al egreso.' },
  'T1048.002': { nombre: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol', tactica: 'Exfiltration', nota: 'Egreso cifrado hacia dirección pública.' },
  'T1021.004': { nombre: 'Remote Services: SSH', tactica: 'Lateral Movement', nota: 'Sesiones SSH hacia el servidor médico.' },
  'T1110.001': { nombre: 'Brute Force: Password Guessing', tactica: 'Credential Access', nota: 'Intentos negados sobre Telnet 23/tcp.' },
  'T1110.003': { nombre: 'Password Spraying', tactica: 'Credential Access', nota: 'Accesos fallidos repetidos sobre cuenta técnica.' },
  T1046: { nombre: 'Network Service Discovery', tactica: 'Discovery', nota: 'Sondeo horizontal sobre puertos heredados.' },
  'T1021.001': { nombre: 'Remote Desktop Protocol', tactica: 'Lateral Movement', nota: 'Conexiones sobre 3389/tcp.' },
  'T1021.002': { nombre: 'SMB/Windows Admin Shares', tactica: 'Lateral Movement', nota: 'Intentos sobre SMBv1 445/tcp.' },
  T1078: { nombre: 'Valid Accounts', tactica: 'Initial Access / Persistence', nota: 'Uso de cuentas técnicas válidas.' },
  T1098: { nombre: 'Account Manipulation', tactica: 'Privilege Escalation', nota: 'Escalamiento, activaciones y reactivaciones de cuentas.' },
  T1531: { nombre: 'Account Access Removal', tactica: 'Impact', nota: 'Inactivaciones masivas de usuarios.' },
};

type Pestana = 'ioa' | 'ioc';

export const ThreatIntelPage = ({ onStixDescargado }: ThreatIntelPageProps) => {
  const [campanas, setCampanas] = useState<CampaignRecord[]>([]);
  const [errorCampanas, setErrorCampanas] = useState('');
  const [sigma, setSigma] = useState<SigmaRulesResponse>({ ioa: [], ioc: [] });
  const [errorSigma, setErrorSigma] = useState('');
  const [misp, setMisp] = useState<MispEstado | null>(null);
  const [errorMisp, setErrorMisp] = useState('');
  const [cargando, setCargando] = useState(true);

  const [pestana, setPestana] = useState<Pestana>('ioa');
  const [reglaNombre, setReglaNombre] = useState('');
  const [tecnicaActiva, setTecnicaActiva] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [stixEstado, setStixEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [descargandoStix, setDescargandoStix] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [c, s, m] = await Promise.allSettled([
        obtenerCampaignsApi(),
        obtenerReglasSigmaApi(),
        obtenerEstadoMispApi(),
      ]);
      if (!active) return;
      if (c.status === 'fulfilled') {
        setCampanas(c.value.campaigns);
        setTecnicaActiva(c.value.campaigns[0]?.mitreTechniques[0]?.id ?? '');
      } else setErrorCampanas(describirError(c.reason));
      if (s.status === 'fulfilled') {
        setSigma(s.value);
        setReglaNombre(s.value.ioa[0]?.filename ?? s.value.ioc[0]?.filename ?? '');
        if (s.value.ioa.length === 0 && s.value.ioc.length > 0) setPestana('ioc');
      } else setErrorSigma(describirError(s.reason));
      if (m.status === 'fulfilled') setMisp(m.value);
      else setErrorMisp(describirError(m.reason));
      setCargando(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const reglasPestana = sigma[pestana];
  const reglaActiva: SigmaRule | undefined =
    reglasPestana.find((r) => r.filename === reglaNombre) ?? reglasPestana[0];
  const lineasYaml = reglaActiva ? reglaActiva.yaml.split('\n') : [];

  const tecnicaCatalogo = campanas
    .flatMap((c) => c.mitreTechniques)
    .find((t) => t.id === tecnicaActiva);
  const notaLocal = detalleTecnicasMitre[tecnicaActiva];

  const handleCopiarYaml = async () => {
    if (!reglaActiva) return;
    try {
      await navigator.clipboard.writeText(reglaActiva.yaml);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  };

  const handleGuardarYaml = () => {
    if (!reglaActiva) return;
    const url = URL.createObjectURL(new Blob([reglaActiva.yaml], { type: 'application/x-yaml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = reglaActiva.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleStix = async () => {
    setDescargandoStix(true);
    try {
      const nombre = await descargarStixApi();
      setStixEstado({ ok: true, texto: `${nombre} descargado (STIX 2.1).` });
      onStixDescargado?.(nombre);
    } catch (e) {
      setStixEstado({ ok: false, texto: `STIX: ${describirError(e)}` });
    } finally {
      setDescargandoStix(false);
    }
  };

  const botonPestana = (p: Pestana, etiqueta: string, activo: string) => (
    <button
      type="button"
      onClick={() => {
        setPestana(p);
        setReglaNombre(sigma[p][0]?.filename ?? '');
      }}
      className={`btn-touch min-h-[38px] cursor-pointer rounded-lg border px-3.5 py-1.5 font-bold ${
        pestana === p ? activo : 'border-[#CDE2D7] bg-white text-[#073B2C] hover:bg-[#E3F2EC]'
      }`}
    >
      {etiqueta} ({sigma[p].length})
    </button>
  );

  return (
    <section className="space-y-5 text-[#073B2C]">
      <div className="inst-panel flex flex-col justify-between gap-4 border-l-4 border-l-[#0B5D46] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#063729]">
            <TargetIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />
            <span>MITRE ATT&amp;CK · SEPARACIÓN ESTRICTA IOA VS IOC · STIX 2.1</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            Reglas de comportamiento (IoA) separadas de contención puntual (IoC).
          </p>
        </div>
        <button
          type="button"
          onClick={handleStix}
          disabled={descargandoStix}
          className="btn-touch inline-flex min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0B5D46] px-5 py-2.5 font-mono text-sm font-bold text-white shadow-xs hover:bg-[#063729] disabled:opacity-50 lg:w-auto"
        >
          <DownloadIcon className="h-4 w-4" />
          {descargandoStix ? 'Descargando...' : 'Descargar STIX 2.1'}
        </button>
      </div>

      {stixEstado && (
        <div
          className={`rounded-lg border px-4 py-2.5 font-mono text-xs font-semibold ${
            stixEstado.ok ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]' : 'border-rose-300 bg-rose-50 text-rose-800'
          }`}
        >
          {stixEstado.texto}
        </div>
      )}

      {/* Tarjeta MISP: un 503 queda limitado a esta tarjeta */}
      <div className="inst-panel border-t-4 border-t-[#108A65] p-4 font-mono text-xs sm:p-5">
        <h3 className="font-bold uppercase tracking-wider text-[#063729]">Última carga verificada en MISP</h3>
        {cargando ? (
          <p className="mt-2 text-slate-500">Consultando...</p>
        ) : misp ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <p>
              Fecha: <strong>{misp.lastVerifiedAt ? new Date(misp.lastVerifiedAt).toLocaleString('es-EC') : 'Sin dato'}</strong>
            </p>
            <p>
              Eventos: <strong>{misp.eventCount.toLocaleString('es-EC')}</strong>
            </p>
            <p>
              Distribución: <strong>{misp.distribution ?? 'Sin dato'}</strong>
            </p>
            <p className="sm:col-span-3">
              Exportes: <strong>{misp.exports.join(', ') || 'Sin dato'}</strong>
            </p>
          </div>
        ) : (
          <p className="mt-2 font-bold text-amber-800" title={errorMisp}>
            Carga MISP pendiente de verificación
          </p>
        )}
      </div>

      {/* Campañas y técnicas MITRE */}
      {errorCampanas ? (
        <p className="inst-panel border-l-4 border-l-rose-600 p-4 font-mono text-xs text-rose-800">
          Campañas: {errorCampanas}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campanas.map((c) => (
            <article key={c.campaignCode} className="inst-panel-accent p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6F1EC] pb-2.5 font-mono text-xs">
                <span className="font-bold text-[#063729]">
                  {c.campaignCode} · {c.adversaryType ?? 'Sin dato'}
                </span>
                <div className="flex gap-1.5">
                  <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 font-semibold text-[#0B5D46]">
                    Admiralty {c.admiraltyRating ?? 'Sin dato'}
                  </span>
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-bold text-amber-800">
                    ML {c.anomalyScore !== null ? c.anomalyScore.toFixed(3) : 'Sin dato'}
                  </span>
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-[#073B2C]">{c.title}</h3>
              {c.ioas.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                  {c.ioas.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3.5 flex flex-wrap gap-2">
                {c.mitreTechniques.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTecnicaActiva(t.id)}
                    className={`btn-touch min-h-[36px] cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${
                      tecnicaActiva === t.id
                        ? 'border-[#0B5D46] bg-[#0B5D46] text-white'
                        : 'border-[#CDE2D7] bg-[#F4FAF7] text-[#063729] hover:border-[#0B5D46]'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {tecnicaActiva && (tecnicaCatalogo || notaLocal) && (
        <div className="inst-panel border-l-4 border-l-[#108A65] p-4 font-mono text-xs sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#0B5D46]">{tecnicaActiva}</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-[#073B2C]">
              {tecnicaCatalogo && tecnicaCatalogo.name !== tecnicaActiva ? tecnicaCatalogo.name : notaLocal?.nombre ?? tecnicaActiva}
            </span>
            {(tecnicaCatalogo?.tactic || notaLocal?.tactica) && (
              <span className="rounded-md border border-[#CDE2D7] bg-[#E3F2EC] px-2.5 py-0.5 font-bold text-[#063729]">
                {tecnicaCatalogo?.tactic ?? notaLocal?.tactica}
              </span>
            )}
          </div>
          {notaLocal && <p className="mt-2 font-sans text-sm leading-relaxed text-slate-700">{notaLocal.nota}</p>}
        </div>
      )}

      {/* Reglas Sigma desde /api/v1/exports/sigma */}
      {errorSigma ? (
        <p className="inst-panel border-l-4 border-l-rose-600 p-4 font-mono text-xs text-rose-800">
          Reglas Sigma: {errorSigma}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="inst-panel space-y-2.5 p-4 sm:p-5 lg:col-span-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#063729]">
              {pestana === 'ioa' ? 'Reglas IoA (comportamiento general)' : 'Reglas IoC (contención puntual)'}
            </h3>
            {reglasPestana.length === 0 && (
              <p className="font-mono text-xs text-slate-500">{cargando ? 'Cargando...' : 'Sin reglas.'}</p>
            )}
            {reglasPestana.map((r) => (
              <button
                key={r.filename}
                type="button"
                onClick={() => setReglaNombre(r.filename)}
                className={`btn-touch w-full cursor-pointer rounded-xl border p-3.5 text-left ${
                  reglaActiva?.filename === r.filename
                    ? 'border-[#0B5D46] bg-[#E3F2EC]'
                    : 'border-[#CDE2D7] bg-[#F8FCFA] hover:border-[#0B5D46]/60'
                }`}
              >
                <p className="text-sm font-bold text-[#073B2C]">{r.title}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">{r.filename}</p>
              </button>
            ))}
          </div>

          <div className="inst-panel flex flex-col overflow-hidden lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3 font-mono text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {botonPestana('ioa', 'IoA', 'border-[#0B5D46] bg-[#0B5D46] text-white')}
                {botonPestana('ioc', 'IoC', 'border-amber-600 bg-amber-500 text-white')}
                <span className="font-semibold text-[#063729]">{reglaActiva?.filename}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopiarYaml}
                  disabled={!reglaActiva}
                  className="btn-touch inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#CDE2D7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#E3F2EC]"
                >
                  {copiado ? <CheckIcon className="h-4 w-4 text-[#0B5D46]" /> : <CopyIcon className="h-4 w-4" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={handleGuardarYaml}
                  disabled={!reglaActiva}
                  className="btn-touch inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#CDE2D7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#E3F2EC]"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Guardar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-[#F9FCFA] p-4 font-mono text-xs leading-6 sm:p-5 sm:text-sm">
              {lineasYaml.map((linea, idx) => {
                const sep = linea.indexOf(':');
                const tieneClave = sep > 0 && !linea.trimStart().startsWith('-');
                return (
                  <div key={idx} className="flex">
                    <span className="w-8 shrink-0 select-none pr-3 text-right text-slate-400">{idx + 1}</span>
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
      )}
    </section>
  );
};
