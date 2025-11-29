import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Wand2,
  FileText,
  Expand,
  Minimize2,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Loader2,
  Lightbulb,
  BookOpen,
  PenTool,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WritingContext =
  | "progress_note"
  | "incident_report"
  | "daily_summary"
  | "care_plan"
  | "policy"
  | "procedure"
  | "email_template"
  | "sms_template"
  | "family_update"
  | "staff_announcement"
  | "general";

type WritingAction =
  | "improve"
  | "expand"
  | "summarize"
  | "make_professional"
  | "simplify"
  | "generate"
  | "check_compliance"
  | "suggest_structure";

interface AIWritingAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  initialContext?: WritingContext;
  onApply?: (text: string) => void;
}

const CONTEXT_OPTIONS: { value: WritingContext; label: string; icon: React.ReactNode }[] = [
  { value: "progress_note", label: "Progress Note", icon: <FileText className="w-4 h-4" /> },
  { value: "incident_report", label: "Incident Report", icon: <AlertCircle className="w-4 h-4" /> },
  { value: "daily_summary", label: "Daily Summary", icon: <BookOpen className="w-4 h-4" /> },
  { value: "care_plan", label: "Care Plan", icon: <Shield className="w-4 h-4" /> },
  { value: "policy", label: "Policy", icon: <FileText className="w-4 h-4" /> },
  { value: "procedure", label: "Procedure", icon: <BookOpen className="w-4 h-4" /> },
  { value: "email_template", label: "Email Template", icon: <PenTool className="w-4 h-4" /> },
  { value: "sms_template", label: "SMS Template", icon: <PenTool className="w-4 h-4" /> },
  { value: "family_update", label: "Family Update", icon: <FileText className="w-4 h-4" /> },
  { value: "staff_announcement", label: "Staff Announcement", icon: <FileText className="w-4 h-4" /> },
  { value: "general", label: "General", icon: <PenTool className="w-4 h-4" /> },
];

const ACTION_OPTIONS: { value: WritingAction; label: string; description: string; requiresContent: boolean }[] = [
  { value: "improve", label: "Improve", description: "Make text more professional and clear", requiresContent: true },
  { value: "expand", label: "Expand", description: "Add more detail and depth", requiresContent: true },
  { value: "summarize", label: "Summarize", description: "Create a concise summary", requiresContent: true },
  { value: "make_professional", label: "Make Professional", description: "Formal business tone", requiresContent: true },
  { value: "simplify", label: "Simplify", description: "Easier to understand", requiresContent: true },
  { value: "generate", label: "Generate", description: "Create new content from scratch", requiresContent: false },
  { value: "check_compliance", label: "Check Compliance", description: "Review for NDIS compliance", requiresContent: true },
  { value: "suggest_structure", label: "Suggest Structure", description: "Get a template structure", requiresContent: false },
];

export function AIWritingAssistant({
  open,
  onOpenChange,
  initialContent = "",
  initialContext = "general",
  onApply,
}: AIWritingAssistantProps) {
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [context, setContext] = useState<WritingContext>(initialContext);
  const [action, setAction] = useState<WritingAction>("improve");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"formal" | "friendly" | "neutral">("neutral");
  const [result, setResult] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "templates">("write");

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/ai/status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/status", { credentials: "include" });
      return res.json();
    },
  });

  // Get quick templates
  const { data: templates } = useQuery({
    queryKey: ["/api/ai/quick-templates"],
    queryFn: async () => {
      const res = await fetch("/api/ai/quick-templates", { credentials: "include" });
      return res.json();
    },
  });

  // AI writing mutation
  const writingMutation = useMutation({
    mutationFn: async (data: {
      action: WritingAction;
      context: WritingContext;
      content?: string;
      prompt?: string;
      tone?: string;
    }) => {
      const res = await fetch("/api/ai/writing-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data.result);
      } else {
        toast({
          title: "AI Error",
          description: data.error || "Failed to process request",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcess = () => {
    const selectedAction = ACTION_OPTIONS.find((a) => a.value === action);

    if (selectedAction?.requiresContent && !content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some text to process",
        variant: "destructive",
      });
      return;
    }

    if (action === "generate" && !prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe what you want to generate",
        variant: "destructive",
      });
      return;
    }

    writingMutation.mutate({
      action,
      context,
      content: content.trim() || undefined,
      prompt: prompt.trim() || undefined,
      tone,
    });
  };

  const handleApplyResult = () => {
    if (result && onApply) {
      onApply(result);
      onOpenChange(false);
    }
  };

  const handleCopyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      toast({ title: "Copied to clipboard" });
    }
  };

  const handleTemplateClick = (templatePrompt: string, templateContext: WritingContext) => {
    setContext(templateContext);
    setPrompt(templatePrompt);
    setAction("generate");
    setActiveTab("write");
  };

  const resetForm = () => {
    setContent(initialContent);
    setPrompt("");
    setResult("");
  };

  if (!aiStatus?.configured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Writing Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <p className="font-medium mb-2">AI Not Configured</p>
            <p className="text-sm text-muted-foreground">
              The AI Writing Assistant requires an API key to function.
              Please add ANTHROPIC_API_KEY to your environment variables.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Writing Assistant
          </DialogTitle>
          <DialogDescription>
            Get AI-powered help with your writing. Your data stays private - no personal information is sent.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "templates")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Write & Improve
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Quick Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left side - Input */}
              <div className="space-y-4 flex flex-col">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Document Type</Label>
                    <Select value={context} onValueChange={(v) => setContext(v as WritingContext)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTEXT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.icon}
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Action</Label>
                    <Select value={action} onValueChange={(v) => setAction(v as WritingAction)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span>{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Tone</Label>
                  <div className="flex gap-2 mt-1">
                    {(["formal", "neutral", "friendly"] as const).map((t) => (
                      <Badge
                        key={t}
                        variant={tone === t ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => setTone(t)}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {(action === "generate" || action === "suggest_structure") && (
                  <div>
                    <Label className="text-xs">What do you want to write about?</Label>
                    <Textarea
                      placeholder="Describe what you need..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="h-20 resize-none"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <Label className="text-xs">Your Text</Label>
                  <Textarea
                    placeholder={
                      action === "generate"
                        ? "Generated content will appear here, or paste existing text to modify..."
                        : "Enter or paste your text here..."
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 min-h-[150px] resize-none"
                  />
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={writingMutation.isPending}
                  className="w-full"
                >
                  {writingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Process with AI
                    </>
                  )}
                </Button>
              </div>

              {/* Right side - Result */}
              <div className="flex flex-col border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">AI Result</Label>
                  {result && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyResult}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1 min-h-[250px]">
                  {result ? (
                    <div className="whitespace-pre-wrap text-sm">{result}</div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      <div className="text-center">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>AI-generated content will appear here</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
                {result && onApply && (
                  <Button onClick={handleApplyResult} className="mt-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply to Document
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 gap-4">
                {templates && Object.entries(templates).map(([key, category]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <h3 className="font-medium text-sm">{category.title}</h3>
                    <div className="space-y-1">
                      {category.prompts.map((item: { label: string; prompt: string }, idx: number) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleTemplateClick(item.prompt, key as WritingContext)}
                        >
                          <Lightbulb className="w-4 h-4 mr-2 shrink-0 text-amber-500" />
                          <span className="truncate">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Privacy: No personal data is sent to AI. Use placeholders like [PARTICIPANT] for names.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simplified inline button for triggering the assistant
export function AIWritingButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50", className)}
    >
      <Sparkles className="w-4 h-4" />
      AI Assist
    </Button>
  );
}
