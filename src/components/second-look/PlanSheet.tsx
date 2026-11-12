import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { allocated, planToCsv, validateBudget, validateMinutes, type PlanItem } from "@/lib/analytics";
import { PLAYERS } from "@/lib/demo-data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: PlanItem[];
  budget: number;
  onChange: (plan: PlanItem[], budget: number) => void;
}

function MinutesField({ item, plan, budget, onCommit }: { item: PlanItem; plan: PlanItem[]; budget: number; onCommit: (m: number) => void }) {
  const [raw, setRaw] = useState(String(item.minutes));
  useEffect(() => setRaw(String(item.minutes)), [item.minutes]);
  const err = validateMinutes(raw, plan, budget, item.playerId);
  return (
    <div>
      <Label className="text-xs" htmlFor={`m-${item.playerId}`}>Minutes</Label>
      <Input id={`m-${item.playerId}`} inputMode="numeric" value={raw} className="w-24"
        onChange={(e) => { setRaw(e.target.value); if (!validateMinutes(e.target.value, plan, budget, item.playerId)) onCommit(Number(e.target.value)); }} />
      {err && <p role="alert" className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function PlanSheet({ open, onOpenChange, plan, budget, onChange }: Props) {
  const [budgetRaw, setBudgetRaw] = useState(String(budget));
  useEffect(() => setBudgetRaw(String(budget)), [budget]);
  const budgetErr = validateBudget(budgetRaw, plan);
  const used = allocated(plan);

  const exportCsv = () => {
    const blob = new Blob([planToCsv(plan)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "second-look-next-session.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl uppercase tracking-wide">Next-session plan</SheetTitle>
          <SheetDescription>Observation-minute budget: how many minutes of focused watching you can give these players next session.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <Label htmlFor="budget">Total observation-minute budget</Label>
            <Input id="budget" inputMode="numeric" className="mt-1 w-28" value={budgetRaw}
              onChange={(e) => { setBudgetRaw(e.target.value); if (!validateBudget(e.target.value, plan)) onChange(plan, Number(e.target.value)); }} />
            {budgetErr && <p role="alert" className="mt-1 text-xs text-destructive">{budgetErr}</p>}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (used / budget) * 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm tabular">
              <span><b>{used}</b> min allocated</span>
              <span data-testid="remaining"><b>{budget - used}</b> min remaining</span>
            </div>
          </div>

          {plan.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No players yet. Open a player and choose “Add to next session”.
            </p>
          ) : (
            plan.map((item) => {
              const p = PLAYERS.find((x) => x.id === item.playerId)!;
              const update = (patch: Partial<PlanItem>) =>
                onChange(plan.map((x) => (x.playerId === item.playerId ? { ...x, ...patch } : x)), budget);
              return (
                <div key={item.playerId} className="space-y-2 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.id} · {p.position}</div>
                    </div>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${p.name}`}
                      onClick={() => onChange(plan.filter((x) => x.playerId !== item.playerId), budget)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <MinutesField item={item} plan={plan} budget={budget} onCommit={(m) => update({ minutes: m })} />
                  <div>
                    <Label className="text-xs" htmlFor={`f-${item.playerId}`}>Observation focus</Label>
                    <Textarea id={`f-${item.playerId}`} rows={2} value={item.focus} onChange={(e) => update({ focus: e.target.value })} />
                  </div>
                </div>
              );
            })
          )}
          <Button className="w-full" disabled={!plan.length} onClick={exportCsv}>
            <Download className="size-4" /> Export plan as CSV
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
