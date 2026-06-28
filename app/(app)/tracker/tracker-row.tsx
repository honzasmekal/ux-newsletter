"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { setConfirmed, setEffectiveDate } from "./actions";

export interface TrackerRowData {
  id: string;
  title: string;
  status: string;
  effective_date: string | null;
  remediation_weight: string;
  fired_flags: string[];
  confirmed: boolean;
}

export function TrackerRow({ item }: { item: TrackerRowData }) {
  const [pending, start] = useTransition();

  return (
    <TableRow className={item.confirmed ? "" : "opacity-70"}>
      <TableCell className="max-w-md">
        <div className="font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground">{item.id}</div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{item.status}</Badge>
      </TableCell>
      <TableCell>{item.remediation_weight}</TableCell>
      <TableCell>
        <Input
          type="date"
          defaultValue={item.effective_date ?? ""}
          disabled={pending}
          className="w-40"
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v === (item.effective_date ?? null)) return;
            start(async () => {
              await setEffectiveDate(item.id, v);
              toast.success("Datum uloženo");
            });
          }}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.fired_flags.length ? item.fired_flags.join(", ") : "—"}
      </TableCell>
      <TableCell>
        <Switch
          checked={item.confirmed}
          disabled={pending}
          onCheckedChange={(v) =>
            start(async () => {
              await setConfirmed(item.id, v);
              toast.success(v ? "Potvrzeno" : "Zrušeno potvrzení");
            })
          }
        />
      </TableCell>
    </TableRow>
  );
}
