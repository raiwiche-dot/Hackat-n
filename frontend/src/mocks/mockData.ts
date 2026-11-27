// Datos forenses verificados en docs/evidencias/evidencias.json y PostgreSQL 16 (Rol 1 + Rol 2)
// Cero PII en claro: todo actor/cuenta usa tokens HMAC-SHA256 (USR- / ACC-) generados por Rol 1.

export type CampanaId =
  | 'CAMP-2026-001'
  | 'CAMP-2026-002'
  | 'CAMP-2026-003'
  | 'CAMP-2026-004'
  | 'CAMP-2026-005';

export interface EvidenciaIngesta {
  totalEventos: number;
  eventosFirewall: number;
  eventosSistemaMedico: number;
  modoProcesamiento: string;
  sha256Firewall: string;
  sha256MedSys: string;
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

export interface EventoLineaTiempo {
  id: string;
  timestamp: string;
  carril: 'FIREWALL' | 'MEDSYS';
  usuarioToken: string;
  cuentaToken: string;
  identidadAmbigua?: boolean;
  accion: string;
  detalle: string;
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  clockSkewAdjusted?: boolean;
}

export interface CampanaDetalle {
  id: CampanaId;
  nombre: string;
  descripcion: string;
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA';
  escenarioIpe: 'ESCENARIO_MAS_PELIGROSO' | 'ESCENARIO_MAS_PROBABLE';
  admiralty: string;
  ipOrigenFw: string;
  ipDestinoFw: string;
  puertos: number[];
  volumenEventos: number;
  clockSkewAdjusted: boolean;
  identidadAmbigua?: boolean;
  eventos: EventoLineaTiempo[];
}

export interface PerfilAdversario {
  id: string;
  campanaAsociada: string;
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

export interface ResumenEjecutivoMedico {
  periodoAnalizado: string;
  estadoAtencionClinica: 'OPERATIVA';
  estadoAccesosAdministrativos: 'REVISION_REQUERIDA';
  movimientosRevisadosTexto: string;
  cuentasAdministrativasEnRevision: number;
  descargaFueraDeHorarioFecha: string;
  porcentajeOperacionNormal: string;
  porcentajeActividadRevisar: string;
  nombresPacientesExpuestos: number;
  resumenSencillo: string;
  hallazgosClaros: {
    id: string;
    titulo: string;
    impactoClinico: string;
    prioridad: 'ALTA' | 'MEDIA' | 'CONTROLADA';
  }[];
  accionesParaDireccion: {
    id: string;
    responsable: string;
    accion: string;
    plazo: string;
  }[];
}

export const evidenciaIngestaMock: EvidenciaIngesta = {
  totalEventos: 10023532,
  eventosFirewall: 5009031,
  eventosSistemaMedico: 5014501,
  modoProcesamiento: 'Polars Streaming + Parquet Seudonimizado + PostgreSQL 16',
  sha256Firewall: '1b3dc2abfef8dd2b04cf4dc2620f7610b7a6ad11cd67f19b2fd9aed9c1cd3261',
  sha256MedSys: '6a0a4eb19e821674c5b5cb42d2cdd765a35af569a8cdab5883835421f21e671a',
  campanasCorrelacionadas: 5,
  deteccionSoloMlSinReglas: '4/5 (Genérico) · 5/5 (Dominio)',
  ipsSinPuntosDetectadas: 1280,
  ipsFwSinPuntos: 493,
  ipsMedSysSinPuntos: 787,
  porcentajeCuentasEspeciales: '100% de las 787 de MedSys en cuentas no-SIM',
  cumplimientoLopdp: '100% LOPDP Art. 25',
  piiExpuesta: 0,
  hashChainIntegro: true,
};

export const resumenEjecutivoMedicoMock: ResumenEjecutivoMedico = {
  periodoAnalizado: 'Octubre 2026 (31 días continuos)',
  estadoAtencionClinica: 'OPERATIVA',
  estadoAccesosAdministrativos: 'REVISION_REQUERIDA',
  movimientosRevisadosTexto: '10,02 millones',
  cuentasAdministrativasEnRevision: 16,
  descargaFueraDeHorarioFecha: '24 de octubre de 2026 (22:40)',
  porcentajeOperacionNormal: '99,86%',
  porcentajeActividadRevisar: '0,14%',
  nombresPacientesExpuestos: 0,
  resumenSencillo:
    'La atención clínica habitual funcionó sin interrupciones, pero la auditoría identificó 16 cuentas administrativas internas realizando activaciones y bajas masivas de usuarios, además de una descarga nocturna atípica el 24 de octubre que requiere verificación inmediata junto a Talento Humano.',
  hallazgosClaros: [
    {
      id: 'MED-01',
      titulo: 'Descarga clínica fuera de horario laboral (24 de octubre)',
      impactoClinico:
        'Una cuenta especial realizó un ingreso y una descarga exitosa seguida de envío externo en 30 segundos durante la noche.',
      prioridad: 'ALTA',
    },
    {
      id: 'MED-02',
      titulo: 'Cambios masivos de permisos en 16 cuentas administrativas',
      impactoClinico:
        'Se registraron miles de activaciones, inactivaciones y cambios de nivel de usuario concentrados en cuentas especiales.',
      prioridad: 'ALTA',
    },
    {
      id: 'MED-03',
      titulo: 'Intentos repetidos de acceso fallido en horarios nocturnos y de tarde',
      impactoClinico:
        'Bloqueos automáticos contuvieron intentos masivos de ingreso antes de afectar la historia clínica, pero requieren control de contraseñas.',
      prioridad: 'MEDIA',
    },
  ],
  accionesParaDireccion: [
    {
      id: 'ACT-01',
      responsable: 'Dirección Médica + Talento Humano',
      accion:
        'Validar si el personal autorizado solicitó las 16 cuentas administrativas y confirmar quién utilizó la cuenta especial el 24 de octubre a las 22:40.',
      plazo: 'Hoy (24 horas)',
    },
    {
      id: 'ACT-02',
      responsable: 'Jefaturas de Consulta y Enfermería',
      accion:
        'Prohibir el uso de usuarios compartidos entre turnos y solicitar bloqueo inmediato cuando un profesional cambie de área o salga de la institución.',
      plazo: 'Esta semana',
    },
    {
      id: 'ACT-03',
      responsable: 'Coordinación con Tecnología (TI)',
      accion:
        'Autorizar ventana programada de mantenimiento para retirar accesos antiguos no cifrados y habilitar doble verificación en descargas masivas.',
      plazo: '7 días',
    },
  ],
};

export const campanasMock: CampanaDetalle[] = [
  {
    id: 'CAMP-2026-001',
    nombre: 'Exfiltración clínica SSH hacia IP externa (8443/tcp)',
    descripcion:
      'Ingreso por SSH hacia 10.10.100.30, descarga exitosa en MedSys (reloj 12h corregido +12h) y egreso hacia 186.46.219[.]18:8443 en 30s.',
    severidad: 'CRITICA',
    escenarioIpe: 'ESCENARIO_MAS_PELIGROSO',
    admiralty: 'B2',
    ipOrigenFw: '10.10.100.40',
    ipDestinoFw: '186.46.219[.]18',
    puertos: [22, 8443],
    volumenEventos: 4,
    clockSkewAdjusted: true,
    eventos: [
      {
        id: 'TL-01',
        timestamp: '2026-10-24 22:40:00 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-D21470F4ED35',
        cuentaToken: 'ACC-DC30A0D39E5A',
        accion: 'SSH_PERMITIDO_22',
        detalle: '10.10.100.40 -> 10.10.100.30:22/tcp (Aplicacion=SSH, permitido).',
        severidad: 'ALTA',
        clockSkewAdjusted: false,
      },
      {
        id: 'TL-02',
        timestamp: '2026-10-24 22:40:00 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-D21470F4ED35',
        cuentaToken: 'ACC-DC30A0D39E5A',
        accion: 'INGRESO SIST_MED_IESS',
        detalle: 'Origen MedSys 10:40:00 ajustado +12h por coincidencia exacta de actor/cuenta.',
        severidad: 'ALTA',
        clockSkewAdjusted: true,
      },
      {
        id: 'TL-03',
        timestamp: '2026-10-24 22:40:15 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-D21470F4ED35',
        cuentaToken: 'ACC-DC30A0D39E5A',
        accion: 'DESCARGA EXITOSA',
        detalle: 'Origen MedSys 10:40:15 ajustado +12h. Descarga ejecutada 15s tras el ingreso.',
        severidad: 'CRITICA',
        clockSkewAdjusted: true,
      },
      {
        id: 'TL-04',
        timestamp: '2026-10-24 22:40:30 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-D21470F4ED35',
        cuentaToken: 'ACC-DC30A0D39E5A',
        accion: 'EGRESS_8443_TCP',
        detalle: '10.10.100.40 -> 186.46.219[.]18:8443/tcp (Trafico_TCP_Desconocido, única IP pública).',
        severidad: 'CRITICA',
        clockSkewAdjusted: false,
      },
    ],
  },
  {
    id: 'CAMP-2026-002',
    nombre: 'Extracción masiva automatizada vía protocolo SSH',
    descripcion:
      'Las únicas 30 filas con Protocolo="SSH" en Firewall correlacionan 1:1 con 30 TRANFERENCIA EXITOSA y 2,970 interrumpidas.',
    severidad: 'ALTA',
    escenarioIpe: 'ESCENARIO_MAS_PELIGROSO',
    admiralty: 'B2',
    ipOrigenFw: '10.10.100.50',
    ipDestinoFw: '10.10.100.30',
    puertos: [22],
    volumenEventos: 3030,
    clockSkewAdjusted: false,
    eventos: [
      {
        id: 'TL-05',
        timestamp: '2026-10-07 13:00:00 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-000DE3FE2773',
        cuentaToken: 'ACC-79FE100B6B16',
        accion: 'PROTOCOLO_SSH_BURST',
        detalle: '30 conexiones permitidas con Protocolo=="SSH" desde 10.10.100.50 hacia 10.10.100.30:22.',
        severidad: 'ALTA',
      },
      {
        id: 'TL-06',
        timestamp: '2026-10-07 13:00:01 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-000DE3FE2773',
        cuentaToken: 'ACC-79FE100B6B16',
        accion: 'TRANFERENCIA EXITOSA / INTERRUMPIDA',
        detalle: '30 "TRANFERENCIA EXITOSA" + 2,970 "TRANFERENCIA INTERRUMPIDA" (typo original sin S).',
        severidad: 'CRITICA',
      },
    ],
  },
  {
    id: 'CAMP-2026-003',
    nombre: 'Fuerza bruta nocturna sobre servicio Telnet (23/tcp)',
    descripcion:
      'Ráfaga de 2,000 intentos negados sobre puerto 23/tcp en menos de 1 hora correlacionada con 2,000 ACCESO FALLIDO.',
    severidad: 'ALTA',
    escenarioIpe: 'ESCENARIO_MAS_PROBABLE',
    admiralty: 'A2',
    ipOrigenFw: '10.10.100.10',
    ipDestinoFw: '10.10.100.30',
    puertos: [23],
    volumenEventos: 4000,
    clockSkewAdjusted: false,
    eventos: [
      {
        id: 'TL-07',
        timestamp: '2026-10-10 00:00:05 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-5387F94B394C',
        cuentaToken: 'ACC-410762D420CB',
        accion: 'TELNET_23_DENIED',
        detalle: '2,000 conexiones negadas desde 10.10.100.10 hacia 10.10.100.30:23 (Sesion_Incompleta).',
        severidad: 'ALTA',
      },
      {
        id: 'TL-08',
        timestamp: '2026-10-10 00:00:08 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-5387F94B394C',
        cuentaToken: 'ACC-410762D420CB',
        accion: 'ACCESO FALLIDO',
        detalle: '2,000 eventos ACCESO FALLIDO registrados exactamente en la hora 00:xx de 2026-10-10.',
        severidad: 'ALTA',
      },
    ],
  },
  {
    id: 'CAMP-2026-004',
    nombre: 'Escaneo multi-servicio (137/445/3389/8471) y Spraying',
    descripcion:
      '4 bloques exactos de 250 intentos negados; actor con identidad_ambigua=True (4 personas) desambiguado por account_token.',
    severidad: 'ALTA',
    escenarioIpe: 'ESCENARIO_MAS_PROBABLE',
    admiralty: 'B2',
    ipOrigenFw: '10.10.100.20',
    ipDestinoFw: '10.10.100.30',
    puertos: [137, 445, 3389, 8471],
    volumenEventos: 2000,
    clockSkewAdjusted: false,
    identidadAmbigua: true,
    eventos: [
      {
        id: 'TL-09',
        timestamp: '2026-10-19 14:01:00 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-936EFE804AB3',
        cuentaToken: 'ACC-A9764DFB78FE',
        identidadAmbigua: true,
        accion: 'MULTI_PORT_SCAN_4X250',
        detalle: '10.10.100.20 -> 10.10.100.30: 250 NetBIOS (137), 250 SMBv1 (445), 250 RDP (3389), 250 BD (8471).',
        severidad: 'ALTA',
      },
      {
        id: 'TL-10',
        timestamp: '2026-10-19 14:01:05 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-936EFE804AB3',
        cuentaToken: 'ACC-A9764DFB78FE',
        identidadAmbigua: true,
        accion: 'ACCESO FALLIDO (1,000 + 118)',
        detalle: 'Identidad ambigua (4 homónimos): resuelta por account_token + ventana 14:xx (+ 118 spraying).',
        severidad: 'CRITICA',
      },
    ],
  },
  {
    id: 'CAMP-2026-005',
    nombre: 'Abuso de privilegios, sabotaje y canal sombra SSH/8443',
    descripcion:
      '826 reactivaciones espejo de 826 sesiones SSH, escalamiento de niveles, activaciones y 787 IPs sin puntos exclusivas.',
    severidad: 'CRITICA',
    escenarioIpe: 'ESCENARIO_MAS_PROBABLE',
    admiralty: 'B3',
    ipOrigenFw: '10.x.x.x (826 IPs)',
    ipDestinoFw: '10.10.100.30',
    puertos: [22, 8443],
    volumenEventos: 11136,
    clockSkewAdjusted: false,
    eventos: [
      {
        id: 'TL-11',
        timestamp: '2026-10-01 00:43:50 UTC',
        carril: 'FIREWALL',
        usuarioToken: 'USR-VARIOS-539',
        cuentaToken: 'ACC-877CD64A4EC0',
        accion: 'APP_SSH_826_Y_8443_811',
        detalle: '826 sesiones Aplicacion=SSH (puerto 22) + 811 sesiones puerto 8443 distribuidas en el mes.',
        severidad: 'ALTA',
      },
      {
        id: 'TL-12',
        timestamp: '2026-10-01 08:16:25 UTC',
        carril: 'MEDSYS',
        usuarioToken: 'USR-MULTI-CUENTA',
        cuentaToken: 'ACC-4ED6B617541D',
        accion: 'PRIV_ESCALATION_Y_DOTLESS_IPS',
        detalle: '249 eventos nivel/reactivación, 1,098 activaciones, 826 reactivaciones espejo y 787 IPs sin puntos (100% en cuentas especiales).',
        severidad: 'CRITICA',
      },
    ],
  },
];

export const adversariosMock: PerfilAdversario[] = [
  {
    id: 'ADV-01',
    campanaAsociada: 'CAMP-2026-001 / CAMP-2026-002',
    nombreClave: 'Exfiltración Clínica por Canal SSH y Egreso 8443',
    tipoActor: 'HIBRIDO',
    anomalyScore: 0.985,
    calificacionAdmiralty: 'B2',
    tecnicasMitre: ['T1078', 'T1021.004', 'T1213', 'T1074', 'T1048.002'],
    resumen:
      'Acceso mediante credenciales válidas hacia 10.10.100.30, extracción en repositorio médico y salida hacia 186.46.219[.]18:8443.',
  },
  {
    id: 'ADV-02',
    campanaAsociada: 'CAMP-2026-003 / CAMP-2026-004 / CAMP-2026-005',
    nombreClave: 'Abuso de Privilegios Internos y Escaneo de Servicios Heredados',
    tipoActor: 'INTERNO',
    anomalyScore: 0.964,
    calificacionAdmiralty: 'A2',
    tecnicasMitre: ['T1110.001', 'T1110.003', 'T1046', 'T1021.001', 'T1021.002', 'T1078', 'T1098', 'T1531'],
    resumen:
      'Fuerza bruta Telnet (23/tcp), reconocimiento en puertos IBM i / Windows (8471, 3389, 445, 137) y manipulación masiva en cuentas especiales.',
  },
];

export const artefactosMock: ReglaArtefacto[] = [
  {
    id: 'IOA-01',
    nombre: 'Exfiltración clínica con egreso no-RFC1918 tras descarga',
    tipo: 'IoA',
    descripcion:
      'Regla de comportamiento agnóstica a IP: correlación SSH + descarga MedSys + salida a dirección pública en < 60s (soporta +12h selectivo).',
    sigmaYaml: `title: IoA - Exfiltracion Clinica Hacia IP No-RFC1918 Tras Descarga
id: aegis-ioa-001
status: stable
description: Detecta secuencia SSH + DESCARGA EXITOSA + egreso publico en menos de 60 segundos
logsource:
  product: aegishealth_cti
  service: firewall_medsys_correlation
detection:
  selection_med:
    action_desc: "DESCARGA EXITOSA"
  selection_egress:
    is_external_ip: true
    action: "permitido"
  timeframe: 60s
  condition: selection_med and selection_egress | same_actor_token
falsepositives:
  - Ninguno en entorno sintetico
level: critical`,
  },
  {
    id: 'IOA-02',
    nombre: 'Escaneo multi-servicio (>= 4 puertos críticos por IP/hora)',
    tipo: 'IoA',
    descripcion:
      'Identifica reconocimiento horizontal sobre puertos 23, 137, 445, 3389 y 8471 sin depender de IPs fijas.',
    sigmaYaml: `title: IoA - Reconocimiento Multi-Servicio en Puertos Criticos
id: aegis-ioa-004
status: stable
logsource:
  category: firewall
detection:
  selection:
    action: "negado"
    dst_port:
      - 23
      - 137
      - 445
      - 3389
      - 8471
  timeframe: 1h
  condition: selection | count(distinct dst_port) by src_ip >= 4
level: high`,
  },
  {
    id: 'IOC-01',
    nombre: 'Bloqueo de destino externo sintético 186.46.219[.]18:8443',
    tipo: 'IoC',
    descripcion:
      'Indicador puntual etiquetado como dato sintético de ejercicio (TLP:RED).',
    sigmaYaml: `title: IoC - Bloqueo Egreso Sintetico 186.46.219.18:8443
id: aegis-ioc-001
status: experimental
tags:
  - tlp.red
  - synthetic.exercise.data
logsource:
  category: firewall
detection:
  selection:
    dst_ip: "186.46.219.18"
    dst_port: 8443
  condition: selection
level: critical`,
  },
  {
    id: 'IOC-02',
    nombre: 'Monitoreo prioritario subred crítica 10.10.100.10/.20/.40/.50',
    tipo: 'IoC',
    descripcion:
      'Orígenes internos correlacionados con las campañas 001 a 004 sobre el servidor central 10.10.100.30.',
    sigmaYaml: `title: IoC - Origenes Correlacionados hacia Servidor Medico Central
id: aegis-ioc-002
status: experimental
logsource:
  category: firewall
detection:
  selection:
    src_ip:
      - "10.10.100.10"
      - "10.10.100.20"
      - "10.10.100.40"
      - "10.10.100.50"
    dst_ip: "10.10.100.30"
  condition: selection
level: high`,
  },
];

export const seccionesF11Mock: SeccionF11[] = [
  {
    numero: 1,
    titulo: 'Fuentes, SHA-256 y Escala Admiralty',
    completada: true,
    resumen: '10,023,532 filas auditadas (FW + MedSys), 5 trampas forenses verificadas y calificación Admiralty A2–B3.',
  },
  {
    numero: 2,
    titulo: 'Evaluación de Adversarios (Tokens LOPDP)',
    completada: true,
    resumen: 'Perfiles ADV-01/ADV-02 con tokens HMAC USR-/ACC- y resolución de identidad_ambigua en CAMP-2026-004.',
  },
  {
    numero: 3,
    titulo: 'Inteligencia Estratégica (CID y LOPDP)',
    completada: true,
    resumen: 'Impacto sobre confidencialidad de historiales clínicos, Art. 27 IESS, EGSI 1.7 y LOPDP Art. 25.',
  },
  {
    numero: 4,
    titulo: 'Inteligencia Táctica (MITRE ATT&CK)',
    completada: true,
    resumen: 'Mapeo corregido: T1213, T1074, T1110.001, T1110.003, T1078, T1098, T1531 y T1048.002.',
  },
  {
    numero: 5,
    titulo: 'Inteligencia Operativa (Kill Chain 001..005)',
    completada: true,
    resumen: 'Reconstrucción cross-layer destacando el salto de 30s en 2026-10-24 con corrección selectiva +12h.',
  },
  {
    numero: 6,
    titulo: 'Inteligencia Técnica (ML + Sigma + STIX 2.1)',
    completada: true,
    resumen: 'IsolationForest sin reglas (4/5 genérico, 5/5 dominio), reglas IoA vs IoC y STIX 2.1 TLP:RED.',
  },
  {
    numero: 7,
    titulo: 'Evaluación de Escenarios (IPE)',
    completada: true,
    resumen: 'Comparativa global: Escenario Más Probable (005+003+004) vs Escenario Más Peligroso (005->001+002).',
  },
  {
    numero: 8,
    titulo: 'Conclusiones, Controles IBM i y Sello Hash-Chain',
    completada: true,
    resumen: 'Migrar puertos 8470–8478 a TLS 9470–9476, apagar Telnet 23 / SMBv1 445, NTP 24h y verificación SHA-256.',
  },
];

export const auditoriaInicialMock: RegistroAuditoria[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-11-26 17:21:20 UTC',
    tipoEvento: 'INGEST_FIREWALL_10M',
    actorToken: 'SYS-ETL-POLARS',
    detalle: 'SHA-256 1b3dc2ab... | 5,009,031 filas leídas -> Parquet + 23,514 filas persistidas (0 PII).',
    hashPrevio: 'GENESIS',
    hashActual: '813f564e4aaa9c3102f4',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-11-26 17:21:38 UTC',
    tipoEvento: 'INGEST_MEDSYS_10M',
    actorToken: 'SYS-ETL-POLARS',
    detalle: 'SHA-256 6a0a4eb1... | 5,014,501 filas leídas -> Parquet + 14,501 especiales + 16 vault.',
    hashPrevio: '813f564e4aaa9c3102f4',
    hashActual: 'e09140b7082671ab4c02',
  },
  {
    id: 'AUD-003',
    timestamp: '2026-11-26 17:21:44 UTC',
    tipoEvento: 'CORRELATE_THREAT_CAMPAIGNS',
    actorToken: 'SYS-CORRELATOR',
    detalle: '5 campañas y 22 hitos correlacionados con 2 ajustes selectivos +12h en CAMP-2026-001.',
    hashPrevio: 'e09140b7082671ab4c02',
    hashActual: '7fa685d616d6998e01fa',
  },
];

export function generarMatrizHeatmapRealistaMock(): {
  hours: string[];
  days: string[];
  matrix: number[][];
} {
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const days = Array.from({ length: 31 }, (_, d) => `2026-10-${String(d + 1).padStart(2, '0')}`);

  const matrix = hours.map((_, h) =>
    days.map((__, d) => {
      // Volumen base realista (~13,400 eventos por hora y día en el total de 10M / 744h)
      const base = 13250 + ((h * 37 + d * 89) % 420);
      if (d === 9 && h === 0) return base + 4000; // Día 10 00h: Incidente A (Telnet)
      if (d === 6 && h === 13) return base + 3030; // Día 7 13h: Incidente C (SSH)
      if (d === 18 && h === 14) return base + 2000; // Día 19 14h: Incidente B (Multi-puerto)
      if (d === 23 && h === 22) return base + 1250; // Día 24 22h: Incidente D (8443)
      if (h === 7 || h === 11) return base + 520; // Picos Campaña 005
      return base;
    })
  );

  return { hours, days, matrix };
}
