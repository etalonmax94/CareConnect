import { Badge } from "@/components/ui/badge";

interface FundingTypeBadgeProps {
  fundingType: string | null | undefined;
}

export default function FundingTypeBadge({ fundingType }: FundingTypeBadgeProps) {
  if (!fundingType) return null;

  const getBadgeStyles = () => {
    switch (fundingType) {
      case "Plan-Managed":
        return "bg-[hsl(var(--funding-plan-managed))] text-[hsl(var(--funding-plan-managed-foreground))] border-[hsl(var(--funding-plan-managed))]";
      case "Agency-Managed":
        return "bg-[hsl(var(--funding-agency-managed))] text-[hsl(var(--funding-agency-managed-foreground))] border-[hsl(var(--funding-agency-managed))]";
      case "Self-Managed":
        return "bg-[hsl(var(--funding-self-managed))] text-[hsl(var(--funding-self-managed-foreground))] border-[hsl(var(--funding-self-managed))]";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-medium ${getBadgeStyles()}`}
      data-testid={`badge-funding-${fundingType.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {fundingType}
    </Badge>
  );
}
