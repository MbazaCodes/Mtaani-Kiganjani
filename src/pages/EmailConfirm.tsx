/**
 * EmailConfirm — handles the redirect back from Supabase email confirmation.
 *
 * Supabase redirects to:
 *   https://your-app.com/?token_hash=XXX&type=email          (PKCE flow)
 *   https://your-app.com/#access_token=XXX&type=signup       (implicit flow)
 *
 * This page sits at /confirm and exchanges the token, then redirects
 * the user to /dashboard once verified.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { TANZANIA_LOGO_URL } from "@/constants/services";

type State = "loading" | "success" | "error";

export function EmailConfirm() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();

  useEffect(() => {
    const confirm = async () => {
      // ── PKCE flow: ?token_hash=...&type=email ──────────────────────────
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as "email" | "recovery" | "invite" | null;

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setMessage(lang === "sw" ? `Hitilafu: ${error.message}` : `Error: ${error.message}`);
          setState("error");
          return;
        }
        setState("success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 2500);
        return;
      }

      // ── Implicit / hash flow: #access_token=...&type=signup ────────────
      // Supabase JS v2 handles hash tokens automatically via onAuthStateChange.
      // If we land here with a hash, just wait briefly for the session to load.
      if (window.location.hash.includes("access_token")) {
        // Give the Supabase client 1.5s to process the hash
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setState("success");
            setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
          } else {
            setMessage(
              lang === "sw"
                ? "Hakuna kikao kilichopatikana."
                : "No session found. Please try logging in.",
            );
            setState("error");
          }
        }, 1500);
        return;
      }

      // ── No token found — redirect home ─────────────────────────────────
      navigate("/", { replace: true });
    };

    confirm();
  }, []);

  const L = {
    loading: lang === "sw" ? "Inathibitisha barua pepe yako…" : "Confirming your email address…",
    success: lang === "sw" ? "Barua pepe imethibitishwa!" : "Email confirmed!",
    successSub:
      lang === "sw" ? "Unakwenda kwenye dashibodi yako…" : "Redirecting you to your dashboard…",
    error: lang === "sw" ? "Uthibitisho umeshindwa" : "Confirmation failed",
    retry: lang === "sw" ? "Rudi nyumbani" : "Go back home",
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center"
      >
        {/* Logo */}
        <img
          src={TANZANIA_LOGO_URL}
          alt="E-Mtaa"
          className="w-14 h-14 mx-auto mb-6 object-contain"
        />

        {state === "loading" && (
          <>
            <Loader2 size={44} className="text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-stone-600 font-medium">{L.loading}</p>
          </>
        )}

        {state === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 size={52} className="text-emerald-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">{L.success}</h2>
            <p className="text-stone-500 text-sm">{L.successSub}</p>
            <div className="mt-4 h-1 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5, ease: "linear" }}
              />
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle size={52} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">{L.error}</h2>
            <p className="text-sm text-stone-500 mb-6">{message}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full py-2.5 bg-stone-900 text-white font-bold rounded-xl text-sm hover:bg-stone-800 transition-colors"
            >
              {L.retry}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
