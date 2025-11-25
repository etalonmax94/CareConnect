import { Badge } from "@/components/ui/badge";
import type { ClientCategory } from "@shared/schema";

interface CategoryBadgeProps {
  category: ClientCategory;
  className?: string;
  abbreviated?: boolean;
}

const categoryStyles = {
  "NDIS": "bg-purple-600 text-white hover:bg-purple-700",
  "Support at Home": "bg-teal-600 text-white hover:bg-teal-700",
  "Private": "bg-blue-600 text-white hover:bg-blue-700"
};

const categoryAbbreviations: Record<ClientCategory, string> = {
  "NDIS": "NDIS",
  "Support at Home": "SaH",
  "Private": "Private"
};

export default function CategoryBadge({ category, className = "", abbreviated = false }: CategoryBadgeProps) {
  const displayText = abbreviated ? categoryAbbreviations[category] : category;
  
  return (
    <Badge 
      className={`${categoryStyles[category]} ${className}`}
      data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {displayText}
    </Badge>
  );
}
