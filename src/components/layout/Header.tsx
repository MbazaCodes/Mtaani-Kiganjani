import React, { useState, useEffect } from "react";
import { LogOut, Menu, Loader2, Bell, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { cn, TanzanianBranding } from "../../lib/utils";
import { TANZANIA_LOGO_URL } from "@/constants/services";
import { countUnreadNotifications } from "@/lib/notifications";
import { useRouterView } from "./AppShell";
import { useOnlineCount } from "@/hooks/useSiteStats";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const { setView } = useRouterView();
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const onlineCount = useOnlineCount();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  // Poll unread count every 30s
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const tick = async () => {
      const n = await countUnreadNotifications(user.id);
      if (!cancelled) setUnreadCount(n);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // state clears immediately so this may not render, but reset just in case
    setSigningOut(false);
  };

  return (
    <header className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 hover:bg-stone-100 rounded-lg lg:hidden text-stone-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Open menu"
          title="Open navigation menu"
          type="button"
        >
          <Menu size={24} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={TANZANIA_LOGO_URL}
            alt="Coat of Arms of Tanzania"
            className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="h-8 sm:h-10 w-px bg-stone-200 hidden xs:block" aria-hidden="true"></div>
          <div className="flex flex-col leading-none">
            <span className="text-base sm:text-lg font-black tracking-tighter text-stone-900 flex items-center gap-1">
              E-MTAA
              <span className="text-[7px] sm:text-[9px] text-white px-1 py-0.5 rounded font-bold tracking-normal align-middle bg-primary ml-1">
                PORTAL
              </span>
            </span>
            <span className="text-[7px] sm:text-[9px] font-bold text-stone-500 uppercase tracking-widest leading-none hidden sm:block">
              {TanzanianBranding.text.office}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {isStaffOrAdmin && (
          <div
            className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1"
            title={lang === "sw" ? "Watumiaji mtandaoni sasa" : "Users online now"}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users size={13} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {onlineCount}{" "}
              <span className="font-medium text-emerald-600">
                {lang === "sw" ? "mtandaoni" : "online"}
              </span>
            </span>
          </div>
        )}
        <div
          className="flex items-center gap-1 sm:gap-2 bg-stone-100 rounded-full p-1 mr-1 sm:mr-2"
          role="group"
          aria-label="Language selector"
        >
          <button
            onClick={() => setLang("sw")}
            className={cn(
              "px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              lang === "sw"
                ? "bg-white shadow-sm text-primary"
                : "text-stone-500 hover:bg-stone-200",
            )}
            aria-label="Switch to Swahili"
            title="Kiswahili"
            type="button"
          >
            SW
          </button>
          <button
            onClick={() => setLang("en")}
            className={cn(
              "px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              lang === "en"
                ? "bg-white shadow-sm text-primary"
                : "text-stone-500 hover:bg-stone-200",
            )}
            aria-label="Switch to English"
            title="English"
            type="button"
          >
            EN
          </button>
        </div>

        {/* Notification Bell */}
        {user && (
          <button
            onClick={() => setView("notifications")}
            className="relative p-2 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            aria-label="Notifications"
            title={lang === "sw" ? "Arifa zako" : "Your notifications"}
            type="button"
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}

        {user && (
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-stone-800">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-stone-500 capitalize flex items-center gap-1.5 justify-end flex-wrap">
              <span>
                {user.role} {user.is_diaspora && "(Diaspora)"}
              </span>
              {user.seller_id && (
                <span className="text-[9px] bg-linear-to-r from-blue-500 to-indigo-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">
                  ✓ {lang === "sw" ? "Muuzaji" : "Seller"}
                </span>
              )}
              {user.landlord_id && (
                <span className="text-[9px] bg-linear-to-r from-emerald-500 to-teal-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">
                  ✓ {lang === "sw" ? "Mpangishaji" : "Landlord"}
                </span>
              )}
              {user.broker_id && (
                <span className="text-[9px] bg-linear-to-r from-purple-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-bold shadow-sm">
                  ✓ {lang === "sw" ? "Dalali" : "Broker"}
                </span>
              )}
            </p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="p-2 text-stone-400 hover:text-red-500 transition-colors hidden sm:block focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-lg disabled:opacity-50"
          aria-label="Logout"
          title="Sign out of your account"
          type="button"
        >
          {signingOut ? (
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          ) : (
            <LogOut size={20} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
