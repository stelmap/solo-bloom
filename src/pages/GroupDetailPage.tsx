import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Pencil, Users, UserPlus, UserMinus, Calendar,
  Check, X, MinusCircle, BarChart3, Save, Trash2, Receipt,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id);
  const { data: sessions = [] } = useGroupSessions(id);
  const { data: allAttendance = [] } = useGroupAllAttendance(id);
  const { data: allClients = [] } = useClients();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const updateMemberPrice = useUpdateGroupMemberPrice();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", status: "active", bill_present: true, bill_absent: false, bill_skipped: false });
  const [editSaving, setEditSaving] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Clients not yet in this group
  const availableClients = useMemo(() => {
    const memberClientIds = new Set(members.map((m: any) => m.client_id));
    return allClients.filter(c => !memberClientIds.has(c.id));
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
    setEditForm({ name: group.name, description: group.description || "", status: group.status, bill_present: group.bill_present ?? true, bill_absent: group.bill_absent ?? false, bill_skipped: group.bill_skipped ?? false });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm.name.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await updateGroup.mutateAsync({ id, name: editForm.name.trim(), description: editForm.description.trim(), status: editForm.status, bill_present: editForm.bill_present, bill_absent: editForm.bill_absent, bill_skipped: editForm.bill_skipped });
      toast({ title: t("groups.updated") });
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!id || !selectedClientId) return;
    try {
      await addMember.mutateAsync({ groupId: id, clientId: selectedClientId });
      toast({ title: t("groups.memberAdded") });
      setSelectedClientId("");
      setAddMemberOpen(false);
    } catch (e: any) {
      const isDupe = e.message?.includes("duplicate") || e.message?.includes("unique");
      toast({ title: t("common.error"), description: isDupe ? t("groups.memberAlreadyExists") : e.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId || !id) return;
    try {
      await removeMember.mutateAsync({ id: removeMemberId, groupId: id });
      toast({ title: t("groups.memberRemoved") });
      setRemoveMemberId(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast({ title: t("groups.deleted") });
      navigate("/groups");
    } catch (e: any) {
      if (e.message === "GROUP_HAS_SESSIONS") {
        toast({ title: t("common.error"), description: t("groups.cannotDeleteHasSessions"), variant: "destructive" });
      } else {
        toast({ title: t("common.error"), description: e.message, variant: "destructive" });
      }
      setDeleteOpen(false);
    }
  };

  if (groupLoading) {
    return <AppLayout><p className="text-muted-foreground text-center py-12">{t("common.loading")}</p></AppLayout>;
  }

  if (!group) {
    return <AppLayout><p className="text-muted-foreground text-center py-12">{t("groups.notFound")}</p></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground truncate">{group.name}</h1>
              <Badge variant={group.status === "active" ? "default" : "secondary"}>
                {group.status === "active" ? t("groups.active") : t("groups.inactive")}
              </Badge>
            </div>
            {group.description && <p className="text-muted-foreground text-sm mt-1">{group.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-1" /> {t("common.edit")}
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> {t("groups.deleteGroup")}
            </Button>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("groups.members")} ({members.length})</h2>
            </div>
            <Button size="sm" onClick={() => setAddMemberOpen(true)} disabled={group.status === "inactive"}>
              <UserPlus className="h-4 w-4 mr-1" /> {t("groups.addMember")}
            </Button>
          </div>
          {membersLoading ? (
            <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noMembers")}</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {m.clients?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.clients?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("groups.joinedAt")}: {format(new Date(m.joined_at), "dd.MM.yyyy")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveMemberId(m.id)}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessions Section */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("groups.sessions")} ({sessions.length})</h2>
          </div>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noSessions")}</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((gs: any) => {
                const apt = gs.appointments;
                if (!apt) return null;
                const dateStr = format(new Date(apt.scheduled_at), "dd.MM.yyyy HH:mm");
                return (
                  <div key={gs.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{apt.services?.name || t("groups.session")} — {dateStr}</p>
                      <p className="text-xs text-muted-foreground">{apt.duration_minutes} {t("common.minutes")} · {cs}{Number(apt.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={apt.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {apt.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setAttendanceSessionId(gs.id)}>
                        {t("groups.attendance")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
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
            <div className="space-y-3">
              <div>
                <Label className="flex items-center gap-2"><Receipt className="h-4 w-4" /> {t("groups.billingRules")}</Label>
                <p className="text-xs text-muted-foreground mt-1">{t("groups.billingRulesDesc")}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">{t("groups.billPresent")}</span>
                <Switch checked={editForm.bill_present} onCheckedChange={v => setEditForm(f => ({ ...f, bill_present: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">{t("groups.billAbsent")}</span>
                <Switch checked={editForm.bill_absent} onCheckedChange={v => setEditForm(f => ({ ...f, bill_absent: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm">{t("groups.billSkipped")}</span>
                <Switch checked={editForm.bill_skipped} onCheckedChange={v => setEditForm(f => ({ ...f, bill_skipped: v }))} />
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={!editForm.name.trim() || editSaving}>
              {editSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("groups.addMember")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {availableClients.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noAvailableClients")}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t("groups.selectClient")}</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger><SelectValue placeholder={t("groups.selectClient")} /></SelectTrigger>
                    <SelectContent>
                      {availableClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMember} className="w-full" disabled={!selectedClientId || addMember.isPending}>
                  {addMember.isPending ? t("common.saving") : t("groups.addMember")}
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
        description={t("groups.deleteGroupDesc")}
        loading={deleteGroup.isPending}
      />

      {/* Attendance Dialog */}
      {attendanceSessionId && (
        <AttendanceDialog
          groupSessionId={attendanceSessionId}
          open={!!attendanceSessionId}
          onOpenChange={(open) => { if (!open) setAttendanceSessionId(null); }}
        />
      )}
    </AppLayout>
  );
}

function AttendanceDialog({ groupSessionId, open, onOpenChange }: { groupSessionId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: attendance = [], isLoading } = useGroupAttendance(groupSessionId);
  const updateAttendance = useUpdateAttendance();

  const handleStatusChange = async (attId: string, newStatus: string) => {
    try {
      await updateAttendance.mutateAsync({ id: attId, status: newStatus, groupSessionId });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const STATUS_ICON: Record<string, typeof Check> = { attended: Check, absent: X, skipped: MinusCircle };
  const STATUS_COLOR: Record<string, string> = {
    attended: "bg-success/10 border-success/30 text-success",
    absent: "bg-destructive/10 border-destructive/30 text-destructive",
    skipped: "bg-warning/10 border-warning/30 text-warning",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("groups.manageAttendance")}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-4">{t("common.loading")}</p>
        ) : attendance.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noAttendanceRecords")}</p>
        ) : (
          <div className="space-y-3">
            {attendance.map((att: any) => {
              const Icon = STATUS_ICON[att.status] || Check;
              return (
                <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                      {att.clients?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-medium">{att.clients?.name}</span>
                  </div>
                  <Select value={att.status} onValueChange={(v) => handleStatusChange(att.id, v)}>
                    <SelectTrigger className={cn("w-32 h-8 text-xs border", STATUS_COLOR[att.status] || "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attended">{t("groups.attended")}</SelectItem>
                      <SelectItem value="absent">{t("groups.absent")}</SelectItem>
                      <SelectItem value="skipped">{t("groups.skipped")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
