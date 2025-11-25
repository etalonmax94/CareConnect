import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { FileText, Users, AlertTriangle, DollarSign, MapPin, FileX, Loader2, ChevronRight } from "lucide-react";
import { Link } from "wouter";

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { data: ageDemographics, isLoading: ageLoading } = useQuery<AgeDemographics>({
    queryKey: ["/api/reports/age-demographics"],
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive analytics and insights for your healthcare clients
        </p>
      </div>

      <Tabs defaultValue="age" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ageChartData.map((item, index) => (
                  <div key={item.range} className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {item.count}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.range} years</p>
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
      </Tabs>
    </div>
  );
}
