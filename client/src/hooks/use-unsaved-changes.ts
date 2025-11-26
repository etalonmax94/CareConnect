import { useEffect, useCallback, useState } from "react";

interface UseUnsavedChangesOptions {
  hasChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasChanges, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: UseUnsavedChangesOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges, message]);

  const confirmNavigation = useCallback((navigateFn: () => void) => {
    if (hasChanges) {
      setPendingNavigation(() => navigateFn);
      setShowWarning(true);
    } else {
      navigateFn();
    }
  }, [hasChanges]);

  const handleConfirm = useCallback(() => {
    if (pendingNavigation) {
      pendingNavigation();
    }
    setShowWarning(false);
    setPendingNavigation(null);
  }, [pendingNavigation]);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
    setPendingNavigation(null);
  }, []);

  return {
    showWarning,
    confirmNavigation,
    handleConfirm,
    handleCancel,
    message,
  };
}
