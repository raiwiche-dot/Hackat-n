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
}

const itemsNavegacion: {
    id: VistaActiva;
    grupo: 'ANÁLISIS' | 'RESPUESTA';
    etiqueta: string;
    descripcion: string;
    Icon: typeof ChartBarIcon;
}[] = [
    {
        id: 'dashboard',
        grupo: 'ANÁLISIS',
        etiqueta: 'Resumen y mapa horario',
        descripcion: 'Actividad general y alertas',
        Icon: ChartBarIcon,
    },
    {
        id: 'timeline',
        grupo: 'ANÁLISIS',
        etiqueta: 'Secuencia y Break-Glass',
        descripcion: 'Orden de eventos y privacidad',
        Icon: TimelineIcon,
    },
    {
        id: 'threat-intel',
        grupo: 'RESPUESTA',
        etiqueta: 'Adversarios y reglas',
        descripcion: 'Comportamientos y bloqueos',
        Icon: TargetIcon,
    },
    {
        id: 'report-center',
        grupo: 'RESPUESTA',
        etiqueta: 'Reporte F-11 y auditoría',
        descripcion: '8 secciones e historial',
        Icon: DocumentCheckIcon,
    },
];

export const HeaderConfianza = ({
    estado,
    vistaActiva,
    onCambiarVista,
    usandoMocks,
}: HeaderConfianzaProps) => {
    const aislado = estado.apiDisponible && estado.zeroEgress;
    const iaLista = estado.apiDisponible && estado.ollamaReady;
    const bdLista = estado.apiDisponible && estado.postgresReady;

    return (
        <>
            {/* Barra superior móvil/tablet (< lg) */}
            <header className="border-b border-slate-200 bg-white shadow-sm text-slate-900 lg:hidden">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-teal-200 bg-teal-50 text-teal-700">
                                <ShieldIcon className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-bold tracking-tight text-slate-900">
                                    AegisHealth-CTI
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {usandoMocks ? 'Entorno de práctica clínica' : 'Servicio local activo'}
                                </p>
                            </div>
                        </div>

                        <span
                            className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                aislado
                                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    aislado ? 'bg-teal-500' : 'bg-amber-500'
                                }`}
                            />
                            {aislado ? 'Red aislada' : 'Revisar red'}
                        </span>
                    </div>

                    <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Navegación móvil">
                        {itemsNavegacion.map((item) => {
                            const activa = vistaActiva === item.id;
                            const Icono = item.Icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onCambiarVista(item.id)}
                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                        activa
                                            ? 'border-teal-500 bg-teal-600 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700'
                                    }`}
                                >
                                    <Icono className="h-3.5 w-3.5" />
                                    {item.etiqueta}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* Barra lateral fija clínico-operativa en escritorio (>= lg) */}
            <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white shadow-sm text-slate-900 lg:flex">
                <div className="p-4">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-teal-200 bg-teal-50 text-teal-700">
                            <ShieldIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-slate-900">
                                AegisHealth-CTI
                            </h1>
                            <p className="text-[11px] font-medium text-teal-600">
                                Centro de Amenazas · Ficha F-11
                            </p>
                        </div>
                    </div>

                    <nav className="mt-5 space-y-5" aria-label="Vistas principales">
                        {(['ANÁLISIS', 'RESPUESTA'] as const).map((grupo) => (
                            <div key={grupo}>
                                <p className="px-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {grupo === 'ANÁLISIS' ? '1. Investigación' : '2. Controles y entrega'}
                                </p>
                                <div className="mt-2 space-y-1">
                                    {itemsNavegacion
                                        .filter((item) => item.grupo === grupo)
                                        .map((item) => {
                                            const activa = vistaActiva === item.id;
                                            const Icono = item.Icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => onCambiarVista(item.id)}
                                                    aria-current={activa ? 'page' : undefined}
                                                    className={`flex w-full items-center gap-2.5 rounded-sm border px-2.5 py-2.5 text-left transition-all duration-150 ${
                                                        activa
                                                            ? 'border-teal-200 bg-teal-50 text-teal-800 shadow-xs'
                                                            : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    <span
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border ${
                                                            activa
                                                                ? 'border-teal-300 bg-teal-100 text-teal-700'
                                                                : 'border-slate-200 bg-slate-100 text-slate-500'
                                                        }`}
                                                    >
                                                        <Icono className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className={`block truncate text-xs font-bold ${activa ? 'text-teal-800' : 'text-slate-800'}`}>
                                                            {item.etiqueta}
                                                        </span>
                                                        <span className={`block truncate text-[11px] ${activa ? 'text-teal-600' : 'text-slate-500'}`}>
                                                            {item.descripcion}
                                                        </span>
                                                    </span>
                                                    {activa && (
                                                        <span className="ml-auto h-4 w-0.5 rounded-full bg-teal-500" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Resguardo del entorno */}
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">Resguardo del entorno</span>
                        <span className="rounded-xs border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {usandoMocks ? 'Datos de práctica' : 'Servicio local'}
                        </span>
                    </div>

                    <ul className="mt-3 space-y-2 text-[11px]">
                        <li className="flex items-center justify-between text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                                <LockIcon className="h-3 w-3 text-teal-600" />
                                Red aislada
                            </span>
                            <span className={aislado ? 'font-mono font-bold text-teal-600' : 'font-mono font-bold text-amber-600'}>
                                {aislado ? 'VERIFICADO' : 'REVISAR'}
                            </span>
                        </li>
                        <li className="flex items-center justify-between text-slate-700">
                            <span>Privacidad LOPDP</span>
                            <span className="font-mono font-bold text-teal-600">PROTEGIDA</span>
                        </li>
                        <li className="flex items-center justify-between text-slate-700">
                            <span>Asistente local</span>
                            <span className={iaLista ? 'font-mono font-bold text-teal-600' : 'font-mono text-slate-400'}>
                                {iaLista ? 'ACTIVO' : 'EN ESPERA'}
                            </span>
                        </li>
                        <li className="flex items-center justify-between text-slate-700">
                            <span>Base de datos</span>
                            <span className={bdLista ? 'font-mono font-bold text-teal-600' : 'font-mono font-bold text-rose-600'}>
                                {bdLista ? 'OPERATIVA' : 'SIN CONEXIÓN'}
                            </span>
                        </li>
                    </ul>
                </div>
            </aside>
        </>
    );
};
