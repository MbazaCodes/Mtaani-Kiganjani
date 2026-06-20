import React, { useState, useEffect } from "react";
import type { AnyFormData } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Clock,
  User,
  MapPin,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
// Safe form_data field accessor for JSX rendering
const fd = (data: Record<string, unknown>, key: string): string => String(data?.[key] ?? "");

interface PendingApproval {
  id: string;
  application_number: string;
  service_name: string;
  form_data: Record<string, unknown>; // dynamic fields accessed via cast
  user_id: string;
  created_at: string;
  submitter?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface PendingApprovalsProps {
  lang?: "sw" | "en";
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({ lang = "sw" }) => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchPendingApprovals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchPendingApprovals = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Find applications where this user is the target_user_id and status is pending
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          application_number,
          service_name,
          form_data,
          user_id,
          created_at
        `,
        )
        .eq("target_user_id", user.id)
        .eq("agreement_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch submitter info for each approval
      const approvalsWithSubmitters = await Promise.all(
        (data || []).map(async (app) => {
          const { data: submitterData } = await supabase
            .from("users")
            .select("first_name, last_name, phone")
            .eq("id", app.user_id)
            .single();

          return {
            ...app,
            submitter: submitterData || undefined,
          };
        }),
      );

      setPendingApprovals(approvalsWithSubmitters);
    } catch (err) {
      console.error("Error fetching pending approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: PendingApproval) => {
    if (!user?.id) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("applications")
        .update({
          agreement_status: "approved",
          approved_by_target: user.id,
          approved_by_target_at: new Date().toISOString(),
          is_confirmed: true,
          confirmation_data: {
            confirmed_by: user.id,
            confirmed_at: new Date().toISOString(),
            role: approval.form_data?.target_user_role || "COUNTER_PARTY",
          },
        })
        .eq("id", approval.id);

      if (error) throw error;

      // Create notification for the submitter
      await supabase.from("notifications").insert({
        user_id: approval.user_id,
        title: lang === "sw" ? "Makubaliano Yameidhinishwa" : "Agreement Approved",
        message:
          lang === "sw"
            ? `Makubaliano yako (${approval.application_number}) yameidhinishwa na upande mwingine.`
            : `Your agreement (${approval.application_number}) has been approved by the other party.`,
        type: "success",
      });

      // Refresh the list
      fetchPendingApprovals();
      setSelectedApproval(null);
    } catch (err) {
      console.error("Error approving:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (approval: PendingApproval) => {
    if (!user?.id || !rejectionReason.trim()) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("applications")
        .update({
          agreement_status: "rejected",
          approved_by_target: user.id,
          approved_by_target_at: new Date().toISOString(),
          target_rejection_reason: rejectionReason.trim(),
        })
        .eq("id", approval.id);

      if (error) throw error;

      // Create notification for the submitter
      await supabase.from("notifications").insert({
        user_id: approval.user_id,
        title: lang === "sw" ? "Makubaliano Yamekataliwa" : "Agreement Rejected",
        message:
          lang === "sw"
            ? `Makubaliano yako (${approval.application_number}) yamekataliwa. Sababu: ${rejectionReason}`
            : `Your agreement (${approval.application_number}) has been rejected. Reason: ${rejectionReason}`,
        type: "error",
      });

      // Refresh and close modals
      fetchPendingApprovals();
      setSelectedApproval(null);
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err) {
      console.error("Error rejecting:", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (pendingApprovals.length === 0) {
    return null; // Don't show the section if no pending approvals
  }

  return (
    <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500 text-white px-6 py-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg">
            {lang === "sw"
              ? "Makubaliano Yanasubiri Idhini Yako"
              : "Agreements Awaiting Your Approval"}
          </h3>
          <p className="text-amber-100 text-sm">
            {lang === "sw"
              ? `Una makubaliano ${pendingApprovals.length} yanayosubiri kuidhinishwa`
              : `You have ${pendingApprovals.length} agreement(s) pending approval`}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {pendingApprovals.map((approval) => (
          <div
            key={approval.id}
            className="bg-white rounded-xl border border-amber-200 p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">
                    {approval.service_name?.includes("PANGISHA") ? "PANGISHA" : "MAUZIANO"}
                  </span>
                  <span className="text-sm font-mono text-stone-500">
                    #{approval.application_number}
                  </span>
                </div>

                {/* Submitter info */}
                {approval.submitter && (
                  <div className="flex items-center gap-4 text-sm text-stone-600 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {approval.submitter.first_name} {approval.submitter.last_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(approval.created_at).toLocaleDateString("sw-TZ")}
                    </span>
                  </div>
                )}

                {/* Key details */}
                <div className="flex items-center gap-4 text-sm text-stone-600">
                  {Boolean(approval.form_data?.monthly_rent) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(Number(approval.form_data["monthly_rent"] ?? 0))}/mwezi
                    </span>
                  )}
                  {Boolean(approval.form_data?.sale_price) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(Number(approval.form_data["sale_price"] ?? 0))}
                    </span>
                  )}
                  {Boolean(approval.form_data?.street) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {fd(approval.form_data, "street")}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedApproval(approval)}
                  className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  title={lang === "sw" ? "Angalia zaidi" : "View details"}
                >
                  <Eye className="h-5 w-5 text-stone-600" />
                </button>
                <button
                  onClick={() => handleApprove(approval)}
                  disabled={processing}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-lg transition-colors"
                  title={lang === "sw" ? "Idhinisha" : "Approve"}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedApproval(approval);
                    setShowRejectModal(true);
                  }}
                  disabled={processing}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                  title={lang === "sw" ? "Kataa" : "Reject"}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedApproval && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-800">
                {lang === "sw" ? "Maelezo ya Makubaliano" : "Agreement Details"}
              </h3>
              <button
                onClick={() => setSelectedApproval(null)}
                className="p-2 hover:bg-stone-100 rounded-lg"
                aria-label={lang === "sw" ? "Funga" : "Close"}
              >
                <XCircle className="h-5 w-5 text-stone-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Application info */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                <p>
                  <span className="font-semibold">Application #:</span>{" "}
                  {selectedApproval.application_number}
                </p>
                <p>
                  <span className="font-semibold">{lang === "sw" ? "Huduma:" : "Service:"}</span>{" "}
                  {selectedApproval.service_name}
                </p>
                <p>
                  <span className="font-semibold">{lang === "sw" ? "Tarehe:" : "Date:"}</span>{" "}
                  {new Date(selectedApproval.created_at).toLocaleString("sw-TZ")}
                </p>
              </div>

              {/* Form data */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-700">
                  {lang === "sw" ? "Taarifa za Makubaliano" : "Agreement Information"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedApproval.form_data || {}).map(([key, value]) => {
                    // Skip internal fields
                    if (["target_user_id", "send_for_approval", "agreement_accepted"].includes(key))
                      return null;
                    if (key.startsWith("section_")) return null;
                    if (typeof value === "object") return null;

                    return (
                      <div key={key} className="bg-stone-50 rounded-lg p-3">
                        <p className="text-xs text-stone-500 uppercase">{key.replace(/_/g, " ")}</p>
                        <p className="font-medium text-stone-800">
                          {typeof value === "number" ? formatCurrency(value) : String(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Approval note if any */}
              {Boolean(selectedApproval.form_data?.approval_note) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-700 mb-1">
                    {lang === "sw" ? "Ujumbe kutoka kwa mtumaji:" : "Message from submitter:"}
                  </p>
                  <p className="text-blue-800">
                    {String(selectedApproval.form_data.approval_note ?? "")}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-200 flex gap-3">
              <button
                onClick={() => handleApprove(selectedApproval)}
                disabled={processing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {lang === "sw" ? "Idhinisha Makubaliano" : "Approve Agreement"}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                {lang === "sw" ? "Kataa" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-xl font-bold">
                  {lang === "sw" ? "Kataa Makubaliano" : "Reject Agreement"}
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-stone-600">
                {lang === "sw"
                  ? "Tafadhali eleza sababu ya kukataa makubaliano haya:"
                  : "Please explain why you are rejecting this agreement:"}
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={lang === "sw" ? "Andika sababu hapa..." : "Enter reason here..."}
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none min-h-30"
                required
              />
            </div>

            <div className="p-6 border-t border-stone-200 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl"
              >
                {lang === "sw" ? "Ghairi" : "Cancel"}
              </button>
              <button
                onClick={() => handleReject(selectedApproval)}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                {lang === "sw" ? "Thibitisha Kukataa" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
