import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assessmentLabel, formatDate, playerById, todayIso } from "@/lib/analytics";
import { CONFIG, PLAYERS, SKILL_KEYS, type CoachLog, type SessionType, type SkillKey } from "@/lib/data";
import { toast } from "sonner";

interface DraftEntry {
  playerId: string;
  assessment: number | null;
  comment: string;
  minutes: string; // optional on-court minutes, scrimmages/matches only
  skills: Partial<Record<SkillKey, { attempts: string; successes: string }>>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialDate: string | null;
  logs: CoachLog[];
  onSave: (logs: CoachLog[]) => void;
}

/** Three-step logging flow: pick date/type/players → record each player one at a time → review and save.
 *  A repeat log for the same player and date opens the existing entry for editing, so it never double-counts. */
export function LogSessionDialog({ open, onOpenChange, initialDate, logs, onSave }: Props) {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(todayIso());
  const [sessionType, setSessionType] = useState<SessionType>("practice");
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setDate(initialDate ?? todayIso());
      setSessionType("practice");
      setSelected([]);
      setDrafts({});
      setCursor(0);
    }
  }, [open, initialDate]);

  const togglePlayer = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const startRecording = () => {
    const next: Record<string, DraftEntry> = {};
    for (const id of selected) {
      const existing = logs.find((l) => l.playerId === id && l.date === date);
      next[id] = existing
        ? {
            playerId: id,
            assessment: existing.assessment,
            comment: existing.comment,
            minutes: existing.minutes ? String(existing.minutes) : "",
            skills: Object.fromEntries(
              Object.entries(existing.skills).map(([k, v]) => [k, { attempts: String(v!.attempts), successes: String(v!.successes) }]),
            ),
          }
        : { playerId: id, assessment: null, comment: "", minutes: "", skills: {} };
    }
    setDrafts(next);
    setCursor(0);
    setStep(1);
  };

  const current = selected[cursor] ?? null;
  const draft = current ? drafts[current] : null;
  const isEdit = current ? logs.some((l) => l.playerId === current && l.date === date) : false;

  const setDraft = (patch: Partial<DraftEntry>) =>
    current && setDrafts((d) => ({ ...d, [current]: { ...d[current]!, ...patch } }));

  const setSkill = (k: SkillKey, field: "attempts" | "successes", value: string) =>
    current &&
    setDrafts((d) => ({
      ...d,
      [current]: { ...d[current]!, skills: { ...d[current]!.skills, [k]: { attempts: "", successes: "", ...d[current]!.skills[k], [field]: value } } },
    }));

  const skillError = useMemo(() => {
    if (!draft) return null;
    if (draft.minutes !== "" && (!/^\d+$/.test(draft.minutes) || Number(draft.minutes) <= 0))
      return "Court minutes: enter a whole number greater than 0, or leave it empty.";
    for (const k of SKILL_KEYS) {
      const s = draft.skills[k];
      if (!s || (s.attempts === "" && s.successes === "")) continue;
      const a = Number(s.attempts);
      const ok = Number(s.successes);
      if (!/^\d+$/.test(s.attempts) || !/^\d+$/.test(s.successes) || a <= 0)
        return `${CONFIG.skills[k].label}: enter whole numbers for attempts and successes.`;
      if (ok > a) return `${CONFIG.skills[k].label}: successes can't exceed attempts.`;
    }
    return null;
  }, [draft]);

  const save = () => {
    const kept = logs.filter((l) => !(selected.includes(l.playerId) && l.date === date));
    const added: CoachLog[] = selected.map((id) => {
      const d = drafts[id]!;
      const skills: CoachLog["skills"] = {};
      for (const k of SKILL_KEYS) {
        const s = d.skills[k];
        if (s && s.attempts !== "" && s.successes !== "") skills[k] = { attempts: Number(s.attempts), successes: Number(s.successes) };
      }
      return {
        playerId: id, date, sessionType, assessment: d.assessment, comment: d.comment.trim(), skills,
        minutes: d.minutes === "" ? null : Number(d.minutes),
      };
    });
    onSave([...kept, ...added]);
    toast.success(`Session saved for ${added.length} player${added.length === 1 ? "" : "s"}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border-border bg-background">
        <DialogTitle className="font-display text-2xl font-semibold uppercase tracking-wide">Log session</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {step === 0 && "Step 1 of 3 · Pick the date, session type and the players you observed."}
          {step === 1 && `Step 2 of 3 · Player ${cursor + 1} of ${selected.length}.`}
          {step === 2 && "Step 3 of 3 · Review and save."}
        </DialogDescription>

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <Label htmlFor="log-date">Date</Label>
                <Input id="log-date" type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Session type</Label>
                <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
                  <SelectTrigger className="w-44" aria-label="Session type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONFIG.sessionTypes) as SessionType[]).map((t) => (
                      <SelectItem key={t} value={t}>{CONFIG.sessionTypes[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Players observed</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PLAYERS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1.5 text-sm">
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => togglePlayer(p.id)} aria-label={`Select ${p.name}`} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={selected.length === 0 || !date} onClick={startRecording}>
                Next <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 1 && current && draft && (
          <div className="space-y-4">
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="font-display text-xl font-semibold uppercase tracking-wide">{playerById(current).name}</div>
              <div className="text-sm text-muted-foreground">
                {playerById(current).position} · {formatDate(date, { weekday: "long", month: "long", day: "numeric" })} · {CONFIG.sessionTypes[sessionType]}
                {isEdit && <span className="text-primary"> · editing the existing log for this date</span>}
              </div>
            </div>
            <div>
              <Label>Coach assessment (subjective)</Label>
              <RadioGroup
                className="mt-2 flex flex-wrap gap-2"
                value={draft.assessment === null ? "" : String(draft.assessment)}
                onValueChange={(v) => setDraft({ assessment: Number(v) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1.5 text-sm">
                    <RadioGroupItem value={String(n)} aria-label={`${n} ${assessmentLabel(n)}`} />
                    {n} · {assessmentLabel(n)}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {sessionType !== "practice" && (
              <div>
                <Label htmlFor="log-minutes">On-court minutes (optional)</Label>
                <Input
                  id="log-minutes" className="w-32" inputMode="numeric" placeholder="e.g. 25"
                  value={draft.minutes} onChange={(e) => setDraft({ minutes: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Actual minutes this player was on court — never the whole-session duration. Enables attempts per 60.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="log-comment">Comment</Label>
              <Textarea id="log-comment" rows={2} placeholder="What did you see?" value={draft.comment} onChange={(e) => setDraft({ comment: e.target.value })} />
            </div>
            <div>
              <Label>Measured skills (optional — only if actually recorded)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {SKILL_KEYS.map((k) => (
                  <div key={k} className="rounded-sm border border-border bg-card p-2">
                    <div className="text-sm font-semibold">{CONFIG.skills[k].label}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Input className="w-20" inputMode="numeric" placeholder="Successes" aria-label={`${CONFIG.skills[k].label} successes`}
                        value={draft.skills[k]?.successes ?? ""} onChange={(e) => setSkill(k, "successes", e.target.value)} />
                      <span className="text-muted-foreground">of</span>
                      <Input className="w-20" inputMode="numeric" placeholder="Attempts" aria-label={`${CONFIG.skills[k].label} attempts`}
                        value={draft.skills[k]?.attempts ?? ""} onChange={(e) => setSkill(k, "attempts", e.target.value)} />
                      <span className="text-xs text-muted-foreground">{CONFIG.skills[k].unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {skillError && <p role="alert" className="mt-2 text-sm text-destructive">{skillError}</p>}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => (cursor === 0 ? setStep(0) : setCursor(cursor - 1))}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button disabled={!!skillError} onClick={() => (cursor + 1 < selected.length ? setCursor(cursor + 1) : setStep(2))}>
                {cursor + 1 < selected.length ? `Next player (${cursor + 2} of ${selected.length})` : "Review"} <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {formatDate(date, { weekday: "long", month: "long", day: "numeric" })} · {CONFIG.sessionTypes[sessionType]} · {selected.length} player{selected.length === 1 ? "" : "s"}
            </p>
            <ul className="space-y-2">
              {selected.map((id) => {
                const d = drafts[id]!;
                const skills = SKILL_KEYS.filter((k) => d.skills[k]?.attempts)
                  .map((k) => `${CONFIG.skills[k].label} ${d.skills[k]!.successes}/${d.skills[k]!.attempts}`)
                  .join(" · ");
                return (
                  <li key={id} className="rounded-sm border border-border bg-card p-3 text-sm">
                    <b>{playerById(id).name}</b>
                    {d.assessment !== null ? ` · ${d.assessment}/5 ${assessmentLabel(d.assessment)}` : " · no assessment"}
                    {skills && <div className="tabular">{skills}</div>}
                    {d.comment && <div className="italic text-muted-foreground">“{d.comment}”</div>}
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => { setStep(1); setCursor(selected.length - 1); }}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button onClick={save}>Save session</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
