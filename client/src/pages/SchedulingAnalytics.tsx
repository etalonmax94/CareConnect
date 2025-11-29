import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, Calendar, Clock, Users, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Award, ArrowUpRight, ArrowDownRight, Download, Filter,
  RefreshCw, Loader2, Target, Zap, Hand, ArrowLeftRight, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  period: string;
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  noShowShifts: number;
  totalHours: number;
  averageShiftDuration: number;
  openShiftFillRate: number;
  swapRequestsApproved: number;
  swapRequestsDenied: number;
  staffUtilization: number;
  clientCoverage: number;
  aiSuggestionsAccepted: number;
  aiSuggestionsDeclined: number;
  taskCompletionRate: number;
  onTimeStartRate: number;
  overtimeHours: number;
  topPerformingStaff: { id: string; name: string; score: number }[];
  shiftsByCategory: { category: string; count: number }[];
  shiftsByDayOfWeek: { day: string; count: number }[];
  trendComparison: {
    shiftsChange: number;
    hoursChange: number;
    utilizationChange: number;
    completionChange: number;
  };
}

interface StaffLeaderboard {
  id: string;
  name: string;
  shiftsCompleted: number;
  onTimeRate: number;
  taskCompletionRate: number;
  badges: { type: string; count: number }[];
  score: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedCount: number;
}

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export default function SchedulingAnalytics() {
  const [period, setPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (period) {
      case "7d":
        start = subDays(now, 7);
        break;
      case "14d":
        start = subDays(now, 14);
        break;
      case "30d":
        start = subDays(now, 30);
        break;
      case "90d":
        start = subDays(now, 90);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        start = subDays(now, 30);
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [period]);

  // Queries
  const { data: analytics, isLoading: analyticsLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/ascs/analytics", dateRange],
    queryFn: async () => {
      const res = await fetch(
        `/api/ascs/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const { data: badges = [] } = useQuery<Badge[]>({
    queryKey: ["/api/ascs/badges"],
  });

  // Mock data for demonstration when API returns empty
  const displayData: AnalyticsData = analytics || {
    period: period,
    totalShifts: 0,
    completedShifts: 0,
    cancelledShifts: 0,
    noShowShifts: 0,
    totalHours: 0,
    averageShiftDuration: 0,
    openShiftFillRate: 0,
    swapRequestsApproved: 0,
    swapRequestsDenied: 0,
    staffUtilization: 0,
    clientCoverage: 0,
    aiSuggestionsAccepted: 0,
    aiSuggestionsDeclined: 0,
    taskCompletionRate: 0,
    onTimeStartRate: 0,
    overtimeHours: 0,
    topPerformingStaff: [],
    shiftsByCategory: [],
    shiftsByDayOfWeek: [],
    trendComparison: {
      shiftsChange: 0,
      hoursChange: 0,
      utilizationChange: 0,
      completionChange: 0,
    },
  };

  const formatPercent = (value: number) => `${Math.round(value)}%`;
  const formatHours = (value: number) => `${value.toFixed(1)}h`;
  const formatChange = (value: number) => {
    const prefix = value >= 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  };

  const completionRate = displayData.totalShifts > 0
    ? (displayData.completedShifts / displayData.totalShifts) * 100
    : 0;

  const cancellationRate = displayData.totalShifts > 0
    ? (displayData.cancelledShifts / displayData.totalShifts) * 100
    : 0;

  const noShowRate = displayData.totalShifts > 0
    ? (displayData.noShowShifts / displayData.totalShifts) * 100
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
            Scheduling Analytics
          </h1>
          <p className="text-muted-foreground">
            Performance insights and workforce metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Shifts</p>
                    <p className="text-2xl font-bold">{displayData.totalShifts}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-sm",
                    displayData.trendComparison.shiftsChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {displayData.trendComparison.shiftsChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {formatChange(displayData.trendComparison.shiftsChange)}
                  </div>
                </div>
                <Progress value={completionRate} className="mt-2 h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {displayData.completedShifts} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{formatHours(displayData.totalHours)}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-sm",
                    displayData.trendComparison.hoursChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {displayData.trendComparison.hoursChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {formatChange(displayData.trendComparison.hoursChange)}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Avg: {formatHours(displayData.averageShiftDuration)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Staff Utilization</p>
                    <p className="text-2xl font-bold">{formatPercent(displayData.staffUtilization)}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-sm",
                    displayData.trendComparison.utilizationChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {displayData.trendComparison.utilizationChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {formatChange(displayData.trendComparison.utilizationChange)}
                  </div>
                </div>
                <Progress value={displayData.staffUtilization} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Start</p>
                    <p className="text-2xl font-bold">{formatPercent(displayData.onTimeStartRate)}</p>
                  </div>
                  <CheckCircle2 className={cn(
                    "w-8 h-8",
                    displayData.onTimeStartRate >= 90 ? "text-green-500" :
                    displayData.onTimeStartRate >= 75 ? "text-yellow-500" : "text-red-500"
                  )} />
                </div>
                <Progress value={displayData.onTimeStartRate} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="shifts">Shifts</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="gamification">Gamification</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Shift Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Shift Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Completed</span>
                        </div>
                        <span className="font-medium">{displayData.completedShifts} ({formatPercent(completionRate)})</span>
                      </div>
                      <Progress value={completionRate} className="h-2 bg-muted" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>Cancelled</span>
                        </div>
                        <span className="font-medium">{displayData.cancelledShifts} ({formatPercent(cancellationRate)})</span>
                      </div>
                      <Progress value={cancellationRate} className="h-2 bg-muted" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span>No Show</span>
                        </div>
                        <span className="font-medium">{displayData.noShowShifts} ({formatPercent(noShowRate)})</span>
                      </div>
                      <Progress value={noShowRate} className="h-2 bg-muted" />
                    </div>
                  </CardContent>
                </Card>

                {/* Open Shifts & Swaps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hand className="w-5 h-5" />
                      Open Shifts & Swaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-teal-50 dark:bg-teal-950 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Open Shift Fill Rate</span>
                        <span className="text-2xl font-bold text-teal-600">
                          {formatPercent(displayData.openShiftFillRate)}
                        </span>
                      </div>
                      <Progress value={displayData.openShiftFillRate} className="h-2" />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <ArrowLeftRight className="w-6 h-6 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold">{displayData.swapRequestsApproved}</p>
                        <p className="text-xs text-muted-foreground">Swaps Approved</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <ArrowLeftRight className="w-6 h-6 mx-auto mb-1 text-red-500" />
                        <p className="text-2xl font-bold">{displayData.swapRequestsDenied}</p>
                        <p className="text-xs text-muted-foreground">Swaps Denied</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Suggestions Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{displayData.aiSuggestionsAccepted}</p>
                        <p className="text-sm text-muted-foreground">Accepted</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold">{displayData.aiSuggestionsDeclined}</p>
                        <p className="text-sm text-muted-foreground">Declined</p>
                      </div>
                    </div>

                    {displayData.aiSuggestionsAccepted + displayData.aiSuggestionsDeclined > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Acceptance Rate</span>
                          <span className="font-medium">
                            {formatPercent(
                              (displayData.aiSuggestionsAccepted /
                                (displayData.aiSuggestionsAccepted + displayData.aiSuggestionsDeclined)) * 100
                            )}
                          </span>
                        </div>
                        <Progress
                          value={(displayData.aiSuggestionsAccepted /
                            (displayData.aiSuggestionsAccepted + displayData.aiSuggestionsDeclined)) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Task Completion */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Task Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-muted"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${displayData.taskCompletionRate * 2.51} 251`}
                            className={cn(
                              displayData.taskCompletionRate >= 90 ? "text-green-500" :
                              displayData.taskCompletionRate >= 75 ? "text-yellow-500" : "text-red-500"
                            )}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">{formatPercent(displayData.taskCompletionRate)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-muted-foreground">
                      Task completion rate across all shifts
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Shifts Tab */}
            <TabsContent value="shifts" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Shifts by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shifts by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {displayData.shiftsByCategory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No data available</p>
                    ) : (
                      <div className="space-y-3">
                        {displayData.shiftsByCategory.map((item) => (
                          <div key={item.category}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{item.category}</span>
                              <span className="font-medium">{item.count}</span>
                            </div>
                            <Progress
                              value={(item.count / displayData.totalShifts) * 100}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shifts by Day */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shifts by Day of Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {displayData.shiftsByDayOfWeek.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No data available</p>
                    ) : (
                      <div className="flex items-end justify-between gap-2 h-40">
                        {displayData.shiftsByDayOfWeek.map((item) => {
                          const maxCount = Math.max(...displayData.shiftsByDayOfWeek.map(d => d.count));
                          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={item.day} className="flex flex-col items-center flex-1">
                              <div className="w-full flex flex-col items-center">
                                <span className="text-xs mb-1">{item.count}</span>
                                <div
                                  className="w-full max-w-[30px] bg-primary rounded-t transition-all"
                                  style={{ height: `${height}%`, minHeight: item.count > 0 ? "8px" : "0" }}
                                />
                              </div>
                              <span className="text-xs mt-2 text-muted-foreground">
                                {item.day.slice(0, 3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{formatHours(displayData.overtimeHours)}</p>
                    <p className="text-sm text-muted-foreground">Overtime Hours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{formatPercent(displayData.clientCoverage)}</p>
                    <p className="text-sm text-muted-foreground">Client Coverage</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{formatHours(displayData.averageShiftDuration)}</p>
                    <p className="text-sm text-muted-foreground">Avg Shift Duration</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold">{formatPercent(displayData.onTimeStartRate)}</p>
                    <p className="text-sm text-muted-foreground">On-Time Rate</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Top Performing Staff
                  </CardTitle>
                  <CardDescription>Based on shift completion, on-time rate, and task completion</CardDescription>
                </CardHeader>
                <CardContent>
                  {displayData.topPerformingStaff.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  ) : (
                    <div className="space-y-3">
                      {displayData.topPerformingStaff.map((staff, index) => (
                        <div
                          key={staff.id}
                          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                            index === 0 ? "bg-yellow-500" :
                            index === 1 ? "bg-gray-400" :
                            index === 2 ? "bg-amber-700" : "bg-muted-foreground"
                          )}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">Score: {staff.score}</p>
                          </div>
                          <Badge variant="outline">{staff.score} pts</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gamification Tab */}
            <TabsContent value="gamification" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Available Badges
                  </CardTitle>
                  <CardDescription>Badges earned by staff for achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {badges.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No badges configured yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="flex flex-col items-center p-4 bg-muted/50 rounded-lg"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                            badge.color || "bg-yellow-100"
                          )}>
                            <Award className="w-6 h-6 text-yellow-600" />
                          </div>
                          <p className="font-medium text-center">{badge.name}</p>
                          <p className="text-xs text-muted-foreground text-center">{badge.description}</p>
                          <Badge variant="secondary" className="mt-2">
                            {badge.earnedCount} earned
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
