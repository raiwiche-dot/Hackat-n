import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CREDENCIALES_QUEMADAS,
  autenticarCredenciales,
  type SesionUsuario,
} from '../auth/rolesAuth';
import { CheckIcon, EyeIcon, LockIcon, ShieldIcon } from '../components/AppIcons';

interface LoginPageProps {
  onLoginExitoso: (sesion: SesionUsuario) => void;
}

type EscenaDemo = 0 | 1 | 2;
type FaseCursor = 'viajando' | 'clic' | 'listo';

const nombresEscena: { id: EscenaDemo; etiqueta: string; url: string }[] = [
  { id: 0, etiqueta: '1. Selección de Rol', url: 'aegishealth.local/acceso' },
  { id: 1, etiqueta: '2. Consola SOC Verde', url: 'aegishealth.local/soc/telemetria' },
  { id: 2, etiqueta: '3. Portal Médico', url: 'aegishealth.local/direccion-medica' },
];

const coordenadasCursor: Record<EscenaDemo, { x: string; y: string }> = {
  0: { x: '34%', y: '75%' }, // Botón Entrar SOC Técnico
  1: { x: '77%', y: '24%' }, // Botón PDF Técnico F-11
  2: { x: '77%', y: '34%' }, // Botón Informe Médico PDF
};

const ProductWalkthroughDemo = () => {
  const [escena, setEscena] = useState<EscenaDemo>(0);
  const [fase, setFase] = useState<FaseCursor>('viajando');
  const [pausaManual, setPausaManual] = useState(false);

  useEffect(() => {
    const tInicio = window.setTimeout(() => setFase('viajando'), 0);
    const tClic = window.setTimeout(() => setFase('clic'), 850);
    const tListo = window.setTimeout(() => setFase('listo'), 1350);

    let tSiguiente: number | undefined;
    if (!pausaManual) {
      tSiguiente = window.setTimeout(() => {
        setEscena((prev) => ((prev + 1) % 3) as EscenaDemo);
        setFase('viajando');
      }, 3600);
    }

    return () => {
      window.clearTimeout(tInicio);
      window.clearTimeout(tClic);
      window.clearTimeout(tListo);
      if (tSiguiente !== undefined) window.clearTimeout(tSiguiente);
    };
  }, [escena, pausaManual]);

  const seleccionarEscena = (id: EscenaDemo) => {
    setPausaManual(true);
    setFase('viajando');
    setEscena(id);
    window.setTimeout(() => setPausaManual(false), 5500);
  };

  const pos = coordenadasCursor[escena];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
          Recorrido interactivo del sistema
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
          Dos entornos separados según el perfil asistencial o técnico.
        </h1>
      </div>

      {/* Ventana de aplicación simulada con cursor animado */}
      <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white text-[#073B2C] shadow-2xl">
        {/* Barra de ventana */}
        <div className="flex items-center justify-between gap-2 border-b border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="truncate rounded-md bg-white px-3 py-1 font-mono text-[11px] font-semibold text-slate-600 shadow-2xs ring-1 ring-[#CDE2D7]">
            {nombresEscena[escena].url}
          </div>
          <span className="shrink-0 font-mono text-[11px] font-bold text-[#0B5D46]">LOCAL</span>
        </div>

        {/* Escenario de contenido con altura estable */}
        <div className="relative h-[295px] overflow-hidden bg-[#EFF6F2] p-3 sm:h-[325px] sm:p-4">
          {/* ESCENA 0: Login y clic en SOC Técnico */}
          {escena === 0 && (
            <div className="grid h-full grid-cols-2 gap-2.5 sm:gap-3.5">
              <div
                className={`flex flex-col justify-between rounded-lg border bg-white p-3 transition-all duration-300 sm:p-4 ${
                  fase !== 'viajando'
                    ? 'border-[#0B5D46] ring-2 ring-[#0B5D46]/25 shadow-md'
                    : 'border-[#CDE2D7]'
                }`}
              >
                <div>
                  <span className="inline-block rounded-md bg-[#E3F2EC] px-2 py-0.5 font-mono text-[9px] font-bold text-[#0B5D46] sm:text-[10px]">
                    FUENTES INTERNAS
                  </span>
                  <h3 className="mt-2 text-xs font-bold text-[#073B2C] sm:text-sm">
                    Departamento Técnico (SOC)
                  </h3>
                  <p className="mt-1 text-[10px] leading-snug text-slate-600 sm:text-xs">
                    Telemetría, Kill Chain +12h, Break-Glass y Ficha F-11.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="truncate rounded border border-[#CDE2D7] bg-[#F4FAF7] px-2 py-1 font-mono text-[10px] text-[#073B2C]">
                    soc.tecnico
                  </div>
                  <div
                    className={`rounded-md px-2.5 py-2 text-center text-[11px] font-bold text-white transition-transform duration-150 sm:text-xs ${
                      fase === 'clic' ? 'scale-95 bg-[#063729]' : 'bg-[#0B5D46]'
                    }`}
                  >
                    {fase === 'listo' ? 'Abriendo Consola...' : 'Ingresar SOC Técnico'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-[#CDE2D7] bg-white/95 p-3 sm:p-4">
                <div>
                  <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold text-[#0D6E52] sm:text-[10px]">
                    FUENTES EXTERNAS
                  </span>
                  <h3 className="mt-2 text-xs font-bold text-[#073B2C] sm:text-sm">
                    Dirección Médica
                  </h3>
                  <p className="mt-1 text-[10px] leading-snug text-slate-600 sm:text-xs">
                    Semáforo hospitalario simple, cero tecnicismos y plan de 3 pasos.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="truncate rounded border border-[#CDE2D7] bg-[#F4FAF7] px-2 py-1 font-mono text-[10px] text-[#073B2C]">
                    direccion.medica
                  </div>
                  <div className="rounded-md border border-[#0D6E52] bg-white px-2.5 py-2 text-center text-[11px] font-bold text-[#0D6E52] sm:text-xs">
                    Ingresar Portal Médico
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ESCENA 1: Consola SOC Institucional Verde */}
          {escena === 1 && (
            <div className="flex h-full gap-3">
              {/* Mini Sidebar */}
              <div className="hidden w-36 shrink-0 flex-col justify-between rounded-lg border border-[#CDE2D7] bg-white p-2.5 sm:flex">
                <div className="space-y-1.5">
                  <div className="rounded-md bg-[#063729] px-2.5 py-1.5 font-mono text-[9px] font-bold text-white">
                    AEGIS · SOC
                  </div>
                  <div className="rounded-md bg-[#E3F2EC] px-2.5 py-1.5 text-[11px] font-bold text-[#0B5D46]">
                    01. Telemetría
                  </div>
                  <div className="px-2.5 py-1 text-[11px] text-slate-600">02. Kill Chain</div>
                  <div className="px-2.5 py-1 text-[11px] text-slate-600">03. MITRE/Sigma</div>
                  <div className="px-2.5 py-1 text-[11px] text-slate-600">04. Reporte F-11</div>
                </div>
                <div className="rounded-md bg-[#E3F2EC] px-2 py-1 font-mono text-[9px] font-bold text-[#0B5D46]">
                  ZERO-EGRESS OK
                </div>
              </div>

              {/* Mini Contenido Técnico */}
              <div className="flex flex-1 flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#CDE2D7] bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] font-bold text-[#0D6E52]">CONSOLA TÉCNICA</p>
                    <p className="truncate text-xs font-bold text-[#073B2C] sm:text-sm">
                      10,023,532 eventos auditados
                    </p>
                  </div>
                  <div
                    className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-white transition-transform duration-150 sm:text-[11px] ${
                      fase === 'clic' ? 'scale-95 bg-[#063729]' : 'bg-[#0B5D46]'
                    }`}
                  >
                    {fase === 'listo' ? 'PDF F-11 Listo' : 'Descargar PDF F-11'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-[#CDE2D7] border-t-2 border-t-[#0B5D46] bg-white p-2">
                    <span className="block text-[9px] text-slate-500">IPs sin puntos</span>
                    <span className="font-mono text-sm font-bold text-[#063729]">1,280</span>
                  </div>
                  <div className="rounded-md border border-[#CDE2D7] border-t-2 border-t-[#108A65] bg-white p-2">
                    <span className="block text-[9px] text-slate-500">ML Sin Reglas</span>
                    <span className="font-mono text-sm font-bold text-[#0D6E52]">5/5</span>
                  </div>
                  <div className="rounded-md border border-[#CDE2D7] border-t-2 border-t-emerald-600 bg-white p-2">
                    <span className="block text-[9px] text-slate-500">Fuga LOPDP</span>
                    <span className="font-mono text-sm font-bold text-[#0B5D46]">0 PII</span>
                  </div>
                </div>

                {/* Mini gráfico de barras */}
                <div className="flex flex-1 items-end justify-between gap-1.5 rounded-lg border border-[#CDE2D7] bg-white px-3 py-2.5">
                  {[36, 52, 42, 68, 45, 58, 92, 54, 48, 86, 40, 62].map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          h > 80 ? 'bg-rose-500' : h > 60 ? 'bg-amber-500' : 'bg-[#108A65]/85'
                        }`}
                        style={{ height: `${Math.round(h * 0.65)}px` }}
                      />
                    </div>
                  ))}
                </div>

                {fase === 'listo' && (
                  <div className="flex items-center gap-1.5 rounded-md border border-[#CDE2D7] bg-[#E3F2EC] px-2.5 py-1.5 text-[10px] font-bold text-[#063729] sm:text-[11px]">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#0B5D46]" />
                    <span className="truncate">
                      Reporte_CTI_Tecnico_F11.pdf generado con SHA-256 verificado
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ESCENA 2: Portal Dirección Médica */}
          {escena === 2 && (
            <div className="flex h-full flex-col justify-between gap-2.5 rounded-lg bg-[#F6FAF8] p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#CDE2D7] bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-bold text-[#0D6E52]">DIRECCIÓN MÉDICA</p>
                  <p className="truncate text-xs font-bold text-[#073B2C] sm:text-sm">
                    Estado del Servicio Clínico
                  </p>
                </div>
                <div
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-bold text-white transition-transform duration-150 sm:text-[11px] ${
                    fase === 'clic' ? 'scale-95 bg-[#063729]' : 'bg-[#0D6E52]'
                  }`}
                >
                  {fase === 'listo' ? 'Informe Descargado' : 'Informe Médico PDF'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-[#CDE2D7] border-l-4 border-l-[#0B5D46] bg-white p-2.5">
                  <p className="text-[9px] font-bold uppercase text-[#0B5D46] sm:text-[10px]">
                    Consulta Externa
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[#073B2C]">Operativa sin caídas</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">99,86% actividad habitual</p>
                </div>
                <div className="rounded-lg border border-amber-300 border-l-4 border-l-amber-600 bg-white p-2.5">
                  <p className="text-[9px] font-bold uppercase text-amber-800 sm:text-[10px]">
                    Cuentas Internas
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[#073B2C]">16 cuentas a revisar</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">0 nombres de pacientes expuestos</p>
                </div>
              </div>

              <div className="rounded-lg border border-[#CDE2D7] bg-white p-2.5 text-[10px] text-slate-700 sm:text-[11px]">
                <p className="font-bold text-[#073B2C]">Plan de 3 pasos en lenguaje simple:</p>
                <p className="mt-1">
                  1. Validar lista con Talento Humano · 2. Prohibir cuentas compartidas · 3. Reforzar accesos
                </p>
              </div>

              {fase === 'listo' && (
                <div className="flex items-center gap-1.5 rounded-md border border-[#CDE2D7] bg-[#E3F2EC] px-2.5 py-1.5 text-[10px] font-bold text-[#063729] sm:text-[11px]">
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#0B5D46]" />
                  <span className="truncate">
                    Reporte_Ejecutivo_Medico.pdf listo para gerencia hospitalaria
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cursor de mouse animado flotando sobre la ventana */}
          <div
            className="pointer-events-none absolute z-30 transition-all duration-700 ease-out"
            style={{ left: pos.x, top: pos.y }}
          >
            {fase === 'clic' && (
              <span className="animate-click-ripple absolute left-1 top-1 h-7 w-7 rounded-full border-2 border-[#0B5D46] bg-emerald-400/30" />
            )}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className={`drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition-transform duration-150 ${
                fase === 'clic' ? 'scale-90' : 'scale-100'
              }`}
              aria-hidden="true"
            >
              <path
                d="M4 2L19 12.5L12.5 14L15.5 20.5L13 21.5L10 15L5.5 18.5L4 2Z"
                fill="#063729"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Selector de capítulos interactivos con área táctil amplia */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        {nombresEscena.map((item) => {
          const activa = escena === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => seleccionarEscena(item.id)}
              className={`btn-touch cursor-pointer rounded-full border px-4 py-2 font-mono text-xs font-semibold transition-all ${
                activa
                  ? 'border-white bg-white text-[#063729] shadow-sm'
                  : 'border-white/35 bg-white/10 text-emerald-50 hover:bg-white/20'
              }`}
            >
              {item.etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LoginPage = ({ onLoginExitoso }: LoginPageProps) => {
  const [usuario, setUsuario] = useState('soc.tecnico');
  const [clave, setClave] = useState('AegisSOC2026!');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const sesion = autenticarCredenciales(usuario, clave);
    if (!sesion) {
      setError('Credenciales inválidas. Seleccione uno de los dos perfiles autorizados.');
      return;
    }
    setError('');
    onLoginExitoso(sesion);
  };

  const seleccionarPerfil = (u: string, c: string) => {
    setUsuario(u);
    setClave(c);
    setError('');
  };

  const ingresarDirecto = (u: string, c: string) => {
    const sesion = autenticarCredenciales(u, c);
    if (sesion) {
      onLoginExitoso(sesion);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden lg:grid lg:grid-cols-12">
      {/* En desktop aparece a la izquierda; en móvil baja para priorizar el acceso */}
      <section className="bg-inst-hero order-2 flex flex-col justify-between px-5 py-7 text-white sm:px-8 lg:order-1 lg:col-span-7 lg:px-10 lg:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-white">
                AEGISHEALTH · CTI
              </p>
              <p className="font-mono text-[11px] text-emerald-100">
                INTELIGENCIA DE AMENAZAS · LOPDP ART. 25
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1 font-mono text-[11px] font-bold tracking-wider text-emerald-50">
            100% LOCAL · ZERO-EGRESS
          </span>
        </div>

        <div className="my-6">
          <ProductWalkthroughDemo />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4 font-mono text-[11px] text-emerald-100/90">
          <span>10,023,532 registros procesados en modo local</span>
          <span>Datos sintéticos de ejercicio · TLP:RED</span>
        </div>
      </section>

      {/* En móvil aparece primero para ingresar rápido con controles táctiles amplios */}
      <section className="bg-institutional-canvas order-1 flex flex-col justify-center px-5 py-8 text-[#073B2C] sm:px-8 lg:order-2 lg:col-span-5 lg:px-10">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#0B5D46]/25 bg-[#E3F2EC] px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-[#0B5D46]">
              <LockIcon className="h-3.5 w-3.5" />
              ACCESO CONTROLADO POR ROL
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#073B2C] sm:text-3xl">
              Iniciar sesión
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Ingresa tus credenciales o elige un perfil rápido para abrir su vista y reporte respectivo.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-[#CDE2D7] bg-white p-5 shadow-sm sm:p-6"
          >
            <div>
              <label htmlFor="login-usuario" className="block text-sm font-bold text-[#073B2C]">
                Usuario institucional
              </label>
              <input
                id="login-usuario"
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="soc.tecnico o direccion.medica"
                className="mt-1.5 min-h-[46px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 font-mono text-base text-[#073B2C] transition-colors focus:border-[#0B5D46] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-clave" className="block text-sm font-bold text-[#073B2C]">
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  id="login-clave"
                  type={mostrarClave ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="min-h-[46px] w-full rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2.5 pr-12 font-mono text-base text-[#073B2C] transition-colors focus:border-[#0B5D46] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  aria-label="Mostrar u ocultar contraseña"
                  className="absolute inset-y-0 right-1 my-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[#E3F2EC] hover:text-[#0B5D46]"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-touch min-h-[48px] w-full cursor-pointer rounded-lg bg-[#0B5D46] px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#063729]"
            >
              Ingresar al panel autorizado
            </button>
          </form>

          {/* Selector rápido de las dos credenciales quemadas */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-600">
              Perfiles quemados (Demo Rápida)
            </p>
            {CREDENCIALES_QUEMADAS.map((cred) => {
              const seleccionado = usuario.trim().toLowerCase() === cred.usuario;
              const esTecnico = cred.rol === 'tecnico';
              return (
                <div
                  key={cred.usuario}
                  className={`rounded-xl border p-4 transition-all ${
                    seleccionado
                      ? 'border-[#0B5D46] bg-white shadow-sm ring-2 ring-[#0B5D46]/15'
                      : 'border-[#CDE2D7] bg-white/90 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`font-mono text-[11px] font-bold tracking-wider ${
                        esTecnico ? 'text-[#0B5D46]' : 'text-[#0D6E52]'
                      }`}
                    >
                      {cred.ambito}
                    </span>
                    <span className="rounded-md border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#073B2C]">
                      {cred.usuario}
                    </span>
                  </div>
                  <p className="mt-1.5 text-base font-bold text-[#073B2C]">{cred.tituloPerfil}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{cred.subtituloPerfil}</p>
                  <div className="mt-3 flex flex-col gap-2.5 border-t border-[#E6F1EC] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-xs text-slate-600">
                      Clave: <strong className="text-[#073B2C]">{cred.clave}</strong>
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => seleccionarPerfil(cred.usuario, cred.clave)}
                        className="btn-touch min-h-[42px] flex-1 cursor-pointer rounded-lg border border-[#CDE2D7] bg-[#F4FAF7] px-3.5 py-2 text-sm font-semibold text-[#073B2C] hover:bg-[#E3F2EC] sm:flex-none"
                      >
                        Rellenar
                      </button>
                      <button
                        type="button"
                        onClick={() => ingresarDirecto(cred.usuario, cred.clave)}
                        className={`btn-touch min-h-[42px] flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold text-white sm:flex-none ${
                          esTecnico
                            ? 'bg-[#0B5D46] hover:bg-[#063729]'
                            : 'bg-[#0D6E52] hover:bg-[#063729]'
                        }`}
                      >
                        Entrar directo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
