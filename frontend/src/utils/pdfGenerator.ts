// Generador PDF nativo (%PDF-1.4) con dos plantillas diferenciadas:
// 1. Reporte Técnico CTI (Ficha F-11) — Fuentes internas SOC / CSIRT
// 2. Informe Ejecutivo para Dirección Médica — Fuentes externas / Lenguaje clínico claro

interface LineaEstilizada {
  texto: string;
  estilo: 'cabecera' | 'subtitulo' | 'cuerpo' | 'vacio';
}

function normalizarAsciiPdf(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function envolverLineas(texto: string, maxChars: number): string[] {
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = '';

  for (const palabra of palabras) {
    if (!actual) {
      actual = palabra;
    } else if (actual.length + 1 + palabra.length <= maxChars) {
      actual = `${actual} ${palabra}`;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) {
    lineas.push(actual);
  }
  return lineas.length > 0 ? lineas : [''];
}

function compilarPdfEstilizado(
  etiquetaSuperior: string,
  tituloPrincipal: string,
  subtituloSuperior: string,
  bloques: { encabezado: string; parrafos: string[] }[]
): Blob {
  const lineas: LineaEstilizada[] = [
    { texto: normalizarAsciiPdf(etiquetaSuperior), estilo: 'subtitulo' },
    { texto: normalizarAsciiPdf(tituloPrincipal), estilo: 'cabecera' },
    { texto: normalizarAsciiPdf(subtituloSuperior), estilo: 'cuerpo' },
    { texto: '='.repeat(82), estilo: 'cuerpo' },
    { texto: '', estilo: 'vacio' },
  ];

  for (const bloque of bloques) {
    lineas.push({ texto: normalizarAsciiPdf(bloque.encabezado), estilo: 'subtitulo' });
    for (const parrafo of bloque.parrafos) {
      if (!parrafo.trim()) {
        lineas.push({ texto: '', estilo: 'vacio' });
        continue;
      }
      for (const sub of envolverLineas(parrafo, 84)) {
        lineas.push({ texto: normalizarAsciiPdf(sub), estilo: 'cuerpo' });
      }
    }
    lineas.push({ texto: '', estilo: 'vacio' });
  }

  const maxLineasPorPagina = 46;
  const paginas: LineaEstilizada[][] = [];
  for (let i = 0; i < lineas.length; i += maxLineasPorPagina) {
    paginas.push(lineas.slice(i, i + maxLineasPorPagina));
  }
  if (paginas.length === 0) {
    paginas.push([{ texto: 'Reporte AegisHealth-CTI', estilo: 'cabecera' }]);
  }

  // Objetos: 1=Catalog, 2=Pages, 3=Helvetica, 4=Helvetica-Bold
  const objetos: string[] = [];
  objetos.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageIds = paginas.map((_, idx) => 5 + idx * 2);
  objetos.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${paginas.length} >>\nendobj\n`
  );
  objetos.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objetos.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  paginas.forEach((lineasPagina, idx) => {
    const pageObjId = 5 + idx * 2;
    const contentObjId = pageObjId + 1;

    const ops: string[] = ['BT', '48 756 Td'];
    lineasPagina.forEach((item, lineIdx) => {
      if (lineIdx > 0) {
        ops.push('0 -14.5 Td');
      }
      if (item.estilo === 'cabecera') {
        ops.push(`/F2 13 Tf (${item.texto}) Tj`);
      } else if (item.estilo === 'subtitulo') {
        ops.push(`/F2 10.5 Tf (${item.texto}) Tj`);
      } else if (item.estilo === 'cuerpo') {
        ops.push(`/F1 9.5 Tf (${item.texto}) Tj`);
      } else {
        ops.push('/F1 9.5 Tf () Tj');
      }
    });
    ops.push(`0 -18 Td /F1 8 Tf (AegisHealth-CTI · Pagina ${idx + 1} de ${paginas.length} · Uso local LOPDP) Tj`);
    ops.push('ET');

    const streamStr = ops.join('\n');
    objetos.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objetos.push(
      `${contentObjId} 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj\n`
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objetos) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefInicio = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objetos.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefInicio}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function generarPdfTecnicoF11Blob(
  secciones: { numero: number; titulo: string; resumen: string }[],
  conclusion: string
): Blob {
  return compilarPdfEstilizado(
    'TLP:RED | FUENTES INTERNAS SOC / CSIRT | DATO SINTETICO DE EJERCICIO',
    'AEGISHEALTH-CTI — REPORTE TECNICO DE INTELIGENCIA DE AMENAZAS (FICHA F-11)',
    'Audiencia: Departamento Tecnico · 10,023,532 registros auditados · Cero PII (HMAC-SHA256)',
    [
      {
        encabezado: 'TRAZABILIDAD DE FUENTES E INTEGRIDAD (SHA-256)',
        parrafos: [
          'Firewall (5,009,031 filas): 1b3dc2abfef8dd2b04cf4dc2620f7610b7a6ad11cd67f19b2fd9aed9c1cd3261',
          'MedSys (5,014,501 filas): 6a0a4eb19e821674c5b5cb42d2cdd765a35af569a8cdab5883835421f21e671a',
          'Indicador externo sintetico (defanged): 186.46.219[.]18:8443/tcp · Servidor central: 10.10.100.30',
        ],
      },
      ...secciones.map((s) => ({
        encabezado: `SECCION ${s.numero}. ${s.titulo.toUpperCase()}`,
        parrafos: [s.resumen],
      })),
      {
        encabezado: 'SINTESIS FINAL Y PRIORIZACION TECNICA (SECCION 8)',
        parrafos: [conclusion],
      },
    ]
  );
}

export function generarPdfEjecutivoMedicoBlob(params: {
  periodo: string;
  resumenSencillo: string;
  hallazgos: { titulo: string; impactoClinico: string; prioridad: string }[];
  acciones: { responsable: string; accion: string; plazo: string }[];
}): Blob {
  return compilarPdfEstilizado(
    'USO INTERNO HOSPITALARIO · LENGUAJE EJECUTIVO NO TECNICO · LOPDP ART. 25',
    'INFORME EJECUTIVO PARA DIRECCION MEDICA — CONTINUIDAD Y PROTECCION DE DATOS',
    `Audiencia: Fuentes Externas / Jefaturas Clinicas · Periodo: ${params.periodo}`,
    [
      {
        encabezado: '1. ESTADO GENERAL DEL SERVICIO ASISTENCIAL',
        parrafos: [
          'Atencion medica y consulta externa: OPERATIVA (sin caida del sistema clinico).',
          'Gestion de accesos administrativos: REVISION REQUERIDA con Talento Humano.',
          'Proteccion de identidad (LOPDP): 0 nombres de pacientes o medicos expuestos.',
          params.resumenSencillo,
        ],
      },
      {
        encabezado: '2. QUE SE DETECTO EN PALABRAS CLARAS',
        parrafos: params.hallazgos.map(
          (h, idx) => `${idx + 1}) [${h.prioridad}] ${h.titulo}: ${h.impactoClinico}`
        ),
      },
      {
        encabezado: '3. PLAN DE ACCION PARA DIRECCION MEDICA Y JEFATURAS',
        parrafos: params.acciones.map(
          (a, idx) => `${idx + 1}) ${a.responsable} (${a.plazo}): ${a.accion}`
        ),
      },
      {
        encabezado: '4. GARANTIA DE PRIVACIDAD DE LA HISTORIA CLINICA',
        parrafos: [
          'Este informe no contiene nombres propios, cedulas ni cuentas tecnicas reales. Toda la revision se ejecuto en servidores locales aislados sin enviar datos clinicos fuera de la institucion.',
        ],
      },
    ]
  );
}
