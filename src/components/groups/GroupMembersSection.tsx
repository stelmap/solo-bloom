import { Button } from "@/components/ui/button";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/i18n/LanguageContext";

export function GroupMembersSection({ group, members, membersLoading, onAdd, onRemove }: {
  group: any; members: any[]; membersLoading: boolean; onAdd: () => void; onRemove: (memberId: string) => void;
}) {
  const { t } = useLanguage();
  return (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("groups.members")} ({members.length}{group.capacity ? `/${group.capacity}` : ""})</h2>
            </div>
            <Button size="sm" onClick={() => onAdd()} disabled={group.status === "inactive"}>
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
                  <Button variant="ghost" size="icon" aria-label={t("common.delete")} className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(m.id)}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
  );
}
