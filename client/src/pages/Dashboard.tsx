import { Users, FileCheck, Clock, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryBadge from "@/components/CategoryBadge";
import ComplianceIndicator from "@/components/ComplianceIndicator";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/schema";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const totalClients = clients.length;
  const ndisClients = clients.filter(c => c.category === "NDIS").length;
  const supportClients = clients.filter(c => c.category === "Support at Home").length;
  const privateClients = clients.filter(c => c.category === "Private").length;
  
  const upcomingRenewals = clients.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of client management and compliance status
          </p>
        </div>
        <Link href="/clients/new">
          <Button data-testid="button-add-client">
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-blue-50 mb-3">Total Clients</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-total-clients">
                  {totalClients}
                </p>
                <div className="flex items-center gap-1 text-blue-50">
                  <span className="text-xl font-bold">↑</span>
                  <span className="text-sm font-semibold">12% from last month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Users className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-emerald-50 mb-3">Compliance Rate</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-compliance-rate">
                  94%
                </p>
                <div className="flex items-center gap-1 text-emerald-50">
                  <span className="text-xl font-bold">↑</span>
                  <span className="text-sm font-semibold">2% from last month</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <FileCheck className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-amber-50 mb-3">Due This Month</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-due-this-month">
                  23
                </p>
                <p className="text-sm font-semibold text-amber-50">
                  Requires attention
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-red-50 mb-3">Overdue Items</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-overdue-items">
                  8
                </p>
                <div className="flex items-center gap-1 text-red-50">
                  <span className="text-xl font-bold">⚠</span>
                  <span className="text-sm font-semibold">Urgent action required</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <AlertTriangle className="w-7 h-7" />
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
