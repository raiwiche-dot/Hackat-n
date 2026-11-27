import React, { useCallback, useEffect, useState } from 'react';
import type { SeccionF11 } from '../mocks/mockData';
import {
  describirError,
  descargarReportePdfApi,
  obtenerEventosAuditoriaApi,
  regenerarConclusionesApi,
  verificarCadenaAuditoriaApi,
  type AudienciaReporte,
  type AuditEvent,
  type DescargaReporte,
  type VerifyChainResponse,
} from '../services/apiClient';
import { sanitizarCeldaCsv } from '../utils/csvSanitizer';
import { CheckIcon, DocumentCheckIcon, DownloadIcon, ShieldIcon } from '../components/AppIcons';

interface ReportCenterPageProps {
  secciones: SeccionF11[];
}

type Mensaje = { ok: boolean; texto: string } | null;

const Aviso = ({ msg }: { msg: Mensaje }) =>
  msg ? (
    <div
      className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs font-semibold ${
        msg.ok ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]' : 'border-rose-300 bg-rose-50 text-rose-800'
      }`}
    >
      {msg.ok && <CheckIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />}
      <span className="break-all">{msg.texto}</span>
    </div>
  ) : null;

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({ secciones }) => {
  const [conclusionActual, setConclusionActual] = useState('');
  const [regenerando, setRegenerando] = useState(false);
  const [msgConclusion, setMsgConclusion] = useState<Mensaje>(null);

  const [descargando, setDescargando] = useState<AudienciaReporte | null>(null);
  const [msgPdf, setMsgPdf] = useState<Mensaje>(null);
  const [ultimaDescarga, setUltimaDescarga] = useState<DescargaReporte | null>(null);

  const [eventos, setEventos] = useState<AuditEvent[]>([]);
  const [errorEventos, setErrorEventos] = useState('');
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [cadena, setCadena] = useState<VerifyChainResponse | null>(null);
  const [msgCadena, setMsgCadena] = useState<Mensaje>(null);

  const [seccionActivaNum, setSeccionActivaNum] = useState<number>(8);
  const seccionActual = secciones.find((s) => s.numero === seccionActivaNum) ?? secciones[0];

  const cargarEventos = useCallback(async () => {
    setCargandoEventos(true);
    try {
      setEventos(await obtenerEventosAuditoriaApi());
      setErrorEventos('');
    } catch (e) {
      setErrorEventos(describirError(e));
    } finally {
      setCargandoEventos(false);
    }
  }, []);

  useEffect(() => {
    void cargarEventos();
  }, [cargarEventos]);

  const handleRegenerarConclusion = async () => {
    setRegenerando(true);
    setMsgConclusion(null);
    try {
      setConclusionActual(await regenerarConclusionesApi());
      setMsgConclusion({ ok: true, texto: 'Conclusiones regeneradas con el modelo local (Ollama).' });
    } catch (e) {
      setMsgConclusion({ ok: false, texto: `Regenerar conclusiones: ${describirError(e)}` });
    } finally {
      setRegenerando(false);
    }
  };

  const handleDescargar = async (audience: AudienciaReporte) => {
    if (descargando) return; // evita doble solicitud
    setDescargando(audience);
    setMsgPdf(null);
    try {
      const r = await descargarReportePdfApi(
        audience,
        audience === 'technical' ? conclusionActual : undefined
      );
      setUltimaDescarga(r);
      setMsgPdf({
        ok: true,
        texto: `${r.filename} descargado${r.auditId ? ` · Auditoría ${r.auditId}` : ''}${
          r.sha256 ? ` · SHA-256 ${r.sha256}` : ''
        }`,
      });
      void cargarEventos();
    } catch (e) {
      setMsgPdf({ ok: false, texto: `PDF ${audience === 'medical' ? 'médico' : 'técnico'}: ${describirError(e)}` });
    } finally {
      setDescargando(null);
    }
  };

  const handleVerificarHashChain = async () => {
    setMsgCadena(null);
    try {
      const r = await verificarCadenaAuditoriaApi();
      setCadena(r);
      setMsgCadena({
        ok: r.intact,
        texto: r.intact
          ? `Cadena íntegra: ${r.checkedRows.toLocaleString('es-EC')} filas verificadas.`
          : `Cadena alterada: revisión necesaria (${r.checkedRows.toLocaleString('es-EC')} filas verificadas).`,
      });
      void cargarEventos();
    } catch (e) {
      setCadena(null);
      setMsgCadena({ ok: false, texto: `Verificar cadena: ${describirError(e)}` });
    }
  };

  const handleExportarAuditoriaCsv = () => {
    const encabezados = [
      'auditId', 'executedAt', 'operation', 'datasetName', 'datasetSha256',
      'totalRowsRead', 'rowsPersisted', 'piiScrubbed', 'rowHash',
    ];
    const filas = eventos.map((r) =>
      [r.auditId, r.executedAt, r.operation, r.datasetName, r.datasetSha256,
        r.totalRowsRead, r.rowsPersisted, r.piiScrubbed, r.rowHash]
        .map((v) => sanitizarCeldaCsv(v === null || v === undefined ? '' : String(v)))
        .join(',')
    );
    const csv = [encabezados.join(','), ...filas].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cti_audit_eventos_sanitizado.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="space-y-5 text-[#073B2C]">
      <div className="inst-panel-accent overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#063729]">
              <DocumentCheckIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />
              <span>REPORTE TÉCNICO CTI · FICHA F-11 · INFORME EJECUTIVO MÉDICO</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Cada descarga queda registrada en la bitácora con su ID de auditoría y SHA-256.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 font-mono text-xs sm:flex-row sm:flex-wrap sm:text-sm">
            <button
              type="button"
              onClick={() => handleDescargar('technical')}
              disabled={descargando !== null}
              className="btn-touch inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0B5D46] px-5 py-2 font-bold text-white shadow-xs hover:bg-[#063729] disabled:opacity-50 sm:w-auto"
            >
              <DownloadIcon className="h-4 w-4" />
              {descargando === 'technical' ? 'Generando...' : 'PDF Técnico F-11'}
            </button>
            <button
              type="button"
              onClick={() => handleDescargar('medical')}
              disabled={descargando !== null}
              className="btn-touch inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#0B5D46] bg-white px-5 py-2 font-bold text-[#0B5D46] hover:bg-[#E3F2EC] disabled:opacity-50 sm:w-auto"
            >
              <DownloadIcon className="h-4 w-4" />
              {descargando === 'medical' ? 'Generando...' : 'PDF Ejecutivo Médico'}
            </button>
          </div>
        </div>

        <div className="px-4 pt-4 sm:px-5">
          <Aviso msg={msgPdf} />
        </div>

        <div className="grid grid-cols-1 divide-y divide-[#E6F1EC] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="divide-y divide-[#E6F1EC] lg:col-span-5">
            {secciones.map((sec) => {
              const activa = sec.numero === seccionActivaNum;
              return (
                <button
                  key={sec.numero}
                  type="button"
                  onClick={() => setSeccionActivaNum(sec.numero)}
                  className={`btn-touch flex min-h-[50px] w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-sm ${
                    activa
                      ? 'border-l-4 border-l-[#0B5D46] bg-[#E3F2EC] font-bold text-[#063729]'
                      : 'bg-white text-slate-700 hover:bg-[#F4FAF7]'
                  }`}
                >
                  <span>
                    {sec.numero}. {sec.titulo}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 p-4 sm:p-5 lg:col-span-7">
            {seccionActual && (
              <div className="rounded-xl border border-[#CDE2D7] border-l-4 border-l-[#0B5D46] bg-[#F4FAF7] p-4">
                <p className="font-mono text-xs font-bold text-[#0B5D46]">SECCIÓN {seccionActual.numero} / 8</p>
                <h3 className="mt-1 text-base font-bold text-[#073B2C]">{seccionActual.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{seccionActual.resumen}</p>
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="editor-conclusion" className="block font-mono text-xs font-bold text-[#073B2C]">
                  Conclusiones (se envían como nota «summary» en el PDF técnico)
                </label>
                <button
                  type="button"
                  onClick={handleRegenerarConclusion}
                  disabled={regenerando}
                  className="btn-touch min-h-[38px] cursor-pointer rounded-lg border border-[#0B5D46]/40 bg-white px-3.5 py-1.5 font-mono text-xs font-bold text-[#063729] hover:bg-[#E3F2EC] disabled:opacity-50"
                >
                  {regenerando ? 'Esperando a Ollama...' : 'Regenerar conclusiones'}
                </button>
              </div>
              <textarea
                id="editor-conclusion"
                rows={5}
                value={conclusionActual}
                onChange={(e) => setConclusionActual(e.target.value)}
                placeholder="Vacío: el PDF técnico se genera sin nota adicional."
                className="mt-2 w-full rounded-lg border border-[#CDE2D7] bg-[#F8FCFA] p-3 text-sm leading-relaxed text-[#073B2C] focus:border-[#0B5D46] focus:bg-white focus:outline-none sm:text-base"
              />
            </div>
            <Aviso msg={msgConclusion} />
          </div>
        </div>
      </div>

      {/* Bitácora */}
      <div className="inst-panel overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3.5 font-mono text-xs sm:flex-row sm:items-center sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-[#0B5D46]" />
            <span className="font-bold text-[#063729]">BITÁCORA cti_audit</span>
            {cadena && (
              <span
                className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${
                  cadena.intact
                    ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                {cadena.intact ? 'ÍNTEGRA' : 'ALTERADA'} · {cadena.checkedRows} filas
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void cargarEventos()}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 text-xs font-bold text-[#063729] hover:bg-[#F4FAF7] sm:w-auto"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={handleVerificarHashChain}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2 text-xs font-bold text-[#063729] hover:bg-[#0B5D46] hover:text-white sm:w-auto"
            >
              Verificar integridad
            </button>
            <button
              type="button"
              onClick={handleExportarAuditoriaCsv}
              disabled={eventos.length === 0}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#F4FAF7] disabled:opacity-50 sm:w-auto"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {msgCadena && (
          <div className="px-4 pt-3 sm:px-5">
            <Aviso msg={msgCadena} />
          </div>
        )}

        {errorEventos ? (
          <p className="p-5 font-mono text-xs text-rose-800">Bitácora: {errorEventos}</p>
        ) : cargandoEventos && eventos.length === 0 ? (
          <p className="p-5 font-mono text-xs text-slate-500">Cargando bitácora...</p>
        ) : eventos.length === 0 ? (
          <p className="p-5 font-mono text-xs text-slate-500">Sin eventos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm">
              <thead className="border-b border-[#CDE2D7] bg-[#F8FCFA] text-xs text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">AUDIT ID</th>
                  <th className="px-3.5 py-2.5">FECHA</th>
                  <th className="px-3.5 py-2.5">OPERACIÓN</th>
                  <th className="px-3.5 py-2.5">DATASET</th>
                  <th className="px-3.5 py-2.5 text-right">LEÍDAS / PERSIST.</th>
                  <th className="px-3.5 py-2.5">PII</th>
                  <th className="px-3.5 py-2.5">ROW HASH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6F1EC]">
                {eventos.map((ev) => {
                  const resaltado = ultimaDescarga?.auditId && ultimaDescarga.auditId === ev.auditId;
                  return (
                    <tr key={ev.auditId} className={resaltado ? 'bg-amber-50' : 'hover:bg-[#F8FCFA]'}>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-[#0B5D46]" title={ev.auditId}>
                        {ev.auditId.length > 13 ? `${ev.auditId.slice(0, 13)}…` : ev.auditId}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">{ev.executedAt}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-[#073B2C]">{ev.operation}</td>
                      <td className="px-3.5 py-2.5 text-slate-700" title={ev.datasetSha256 ?? undefined}>
                        {ev.datasetName ?? 'Sin dato'}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-slate-700">
                        {ev.totalRowsRead ?? '—'} / {ev.rowsPersisted ?? '—'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {ev.piiScrubbed === null ? 'Sin dato' : ev.piiScrubbed ? 'Depurada' : 'No'}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold text-[#0D6E52]" title={ev.rowHash}>
                        {ev.rowHash.slice(0, 16)}…
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
