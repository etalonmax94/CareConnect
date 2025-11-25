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
        <Card className="hover-elevate bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-100 mb-2">Total Clients</p>
                <p className="text-3xl font-semibold" data-testid="text-stat-total-clients">
                  {totalClients}
                </p>
                <p className="text-xs mt-2 text-blue-100">
                  ↑ 12% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-100 mb-2">Compliance Rate</p>
                <p className="text-3xl font-semibold" data-testid="text-stat-compliance-rate">
                  94%
                </p>
                <p className="text-xs mt-2 text-emerald-100">
                  ↑ 2% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-100 mb-2">Due This Month</p>
                <p className="text-3xl font-semibold" data-testid="text-stat-due-this-month">
                  23
                </p>
                <p className="text-xs mt-2 text-amber-100">
                  Requires attention
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-100 mb-2">Overdue Items</p>
                <p className="text-3xl font-semibold" data-testid="text-stat-overdue-items">
                  8
                </p>
                <p className="text-xs mt-2 text-red-100">
                  ⚠ Urgent action required
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
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
