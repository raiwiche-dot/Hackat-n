import { useState } from 'react';
import type { SesionUsuario } from '../auth/rolesAuth';
import { CheckIcon, DocumentCheckIcon, DownloadIcon, LockIcon, ShieldIcon } from '../components/AppIcons';
import { resumenEjecutivoMedicoMock } from '../mocks/mockData';
import { solicitarReportePorAudienciaApi } from '../services/apiClient';

interface MedicalPortalPageProps {
  sesion: SesionUsuario;
  onCerrarSesion: () => void;
  onRegistrarAuditoria: (tipoEvento: string, detalle: string, actorToken?: string) => void;
}

const etiquetaPrioridad: Record<'ALTA' | 'MEDIA' | 'CONTROLADA', string> = {
  ALTA: 'border-amber-300 bg-amber-50 text-amber-900',
  MEDIA: 'border-[#CDE2D7] bg-[#F4FAF7] text-[#073B2C]',
  CONTROLADA: 'border-[#CDE2D7] bg-[#E3F2EC] text-[#0B5D46]',
};

export const MedicalPortalPage = ({
  sesion,
  onCerrarSesion,
  onRegistrarAuditoria,
}: MedicalPortalPageProps) => {
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState('');
  const [accionesMarcadas, setAccionesMarcadas] = useState<Record<string, boolean>>({});

  const resumen = resumenEjecutivoMedicoMock;
  const totalMarcadas = Object.values(accionesMarcadas).filter(Boolean).length;

  const toggleAccion = (id: string) => {
    setAccionesMarcadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDescargarInformeMedico = async () => {
    setDescargando(true);
    try {
      const { blob, filename, desdeBackend } = await solicitarReportePorAudienciaApi(
        'medical',
        resumen.resumenSencillo
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = filename;
      enlace.click();
      URL.revokeObjectURL(url);

      setMensajeDescarga(
        `${filename} descargado (${desdeBackend ? 'generado en servidor local' : 'edición ejecutiva local'}).`
      );
      onRegistrarAuditoria(
        'EXPORT_MEDICAL_PDF',
        'Descarga de Informe Ejecutivo para Dirección Médica (fuentes externas).',
        sesion.usuario
      );
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="bg-clinical-paper min-h-screen overflow-x-hidden text-[#073B2C]">
      {/* Cabecera editorial limpia sin menús técnicos */}
      <header className="sticky top-0 z-20 border-b border-[#CDE2D7] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#0B5D46]/25 bg-[#E3F2EC] text-[#0B5D46]">
              <ShieldIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B5D46]">
                AegisHealth · Portal Dirección Médica
              </p>
              <h1 className="text-base font-bold leading-snug text-[#073B2C] sm:text-xl">
                Estado del Servicio Clínico y Protección de Pacientes
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <span className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-3 py-1.5 text-xs font-semibold text-[#063729]">
              <LockIcon className="h-4 w-4 text-[#0B5D46]" />
              Cero datos de pacientes expuestos
            </span>
            <button
              type="button"
              onClick={onCerrarSesion}
              className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#CDE2D7] bg-white px-4 py-2 text-sm font-bold text-[#073B2C] hover:border-[#0B5D46] hover:bg-[#F4FAF7] sm:w-auto"
            >
              Cambiar perfil ({sesion.usuario})
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        {/* Bloque protagonista: Semáforo hospitalario en dos estados simples */}
        <section className="inst-panel-accent p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="space-y-2">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#0B5D46]">
                Resumen del periodo: {resumen.periodoAnalizado}
              </p>
              <h2 className="text-2xl font-bold leading-snug text-[#073B2C] sm:text-3xl">
                La atención médica opera con normalidad; se requiere revisar accesos internos del personal.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base">
                {resumen.resumenSencillo}
              </p>
            </div>

            <div className="shrink-0 space-y-2.5">
              <button
                type="button"
                onClick={handleDescargarInformeMedico}
                disabled={descargando}
                className="btn-touch inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-[#0B5D46] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#063729] disabled:opacity-60 lg:w-auto"
              >
                <DownloadIcon className="h-5 w-5" />
                {descargando ? 'Preparando informe...' : 'Descargar Informe Médico (PDF)'}
              </button>
              <p className="text-center font-mono text-xs text-slate-500">
                Formato ejecutivo hospitalario · Sin jerga técnica
              </p>
            </div>
          </div>

          {mensajeDescarga && (
            <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-4 py-3 text-sm font-semibold text-[#063729]">
              <CheckIcon className="h-5 w-5 shrink-0 text-[#0B5D46]" />
              <span>{mensajeDescarga}</span>
            </div>
          )}

          {/* Semáforo dual */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E6F1EC] pt-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#CDE2D7] border-l-4 border-l-[#0B5D46] bg-[#F4FAF7] p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0B5D46]">
                Atención y Consulta Externa
              </p>
              <p className="mt-1.5 text-lg font-bold text-[#073B2C] sm:text-xl">
                Sistema operativo sin caídas
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                El {resumen.porcentajeOperacionNormal} del movimiento mensual corresponde a consultas y registros habituales.
              </p>
            </div>

            <div className="rounded-xl border border-amber-300 border-l-4 border-l-amber-600 bg-amber-50/80 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Gestión de Usuarios Administrativos
              </p>
              <p className="mt-1.5 text-lg font-bold text-[#073B2C] sm:text-xl">
                Revisión prioritaria requerida
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {resumen.cuentasAdministrativasEnRevision} cuentas administrativas concentraron cambios masivos y 1 descarga el {resumen.descargaFueraDeHorarioFecha}.
              </p>
            </div>
          </div>
        </section>

        {/* Solo 3 cifras claras y grandes */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="inst-panel p-5 sm:p-6">
            <p className="text-sm font-bold text-slate-600">Movimientos auditados</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#073B2C] sm:text-4xl">
              {resumen.movimientosRevisadosTexto}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Registros revisados en octubre sin afectar la velocidad de atención.
            </p>
          </article>

          <article className="inst-panel p-5 sm:p-6">
            <p className="text-sm font-bold text-slate-600">Cuentas internas a verificar</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-amber-700 sm:text-4xl">
              {resumen.cuentasAdministrativasEnRevision} cuentas
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Representan solo el {resumen.porcentajeActividadRevisar} del uso, pero concentran cambios de permisos.
            </p>
          </article>

          <article className="inst-panel p-5 sm:p-6">
            <p className="text-sm font-bold text-slate-600">Datos personales expuestos</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#0B5D46] sm:text-4xl">
              {resumen.nombresPacientesExpuestos} nombres
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Resguardo estricto bajo LOPDP: identidades ocultas durante todo el análisis.
            </p>
          </article>
        </section>

        {/* Hallazgos en lenguaje simple + Plan de acción interactivo */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="inst-panel p-5 sm:p-6 lg:col-span-6">
            <div className="border-b border-[#E6F1EC] pb-3.5">
              <h3 className="text-lg font-bold text-[#073B2C]">
                Qué se observó en palabras simples
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Explicación orientada a gestión clínica (sin términos técnicos).
              </p>
            </div>
            <div className="mt-4 space-y-3.5">
              {resumen.hallazgosClaros.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-[#CDE2D7] bg-[#F8FCFA] p-4"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <h4 className="text-base font-bold text-[#073B2C]">{h.titulo}</h4>
                    <span
                      className={`shrink-0 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-bold ${etiquetaPrioridad[h.prioridad]}`}
                    >
                      {h.prioridad}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {h.impactoClinico}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="inst-panel flex flex-col justify-between p-5 sm:p-6 lg:col-span-6">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#E6F1EC] pb-3.5">
                <div>
                  <h3 className="text-lg font-bold text-[#073B2C]">
                    Qué debe decidir la Dirección Médica
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Lista de control para coordinar hoy con Talento Humano y TI.
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-[#CDE2D7] bg-[#E3F2EC] px-3 py-1.5 font-mono text-sm font-bold text-[#063729]">
                  {totalMarcadas}/{resumen.accionesParaDireccion.length}
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                {resumen.accionesParaDireccion.map((item) => {
                  const hecha = Boolean(accionesMarcadas[item.id]);
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-colors ${
                        hecha
                          ? 'border-[#0B5D46]/50 bg-[#E3F2EC]/60'
                          : 'border-[#CDE2D7] bg-white hover:bg-[#F4FAF7]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={hecha}
                        onChange={() => toggleAccion(item.id)}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#0B5D46]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[#0B5D46]">
                            {item.responsable}
                          </span>
                          <span className="rounded bg-[#F4FAF7] px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                            Plazo: {item.plazo}
                          </span>
                        </div>
                        <p
                          className={`mt-1.5 text-sm leading-relaxed ${
                            hecha ? 'text-slate-500 line-through' : 'text-[#073B2C]'
                          }`}
                        >
                          {item.accion}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#CDE2D7] bg-[#F4FAF7] p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <DocumentCheckIcon className="h-5 w-5 shrink-0 text-[#0B5D46]" />
                Informe ejecutivo separado del reporte técnico F-11.
              </span>
              <button
                type="button"
                onClick={handleDescargarInformeMedico}
                className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#0B5D46]/35 bg-white px-4 py-2 text-sm font-bold text-[#0B5D46] hover:bg-[#E3F2EC] sm:w-auto"
              >
                Descargar PDF
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
