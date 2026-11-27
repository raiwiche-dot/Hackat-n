import React, { useState } from 'react';
import type { RegistroAuditoria, SeccionF11 } from '../mocks/mockData';
import {
  regenerarSeccionLlmApi,
  solicitarReportePorAudienciaApi,
  verificarCadenaAuditoriaApi,
} from '../services/apiClient';
import { sanitizarCeldaCsv } from '../utils/csvSanitizer';
import { CheckIcon, DocumentCheckIcon, DownloadIcon, ShieldIcon } from '../components/AppIcons';

interface ReportCenterPageProps {
  secciones: SeccionF11[];
  registrosAuditoria: RegistroAuditoria[];
  onRegistrarEventoAuditoria: (tipoEvento: string, detalle: string) => void;
}

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({
  secciones,
  registrosAuditoria,
  onRegistrarEventoAuditoria,
}) => {
  const [conclusionActual, setConclusionActual] = useState(
    secciones[7]?.resumen ??
      'Migrar servicios 8470–8478 a TLS 9470–9476, deshabilitar Telnet 23/tcp y SMBv1 445/tcp, restringir egreso 8443/tcp y mantener auditoría hash-chain bajo LOPDP.'
  );
  const [regenerando, setRegenerando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [cadenaVerificada, setCadenaVerificada] = useState(true);
  const [mensajeEstado, setMensajeEstado] = useState('');
  const [seccionActivaNum, setSeccionActivaNum] = useState<number>(8);

  const seccionActual =
    secciones.find((s) => s.numero === seccionActivaNum) ?? secciones[0];

  const handleRegenerarConclusion = async () => {
    setRegenerando(true);
    try {
      const respuesta = await regenerarSeccionLlmApi(8);
      setConclusionActual(respuesta.texto);
      setMensajeEstado('Sección 8 regenerada localmente con Ollama.');
      onRegistrarEventoAuditoria(
        'LLM_LOCAL_REGENERATE',
        'Regeneración local de Sección 8 con Ollama sobre payload allowlist.'
      );
    } finally {
      setRegenerando(false);
    }
  };

  const handleDescargarPdfTecnico = async () => {
    setDescargando(true);
    try {
      const { blob, filename } = await solicitarReportePorAudienciaApi(
        'technical',
        conclusionActual
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = filename;
      enlace.click();
      URL.revokeObjectURL(url);

      setMensajeEstado(`${filename} (Reporte Técnico F-11) descargado.`);
      onRegistrarEventoAuditoria(
        'EXPORT_TECHNICAL_F11_PDF',
        'Descarga de Reporte Técnico CTI (Ficha F-11, audiencia=technical).'
      );
    } finally {
      setDescargando(false);
    }
  };

  const handleExportarAuditoriaCsv = () => {
    const encabezados = ['ID', 'Timestamp', 'TipoEvento', 'ActorToken', 'Detalle', 'HashPrevio', 'HashActual'];
    const filas = registrosAuditoria.map((r) =>
      [r.id, r.timestamp, r.tipoEvento, r.actorToken, r.detalle, r.hashPrevio, r.hashActual]
        .map(sanitizarCeldaCsv)
        .join(',')
    );
    const csvContenido = [encabezados.map(sanitizarCeldaCsv).join(','), ...filas].join('\n');
    const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'cti_audit_hashchain_sanitizado.csv';
    enlace.click();
    URL.revokeObjectURL(url);
    setMensajeEstado('Bitácora exportada en CSV con protección contra Formula Injection.');
  };

  const handleVerificarHashChain = async () => {
    const res = await verificarCadenaAuditoriaApi(registrosAuditoria);
    setCadenaVerificada(res.valida);
    setMensajeEstado(
      res.valida
        ? 'Hash-Chain verificada: 0 alteraciones en cti_audit.audit_events.'
        : 'Alerta: discrepancia en la cadena SHA-256.'
    );
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
              Documento técnico completo para SOC/CSIRT (separado del Informe Ejecutivo Médico).
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
                  <span className="shrink-0 rounded-md border border-[#CDE2D7] bg-[#E3F2EC] px-2 py-0.5 font-mono text-[11px] font-bold text-[#063729]">
                    OK
                  </span>
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
                Conclusión técnica Sección 8 (editable antes de compilar F-11)
              </label>
              <textarea
                id="editor-conclusion"
                rows={4}
                value={conclusionActual}
                onChange={(e) => setConclusionActual(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#CDE2D7] bg-[#F8FCFA] p-3 text-sm leading-relaxed text-[#073B2C] focus:border-[#0B5D46] focus:bg-white focus:outline-none sm:text-base"
              />
            </div>

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
              {cadenaVerificada ? 'HASH-CHAIN ÍNTEGRO' : 'REVISAR CADENA'}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleVerificarHashChain}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-2 text-xs font-bold text-[#063729] hover:bg-[#0B5D46] hover:text-white sm:w-auto"
            >
              Verificar Hash-Chain
            </button>
            <button
              type="button"
              onClick={handleExportarAuditoriaCsv}
              className="btn-touch min-h-[42px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 text-xs font-bold text-[#063729] hover:border-[#0B5D46] hover:bg-[#F4FAF7] sm:w-auto"
            >
              Exportar CSV sanitizado
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs sm:text-sm">
            <thead className="border-b border-[#CDE2D7] bg-[#F8FCFA] text-xs text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5">ID</th>
                <th className="px-3.5 py-2.5">TIMESTAMP</th>
                <th className="px-3.5 py-2.5">OPERACIÓN</th>
                <th className="px-3.5 py-2.5">DETALLE</th>
                <th className="px-3.5 py-2.5">PREV → ROW HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6F1EC]">
              {registrosAuditoria.map((reg) => (
                <tr key={reg.id} className="hover:bg-[#F8FCFA]">
                  <td className="px-3.5 py-2.5 font-bold text-[#0B5D46]">{reg.id}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">{reg.timestamp}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-[#073B2C]">{reg.tipoEvento}</td>
                  <td className="px-3.5 py-2.5 font-sans text-sm text-slate-700">{reg.detalle}</td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold text-[#0D6E52]">
                    {reg.hashPrevio.slice(0, 8)} → {reg.hashActual.slice(0, 8)}
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
