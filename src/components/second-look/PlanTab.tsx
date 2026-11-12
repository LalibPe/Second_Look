import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { planToCsv, playerById, validateDrill, validateReps } from "@/lib/analytics";
import { CONFIG, PLAYERS, SKILL_KEYS, type PlanDrill, type SkillKey } from "@/lib/data";
import { toast } from "sonner";

interface Props {
  drills: PlanDrill[];
  onChange: (drills: PlanDrill[]) => void;
  /** When set, opens that drill's editor (e.g. from a player profile). */
  editRequest: string | null;
  onEditRequestHandled: () => void;
}

function DrillEditor({
  drill, drills, onSave, onCancel,
}: { drill: PlanDrill; drills: PlanDrill[]; onSave: (d: PlanDrill) => void; onCancel: () => void }) {
  const [reps, setReps] = useState(String(drill.reps));
  const [note, setNote] = useState(drill.note);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const err = validateReps(reps);
    if (err) return setError(err);
    onSave({ ...drill, reps: Number(reps), note: note.trim() });
  };

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-border pt-2">
      <div>
        <Label className="text-xs" htmlFor={`reps-${drill.playerId}-${drill.skill}`}>Target reps</Label>
        <Input id={`reps-${drill.playerId}-${drill.skill}`} className="w-24" inputMode="numeric" value={reps}
          onChange={(e) => { setReps(e.target.value); setError(validateReps(e.target.value)); }} />
      </div>
      <div className="min-w-48 flex-1">
        <Label className="text-xs" htmlFor={`note-${drill.playerId}-${drill.skill}`}>Note</Label>
        <Input id={`note-${drill.playerId}-${drill.skill}`} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button size="sm" onClick={save} disabled={!!error}>Save</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      {error && <p role="alert" className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PlanTab({ drills, onChange, editRequest, onEditRequestHandled }: Props) {
  const [editing, setEditing] = useState<string | null>(null); // `${playerId}:${skill}`

  useEffect(() => {
    if (editRequest) {
      setEditing(editRequest);
      onEditRequestHandled();
    }
  }, [editRequest, onEditRequestHandled]);
  const [playerId, setPlayerId] = useState(PLAYERS[0]!.id);
  const [skill, setSkill] = useState<SkillKey>("serveReceive");
  const [reps, setReps] = useState("15");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const item: PlanDrill = { playerId, skill, reps: Number(reps), note: note.trim() };
    const err = validateDrill(item, drills);
    if (err) return setError(err);
    onChange([...drills, item]);
    setNote("");
    setError(null);
    toast.success(`Drill added for ${playerById(playerId).name}`);
  };

  const exportCsv = () => {
    const blob = new Blob([planToCsv(drills)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "second-look-follow-up-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide">Follow-up plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drills for the second-look session, with target repetitions per skill. Planned reps are targets only —
          actual results are logged after the session through Log session.
        </p>

        <div className="mt-4 space-y-3">
          {drills.length === 0 && (
            <p className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No drills planned yet.</p>
          )}
          {drills.map((d) => {
            const p = playerById(d.playerId);
            const key = `${d.playerId}:${d.skill}`;
            return (
              <div key={key} className="rounded-sm border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-muted-foreground"> · {p.position}</span>
                    <div className="text-sm tabular">
                      {CONFIG.skills[d.skill].label} · <b>{d.reps}</b> target reps{d.note && ` · ${d.note}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label={`Edit drill for ${p.name}`}
                      onClick={() => setEditing(editing === key ? null : key)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Remove drill for ${p.name}`}
                      onClick={() => onChange(drills.filter((x) => `${x.playerId}:${x.skill}` !== key))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {editing === key && (
                  <DrillEditor drill={d} drills={drills} onCancel={() => setEditing(null)}
                    onSave={(next) => { onChange(drills.map((x) => (`${x.playerId}:${x.skill}` === key ? next : x))); setEditing(null); toast.success("Drill updated"); }} />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-sm border border-border bg-background p-3">
          <h3 className="text-sm font-semibold">Add a drill</h3>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Player</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger className="w-44" aria-label="Player"><SelectValue /></SelectTrigger>
                <SelectContent>{PLAYERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Skill</Label>
              <Select value={skill} onValueChange={(v) => setSkill(v as SkillKey)}>
                <SelectTrigger className="w-48" aria-label="Skill"><SelectValue /></SelectTrigger>
                <SelectContent>{SKILL_KEYS.map((k) => <SelectItem key={k} value={k}>{CONFIG.skills[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs" htmlFor="new-reps">Target reps</Label>
              <Input id="new-reps" className="w-24" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div className="min-w-48 flex-1">
              <Label className="text-xs" htmlFor="new-note">Note</Label>
              <Input id="new-note" placeholder="e.g. Serve receive to target under pressure" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button onClick={add}>Add drill</Button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <Button className="mt-4" variant="secondary" disabled={!drills.length} onClick={exportCsv}>
          <Download className="size-4" /> Export plan as CSV
        </Button>
      </section>
    </div>
  );
}
