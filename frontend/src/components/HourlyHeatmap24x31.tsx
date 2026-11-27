import { useState } from 'react';
import type { HourlyHeatmapResponse } from '../services/apiClient';

interface HourlyHeatmap24x31Props {
    heatmap: HourlyHeatmapResponse;
    loading?: boolean;
    modoLectura?: 'simple' | 'tecnico';
}

interface SelectedCell {
    rowIdx: number;
    colIdx: number;
}

export const HourlyHeatmap24x31 = ({
    heatmap,
    loading = false,
    modoLectura = 'simple',
}: HourlyHeatmap24x31Props) => {
    const [hoveredCell, setHoveredCell] = useState<SelectedCell | null>(null);
    const [pinnedCell, setPinnedCell] = useState<SelectedCell | null>(null);
    const [highlightedHour, setHighlightedHour] = useState<string | null>(null);
    const [onlyActiveHours, setOnlyActiveHours] = useState<boolean>(false);

    const flatValues = heatmap.matrix
        .flat()
        .filter((v): v is number => typeof v === 'number' && v > 0);
    const maxVal = Math.max(...flatValues, 1);

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

    const getLevelLabel = (value: number) => {
        if (!value || value <= 0) return { text: 'Sin eventos', tone: 'text-slate-500 border-slate-200 bg-slate-50' };
        const ratio = value / maxVal;
        if (ratio >= 0.75) return { text: 'Actividad alta', tone: 'text-rose-700 border-rose-200 bg-rose-50' };
        if (ratio >= 0.4) return { text: 'Actividad media', tone: 'text-amber-700 border-amber-200 bg-amber-50' };
        return { text: 'Actividad baja', tone: 'text-teal-700 border-teal-200 bg-teal-50' };
    };

    const getCellStyle = (value: number, isActive: boolean, isRowHighlighted: boolean) => {
        const ring = isActive
            ? 'ring-2 ring-slate-700 border-slate-700'
            : isRowHighlighted
                ? 'border-slate-400'
                : '';

        if (!value || value <= 0) {
            return `bg-white text-slate-300 border-slate-100 ${ring}`;
        }
        const ratio = value / maxVal;
        if (ratio >= 0.75) {
            return `bg-rose-500 text-white border-rose-600 ${ring}`;
        }
        if (ratio >= 0.4) {
            return `bg-amber-400 text-amber-900 border-amber-500 ${ring}`;
        }
        return `bg-teal-200 text-teal-800 border-teal-300 ${ring}`;
    };

    const visibleHours = heatmap.hours
        .map((hour, rowIdx) => ({
            hour,
            rowIdx,
            rowTotal: (heatmap.matrix[rowIdx] ?? []).reduce((acc, v) => acc + (v || 0), 0),
        }))
        .filter((item) => !onlyActiveHours || item.rowTotal > 0);

    // Top 5 days by total events
    const dayTotals = heatmap.days.map((day, cIdx) => ({
        day,
        total: heatmap.hours.reduce((acc, _, rIdx) => acc + (heatmap.matrix[rIdx]?.[cIdx] ?? 0), 0),
    }));
    const top5Days = [...dayTotals].sort((a, b) => b.total - a.total).slice(0, 5);

    // Top 5 hours by total events
    const hourTotals = visibleHours.map(({ hour, rowIdx, rowTotal }) => ({
        hour, rowIdx, total: rowTotal,
    }));
    const top5Hours = [...hourTotals].sort((a, b) => b.total - a.total).slice(0, 5);

    const activeLevel = getLevelLabel(activeCount);
    const esTecnico = modoLectura === 'tecnico';

    const activeRowTotal = (heatmap.matrix[activeCell.rowIdx] ?? []).reduce((acc, v) => acc + (v || 0), 0);
    const activeColTotal = heatmap.hours.reduce(
        (acc, _, rIdx) => acc + (heatmap.matrix[rIdx]?.[activeCell.colIdx] ?? 0), 0
    );

    return (
        <section className="rounded-sm border border-slate-200 border-l-4 border-l-teal-600 bg-white p-5 shadow-xs text-slate-900">
            {/* Header */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Actividad por hora y día (octubre de 2026, UTC)
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Cada cuadro representa una hora de un día; los colores más intensos indican mayor volumen de eventos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    {/* Leyenda */}
                    <span className="flex items-center gap-1 text-slate-500">
                        <span className="h-3 w-3 rounded-xs border border-slate-200 bg-white" />Sin eventos
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                        <span className="h-3 w-3 rounded-xs border border-teal-300 bg-teal-200" />Bajo
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                        <span className="h-3 w-3 rounded-xs border border-amber-500 bg-amber-400" />Medio
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                        <span className="h-3 w-3 rounded-xs border border-rose-600 bg-rose-500" />Alto
                    </span>
                    {esTecnico && (
                        <button
                            type="button"
                            onClick={() => setOnlyActiveHours((v) => !v)}
                            className={`rounded-xs border px-2.5 py-1 font-mono font-semibold transition-colors ${
                                onlyActiveHours
                                    ? 'border-slate-400 bg-slate-800 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                            }`}
                        >
                            {onlyActiveHours ? 'Ver 24h' : 'Solo horas activas'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setPinnedCell(peakCell);
                            setHighlightedHour(heatmap.hours[peakCell.rowIdx] ?? null);
                        }}
                        className="rounded-xs border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                        Ver pico máximo ({peakVal > 0 ? peakVal.toLocaleString('es-EC') : 0})
                    </button>
                </div>
            </div>

            {/* Matrix + Side Inspector */}
            {loading ? (
                <div className="space-y-1.5 py-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="h-5 w-full animate-pulse rounded-xs bg-slate-100" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    {/* LEFT: heatmap table */}
                    <div className="min-w-0 flex-1 overflow-x-auto">
                        <table className="border-collapse font-mono text-[10px] tabular-nums">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-2 py-1 text-left text-slate-500 font-semibold">
                                        UTC / Día
                                    </th>
                                    {heatmap.days.map((day, colIdx) => {
                                        const dayLabel = day.slice(-2);
                                        const isColActive = activeCell.colIdx === colIdx;
                                        return (
                                            <th
                                                key={day}
                                                title={day}
                                                className={`border border-slate-100 px-1.5 py-1 text-center font-normal transition-colors ${
                                                    isColActive ? 'bg-teal-50 font-bold text-teal-800' : 'text-slate-400'
                                                }`}
                                            >
                                                {dayLabel}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleHours.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={heatmap.days.length + 1}
                                            className="border border-slate-100 px-3 py-4 text-center text-xs text-slate-400"
                                        >
                                            Sin franjas horarias con eventos.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleHours.map(({ hour, rowIdx }) => {
                                        const rowCells = heatmap.matrix[rowIdx] ?? [];
                                        const isRowHighlighted = highlightedHour === hour;
                                        return (
                                            <tr key={hour}>
                                                <td className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-2 py-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setHighlightedHour((prev) => (prev === hour ? null : hour))
                                                        }
                                                        className={`font-semibold transition-colors ${
                                                            isRowHighlighted || activeCell.rowIdx === rowIdx
                                                                ? 'text-teal-700 underline decoration-teal-400'
                                                                : 'text-slate-500 hover:text-slate-700'
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
                                                            className={`h-5 min-w-[22px] cursor-pointer border text-center transition-all duration-150 ${getCellStyle(
                                                                val,
                                                                isActive,
                                                                isRowHighlighted
                                                            )}`}
                                                        >
                                                            {esTecnico ? (val > 0 ? val : '') : ''}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* RIGHT: Detalle / Inspector panel */}
                    <div className="w-full shrink-0 rounded-sm border border-slate-200 border-t-4 border-t-teal-600 bg-slate-50 shadow-xs lg:w-52">
                        {/* Inspector header */}
                        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 rounded-t-sm">
                            <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="12" height="1.5" rx="0.5" />
                                <rect x="2" y="7" width="8" height="1.5" rx="0.5" />
                                <rect x="2" y="11" width="10" height="1.5" rx="0.5" />
                            </svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                Detalle / Inspector
                            </span>
                        </div>

                        {/* Selected cell info */}
                        <div className="border-b border-slate-200 px-3 py-3 text-[11px]">
                            <div className="space-y-1.5 tabular-nums">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-slate-500">Día</span>
                                    <span className="font-mono font-bold text-slate-800">{activeDay.slice(5)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-slate-500">Hora</span>
                                    <span className="font-mono font-bold text-slate-800">{activeHour} UTC</span>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-slate-500">Eventos</span>
                                    <span className={`font-mono font-bold tabular-nums ${activeCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                        {activeCount.toLocaleString('es-EC')}
                                    </span>
                                </div>
                                {esTecnico && (
                                    <>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-slate-500">Total fila</span>
                                            <span className="font-mono tabular-nums text-slate-700">
                                                {activeRowTotal.toLocaleString('es-EC')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-slate-500">Total col.</span>
                                            <span className="font-mono tabular-nums text-slate-700">
                                                {activeColTotal.toLocaleString('es-EC')}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="mt-2">
                                <span className={`inline-block rounded-xs border px-2 py-0.5 text-[10px] font-semibold ${activeLevel.tone}`}>
                                    {activeLevel.text}
                                </span>
                            </div>
                            {!esTecnico && activeCount === 0 && (
                                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                                    Sin registros en este intervalo.
                                </p>
                            )}
                            {!esTecnico && activeCount > 0 && (
                                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                                    <span className="font-bold text-slate-700">{activeCount.toLocaleString('es-EC')}</span>{' '}
                                    eventos en esta hora. Haz clic en otra celda para explorar.
                                </p>
                            )}
                        </div>

                        {/* Top 5 horas activas */}
                        <div className="border-b border-slate-200 px-3 py-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Horas más activas
                            </p>
                            <ul className="space-y-1.5">
                                {top5Hours.map(({ hour, rowIdx, total }) => (
                                    <li key={hour} className="flex items-center justify-between gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPinnedCell({ rowIdx, colIdx: activeCell.colIdx });
                                                setHighlightedHour(hour);
                                            }}
                                            className="font-mono text-[10px] font-bold tabular-nums text-teal-600 hover:text-teal-800 hover:underline"
                                        >
                                            {hour}
                                        </button>
                                        <span className="font-mono text-[10px] tabular-nums text-slate-600">
                                            {total.toLocaleString('es-EC')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Top 5 días activos */}
                        <div className="px-3 py-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Días más activos
                            </p>
                            <ul className="space-y-1.5">
                                {top5Days.map(({ day, total }) => {
                                    const colIdx = heatmap.days.indexOf(day);
                                    return (
                                        <li key={day} className="flex items-center justify-between gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPinnedCell({ rowIdx: activeCell.rowIdx, colIdx });
                                                }}
                                                className="font-mono text-[10px] font-bold tabular-nums text-teal-600 hover:text-teal-800 hover:underline"
                                            >
                                                {day.slice(5)}
                                            </button>
                                            <span className="font-mono text-[10px] tabular-nums text-slate-600">
                                                {total.toLocaleString('es-EC')}
                                            </span>
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
