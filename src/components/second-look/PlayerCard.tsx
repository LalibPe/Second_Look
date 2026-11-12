import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { birthQuarter, primarySkill, skillEvidence, suggestionReason, type SecondLookSuggestion } from "@/lib/analytics";
import type { CoachLog, Player } from "@/lib/data";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

/** Illustrated portrait from /players/{id}.webp, falling back to initials until the file exists. */
export function PlayerAvatar({ player, className, textClass }: { player: Player; className: string; textClass: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(false);
  }, [player.id]);
  useEffect(() => {
    // The 404 may fire before hydration attaches onError; check the settled image too.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  });
  if (failed) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center border border-primary/40 bg-accent font-display font-bold text-accent-foreground", className, textClass)}>
        {initials(player.name)}
      </div>
    );
  }
  return (
    <img
      ref={ref}
      src={`/players/${player.id}.webp?v=1`}
      alt={`Illustrated portrait of ${player.name}`}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-accent object-cover", className)}
    />
  );
}

export function StatusBadge({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 text-xs font-semibold",
        selected ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
      )}
    >
      {selected ? "Tentatively selected" : "Outside tentative squad"}
    </span>
  );
}

export function PlayerCard({
  player, logs, suggestion, flagged, followUpScheduled, highlight, onOpen,
}: {
  player: Player;
  logs: CoachLog[];
  suggestion: SecondLookSuggestion | null;
  flagged: boolean;
  followUpScheduled: boolean;
  highlight: boolean;
  onOpen: () => void;
}) {
  const skill = primarySkill(player.id, logs);
  const evidence = skill ? skillEvidence(player.id, skill, logs) : null;
  const needsLook = !!suggestion || flagged;

  return (
    <article
      className={cn(
        "flex flex-col rounded-md border bg-card p-4",
        highlight && needsLook ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar player={player} className="size-11 rounded-sm" textClass="text-lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-wide">{player.name}</h3>
          <p className="text-sm text-muted-foreground">{player.position} · Q{birthQuarter(player.birthDate)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge selected={player.provisional} />
        {suggestion && (
          <span className="rounded-sm bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            Suggested for second look
          </span>
        )}
        {flagged && (
          <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            Coach flagged
          </span>
        )}
        {followUpScheduled && (
          <span className="rounded-sm border border-primary/50 px-2 py-0.5 text-xs font-semibold text-primary">
            Follow-up scheduled
          </span>
        )}
      </div>
      {suggestion && (
        <p className="mt-2 rounded-sm bg-secondary px-2 py-1.5 text-xs text-secondary-foreground">
          {suggestionReason(player, suggestion)}
        </p>
      )}
      <p className="mt-3 border-t border-border pt-3 text-sm">
        {evidence ?? <span className="text-muted-foreground">No measured skills recorded yet</span>}
      </p>
      <Button className="mt-3 w-full" variant="secondary" onClick={onOpen}>View player</Button>
    </article>
  );
}
