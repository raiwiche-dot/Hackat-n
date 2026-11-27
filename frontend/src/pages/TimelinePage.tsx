import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ApiError,
  describirError,
  obtenerCampaignsApi,
  obtenerTimelineCampanaApi,
  revelarCuentaApi,
  type CampaignRecord,
  type CampaignTimelineEvent,
  type RevealResponse,
} from '../services/apiClient';
import { EyeIcon, LockIcon, TimelineIcon } from '../components/AppIcons';

interface TimelinePageProps {
  analistaPorDefecto?: string;
  onRegistrarBreakGlass?: (analistaId: string, motivo: string, campanaId: string) => void;
}

const badgeSeveridad: Record<string, string> = {
  CRITICA: 'border-rose-300 bg-rose-50 text-rose-800',
  CRITICAL: 'border-rose-300 bg-rose-50 text-rose-800',
  ALTA: 'border-amber-300 bg-amber-50 text-amber-800',
  HIGH: 'border-amber-300 bg-amber-50 text-amber-800',
};
const badgeDefecto = 'border-[#CDE2D7] bg-[#F4FAF7] text-[#073B2C]';
const sinDato = (v: unknown) => (v === null || v === undefined || v === '' ? 'Sin dato' : String(v));
const TOKEN_RE = /^ACC-[0-9A-Fa-f]{12}$/;

export const TimelinePage = ({
  analistaPorDefecto = 'soc.tecnico',
  onRegistrarBreakGlass,
}: TimelinePageProps) => {
  const [campanas, setCampanas] = useState<CampaignRecord[]>([]);
  const [errorCampanas, setErrorCampanas] = useState('');
  const [cargandoCampanas, setCargandoCampanas] = useState(true);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState('');

  const [eventos, setEventos] = useState<CampaignTimelineEvent[]>([]);
  const [cargandoTimeline, setCargandoTimeline] = useState(false);
  const [errorTimeline, setErrorTimeline] = useState('');

  // Break-Glass: clave y valor revelado viven solo en memoria del componente.
  const [modalAbierto, setModalAbierto] = useState(false);
  const [analystId, setAnalystId] = useState(analistaPorDefecto);
  const [clave, setClave] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tokenElegido, setTokenElegido] = useState('');
  const [errorModal, setErrorModal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [revelado, setRevelado] = useState<RevealResponse | null>(null);

  useEffect(() => {
    let active = true;
    obtenerCampaignsApi()
      .then((r) => {
        if (!active) return;
        setCampanas(r.campaigns);
        setCodigoSeleccionado((prev) => prev || r.campaigns[0]?.campaignCode || '');
      })
      .catch((e) => active && setErrorCampanas(describirError(e)))
      .finally(() => active && setCargandoCampanas(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!codigoSeleccionado) return;
    let active = true;
    setCargandoTimeline(true);
    setErrorTimeline('');
    setEventos([]);
    obtenerTimelineCampanaApi(codigoSeleccionado)
      .then((r) => active && setEventos(r.events))
      .catch((e) => {
        if (!active) return;
        setErrorTimeline(
          e instanceof ApiError && e.status === 404
            ? `Campaña ${codigoSeleccionado} no encontrada (404).`
            : describirError(e)
        );
      })
      .finally(() => active && setCargandoTimeline(false));
    return () => {
      active = false;
    };
  }, [codigoSeleccionado]);

  const campanaActual = campanas.find((c) => c.campaignCode === codigoSeleccionado);

  const tokensCuenta = useMemo(() => {
    const set = new Set<string>(campanaActual?.iocs.accountTokens ?? []);
    eventos.forEach((e) => e.accountToken && set.add(e.accountToken));
    return Array.from(set);
  }, [campanaActual, eventos]);

  const cerrarModal = () => {
    setModalAbierto(false);
    setRevelado(null);
    setClave('');
    setErrorModal('');
  };

  const seleccionarCampana = (code: string) => {
    cerrarModal();
    setCodigoSeleccionado(code);
  };

  useEffect(() => {
    if (!modalAbierto) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cerrarModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalAbierto]);

  const abrirModal = (token?: string) => {
    setRevelado(null);
    setErrorModal('');
    setTokenElegido(token ?? tokensCuenta[0] ?? '');
    setModalAbierto(true);
  };

  const handleConfirmarBreakGlass = async (e: FormEvent) => {
    e.preventDefault();
    const id = analystId.trim();
    const reason = motivo.trim();
    if (!id) return setErrorModal('Ingrese el identificador del analista.');
    if (reason.length < 10) return setErrorModal('El motivo debe tener al menos 10 caracteres.');
    if (!TOKEN_RE.test(tokenElegido))
      return setErrorModal('El token debe ser ACC- seguido de 12 dígitos hexadecimales.');

    setEnviando(true);
    setErrorModal('');
    try {
      const r = await revelarCuentaApi(id, reason, tokenElegido, clave);
      setRevelado(r);
      onRegistrarBreakGlass?.(id, reason, codigoSeleccionado);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const prefijo =
        status === 401
          ? 'Credencial inválida o ausente'
          : status === 404
            ? 'Cuenta desconocida'
            : status === 422
              ? 'Datos inválidos'
              : status === 503
                ? 'Servicio de investigación no disponible'
                : 'Error';
      const detalle = err instanceof Error ? err.message : describirError(err);
      setErrorModal(`${prefijo} (${status || 'sin conexión'}): ${detalle}`);
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoCampanas) {
    return <p className="inst-panel p-5 font-mono text-sm text-slate-600">Cargando campañas...</p>;
  }
  if (errorCampanas) {
    return (
      <p className="inst-panel border-l-4 border-l-rose-600 p-5 font-mono text-sm text-rose-800">
        Campañas: {errorCampanas}
      </p>
    );
  }
  if (campanas.length === 0) {
    return <p className="inst-panel p-5 font-mono text-sm text-slate-600">Sin campañas registradas.</p>;
  }

  return (
    <section className="space-y-5 text-[#073B2C]">
      {/* Selector de campañas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {campanas.map((c) => {
          const activa = c.campaignCode === codigoSeleccionado;
          return (
            <button
              key={c.campaignCode}
              type="button"
              onClick={() => seleccionarCampana(c.campaignCode)}
              className={`btn-touch min-h-[82px] cursor-pointer rounded-xl border p-3.5 text-left ${
                activa
                  ? 'border-[#0B5D46] border-l-4 border-l-[#0B5D46] bg-[#E3F2EC] shadow-sm'
                  : 'border-[#CDE2D7] bg-white hover:border-[#0B5D46]/60 hover:bg-[#F4FAF7]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 font-mono text-[11px]">
                <span className={activa ? 'font-bold text-[#063729]' : 'text-slate-600'}>{c.campaignCode}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-bold ${
                    badgeSeveridad[(c.severity ?? '').toUpperCase()] ?? badgeDefecto
                  }`}
                >
                  {c.eventCount !== null ? `${c.eventCount.toLocaleString('es-EC')} ev.` : 'Sin dato'}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[#073B2C]">{c.title}</p>
            </button>
          );
        })}
      </div>

      {/* Cabecera de campaña + Break-Glass */}
      {campanaActual && (
        <div className="inst-panel-accent p-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">
                  {campanaActual.campaignCode}
                </span>
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${
                    badgeSeveridad[(campanaActual.severity ?? '').toUpperCase()] ?? badgeDefecto
                  }`}
                >
                  {sinDato(campanaActual.severity)}
                </span>
                <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 text-xs font-semibold text-[#063729]">
                  Admiralty {sinDato(campanaActual.admiraltyRating)}
                </span>
                <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 text-xs font-semibold text-[#063729]">
                  {sinDato(campanaActual.adversaryType)}
                </span>
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  Score {campanaActual.anomalyScore !== null ? campanaActual.anomalyScore.toFixed(3) : 'Sin dato'}
                </span>
              </div>

              <h2 className="text-lg font-bold text-[#073B2C] sm:text-xl">{campanaActual.title}</h2>
              <p className="font-mono text-xs text-slate-600">
                Ventana: {sinDato(campanaActual.firstSeen)} → {sinDato(campanaActual.lastSeen)}
              </p>
              <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-slate-600">
                <span>
                  Origen: <strong className="text-[#073B2C]">{campanaActual.iocs.sourceIps.join(', ') || 'Sin dato'}</strong>
                </span>
                <span>
                  Destino: <strong className="text-rose-700">{campanaActual.iocs.destinationIps.join(', ') || 'Sin dato'}</strong>
                </span>
                <span>
                  Puertos: <strong className="text-[#0B5D46]">{campanaActual.iocs.ports.join(', ') || 'Sin dato'}</strong>
                </span>
              </div>
            </div>

            {/* Bóveda Break-Glass */}
            <div className="shrink-0 rounded-xl border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50/60 p-4 lg:w-80">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#073B2C]">
                <LockIcon className="h-4 w-4 text-[#0B5D46]" />
                ACCOUNT VAULT · BREAK-GLASS
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {tokensCuenta.length > 0
                  ? `${tokensCuenta.length} cuenta(s) técnica(s) seudonimizada(s) en esta campaña.`
                  : 'Esta campaña no tiene cuentas técnicas para revelar.'}
              </p>
              <button
                type="button"
                disabled={tokensCuenta.length === 0}
                onClick={() => abrirModal()}
                className="btn-touch mt-3 min-h-[46px] w-full cursor-pointer rounded-lg border border-rose-600 bg-rose-600 px-4 py-2.5 font-mono text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Revelar cuenta (Break-Glass)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carriles duales FW <-> MedSys */}
      <div className="inst-panel p-4 sm:p-5">
        <div className="mb-4 hidden gap-3 border-b border-[#E6F1EC] pb-3.5 md:grid md:grid-cols-2">
          <div className="rounded-lg bg-[#0B5D46] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
            CAPA 1 · FIREWALL
          </div>
          <div className="rounded-lg bg-[#108A65] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
            CAPA 2 · MEDSYS
          </div>
        </div>

        {cargandoTimeline ? (
          <p className="font-mono text-sm text-slate-600">Cargando cronología...</p>
        ) : errorTimeline ? (
          <p className="font-mono text-sm text-rose-800">{errorTimeline}</p>
        ) : eventos.length === 0 ? (
          <p className="font-mono text-sm text-slate-600">La campaña no tiene eventos en la cronología.</p>
        ) : (
          <div className="space-y-3">
            {eventos.map((ev, idx) => {
              const esFirewall = ev.source === 'FIREWALL';
              const card = (
                <article className="rounded-xl border border-[#CDE2D7] bg-[#F8FCFA] p-4">
                  <div className="mb-2 md:hidden">
                    <span
                      className={`rounded-md px-2.5 py-0.5 font-mono text-[11px] font-bold text-white ${
                        esFirewall ? 'bg-[#0B5D46]' : 'bg-[#108A65]'
                      }`}
                    >
                      {ev.source}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-[#0B5D46] px-2 py-0.5 font-bold text-white">#{idx + 1}</span>
                    <span className="tabular-nums font-semibold text-[#073B2C]">{ev.timestamp}</span>
                    {ev.clockSkewAdjusted && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        <TimelineIcon className="h-3 w-3" />
                        hora ajustada
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{ev.summary || 'Sin dato'}</p>
                  <p className="mt-1.5 font-mono text-xs text-slate-600">
                    {sinDato(ev.sourceIp)} → {sinDato(ev.destinationIp)}
                    {ev.destinationPort !== null ? `:${ev.destinationPort}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
                    <span className="rounded-md border border-[#CDE2D7] bg-white px-2.5 py-1 text-slate-700">
                      actor: {sinDato(ev.actorToken)}
                    </span>
                    {ev.accountToken ? (
                      <button
                        type="button"
                        onClick={() => abrirModal(ev.accountToken ?? undefined)}
                        title="Revelar esta cuenta mediante Break-Glass"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#CDE2D7] bg-white px-2.5 py-1 font-semibold text-[#0B5D46] hover:border-rose-400"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        cuenta: {ev.accountToken}
                      </button>
                    ) : (
                      <span className="rounded-md border border-[#CDE2D7] bg-white px-2.5 py-1 text-slate-500">
                        cuenta: Sin dato
                      </span>
                    )}
                  </div>
                </article>
              );
              return (
                <div key={ev.id} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className={esFirewall ? '' : 'hidden md:block'}>{esFirewall ? card : null}</div>
                  <div className={!esFirewall ? '' : 'hidden md:block'}>{!esFirewall ? card : null}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Break-Glass */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#063729]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-break-glass"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="inst-panel-accent w-full max-w-md p-6 shadow-2xl">
            <h3 id="titulo-break-glass" className="font-mono text-base font-bold text-[#063729]">
              AUTORIZACIÓN BREAK-GLASS ({codigoSeleccionado})
            </h3>

            {revelado ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 font-mono text-sm">
                  <p className="text-xs text-slate-600">{revelado.accountToken}</p>
                  <p className="mt-1 text-lg font-bold text-rose-800">{revelado.technicalAccount}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Auditoría: <strong>{revelado.auditId}</strong>
                  </p>
                </div>
                <p className="text-xs text-slate-600">
                  El valor se borra de memoria al ocultarlo, cerrar este cuadro o cambiar de campaña.
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={cerrarModal}
                  className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg bg-[#0B5D46] px-4 py-2 font-mono text-sm font-bold text-white hover:bg-[#063729]"
                >
                  Ocultar
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmarBreakGlass} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="analista-id" className="block font-mono text-xs font-bold text-[#073B2C]">
                    Analista
                  </label>
                  <input
                    id="analista-id"
                    type="text"
                    autoFocus
                    value={analystId}
                    onChange={(e) => setAnalystId(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2 font-mono text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="clave-analista" className="block font-mono text-xs font-bold text-[#073B2C]">
                    Clave del analista (Bearer)
                  </label>
                  <input
                    id="clave-analista"
                    type="password"
                    autoComplete="off"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2 font-mono text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="token-cuenta" className="block font-mono text-xs font-bold text-[#073B2C]">
                    Cuenta seudonimizada
                  </label>
                  <select
                    id="token-cuenta"
                    value={tokenElegido}
                    onChange={(e) => setTokenElegido(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3 py-2 font-mono text-sm focus:border-[#0B5D46] focus:outline-none"
                  >
                    {tokensCuenta.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="motivo-auditoria" className="block font-mono text-xs font-bold text-[#073B2C]">
                    Motivo de investigación (mín. 10 caracteres)
                  </label>
                  <textarea
                    id="motivo-auditoria"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Verificación de cuenta técnica en incidente 2026-10-24..."
                    className="mt-1.5 w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                  />
                </div>

                {errorModal && (
                  <p className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-800">
                    {errorModal}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2.5 pt-2 font-mono text-sm sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-[#F4FAF7] sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
                  >
                    {enviando ? 'Verificando...' : 'Confirmar y auditar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
