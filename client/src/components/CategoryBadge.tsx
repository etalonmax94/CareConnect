import { Badge } from "@/components/ui/badge";
import type { ClientCategory } from "@shared/schema";

interface CategoryBadgeProps {
  category: ClientCategory;
  className?: string;
}

const categoryStyles = {
  "NDIS": "bg-blue-600 text-white hover:bg-blue-700",
  "Support at Home": "bg-emerald-600 text-white hover:bg-emerald-700",
  "Private": "bg-purple-600 text-white hover:bg-purple-700"
};

export default function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  return (
    <Badge 
      className={`${categoryStyles[category]} ${className}`}
      data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {category}
    </Badge>
  );
}
