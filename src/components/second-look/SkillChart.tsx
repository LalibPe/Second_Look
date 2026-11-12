import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assessmentLabel, assessmentSeries, formatDate, skillSeries, skillTotals, type ChartPoint } from "@/lib/analytics";
import { CONFIG, SKILL_KEYS, type CoachLog, type SkillKey } from "@/lib/data";

type Metric = SkillKey | "assessment";

export function SkillChart({
  playerId, logs, highlightDate,
}: { playerId: string; logs: CoachLog[]; highlightDate: string | null }) {
  const [metric, setMetric] = useState<Metric>("serveReceive");

  const data: ChartPoint[] = useMemo(
    () => (metric === "assessment" ? assessmentSeries(playerId, logs) : skillSeries(playerId, skillOr(metric), logs)),
    [playerId, metric, logs],
  );

  const summary = (() => {
    if (metric === "assessment") {
      const n = data.filter((d) => d.value !== null).length;
      return n === 0
        ? "No coach assessments logged yet — use Log session to add one."
        : `${n} coach assessment${n === 1 ? "" : "s"} logged · subjective 1–5 scale, kept separate from measured skill rates`;
    }
    const t = skillTotals(playerId, metric, logs);
    if (t.attempts === 0) return `No ${CONFIG.skills[metric].label.toLowerCase()} attempts recorded yet.`;
    return `${t.successes} of ${t.attempts} ${CONFIG.skills[metric].unit} · ${t.pct!.toFixed(1)}% overall`;
  })();

  const tooltip = (props: unknown) => {
    const { active, payload } = props as { active?: boolean; payload?: { payload: ChartPoint }[] };
    if (!active || !payload?.length) return null;
    const p = payload[0]!.payload;
    return (
      <div className="rounded-sm border border-border bg-popover px-3 py-2 text-sm shadow-sm">
        <div className="font-semibold">{formatDate(p.date, { weekday: "short", month: "short", day: "numeric" })}</div>
        {metric === "assessment" ? (
          <div>{p.assessment == null ? "No assessment" : `${p.assessment}/5 · ${assessmentLabel(p.assessment)}`}</div>
        ) : p.value === null ? (
          <div>No attempts recorded</div>
        ) : (
          <div>{p.successes} of {p.attempts} {CONFIG.skills[metric as SkillKey].unit} ({p.value.toFixed(1)}%)</div>
        )}
      </div>
    );
  };

  const axis = { stroke: "var(--color-muted-foreground)", fontSize: 12 };
  const color = "var(--color-chart-1)";
  const hi = "var(--color-chart-2)";

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Progress</h3>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="w-60" aria-label="Chart metric"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SKILL_KEYS.map((k) => (
              <SelectItem key={k} value={k}>{CONFIG.skills[k].label} success rate</SelectItem>
            ))}
            <SelectItem value="assessment">Coach assessment (1–5)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mt-1 text-sm text-muted-foreground" data-testid="chart-summary">{summary}</p>
      <div className="mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} {...axis} />
            {metric === "assessment" ? (
              <YAxis
                domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} width={120} {...axis}
                tickFormatter={(v: number) => (v === 1 ? "1 Needs work" : v === 3 ? "3 Meets expectations" : v === 5 ? "5 Consistently strong" : String(v))}
              />
            ) : (
              <YAxis domain={[0, 100]} width={40} {...axis} tickFormatter={(v: number) => `${v}%`} />
            )}
            <Tooltip content={tooltip} />
            <Line
              type="monotone" dataKey="value" stroke={color} strokeWidth={2} connectNulls={false} isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload: ChartPoint; index: number }) => {
                const on = props.payload.date === highlightDate;
                if (props.cx == null || props.cy == null || props.payload.value === null) return <g key={props.index} />;
                return (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={on ? 8 : 5}
                    fill={on ? hi : color} stroke="var(--color-card)" strokeWidth={2} />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function skillOr(m: Metric): SkillKey {
  return m === "assessment" ? "serveReceive" : m;
}
