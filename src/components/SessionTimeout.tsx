import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, LogIn } from "lucide-react";

interface SessionTimeoutProps {
  lang: string;
  timeoutMinutes?: number;
}

export const SessionTimeout: React.FC<SessionTimeoutProps> = ({
  lang,
  timeoutMinutes = 30,
}) => {
  const sw = lang === "sw";
  const [expired, setExpired] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Track user activity
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);

  // Check for timeout
  useEffect(() => {
    const interval = setInterval(async () => {
      const elapsed = (Date.now() - lastActivity) / 1000 / 60;
      if (elapsed >= timeoutMinutes) {
        // Verify session is actually still valid
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setExpired(true);
        }
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes]);

  // Also listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          if (event === "SIGNED_OUT") setExpired(true);
          if (event === "TOKEN_REFRESHED") setExpired(false);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  if (!expired) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={28} className="text-amber-600" />
        </div>
        <h2 className="text-lg font-black text-stone-900 mb-2">
          {sw ? "Muda wa Kikao Umekwisha" : "Session Expired"}
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          {sw
            ? "Kikao chako kimemalizika kwa sababu ya kukaa bila shughuli. Tafadhali ingia tena."
            : "Your session has expired due to inactivity. Please log in again to continue."}
        </p>
        <button
          onClick={() => {
            supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          <LogIn size={16} />
          {sw ? "Ingia Tena" : "Log In Again"}
        </button>
      </div>
    </div>
  );
};
