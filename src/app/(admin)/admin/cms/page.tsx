"use client";

import * as React from "react";
import {
  Megaphone,
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Pin,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "emergency";
  type: "general" | "competition" | "results" | "deadline" | "emergency";
  status: "draft" | "published" | "archived";
  publish_date: string;
  expiry_date: string | null;
  pinned: boolean;
}

interface TickerItem {
  id: string;
  message: string;
  pinned: boolean;
  active: boolean;
  scheduled_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  visible: boolean;
}

interface ContactInfo {
  id?: string;
  email: string;
  phone: string;
  facebook: string;
  linkedin: string;
  address: string;
  maps_url: string;
}

type TabType = "announcements" | "ticker" | "faqs" | "contact";

export default function AdminCMSPage() {
  const [activeTab, setActiveTab] = React.useState<TabType>("announcements");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Data arrays
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [tickerItems, setTickerItems] = React.useState<TickerItem[]>([]);
  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [contact, setContact] = React.useState<ContactInfo>({
    email: "",
    phone: "",
    facebook: "",
    linkedin: "",
    address: "",
    maps_url: "",
  });

  // Modal control
  const [activeAnnModal, setActiveAnnModal] = React.useState<Partial<Announcement> | null>(null);
  const [activeTickerModal, setActiveTickerModal] = React.useState<Partial<TickerItem> | null>(null);
  const [activeFaqModal, setActiveFaqModal] = React.useState<Partial<FAQ> | null>(null);

  useBodyScrollLock(activeAnnModal !== null || activeTickerModal !== null || activeFaqModal !== null);

  const fetchCMSData = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      if (activeTab === "announcements") {
        const res = await fetch("/api/admin/cms/announcements");
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setAnnouncements(json.data || []);
      } else if (activeTab === "ticker") {
        const res = await fetch("/api/admin/cms/ticker");
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setTickerItems(json.data || []);
      } else if (activeTab === "faqs") {
        const res = await fetch("/api/admin/cms/faqs");
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setFaqs(json.data || []);
      } else if (activeTab === "contact") {
        const res = await fetch("/api/admin/cms/contact");
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        if (json.data) {
          setContact(json.data);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load CMS data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      // Defer state updates to avoid synchronous execution during render/useEffect body
      await Promise.resolve();
      if (active) {
        fetchCMSData();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchCMSData]);

  // Show status flashes helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ==========================================
  // ANNOUNCEMENTS ACTIONS
  // ==========================================
  const handleSaveAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeAnnModal) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeAnnModal),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      setActiveAnnModal(null);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_delete: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete announcement.");
    }
  };

  // ==========================================
  // TICKER ACTIONS
  // ==========================================
  const handleSaveTickerItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTickerModal) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeTickerModal),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      setActiveTickerModal(null);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save ticker item.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTickerStatus = async (item: TickerItem, field: "active" | "pinned") => {
    setErrorMsg(null);
    try {
      const updated = {
        ...item,
        [field]: !item[field],
      };
      const res = await fetch("/api/admin/cms/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update ticker item.");
    }
  };

  const handleDeleteTickerItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticker message?")) return;

    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_delete: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete ticker item.");
    }
  };

  // ==========================================
  // FAQS ACTIONS
  // ==========================================
  const handleSaveFaq = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeFaqModal) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeFaqModal),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      setActiveFaqModal(null);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFaqVisibility = async (faq: FAQ) => {
    setErrorMsg(null);
    try {
      const updated = {
        ...faq,
        visible: !faq.visible,
      };
      const res = await fetch("/api/admin/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to toggle FAQ visibility.");
    }
  };

  const handleReorderFaq = async (index: number, direction: "up" | "down") => {
    setErrorMsg(null);
    try {
      const targetFaq = faqs[index];
      const swapFaq = direction === "up" ? faqs[index - 1] : faqs[index + 1];
      if (!targetFaq || !swapFaq) return;

      // Swap display orders
      const tempOrder = targetFaq.display_order;
      
      const res1 = await fetch("/api/admin/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetFaq, display_order: swapFaq.display_order }),
      });
      if (!res1.ok) throw new Error("Failed swap operation");

      const res2 = await fetch("/api/admin/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...swapFaq, display_order: tempOrder }),
      });
      if (!res2.ok) throw new Error("Failed swap operation");

      fetchCMSData();
    } catch {
      setErrorMsg("Failed to reorder FAQs.");
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_delete: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      fetchCMSData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete FAQ.");
    }
  };

  // ==========================================
  // CONTACT INFO ACTIONS
  // ==========================================
  const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/cms/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      triggerSuccess(data.message);
      if (data.data) {
        setContact(data.data);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update contact info.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-h3 font-heading font-bold text-neutral-50 tracking-tight">Content Management System</h1>
          <p className="text-sm text-neutral-400 font-sans mt-1">
            Configure announcement alerts, adjust ticker messages, structure public FAQs, and set organizer coordinates.
          </p>
        </div>
      </div>

      {/* Tabs Menu navigation */}
      <div className="p-1 rounded bg-neutral-900/20 border border-neutral-800/40 backdrop-blur-md flex gap-1 overflow-x-auto max-w-md">
        {(["announcements", "ticker", "faqs", "contact"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setErrorMsg(null);
            }}
            className={`flex-1 px-3 py-1.5 text-sm font-mono uppercase tracking-wider rounded transition-all duration-150 outline-none whitespace-nowrap cursor-pointer select-none text-center ${
              activeTab === tab
                ? "bg-neutral-900 text-neutral-100 border border-neutral-800"
                : "text-neutral-500 border border-transparent hover:text-neutral-350 hover:bg-neutral-900/10"
            }`}
          >
            {tab === "faqs" ? "FAQs" : tab}
          </button>
        ))}
      </div>

      {/* Status Flashes */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-sans font-medium flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-sans font-medium flex items-start gap-2.5 animate-fade-in">
          <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary Tab Content Pane */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-neutral-900 w-1/4 rounded-lg" />
          <div className="h-40 bg-neutral-900 w-full rounded-xl" />
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* ======================================= */}
          {/* TAB 1: ANNOUNCEMENTS                    */}
          {/* ======================================= */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-md font-heading font-semibold text-neutral-200">Announcements Directory</h2>
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveAnnModal({
                      title: "",
                      content: "",
                      priority: "normal",
                      type: "general",
                      status: "draft",
                      pinned: false,
                    })
                  }
                  className="text-xs py-2 px-4 gap-1.5 font-mono uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent rounded active:scale-98"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Announcement</span>
                </Button>
              </div>

              <Card variant="glass" className="bg-glass border-glass p-0 overflow-hidden">
                <CardContent className="p-0">
                  {announcements.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold tracking-wider uppercase text-xxs font-mono">
                            <th className="py-4 px-6">Title</th>
                            <th className="py-4 px-6 w-28">Type</th>
                            <th className="py-4 px-6 w-28">Priority</th>
                            <th className="py-4 px-6 w-28">Status</th>
                            <th className="py-4 px-6 w-20 text-center">Pinned</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850/30">
                          {announcements.map((ann) => (
                            <tr key={ann.id} className="hover:bg-neutral-900/20 transition-colors">
                              <td className="py-4 px-6 font-medium text-neutral-100">
                                <div className="space-y-1 max-w-sm truncate">
                                  <div className="truncate font-semibold text-sm">{ann.title}</div>
                                  <div className="text-neutral-500 text-xxs truncate leading-relaxed">{ann.content}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6 capitalize">
                                <Badge variant="neutral" className="text-xxs px-2.5 py-0.5">{ann.type}</Badge>
                              </td>
                              <td className="py-4 px-6 capitalize">
                                <Badge
                                  variant={
                                    ann.priority === "emergency"
                                      ? "error"
                                      : ann.priority === "high"
                                      ? "warning"
                                      : ann.priority === "normal"
                                      ? "primary"
                                      : "neutral"
                                  }
                                  className="text-xxs px-2.5 py-0.5 font-mono"
                                >
                                  {ann.priority}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 capitalize">
                                <Badge
                                  variant={
                                    ann.status === "published"
                                      ? "success"
                                      : ann.status === "draft"
                                      ? "warning"
                                      : "neutral"
                                  }
                                  className="text-xxs px-2.5 py-0.5 font-mono"
                                >
                                  {ann.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-center">
                               {ann.pinned ? (
                                  <Pin className="h-3.5 w-3.5 text-neutral-400 mx-auto fill-neutral-500/10" />
                                ) : (
                                  <span className="text-neutral-600 font-mono">—</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setActiveAnnModal(ann)}
                                    className="text-xxs py-1.5 px-2.5 h-8 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-neutral-300" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                    className="text-xxs py-1.5 px-2.5 h-8 text-neutral-400 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-3">
                      <Megaphone className="h-10 w-10 text-neutral-700" />
                      <span className="font-medium">No announcements have been created yet.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: NEWS TICKER                      */}
          {/* ======================================= */}
          {activeTab === "ticker" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-md font-heading font-semibold text-neutral-200">Scrolling News Ticker Queue</h2>
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveTickerModal({
                      message: "",
                      pinned: false,
                      active: true,
                    })
                  }
                  className="text-xs py-2 px-4 gap-1.5 font-mono uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent rounded active:scale-98"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add News Ticker</span>
                </Button>
              </div>

              <Card variant="glass" className="bg-glass border-glass p-0 overflow-hidden">
                <CardContent className="p-0">
                  {tickerItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold tracking-wider uppercase text-xxs font-mono">
                            <th className="py-4 px-6">Message</th>
                            <th className="py-4 px-6 w-28 text-center">Pinned</th>
                            <th className="py-4 px-6 w-28 text-center">Active Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850/30">
                          {tickerItems.map((item) => (
                            <tr key={item.id} className="hover:bg-neutral-900/20 transition-colors">
                              <td className="py-4 px-6 font-semibold text-neutral-200">
                                {item.message}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={() => handleToggleTickerStatus(item, "pinned")}
                                  className="focus:outline-none p-1.5 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 transition-colors cursor-pointer"
                                  aria-label="Toggle pin ticker"
                                >
                                  {item.pinned ? (
                                    <Pin className="h-3.5 w-3.5 text-neutral-400 mx-auto fill-neutral-500/10" />
                                  ) : (
                                    <Pin className="h-3.5 w-3.5 text-neutral-700 mx-auto" />
                                  )}
                                </button>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={() => handleToggleTickerStatus(item, "active")}
                                  className="focus:outline-none cursor-pointer"
                                  aria-label="Toggle active status"
                                >
                                  <Badge variant={item.active ? "success" : "neutral"} className="cursor-pointer px-2.5 py-0.5 font-mono">
                                    {item.active ? "Active" : "Disabled"}
                                  </Badge>
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setActiveTickerModal(item)}
                                    className="text-xxs py-1.5 px-2.5 h-8 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-neutral-300" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleDeleteTickerItem(item.id)}
                                    className="text-xxs py-1.5 px-2.5 h-8 text-neutral-400 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-3">
                      <Megaphone className="h-10 w-10 text-neutral-700 animate-pulse" />
                      <span className="font-medium">No news ticker messages have been configured yet.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: FAQS                             */}
          {/* ======================================= */}
          {activeTab === "faqs" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-md font-heading font-semibold text-neutral-200">Public FAQ Accordions</h2>
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveFaqModal({
                      question: "",
                      answer: "",
                      display_order: faqs.length + 1,
                      visible: true,
                    })
                  }
                  className="text-xs py-2 px-4 gap-1.5 font-mono uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent rounded active:scale-98"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add FAQ Item</span>
                </Button>
              </div>

              <Card variant="glass" className="bg-glass border-glass p-0 overflow-hidden">
                <CardContent className="p-0">
                  {faqs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold tracking-wider uppercase text-xxs font-mono">
                            <th className="py-4 px-6 w-24 text-center font-mono">Order</th>
                            <th className="py-4 px-6">Question & Answer</th>
                            <th className="py-4 px-6 w-28 text-center">Visibility</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850/30">
                          {faqs.map((faq, idx) => (
                            <tr key={faq.id} className="hover:bg-neutral-900/20 transition-colors">
                              <td className="py-4 px-6 text-center font-mono font-bold text-neutral-400">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="text-neutral-355 text-sm font-bold">{faq.display_order}</div>
                                  <div className="flex gap-1">
                                    <button
                                      disabled={idx === 0}
                                      onClick={() => handleReorderFaq(idx, "up")}
                                      className="p-1 rounded border border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 disabled:opacity-20 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                                      aria-label="Move FAQ up"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      disabled={idx === faqs.length - 1}
                                      onClick={() => handleReorderFaq(idx, "down")}
                                      className="p-1 rounded border border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 disabled:opacity-20 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                                      aria-label="Move FAQ down"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="space-y-1.5 max-w-lg">
                                  <div className="text-neutral-100 font-semibold leading-relaxed text-sm">{faq.question}</div>
                                  <div className="text-neutral-400 text-xxs leading-relaxed font-normal">{faq.answer}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={() => handleToggleFaqVisibility(faq)}
                                  className="focus:outline-none cursor-pointer"
                                  aria-label="Toggle visible faq"
                                >
                                  <Badge variant={faq.visible ? "success" : "neutral"} className="cursor-pointer px-2.5 py-0.5 font-mono">
                                    {faq.visible ? "Visible" : "Hidden"}
                                  </Badge>
                                </button>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="secondary"
                                    onClick={() => setActiveFaqModal(faq)}
                                    className="text-xxs py-1.5 px-2.5 h-8 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-neutral-300" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleDeleteFaq(faq.id)}
                                    className="text-xxs py-1.5 px-2.5 h-8 text-neutral-400 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-neutral-500 flex flex-col items-center gap-3">
                      <HelpCircle className="h-10 w-10 text-neutral-700" />
                      <span className="font-medium">No FAQs have been added yet.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 4: CONTACT INFO                     */}
          {/* ======================================= */}
          {activeTab === "contact" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-md font-heading font-semibold text-neutral-200">Contact Coordinates</h2>
                <p className="text-xxs text-neutral-500 font-sans mt-0.5">
                  Update global contact points rendered on website footer and info sheets.
                </p>
              </div>

              <Card variant="glass" className="bg-glass border-glass">
                <CardContent className="p-6">
                  <form onSubmit={handleSaveContact} className="space-y-5 text-xs font-sans text-neutral-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Email */}
                      <div className="space-y-1.5">
                        <Input
                          type="email"
                          label="Support Email"
                          placeholder="csefest@smuct.edu.bd"
                          value={contact.email || ""}
                          onChange={(e) => setContact({ ...contact, email: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Input
                          type="text"
                          label="Support Phone"
                          placeholder="+880 1712-345678"
                          value={contact.phone || ""}
                          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Facebook */}
                      <div className="space-y-1.5">
                        <Input
                          type="text"
                          label="Facebook URL"
                          placeholder="https://facebook.com/smuct.cse"
                          value={contact.facebook || ""}
                          onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                      {/* LinkedIn */}
                      <div className="space-y-1.5">
                        <Input
                          type="text"
                          label="LinkedIn URL"
                          placeholder="https://linkedin.com/school/smuct"
                          value={contact.linkedin || ""}
                          onChange={(e) => setContact({ ...contact, linkedin: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <Input
                        type="text"
                        label="Campus Address"
                        placeholder="SMUCT Campus, Uttara, Dhaka"
                        value={contact.address || ""}
                        onChange={(e) => setContact({ ...contact, address: e.target.value })}
                        disabled={saving}
                      />
                    </div>

                    {/* Maps URL */}
                    <div className="space-y-1.5">
                      <Input
                        type="text"
                        label="Google Maps Location Link"
                        placeholder="https://maps.google.com/?cid=..."
                        value={contact.maps_url || ""}
                        onChange={(e) => setContact({ ...contact, maps_url: e.target.value })}
                        disabled={saving}
                      />
                    </div>

                    <div className="pt-4 border-t border-neutral-850 flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={saving}
                        disabled={saving}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent text-xs font-mono uppercase tracking-wider py-2 px-5 active:scale-[0.98] rounded cursor-pointer"
                      >
                        Save Coordinates
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ANNOUNCEMENT EDIT MODAL                                 */}
      {/* ======================================================== */}
      {activeAnnModal && (
        <div className="fixed inset-0 z-50 flex bg-neutral-950/85 backdrop-blur-md items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-6 space-y-6 shadow-level-3 animate-fade-in">
            <CardHeader className="p-0 flex flex-row justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <CardTitle className="text-sm font-heading font-bold text-neutral-50">
                  {activeAnnModal.id ? "Edit Announcement Record" : "Build Announcement alert"}
                </CardTitle>
              </div>
              <button
                onClick={() => setActiveAnnModal(null)}
                className="p-1.5 rounded-full bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:text-neutral-200 transition-colors text-neutral-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleSaveAnnouncement} className="space-y-5 text-xs font-sans text-neutral-300">
              {/* Title */}
              <div className="space-y-1.5">
                <Input
                  label="Title"
                  type="text"
                  required
                  placeholder="e.g. Phase 2 submissions deadline extended"
                  value={activeAnnModal.title || ""}
                  onChange={(e) => setActiveAnnModal({ ...activeAnnModal, title: e.target.value })}
                  disabled={saving}
                />
              </div>

              {/* Content */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase">Content Body</label>
                <textarea
                  required
                  placeholder="Provide announcement details..."
                  className="flex min-h-24 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans"
                  value={activeAnnModal.content || ""}
                  onChange={(e) => setActiveAnnModal({ ...activeAnnModal, content: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase select-none">Priority Level</label>
                  <select
                    className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    value={activeAnnModal.priority || "normal"}
                    onChange={(e) =>
                      setActiveAnnModal({
                        ...activeAnnModal,
                        priority: e.target.value as Announcement["priority"],
                      })
                    }
                    disabled={saving}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Type */}
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase select-none">Category Type</label>
                  <select
                    className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    value={activeAnnModal.type || "general"}
                    onChange={(e) =>
                      setActiveAnnModal({
                        ...activeAnnModal,
                        type: e.target.value as Announcement["type"],
                      })
                    }
                    disabled={saving}
                  >
                    <option value="general">General</option>
                    <option value="competition">Competition</option>
                    <option value="results">Results</option>
                    <option value="deadline">Deadline</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                {/* Status */}
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase select-none">Publish Status</label>
                  <select
                    className="flex h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans cursor-pointer"
                    value={activeAnnModal.status || "draft"}
                    onChange={(e) =>
                      setActiveAnnModal({
                        ...activeAnnModal,
                        status: e.target.value as Announcement["status"],
                      })
                    }
                    disabled={saving}
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Public)</option>
                    <option value="archived">Archived (Expired)</option>
                  </select>
                </div>

                {/* Pinned Checkbox */}
                <label className="relative flex items-center gap-3 p-3 h-10 rounded border border-neutral-800 bg-neutral-950/45 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-sans text-neutral-350">
                  <input
                    type="checkbox"
                    id="ann-pinned"
                    checked={activeAnnModal.pinned || false}
                    onChange={(e) => setActiveAnnModal({ ...activeAnnModal, pinned: e.target.checked })}
                    className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="font-mono uppercase tracking-wider text-sm">Pin Alert to Top</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
                <Button variant="secondary" onClick={() => setActiveAnnModal(null)} disabled={saving} className="active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-3.5 h-8.5 cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  disabled={saving}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-4.5 h-8.5 cursor-pointer rounded"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TICKER EDIT MODAL                                       */}
      {/* ======================================================== */}
      {activeTickerModal && (
        <div className="fixed inset-0 z-50 flex bg-neutral-950/85 backdrop-blur-md items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-6 space-y-6 shadow-level-3 animate-fade-in">
            <CardHeader className="p-0 flex flex-row justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <CardTitle className="text-sm font-heading font-bold text-neutral-50">
                  {activeTickerModal.id ? "Edit Ticker Message" : "Build Ticker alert"}
                </CardTitle>
              </div>
              <button
                onClick={() => setActiveTickerModal(null)}
                className="p-1.5 rounded-full bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:text-neutral-200 transition-colors text-neutral-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleSaveTickerItem} className="space-y-5 text-xs font-sans text-neutral-300">
              {/* Message */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase">Ticker Message</label>
                <textarea
                  required
                  placeholder="Provide news ticker alert text..."
                  className="flex min-h-20 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans"
                  value={activeTickerModal.message || ""}
                  onChange={(e) => setActiveTickerModal({ ...activeTickerModal, message: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Active Checkbox */}
                <label className="relative flex items-center gap-3 p-3 h-11 rounded border border-neutral-800 bg-neutral-950/45 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-sans text-neutral-350">
                  <input
                    type="checkbox"
                    id="ticker-active"
                    checked={activeTickerModal.active !== false}
                    onChange={(e) => setActiveTickerModal({ ...activeTickerModal, active: e.target.checked })}
                    className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="font-mono uppercase tracking-wider text-sm">Display Alert (Active)</span>
                </label>

                {/* Pinned Checkbox */}
                <label className="relative flex items-center gap-3 p-3 h-11 rounded border border-neutral-800 bg-neutral-950/45 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-sans text-neutral-350">
                  <input
                    type="checkbox"
                    id="ticker-pinned"
                    checked={activeTickerModal.pinned || false}
                    onChange={(e) => setActiveTickerModal({ ...activeTickerModal, pinned: e.target.checked })}
                    className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="font-mono uppercase tracking-wider text-sm">Pin Alert to Start</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
                <Button variant="secondary" onClick={() => setActiveTickerModal(null)} disabled={saving} className="active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-3.5 h-8.5 cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  disabled={saving}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-4.5 h-8.5 cursor-pointer rounded"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* FAQ EDIT MODAL                                          */}
      {/* ======================================================== */}
      {activeFaqModal && (
        <div className="fixed inset-0 z-50 flex bg-neutral-950/85 backdrop-blur-md items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-6 space-y-6 shadow-level-3 animate-fade-in">
            <CardHeader className="p-0 flex flex-row justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <CardTitle className="text-sm font-heading font-bold text-neutral-50">
                  {activeFaqModal.id ? "Edit FAQ Item" : "Create FAQ Item"}
                </CardTitle>
              </div>
              <button
                onClick={() => setActiveFaqModal(null)}
                className="p-1.5 rounded-full bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:text-neutral-200 transition-colors text-neutral-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleSaveFaq} className="space-y-5 text-xs font-sans text-neutral-300">
              {/* Question */}
              <div className="space-y-1.5">
                <Input
                  label="FAQ Question"
                  type="text"
                  required
                  placeholder="e.g. Can we register if students are from different departments?"
                  value={activeFaqModal.question || ""}
                  onChange={(e) => setActiveFaqModal({ ...activeFaqModal, question: e.target.value })}
                  disabled={saving}
                />
              </div>

              {/* Answer */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-sm font-mono tracking-widest text-neutral-400 uppercase">FAQ Answer</label>
                <textarea
                  required
                  placeholder="Provide accordion expansion answer text..."
                  className="flex min-h-24 w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700/20 outline-none transition-all duration-200 font-sans"
                  value={activeFaqModal.answer || ""}
                  onChange={(e) => setActiveFaqModal({ ...activeFaqModal, answer: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                {/* Display Order */}
                <div className="space-y-1.5">
                  <Input
                    label="Display Order"
                    type="number"
                    required
                    min="1"
                    value={activeFaqModal.display_order || 0}
                    onChange={(e) =>
                      setActiveFaqModal({ ...activeFaqModal, display_order: parseInt(e.target.value) || 0 })
                    }
                    disabled={saving}
                  />
                </div>

                {/* Visible Checkbox */}
                <label className="relative flex items-center gap-3 p-3 h-10 rounded border border-neutral-800 bg-neutral-950/45 hover:bg-neutral-900/50 cursor-pointer select-none transition-all duration-200 text-xs font-sans text-neutral-350">
                  <input
                    type="checkbox"
                    id="faq-visible"
                    checked={activeFaqModal.visible !== false}
                    onChange={(e) => setActiveFaqModal({ ...activeFaqModal, visible: e.target.checked })}
                    className="rounded border-neutral-750 bg-neutral-950 text-neutral-300 focus:ring-neutral-800 h-4 w-4 cursor-pointer"
                    disabled={saving}
                  />
                  <span className="font-mono uppercase tracking-wider text-sm">Visible on website</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
                <Button variant="secondary" onClick={() => setActiveFaqModal(null)} disabled={saving} className="active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-3.5 h-8.5 cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  disabled={saving}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-transparent active:scale-[0.98] font-mono uppercase tracking-wider text-sm px-4.5 h-8.5 cursor-pointer rounded"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );

}

