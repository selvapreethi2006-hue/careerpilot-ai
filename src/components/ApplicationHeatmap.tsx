import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { JobApplication } from '../types';
import { Flame, Calendar, Sparkles, Filter, X, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ApplicationHeatmapProps {
  applications: JobApplication[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

interface DayData {
  date: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  weekIndex: number;
  count: number;
  apps: JobApplication[];
}

export const ApplicationHeatmap: React.FC<ApplicationHeatmapProps> = ({
  applications,
  selectedDate,
  onSelectDate,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Generate 35 days (5 full weeks) leading up to today for a clean, aligned grid
  const { daysData, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute application counts by normalized YYYY-MM-DD
    const appMap = new Map<string, JobApplication[]>();
    applications.forEach((app) => {
      const rawDate = app.applicationDate || (app as any).createdAt || '';
      const dateKey = rawDate.split('T')[0];
      if (dateKey) {
        const existing = appMap.get(dateKey) || [];
        existing.push(app);
        appMap.set(dateKey, existing);
      }
    });

    // 35 days window (5 weeks) ending on current week's Saturday
    const days: DayData[] = [];
    const endDate = new Date(today);
    // Align to Saturday of current week
    const currentDayOfWeek = today.getDay();
    endDate.setDate(today.getDate() + (6 - currentDayOfWeek));

    // Start 34 days prior to endDate (5 full weeks = 35 days)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 34);

    let currentCursor = new Date(startDate);
    let weekIndex = 0;

    for (let i = 0; i < 35; i++) {
      const year = currentCursor.getFullYear();
      const month = String(currentCursor.getMonth() + 1).padStart(2, '0');
      const day = String(currentCursor.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayApps = appMap.get(dateStr) || [];
      const dayOfWeek = currentCursor.getDay();

      days.push({
        date: dateStr,
        dateObj: new Date(currentCursor),
        dayOfWeek,
        weekIndex,
        count: dayApps.length,
        apps: dayApps,
      });

      if (dayOfWeek === 6) {
        weekIndex++;
      }

      currentCursor.setDate(currentCursor.getDate() + 1);
    }

    // Filter to last 30 days for statistics
    const last30Cutoff = new Date(today);
    last30Cutoff.setDate(today.getDate() - 29);
    const last30CutoffStr = last30Cutoff.toISOString().split('T')[0];

    const last30Days = days.filter((d) => d.date >= last30CutoffStr && d.dateObj <= today);
    const total30DayApps = last30Days.reduce((acc, d) => acc + d.count, 0);
    const activeDaysCount = last30Days.filter((d) => d.count > 0).length;
    const peakDay = last30Days.reduce((max, d) => (d.count > max.count ? d : max), {
      count: 0,
      date: '',
    } as any);

    // Calculate current streak ending today
    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      const count = (appMap.get(dateKey) || []).length;
      if (count > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today has 0, check if yesterday had a streak
        if (streak === 0 && checkDate.getTime() === today.getTime()) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yKey = checkDate.toISOString().split('T')[0];
          if ((appMap.get(yKey) || []).length > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    return {
      daysData: days,
      stats: {
        total30DayApps,
        activeDaysCount,
        peakCount: peakDay.count,
        streak,
      },
    };
  }, [applications]);

  // Color scale mapping intensity level to dark-theme emerald tones
  const colorScale = d3
    .scaleThreshold<number, string>()
    .domain([1, 2, 4])
    .range([
      '#131826', // 0 apps: empty dark slate
      '#065f46', // 1 app: subtle deep emerald
      '#059669', // 2-3 apps: vibrant medium emerald
      '#10b981', // 4+ apps: bright intense neon emerald
    ]);

  // D3 rendering of the heatmap grid
  useEffect(() => {
    if (!svgRef.current || daysData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cellSize = 22;
    const cellGap = 5;
    const leftLabelOffset = 38;
    const topLabelOffset = 24;

    const totalWidth = leftLabelOffset + 5 * (cellSize + cellGap) + 20;
    const totalHeight = topLabelOffset + 7 * (cellSize + cellGap) + 10;

    svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    const g = svg.append('g').attr('transform', `translate(${leftLabelOffset}, ${topLabelOffset})`);

    // Render Weekday labels (Sun, Tue, Thu, Sat)
    const weekdays = [
      { day: 0, label: 'Sun' },
      { day: 2, label: 'Tue' },
      { day: 4, label: 'Thu' },
      { day: 6, label: 'Sat' },
    ];

    svg
      .append('g')
      .selectAll('text')
      .data(weekdays)
      .enter()
      .append('text')
      .attr('x', leftLabelOffset - 8)
      .attr('y', (d) => topLabelOffset + d.day * (cellSize + cellGap) + cellSize / 1.5)
      .attr('text-anchor', 'end')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .text((d) => d.label);

    // Render Month indicator headers
    const monthColumns = new Map<number, string>();
    daysData.forEach((d) => {
      const monthStr = d.dateObj.toLocaleString('default', { month: 'short' });
      if (!monthColumns.has(d.weekIndex)) {
        monthColumns.set(d.weekIndex, monthStr);
      }
    });

    Array.from(monthColumns.entries()).forEach(([wIdx, mLabel]) => {
      svg
        .append('text')
        .attr('x', leftLabelOffset + wIdx * (cellSize + cellGap) + cellSize / 2)
        .attr('y', topLabelOffset - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, monospace')
        .text(mLabel);
    });

    // Render Day Cells
    const cells = g
      .selectAll<SVGRectElement, DayData>('rect')
      .data(daysData)
      .enter()
      .append('rect')
      .attr('x', (d) => d.weekIndex * (cellSize + cellGap))
      .attr('y', (d) => d.dayOfWeek * (cellSize + cellGap))
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d) => colorScale(d.count))
      .attr('stroke', (d) => {
        if (d.date === selectedDate) return '#22d3ee'; // highlighted cyan border
        return d.count > 0 ? '#10b981' : '#1e2638';
      })
      .attr('stroke-width', (d) => (d.date === selectedDate ? 2.5 : 1))
      .attr('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    // Add glowing drop-shadow for selected or intense days
    cells
      .filter((d) => d.date === selectedDate)
      .attr('filter', 'drop-shadow(0px 0px 4px rgba(34, 211, 238, 0.6))');

    // D3 Interactive Handlers
    cells
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('transform', `translate(${d.weekIndex * (cellSize + cellGap) - 1}, ${d.dayOfWeek * (cellSize + cellGap) - 1}) scale(1.08)`)
          .attr('stroke', '#22d3ee')
          .attr('stroke-width', 2);

        setHoveredDay(d);

        // Tooltip position relative to container
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (event) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', function (_, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('transform', `translate(0, 0) scale(1)`)
          .attr('stroke', d.date === selectedDate ? '#22d3ee' : d.count > 0 ? '#10b981' : '#1e2638')
          .attr('stroke-width', d.date === selectedDate ? 2.5 : 1);

        setHoveredDay(null);
        setTooltipPos(null);
      })
      .on('click', (_, d) => {
        if (selectedDate === d.date) {
          onSelectDate(null); // toggle off
        } else {
          onSelectDate(d.date);
        }
      });
  }, [daysData, selectedDate, colorScale]);

  return (
    <div
      ref={containerRef}
      className="p-5 rounded-2xl bg-[#0e121b] border border-[#1e2638] shadow-xl space-y-4 relative overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Filter Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2638] relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Application Activity Heatmap
            </h3>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300">
              D3.js Visualization
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily job application frequency and momentum over the past month.
          </p>
        </div>

        {/* Selected Date Filter Pill */}
        {selectedDate && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700 text-xs text-cyan-200">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Filtered: <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            </span>
            <button
              onClick={() => onSelectDate(null)}
              title="Clear date filter"
              className="p-0.5 hover:text-white rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Heatmap Area with Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* D3 Heatmap SVG Container (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center sm:items-start space-y-3">
          <div className="w-full max-w-md overflow-x-auto py-1">
            <svg ref={svgRef} className="w-full h-auto min-w-[280px] max-h-[190px]" />
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Less</span>
            <span className="w-3.5 h-3.5 rounded bg-[#131826] border border-[#1e2638]" title="0 applications" />
            <span className="w-3.5 h-3.5 rounded bg-[#065f46] border border-[#047857]" title="1 application" />
            <span className="w-3.5 h-3.5 rounded bg-[#059669] border border-[#10b981]" title="2-3 applications" />
            <span className="w-3.5 h-3.5 rounded bg-[#10b981] border border-[#34d399]" title="4+ applications" />
            <span>More</span>
            <span className="text-slate-500 ml-2">· Click a day to filter</span>
          </div>
        </div>

        {/* Momentum & Velocity Metrics (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          {/* Total 30D Applications */}
          <div className="p-3.5 rounded-xl bg-[#131826]/70 border border-[#1e2638]">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">30-Day Total</span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {stats.total30DayApps}
            </div>
            <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.activeDaysCount} active days</span>
            </p>
          </div>

          {/* Current Streak */}
          <div className="p-3.5 rounded-xl bg-[#131826]/70 border border-[#1e2638]">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Streak</span>
            <div className="text-2xl font-black text-amber-300 font-mono mt-0.5 flex items-center gap-1">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.streak >= 3 ? 'Excellent momentum' : 'Keep applying daily'}
            </p>
          </div>

          {/* Peak Intensity */}
          <div className="p-3.5 rounded-xl bg-[#131826]/70 border border-[#1e2638]">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Peak Intensity</span>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-0.5">
              {stats.peakCount}
              <span className="text-xs text-slate-400 font-normal"> / day</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Single-day high</p>
          </div>

          {/* Pipeline Efficiency */}
          <div className="p-3.5 rounded-xl bg-[#131826]/70 border border-[#1e2638]">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Weekly Velocity</span>
            <div className="text-2xl font-black text-violet-300 font-mono mt-0.5">
              {Math.round((stats.total30DayApps / 4.3) * 10) / 10}
              <span className="text-xs text-slate-400 font-normal"> / wk</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Avg submissions</p>
          </div>
        </div>
      </div>

      {/* Floating Interactive Hover Tooltip */}
      {hoveredDay && tooltipPos && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 260, Math.max(10, tooltipPos.x + 12))}px`,
            top: `${Math.max(10, tooltipPos.y - 75)}px`,
          }}
          className="pointer-events-none absolute z-50 p-3 rounded-xl bg-[#090b10]/95 backdrop-blur-md border border-cyan-500/60 shadow-2xl text-xs space-y-1.5 w-64 animate-in fade-in duration-100"
        >
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <span className="font-bold text-white font-mono text-[11px]">
              {hoveredDay.dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                hoveredDay.count > 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {hoveredDay.count} {hoveredDay.count === 1 ? 'application' : 'applications'}
            </span>
          </div>

          {hoveredDay.count > 0 ? (
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {hoveredDay.apps.map((app, idx) => (
                <div key={app.id || idx} className="text-[11px] flex items-center justify-between gap-1">
                  <span className="text-slate-200 font-semibold truncate max-w-[130px]">
                    {app.companyName}
                  </span>
                  <span className="text-cyan-400 font-mono text-[10px] capitalize shrink-0">
                    {app.status}
                  </span>
                </div>
              ))}
              <div className="text-[9px] text-slate-500 pt-0.5 font-mono">
                Click cell to filter tracker
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No job applications recorded on this day.</p>
          )}
        </div>
      )}
    </div>
  );
};
