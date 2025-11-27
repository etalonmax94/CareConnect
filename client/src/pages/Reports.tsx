import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { FileText, Users, AlertTriangle, DollarSign, MapPin, FileX, Loader2, ChevronRight, User, Download, FileSpreadsheet, Calendar as CalendarIcon, TrendingUp, Receipt, Clock } from "lucide-react";
import { Link } from "wouter";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import type { Client } from "@shared/schema";
import { exportToExcel, exportMultipleSheetsToExcel, downloadPDF, formatCurrency } from "@/lib/exportUtils";
import { FinancialReportPDF } from "@/components/FinancialReportPDF";
import { useToast } from "@/hooks/use-toast";

interface AgeDemographics {
  [key: string]: number;
}

interface IncidentData {
  month: string;
  fall: number;
  medication: number;
  behavioral: number;
  injury: number;
  other: number;
  total: number;
}

interface BudgetReport {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  allocated: number;
  used: number;
  remaining: number;
  percentUsed: number;
}

interface MissingDocReport {
  clientId: string;
  clientName: string;
  category: string;
  totalRequired: number;
  totalMissing: number;
  missingDocuments: string[];
  completionRate: number;
}

interface DistanceReport {
  officeLocation: {
    address: string;
    lat: number;
    lon: number;
  };
  clients: Array<{
    clientId: string;
    clientName: string;
    address: string;
    distanceKm: number | null;
  }>;
}

interface FinancialSummary {
  summary: {
    totalBudgetAllocated: number;
    totalBudgetUsed: number;
    totalBudgetRemaining: number;
    budgetUtilization: number;
    totalServiceRevenue: number;
    totalServiceHours: number;
    totalServicesDelivered: number;
    invoiceSummary: {
      pending: { count: number; amount: number };
      paid: { count: number; amount: number };
      overdue: { count: number; amount: number };
    };
  };
  budgetByCategory: Array<{
    category: string;
    allocated: number;
    used: number;
    remaining: number;
    utilization: number;
  }>;
  servicesByClient: Array<{
    clientId: string;
    clientName: string;
    services: number;
    revenue: number;
    hours: number;
  }>;
  reportPeriod: {
    startDate: string | null;
    endDate: string | null;
    generatedAt: string;
  };
}

interface ServiceDeliveryReport {
  deliveries: Array<{
    id: string;
    date: string;
    clientId: string;
    clientName: string;
    clientCategory: string;
    staffId: string | null;
    staffName: string;
    serviceName: string;
    serviceCode: string | null;
    serviceCategory: string | null;
    amount: number;
    durationMinutes: number;
    rateType: string;
    status: string;
    notes: string | null;
  }>;
  totals: {
    totalServices: number;
    completedServices: number;
    cancelledServices: number;
    noShowServices: number;
    totalRevenue: number;
    totalHours: number;
  };
}

interface InvoiceReport {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    clientId: string;
    clientName: string;
    clientCategory: string;
    amount: number;
    status: string;
    description: string | null;
  }>;
  totals: {
    totalInvoices: number;
    totalAmount: number;
    pending: { count: number; amount: number };
    paid: { count: number; amount: number };
    overdue: { count: number; amount: number };
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AGE_RANGES: Record<string, [number, number]> = {
  '0-17': [0, 17],
  '18-34': [18, 34],
  '35-54': [35, 54],
  '55-74': [55, 74],
  '75+': [75, 150],
};

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function Reports() {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: ageDemographics, isLoading: ageLoading } = useQuery<AgeDemographics>({
    queryKey: ["/api/reports/age-demographics"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients/active"],
  });

  const { data: incidentData, isLoading: incidentLoading } = useQuery<IncidentData[]>({
    queryKey: ["/api/reports/incidents"],
  });

  const { data: budgetData, isLoading: budgetLoading } = useQuery<BudgetReport[]>({
    queryKey: ["/api/reports/budgets"],
  });

  const { data: missingDocsData, isLoading: missingDocsLoading } = useQuery<MissingDocReport[]>({
    queryKey: ["/api/reports/missing-documents"],
  });

  const { data: distanceData, isLoading: distanceLoading } = useQuery<DistanceReport>({
    queryKey: ["/api/reports/distance"],
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
    if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
    return params.toString();
  };

  const { data: financialSummary, isLoading: financialLoading, refetch: refetchFinancial } = useQuery<FinancialSummary>({
    queryKey: ["/api/reports/financial-summary", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/reports/financial-summary?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch financial summary");
      return res.json();
    },
  });

  const { data: serviceDeliveryReport, isLoading: servicesLoading } = useQuery<ServiceDeliveryReport>({
    queryKey: ["/api/reports/service-deliveries", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/reports/service-deliveries?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch service deliveries");
      return res.json();
    },
  });

  const { data: invoiceReport, isLoading: invoicesLoading } = useQuery<InvoiceReport>({
    queryKey: ["/api/reports/invoices", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/reports/invoices?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const handleExportPDF = async () => {
    if (!financialSummary) return;
    setIsExporting(true);
    try {
      await downloadPDF(
        <FinancialReportPDF data={financialSummary} reportType="summary" companyName="EmpowerLink" />,
        `EmpowerLink_Financial_Report_${format(new Date(), "yyyy-MM-dd")}`
      );
      toast({ title: "PDF Downloaded", description: "Financial report has been exported successfully." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to generate PDF report.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!financialSummary || !serviceDeliveryReport || !invoiceReport) return;
    setIsExporting(true);
    try {
      const sheets = [
        {
          name: "Summary",
          data: {
            headers: ["Metric", "Value"],
            rows: [
              ["Total Budget Allocated", formatCurrency(financialSummary.summary.totalBudgetAllocated)],
              ["Total Budget Used", formatCurrency(financialSummary.summary.totalBudgetUsed)],
              ["Budget Remaining", formatCurrency(financialSummary.summary.totalBudgetRemaining)],
              ["Budget Utilization", `${financialSummary.summary.budgetUtilization}%`],
              ["Service Revenue", formatCurrency(financialSummary.summary.totalServiceRevenue)],
              ["Service Hours", `${financialSummary.summary.totalServiceHours} hrs`],
              ["Services Delivered", financialSummary.summary.totalServicesDelivered],
              ["Pending Invoices", `${financialSummary.summary.invoiceSummary.pending.count} (${formatCurrency(financialSummary.summary.invoiceSummary.pending.amount)})`],
              ["Paid Invoices", `${financialSummary.summary.invoiceSummary.paid.count} (${formatCurrency(financialSummary.summary.invoiceSummary.paid.amount)})`],
              ["Overdue Invoices", `${financialSummary.summary.invoiceSummary.overdue.count} (${formatCurrency(financialSummary.summary.invoiceSummary.overdue.amount)})`],
            ],
          },
        },
        {
          name: "Budget by Category",
          data: {
            headers: ["Category", "Allocated", "Used", "Remaining", "Utilization %"],
            rows: financialSummary.budgetByCategory.map(b => [
              b.category,
              formatCurrency(b.allocated),
              formatCurrency(b.used),
              formatCurrency(b.remaining),
              `${b.utilization}%`,
            ]),
          },
        },
        {
          name: "Services by Client",
          data: {
            headers: ["Client", "Services", "Revenue", "Hours"],
            rows: financialSummary.servicesByClient.map(s => [
              s.clientName,
              s.services,
              formatCurrency(s.revenue),
              s.hours.toFixed(1),
            ]),
          },
        },
        {
          name: "Service Deliveries",
          data: {
            headers: ["Date", "Client", "Service", "Staff", "Amount", "Duration (min)", "Status"],
            rows: serviceDeliveryReport.deliveries.map(d => [
              format(new Date(d.date), "dd/MM/yyyy"),
              d.clientName,
              d.serviceName,
              d.staffName,
              formatCurrency(d.amount),
              d.durationMinutes,
              d.status,
            ]),
          },
        },
        {
          name: "Invoices",
          data: {
            headers: ["Invoice #", "Date", "Client", "Amount", "Status", "Description"],
            rows: invoiceReport.invoices.map(i => [
              i.invoiceNumber,
              format(new Date(i.date), "dd/MM/yyyy"),
              i.clientName,
              formatCurrency(i.amount),
              i.status,
              i.description || "",
            ]),
          },
        },
      ];

      await exportMultipleSheetsToExcel(sheets, `EmpowerLink_Financial_Report_${format(new Date(), "yyyy-MM-dd")}`);
      toast({ title: "Excel Downloaded", description: "Financial report has been exported successfully." });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to generate Excel report.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const ageChartData = ageDemographics ? Object.entries(ageDemographics).map(([range, count]) => ({
    range,
    count
  })) : [];

  const pieData = ageDemographics ? Object.entries(ageDemographics)
    .filter(([_, count]) => count > 0)
    .map(([range, count]) => ({
      name: range,
      value: count
    })) : [];

  const totalBudgetAllocated = budgetData?.reduce((sum, b) => sum + b.allocated, 0) || 0;
  const totalBudgetUsed = budgetData?.reduce((sum, b) => sum + b.used, 0) || 0;

  // Get clients filtered by age group
  const getClientsByAgeGroup = (ageGroup: string) => {
    const range = AGE_RANGES[ageGroup];
    if (!range) return [];
    return clients.filter(client => {
      const age = calculateAge(client.dateOfBirth);
      if (age === null) return false;
      return age >= range[0] && age <= range[1];
    }).map(client => ({
      ...client,
      age: calculateAge(client.dateOfBirth),
    }));
  };

  const selectedClients = selectedAgeGroup ? getClientsByAgeGroup(selectedAgeGroup) : [];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "NDIS":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Support at Home":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Private":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center justify-center sm:justify-start gap-2">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          Reports
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Comprehensive analytics and insights for your healthcare clients
        </p>
      </div>

      <Tabs defaultValue="age" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full justify-start flex-wrap overflow-x-auto h-auto gap-1 p-1">
          <TabsTrigger value="age" data-testid="tab-age-demo">
            <Users className="w-4 h-4 mr-2" />
            Age Demographics
          </TabsTrigger>
          <TabsTrigger value="incidents" data-testid="tab-incidents">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="budgets" data-testid="tab-budgets">
            <DollarSign className="w-4 h-4 mr-2" />
            Budgets
          </TabsTrigger>
          <TabsTrigger value="missing" data-testid="tab-missing-docs">
            <FileX className="w-4 h-4 mr-2" />
            Missing Documents
          </TabsTrigger>
          <TabsTrigger value="distance" data-testid="tab-distance">
            <MapPin className="w-4 h-4 mr-2" />
            Distance from Office
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">
            <TrendingUp className="w-4 h-4 mr-2" />
            Financial Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="age" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Client count by age group</CardDescription>
              </CardHeader>
              <CardContent>
                {ageLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ageChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Age Distribution (Pie)</CardTitle>
                <CardDescription>Percentage breakdown by age group</CardDescription>
              </CardHeader>
              <CardContent>
                {ageLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Age Group Details</CardTitle>
              <CardDescription>Click on an age group to view clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ageChartData.map((item, index) => (
                  <div
                    key={item.range}
                    className="text-center p-4 bg-muted/50 rounded-lg cursor-pointer hover-elevate transition-all"
                    onClick={() => setSelectedAgeGroup(item.range)}
                    data-testid={`card-age-group-${item.range}`}
                  >
                    <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {item.count}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.range} years</p>
                    <ChevronRight className="w-4 h-4 mx-auto mt-2 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Trends</CardTitle>
              <CardDescription>Monthly breakdown of incident types</CardDescription>
            </CardHeader>
            <CardContent>
              {incidentLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : incidentData && incidentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={incidentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fall" stroke="#ef4444" strokeWidth={2} name="Falls" />
                    <Line type="monotone" dataKey="medication" stroke="#f59e0b" strokeWidth={2} name="Medication" />
                    <Line type="monotone" dataKey="behavioral" stroke="#8b5cf6" strokeWidth={2} name="Behavioral" />
                    <Line type="monotone" dataKey="injury" stroke="#ec4899" strokeWidth={2} name="Injury" />
                    <Line type="monotone" dataKey="other" stroke="#6b7280" strokeWidth={2} name="Other" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No incident data available</p>
                  <p className="text-sm">Incidents will appear here when reported</p>
                </div>
              )}
            </CardContent>
          </Card>

          {incidentData && incidentData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {incidentData.reduce((sum, d) => sum + d.fall, 0)}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">Falls</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {incidentData.reduce((sum, d) => sum + d.medication, 0)}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">Medication</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {incidentData.reduce((sum, d) => sum + d.behavioral, 0)}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Behavioral</p>
                </CardContent>
              </Card>
              <Card className="bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-pink-600">
                    {incidentData.reduce((sum, d) => sum + d.injury, 0)}
                  </p>
                  <p className="text-sm text-pink-700 dark:text-pink-400">Injury</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {incidentData.reduce((sum, d) => sum + d.other, 0)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-400">Other</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Total Allocated</p>
                <p className="text-3xl font-bold text-primary">${totalBudgetAllocated.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Total Used</p>
                <p className="text-3xl font-bold">${totalBudgetUsed.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-3xl font-bold text-green-600">
                  ${(totalBudgetAllocated - totalBudgetUsed).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Budget by Client</CardTitle>
              <CardDescription>Allocated vs used budget per client</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : budgetData && budgetData.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {budgetData.map((budget) => (
                      <Link key={budget.id} href={`/clients/${budget.clientId}`}>
                        <div className="p-4 border rounded-lg hover-elevate cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{budget.clientName}</p>
                              <p className="text-sm text-muted-foreground">{budget.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${budget.used.toLocaleString()} / ${budget.allocated.toLocaleString()}</p>
                              <Badge variant={budget.percentUsed > 80 ? "destructive" : budget.percentUsed > 60 ? "secondary" : "default"}>
                                {budget.percentUsed}% used
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${budget.percentUsed > 80 ? 'bg-red-500' : budget.percentUsed > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No budget data available</p>
                  <p className="text-sm">Budgets will appear here when allocated to clients</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Missing Documents Report</CardTitle>
              <CardDescription>Clients with incomplete documentation</CardDescription>
            </CardHeader>
            <CardContent>
              {missingDocsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : missingDocsData && missingDocsData.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {missingDocsData.map((client) => (
                      <Link key={client.clientId} href={`/clients/${client.clientId}`}>
                        <Card className="hover-elevate cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium">{client.clientName}</p>
                                <Badge variant="outline">{client.category}</Badge>
                              </div>
                              <div className="text-right">
                                <Badge variant={client.completionRate < 50 ? "destructive" : client.completionRate < 75 ? "secondary" : "default"}>
                                  {client.completionRate}% Complete
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {client.totalMissing} of {client.totalRequired} missing
                                </p>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                              <div 
                                className={`h-full rounded-full ${client.completionRate < 50 ? 'bg-red-500' : client.completionRate < 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${client.completionRate}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {client.missingDocuments.map((doc, i) => (
                                <Badge key={i} variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                  <FileX className="w-3 h-3 mr-1" />
                                  {doc}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>All clients have complete documentation</p>
                  <p className="text-sm">Great job maintaining compliance!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distance from Office</CardTitle>
              <CardDescription>
                {distanceData?.officeLocation?.address || "9/73-75 King Street, Caboolture QLD 4510"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distanceLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : distanceData?.clients && distanceData.clients.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {distanceData.clients.map((client, index) => (
                      <Link key={client.clientId} href={`/clients/${client.clientId}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{client.clientName}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {client.address}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {client.distanceKm !== null ? (
                              <Badge variant={client.distanceKm > 30 ? "destructive" : client.distanceKm > 15 ? "secondary" : "default"}>
                                <MapPin className="w-3 h-3 mr-1" />
                                {client.distanceKm} km
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No client addresses available</p>
                  <p className="text-sm">Add addresses to clients to see distance calculations</p>
                </div>
              )}
            </CardContent>
          </Card>

          {distanceData?.officeLocation && (
            <Card>
              <CardHeader>
                <CardTitle>Office Location Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded-lg overflow-hidden">
                  <iframe
                    title="Office Location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(distanceData.officeLocation.address)}`}
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Financial Reports</h2>
              <p className="text-sm text-muted-foreground">
                Comprehensive financial overview with export capabilities
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-date-range">
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    defaultMonth={dateRange?.from}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleExportPDF}
                disabled={isExporting || financialLoading || !financialSummary}
                data-testid="button-export-pdf"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleExportExcel}
                disabled={isExporting || financialLoading || !financialSummary}
                data-testid="button-export-excel"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Export Excel
              </Button>
            </div>
          </div>

          {financialLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : financialSummary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <DollarSign className="h-4 w-4" />
                      Budget Allocated
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-budget-allocated">
                      {formatCurrency(financialSummary.summary.totalBudgetAllocated)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Budget Used
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-budget-used">
                      {formatCurrency(financialSummary.summary.totalBudgetUsed)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {financialSummary.summary.budgetUtilization}% utilization
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Receipt className="h-4 w-4" />
                      Service Revenue
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-service-revenue">
                      {formatCurrency(financialSummary.summary.totalServiceRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Service Hours
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-service-hours">
                      {financialSummary.summary.totalServiceHours} hrs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {financialSummary.summary.totalServicesDelivered} services
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">Pending Invoices</p>
                    <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-invoices">
                      {financialSummary.summary.invoiceSummary.pending.count}
                    </p>
                    <p className="text-sm text-amber-600">
                      {formatCurrency(financialSummary.summary.invoiceSummary.pending.amount)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-green-700 dark:text-green-400 mb-1">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-paid-invoices">
                      {financialSummary.summary.invoiceSummary.paid.count}
                    </p>
                    <p className="text-sm text-green-600">
                      {formatCurrency(financialSummary.summary.invoiceSummary.paid.amount)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-red-700 dark:text-red-400 mb-1">Overdue Invoices</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-overdue-invoices">
                      {financialSummary.summary.invoiceSummary.overdue.count}
                    </p>
                    <p className="text-sm text-red-600">
                      {formatCurrency(financialSummary.summary.invoiceSummary.overdue.amount)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Budget by Category</CardTitle>
                    <CardDescription>Allocation and utilization by support category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialSummary.budgetByCategory.length > 0 ? (
                      <div className="space-y-4">
                        {financialSummary.budgetByCategory.map((category) => (
                          <div key={category.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{category.category}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(category.used)} / {formatCurrency(category.allocated)}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${category.utilization > 80 ? 'bg-red-500' : category.utilization > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(category.utilization, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{category.utilization}% used</span>
                              <span>{formatCurrency(category.remaining)} remaining</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No budget data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Clients by Revenue</CardTitle>
                    <CardDescription>Service revenue breakdown by client</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialSummary.servicesByClient.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {financialSummary.servicesByClient.slice(0, 10).map((client, index) => (
                            <Link key={client.clientId} href={`/clients/${client.clientId}`}>
                              <div className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{client.clientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {client.services} services | {client.hours.toFixed(1)} hrs
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(client.revenue)}</p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No service data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {serviceDeliveryReport && serviceDeliveryReport.deliveries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Service Deliveries</CardTitle>
                    <CardDescription>
                      {serviceDeliveryReport.totals.totalServices} services | {formatCurrency(serviceDeliveryReport.totals.totalRevenue)} revenue | {serviceDeliveryReport.totals.totalHours} hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {serviceDeliveryReport.deliveries.slice(0, 20).map((delivery) => (
                          <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-4">
                              <div className="text-muted-foreground min-w-[80px]">
                                {format(new Date(delivery.date), "dd MMM")}
                              </div>
                              <div>
                                <p className="font-medium">{delivery.clientName}</p>
                                <p className="text-xs text-muted-foreground">{delivery.serviceName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(delivery.amount)}</p>
                                <p className="text-xs text-muted-foreground">{delivery.durationMinutes} min</p>
                              </div>
                              <Badge variant={delivery.status === "completed" ? "default" : delivery.status === "cancelled" ? "destructive" : "secondary"}>
                                {delivery.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No financial data available</p>
              <p className="text-sm">Financial reports will appear here when data is recorded</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Age Group Details Modal */}
      <Dialog open={selectedAgeGroup !== null} onOpenChange={() => setSelectedAgeGroup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clients Aged {selectedAgeGroup} Years
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {selectedClients.length > 0 ? (
                selectedClients.map((client) => (
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
                                <Badge className={getCategoryColor(client.category)}>
                                  {client.category}
                                </Badge>
                                {client.age !== null && (
                                  <span className="text-sm text-muted-foreground">
                                    {client.age} years old
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No clients in this age group</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
