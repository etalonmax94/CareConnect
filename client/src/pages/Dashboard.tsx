import { useState } from "react";
import { Users, FileCheck, Clock, AlertTriangle, Plus, X, ChevronRight, Calendar, User, Cake, Gift, UsersRound, DollarSign, Shield, UserX, UserPlus, Accessibility, Home, Wallet, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CategoryBadge from "@/components/CategoryBadge";
import ComplianceIndicator from "@/components/ComplianceIndicator";
import { useQuery } from "@tanstack/react-query";
import type { Client, ActivityLog, Staff } from "@shared/schema";
import { Link, useLocation } from "wouter";

interface OpenIncident {
  id: string;
  clientId: string;
  incidentType: string;
  severity: string;
  status: string;
  incidentDate: string;
  description: string;
}

interface UnassignedClient {
  id: string;
  participantName: string;
  category: string;
  phoneNumber: string | null;
  createdAt: string;
}

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
  openIncidentsList: OpenIncident[];
  unassignedClients: number;
  unassignedClientsList: UnassignedClient[];
  totalBudgetAllocated: number;
  totalBudgetUsed: number;
}

interface BudgetAlert {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  allocated: number;
  used: number;
  remaining: number;
  percentUsed: number;
  alertType: "overspent" | "low";
}

interface BudgetAlertsData {
  totalAlerts: number;
  overspentCount: number;
  lowCount: number;
  alerts: BudgetAlert[];
}

interface SchedulingConflict {
  id: string;
  appointmentId: string;
  clientId?: string | null;
  staffId?: string | null;
  conflictType: string;
  severity: "critical" | "warning" | "info";
  description: string;
  status: "open" | "resolved" | "dismissed";
  detectedAt: string;
  clientName?: string | null;
  staffName?: string | null;
}

interface SchedulingConflictsData {
  total: number;
  critical: number;
  warning: number;
  conflicts: SchedulingConflict[];
}

type ModalType = "newClients" | "compliance" | "dueThisMonth" | "overdue" | "birthdays" | "budgetAlerts" | "incidents" | "unassignedClients" | "schedulingConflicts" | null;

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

  interface BirthdayClient extends Client {
    age?: number;
    daysUntilBirthday: number;
    turningAge: number;
    birthdayDate: string;
  }

  const { data: upcomingBirthdays = [] } = useQuery<BirthdayClient[]>({
    queryKey: ["/api/clients/birthdays/30"],
  });

  const { data: budgetAlerts } = useQuery<BudgetAlertsData>({
    queryKey: ["/api/reports/budget-alerts"],
  });

  // Fetch scheduling conflicts for the dashboard
  const { data: schedulingConflicts } = useQuery<SchedulingConflictsData>({
    queryKey: ["/api/scheduling-conflicts/dashboard"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const activeStaff = staffList.filter(s => s.isActive === "yes");
  const newStaffIn30Days = activeStaff.filter(s => {
    if (!s.createdAt) return false;
    const createdDate = new Date(s.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const [, setLocation] = useLocation();
  
  const ndisClients = clients.filter(c => c.category === "NDIS").length;
  const supportClients = clients.filter(c => c.category === "Support at Home").length;
  const privateClients = clients.filter(c => c.category === "Private").length;
  const totalClients = clients.length;
  
  const ndisPercentage = totalClients > 0 ? Math.round((ndisClients / totalClients) * 100) : 0;
  const supportPercentage = totalClients > 0 ? Math.round((supportClients / totalClients) * 100) : 0;
  const privatePercentage = totalClients > 0 ? Math.round((privateClients / totalClients) * 100) : 0;

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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-page-title">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Overview of client management and compliance status
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/leadership-meeting">
            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm" data-testid="button-leadership-meeting">
              <UsersRound className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Leadership Meeting</span>
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button size="sm" className="h-9 sm:h-10 text-xs sm:text-sm" data-testid="button-add-client">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add New Client</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card 
          className="hover-elevate cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0"
          onClick={() => setActiveModal("newClients")}
          data-testid="card-total-clients"
        >
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold text-blue-50 mb-1 sm:mb-3">Total Clients</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-total-clients">
                  {dashboardData?.totalClients || clients.length}
                </p>
                <div className="flex items-center gap-1 text-blue-50">
                  <span className="text-sm sm:text-xl font-bold">+{dashboardData?.newClients || 0}</span>
                  <span className="text-[10px] sm:text-sm font-semibold">new</span>
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <Users className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 text-blue-100 text-sm">
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
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold text-emerald-50 mb-1 sm:mb-3">Compliance</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-compliance-rate">
                  {dashboardData?.complianceRate?.percentage || 0}%
                </p>
                <div className="flex items-center gap-1 text-emerald-50">
                  <span className="text-[10px] sm:text-sm font-semibold truncate">
                    {dashboardData?.complianceRate?.compliant || 0}/{dashboardData?.complianceRate?.nonCompliant || 0}
                  </span>
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <FileCheck className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 text-emerald-100 text-sm">
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
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold text-amber-50 mb-1 sm:mb-3">Due This Month</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-due-this-month">
                  {dashboardData?.dueThisMonth || 0}
                </p>
                <p className="text-[10px] sm:text-sm font-semibold text-amber-50 truncate">
                  Docs to review
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <Clock className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 text-amber-100 text-sm">
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
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold text-red-50 mb-1 sm:mb-3">Overdue</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-overdue-items">
                  {dashboardData?.overdueItems || 0}
                </p>
                <div className="flex items-center gap-1 text-red-50">
                  <span className="text-[10px] sm:text-sm font-semibold truncate">Urgent</span>
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <AlertTriangle className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 text-red-100 text-sm">
              <span>Click to view overdue</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Link href="/staff">
          <Card 
            className="hover-elevate cursor-pointer border-0 bg-gradient-to-br from-teal-500 to-teal-600 text-white"
            data-testid="card-staff-members"
          >
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-semibold text-teal-50 mb-1 sm:mb-3">Staff</p>
                  <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-staff-count">
                    {activeStaff.length}
                  </p>
                  <div className="flex items-center gap-1 text-teal-50">
                    <span className="text-sm sm:text-xl font-bold">+{newStaffIn30Days}</span>
                    <span className="text-[10px] sm:text-sm font-semibold">new</span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                  <UserPlus className="w-4 h-4 sm:w-7 sm:h-7" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 mt-2 text-teal-100 text-sm">
                <span>Click to manage staff</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card 
          className={`hover-elevate cursor-pointer border-0 ${
            (dashboardData?.openIncidents || 0) > 0 
              ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
          }`}
          onClick={() => setActiveModal("incidents")}
          data-testid="card-incidents"
        >
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold opacity-90 mb-1 sm:mb-3">Incidents</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-open-incidents">
                  {dashboardData?.openIncidents || 0}
                </p>
                <div className="flex items-center gap-1 opacity-90">
                  <span className="text-[10px] sm:text-sm font-semibold truncate">
                    {(dashboardData?.openIncidents || 0) > 0 ? "Action needed" : "Resolved"}
                  </span>
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <Shield className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 opacity-80 text-sm">
              <span>Click to view incidents</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`hover-elevate cursor-pointer border-0 ${
            (dashboardData?.unassignedClients || 0) > 0 
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
          }`}
          onClick={() => setActiveModal("unassignedClients")}
          data-testid="card-unassigned-clients"
        >
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold opacity-90 mb-1 sm:mb-3">Unassigned</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-unassigned-clients">
                  {dashboardData?.unassignedClients || 0}
                </p>
                <div className="flex items-center gap-1 opacity-90">
                  <span className="text-[10px] sm:text-sm font-semibold truncate">
                    {(dashboardData?.unassignedClients || 0) > 0 ? "Need CM" : "All assigned"}
                  </span>
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <UserX className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 opacity-80 text-sm">
              <span>Click to view clients</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`hover-elevate cursor-pointer border-0 ${
            (budgetAlerts?.overspentCount || 0) > 0 
              ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
              : (budgetAlerts?.totalAlerts || 0) > 0 
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
          }`}
          onClick={() => setActiveModal("budgetAlerts")}
          data-testid="card-budget-alerts"
        >
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-base font-semibold opacity-90 mb-1 sm:mb-3">Budget Alerts</p>
                <p className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-3" data-testid="text-stat-budget-alerts">
                  {budgetAlerts?.totalAlerts || 0}
                </p>
                <div className="flex items-center gap-1 opacity-90">
                  {(budgetAlerts?.overspentCount || 0) > 0 ? (
                    <span className="text-[10px] sm:text-sm font-semibold truncate">
                      {budgetAlerts?.overspentCount} over, {budgetAlerts?.lowCount} low
                    </span>
                  ) : (budgetAlerts?.totalAlerts || 0) > 0 ? (
                    <span className="text-[10px] sm:text-sm font-semibold truncate">{budgetAlerts?.lowCount} at 80%+</span>
                  ) : (
                    <span className="text-[10px] sm:text-sm font-semibold">All healthy</span>
                  )}
                </div>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-white/20">
                <DollarSign className="w-4 h-4 sm:w-7 sm:h-7" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-2 opacity-80 text-sm">
              <span>Click to view details</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Client Distribution
            </CardTitle>
            <Badge variant="secondary">
              {totalClients} total
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover-elevate cursor-pointer transition-all"
              onClick={() => setLocation("/clients?category=NDIS")}
              data-testid="card-distribution-ndis"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50">
                    <Accessibility className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">NDIS Clients</span>
                    <span className="text-xs text-muted-foreground ml-2">({ndisPercentage}%)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-ndis-count">{ndisClients}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Progress value={ndisPercentage} className="h-1.5 bg-blue-100 dark:bg-blue-900/30" />
            </div>

            <div 
              className="p-3 rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 hover-elevate cursor-pointer transition-all"
              onClick={() => setLocation("/clients?category=Support at Home")}
              data-testid="card-distribution-support"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                    <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Support at Home</span>
                    <span className="text-xs text-muted-foreground ml-2">({supportPercentage}%)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-support-count">{supportClients}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Progress value={supportPercentage} className="h-1.5 bg-emerald-100 dark:bg-emerald-900/30" />
            </div>

            <div 
              className="p-3 rounded-lg border-l-4 border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20 hover-elevate cursor-pointer transition-all"
              onClick={() => setLocation("/clients?category=Private")}
              data-testid="card-distribution-private"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/50">
                    <Wallet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Private Clients</span>
                    <span className="text-xs text-muted-foreground ml-2">({privatePercentage}%)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-violet-600 dark:text-violet-400" data-testid="text-private-count">{privateClients}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Progress value={privatePercentage} className="h-1.5 bg-violet-100 dark:bg-violet-900/30" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer"
          onClick={() => setActiveModal("birthdays")}
          data-testid="card-birthdays"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              Birthday Reminders
            </CardTitle>
            <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
              {upcomingBirthdays.length} upcoming
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBirthdays.length > 0 ? (
              upcomingBirthdays.slice(0, 3).map((client) => (
                <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      client.daysUntilBirthday === 0 ? 'bg-pink-500 text-white' : 
                      client.daysUntilBirthday <= 7 ? 'bg-pink-100 dark:bg-pink-900/30' : 
                      'bg-muted'
                    }`}>
                      {client.daysUntilBirthday === 0 ? (
                        <Gift className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{client.daysUntilBirthday}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client.participantName}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.daysUntilBirthday === 0 
                          ? `Turning ${client.turningAge} today!` 
                          : `Turning ${client.turningAge} in ${client.daysUntilBirthday} days`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No birthdays in the next 30 days
              </div>
            )}
            {upcomingBirthdays.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-muted-foreground">
                  +{upcomingBirthdays.length - 3} more birthdays
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          className={`hover-elevate cursor-pointer ${
            (schedulingConflicts?.critical || 0) > 0 
              ? 'border-red-200 dark:border-red-900/50'
              : (schedulingConflicts?.warning || 0) > 0 
                ? 'border-amber-200 dark:border-amber-900/50'
                : ''
          }`}
          onClick={() => setActiveModal("schedulingConflicts")}
          data-testid="card-scheduling-conflicts"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarX className={`w-5 h-5 ${
                (schedulingConflicts?.critical || 0) > 0 ? 'text-red-500' :
                (schedulingConflicts?.warning || 0) > 0 ? 'text-amber-500' :
                'text-muted-foreground'
              }`} />
              Scheduling Alerts
            </CardTitle>
            {(schedulingConflicts?.total || 0) > 0 ? (
              <div className="flex items-center gap-2">
                {(schedulingConflicts?.critical || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {schedulingConflicts?.critical} critical
                  </Badge>
                )}
                {(schedulingConflicts?.warning || 0) > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {schedulingConflicts?.warning} warnings
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                All clear
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {schedulingConflicts?.conflicts && schedulingConflicts.conflicts.length > 0 ? (
              schedulingConflicts.conflicts.slice(0, 3).map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      conflict.severity === "critical" ? 'bg-red-100 dark:bg-red-900/30' :
                      conflict.severity === "warning" ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-muted'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${
                        conflict.severity === "critical" ? 'text-red-600 dark:text-red-400' :
                        conflict.severity === "warning" ? 'text-amber-600 dark:text-amber-400' :
                        'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {conflict.staffName || 'Staff'} - {conflict.clientName || 'Client'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {conflict.conflictType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No scheduling conflicts detected
              </div>
            )}
            {(schedulingConflicts?.total || 0) > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-muted-foreground">
                  +{(schedulingConflicts?.total || 0) - 3} more conflicts
                </span>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

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

      {/* Birthday Reminders Modal */}
      <Dialog open={activeModal === "birthdays"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              Upcoming Birthdays (Next 30 Days)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {upcomingBirthdays.length > 0 ? (
                upcomingBirthdays.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className={`hover-elevate cursor-pointer ${
                      client.daysUntilBirthday === 0 
                        ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20' 
                        : client.daysUntilBirthday <= 7 
                          ? 'border-pink-200 dark:border-pink-800' 
                          : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              client.daysUntilBirthday === 0 
                                ? 'bg-pink-500 text-white' 
                                : client.daysUntilBirthday <= 7 
                                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' 
                                  : 'bg-muted'
                            }`}>
                              {client.daysUntilBirthday === 0 ? (
                                <Gift className="w-6 h-6" />
                              ) : (
                                <span className="text-lg font-bold">{client.daysUntilBirthday}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{client.participantName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <CategoryBadge category={client.category} />
                                <span className="text-sm text-muted-foreground">
                                  {new Date(client.birthdayDate).toLocaleDateString('en-AU', { 
                                    weekday: 'short',
                                    day: 'numeric', 
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {client.daysUntilBirthday === 0 ? (
                              <Badge className="bg-pink-500 hover:bg-pink-600 text-white">
                                <Gift className="w-3 h-3 mr-1" />
                                Birthday Today!
                              </Badge>
                            ) : client.daysUntilBirthday <= 7 ? (
                              <Badge variant="outline" className="border-pink-300 text-pink-600 dark:border-pink-700 dark:text-pink-400">
                                <Cake className="w-3 h-3 mr-1" />
                                In {client.daysUntilBirthday} days
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                In {client.daysUntilBirthday} days
                              </Badge>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Turning {client.turningAge}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cake className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No birthdays in the next 30 days</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Budget Alerts Modal */}
      <Dialog open={activeModal === "budgetAlerts"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Budget Alerts
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {budgetAlerts?.alerts && budgetAlerts.alerts.length > 0 ? (
                budgetAlerts.alerts.map((alert) => (
                  <Link key={alert.id} href={`/clients/${alert.clientId}`} data-testid={`link-budget-alert-${alert.id}`}>
                    <Card className={`hover-elevate cursor-pointer ${
                      alert.alertType === "overspent" 
                        ? 'border-red-200 dark:border-red-800' 
                        : 'border-orange-200 dark:border-orange-800'
                    }`} data-testid={`card-budget-alert-${alert.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium" data-testid={`text-alert-client-${alert.id}`}>{alert.clientName}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-alert-category-${alert.id}`}>{alert.category}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={alert.alertType === "overspent" ? "destructive" : "secondary"} 
                              className={alert.alertType === "low" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : ""}>
                              {alert.alertType === "overspent" ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {alert.percentUsed}% - Over Budget
                                </>
                              ) : (
                                <>
                                  {alert.percentUsed}% - Low Budget
                                </>
                              )}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              ${alert.used.toLocaleString()} / ${alert.allocated.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>All budgets are healthy</p>
                  <p className="text-sm mt-1">No budgets at 80% or higher usage</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Scheduling Conflicts Modal */}
      <Dialog open={activeModal === "schedulingConflicts"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-amber-600" />
              Scheduling Conflicts
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {schedulingConflicts?.conflicts && schedulingConflicts.conflicts.length > 0 ? (
                schedulingConflicts.conflicts.map((conflict) => (
                  <Card key={conflict.id} className={`${
                    conflict.severity === "critical"
                      ? 'border-red-200 dark:border-red-800' 
                      : conflict.severity === "warning"
                        ? 'border-amber-200 dark:border-amber-800'
                        : ''
                  }`} data-testid={`card-conflict-${conflict.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{conflict.staffName || 'Staff'}</p>
                            <Badge variant={
                              conflict.severity === "critical" ? "destructive" :
                              conflict.severity === "warning" ? "secondary" :
                              "outline"
                            } className={
                              conflict.severity === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : ""
                            }>
                              {conflict.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Client: {conflict.clientName || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize mt-1">
                            {conflict.conflictType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {conflict.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="outline">
                            {conflict.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(conflict.detectedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No scheduling conflicts</p>
                  <p className="text-sm mt-1">All staff assignments are valid</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end mt-4">
            <Link href="/scheduling-conflicts">
              <Button variant="outline" data-testid="button-view-all-conflicts">
                View All Conflicts
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incidents to Action Modal */}
      <Dialog open={activeModal === "incidents"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Incidents Requiring Action
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {dashboardData?.openIncidentsList && dashboardData.openIncidentsList.length > 0 ? (
                dashboardData.openIncidentsList.map((incident) => (
                  <Link key={incident.id} href={`/clients/${incident.clientId}`} data-testid={`link-incident-${incident.id}`}>
                    <Card className={`hover-elevate cursor-pointer ${
                      incident.severity === "critical" || incident.severity === "major"
                        ? 'border-red-200 dark:border-red-800' 
                        : 'border-orange-200 dark:border-orange-800'
                    }`} data-testid={`card-incident-${incident.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium capitalize">{incident.incidentType.replace(/_/g, ' ')}</p>
                              <Badge variant={
                                incident.severity === "critical" ? "destructive" :
                                incident.severity === "major" ? "destructive" :
                                "secondary"
                              } className={
                                incident.severity === "minor" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" : ""
                              }>
                                {incident.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {incident.description}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <Badge variant={incident.status === "open" ? "outline" : "secondary"} 
                              className={incident.status === "investigating" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : ""}>
                              {incident.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(incident.incidentDate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>All incidents resolved</p>
                  <p className="text-sm mt-1">No open or investigating incidents</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Unassigned Clients Modal */}
      <Dialog open={activeModal === "unassignedClients"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-purple-600" />
              Clients Without Care Manager
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {dashboardData?.unassignedClientsList && dashboardData.unassignedClientsList.length > 0 ? (
                dashboardData.unassignedClientsList.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`} data-testid={`link-unassigned-${client.id}`}>
                    <Card className="hover-elevate cursor-pointer border-purple-200 dark:border-purple-800" 
                      data-testid={`card-unassigned-${client.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium" data-testid={`text-unassigned-name-${client.id}`}>{client.participantName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <CategoryBadge category={client.category as "NDIS" | "Support at Home" | "Private"} />
                              {client.phoneNumber && (
                                <span className="text-sm text-muted-foreground">{client.phoneNumber}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                              <UserX className="w-3 h-3 mr-1" />
                              No Care Manager
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Added {formatDate(client.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UsersRound className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>All clients have Care Managers</p>
                  <p className="text-sm mt-1">Every active client has a care manager assigned</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
