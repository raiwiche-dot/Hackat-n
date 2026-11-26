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

const itemsNavegacion: { id: VistaActiva; etiqueta: string; descripcion: string }[] = [
    {
        id: 'dashboard',
        etiqueta: 'Panorama general',
        descripcion: 'Resumen y riesgos',
    },
    {
        id: 'timeline',
        etiqueta: 'Cómo ocurrió',
        descripcion: 'Secuencia de ataques',
    },
    {
        id: 'threat-intel',
        etiqueta: 'Atacantes y detección',
        descripcion: 'Perfiles, IoA/IoC y MISP',
    },
    {
        id: 'report-center',
        etiqueta: 'Informe final (F-11)',
        descripcion: '8 secciones y auditoría',
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

    return (
        <header className="border-b border-slate-200 bg-white shadow-2xs">
            <div className="mx-auto max-w-7xl px-4 pt-3.5 sm:px-6">
                {/* Fila superior: identidad clara + estado comprensible */}
                <div className="flex flex-col gap-3 pb-3.5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-800 text-sm font-bold tracking-tight text-white">
                            AH
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-bold tracking-tight text-slate-900">
                                    AegisHealth-CTI
                                </span>
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                    {usandoMocks ? 'Entorno de práctica (datos sintéticos)' : 'Conectado al servidor local'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Plataforma de inteligencia de amenazas y priorización de controles · Ficha F-11
                            </p>
                        </div>
                    </div>

                    {/* Estado de confianza en lenguaje humano */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                                aislado
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    aislado ? 'bg-emerald-600' : 'bg-amber-500'
                                }`}
                            />
                            {aislado ? 'Sin salida a internet' : 'Verificar aislamiento'}
                        </span>

                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                                iaLista
                                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    iaLista ? 'bg-blue-600' : 'bg-slate-400'
                                }`}
                            />
                            {iaLista ? 'IA local activa' : 'IA local en espera'}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            Privacidad LOPDP activa
                        </span>
                    </div>
                </div>

                {/* Pestañas de navegación comprensibles */}
                <nav
                    className="-mb-px flex gap-2 overflow-x-auto border-t border-slate-100 pt-1 sm:gap-6"
                    aria-label="Vistas principales"
                >
                    {itemsNavegacion.map((item, idx) => {
                        const activa = vistaActiva === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onCambiarVista(item.id)}
                                aria-current={activa ? 'page' : undefined}
                                className={`group flex shrink-0 items-center gap-2 border-b-2 px-1 py-2.5 text-left transition ${
                                    activa
                                        ? 'border-blue-700 text-blue-900'
                                        : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                                }`}
                            >
                                <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                        activa
                                            ? 'bg-blue-700 text-white'
                                            : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                                    }`}
                                >
                                    {idx + 1}
                                </span>
                                <span>
                                    <span className="block text-xs font-semibold sm:text-sm">
                                        {item.etiqueta}
                                    </span>
                                    <span className="hidden text-[11px] text-slate-500 sm:block">
                                        {item.descripcion}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
};
