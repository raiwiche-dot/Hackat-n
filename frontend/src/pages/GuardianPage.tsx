import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, describirError } from '../services/apiClient';
import {
  decidirCasoGuardianApi,
  evaluarGuardianApi,
  obtenerCasoGuardianApi,
  obtenerCasosGuardianApi,
  type AlertaGuardian,
  type CasoGuardian,
  type CredencialAnalista,
  type DecisionCaso,
  type EvaluacionGuardian,
} from '../services/pilotoApi';
import { AlertIcon, CheckIcon, LockIcon, ShieldIcon, TimelineIcon } from '../components/AppIcons';

interface GuardianPageProps {
  credencial: CredencialAnalista;
  onCambiarCredencial: (c: CredencialAnalista) => void;
}

const badgeSeveridad = (s: string) => {
  const v = s.toUpperCase();
  if (v.startsWith('CRIT')) return 'border-rose-300 bg-rose-50 text-rose-800';
  if (v.startsWith('ALT') || v === 'HIGH') return 'border-amber-300 bg-amber-50 text-amber-800';
  if (v.startsWith('MED')) return 'border-[#CDE2D7] bg-[#F4FAF7] text-[#073B2C]';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const badgeEstadoCaso: Record<string, string> = {
  EN_REVISION: 'border-amber-300 bg-amber-50 text-amber-800',
  CONFIRMADO: 'border-rose-300 bg-rose-50 text-rose-800',
  DESCARTADO: 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]',
};

const badgeOperacion: Record<string, string> = {
  RETENIDA: 'border-rose-300 bg-rose-50 text-rose-800',
  LIBERADA: 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]',
};

const formatoConfianza = (c: AlertaGuardian['confidence']) =>
  typeof c === 'number' ? (c <= 1 ? `${Math.round(c * 100)}%` : String(c)) : c ?? 'Sin dato';

const formatoValor = (v: unknown): string =>
  v === null || v === undefined ? 'Sin dato' : typeof v === 'object' ? JSON.stringify(v) : String(v);

export const GuardianPage = ({ credencial, onCambiarCredencial }: GuardianPageProps) => {
  const [evaluacion, setEvaluacion] = useState<EvaluacionGuardian | null>(null);
  const [casos, setCasos] = useState<CasoGuardian[]>([]);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState('');

  const [casoSel, setCasoSel] = useState<CasoGuardian | null>(null);
  const [motivo, setMotivo] = useState('');
  const [decidiendo, setDecidiendo] = useState<DecisionCaso | null>(null);
  const [msgCaso, setMsgCaso] = useState<{ ok: boolean; texto: string } | null>(null);

  const credOk = credencial.analystId.trim() !== '' && credencial.analystToken.trim() !== '';

  const actualizarCasoEnLista = (c: CasoGuardian) =>
    setCasos((prev) => {
      const existe = prev.some((x) => x.caseId === c.caseId);
      return existe ? prev.map((x) => (x.caseId === c.caseId ? c : x)) : [c, ...prev];
    });

  const handleEvaluar = async () => {
    setEvaluando(true);
    setError('');
    try {
      const r = await evaluarGuardianApi(credencial);
      setEvaluacion(r);
      setCasos(r.cases);
      if (casoSel) setCasoSel(r.cases.find((c) => c.caseId === casoSel.caseId) ?? null);
    } catch (e) {
      setError(`Evaluar: ${describirError(e)}`);
    } finally {
      setEvaluando(false);
    }
  };

  const handleActualizarCasos = async () => {
    setError('');
    try {
      setCasos(await obtenerCasosGuardianApi(credencial));
    } catch (e) {
      setError(`Casos: ${describirError(e)}`);
    }
  };

  const abrirCaso = async (caseId: string) => {
    setMsgCaso(null);
    setMotivo('');
    try {
      const c = await obtenerCasoGuardianApi(credencial, caseId);
      setCasoSel(c);
      actualizarCasoEnLista(c);
    } catch (e) {
      setMsgCaso({ ok: false, texto: `Caso ${caseId}: ${describirError(e)}` });
    }
  };

  const handleDecidir = async (decision: DecisionCaso, e?: FormEvent) => {
    e?.preventDefault();
    if (!casoSel || decidiendo) return;
    const reason = motivo.trim();
    if (reason.length < 10 || reason.length > 300) {
      setMsgCaso({ ok: false, texto: 'El motivo debe tener entre 10 y 300 caracteres.' });
      return;
    }
    setDecidiendo(decision);
    setMsgCaso(null);
    try {
      const r = await decidirCasoGuardianApi(credencial, casoSel.caseId, decision, reason);
      setCasoSel(r);
      actualizarCasoEnLista(r);
      setMsgCaso({
        ok: true,
        texto: `Caso ${r.status}. Operación ${r.operationStatus}. Auditoría ${r.auditId ?? 'sin ID'}.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Decisión incompatible: el caso ya fue resuelto. Se vuelve a consultar.
        try {
          const actual = await obtenerCasoGuardianApi(credencial, casoSel.caseId);
          setCasoSel(actual);
          actualizarCasoEnLista(actual);
        } catch {
          /* se mantiene el mensaje de 409 */
        }
        setMsgCaso({ ok: false, texto: `409 · ${err.message} Se actualizó el estado del caso.` });
      } else {
        setMsgCaso({ ok: false, texto: describirError(err) });
      }
    } finally {
      setDecidiendo(null);
    }
  };

  const alertas = evaluacion?.alerts ?? [];
  const enRevision = casos.filter((c) => c.status === 'EN_REVISION').length;

  return (
    <section className="space-y-5 text-[#073B2C]">
      {/* Cinta + credenciales del analista */}
      <div className="inst-panel-accent p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">GUARDIÁN · PROTECCIÓN DE OPERACIONES</span>
              <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 font-bold text-amber-800">
                OPERACIONES SIMULADAS
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              Evalúa los eventos del piloto, cruza con los reportes de Centinela y retiene operaciones sospechosas hasta la decisión del analista.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto] lg:w-[34rem]">
            <div>
              <label htmlFor="analyst-id" className="block font-mono text-[11px] font-bold text-[#073B2C]">
                Analista (X-Analyst-Id)
              </label>
              <input
                id="analyst-id"
                type="text"
                value={credencial.analystId}
                onChange={(e) => onCambiarCredencial({ ...credencial, analystId: e.target.value })}
                className="mt-1 min-h-[42px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3 py-1.5 font-mono text-sm focus:border-[#0B5D46] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="analyst-token" className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#073B2C]">
                <LockIcon className="h-3 w-3 text-[#0B5D46]" />
                Token del analista
              </label>
              <input
                id="analyst-token"
                type="password"
                autoComplete="off"
                value={credencial.analystToken}
                onChange={(e) => onCambiarCredencial({ ...credencial, analystToken: e.target.value })}
                className="mt-1 min-h-[42px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3 py-1.5 font-mono text-sm focus:border-[#0B5D46] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleEvaluar}
              disabled={evaluando || !credOk}
              className="btn-touch min-h-[42px] cursor-pointer self-end rounded-lg bg-[#0B5D46] px-4 py-2 font-mono text-xs font-bold text-white shadow-xs hover:bg-[#063729] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {evaluando ? 'Evaluando...' : 'Evaluar'}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 font-mono text-xs font-semibold text-rose-800">
            {error}
          </p>
        )}
      </div>

      {/* KPIs */}
      {evaluacion && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { t: 'Alertas', v: alertas.length, c: 'border-t-rose-600 text-rose-700' },
            { t: 'Casos en revisión', v: enRevision, c: 'border-t-amber-500 text-amber-700' },
            { t: 'Eventos evaluados', v: evaluacion.evaluatedEvents, c: 'border-t-[#0B5D46] text-[#063729]' },
            { t: 'Eventos ignorados', v: evaluacion.ignoredEvents, c: 'border-t-[#108A65] text-[#0D6E52]' },
          ].map((k) => (
            <div key={k.t} className={`inst-panel border-t-4 p-4 ${k.c.split(' ')[0]}`}>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">{k.t}</p>
              <p className={`mt-1.5 font-mono text-3xl font-bold tabular-nums ${k.c.split(' ')[1]}`}>
                {k.v.toLocaleString('es-EC')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Alertas */}
        <div className="space-y-3 lg:col-span-7">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
            <AlertIcon className="h-4 w-4" />
            Alertas
          </h2>
          {!evaluacion ? (
            <p className="inst-panel p-5 font-mono text-xs text-slate-500">
              Ingresá las credenciales del analista y pulsá «Evaluar».
            </p>
          ) : alertas.length === 0 ? (
            <p className="inst-panel p-5 font-mono text-xs text-slate-500">La evaluación no generó alertas.</p>
          ) : (
            alertas.map((a, i) => (
              <article key={`${a.rule}-${i}`} className="inst-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#0B5D46] px-2 py-0.5 font-bold text-white">{a.rule}</span>
                    <span className={`rounded-md border px-2 py-0.5 font-bold ${badgeSeveridad(a.severity)}`}>{a.severity}</span>
                    <span className="text-slate-600">Confianza {formatoConfianza(a.confidence)}</span>
                  </div>
                  <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2 py-0.5 font-bold text-[#063729]">{a.action}</span>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{a.explanation}</p>

                {(a.phishingLink || a.phishingReportId) && (
                  <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 font-mono text-xs text-rose-900">
                    Coincide con reporte Centinela{' '}
                    <strong>{a.phishingReportId ?? 'sin ID'}</strong>
                    {a.phishingLink && (
                      <>
                        {' '}· enlace <span className="break-all">{a.phishingLink}</span>
                      </>
                    )}
                  </p>
                )}

                {a.timeline.length > 0 && (
                  <ol className="mt-3 space-y-1.5 border-l-2 border-[#CDE2D7] pl-3 font-mono text-xs">
                    {a.timeline.map((p) => (
                      <li key={p.eventId} className="text-slate-700">
                        <span className="tabular-nums text-slate-500">{p.timestamp}</span> ·{' '}
                        <span className="font-bold text-[#073B2C]">{p.event}</span>{' '}
                        <span className="rounded border border-[#CDE2D7] bg-white px-1.5 text-[10px]">{p.channel}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="mt-3">
                  {a.caseId ? (
                    <button
                      type="button"
                      onClick={() => void abrirCaso(a.caseId as string)}
                      className="btn-touch min-h-[38px] cursor-pointer rounded-lg border border-[#0B5D46] bg-white px-3.5 py-1.5 font-mono text-xs font-bold text-[#0B5D46] hover:bg-[#E3F2EC]"
                    >
                      Abrir caso {a.caseId}
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-500">Alerta informativa · sin caso</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {/* Casos + detalle */}
        <div className="space-y-4 lg:col-span-5">
          <div className="inst-panel overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3 font-mono text-xs">
              <span className="flex items-center gap-2 font-bold text-[#063729]">
                <ShieldIcon className="h-4 w-4 text-[#0B5D46]" />
                CASOS ({casos.length})
              </span>
              <button
                type="button"
                onClick={handleActualizarCasos}
                disabled={!credOk}
                className="btn-touch min-h-[34px] cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-3 py-1 font-bold text-[#063729] hover:bg-[#E3F2EC] disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
            {casos.length === 0 ? (
              <p className="p-4 font-mono text-xs text-slate-500">Sin casos cargados.</p>
            ) : (
              <ul className="divide-y divide-[#E6F1EC]">
                {casos.map((c) => (
                  <li key={c.caseId}>
                    <button
                      type="button"
                      onClick={() => void abrirCaso(c.caseId)}
                      className={`flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-left font-mono text-xs ${
                        casoSel?.caseId === c.caseId ? 'bg-[#E3F2EC]' : 'hover:bg-[#F8FCFA]'
                      }`}
                    >
                      <span className="font-bold text-[#0B5D46]">{c.caseId}</span>
                      <span className="text-slate-600">{c.evidence.rule ?? ''}</span>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeEstadoCaso[c.status] ?? badgeSeveridad('')}`}>
                        {c.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {casoSel && (
            <div className="inst-panel-accent p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded-md bg-[#0B5D46] px-2.5 py-1 font-bold text-white">{casoSel.caseId}</span>
                <span className={`rounded-md border px-2 py-0.5 font-bold ${badgeEstadoCaso[casoSel.status] ?? ''}`}>{casoSel.status}</span>
                <span className={`rounded-md border px-2 py-0.5 font-bold ${badgeOperacion[casoSel.operationStatus] ?? ''}`}>
                  OPERACIÓN {casoSel.operationStatus}
                </span>
                {casoSel.simulated && (
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-800">SIMULADA</span>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-600">
                <TimelineIcon className="h-3.5 w-3.5" />
                Creado {casoSel.createdAt}
              </p>

              <dl className="mt-3 space-y-1 rounded-lg border border-[#CDE2D7] bg-[#F8FCFA] p-3 font-mono text-xs">
                {Object.entries(casoSel.evidence).map(([k, v]) => (
                  <div key={k} className="break-all">
                    <dt className="inline font-bold text-[#063729]">{k}: </dt>
                    <dd className="inline text-slate-700">{formatoValor(v)}</dd>
                  </div>
                ))}
              </dl>

              {casoSel.status === 'EN_REVISION' ? (
                <form onSubmit={(e) => void handleDecidir('CONFIRMAR', e)} className="mt-4 space-y-3">
                  <label htmlFor="motivo-decision" className="block font-mono text-xs font-bold text-[#073B2C]">
                    Motivo de la decisión (10 a 300 caracteres)
                  </label>
                  <textarea
                    id="motivo-decision"
                    rows={3}
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Evidencia del ejercicio revisada."
                    className="w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 text-base focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                  />
                  <p className="text-right font-mono text-[11px] text-slate-500">{motivo.trim().length}/300</p>
                  <div className="flex flex-col gap-2.5 font-mono text-sm sm:flex-row">
                    <button
                      type="submit"
                      disabled={decidiendo !== null}
                      className="btn-touch min-h-[44px] flex-1 cursor-pointer rounded-lg bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {decidiendo === 'CONFIRMAR' ? 'Enviando...' : 'Confirmar (retener)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDecidir('DESCARTAR')}
                      disabled={decidiendo !== null}
                      className="btn-touch min-h-[44px] flex-1 cursor-pointer rounded-lg border border-[#0B5D46] bg-white px-4 py-2 font-bold text-[#0B5D46] hover:bg-[#E3F2EC] disabled:opacity-50"
                    >
                      {decidiendo === 'DESCARTAR' ? 'Enviando...' : 'Descartar (liberar)'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] p-3 font-mono text-xs text-[#063729]">
                  <p>
                    Auditoría: <strong className="break-all">{casoSel.auditId ?? 'Sin dato'}</strong>
                  </p>
                  <p>Decidido por: {casoSel.decidedBy ?? 'Sin dato'}</p>
                  <p className="mt-1 font-sans text-sm">{casoSel.decisionReason ?? ''}</p>
                </div>
              )}

              {msgCaso && (
                <div
                  className={`mt-3 flex items-start gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold ${
                    msgCaso.ok ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]' : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  {msgCaso.ok && <CheckIcon className="h-4 w-4 shrink-0" />}
                  <span className="break-all">{msgCaso.texto}</span>
                </div>
              )}
            </div>
          )}
          {!casoSel && msgCaso && (
            <p className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 font-mono text-xs text-rose-800">{msgCaso.texto}</p>
          )}
        </div>
      </div>
    </section>
  );
};
