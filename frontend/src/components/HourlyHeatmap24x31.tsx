import { useState } from 'react';
import type { HourlyHeatmapResponse } from '../services/apiClient';

interface HourlyHeatmap24x31Props {
  heatmap: HourlyHeatmapResponse;
  loading?: boolean;
}

interface SelectedCell {
  rowIdx: number;
  colIdx: number;
}

export const HourlyHeatmap24x31 = ({
  heatmap,
  loading = false,
}: HourlyHeatmap24x31Props) => {
  const [hoveredCell, setHoveredCell] = useState<SelectedCell | null>(null);
  const [pinnedCell, setPinnedCell] = useState<SelectedCell | null>(null);
  const [highlightedHour, setHighlightedHour] = useState<string | null>(null);

  const flatValues = heatmap.matrix
    .flat()
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const maxVal = Math.max(...flatValues, 1);
  const minPosVal = Math.min(...flatValues, maxVal);

  let peakCell: SelectedCell = { rowIdx: 0, colIdx: 0 };
  let peakVal = -1;
  heatmap.hours.forEach((_, rIdx) => {
    const row = heatmap.matrix[rIdx] ?? [];
    heatmap.days.forEach((__, cIdx) => {
      const v = row[cIdx] ?? 0;
      if (v > peakVal) {
        peakVal = v;
        peakCell = { rowIdx: rIdx, colIdx: cIdx };
      }
    });
  });

  const activeCell = hoveredCell ?? pinnedCell ?? (peakVal > 0 ? peakCell : { rowIdx: 0, colIdx: 0 });
  const activeHour = heatmap.hours[activeCell.rowIdx] ?? '00:00';
  const activeDay = heatmap.days[activeCell.colIdx] ?? '2026-10-01';
  const activeCount = heatmap.matrix[activeCell.rowIdx]?.[activeCell.colIdx] ?? 0;

  const getCellStyle = (value: number, isActive: boolean, isRowHighlighted: boolean) => {
    const ring = isActive
      ? 'ring-2 ring-[#063729] border-[#063729] z-10'
      : isRowHighlighted
        ? 'border-[#0B5D46]'
        : 'border-white';

    if (!value || value <= 0) {
      return `bg-slate-100 ${ring}`;
    }
    const span = Math.max(maxVal - minPosVal, 1);
    const norm = (value - minPosVal) / span;
    if (norm >= 0.78) return `bg-rose-600 ${ring}`;
    if (norm >= 0.45) return `bg-amber-400 ${ring}`;
    if (norm >= 0.2) return `bg-[#108A65] ${ring}`;
    return `bg-[#D5EDE2] ${ring}`;
  };

  const dayTotals = heatmap.days.map((day, cIdx) => ({
    day,
    total: heatmap.hours.reduce((acc, _, rIdx) => acc + (heatmap.matrix[rIdx]?.[cIdx] ?? 0), 0),
  }));
  const top5Days = [...dayTotals].sort((a, b) => b.total - a.total).slice(0, 5);

  const hourTotals = heatmap.hours.map((hour, rowIdx) => ({
    hour,
    rowIdx,
    total: (heatmap.matrix[rowIdx] ?? []).reduce((acc, v) => acc + (v || 0), 0),
  }));
  const top5Hours = [...hourTotals].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <section className="inst-panel p-4 text-[#073B2C] sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[#E6F1EC] pb-3.5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0B5D46] sm:text-sm">
            Matriz Horaria 24h × 31 Días (Octubre 2026 UTC)
          </h2>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Confirma operación 24h continua en ambas capas (prohibido aplicar +12h global).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs border border-[#A3D2BD] bg-[#D5EDE2]" />
            Base
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs bg-[#108A65]" />
            Elevada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs bg-amber-400" />
            Anomalía
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-xs bg-rose-600" />
            Pico ataque
          </span>
          <button
            type="button"
            onClick={() => {
              setPinnedCell(peakCell);
              setHighlightedHour(heatmap.hours[peakCell.rowIdx] ?? null);
            }}
            className="btn-touch min-h-[40px] cursor-pointer rounded-lg border border-[#0B5D46]/40 bg-[#E3F2EC] px-3.5 py-1.5 font-bold text-[#063729] hover:bg-[#0B5D46] hover:text-white"
          >
            Ir al pico ({peakVal > 0 ? peakVal.toLocaleString('es-EC') : 0})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-5 w-full animate-pulse rounded bg-[#E3F2EC]" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto pb-1">
            <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-1.5 text-left font-bold text-[#073B2C]">
                    UTC/Día
                  </th>
                  {heatmap.days.map((day, colIdx) => (
                    <th
                      key={day}
                      title={day}
                      className={`border border-[#E6F1EC] px-1 py-1.5 text-center font-medium ${
                        activeCell.colIdx === colIdx
                          ? 'bg-[#0B5D46] font-bold text-white'
                          : 'bg-[#F8FCFA] text-slate-600'
                      }`}
                    >
                      {day.slice(-2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.hours.map((hour, rowIdx) => {
                  const rowCells = heatmap.matrix[rowIdx] ?? [];
                  const isRowHighlighted = highlightedHour === hour;
                  return (
                    <tr key={hour}>
                      <td className="sticky left-0 z-10 border border-[#CDE2D7] bg-[#F4FAF7] px-2.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => setHighlightedHour((prev) => (prev === hour ? null : hour))}
                          className={`cursor-pointer py-0.5 font-bold ${
                            isRowHighlighted || activeCell.rowIdx === rowIdx
                              ? 'text-[#0B5D46] underline'
                              : 'text-slate-700 hover:text-[#0B5D46]'
                          }`}
                        >
                          {hour}
                        </button>
                      </td>
                      {heatmap.days.map((day, colIdx) => {
                        const val = rowCells[colIdx] ?? 0;
                        const isActive =
                          activeCell.rowIdx === rowIdx && activeCell.colIdx === colIdx;
                        return (
                          <td
                            key={`${hour}-${day}`}
                            onMouseEnter={() => setHoveredCell({ rowIdx, colIdx })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => setPinnedCell({ rowIdx, colIdx })}
                            title={`${day} ${hour} UTC: ${val.toLocaleString('es-EC')} eventos`}
                            className={`h-5 min-w-[22px] cursor-pointer border transition-colors ${getCellStyle(
                              val,
                              isActive,
                              isRowHighlighted
                            )}`}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="w-full shrink-0 space-y-3.5 rounded-xl border border-[#CDE2D7] bg-[#F4FAF7] p-4 font-mono text-xs lg:w-60">
            <div className="border-b border-[#CDE2D7] pb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B5D46]">
                Celda seleccionada
              </p>
              <div className="mt-2.5 space-y-1.5 tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600">Fecha</span>
                  <span className="font-bold text-[#073B2C]">{activeDay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Franja</span>
                  <span className="font-bold text-[#073B2C]">{activeHour} UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Eventos</span>
                  <span className="font-bold text-[#0B5D46]">{activeCount.toLocaleString('es-EC')}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-[#CDE2D7] pb-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Top 5 Horas
              </p>
              <ul className="space-y-1 tabular-nums">
                {top5Hours.map(({ hour, rowIdx, total }) => (
                  <li key={hour} className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedCell({ rowIdx, colIdx: activeCell.colIdx });
                        setHighlightedHour(hour);
                      }}
                      className="min-h-[30px] cursor-pointer px-1 font-bold text-[#0B5D46] hover:underline"
                    >
                      {hour}
                    </button>
                    <span className="text-slate-700">{total.toLocaleString('es-EC')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Top 5 Días
              </p>
              <ul className="space-y-1 tabular-nums">
                {top5Days.map(({ day, total }) => {
                  const colIdx = heatmap.days.indexOf(day);
                  return (
                    <li key={day} className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPinnedCell({ rowIdx: activeCell.rowIdx, colIdx })}
                        className="min-h-[30px] cursor-pointer px-1 font-bold text-[#0B5D46] hover:underline"
                      >
                        {day.slice(5)}
                      </button>
                      <span className="text-slate-700">{total.toLocaleString('es-EC')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
