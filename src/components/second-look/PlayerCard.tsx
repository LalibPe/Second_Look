import { Button } from "@/components/ui/button";
import { birthQuarter, primarySkill, skillEvidence } from "@/lib/analytics";
import type { CoachLog, Player } from "@/lib/data";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

export function StatusBadge({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 text-xs font-semibold",
        selected ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
      )}
    >
      {selected ? "Provisional squad" : "Not selected"}
    </span>
  );
}

export function PlayerCard({
  player, logs, secondLook, highlight, onOpen,
}: { player: Player; logs: CoachLog[]; secondLook: boolean; highlight: boolean; onOpen: () => void }) {
  const skill = primarySkill(player.id, logs);
  const evidence = skill ? skillEvidence(player.id, skill, logs) : null;

  return (
    <article
      className={cn(
        "flex flex-col rounded-md border bg-card p-4",
        highlight && secondLook ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-accent font-display text-lg font-bold text-accent-foreground">
          {initials(player.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-wide">{player.name}</h3>
          <p className="text-sm text-muted-foreground">{player.position} · Q{birthQuarter(player.birthDate)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge selected={player.provisional} />
        {secondLook && (
          <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            Needs second look
          </span>
        )}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-sm">
        {evidence ?? <span className="text-muted-foreground">No measured skills recorded yet</span>}
      </p>
      <Button className="mt-3 w-full" variant="secondary" onClick={onOpen}>View player</Button>
    </article>
  );
}
