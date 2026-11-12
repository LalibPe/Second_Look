import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { reviewStatus, SUMMARIES, type Quarter } from "@/lib/analytics";
import { useAppState } from "@/lib/store";
import { PlayerCard } from "@/components/second-look/PlayerCard";
import { SelectionAudit } from "@/components/second-look/SelectionAudit";
import { PlayerDetail } from "@/components/second-look/PlayerDetail";
import { PlanSheet } from "@/components/second-look/PlanSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Second Look — Who have we seen too little of?" },
      { name: "description", content: "Review provisional youth squad selections, spot under-observed trialists and plan the next observation session." },
      { property: "og:title", content: "Second Look — Who have we seen too little of?" },
      { property: "og:description", content: "Review provisional youth squad selections and plan the next observation session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { state, setState, reset } = useAppState();
  const { thresholds, plan, budget } = state;
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("all");
  const [quarter, setQuarter] = useState<Quarter | null>(null);
  const [view, setView] = useState<"all" | "review">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const statuses = useMemo(
    () => Object.fromEntries(SUMMARIES.map((s) => [s.player.id, reviewStatus(s, thresholds)])),
    [thresholds],
  );
  const suggestedCount = Object.values(statuses).filter((s) => s.suggested).length;

  const visible = SUMMARIES.filter((s) => {
    const q = query.trim().toLowerCase();
    if (q && !s.player.name.toLowerCase().includes(q) && !s.player.id.toLowerCase().includes(q)) return false;
    if (position !== "all" && s.player.group !== position) return false;
    if (quarter && s.quarter !== quarter) return false;
    if (view === "review" && !statuses[s.player.id]?.suggested) return false;
    return true;
  });
  const filtered = query || position !== "all" || quarter || view !== "all";
  const clearFilters = () => { setQuery(""); setPosition("all"); setQuarter(null); setView("all"); };
  const setThreshold = (k: "rating" | "minutes", v: string) => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) setState((s) => ({ ...s, thresholds: { ...s.thresholds, [k]: n } }));
  };
  const open = SUMMARIES.find((s) => s.player.id === openId) ?? null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Second <span className="text-primary">Look</span></h1>
              <span className="rounded-md border border-warning/60 px-2 py-0.5 text-[11px] font-semibold text-warning">Synthetic demo data</span>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">Who have we seen too little of to make a confident decision?</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm"><RotateCcw className="size-4" /><span className="hidden sm:inline">Reset demo</span></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
                <AlertDialogDescription>This clears your next-session plan and restores the default review thresholds and budget.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { reset(); clearFilters(); toast.success("Demo reset"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => setPlanOpen(true)}>
            <ClipboardList className="size-4" /> Next session
            <span className="rounded-full bg-primary-foreground px-2 text-xs text-primary tabular" data-testid="plan-count">{plan.length}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid grid-cols-3 gap-3">
          {[
            ["Trialists", SUMMARIES.length],
            ["Provisional squad", SUMMARIES.filter((s) => s.player.provisional).length],
            ["Suggested for review", suggestedCount],
          ].map(([label, n]) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <div className="font-display text-4xl font-bold tabular">{n}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <SelectionAudit active={quarter} onSelect={setQuarter} />

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Review rule</h2>
          <p className="text-sm text-muted-foreground">
            A player is suggested when they are <b>outside the provisional squad</b>, the mean of their latest passing, first touch and decision-making
            assessments is <b>at least</b> the rating threshold (equal counts), and total observed minutes are <b>below</b> the minute threshold
            (equal does not count). All three assessments must be recorded. Birth quarter is never used.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <Label htmlFor="t-rating" className="text-xs">Mean assessment at least (/10)</Label>
              <Input id="t-rating" type="number" min={0} max={10} step={0.1} className="w-32" value={thresholds.rating} onChange={(e) => setThreshold("rating", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-min" className="text-xs">Observed minutes below</Label>
              <Input id="t-min" type="number" min={0} step={1} className="w-32" value={thresholds.minutes} onChange={(e) => setThreshold("minutes", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search players" placeholder="Search name or player ID" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="w-40" aria-label="Position"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                <SelectItem value="GK">Goalkeepers</SelectItem>
                <SelectItem value="DEF">Defenders</SelectItem>
                <SelectItem value="MID">Midfielders</SelectItem>
                <SelectItem value="FWD">Forwards</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quarter ? String(quarter) : "all"} onValueChange={(v) => setQuarter(v === "all" ? null : (Number(v) as Quarter))}>
              <SelectTrigger className="w-36" aria-label="Birth quarter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All quarters</SelectItem>
                {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as "all" | "review")}>
              <ToggleGroupItem value="all">All players</ToggleGroupItem>
              <ToggleGroupItem value="review">Suggested for review</ToggleGroupItem>
            </ToggleGroup>
            {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="size-4" /> Reset filters</Button>}
          </div>
          <p className="text-sm text-muted-foreground">Showing {visible.length} of {SUMMARIES.length} players{quarter && ` · Q${quarter} only`}</p>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No players match these filters.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((s, i) => (
                <PlayerCard key={s.player.id} s={s} index={i} suggested={!!statuses[s.player.id]?.suggested}
                  reason={statuses[s.player.id]?.reason ?? ""} onOpen={() => setOpenId(s.player.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">About the method</h2>
          <p className="mt-1 text-muted-foreground">
            The review thresholds are editable demonstration rules, not validated cut-offs. Coach assessments are subjective ratings.
            Research on relative age effects motivates checking selection by birth quarter; the synthetic data here only demonstrates the workflow.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><a className="text-primary underline" target="_blank" rel="noreferrer" href="https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1432605/full">Frontiers in Sports and Active Living (2024)</a></li>
            <li><a className="text-primary underline" target="_blank" rel="noreferrer" href="https://journals.sagepub.com/doi/10.1177/17479541221126152">International Journal of Sports Science &amp; Coaching (2022)</a></li>
          </ul>
        </section>
      </main>

      <PlayerDetail
        s={open} onClose={() => setOpenId(null)} thresholds={thresholds} plan={plan} budget={budget}
        onAdd={(item) => { setState((st) => ({ ...st, plan: [...st.plan, item] })); toast.success(`${item.playerId} added to next session`); }}
        onRemove={(id) => setState((st) => ({ ...st, plan: st.plan.filter((p) => p.playerId !== id) }))}
      />
      <PlanSheet open={planOpen} onOpenChange={setPlanOpen} plan={plan} budget={budget}
        onChange={(p, b) => setState((st) => ({ ...st, plan: p, budget: b }))} />
    </div>
  );
}
