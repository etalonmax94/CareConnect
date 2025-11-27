import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LogIn, Code, Loader2, Users, Shield, FileText, BarChart3, Calendar, Heart, CheckCircle, ArrowRight, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://careconnect-124485508170.australia-southeast1.run.app';

const features = [
  {
    icon: Users,
    title: "Client Management",
    description: "Comprehensive profiles for NDIS, Aged Care & Private clients"
  },
  {
    icon: Shield,
    title: "Privacy Compliant",
    description: "Built for Australian healthcare privacy regulations"
  },
  {
    icon: FileText,
    title: "Document Tracking",
    description: "Never miss a compliance deadline with smart reminders"
  },
  {
    icon: BarChart3,
    title: "Insightful Reports",
    description: "Real-time analytics and budget tracking"
  },
  {
    icon: Calendar,
    title: "Service Scheduling",
    description: "Streamlined appointment and service management"
  },
  {
    icon: Heart,
    title: "Care Coordination",
    description: "Connect care teams for better client outcomes"
  }
];

function FloatingShape({ className, delay = 0, duration = 15 }: { className?: string; delay?: number; duration?: number }) {
  return (
    <div 
      className={`absolute rounded-full ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      }}
    />
  );
}

function FeatureCard({ feature, index, isActive }: { feature: typeof features[0]; index: number; isActive: boolean }) {
  const Icon = feature.icon;
  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-500 cursor-default ${
        isActive 
          ? 'bg-white/20 backdrop-blur-sm border border-white/30 scale-[1.02] shadow-lg' 
          : 'bg-white/5 border border-transparent hover:bg-white/10'
      }`}
    >
      <div className={`p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/30' : 'bg-white/10'}`}>
        <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-white' : 'text-white/80'}`} />
      </div>
      <div>
        <h3 className={`font-semibold transition-all duration-300 ${isActive ? 'text-white' : 'text-white/90'}`}>{feature.title}</h3>
        <p className={`text-sm transition-all duration-300 ${isActive ? 'text-white/80' : 'text-white/60'}`}>{feature.description}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const [devName, setDevName] = useState("Developer");
  const [devRole, setDevRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isHovering]);

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: devName, role: devRole }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Developer Login Successful",
          description: `Logged in as ${devName} (${devRole})`,
        });
        window.location.href = "/";
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.error || "Dev login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Feature Showcase with Animated Background (40%) */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingShape className="w-64 h-64 bg-white/10 -top-16 -left-16 animate-float" delay={0} duration={18} />
          <FloatingShape className="w-80 h-80 bg-white/5 top-1/4 -right-20 animate-float" delay={1} duration={22} />
          <FloatingShape className="w-48 h-48 bg-white/10 bottom-20 left-1/4 animate-float" delay={2} duration={16} />
          <FloatingShape className="w-32 h-32 bg-white/15 top-1/2 left-10 animate-float" delay={1.5} duration={20} />
          <FloatingShape className="w-72 h-72 bg-white/5 -bottom-32 -right-16 animate-float" delay={0.5} duration={24} />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 w-full">
          {/* Logo and Tagline */}
          <div className="animate-fadeIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">EmpowerLink</span>
            </div>
            <p className="text-white/80 text-base max-w-xs">
              Our own built and managed healthcare CRM
            </p>
          </div>

          {/* Feature Cards */}
          <div 
            className="space-y-2 my-6"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Everything you need</h2>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <FeatureCard 
                    feature={feature} 
                    index={index} 
                    isActive={activeFeature === index}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="text-white/90">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span className="text-white/90">5 Star Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form (60%) */}
      <div className="w-full lg:w-[60%] flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden p-6 bg-gradient-to-r from-primary to-primary/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">EmpowerLink</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            {/* Logo for Desktop */}
            <div className="hidden lg:block text-center mb-10">
              <img 
                src={logoImage} 
                alt="EmpowerLink" 
                className="h-14 w-auto mx-auto mb-6 drop-shadow-sm" 
                data-testid="img-logo" 
              />
            </div>

            {/* Welcome Text */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-3">Welcome back</h1>
              <p className="text-muted-foreground text-lg">
                Sign in to access your healthcare CRM dashboard
              </p>
            </div>

            {/* Login Card */}
            <Card className="border shadow-xl bg-card overflow-hidden">
              <CardContent className="p-8 space-y-6">
                {/* Zoho Login Button */}
                <a 
                  href={`${API_BASE_URL}/api/auth/zoho`}
                  className="group flex items-center justify-center gap-3 w-full h-14 px-6 rounded-xl bg-primary text-primary-foreground font-medium transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02] hover:shadow-xl shadow-lg shadow-primary/20"
                  data-testid="button-zoho-login"
                >
                  <LogIn className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  <span>Sign in with Zoho</span>
                  <ArrowRight className="h-4 w-4 ml-auto transition-transform group-hover:translate-x-1" />
                </a>

                {/* Features List */}
                <div className="flex items-center justify-center gap-8 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-default">
                    <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-default">
                    <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span>Fast</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-default">
                    <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/30 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <span>Reliable</span>
                  </div>
                </div>

                {/* Developer Access - Development Only */}
                {isDevelopment && (
                  <>
                    <div className="relative">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground font-medium">
                        Dev Mode
                      </span>
                    </div>

                    <div className="space-y-4 p-4 border border-dashed border-amber-500/50 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                        <Code className="h-4 w-4" />
                        Developer Access
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="dev-name" className="text-sm">Display Name</Label>
                          <Input
                            id="dev-name"
                            value={devName}
                            onChange={(e) => setDevName(e.target.value)}
                            placeholder="Enter name"
                            className="h-11"
                            data-testid="input-dev-name"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="dev-role" className="text-sm">Role</Label>
                          <Select value={devRole} onValueChange={setDevRole}>
                            <SelectTrigger id="dev-role" className="h-11" data-testid="select-dev-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="director">Director</SelectItem>
                              <SelectItem value="operations_manager">Operations Manager</SelectItem>
                              <SelectItem value="clinical_manager">Clinical Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="care_manager">Care Manager</SelectItem>
                              <SelectItem value="support_worker">Support Worker</SelectItem>
                              <SelectItem value="enrolled_nurse">Enrolled Nurse</SelectItem>
                              <SelectItem value="registered_nurse">Registered Nurse</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        onClick={handleDevLogin}
                        variant="outline"
                        className="w-full h-11 gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all hover:scale-[1.01]"
                        disabled={isLoading || !devName}
                        data-testid="button-dev-login"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Code className="h-4 w-4" />
                        )}
                        Login as Developer
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                By signing in, you agree to comply with Australian privacy laws
                and EmpowerLink's data protection policies.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
                <span className="text-border">|</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
                <span className="text-border">|</span>
                <span className="hover:text-foreground cursor-pointer transition-colors">Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="p-4 text-center border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            © 2024 EmpowerLink. Proudly Australian.
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-15px) rotate(3deg) scale(1.02);
          }
          50% {
            transform: translateY(-5px) rotate(-2deg) scale(0.98);
          }
          75% {
            transform: translateY(-20px) rotate(1deg) scale(1.01);
          }
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
