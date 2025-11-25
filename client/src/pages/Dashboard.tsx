import { useState } from "react";
import { Users, FileCheck, Clock, AlertTriangle, Plus, X, ChevronRight, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import CategoryBadge from "@/components/CategoryBadge";
import ComplianceIndicator from "@/components/ComplianceIndicator";
import { useQuery } from "@tanstack/react-query";
import type { Client, ActivityLog } from "@shared/schema";
import { Link } from "wouter";

interface DashboardData {
  totalClients: number;
  newClients: number;
  complianceRate: {
    compliant: number;
    nonCompliant: number;
    percentage: number;
  };
  dueThisMonth: number;
  dueThisMonthItems: Array<{ clientId: string; clientName: string; documentType: string; dueDate: string }>;
  overdueItems: number;
  overdueItemsList: Array<{ clientId: string; clientName: string; documentType: string; dueDate: string }>;
  openIncidents: number;
  totalBudgetAllocated: number;
  totalBudgetUsed: number;
}

type ModalType = "newClients" | "compliance" | "dueThisMonth" | "overdue" | null;

export default function Dashboard() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const { data: clients = [] } = useQuery<(Client & { age?: number })[]>({
    queryKey: ["/api/clients"],
  });

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["/api/reports/dashboard"],
  });

  const { data: newClients = [] } = useQuery<(Client & { age?: number })[]>({
    queryKey: ["/api/clients/new/30"],
    enabled: activeModal === "newClients",
  });

  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const ndisClients = clients.filter(c => c.category === "NDIS").length;
  const supportClients = clients.filter(c => c.category === "Support at Home").length;
  const privateClients = clients.filter(c => c.category === "Private").length;

  const compliantClients = clients.filter(c => {
    const docs = c.clinicalDocuments || {};
    const requiredDocs = ['serviceAgreementDate', 'consentFormDate', 'riskAssessmentDate', 'carePlanDate'];
    const filledDocs = requiredDocs.filter(doc => docs[doc as keyof typeof docs]);
    return filledDocs.length >= requiredDocs.length * 0.75;
  });

  const nonCompliantClients = clients.filter(c => !compliantClients.includes(c));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatActivityTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('created') || action.includes('added')) return 'bg-blue-600';
    if (action.includes('updated') || action.includes('uploaded')) return 'bg-emerald-600';
    if (action.includes('incident')) return 'bg-red-600';
    if (action.includes('consent')) return 'bg-purple-600';
    return 'bg-gray-600';
  };

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
        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0"
          onClick={() => setActiveModal("newClients")}
          data-testid="card-total-clients"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-blue-50 mb-3">Total Clients</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-total-clients">
                  {dashboardData?.totalClients || clients.length}
                </p>
                <div className="flex items-center gap-1 text-blue-50">
                  <span className="text-xl font-bold">+{dashboardData?.newClients || 0}</span>
                  <span className="text-sm font-semibold">new in 30 days</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Users className="w-7 h-7" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-blue-100 text-sm">
              <span>Click to view new clients</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0"
          onClick={() => setActiveModal("compliance")}
          data-testid="card-compliance-rate"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-emerald-50 mb-3">Compliance Rate</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-compliance-rate">
                  {dashboardData?.complianceRate?.percentage || 0}%
                </p>
                <div className="flex items-center gap-1 text-emerald-50">
                  <span className="text-sm font-semibold">
                    {dashboardData?.complianceRate?.compliant || 0} compliant / {dashboardData?.complianceRate?.nonCompliant || 0} non-compliant
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <FileCheck className="w-7 h-7" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-emerald-100 text-sm">
              <span>Click to view details</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0"
          onClick={() => setActiveModal("dueThisMonth")}
          data-testid="card-due-this-month"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-amber-50 mb-3">Due This Month</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-due-this-month">
                  {dashboardData?.dueThisMonth || 0}
                </p>
                <p className="text-sm font-semibold text-amber-50">
                  Documents requiring review
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <Clock className="w-7 h-7" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-amber-100 text-sm">
              <span>Click to view documents</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-br from-red-500 to-red-600 text-white border-0"
          onClick={() => setActiveModal("overdue")}
          data-testid="card-overdue-items"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-red-50 mb-3">Overdue Items</p>
                <p className="text-5xl font-bold mb-3" data-testid="text-stat-overdue-items">
                  {dashboardData?.overdueItems || 0}
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
            <div className="flex items-center gap-1 mt-2 text-red-100 text-sm">
              <span>Click to view overdue</span>
              <ChevronRight className="w-4 h-4" />
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
            <CardTitle className="text-lg">Budget Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Allocated</span>
              <span className="text-xl font-semibold text-primary">
                ${(dashboardData?.totalBudgetAllocated || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Used</span>
              <span className="text-xl font-semibold">
                ${(dashboardData?.totalBudgetUsed || 0).toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ 
                  width: `${dashboardData?.totalBudgetAllocated ? 
                    Math.min((dashboardData.totalBudgetUsed / dashboardData.totalBudgetAllocated) * 100, 100) : 0}%` 
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-xl font-semibold text-green-600">
                ${((dashboardData?.totalBudgetAllocated || 0) - (dashboardData?.totalBudgetUsed || 0)).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <Link href="/activity">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity.length > 0 ? (
              activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className={`w-2 h-2 ${getActivityColor(item.action)} rounded-full mt-2`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.performedBy && `${item.performedBy} • `}
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </div>
                  {item.clientId && (
                    <Link href={`/clients/${item.clientId}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">System initialized</p>
                    <p className="text-xs text-muted-foreground">CRM system ready for use</p>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground py-4">
                  Activity will appear here as you use the system
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Clients Modal */}
      <Dialog open={activeModal === "newClients"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              New Clients (Last 30 Days)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {newClients.length > 0 ? (
                newClients.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{client.participantName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <CategoryBadge category={client.category} />
                                {client.age && (
                                  <span className="text-xs text-muted-foreground">{client.age} years old</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Added {formatDate(client.createdAt.toString())}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No new clients added in the last 30 days
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Compliance Modal */}
      <Dialog open={activeModal === "compliance"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              Compliance Overview
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{compliantClients.length}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">Compliant Clients</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{nonCompliantClients.length}</p>
                <p className="text-sm text-red-700 dark:text-red-400">Non-Compliant Clients</p>
              </CardContent>
            </Card>
          </div>
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Non-Compliant Clients (Missing Documents)</h4>
              {nonCompliantClients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="hover-elevate cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{client.participantName}</p>
                            <CategoryBadge category={client.category} />
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">Action Required</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {nonCompliantClients.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  All clients are compliant!
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Due This Month Modal */}
      <Dialog open={activeModal === "dueThisMonth"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Documents Due This Month
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {dashboardData?.dueThisMonthItems && dashboardData.dueThisMonthItems.length > 0 ? (
                dashboardData.dueThisMonthItems.map((item, index) => (
                  <Link key={index} href={`/clients/${item.clientId}`}>
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.clientName}</p>
                            <p className="text-sm text-muted-foreground">{item.documentType}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Calendar className="w-3 h-3 mr-1" />
                              Due {formatDate(item.dueDate)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents due this month
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Overdue Modal */}
      <Dialog open={activeModal === "overdue"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Overdue Documents
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {dashboardData?.overdueItemsList && dashboardData.overdueItemsList.length > 0 ? (
                dashboardData.overdueItemsList.map((item, index) => (
                  <Link key={index} href={`/clients/${item.clientId}`}>
                    <Card className="hover-elevate cursor-pointer border-red-200 dark:border-red-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.clientName}</p>
                            <p className="text-sm text-muted-foreground">{item.documentType}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue since {formatDate(item.dueDate)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No overdue documents
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
