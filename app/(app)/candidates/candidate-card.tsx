"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveCandidate, rejectCandidate } from "./actions";

export interface CandidateData {
  id: string;
  type: "nová" | "update";
  diff: string | null;
  source_url: string | null;
  proposed: Record<string, unknown>;
  tracker: { id: string; title: string; status: string; effective_date: string | null } | null;
}

export function CandidateCard({ item }: { item: CandidateData }) {
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          <Badge variant={item.type === "nová" ? "default" : "secondary"} className="mr-2">
            {item.type}
          </Badge>
          {item.diff ?? "Kandidát"}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await approveCandidate(item.id);
                toast.success("Schváleno");
              })
            }
          >
            {item.type === "update" ? "Sloučit" : "Schválit"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await rejectCandidate(item.id);
                toast.success("Zamítnuto");
              })
            }
          >
            Zamítnout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {item.tracker && (
          <div className="rounded-md border p-3 text-sm">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Co už máš v trackeru</div>
            <div className="font-medium">{item.tracker.title}</div>
            <div className="text-muted-foreground">
              status: {item.tracker.status} · účinnost: {item.tracker.effective_date ?? "—"}
            </div>
          </div>
        )}
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Co agent navrhuje</div>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(item.proposed, null, 2)}
          </pre>
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="text-xs underline">
              zdroj
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
