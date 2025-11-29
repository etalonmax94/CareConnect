import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  GraduationCap,
  BookOpen,
  Trophy,
  Star,
  Flame,
  Target,
  Award,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  BarChart3,
  Users,
  TrendingUp,
  Medal,
  Zap,
  Sparkles,
  Crown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Settings,
  Bell,
  ExternalLink
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface LmsCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  status: "draft" | "published" | "archived";
  difficultyLevel: string | null;
  estimatedDurationMinutes: number | null;
  pointsValue: number | null;
  isComplianceRequired: string | null;
  renewalPeriodMonths: number | null;
  averageRating: string | null;
  totalEnrollments: number | null;
  completionRate: string | null;
  createdAt: string;
}

interface LmsEnrollment {
  id: string;
  courseId: string;
  staffId: string;
  status: "not_started" | "in_progress" | "completed" | "expired" | "failed";
  progressPercentage: number | null;
  enrolledAt: string;
  completedAt: string | null;
}

interface LmsStaffStats {
  staffId: string;
  totalPoints: number | null;
  currentLevel: number | null;
  currentLevelName: string | null;
  pointsToNextLevel: number | null;
  coursesCompleted: number | null;
  quizzesPassed: number | null;
  currentStreak: number | null;
  longestStreak: number | null;
  badges?: LmsBadge[];
}

interface LmsBadge {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  badgeType: string;
  pointsRequired: number | null;
}

interface LeaderboardEntry {
  rank: number;
  staffId: string;
  staffName: string;
  staffPhoto: string | null;
  totalPoints: number;
  currentLevel: number;
  currentLevelName: string;
  coursesCompleted: number;
  currentStreak: number;
}

interface DashboardStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  activeStaff: number;
  overdueCompliance: number;
  averageCompletionRate: number;
}

export default function LearningManagement() {
  const [activeTab, setActiveTab] = useState("my-learning");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's stats and enrollments
  const { data: myStats } = useQuery<LmsStaffStats>({
    queryKey: ["/api/lms/my-stats"],
  });

  const { data: myEnrollments } = useQuery<LmsEnrollment[]>({
    queryKey: ["/api/lms/enrollments"],
  });

  const { data: courses } = useQuery<LmsCourse[]>({
    queryKey: ["/api/lms/courses"],
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/lms/leaderboard"],
  });

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/lms/dashboard-stats"],
  });

  const { data: myBadges } = useQuery({
    queryKey: ["/api/lms/my-badges"],
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (data: Partial<LmsCourse>) => {
      return apiRequest("/api/lms/courses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      setShowCreateCourse(false);
      toast({ title: "Course created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create course", variant: "destructive" });
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("/api/lms/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId, staffId: myStats?.staffId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments"] });
      toast({ title: "Successfully enrolled in course" });
    },
    onError: () => {
      toast({ title: "Failed to enroll", variant: "destructive" });
    },
  });

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || course.category === categoryFilter;
    return matchesSearch && matchesCategory && course.status === "published";
  });

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-amber-500";
  };

  const getLevelBadgeColor = (level: number) => {
    if (level >= 9) return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black";
    if (level >= 7) return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    if (level >= 5) return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
    if (level >= 3) return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
    return "bg-gray-500 text-white";
  };

  const categories = [...new Set(courses?.map(c => c.category).filter(Boolean))] as string[];

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Title */}
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Learning Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track your training progress and earn certifications</p>
      </div>

      {/* Header with Gamification Stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* User Stats Card */}
        <Card className="flex-1 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-purple-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-purple-400/50">
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {myStats?.currentLevel || 1}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-xs font-bold ${getLevelBadgeColor(myStats?.currentLevel || 1)}`}>
                  <Crown className="h-3 w-3 inline mr-1" />
                  {myStats?.currentLevelName || "Beginner"}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{myStats?.totalPoints?.toLocaleString() || 0}</span>
                  <span className="text-muted-foreground">points</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress to next level</span>
                    <span>{myStats?.pointsToNextLevel || 100} pts to go</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </div>
              <div className="hidden md:flex gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    {myStats?.coursesCompleted || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-2xl font-bold text-orange-500">
                    <Flame className="h-5 w-5" />
                    {myStats?.currentStreak || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-2xl font-bold text-purple-600">
                    <Award className="h-5 w-5" />
                    {(myBadges as any[])?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats for Admin */}
        {dashboardStats && (
          <Card className="w-full lg:w-80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Admin Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{dashboardStats.publishedCourses}</div>
                  <div className="text-xs text-muted-foreground">Courses</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-600">{dashboardStats.activeStaff}</div>
                  <div className="text-xs text-muted-foreground">Active Learners</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-purple-600">{dashboardStats.completedEnrollments}</div>
                  <div className="text-xs text-muted-foreground">Completions</div>
                </div>
                <div className={`rounded-lg p-2 text-center ${dashboardStats.overdueCompliance > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className={`text-lg font-bold ${dashboardStats.overdueCompliance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {dashboardStats.overdueCompliance}
                  </div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="my-learning" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">My Learning</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Catalog</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </TabsTrigger>
        </TabsList>

        {/* My Learning Tab */}
        <TabsContent value="my-learning" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Continue Learning</h2>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>

          {myEnrollments?.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Start Your Learning Journey</h3>
                <p className="text-muted-foreground mb-4">
                  Browse our course catalog to find training that matches your development goals.
                </p>
                <Button onClick={() => setActiveTab("catalog")}>
                  Explore Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myEnrollments?.map((enrollment) => {
                const course = courses?.find(c => c.id === enrollment.courseId);
                if (!course) return null;
                return (
                  <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/50" />
                        </div>
                      )}
                      <Badge
                        className="absolute top-2 right-2"
                        variant={enrollment.status === "completed" ? "default" : "secondary"}
                      >
                        {enrollment.status === "completed" ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                        ) : enrollment.status === "in_progress" ? (
                          <><Play className="h-3 w-3 mr-1" /> In Progress</>
                        ) : (
                          "Not Started"
                        )}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1 line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{enrollment.progressPercentage || 0}%</span>
                        </div>
                        <Progress
                          value={enrollment.progressPercentage || 0}
                          className={`h-2 ${getProgressColor(enrollment.progressPercentage || 0)}`}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button className="w-full" variant={enrollment.status === "completed" ? "outline" : "default"}>
                        {enrollment.status === "completed" ? "Review Course" : "Continue Learning"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Course Catalog Tab */}
        <TabsContent value="catalog" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses?.map((course) => {
              const isEnrolled = myEnrollments?.some(e => e.courseId === course.id);
              return (
                <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-white/30" />
                      </div>
                    )}
                    {course.isComplianceRequired === "yes" && (
                      <Badge className="absolute top-2 left-2 bg-red-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {course.category && (
                        <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                      )}
                      {course.difficultyLevel && (
                        <Badge variant="outline" className="text-xs bg-white/80">{course.difficultyLevel}</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10">{course.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {course.estimatedDurationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.estimatedDurationMinutes}m
                        </span>
                      )}
                      {course.pointsValue && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Zap className="h-3 w-3" />
                          {course.pointsValue} pts
                        </span>
                      )}
                      {course.averageRating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          {parseFloat(course.averageRating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    {isEnrolled ? (
                      <Button className="w-full" variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => enrollMutation.mutate(course.id)}
                        disabled={enrollMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Enroll Now
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top 3 Podium */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>This month's learning champions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-end gap-4 mb-8 pt-8">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <Avatar className="h-16 w-16 mx-auto border-4 border-gray-300 mb-2">
                      <AvatarImage src={leaderboard?.[1]?.staffPhoto || undefined} />
                      <AvatarFallback className="bg-gray-200">
                        {leaderboard?.[1]?.staffName?.charAt(0) || "2"}
                      </AvatarFallback>
                    </Avatar>
                    <Medal className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <div className="font-medium text-sm">{leaderboard?.[1]?.staffName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{leaderboard?.[1]?.totalPoints?.toLocaleString() || 0} pts</div>
                    <div className="h-16 w-20 bg-gray-200 rounded-t-lg mt-2 flex items-center justify-center text-2xl font-bold text-gray-500">
                      2
                    </div>
                  </div>
                  {/* 1st Place */}
                  <div className="text-center -mt-8">
                    <div className="relative">
                      <Crown className="h-8 w-8 text-yellow-400 mx-auto mb-1 animate-pulse" />
                      <Avatar className="h-20 w-20 mx-auto border-4 border-yellow-400 mb-2">
                        <AvatarImage src={leaderboard?.[0]?.staffPhoto || undefined} />
                        <AvatarFallback className="bg-yellow-100">
                          {leaderboard?.[0]?.staffName?.charAt(0) || "1"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <Medal className="h-8 w-8 text-yellow-400 mx-auto mb-1" />
                    <div className="font-semibold">{leaderboard?.[0]?.staffName || "—"}</div>
                    <div className="text-sm text-yellow-600 font-medium">{leaderboard?.[0]?.totalPoints?.toLocaleString() || 0} pts</div>
                    <div className="h-24 w-24 bg-yellow-100 rounded-t-lg mt-2 flex items-center justify-center text-3xl font-bold text-yellow-500">
                      1
                    </div>
                  </div>
                  {/* 3rd Place */}
                  <div className="text-center">
                    <Avatar className="h-14 w-14 mx-auto border-4 border-amber-600 mb-2">
                      <AvatarImage src={leaderboard?.[2]?.staffPhoto || undefined} />
                      <AvatarFallback className="bg-amber-100">
                        {leaderboard?.[2]?.staffName?.charAt(0) || "3"}
                      </AvatarFallback>
                    </Avatar>
                    <Medal className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                    <div className="font-medium text-sm">{leaderboard?.[2]?.staffName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{leaderboard?.[2]?.totalPoints?.toLocaleString() || 0} pts</div>
                    <div className="h-12 w-18 bg-amber-100 rounded-t-lg mt-2 flex items-center justify-center text-xl font-bold text-amber-600">
                      3
                    </div>
                  </div>
                </div>

                {/* Full Leaderboard */}
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {leaderboard?.slice(3).map((entry) => (
                      <div key={entry.staffId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="w-8 text-center font-bold text-muted-foreground">
                          {entry.rank}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.staffPhoto || undefined} />
                          <AvatarFallback>{entry.staffName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{entry.staffName}</div>
                          <div className="text-xs text-muted-foreground">{entry.currentLevelName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{entry.totalPoints.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Streak Champions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Streak Champions
                </CardTitle>
                <CardDescription>Consistent learners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard?.sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0)).slice(0, 5).map((entry, index) => (
                    <div key={entry.staffId} className="flex items-center gap-3">
                      <div className="w-6 text-center font-bold text-muted-foreground">{index + 1}</div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{entry.staffName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-sm font-medium truncate">{entry.staffName}</div>
                      <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Flame className="h-4 w-4" />
                        {entry.currentStreak}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(myBadges as any[])?.map((staffBadge: any) => (
              <Card key={staffBadge.id} className="text-center p-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <Award className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-semibold">{staffBadge.badge?.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{staffBadge.badge?.description}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  Earned {formatDistanceToNow(new Date(staffBadge.earnedAt))} ago
                </div>
              </Card>
            ))}
            {(!myBadges || (myBadges as any[])?.length === 0) && (
              <Card className="col-span-full text-center py-12">
                <CardContent>
                  <Award className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Badges Yet</h3>
                  <p className="text-muted-foreground">
                    Complete courses and achieve milestones to earn badges!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Course Management</h2>
            <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>Add a new training course to the catalog</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createCourseMutation.mutate({
                    title: formData.get("title") as string,
                    description: formData.get("description") as string,
                    category: formData.get("category") as string,
                    difficultyLevel: formData.get("difficultyLevel") as string,
                    estimatedDurationMinutes: parseInt(formData.get("duration") as string) || 30,
                    pointsValue: parseInt(formData.get("points") as string) || 100,
                    isComplianceRequired: formData.get("isCompliance") ? "yes" : "no",
                    status: "draft"
                  });
                }}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Course Title</Label>
                      <Input id="title" name="title" required placeholder="e.g., Manual Handling Fundamentals" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Describe what learners will achieve..." rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select name="category">
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Compliance">Compliance</SelectItem>
                            <SelectItem value="Safety">Safety</SelectItem>
                            <SelectItem value="Clinical Skills">Clinical Skills</SelectItem>
                            <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                            <SelectItem value="Leadership">Leadership</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="difficultyLevel">Difficulty</Label>
                        <Select name="difficultyLevel">
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input id="duration" name="duration" type="number" defaultValue={30} min={5} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="points">Points Value</Label>
                        <Input id="points" name="points" type="number" defaultValue={100} min={10} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateCourse(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCourseMutation.isPending}>
                      Create Course
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Admin Course List */}
          <div className="space-y-4">
            {courses?.map((course) => (
              <Card key={course.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-white/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{course.title}</h3>
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status}
                      </Badge>
                      {course.isComplianceRequired === "yes" && (
                        <Badge variant="destructive">Compliance</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course.totalEnrollments || 0} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {course.completionRate || 0}% completion
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.estimatedDurationMinutes || 0}m
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-1" />
                      Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
