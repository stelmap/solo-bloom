import { AppLayout } from "@/components/AppLayout";
import { ListSkeleton } from "@/components/ListSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Pencil, Users, UserPlus, UserMinus, Calendar,
  Check, X, MinusCircle, BarChart3, Save, Trash2, Receipt, Search,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  useGroup, useUpdateGroup, useDeleteGroup, useGroupMembers, useAddGroupMember,
  useRemoveGroupMember, useGroupSessions, useGroupAttendance,
  useUpdateAttendance, useGroupAllAttendance, useUpdateGroupMemberPrice,
} from "@/hooks/useGroups";
import { useClients } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { describeError } from "@/lib/errorMessages";
import { GroupSettingsFields, GroupPublicationCard, GroupRegistrationsCard, GroupMessageDialog, settingsFromGroup, settingsToPatch, type GroupSettingsForm } from "@/components/groups/GroupExtras";
import { groupsText } from "@/i18n/groupsExtra";
import { useCreateGroup, useUpdateSupervisionParticipation } from "@/hooks/useGroups";
import { Archive, CopyPlus, Mail, MoreHorizontal, Home, Inbox, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GroupMembersSection } from "@/components/groups/GroupMembersSection";
import { GroupMeetingsSection } from "@/components/groups/GroupMeetingsSection";
import { GroupAttendanceDialog } from "@/components/groups/GroupAttendanceDialog";
import { groupTabsText } from "@/i18n/groupTabsText";
import { GroupFormEditorCard, GroupFinanceCard } from "@/components/groups/GroupFormEditor";
import { groupFormText } from "@/i18n/groupFormText";
import { uniqueConfirmedParticipants } from "@/lib/groupForm";
import { useGroupRegistrations } from "@/hooks/useGroups";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const gx = groupsText(lang);
  const gf = groupFormText(lang);
  const createGroup = useCreateGroup();
  const [settings, setSettings] = useState<GroupSettingsForm>(settingsFromGroup(null));
  const [messageOpen, setMessageOpen] = useState(false);
  const { symbol: cs } = useCurrency();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id);
  const { data: sessions = [] } = useGroupSessions(id);
  const { data: allAttendance = [] } = useGroupAllAttendance(id);
  const { data: allClients = [] } = useClients();
  const { data: regs = [] } = useGroupRegistrations(id);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const updateMemberPrice = useUpdateGroupMemberPrice();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", status: "active", bill_present: true, bill_absent: false });
  const [editSaving, setEditSaving] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Clients not yet in this group
  const availableClients = useMemo(() => {
    const memberClientIds = new Set(members.map((m: any) => m.client_id));
    return allClients.filter((c: any) => !memberClientIds.has(c.id) && c.status !== "archived");
  }, [allClients, members]);

  // Analytics
  const analytics = useMemo(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s: any) => s.appointments?.status === "completed").length;
    const clientStats = new Map<string, { name: string; attended: number; absent: number; skipped: number }>();
    
    for (const att of allAttendance) {
      const clientId = att.client_id;
      const name = att.clients?.name || "Unknown";
      if (!clientStats.has(clientId)) {
        clientStats.set(clientId, { name, attended: 0, absent: 0, skipped: 0 });
      }
      const stat = clientStats.get(clientId)!;
      if (att.status === "attended") stat.attended++;
      else if (att.status === "absent") stat.absent++;
      else if (att.status === "skipped") stat.skipped++;
    }

    return { totalSessions, completedSessions, clientStats: Array.from(clientStats.entries()) };
  }, [sessions, allAttendance]);

  const openEdit = () => {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description || "", status: group.status, bill_present: group.bill_present ?? true, bill_absent: group.bill_absent ?? false });
    setSettings(settingsFromGroup(group));
    setEditOpen(true);
  };

  const handleArchiveToggle = async () => {
    if (!id || !group) return;
    const archiving = group.lifecycle_status !== "archived";
    try {
      await updateGroup.mutateAsync({ id, lifecycle_status: archiving ? "archived" : "active", archived_at: archiving ? new Date().toISOString() : null, status: archiving ? "inactive" : "active", ...(archiving ? { publication_status: "unpublished" } : {}) });
    } catch (e: any) { toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" }); }
  };

  const handleCopy = async () => {
    if (!group) return;
    try {
      const created: any = await createGroup.mutateAsync({ name: `${group.name} (${gx.copyOf})`.slice(0, 100), description: group.description, ...settingsToPatch(settingsFromGroup(group)), bill_present: group.bill_present, bill_skipped: group.bill_skipped, copied_from_group_id: group.id });
      navigate(`/groups/${created.id}`);
    } catch (e: any) { toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" }); }
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm.name.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await updateGroup.mutateAsync({ id, name: editForm.name.trim(), description: editForm.description.trim(), status: editForm.status, bill_present: editForm.bill_present, ...settingsToPatch(settings) });
      toast({ title: t("groups.updated") });
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const toggleClientSelection = useCallback((clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }, []);

  const handleAddMembers = async () => {
    if (!id || selectedClientIds.size === 0) return;
    try {
      for (const clientId of selectedClientIds) {
        await addMember.mutateAsync({ groupId: id, clientId });
      }
      toast({ title: t("groups.memberAdded") });
      setSelectedClientIds(new Set());
      setMemberSearch("");
      setAddMemberOpen(false);
    } catch (e: any) {
      const isDupe = e.message?.includes("duplicate") || e.message?.includes("unique");
      toast({ title: t("common.error"), description: describeError(isDupe ? t("groups.memberAlreadyExists") : e.message), variant: "destructive" });
    }
  };

  const filteredAvailableClients = useMemo(() => {
    if (!memberSearch.trim()) return availableClients;
    const q = memberSearch.toLowerCase();
    return availableClients.filter(c => c.name.toLowerCase().includes(q));
  }, [availableClients, memberSearch]);

  const handleRemoveMember = async () => {
    if (!removeMemberId || !id) return;
    try {
      await removeMember.mutateAsync({ id: removeMemberId, groupId: id });
      toast({ title: t("groups.memberRemoved") });
      setRemoveMemberId(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast({ title: t("groups.deleted") });
      navigate("/groups");
    } catch (e: any) {
      {
        toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" });
      }
      setDeleteOpen(false);
    }
  };

  if (groupLoading) {
    return <AppLayout><ListSkeleton variant="rows" count={5} /></AppLayout>;
  }

  if (!group) {
    return <AppLayout><p className="text-muted-foreground text-center py-12">{t("groups.notFound")}</p></AppLayout>;
  }



  const gt = groupTabsText(lang);
  const serviceName = sessions.find((s: any) => s.appointments?.services?.name)?.appointments?.services?.name;
  const TABS = ["overview", "applications", "participants", "form", "analytics"] as const;
  const tabParam = searchParams.get("tab");
  const activeTab = (TABS as readonly string[]).includes(tabParam ?? "") ? tabParam! : "overview";
  const setTab = (v: string) => { const next = new URLSearchParams(searchParams); if (v === "overview") next.delete("tab"); else next.set("tab", v); setSearchParams(next, { replace: true }); };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Shared header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" aria-label={t("common.back")} onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground break-words">{group.name}</h1>
              <Badge variant={group.status === "active" ? "default" : "secondary"}>
                {group.status === "active" ? t("groups.active") : t("groups.inactive")}
              </Badge>
              {group.lifecycle_status === "archived" && <Badge variant="secondary">{gx.archived}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {group.group_type === "supervision" ? gx.supervision : gt.regular}
              {serviceName ? ` · ${serviceName}` : ""}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={gt.actions}><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEdit}><Pencil className="h-4 w-4 mr-2" /> {t("common.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} disabled={createGroup.isPending}><CopyPlus className="h-4 w-4 mr-2" /> {gx.copyGroup}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchiveToggle}><Archive className="h-4 w-4 mr-2" /> {group.lifecycle_status === "archived" ? gx.unarchive : gx.archive}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-2" /> {t("groups.deleteGroup")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto h-auto">
            <TabsTrigger value="overview"><Home className="h-4 w-4 mr-1.5" />{gt.overview}</TabsTrigger>
            <TabsTrigger value="applications"><Inbox className="h-4 w-4 mr-1.5" />{gt.applications}</TabsTrigger>
            <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1.5" />{gt.participants}</TabsTrigger>
            <TabsTrigger value="form"><FileText className="h-4 w-4 mr-1.5" />{gt.form}</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />{gt.analytics}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="bg-card rounded-xl border border-border p-5 space-y-2">
              <h2 className="text-lg font-semibold">{gt.about}</h2>
              {group.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{group.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs">
                {group.capacity && <Badge variant="outline">{gx.capacity}: {group.capacity}</Badge>}
                {group.price_amount != null && <Badge variant="outline">{gx.price}: {cs}{Number(group.price_amount).toFixed(2)}</Badge>}
                <Badge variant="outline">{group.bill_absent ? gx.chargeAbsent : gx.noChargeAbsent}</Badge>
              </div>
            </div>
            <GroupMeetingsSection group={group} sessions={sessions} membersCount={members.length} onAttendance={setAttendanceSessionId} />
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <GroupRegistrationsCard group={group} />
          </TabsContent>

          <TabsContent value="participants" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setMessageOpen(true)} disabled={members.length === 0}>
                <Mail className="h-4 w-4 mr-1" /> {gx.sendMessage}
              </Button>
            </div>
            <GroupMembersSection group={group} members={members} membersLoading={membersLoading} onAdd={() => setAddMemberOpen(true)} onRemove={setRemoveMemberId} />
          </TabsContent>

          <TabsContent value="form" className="space-y-6 mt-6">
            <GroupPublicationCard group={group} />
            <GroupFormEditorCard group={group} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <GroupFinanceCard groupId={group.id} applications={regs.length} confirmedPeople={uniqueConfirmedParticipants(regs)} />
        {/* Analytics Section */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("groups.analytics")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{analytics.totalSessions}</p>
              <p className="text-xs text-muted-foreground">{t("groups.totalSessions")}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{analytics.completedSessions}</p>
              <p className="text-xs text-muted-foreground">{t("groups.completedSessions")}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">{t("groups.currentMembers")}</p>
            </div>
          </div>
          {analytics.clientStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium text-muted-foreground">{t("groups.participant")}</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">{t("groups.attended")}</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">{t("groups.absent")}</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">{t("groups.skipped")}</th>
                    <th className="text-center p-2 font-medium text-muted-foreground">{t("groups.attendanceRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.clientStats.map(([clientId, stat]) => {
                    const total = stat.attended + stat.absent + stat.skipped;
                    const rate = total > 0 ? Math.round((stat.attended / total) * 100) : 0;
                    return (
                      <tr key={clientId} className="border-b border-border last:border-0">
                        <td className="p-2 font-medium">{stat.name}</td>
                        <td className="p-2 text-center text-success">{stat.attended}</td>
                        <td className="p-2 text-center text-destructive">{stat.absent}</td>
                        <td className="p-2 text-center text-warning">{stat.skipped}</td>
                        <td className="p-2 text-center">
                          <Badge variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "destructive"} className="text-xs">
                            {rate}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-3">{t("groups.noAttendanceData")}</p>
          )}
        </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("groups.editGroup")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("groups.groupName")} *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.description")}</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("groups.active")}</SelectItem>
                  <SelectItem value="inactive">{t("groups.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <GroupSettingsFields value={settings} onChange={setSettings} />
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm">{t("groups.billPresent")}</span>
              <Switch checked={editForm.bill_present} onCheckedChange={v => setEditForm(f => ({ ...f, bill_present: v }))} />
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={!editForm.name.trim() || editSaving}>
              {editSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={(open) => {
        setAddMemberOpen(open);
        if (!open) { setSelectedClientIds(new Set()); setMemberSearch(""); }
      }}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{t("groups.addMember")}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {availableClients.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noAvailableClients")}</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("groups.searchPlaceholder")}
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {selectedClientIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedClientIds).map(cid => {
                      const client = allClients.find(c => c.id === cid);
                      return client ? (
                        <Badge key={cid} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleClientSelection(cid)}>
                          {client.name}
                          <X className="h-3 w-3" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto max-h-[40vh] border rounded-lg divide-y divide-border">
                  {filteredAvailableClients.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noResults") || "No clients found"}</p>
                  ) : (
                    filteredAvailableClients.map(c => {
                      const selected = selectedClientIds.has(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleClientSelection(c.id)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                            selected ? "bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                            selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          )}>
                            {selected && <Check className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            {(c.phone || c.email) && (
                              <p className="text-xs text-muted-foreground truncate">{c.phone || c.email}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <Button onClick={handleAddMembers} className="w-full" disabled={selectedClientIds.size === 0 || addMember.isPending}>
                  {addMember.isPending ? t("common.saving") : `${t("groups.addMember")} (${selectedClientIds.size})`}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <ConfirmDeleteDialog
        open={!!removeMemberId}
        onOpenChange={() => setRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title={t("groups.removeMemberTitle")}
        description={t("groups.removeMemberDesc")}
        loading={removeMember.isPending}
      />

      {/* Delete Group Confirmation */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteGroup}
        title={t("groups.deleteGroupTitle")}
        description={gx.deleteDesc}
        loading={deleteGroup.isPending}
      />

      {/* Attendance Dialog */}
      <GroupMessageDialog groupId={group.id} open={messageOpen} onOpenChange={setMessageOpen} />

      {attendanceSessionId && (
        <GroupAttendanceDialog
          supervision={group.group_type === "supervision"}
          groupSessionId={attendanceSessionId}
          open={!!attendanceSessionId}
          onOpenChange={(open) => { if (!open) setAttendanceSessionId(null); }}
        />
      )}
    </AppLayout>
  );
}
