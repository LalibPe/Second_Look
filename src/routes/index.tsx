import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardPen, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { birthQuarter, buildSchedule, todayIso } from "@/lib/analytics";
import { CONFIG, PLAYERS, type Quarter } from "@/lib/data";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PlayerCard } from "@/components/second-look/PlayerCard";
import { SelectionAudit } from "@/components/second-look/SelectionAudit";
import { PlayerDetail } from "@/components/second-look/PlayerDetail";
import { ScheduleTab } from "@/components/second-look/ScheduleTab";
import { PlanTab } from "@/components/second-look/PlanTab";
import { LogSessionDialog } from "@/components/second-look/LogSessionDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Second Look — Youth volleyball tryout review" },
      { name: "description", content: "Review youth volleyball tryouts, spot who needs a second look, plan the follow-up session and log what you saw." },
      { property: "og:title", content: "Second Look — Youth volleyball tryout review" },
      { property: "og:description", content: "Review youth volleyball tryouts, plan a second look, and log follow-up sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tab = "players" | "schedule" | "plan";
const TABS: { id: Tab; label: string }[] = [
  { id: "players", label: "Players" },
  { id: "schedule", label: "Schedule" },
  { id: "plan", label: "Follow-up plan" },
];

function Index() {
  const { state, setState, reset } = useAppState();
  const [tab, setTab] = useState<Tab>("players");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("all");
  const [quarter, setQuarter] = useState<Quarter | null>(null);
  const [secondLookOnly, setSecondLookOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "quarter" | "position">("none");
  const [openId, setOpenId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState<string | null>(null);

  const schedule = useMemo(() => {
    const end = new Date(todayIso() + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() + 75);
    return buildSchedule("2026-10-01", end.toISOString().slice(0, 10), state.recurringDays, state.recurringEffective, state.exceptions);
  }, [state.recurringDays, state.recurringEffective, state.exceptions]);

  const visible = PLAYERS.filter((p) => {
    const q = query.trim().toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    if (position !== "all" && p.position !== position) return false;
    if (quarter && birthQuarter(p.birthDate) !== quarter) return false;
    if (secondLookOnly && !state.secondLook[p.id]) return false;
    return true;
  });
  const filtered = query || position !== "all" || quarter || secondLookOnly;
  const clearFilters = () => { setQuery(""); setPosition("all"); setQuarter(null); setSecondLookOnly(false); };

  const groups: { label: string; players: typeof visible }[] = (() => {
    if (groupBy === "quarter")
      return ([1, 2, 3, 4] as Quarter[]).map((q) => ({
        label: `Birth quarter Q${q}`,
        players: visible.filter((p) => birthQuarter(p.birthDate) === q),
      })).filter((g) => g.players.length > 0);
    if (groupBy === "position")
      return CONFIG.positions.map((pos) => ({ label: pos, players: visible.filter((p) => p.position === pos) })).filter((g) => g.players.length > 0);
    return [{ label: "", players: visible }];
  })();

  const openPlayer = PLAYERS.find((p) => p.id === openId) ?? null;
  const openLog = (date: string | null) => { setLogDate(date); setLogOpen(true); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="font-display text-2xl font-semibold uppercase tracking-wide">Second <span className="text-primary">Look</span></h1>
            <span className="rounded-sm border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Synthetic demo data</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm"><RotateCcw className="size-4" /><span className="hidden sm:inline">Reset demo</span></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
                <AlertDialogDescription>This clears your logged sessions, schedule changes, second-look flags and plan edits.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { reset(); clearFilters(); toast.success("Demo reset"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => openLog(null)}>
            <ClipboardPen className="size-4" /> Log session
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-6 px-4 sm:px-6" aria-label="Main sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "border-b-2 px-1 pb-2 pt-1 font-display text-lg font-semibold uppercase tracking-wide transition-colors",
                tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {tab === "players" && (
          <>
            <SelectionAudit active={quarter} onSelect={setQuarter} />

            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-56 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Search players" placeholder="Search name or player ID" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-44" aria-label="Position"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All positions</SelectItem>
                    {CONFIG.positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <SelectTrigger className="w-44" aria-label="Group roster by"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No grouping</SelectItem>
                    <SelectItem value="quarter">Group by birth quarter</SelectItem>
                    <SelectItem value="position">Group by position</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox checked={secondLookOnly} onCheckedChange={(c) => setSecondLookOnly(c === true)} aria-label="Second look only" />
                  Second look only
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={state.highlightSecondLooks}
                    onCheckedChange={(c) => setState((s) => ({ ...s, highlightSecondLooks: c === true }))}
                    aria-label="Highlight second looks"
                  />
                  Highlight second looks
                </label>
                {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="size-4" /> Reset filters</Button>}
              </div>
              <p className="text-sm text-muted-foreground">Showing {visible.length} of {PLAYERS.length} players{quarter && ` · Q${quarter} only`}</p>
              {visible.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">No players match these filters.</p>
              ) : (
                groups.map((g) => (
                  <div key={g.label || "all"}>
                    {g.label && <h2 className="mb-2 border-b border-border pb-1 font-display text-lg font-semibold uppercase tracking-wide">{g.label}</h2>}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {g.players.map((p) => (
                        <PlayerCard key={p.id} player={p} logs={state.logs}
                          secondLook={!!state.secondLook[p.id]} highlight={state.highlightSecondLooks}
                          onOpen={() => setOpenId(p.id)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="rounded-md border border-border bg-card p-5 text-sm">
              <h2 className="font-display text-lg font-semibold uppercase tracking-wide">About the method</h2>
              <p className="mt-1 text-muted-foreground">
                The selection audit is descriptive: it shows how provisional picks distribute across birth quarters and is
                a reason to review the trial, not proof of bias. Birth quarter gives age context and never determines who
                gets a second look. Coach assessments are subjective 1–5 ratings, kept separate from measured skill rates.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <a className="text-primary underline" target="_blank" rel="noreferrer"
                    href="https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01445/full">
                    Relative age effects in youth volleyball — Frontiers in Psychology (2020)
                  </a>
                </li>
              </ul>
            </section>
          </>
        )}

        {tab === "schedule" && (
          <ScheduleTab state={state} setState={setState} schedule={schedule} onLogSession={(d) => openLog(d)} />
        )}

        {tab === "plan" && (
          <PlanTab drills={state.drills} onChange={(drills) => setState((s) => ({ ...s, drills }))} />
        )}
      </main>

      <PlayerDetail
        player={openPlayer}
        logs={state.logs}
        schedule={schedule}
        secondLook={openPlayer ? !!state.secondLook[openPlayer.id] : false}
        onToggleSecondLook={(on) => openPlayer && setState((s) => ({ ...s, secondLook: { ...s.secondLook, [openPlayer.id]: on } }))}
        onClose={() => setOpenId(null)}
        onLogSession={(d) => openLog(d)}
      />
      <LogSessionDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        initialDate={logDate}
        logs={state.logs}
        onSave={(logs) => setState((s) => ({ ...s, logs }))}
      />
    </div>
  );
}
