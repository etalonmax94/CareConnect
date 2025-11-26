import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AutoSaveOptions {
  data: unknown;
  onSave: () => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export function useAutoSave({ 
  data, 
  onSave, 
  interval = 60000,
  enabled = true 
}: AutoSaveOptions) {
  const { toast } = useToast();
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const save = useCallback(async () => {
    const currentData = JSON.stringify(data);
    
    if (currentData === lastSavedRef.current) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave();
      lastSavedRef.current = currentData;
      setLastSavedAt(new Date());
      
      toast({
        title: "Auto-saved",
        description: `Your changes have been saved at ${new Date().toLocaleTimeString()}`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Auto-save failed",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, toast]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    lastSavedRef.current = JSON.stringify(data);

    timerRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, interval, save, data]);

  return { 
    isSaving, 
    lastSavedAt,
    saveNow: save 
  };
}
