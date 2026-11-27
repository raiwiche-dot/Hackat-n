import React, { useEffect, useState } from 'react';
import type { SeccionF11 } from '../mocks/mockData';
import {
  descargarArchivo,
  obtenerEventosAuditoriaApi,
  regenerarSeccionLlmApi,
  solicitarReportePorAudienciaApi,
  verificarCadenaAuditoriaApi,
} from '../services/apiClient';
import type { EventoAuditoriaApi } from '../services/apiClient';
import { sanitizarCeldaCsv } from '../utils/csvSanitizer';
import { CheckIcon, DocumentCheckIcon, DownloadIcon, ShieldIcon } from '../components/AppIcons';

interface ReportCenterPageProps {
  secciones: SeccionF11[];
}

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({
  secciones,
}) => {
  const [conclusionActual, setConclusionActual] = useState('');
  const [regenerando, setRegenerando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [cadenaVerificada, setCadenaVerificada] = useState<boolean | null>(null);
  const [mensajeEstado, setMensajeEstado] = useState('');
  const [errorEstado, setErrorEstado] = useState('');
  const [errorAuditoria, setErrorAuditoria] = useState('');
  const [registrosAuditoria, setRegistrosAuditoria] = useState<EventoAuditoriaApi[]>([]);
  const [verificando, setVerificando] = useState(false);

  const cargarAuditoria = async () => {
    try {
      setRegistrosAuditoria(await obtenerEventosAuditoriaApi());
      setErrorAuditoria('');
    } catch (error) {
      setErrorAuditoria((error as Error).message);
    }
  };

  useEffect(() => {
    let vigente = true;
    obtenerEventosAuditoriaApi()
      .then((eventos) => { if (vigente) setRegistrosAuditoria(eventos); })
      .catch((error: Error) => { if (vigente) setErrorAuditoria(error.message); });
    return () => { vigente = false; };
  }, []);
  const [seccionActivaNum, setSeccionActivaNum] = useState<number>(8);

  const seccionActual =
    secciones.find((s) => s.numero === seccionActivaNum) ?? secciones[0];

  const handleRegenerarConclusion = async () => {
    setRegenerando(true);
    setMensajeEstado('');
    setErrorEstado('');
    try {
      const respuesta = await regenerarSeccionLlmApi();
      setConclusionActual(respuesta.text);
      setMensajeEstado('Sección 8 regenerada localmente con Ollama.');
    } catch (error) {
      setErrorEstado((error as Error).message);
    } finally {
      setRegenerando(false);
    }
  };

  const handleDescargarPdfTecnico = async () => {
    setDescargando(true);
    setMensajeEstado('');
    setErrorEstado('');
    try {
      const archivo = await solicitarReportePorAudienciaApi('technical', conclusionActual);
      descargarArchivo(archivo);
      setMensajeEstado(`${archivo.filename} descargado del servidor local.`);
      setCadenaVerificada(null);
      await cargarAuditoria();
    } catch (error) {
      setErrorEstado((error as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  const handleExportarAuditoriaCsv = () => {
    const encabezados = ['ID', 'Timestamp', 'Operación', 'Dataset', 'SHA-256'];
    const filas = registrosAuditoria.map((r) =>
      [String(r.auditId), r.executedAt ?? '', r.operation, r.datasetName ?? '', r.rowHash]
        .map(sanitizarCeldaCsv)
        .join(',')
    );
    const csvContenido = [encabezados.map(sanitizarCeldaCsv).join(','), ...filas].join('\n');
    descargarArchivo({
      blob: new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' }),
      filename: 'cti_audit_hashchain_sanitizado.csv',
    });
    setMensajeEstado('Bitácora exportada en CSV con protección contra Formula Injection.');
  };

  const handleVerificarHashChain = async () => {
    setVerificando(true);
    setErrorAuditoria('');
    try {
      const resultado = await verificarCadenaAuditoriaApi();
      setCadenaVerificada(resultado.intact);
    } catch (error) {
      setCadenaVerificada(null);
      setErrorAuditoria((error as Error).message);
    } finally {
      setVerificando(false);
    }
  };

  return (
    <section className="space-y-5 text-[#073B2C]">
      <div className="inst-panel-accent overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#063729]">
              <DocumentCheckIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />
              <span>REPORTE TÉCNICO CTI · FICHA F-11 (8/8 SECCIONES · TLP:RED)</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Consulta la estructura del informe y descarga el documento completo generado por el servidor.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 font-mono text-xs sm:flex-row sm:flex-wrap sm:text-sm">
            <button
              type="button"
              onClick={handleRegenerarConclusion}
              disabled={regenerando}
              className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#0B5D46]/40 bg-white px-4 py-2 font-bold text-[#063729] hover:bg-[#E3F2EC] disabled:opacity-50 sm:w-auto"
            >
              {regenerando ? 'Generando Ollama...' : 'Regenerar Sec. 8 (Ollama)'}
            </button>
            <button
              type="button"
              onClick={handleDescargarPdfTecnico}
              disabled={descargando}
              className="btn-touch inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0B5D46] px-5 py-2 font-bold text-white shadow-xs hover:bg-[#063729] disabled:opacity-50 sm:w-auto"
            >
              <DownloadIcon className="h-4 w-4" />
              {descargando ? 'Compilando...' : 'Descargar PDF Técnico F-11'}
            </button>
          </div>
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
                  <span>{sec.numero}. {sec.titulo}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 p-4 sm:p-5 lg:col-span-7">
            {seccionActual && (
              <div className="rounded-xl border border-[#CDE2D7] border-l-4 border-l-[#0B5D46] bg-[#F4FAF7] p-4">
                <p className="font-mono text-xs font-bold text-[#0B5D46]">
                  SECCIÓN {seccionActual.numero} / 8
                </p>
                <h3 className="mt-1 text-base font-bold text-[#073B2C]">{seccionActual.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {seccionActual.resumen}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="editor-conclusion" className="block font-mono text-xs font-bold text-[#073B2C]">
                Conclusión de Ollama · se adjunta como nota al PDF técnico
              </label>
              <textarea
                id="editor-conclusion"
                rows={4}
                value={conclusionActual}
                onChange={(e) => setConclusionActual(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#CDE2D7] bg-[#F8FCFA] p-3 text-sm leading-relaxed text-[#073B2C] focus:border-[#0B5D46] focus:bg-white focus:outline-none sm:text-base"
              />
            </div>

            {errorEstado && <p role="alert" className="text-rose-800">{errorEstado}</p>}
            {mensajeEstado && (
              <div className="flex items-center gap-2 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2.5 font-mono text-xs font-semibold text-[#063729]">
                <CheckIcon className="h-4 w-4 shrink-0 text-[#0B5D46]" />
                <span>{mensajeEstado}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bitácora Hash-Chain */}
      <div className="inst-panel overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-[#CDE2D7] bg-[#F4FAF7] px-4 py-3.5 font-mono text-xs sm:flex-row sm:items-center sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-[#0B5D46]" />
            <span className="font-bold text-[#063729]">BITÁCORA INMUTABLE cti_audit.audit_events</span>
            <span
              className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${
                cadenaVerificada
                  ? 'border-[#CDE2D7] bg-[#E3F2EC] text-[#063729]'
                  : 'border-rose-300 bg-rose-50 text-rose-800'
              }`}
            >
              {cadenaVerificada === null ? 'VERIFICACIÓN PENDIENTE' : cadenaVerificada ? 'HASH-CHAIN ÍNTEGRO' : 'REVISAR CADENA'}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleVerificarHashChain}
              disabled={verificando}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2 text-xs font-bold text-[#063729] hover:bg-[#0B5D46] hover:text-white sm:w-auto"
            >
              {verificando ? 'Verificando…' : 'Verificar Hash-Chain'}
            </button>
            <button
              type="button"
              onClick={handleExportarAuditoriaCsv}
              disabled={registrosAuditoria.length === 0 || Boolean(errorAuditoria)}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#F4FAF7] sm:w-auto"
            >
              Exportar CSV sanitizado
            </button>
          </div>
        </div>

        {errorAuditoria && <p role="alert" className="px-4 py-2 text-rose-800">{errorAuditoria}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs sm:text-sm">
            <thead className="border-b border-[#CDE2D7] bg-[#F8FCFA] text-xs text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5">ID</th>
                <th className="px-3.5 py-2.5">TIMESTAMP</th>
                <th className="px-3.5 py-2.5">OPERACIÓN</th>
                <th className="px-3.5 py-2.5">DATASET</th>
                <th className="px-3.5 py-2.5">ROW HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6F1EC]">
              {registrosAuditoria.map((reg) => (
                <tr key={reg.auditId} className="hover:bg-[#F8FCFA]">
                  <td className="px-3.5 py-2.5 font-bold text-[#0B5D46]">{reg.auditId}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">{reg.executedAt ?? '—'}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-[#073B2C]">{reg.operation}</td>
                  <td className="px-3.5 py-2.5 font-sans text-sm text-slate-700">{reg.datasetName ?? '—'}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold text-[#0D6E52]">
                    {reg.rowHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
