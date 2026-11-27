import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { enviarRevelacionBreakGlassApi, estaEnModoMock, obtenerCampaignsApi, obtenerTimelineCampanaApi } from '../services/apiClient';
import type { CampaignRecord, CampaignTimelineResponse } from '../services/apiClient';
import { LockIcon, TimelineIcon } from '../components/AppIcons';

const badgeSeveridad: Record<string, string> = {
  CRITICA: 'border-rose-300 bg-rose-50 text-rose-800',
  ALTA: 'border-amber-300 bg-amber-50 text-amber-800',
  MEDIA: 'border-[#CDE2D7] bg-[#F4FAF7] text-[#073B2C]',
};

export const TimelinePage = () => {
  const [campanas, setCampanas] = useState<CampaignRecord[]>([]);
  const [campanaSeleccionadaId, setCampanaSeleccionadaId] = useState('');
  const [cronologia, setCronologia] = useState<CampaignTimelineResponse | null>(null);
  const [errorCampanas, setErrorCampanas] = useState('');
  const [errorCronologia, setErrorCronologia] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const [revelacion, setRevelacion] = useState<Awaited<ReturnType<typeof enviarRevelacionBreakGlassApi>> | null>(null);
  const [mensajeAuditoria, setMensajeAuditoria] = useState('');

  const campanaActual = campanas.find((campana) => campana.campaignCode === campanaSeleccionadaId);
  const eventos = cronologia?.campaignCode === campanaSeleccionadaId ? cronologia.events : null;
  const cuentas = [...new Set((eventos ?? []).flatMap((evento) => evento.accountToken ? [evento.accountToken] : []))];
  const indicadores = Array.isArray(campanaActual?.iocs) ? undefined : campanaActual?.iocs;

  useEffect(() => {
    let vigente = true;
    obtenerCampaignsApi().then(({ campaigns }) => {
      if (!vigente) return;
      setCampanas(campaigns);
      setCampanaSeleccionadaId(campaigns[0]?.campaignCode ?? '');
      if (!campaigns.length) setErrorCampanas('No hay campañas disponibles.');
    }).catch((error: Error) => {
      if (vigente) setErrorCampanas(error.message);
    });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (!campanaSeleccionadaId) return;
    let vigente = true;
    obtenerTimelineCampanaApi(campanaSeleccionadaId).then((resultado) => {
      if (vigente) setCronologia(resultado);
    }).catch((error: Error) => {
      if (vigente) setErrorCronologia(error.message);
    });
    return () => { vigente = false; };
  }, [campanaSeleccionadaId]);

  useEffect(() => {
    if (!modalAbierto || pendiente) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRevelacion(null);
        setModalAbierto(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalAbierto, pendiente]);

  const cerrarModal = () => {
    setRevelacion(null);
    setModalAbierto(false);
  };

  const handleConfirmarBreakGlass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pendiente) return;
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    const analystId = String(datos.get('analystId') ?? '').trim();
    const reason = String(datos.get('reason') ?? '').trim();
    const accountToken = String(datos.get('accountToken') ?? '');
    const clave = String(datos.get('clave') ?? '').trim();
    if (!analystId || reason.length < 10 || !cuentas.includes(accountToken) || !clave) {
      setErrorModal('Completa el operador, la cuenta, la clave y un motivo de al menos 10 caracteres.');
      return;
    }

    const campoClave = formulario.elements.namedItem('clave') as HTMLInputElement;
    campoClave.value = '';
    setPendiente(true);
    setErrorModal('');
    setMensajeAuditoria('');
    try {
      const resultado = await enviarRevelacionBreakGlassApi({ analystId, reason, accountToken }, clave);
      setRevelacion(resultado);
      setMensajeAuditoria(`Break-Glass registrado en cti_audit. Evento ${resultado.auditId}.`);
    } catch (error) {
      setErrorModal((error as Error).message);
    } finally {
      setPendiente(false);
    }
  };

  if (!campanaActual) {
    return <p className="inst-panel p-4" role={errorCampanas ? 'alert' : 'status'}>{errorCampanas || 'Cargando campañas…'}</p>;
  }

  return (
    <section className="space-y-5 text-[#073B2C]">
      {/* Selector táctil de campañas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {campanas.map((c) => {
          const activa = c.campaignCode === campanaActual.campaignCode;
          return (
            <button
              key={c.campaignCode}
              type="button"
              disabled={pendiente}
              onClick={() => {
                if (activa) return;
                cerrarModal();
                setCronologia(null);
                setErrorCronologia('');
                setMensajeAuditoria('');
                setCampanaSeleccionadaId(c.campaignCode);
              }}
              className={`btn-touch min-h-[82px] cursor-pointer rounded-xl border p-3.5 text-left ${
                activa
                  ? 'border-[#0B5D46] border-l-4 border-l-[#0B5D46] bg-[#E3F2EC] shadow-sm'
                  : 'border-[#CDE2D7] bg-white hover:border-[#0B5D46]/60 hover:bg-[#F4FAF7]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 font-mono text-[11px]">
                <span className={activa ? 'font-bold text-[#063729]' : 'text-slate-600'}>
                  {c.campaignCode}
                </span>
                <span className={`rounded-md border px-2 py-0.5 font-bold ${badgeSeveridad[c.severity]}`}>
                  {c.eventCount?.toLocaleString('es-EC') ?? '—'} ev.
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[#073B2C]">
                {c.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Cabecera de campaña + Break-Glass */}
      <div className="inst-panel-accent p-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">
                {campanaActual.campaignCode}
              </span>
              <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${badgeSeveridad[campanaActual.severity]}`}>
                {campanaActual.severity}
              </span>
              <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 text-xs font-semibold text-[#063729]">
                Admiralty {campanaActual.admiraltyRating ?? '—'}
              </span>
              {eventos?.some((evento) => evento.clockSkewAdjusted) && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  <TimelineIcon className="h-3.5 w-3.5" />
                  +12h CLOCK SKEW FIX SELECTIVO
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-[#073B2C] sm:text-xl">{campanaActual.title}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
              {campanaActual.ioas?.join(' · ')}
            </p>
            <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs text-slate-600">
              <span>Origen FW: <strong className="text-[#073B2C]">{indicadores?.sourceIps?.join(', ') || '—'}</strong></span>
              <span>Destino FW: <strong className="text-rose-700">{indicadores?.destinationIps?.join(', ') || '—'}</strong></span>
              <span>Puertos: <strong className="text-[#0B5D46]">{indicadores?.ports?.join(', ') || '—'}</strong></span>
            </div>
          </div>

          {/* Bóveda Break-Glass */}
          <div className="shrink-0 rounded-xl border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50/60 p-4 lg:w-80">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#073B2C]">
              <LockIcon className="h-4 w-4 text-[#0B5D46]" />
              ACCOUNT VAULT · BREAK-GLASS
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
              {estaEnModoMock() ? 'Disponible con la API real.' : 'Revela una cuenta técnica con autorización y auditoría.'}
            </p>
            <button
              type="button"
              disabled={estaEnModoMock() || cuentas.length === 0}
              onClick={() => {
                setErrorModal('');
                setRevelacion(null);
                setModalAbierto(true);
              }}
              className="btn-touch mt-3 min-h-[46px] w-full rounded-lg bg-rose-600 px-4 py-2.5 font-mono text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Revelar cuenta técnica
            </button>
          </div>
        </div>

        {mensajeAuditoria && (
          <div className="mt-4 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2.5 font-mono text-xs font-semibold text-[#063729]">
            {mensajeAuditoria}
          </div>
        )}
      </div>

      {/* Carriles duales FW <-> MedSys */}
      <div className="inst-panel p-4 sm:p-5">
        <div className="mb-4 hidden gap-3 border-b border-[#E6F1EC] pb-3.5 md:grid md:grid-cols-2">
          <div className="rounded-lg bg-[#0B5D46] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
            CAPA 1 · FIREWALL PERIMETRAL
          </div>
          <div className="rounded-lg bg-[#108A65] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
            CAPA 2 · SISTEMA MÉDICO (10.10.100.30)
          </div>
        </div>

        <div className="space-y-3">
          {!eventos && <p role={errorCronologia ? 'alert' : 'status'}>{errorCronologia || 'Cargando cronología…'}</p>}
          {eventos?.length === 0 && <p>Esta campaña no tiene eventos.</p>}
          {eventos?.map((ev, idx) => {
            const esFirewall = ev.source === 'FIREWALL';

            const card = (
              <article className="rounded-xl border border-[#CDE2D7] bg-[#F8FCFA] p-4">
                <div className="mb-2 flex items-center justify-between gap-2 md:hidden">
                  <span
                    className={`rounded-md px-2.5 py-0.5 font-mono text-[11px] font-bold text-white ${
                      esFirewall ? 'bg-[#0B5D46]' : 'bg-[#108A65]'
                    }`}
                  >
                    {esFirewall ? 'FIREWALL PERIMETRAL' : 'SISTEMA MÉDICO 10.10.100.30'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#0B5D46] px-2 py-0.5 font-bold text-white">
                      #{idx + 1}
                    </span>
                    <span className="tabular-nums font-semibold text-[#073B2C]">{ev.timestamp}</span>
                    {ev.clockSkewAdjusted && (
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        +12h fix
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2.5 font-mono text-sm font-bold text-[#063729]">{ev.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
                  <span className="rounded-md border border-[#CDE2D7] bg-white px-2.5 py-1 text-slate-700">
                    actor: {ev.actorToken ?? '—'}
                  </span>
                  <span className="rounded-md border border-[#CDE2D7] bg-white px-2.5 py-1">cuenta: {ev.accountToken ?? '—'}</span>
                </div>
              </article>
            );

            return (
              <div key={ev.id} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className={esFirewall ? '' : 'hidden md:block'}>
                  {esFirewall ? card : null}
                </div>
                <div className={!esFirewall ? '' : 'hidden md:block'}>
                  {!esFirewall ? card : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Break-Glass accesible */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#063729]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-break-glass"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pendiente) cerrarModal();
          }}
        >
          <div className="inst-panel-accent w-full max-w-md p-6 shadow-2xl">
            <h3 id="titulo-break-glass" className="font-mono text-base font-bold text-[#063729]">
              AUTORIZACIÓN BREAK-GLASS ({campanaActual.campaignCode})
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Registra el motivo en la bitácora inmutable <code className="font-bold text-[#0B5D46]">cti_audit</code> para revelar únicamente los códigos técnicos en <code className="font-bold text-[#0B5D46]">account_vault</code>.
            </p>

            {revelacion ? (
              <div className="mt-4 space-y-3" role="status">
                <p>{revelacion.accountToken} · <strong>{revelacion.technicalAccount}</strong></p>
                <p>Registro de auditoría {revelacion.auditId}</p>
                <button type="button" onClick={cerrarModal} className="rounded-lg border border-[#CDE2D7] px-4 py-2">
                  Ocultar cuenta técnica
                </button>
              </div>
            ) : (
            <form onSubmit={handleConfirmarBreakGlass} className="mt-4 space-y-4">
              <label className="block font-mono text-xs font-bold">
                Cuenta técnica
                <select name="accountToken" required className="mt-1 block w-full rounded-lg border border-[#CDE2D7] p-2">
                  {cuentas.map((cuenta) => <option key={cuenta} value={cuenta}>{cuenta}</option>)}
                </select>
              </label>
              <label className="block font-mono text-xs font-bold">
                Clave de investigación
                <input name="clave" type="password" autoComplete="off" required className="mt-1 block w-full rounded-lg border border-[#CDE2D7] p-2" />
              </label>
              <div>
                <label htmlFor="analista-id" className="block font-mono text-xs font-bold text-[#073B2C]">
                  Operador SOC
                </label>
                <input
                  id="analista-id"
                  type="text"
                  autoFocus
                  name="analystId"
                  required
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2 font-mono text-base text-[#073B2C] focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="motivo-auditoria" className="block font-mono text-xs font-bold text-[#073B2C]">
                  Motivo de investigación (mín. 10 caracteres)
                </label>
                <textarea
                  id="motivo-auditoria"
                  rows={3}
                  name="reason"
                  minLength={10}
                  required
                  placeholder="Ej. Verificación de cuenta técnica en incidente 2026-10-24..."
                  className="mt-1.5 w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 text-base text-[#073B2C] focus:border-[#0B5D46] focus:bg-white focus:outline-none"
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
                  disabled={pendiente}
                  className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-[#F4FAF7] sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pendiente}
                  className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 sm:w-auto"
                >
                  {pendiente ? 'Verificando…' : 'Confirmar y auditar'}
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
