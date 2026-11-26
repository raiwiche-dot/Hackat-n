// Generador minimalista de PDF valido (%PDF-1.4) para descarga offline en modo mock
// Permite que el reporte F-11 se abra correctamente en cualquier visor PDF estandar.

function normalizarAsciiPdf(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function envolverLineas(texto: string, maxChars = 84): string[] {
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

export function generarPdfReporteF11Blob(titulo: string, lineasEntrada: string[]): Blob {
  const lineasFormateadas: string[] = [
    normalizarAsciiPdf(titulo),
    '='.repeat(72),
    '',
  ];

  for (const linea of lineasEntrada) {
    if (linea.trim() === '') {
      lineasFormateadas.push('');
      continue;
    }
    for (const sublinea of envolverLineas(linea, 84)) {
      lineasFormateadas.push(normalizarAsciiPdf(sublinea));
    }
  }

  const maxLineasPorPagina = 46;
  const paginas: string[][] = [];
  for (let i = 0; i < lineasFormateadas.length; i += maxLineasPorPagina) {
    paginas.push(lineasFormateadas.slice(i, i + maxLineasPorPagina));
  }
  if (paginas.length === 0) {
    paginas.push(['Reporte CTI Ficha F-11']);
  }

  // Objetos PDF: 1=Catalog, 2=Pages, 3=Font Helvetica, luego por cada pagina: Page + Content
  const objetos: string[] = [];
  objetos.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageIds = paginas.map((_, idx) => 4 + idx * 2);
  objetos.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${paginas.length} >>\nendobj\n`
  );
  objetos.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  paginas.forEach((lineasPagina, idx) => {
    const pageObjId = 4 + idx * 2;
    const contentObjId = pageObjId + 1;

    const comandosTexto = [
      'BT',
      '/F1 10 Tf',
      '50 760 Td',
      '14 TL',
      ...lineasPagina.map((l, lineIdx) => (lineIdx === 0 ? `(${l}) Tj` : `T* (${l}) Tj`)),
      'ET',
    ].join('\n');

    objetos.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objetos.push(
      `${contentObjId} 0 obj\n<< /Length ${comandosTexto.length} >>\nstream\n${comandosTexto}\nendstream\nendobj\n`
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
