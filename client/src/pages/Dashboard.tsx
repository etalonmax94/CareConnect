import { Users, FileCheck, Clock, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/StatCard";
import CategoryBadge from "@/components/CategoryBadge";
import ComplianceIndicator from "@/components/ComplianceIndicator";
import { mockClients } from "@/lib/mockData";

export default function Dashboard() {
  // todo: remove mock functionality
  const totalClients = mockClients.length;
  const ndisClients = mockClients.filter(c => c.category === "NDIS").length;
  const supportClients = mockClients.filter(c => c.category === "Support at Home").length;
  const privateClients = mockClients.filter(c => c.category === "Private").length;
  
  const upcomingRenewals = mockClients.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of client management and compliance status
          </p>
        </div>
        <Button data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Add New Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={totalClients}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryBadge category="NDIS" />
                <span className="text-sm text-muted-foreground">NDIS Clients</span>
              </div>
              <span className="text-xl font-semibold" data-testid="text-ndis-count">{ndisClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryBadge category="Support at Home" />
                <span className="text-sm text-muted-foreground">Support at Home</span>
              </div>
              <span className="text-xl font-semibold" data-testid="text-support-count">{supportClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CategoryBadge category="Private" />
                <span className="text-sm text-muted-foreground">Private Clients</span>
              </div>
              <span className="text-xl font-semibold" data-testid="text-private-count">{privateClients}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Document Renewals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingRenewals.map(client => (
              <div key={client.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{client.participantName}</p>
                  <p className="text-xs text-muted-foreground">Care Plan Review</p>
                </div>
                <ComplianceIndicator status="due-soon" label="30 days" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b last:border-0">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New client added: Margaret Thompson</p>
                <p className="text-xs text-muted-foreground">NDIS category • 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b last:border-0">
              <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Document uploaded: Care Plan for Robert Anderson</p>
                <p className="text-xs text-muted-foreground">Support at Home • 5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b last:border-0">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Invoice generated for Emma Richardson</p>
                <p className="text-xs text-muted-foreground">Private category • 1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
