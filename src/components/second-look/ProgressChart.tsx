import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, passCompletion, RATING_LABELS, type RatingKey } from "@/lib/analytics";
import type { Observation } from "@/lib/demo-data";

type Metric = RatingKey | "passPct" | "goals";
const METRICS: { value: Metric; label: string }[] = [
  { value: "passing", label: "Passing assessment" },
  { value: "firstTouch", label: "First touch assessment" },
  { value: "decisions", label: "Decision-making assessment" },
  { value: "passPct", label: "Pass completion" },
  { value: "goals", label: "Goals" },
];

interface Point { label: string; value: number | null; obs: Observation; }

export function ProgressChart({ observations, highlightDate }: { observations: Observation[]; highlightDate: string | null }) {
  const [metric, setMetric] = useState<Metric>("passing");

  const data: Point[] = useMemo(() => {
    const perDay: Record<string, number> = {};
    const totals: Record<string, number> = {};
    observations.forEach((o) => (totals[o.date] = (totals[o.date] ?? 0) + 1));
    return observations.map((o) => {
      perDay[o.date] = (perDay[o.date] ?? 0) + 1;
      const label = formatDate(o.date) + ((totals[o.date] ?? 0) > 1 ? ` #${perDay[o.date]}` : "");
      let value: number | null;
      if (metric === "passPct")
        value = o.passesAttempted && o.passesCompleted !== null ? (o.passesCompleted / o.passesAttempted) * 100 : null;
      else if (metric === "goals") value = o.goals;
      else value = o[metric];
      return { label, value, obs: o };
    });
  }, [observations, metric]);

  const color = "var(--color-chart-1)";
  const hi = "var(--color-chart-2)";

  const summary = (() => {
    if (metric === "passPct") {
      const pc = passCompletion(observations);
      return pc.pct === null ? "No attempts" : `${pc.completed}/${pc.attempted} passes · ${pc.pct.toFixed(1)}% over period`;
    }
    if (metric === "goals") {
      const known = observations.filter((o) => o.goals !== null);
      return `${known.reduce((a, o) => a + (o.goals ?? 0), 0)} goals over period`;
    }
    const n = data.filter((d) => d.value !== null).length;
    return `${n} recorded assessment${n === 1 ? "" : "s"}`;
  })();

  const tooltip = (props: unknown) => {
    const { active, payload } = props as { active?: boolean; payload?: { payload: Point }[] };
    return renderTip(active, payload);
  };
  const renderTip = (active: boolean | undefined, payload: { payload: Point }[] | undefined) => {
    if (!active || !payload?.length) return null;
    const { obs, value } = payload[0]!.payload;
    let line: string;
    if (metric === "passPct")
      line = obs.passesAttempted === null ? "Not recorded" : obs.passesAttempted === 0
        ? "No attempts" : `${obs.passesCompleted}/${obs.passesAttempted} completed (${value!.toFixed(1)}%)`;
    else if (metric === "goals") line = obs.goals === null ? "Goals not recorded" : `${obs.goals} goal${obs.goals === 1 ? "" : "s"}`;
    else line = value === null ? "Not assessed" : `${RATING_LABELS[metric]}: ${value}/10`;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
        <div className="font-semibold">{formatDate(obs.date, { weekday: "short", month: "short", day: "numeric" })} · {obs.time}</div>
        <div>{line}</div>
        <div className="text-muted-foreground">{obs.sessionType} · {obs.minutes} min</div>
      </div>
    );
  };

  const axis = { stroke: "var(--color-muted-foreground)", fontSize: 12 };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide">Progress</h3>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="w-56" aria-label="Chart metric"><SelectValue /></SelectTrigger>
          <SelectContent>{METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="mt-1 text-sm text-muted-foreground" data-testid="chart-summary">{summary}</p>
      <div className="mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          {metric === "goals" ? (
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis allowDecimals={false} {...axis} width={28} />
              <Tooltip content={tooltip} cursor={{ fill: "var(--color-accent)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d) => <Cell key={d.obs.id} fill={d.obs.date === highlightDate ? hi : color} />)}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis domain={metric === "passPct" ? [0, 100] : [0, 10]} {...axis} width={34}
                tickFormatter={(v) => (metric === "passPct" ? `${v}%` : v)} />
              <Tooltip content={tooltip} />
              <Line
                type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} connectNulls={false} isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; payload: Point; index: number }) => {
                  const on = props.payload.obs.date === highlightDate;
                  if (props.cx == null || props.cy == null || props.payload.value === null) return <g key={props.index} />;
                  return (
                    <circle key={props.index} cx={props.cx} cy={props.cy} r={on ? 8 : 5}
                      fill={on ? hi : color} stroke="var(--color-background)" strokeWidth={2} />
                  );
                }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
