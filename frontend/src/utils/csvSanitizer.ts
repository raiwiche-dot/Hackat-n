// Sanitiza valores de celdas CSV para prevenir inyeccion de formulas en hojas de calculo
export function sanitizarCeldaCsv(valor: unknown): string {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    const escapado = /^[=+\-@]/.test(texto.trimStart()) ? `'${texto}` : texto;
    const conComillas = escapado.replace(/"/g, '""');
    return `"${conComillas}"`;
}