/**
 * StatusPill — Renders a small muted label pill (e.g. "Not assessed",
 * "None found nearby"). One job: render the text it's given.
 */

export interface StatusPillProps {
  label: string;
}

export function StatusPill({ label }: StatusPillProps) {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">
      {label}
    </span>
  );
}

export default StatusPill;
