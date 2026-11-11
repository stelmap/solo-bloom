import { memo, type ReactNode } from "react";
import { Phone, Mail, MoreVertical, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
const getArchiveReasonLabel = (reason: string, t: any) => {
  const keyMap: Record<string, string> = {
    completed: "archive.reason.completed",
    client_paused: "archive.reason.clientPaused",
    client_stopped: "archive.reason.clientStopped",
    other: "archive.reason.other",
  };
  return t(keyMap[reason] ?? "archive.reason.other");
};

const getArchiveReasonVariant = (reason: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (reason) {
    case "completed": return "default";
    case "client_paused": return "outline";
    case "client_stopped": return "destructive";
    default: return "secondary";
  }
};

export const ClientRegistryCard = memo(({ client, onNavigate, onDelete, onArchive, onUnarchive, t, badge }: {
  client: any; onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (client: any) => void;
  onUnarchive?: (id: string) => void;
  t: any; badge?: ReactNode;
}) => {
  const isArchived = client.status === "archived";
  return (
  <div
    role="button" tabIndex={0} aria-label={client.name}
    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onNavigate(client.id); } }}
    onClick={() => onNavigate(client.id)}
    className={`bg-card rounded-xl border border-border p-5 animate-fade-in group relative cursor-pointer hover:border-primary/30 hover:shadow-md transition-all ${isArchived ? "opacity-75" : ""}`}
  >
    {(onDelete || onArchive || onUnarchive) && (
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {!isArchived && onArchive && (
              <DropdownMenuItem onClick={() => onArchive(client)}>
                <Archive className="h-3.5 w-3.5 mr-2" /> {t("archive.action.archive")}
              </DropdownMenuItem>
            )}
            {isArchived && onUnarchive && (
              <DropdownMenuItem onClick={() => onUnarchive(client.id)}>
                <ArchiveRestore className="h-3.5 w-3.5 mr-2" /> {t("archive.action.unarchive")}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("common.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
    <div className="flex items-start gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
        {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
          {badge}
          {isArchived && (
            <Badge variant={getArchiveReasonVariant(client.archive_reason)} className="text-[10px]">
              {getArchiveReasonLabel(client.archive_reason, t)}
            </Badge>
          )}
        </div>
      </div>
    </div>
    <div className="space-y-1.5 text-sm">
      {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="truncate">{client.phone}</span></div>}
      {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{client.email}</span></div>}
      
    </div>
    {client.notes && <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2">📝 {client.notes}</p>}
  </div>
  );
});
ClientRegistryCard.displayName = "ClientCard";

