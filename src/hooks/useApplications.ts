import { useState, useEffect, useCallback } from "react";
import { supabase, Application, UserProfile } from "@/lib/supabase";
import type { ApplicationDraft } from "@/types";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { HARDCODED_SERVICES } from "@/constants/services";

const getServiceById = (serviceId: string) => {
  return HARDCODED_SERVICES.find((s) => s.id === serviceId) || null;
};

export function useApplications(user: UserProfile | null) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<ApplicationDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user || !user.id) {
      setApplications([]);
      setDrafts([]);
      return;
    }

    setLoading(true);
    setError(null);

    const isConfigured = IS_SUPABASE_CONFIGURED;

    if (!isConfigured || (user.id && user.id.startsWith("demo-"))) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const demoApps = JSON.parse(localStorage.getItem("demo_applications") || "[]");
      const userApps = demoApps
        .filter((app: Application) => app.user_id === user.id)
        .map((app: Application) => ({
          ...app,
          services: getServiceById(app.service_id) || {
            name: app.service_name || "Service",
            fee: 0,
          },
          users: user,
        }));
      setApplications(userApps);

      const userDrafts = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`draft_${user.id}_`)) {
          try {
            const draft = JSON.parse(localStorage.getItem(key)!) as ApplicationDraft;
            userDrafts.push({
              ...draft,
              services: getServiceById(draft.service_id) || {
                name: draft.service_name || "Service",
                fee: 0,
              },
              users: user,
            });
          } catch (err) {
            console.error("Error parsing draft:", err);
          }
        }
      }
      setDrafts(userDrafts);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching applications:", fetchError);
      setError(fetchError.message);
    }

    if (data) {
      const appsWithServices = data.map((app: Application) => ({
        ...app,
        services: getServiceById(app.service_id) || { name: "Service", fee: 0 },
        users: user,
      }));
      setApplications(appsWithServices);
    }

    setDrafts([]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const refreshApplications = useCallback(() => {
    fetchApplications();
  }, [fetchApplications]);

  const setApplicationsDirectly = useCallback((apps: Application[]) => {
    setApplications(apps);
  }, []);

  return {
    applications,
    drafts,
    loading,
    error,
    fetchApplications,
    refreshApplications,
    setApplications: setApplicationsDirectly,
  };
}
