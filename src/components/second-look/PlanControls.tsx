import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocated, validateAdd, type PlanItem } from "@/lib/analytics";

export function AddToPlan({
  playerId, plan, budget, onAdd, onRemove,
}: { playerId: string; plan: PlanItem[]; budget: number; onAdd: (i: PlanItem) => void; onRemove: (id: string) => void }) {
  const existing = plan.find((p) => p.playerId === playerId);
  const remaining = budget - allocated(plan);
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.min(10, remaining))));
  const [focus, setFocus] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (existing)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/50 bg-primary/10 p-3">
        <p className="text-sm"><b>In next-session plan</b> · {existing.minutes} min{existing.focus && ` · ${existing.focus}`}</p>
        <Button size="sm" variant="outline" onClick={() => onRemove(playerId)}>Remove from plan</Button>
      </div>
    );

  const submit = () => {
    const raw = minutes.trim();
    const err = /^\d+$/.test(raw) ? validateAdd({ playerId, minutes: Number(raw), focus }, plan, budget) : validateAdd({ playerId, minutes: NaN, focus }, plan, budget);
    if (err) return setError(err);
    setError(null);
    onAdd({ playerId, minutes: Number(raw), focus: focus.trim() });
  };

  return (
    <form className="rounded-xl border border-border bg-secondary p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Label htmlFor="add-min" className="text-xs">Planned minutes</Label>
          <Input id="add-min" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="min-w-48 flex-1">
          <Label htmlFor="add-focus" className="text-xs">Observation focus</Label>
          <Input id="add-focus" placeholder="e.g. Decisions under pressure" value={focus} onChange={(e) => setFocus(e.target.value)} />
        </div>
        <Button type="submit">Add to next session</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{remaining} of {budget} observation minutes remaining.</p>
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </form>
  );
}
