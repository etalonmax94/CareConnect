import StatCard from '../StatCard';
import { Users, FileCheck, Clock, AlertTriangle } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <StatCard
        title="Total Clients"
        value="127"
        icon={Users}
        trend={{ value: "12% from last month", positive: true }}
        iconClassName="text-blue-600"
      />
      <StatCard
        title="Compliance Rate"
        value="94%"
        icon={FileCheck}
        trend={{ value: "2% from last month", positive: true }}
        iconClassName="text-emerald-600"
      />
      <StatCard
        title="Due This Month"
        value="23"
        icon={Clock}
        iconClassName="text-amber-600"
      />
      <StatCard
        title="Overdue Items"
        value="8"
        icon={AlertTriangle}
        iconClassName="text-red-600"
      />
    </div>
  );
}
