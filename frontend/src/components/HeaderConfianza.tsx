import type { SesionUsuario } from '../auth/rolesAuth';
import {
  ChartBarIcon,
  DocumentCheckIcon,
  LockIcon,
  ShieldIcon,
  TargetIcon,
  TimelineIcon,
} from './AppIcons';

export type VistaActiva = 'dashboard' | 'timeline' | 'threat-intel' | 'report-center';

export interface EstadoSaludApi {
  postgresReady: boolean;
  ollamaReady: boolean;
  zeroEgress: boolean;
  apiDisponible: boolean;
}

interface HeaderConfianzaProps {
  estado: EstadoSaludApi;
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  usandoMocks: boolean;
  sesion: SesionUsuario;
  onCerrarSesion: () => void;
}

const itemsNavegacion: {
  id: VistaActiva;
  codigo: string;
  etiqueta: string;
  subtitulo: string;
  Icon: typeof ChartBarIcon;
}[] = [
  {
    id: 'dashboard',
    codigo: '01',
    etiqueta: 'Telemetría & IPE',
    subtitulo: '10M streaming, ML y mapa 24x31',
    Icon: ChartBarIcon,
  },
  {
    id: 'timeline',
    codigo: '02',
    etiqueta: 'Kill Chain & Break-Glass',
    subtitulo: 'Cruce FW <-> MedSys +12h',
    Icon: TimelineIcon,
  },
  {
    id: 'threat-intel',
    codigo: '03',
    etiqueta: 'MITRE · Sigma · STIX',
    subtitulo: 'IoA/IoC y exportación MISP',
    Icon: TargetIcon,
  },
  {
    id: 'report-center',
    codigo: '04',
    etiqueta: 'Reporte F-11 & Auditoría',
    subtitulo: 'PDF técnico + Hash-Chain',
    Icon: DocumentCheckIcon,
  },
];

export const HeaderConfianza = ({
  estado,
  vistaActiva,
  onCambiarVista,
  usandoMocks,
  sesion,
  onCerrarSesion,
}: HeaderConfianzaProps) => {
  const aislado = estado.apiDisponible && estado.zeroEgress;
  const iaLista = estado.apiDisponible && estado.ollamaReady;
  const bdLista = estado.apiDisponible && estado.postgresReady;

  return (
    <>
      {/* Barra móvil/tablet (< lg) con botones amplios y navegación horizontal cómoda */}
      <header className="border-b border-[#CDE2D7] bg-white text-[#073B2C] shadow-xs lg:hidden">
        <div className="bg-gradient-to-r from-[#063729] to-[#0B5D46] px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/15 text-white">
                <ShieldIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold tracking-wider text-white">
                  AEGISHEALTH · SOC TÉCNICO
                </p>
                <p className="truncate font-mono text-[11px] text-emerald-100">{sesion.usuario}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCerrarSesion}
              className="btn-touch min-h-[40px] shrink-0 cursor-pointer rounded-lg border border-white/35 bg-white/15 px-3.5 py-2 font-mono text-xs font-bold text-white hover:bg-white/25"
            >
              Cambiar perfil
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto bg-[#F4FAF7] px-4 py-2.5" aria-label="Navegación SOC móvil">
          {itemsNavegacion.map((item) => {
            const activa = vistaActiva === item.id;
            const Icono = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCambiarVista(item.id)}
                className={`btn-touch inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-bold ${
                  activa
                    ? 'border-[#0B5D46] bg-[#0B5D46] text-white shadow-xs'
                    : 'border-[#CDE2D7] bg-white text-[#073B2C] hover:border-[#0B5D46]/60 hover:bg-[#E3F2EC]'
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" />
                {item.etiqueta}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Riel institucional lateral fijo (>= lg) */}
      <aside className="hidden w-76 shrink-0 flex-col justify-between border-r border-[#CDE2D7] bg-white text-[#073B2C] shadow-xs lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div>
          {/* Encabezado institucional verde bosque */}
          <div className="bg-gradient-to-br from-[#063729] via-[#0B5D46] to-[#0F7B5C] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/15 text-white">
                <ShieldIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-mono text-sm font-bold tracking-[0.14em] text-white">
                  AEGISHEALTH · CTI
                </h1>
                <p className="font-mono text-[11px] text-emerald-100">
                  CONSOLA TÉCNICA SOC
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between rounded-lg border border-white/25 bg-white/10 px-3 py-2 font-mono text-xs">
              <span className="text-emerald-100">OPERADOR:</span>
              <span className="font-bold text-white">{sesion.usuario}</span>
            </div>
          </div>

          <nav className="space-y-2 p-4" aria-label="Módulos técnicos SOC">
            <p className="px-1.5 pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Módulos de análisis
            </p>
            {itemsNavegacion.map((item) => {
              const activa = vistaActiva === item.id;
              const Icono = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onCambiarVista(item.id)}
                  aria-current={activa ? 'page' : undefined}
                  className={`btn-touch flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${
                    activa
                      ? 'border-[#0B5D46] bg-[#0B5D46] text-white shadow-sm'
                      : 'border-transparent bg-transparent text-[#073B2C] hover:border-[#CDE2D7] hover:bg-[#F4FAF7] hover:text-[#0B5D46]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      activa
                        ? 'border-white/30 bg-white/15 text-white'
                        : 'border-[#CDE2D7] bg-[#F4FAF7] text-[#0B5D46]'
                    }`}
                  >
                    <Icono className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-bold">
                      {item.codigo}. {item.etiqueta}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        activa ? 'text-emerald-100' : 'text-slate-600'
                      }`}
                    >
                      {item.subtitulo}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Telemetría de integridad + cambio de perfil */}
        <div className="space-y-3.5 border-t border-[#CDE2D7] bg-[#F4FAF7] p-4">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-600">
              Estado del nodo
            </span>
            <span className="rounded-md border border-[#CDE2D7] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#0B5D46]">
              {usandoMocks ? 'SIMULACIÓN' : 'API LOCAL'}
            </span>
          </div>

          <ul className="space-y-2 font-mono text-xs">
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <LockIcon className="h-3.5 w-3.5 text-[#0B5D46]" />
                Zero-Egress
              </span>
              <span className={aislado ? 'font-bold text-[#0B5D46]' : 'font-bold text-amber-700'}>
                {aislado ? 'VERIFICADO' : 'REVISAR'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">LOPDP HMAC</span>
              <span className="font-bold text-[#0B5D46]">ACTIVA (0 PII)</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">PostgreSQL 16</span>
              <span className={bdLista ? 'font-bold text-[#0B5D46]' : 'font-bold text-rose-700'}>
                {bdLista ? 'ONLINE' : 'OFFLINE'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Ollama GPU</span>
              <span className={iaLista ? 'font-bold text-[#0D6E52]' : 'text-slate-500'}>
                {iaLista ? 'READY' : 'STANDBY'}
              </span>
            </li>
          </ul>

          <button
            type="button"
            onClick={onCerrarSesion}
            className="btn-touch min-h-[44px] w-full cursor-pointer rounded-lg border border-[#0B5D46]/40 bg-white px-4 py-2.5 font-mono text-xs font-bold text-[#0B5D46] hover:bg-[#0B5D46] hover:text-white"
          >
            Cambiar rol / Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};
