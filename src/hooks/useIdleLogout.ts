import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const IDLE_MS = 55 * 60 * 1000; // 55 minutes
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "click",
] as const;

/**
 * Auto-logs the user out after IDLE_MS of no user activity
 * (mouse / keyboard / touch / scroll). Any activity resets the timer.
 * Pass `enabled = false` on public routes (login, register).
 */
export function useIdleLogout(enabled: boolean) {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        toast.info("Session expired", {
          description: "You were logged out due to 55 minutes of inactivity.",
        });
        navigate("/login", { replace: true });
      }, IDLE_MS);
    };

    reset();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, reset, { passive: true })
    );

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [enabled, navigate]);
}