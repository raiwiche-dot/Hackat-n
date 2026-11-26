// Datos simulados para desarrollo local de AegisHealth-CTI (Rol 4 - Frontend)
// Se usan cuando VITE_USE_MOCKS=true o mientras el backend de Rol 3 termina de integrarse.

export type CampanaId =
    | 'CAMP-2026-001'
    | 'CAMP-2026-002'
    | 'CAMP-2026-003'
    | 'CAMP-2026-004'
    | 'CAMP-2026-005';

export interface EstadoSaludSistema {
    zeroEgressVerificado: boolean;
    lopdpSeudonimizacionActiva: boolean;
    iaLocalOllamaReady: boolean;
    ultimaVerificacion: string;
}

export interface EvidenciaIngesta {
    totalEventos: number;
    eventosFirewall: number;
    eventosSistemaMedico: number;
    modoProcesamiento: string;
    sha256Dataset: string;
    campanasCorrelacionadas: number;
    deteccionSoloMlSinReglas: string;
    ipsSinPuntosDetectadas: number;
    ipsFwSinPuntos: number;
    ipsMedSysSinPuntos: number;
    porcentajeCuentasEspeciales: string;
    cumplimientoLopdp: string;
    piiExpuesta: number;
    hashChainIntegro: boolean;
}

export interface PuntoHorario {
    hora: string;
    firewallEventos: number;
    medSysEventos: number;
    anomalias: number;
}

export interface EscenarioIpe {
    id: 'PROBABLE' | 'PELIGROSO';
    titulo: string;
    campanasClave: string;
    resumen: string;
    impacto: string;
}

export interface EventoLineaTiempo {
    id: string;
    timestamp: string;
    carril: 'FIREWALL' | 'MEDSYS';
    usuarioToken: string;
    cuentaToken: string;
    cuentaTecnicaReal: string; // Solo se revela en modo Break-Glass
    accion: string;
    detalle: string;
    severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    clockSkewAdjusted?: boolean;
}

export interface CampanaDetalle {
    id: CampanaId;
    nombre: string;
    descripcion: string;
    clockSkewAdjusted: boolean;
    eventos: EventoLineaTiempo[];
}

export interface PerfilAdversario {
    id: string;
    nombreClave: string;
    tipoActor: 'EXTERNO' | 'INTERNO' | 'HIBRIDO';
    anomalyScore: number;
    calificacionAdmiralty: string;
    tecnicasMitre: string[];
    resumen: string;
}

export interface ReglaArtefacto {
    id: string;
    nombre: string;
    tipo: 'IoA' | 'IoC';
    descripcion: string;
    sigmaYaml: string;
}

export interface SeccionF11 {
    numero: number;
    titulo: string;
    completada: boolean;
    resumen: string;
}

export interface RegistroAuditoria {
    id: string;
    timestamp: string;
    tipoEvento: string;
    actorToken: string;
    detalle: string;
    hashPrevio: string;
    hashActual: string;
}

export const estadoSaludMock: EstadoSaludSistema = {
    zeroEgressVerificado: true,
    lopdpSeudonimizacionActiva: true,
    iaLocalOllamaReady: true,
    ultimaVerificacion: '2026-11-26T11:50:00-05:00',
};

export const evidenciaIngestaMock: EvidenciaIngesta = {
    totalEventos: 10023532,
    eventosFirewall: 5004120,
    eventosSistemaMedico: 5019412,
    modoProcesamiento: 'Procesamiento local en streaming (Parquet seudonimizado)',
    sha256Dataset: '8f4e2b9c71a0d65e3b12904f7c8a1d3e5f6092817a4b3c2d1e0f9a8b7c6d5e4f',
    campanasCorrelacionadas: 5,
    deteccionSoloMlSinReglas: '3/5',
    ipsSinPuntosDetectadas: 1280,
    ipsFwSinPuntos: 493,
    ipsMedSysSinPuntos: 787,
    porcentajeCuentasEspeciales: '100% en cuentas especiales',
    cumplimientoLopdp: '100%',
    piiExpuesta: 0,
    hashChainIntegro: true,
};

export const serieHorariaMock: PuntoHorario[] = [
    { hora: '00:00', firewallEventos: 120, medSysEventos: 45, anomalias: 14 },
    { hora: '03:00', firewallEventos: 95, medSysEventos: 62, anomalias: 21 },
    { hora: '06:00', firewallEventos: 340, medSysEventos: 210, anomalias: 8 },
    { hora: '09:00', firewallEventos: 1420, medSysEventos: 1890, anomalias: 12 },
    { hora: '12:00', firewallEventos: 1680, medSysEventos: 2150, anomalias: 9 },
    { hora: '15:00', firewallEventos: 1510, medSysEventos: 1940, anomalias: 11 },
    { hora: '18:00', firewallEventos: 890, medSysEventos: 740, anomalias: 16 },
    { hora: '21:00', firewallEventos: 410, medSysEventos: 310, anomalias: 19 },
];

export const escenariosIpeMock: EscenarioIpe[] = [
    {
        id: 'PROBABLE',
        titulo: 'Escenario Más Probable',
        campanasClave: 'CAMP-2026-005 + CAMP-2026-003 / CAMP-2026-004',
        resumen:
            'Patrones recurrentes de autenticación atípica y consultas fuera de horario habitual sobre cuentas de servicio y personal operativo.',
        impacto:
            'Riesgo moderado-alto de consulta indebida o degradación operativa si no se refuerzan horarios permitidos y controles de acceso.',
    },
    {
        id: 'PELIGROSO',
        titulo: 'Escenario Más Peligroso',
        campanasClave: 'Cadena CAMP-2026-005 -> CAMP-2026-001 (186.46.219.18:8443) + CAMP-2026-002',
        resumen:
            'Escalamiento desde el perímetro hacia la red clínica con extracción rápida de registros y salida hacia 186.46.219.18:8443 en apenas 15 segundos.',
        impacto:
            'Riesgo crítico sobre la confidencialidad e integridad de información de salud, con potencial exposición, extorsión o sanción normativa.',
    },
];

export const campanasMock: CampanaDetalle[] = [
    {
        id: 'CAMP-2026-001',
        nombre: 'Exfiltración hacia IP externa 186.46.219.18:8443',
        descripcion:
            'Secuencia acelerada de salto SSH, ingreso al sistema médico sintético, empaquetado de registros y salida por 8443/tcp en 15 segundos.',
        clockSkewAdjusted: true,
        eventos: [
            {
                id: 'EV-01',
                timestamp: '2026-11-26 02:14:01',
                carril: 'FIREWALL',
                usuarioToken: 'USR-4821',
                cuentaToken: 'ACC-9012',
                cuentaTecnicaReal: 'WXY1210010',
                accion: 'SSH_TUNNEL_INIT',
                detalle: 'Conexión SSH entrante validada desde nodo intermedio hacia segmento interno.',
                severidad: 'ALTA',
                clockSkewAdjusted: true,
            },
            {
                id: 'EV-02',
                timestamp: '2026-11-26 02:14:06',
                carril: 'MEDSYS',
                usuarioToken: 'USR-4821',
                cuentaToken: 'ACC-9012',
                cuentaTecnicaReal: 'WXY1210010',
                accion: 'MED_RECORD_QUERY_BURST',
                detalle: 'Secuencia rápida de consultas estructuradas sobre registros clínicos sintéticos.',
                severidad: 'ALTA',
                clockSkewAdjusted: true,
            },
            {
                id: 'EV-03',
                timestamp: '2026-11-26 02:14:11',
                carril: 'MEDSYS',
                usuarioToken: 'USR-4821',
                cuentaToken: 'ACC-9012',
                cuentaTecnicaReal: 'WXY1210010',
                accion: 'BULK_EXPORT_STAGED',
                detalle: 'Preparación y empaquetado de lote de datos en directorio temporal local.',
                severidad: 'CRITICA',
                clockSkewAdjusted: true,
            },
            {
                id: 'EV-04',
                timestamp: '2026-11-26 02:14:16',
                carril: 'FIREWALL',
                usuarioToken: 'USR-4821',
                cuentaToken: 'ACC-9012',
                cuentaTecnicaReal: 'WXY1210010',
                accion: 'EGRESS_8443_TCP',
                detalle: 'Salida de datos hacia 186.46.219.18:8443 cerrando la ventana de 15 segundos.',
                severidad: 'CRITICA',
                clockSkewAdjusted: true,
            },
        ],
    },
    {
        id: 'CAMP-2026-002',
        nombre: 'Persistencia y acceso anómalo en intranet',
        descripcion: 'Reutilización de sesión privilegiada y consultas cruzadas en horas de baja actividad.',
        clockSkewAdjusted: false,
        eventos: [
            {
                id: 'EV-05',
                timestamp: '2026-11-26 02:20:10',
                carril: 'MEDSYS',
                usuarioToken: 'USR-1194',
                cuentaToken: 'ACC-3308',
                cuentaTecnicaReal: 'MINAD',
                accion: 'PRIVILEGED_SESSION_REUSE',
                detalle: 'Reutilización de token de sesión desde un origen distinto al habitual.',
                severidad: 'ALTA',
            },
        ],
    },
    {
        id: 'CAMP-2026-003',
        nombre: 'Reintentos de autenticación perimetral',
        descripcion: 'Ráfaga de intentos fallidos en servicio administrativo seguida de un ingreso válido.',
        clockSkewAdjusted: false,
        eventos: [
            {
                id: 'EV-06',
                timestamp: '2026-11-26 01:05:00',
                carril: 'FIREWALL',
                usuarioToken: 'USR-7720',
                cuentaToken: 'ACC-5510',
                cuentaTecnicaReal: 'SVC_MED_03',
                accion: 'AUTH_FAIL_BURST',
                detalle: 'Múltiples intentos fallidos en puerto de administración previos a una sesión exitosa.',
                severidad: 'MEDIA',
            },
        ],
    },
    {
        id: 'CAMP-2026-004',
        nombre: 'Consulta fuera de ventana operativa',
        descripcion: 'Actividad en sistema médico sintético fuera del horario clínico regular.',
        clockSkewAdjusted: false,
        eventos: [
            {
                id: 'EV-07',
                timestamp: '2026-11-26 03:40:22',
                carril: 'MEDSYS',
                usuarioToken: 'USR-6041',
                cuentaToken: 'ACC-7821',
                cuentaTecnicaReal: 'AUD_CLIN_09',
                accion: 'OFF_HOURS_MED_READ',
                detalle: 'Lectura de registros sintéticos durante la madrugada sin turno programado.',
                severidad: 'MEDIA',
            },
        ],
    },
    {
        id: 'CAMP-2026-005',
        nombre: 'Reconocimiento y pivoteo inicial',
        descripcion: 'Exploración secuencial de rutas internas y preparación de la cadena de acceso.',
        clockSkewAdjusted: true,
        eventos: [
            {
                id: 'EV-08',
                timestamp: '2026-11-26 01:55:12',
                carril: 'FIREWALL',
                usuarioToken: 'USR-4821',
                cuentaToken: 'ACC-9012',
                cuentaTecnicaReal: 'WXY1210010',
                accion: 'INTERNAL_PROBE_SEQ',
                detalle: 'Secuencia ordenada de conexiones hacia la subred del sistema médico.',
                severidad: 'ALTA',
                clockSkewAdjusted: true,
            },
        ],
    },
];

export const adversariosMock: PerfilAdversario[] = [
    {
        id: 'ADV-01',
        nombreClave: 'Actor de Exfiltración Rápida (Perímetro-Intranet)',
        tipoActor: 'HIBRIDO',
        anomalyScore: 0.94,
        calificacionAdmiralty: 'A2',
        tecnicasMitre: ['T1078', 'T1213', 'T1074', 'T1048.002'],
        resumen:
            'Combina acceso con credenciales válidas o escaladas con extracción estructurada de datos y salida cifrada por puerto 8443/tcp en ventana corta.',
    },
    {
        id: 'ADV-02',
        nombreClave: 'Operador de Fuerza Bruta y Escalada',
        tipoActor: 'EXTERNO',
        anomalyScore: 0.78,
        calificacionAdmiralty: 'B2',
        tecnicasMitre: ['T1110.001', 'T1098', 'T1078'],
        resumen:
            'Insiste sobre credenciales y modificación de permisos o accesos para abrir paso hacia servicios internos.',
    },
];

export const artefactosMock: ReglaArtefacto[] = [
    {
        id: 'IOA-01',
        nombre: 'Secuencia rápida acceso médico + egreso por puerto alto',
        tipo: 'IoA',
        descripcion:
            'Detecta el comportamiento en cadena donde ocurre una lectura acelerada seguida de conexión saliente atípica en pocos segundos.',
        sigmaYaml: `title: Deteccion IoA - Secuencia Acceso Medico a Egreso Rapido
status: experimental
description: Identifica patron de comportamiento anomal entre acceso a intranet medica y egreso perimetral
logsource:
  product: custom_synthetic_logs
  service: firewall_medsys_correlacion
detection:
  selection_med:
    event_action|contains:
      - "MED_RECORD_QUERY_BURST"
      - "BULK_EXPORT_STAGED"
  selection_egress:
    dst_port: 8443
    protocol: tcp
  condition: selection_med and selection_egress
falsepositives:
  - Respaldos programados autorizados fuera de ventana
level: high`,
    },
    {
        id: 'IOC-01',
        nombre: 'Destino externo observado en CAMP-2026-001',
        tipo: 'IoC',
        descripcion:
            'Indicador puntual sintético asociado a la conexión saliente 186.46.219.18 en puerto 8443/tcp para contención inmediata.',
        sigmaYaml: `title: Deteccion IoC - Conexion hacia 186.46.219.18:8443 (Sintetico)
status: experimental
description: Regla puntual de contencion sobre indicador sintetico identificado en CAMP-2026-001
logsource:
  category: firewall
detection:
  selection:
    dst_ip: "186.46.219.18"
    dst_port: 8443
  condition: selection
falsepositives:
  - Ninguno en entorno sintetico de prueba
level: critical`,
    },
];

export const seccionesF11Mock: SeccionF11[] = [
    { numero: 1, titulo: 'Fuentes y metodología', completada: true, resumen: 'Datasets sintéticos FW y sistema médico (OSINT/MASINT/IPE) con trazabilidad SHA-256.' },
    { numero: 2, titulo: 'Evaluación de adversarios', completada: true, resumen: 'Actores, motivaciones, objetivos, capacidades, TTP y evidencias seudonimizadas.' },
    { numero: 3, titulo: 'Inteligencia estratégica', completada: true, resumen: 'Impacto institucional sobre confidencialidad, integridad y continuidad de atención en salud.' },
    { numero: 4, titulo: 'Inteligencia táctica', completada: true, resumen: 'Análisis detallado de comportamientos y técnicas MITRE ATT&CK en los escenarios observados.' },
    { numero: 5, titulo: 'Inteligencia operativa', completada: true, resumen: 'Cinco campañas correlacionadas (CAMP-2026-001 a 005), actividades y secuencias de ataque.' },
    { numero: 6, titulo: 'Inteligencia técnica', completada: true, resumen: 'Diferenciación IoA vs. IoC, reglas de detección Sigma y exportación STIX 2.1 para MISP.' },
    { numero: 7, titulo: 'Evaluación de escenarios', completada: true, resumen: 'Comparativa IPE entre el escenario más común/probable y el más peligroso.' },
    { numero: 8, titulo: 'Conclusiones', completada: true, resumen: 'Priorización de acciones oportunas, controles de ciberseguridad y cadena de custodia.' },
];

export const auditoriaInicialMock: RegistroAuditoria[] = [
    {
        id: 'AUD-101',
        timestamp: '2026-11-26 08:45:00',
        tipoEvento: 'INGESTA_STREAMING_LOCAL',
        actorToken: 'SYS-PIPELINE',
        detalle: 'Procesados 10,023,532 registros en modo local con seudonimización LOPDP.',
        hashPrevio: '0000000000000000',
        hashActual: '9a7f3c2e1b8d4056',
    },
    {
        id: 'AUD-102',
        timestamp: '2026-11-26 09:10:00',
        tipoEvento: 'VERIFICACION_ZERO_EGRESS',
        actorToken: 'SYS-GUARD',
        detalle: 'Prueba de socket local confirmada sin salida externa no autorizada.',
        hashPrevio: '9a7f3c2e1b8d4056',
        hashActual: '4c1e8b5a9203d71f',
    },
];
