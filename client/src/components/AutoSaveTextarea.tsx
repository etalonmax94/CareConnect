import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onAutoSave?: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  autoSaveInterval?: number;
  disabled?: boolean;
  minRows?: number;
  "data-testid"?: string;
}

export function AutoSaveTextarea({
  value,
  onChange,
  onAutoSave,
  placeholder,
  className,
  autoSaveInterval = 60000,
  disabled = false,
  minRows = 4,
  "data-testid": testId,
}: AutoSaveTextareaProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const lastSavedValueRef = useRef(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performAutoSave = useCallback(async () => {
    if (!onAutoSave || value === lastSavedValueRef.current || !value.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await onAutoSave(value);
      lastSavedValueRef.current = value;
      setLastSaved(new Date());
      setShowSaved(true);
      
      toast({
        title: "Auto-saved",
        description: `Your text was saved at ${new Date().toLocaleTimeString()}`,
        duration: 3000,
      });

      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      toast({
        title: "Auto-save failed",
        description: "Your changes could not be saved automatically.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [value, onAutoSave, toast]);

  useEffect(() => {
    if (!onAutoSave || disabled) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      performAutoSave();
    }, autoSaveInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoSaveInterval, onAutoSave, disabled, performAutoSave]);

  useEffect(() => {
    lastSavedValueRef.current = value;
  }, []);

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("min-h-[100px] resize-y", className)}
        disabled={disabled}
        rows={minRows}
        data-testid={testId}
      />
      {onAutoSave && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
          {isSaving && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {showSaved && !isSaving && (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-600">Saved</span>
            </>
          )}
          {!isSaving && !showSaved && lastSaved && (
            <span>Auto-saves every minute</span>
          )}
        </div>
      )}
    </div>
  );
}
