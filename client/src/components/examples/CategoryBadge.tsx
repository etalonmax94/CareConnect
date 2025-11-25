import CategoryBadge from '../CategoryBadge';

export default function CategoryBadgeExample() {
  return (
    <div className="flex gap-3 p-6">
      <CategoryBadge category="NDIS" />
      <CategoryBadge category="Support at Home" />
      <CategoryBadge category="Private" />
    </div>
  );
}
