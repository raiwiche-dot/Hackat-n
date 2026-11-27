// Autenticación con dos roles fijos quemados para separar fuentes internas (SOC Técnico)
// de fuentes externas (Dirección Médica) en el entorno local sin salida a internet.

export type RolUsuario = 'tecnico' | 'medico';

export interface CredencialQuemada {
  usuario: string;
  clave: string;
  rol: RolUsuario;
  tituloPerfil: string;
  subtituloPerfil: string;
  ambito: string;
  etiquetaReporte: string;
}

export interface SesionUsuario {
  usuario: string;
  rol: RolUsuario;
  tituloPerfil: string;
  ambito: string;
  inicioSesionIso: string;
}

export const CREDENCIALES_QUEMADAS: readonly CredencialQuemada[] = [
  {
    usuario: 'soc.tecnico',
    clave: 'AegisSOC2026!',
    rol: 'tecnico',
    tituloPerfil: 'Departamento Técnico · SOC / CSIRT',
    subtituloPerfil: 'Fuentes internas: telemetría FW/MedSys, Kill Chain, MITRE, Sigma, Break-Glass y F-11.',
    ambito: 'FUENTES INTERNAS · TELEMETRÍA TÁCTICA',
    etiquetaReporte: 'Reporte Técnico CTI (Ficha F-11)',
  },
  {
    usuario: 'direccion.medica',
    clave: 'AegisMed2026!',
    rol: 'medico',
    tituloPerfil: 'Dirección Médica · Gestión Clínica',
    subtituloPerfil: 'Fuentes externas: estado asistencial, privacidad de pacientes y plan operativo en lenguaje claro.',
    ambito: 'FUENTES EXTERNAS · CONTINUIDAD CLÍNICA',
    etiquetaReporte: 'Informe Ejecutivo Médico',
  },
];

const CLAVE_STORAGE_SESION = 'aegishealth_sesion_rol_v1';

export function autenticarCredenciales(
  usuarioEntrada: string,
  claveEntrada: string
): SesionUsuario | null {
  const usuarioNormalizado = usuarioEntrada.trim().toLowerCase();
  const encontrada = CREDENCIALES_QUEMADAS.find(
    (c) => c.usuario === usuarioNormalizado && c.clave === claveEntrada
  );
  if (!encontrada) {
    return null;
  }
  return {
    usuario: encontrada.usuario,
    rol: encontrada.rol,
    tituloPerfil: encontrada.tituloPerfil,
    ambito: encontrada.ambito,
    inicioSesionIso: new Date().toISOString(),
  };
}

export function guardarSesionLocal(sesion: SesionUsuario): void {
  try {
    sessionStorage.setItem(CLAVE_STORAGE_SESION, JSON.stringify(sesion));
  } catch {
    // Entornos sin sessionStorage disponible continúan operando en memoria
  }
}

export function leerSesionLocal(): SesionUsuario | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE_SESION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SesionUsuario>;
    if (
      (parsed.rol === 'tecnico' || parsed.rol === 'medico') &&
      typeof parsed.usuario === 'string' &&
      typeof parsed.tituloPerfil === 'string' &&
      typeof parsed.ambito === 'string'
    ) {
      return {
        usuario: parsed.usuario,
        rol: parsed.rol,
        tituloPerfil: parsed.tituloPerfil,
        ambito: parsed.ambito,
        inicioSesionIso:
          typeof parsed.inicioSesionIso === 'string'
            ? parsed.inicioSesionIso
            : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function cerrarSesionLocal(): void {
  try {
    sessionStorage.removeItem(CLAVE_STORAGE_SESION);
  } catch {
    // Sin efecto
  }
}
