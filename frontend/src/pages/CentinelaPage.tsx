import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { describirError } from '../services/apiClient';
import {
  enviarReporteCentinelaApi,
  obtenerCampanasCentinelaApi,
  obtenerProvinciasApi,
  PROVINCIAS_ECUADOR,
  type CampanaCentinela,
  type ResultadoReporte,
} from '../services/pilotoApi';
import { AlertIcon, CheckIcon, LockIcon, TargetIcon } from '../components/AppIcons';

interface CentinelaPageProps {
  sesionToken: string;
  onCambiarSesionToken: (valor: string) => void;
}

const TEXTO_EJEMPLO = 'Mensaje de prueba https://alerta.example y cuenta 2200123456';

const estiloEstado: Record<string, { clase: string; texto: string }> = {
  EN_OBSERVACION: { clase: 'border-amber-300 bg-amber-50 text-amber-800', texto: 'EN OBSERVACIÓN' },
  AVISO_A_AFILIADOS: { clase: 'border-rose-300 bg-rose-50 text-rose-800', texto: 'AVISO A AFILIADOS (SIMULADO)' },
};

export const CentinelaPage = ({ sesionToken, onCambiarSesionToken }: CentinelaPageProps) => {
  const [provincias, setProvincias] = useState<string[]>(PROVINCIAS_ECUADOR);
  const [provincia, setProvincia] = useState('Pichincha');
  const [texto, setTexto] = useState(TEXTO_EJEMPLO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState<ResultadoReporte[]>([]);

  const [campanas, setCampanas] = useState<CampanaCentinela[]>([]);
  const [errorCampanas, setErrorCampanas] = useState('');
  const [cargandoCampanas, setCargandoCampanas] = useState(true);
  const [campanaSel, setCampanaSel] = useState<string>('TODAS');

  const cargarCampanas = useCallback(async () => {
    setCargandoCampanas(true);
    try {
      setCampanas(await obtenerCampanasCentinelaApi());
      setErrorCampanas('');
    } catch (e) {
      setErrorCampanas(describirError(e));
    } finally {
      setCargandoCampanas(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    obtenerProvinciasApi().then((p) => active && setProvincias(p));
    void cargarCampanas();
    return () => {
      active = false;
    };
  }, [cargarCampanas]);

  const handleEnviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (!texto.trim()) return setError('Escribí el mensaje sospechoso.');
    setEnviando(true);
    setError('');
    try {
      const r = await enviarReporteCentinelaApi(sesionToken.trim(), texto, provincia);
      setHistorial((prev) => [r, ...prev]);
      void cargarCampanas();
    } catch (err) {
      setError(describirError(err));
    } finally {
      setEnviando(false);
    }
  };

  const ultimo = historial[0];

  // Conteo por provincia (todas las campañas o la seleccionada).
  const conteoProvincia = useMemo(() => {
    const fuente = campanaSel === 'TODAS' ? campanas : campanas.filter((c) => c.campaignId === campanaSel);
    const out: Record<string, number> = {};
    fuente.forEach((c) => Object.entries(c.byProvince).forEach(([p, n]) => (out[p] = (out[p] ?? 0) + n)));
    return out;
  }, [campanas, campanaSel]);
  const maxConteo = Math.max(1, ...Object.values(conteoProvincia));
  const provinciasMapa = Array.from(new Set([...provincias, ...Object.keys(conteoProvincia)]));
  const avisos = campanas.filter((c) => c.status === 'AVISO_A_AFILIADOS');

  const colorTesela = (n: number) => {
    if (!n) return 'border-[#E6F1EC] bg-[#F8FCFA] text-slate-400';
    const r = n / maxConteo;
    if (r >= 0.75) return 'border-rose-400 bg-rose-600 text-white';
    if (r >= 0.4) return 'border-amber-400 bg-amber-400 text-[#073B2C]';
    return 'border-[#108A65] bg-[#D5EDE2] text-[#063729]';
  };

  return (
    <section className="space-y-5 text-[#073B2C]">
      {/* Cinta del módulo */}
      <div className="inst-panel flex flex-col justify-between gap-3 border-l-4 border-l-[#0B5D46] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">CENTINELA · REPORTES CIUDADANOS</span>
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 font-bold text-amber-800">
              PILOTO · IDENTIDADES SINTÉTICAS
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Los afiliados reportan mensajes sospechosos. Desde tres reportantes distintos la campaña pasa a aviso a afiliados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cargarCampanas()}
          className="btn-touch min-h-[44px] w-full shrink-0 cursor-pointer rounded-lg border border-[#0B5D46] bg-white px-4 py-2 font-mono text-xs font-bold text-[#0B5D46] hover:bg-[#E3F2EC] sm:w-auto sm:text-sm"
        >
          Actualizar mapa
        </button>
      </div>

      {avisos.length > 0 && (
        <div className="inst-panel flex items-start gap-3 border-l-4 border-l-rose-600 bg-rose-50/60 p-4">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <div className="text-sm text-slate-700">
            <p className="font-mono text-xs font-bold text-rose-900">SIMULACIÓN · AVISO A AFILIADOS</p>
            <p className="mt-1">
              {avisos.length} campaña(s) alcanzaron el umbral de tres reportantes:{' '}
              {avisos.map((a) => a.campaignId).join(', ')}. En producción se notificaría a los afiliados; en la demo no se envía nada.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Formulario de reporte */}
        <form onSubmit={handleEnviar} className="inst-panel-accent space-y-4 p-5 lg:col-span-5">
          <h2 className="border-b border-[#E6F1EC] pb-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
            Reportar mensaje sospechoso
          </h2>

          <div>
            <label htmlFor="token-sesion" className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#073B2C]">
              <LockIcon className="h-3.5 w-3.5 text-[#0B5D46]" />
              Token de sesión (afiliada o anónima)
            </label>
            <input
              id="token-sesion"
              type="password"
              autoComplete="off"
              value={sesionToken}
              onChange={(e) => onCambiarSesionToken(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2 font-mono text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Se guarda solo en memoria; el servidor identifica al afiliado.</p>
          </div>

          <div>
            <label htmlFor="provincia" className="block font-mono text-xs font-bold text-[#073B2C]">
              Provincia
            </label>
            <select
              id="provincia"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3 py-2 text-base focus:border-[#0B5D46] focus:outline-none"
            >
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="texto-reporte" className="block font-mono text-xs font-bold text-[#073B2C]">
              Mensaje recibido
            </label>
            <textarea
              id="texto-reporte"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-800">{error}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="btn-touch min-h-[46px] w-full cursor-pointer rounded-lg bg-[#0B5D46] px-4 py-2.5 font-mono text-sm font-bold text-white shadow-xs hover:bg-[#063729] disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar reporte'}
          </button>

          {ultimo && (
            <div className="rounded-xl border border-[#CDE2D7] border-l-4 border-l-[#0B5D46] bg-[#F4FAF7] p-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <CheckIcon className="h-4 w-4 text-[#0B5D46]" />
                <span className="font-bold text-[#063729]">{ultimo.reporte.reportId}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                    ultimo.reenviado
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]'
                  }`}
                >
                  {ultimo.reenviado ? 'REENVÍO (200) · MISMO ID' : 'NUEVO (201)'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{ultimo.reporte.summary}</p>
              <dl className="mt-2.5 space-y-1 font-mono text-xs text-slate-700">
                <div>
                  <dt className="inline font-bold">Dominios: </dt>
                  <dd className="inline break-all">{ultimo.reporte.indicators.domains.join(', ') || 'ninguno'}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">Teléfonos: </dt>
                  <dd className="inline">{ultimo.reporte.indicators.phones.join(', ') || 'ninguno'}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">Cuentas: </dt>
                  <dd className="inline">{ultimo.reporte.indicators.accounts.join(', ') || 'ninguna'}</dd>
                </div>
                <div className="text-slate-500">
                  {ultimo.reporte.province} · {ultimo.reporte.receivedAt}
                </div>
              </dl>
            </div>
          )}
        </form>

        {/* Mapa por provincia */}
        <div className="inst-panel p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6F1EC] pb-2.5">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
              <TargetIcon className="h-4 w-4" />
              Mapa de reportantes por provincia
            </h2>
            <select
              aria-label="Campaña del mapa"
              value={campanaSel}
              onChange={(e) => setCampanaSel(e.target.value)}
              className="min-h-[38px] rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-1 font-mono text-xs focus:border-[#0B5D46] focus:outline-none"
            >
              <option value="TODAS">Todas las campañas</option>
              {campanas.map((c) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.campaignId}
                </option>
              ))}
            </select>
          </div>

          {errorCampanas ? (
            <p className="mt-4 font-mono text-xs text-rose-800">Campañas: {errorCampanas}</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {provinciasMapa.map((p) => {
                const n = conteoProvincia[p] ?? 0;
                return (
                  <div
                    key={p}
                    title={`${p}: ${n} reportante(s)`}
                    className={`flex min-h-[52px] items-center justify-between gap-2 rounded-lg border px-3 py-2 ${colorTesela(n)}`}
                  >
                    <span className="truncate text-xs font-semibold">{p}</span>
                    <span className="font-mono text-sm font-bold tabular-nums">{n || '·'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Campañas */}
      <div className="inst-panel overflow-hidden">
        <div className="border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3.5 font-mono text-xs font-bold text-[#063729] sm:px-5">
          CAMPAÑAS DETECTADAS ({campanas.length})
        </div>
        {cargandoCampanas && campanas.length === 0 ? (
          <p className="p-5 font-mono text-xs text-slate-500">Cargando campañas...</p>
        ) : errorCampanas ? (
          <p className="p-5 font-mono text-xs text-rose-800">{errorCampanas}</p>
        ) : campanas.length === 0 ? (
          <p className="p-5 font-mono text-xs text-slate-500">Sin campañas todavía. Enviá un reporte para iniciar una.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead className="border-b border-[#CDE2D7] bg-[#F8FCFA] text-xs text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">CAMPAÑA</th>
                  <th className="px-3.5 py-2.5">ESTADO</th>
                  <th className="px-3.5 py-2.5 text-right">REPORTES</th>
                  <th className="px-3.5 py-2.5">PROVINCIAS</th>
                  <th className="px-3.5 py-2.5">DOMINIOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6F1EC]">
                {campanas.map((c) => {
                  const est = estiloEstado[c.status] ?? { clase: 'border-[#CDE2D7] bg-[#F4FAF7] text-[#073B2C]', texto: c.status };
                  return (
                    <tr
                      key={c.campaignId}
                      onClick={() => setCampanaSel(c.campaignId)}
                      className={`cursor-pointer ${campanaSel === c.campaignId ? 'bg-[#E3F2EC]' : 'hover:bg-[#F8FCFA]'}`}
                    >
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-[#0B5D46]">{c.campaignId}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${est.clase}`}>{est.texto}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">{c.reportCount}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">
                        {Object.entries(c.byProvince).map(([p, n]) => `${p} (${n})`).join(', ') || 'Sin dato'}
                      </td>
                      <td className="break-all px-3.5 py-2.5 text-slate-700">{c.domains.join(', ') || 'Sin dato'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historial.length > 1 && (
        <div className="inst-panel p-4 font-mono text-xs sm:p-5">
          <p className="font-bold text-[#063729]">REPORTES ENVIADOS EN ESTA SESIÓN</p>
          <ul className="mt-2 space-y-1 text-slate-700">
            {historial.map((h, i) => (
              <li key={i}>
                {h.reporte.reportId} · {h.reporte.province} · {h.reenviado ? 'reenvío (200)' : 'nuevo (201)'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
