import { Badge } from "@/components/ui/Badge";

/**
 * StatusPill — Renders a small muted label pill (e.g. "Not assessed",
 * "None found nearby"). One job: render the text it's given.
 */

export interface StatusPillProps {
  label: string;
}

export function StatusPill({ label }: StatusPillProps) {
  return <Badge label={label} tone="neutral" />;
}

export default StatusPill;
