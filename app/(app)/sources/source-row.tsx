"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { setSourceActive, setSourceUrl, setSourceType } from "./actions";

export interface SourceRowData {
  id: string;
  name: string;
  url: string;
  group: "A" | "B";
  category: string;
  type: "rss" | "html";
  active: boolean;
}

export function SourceRow({ item }: { item: SourceRowData }) {
  const [pending, start] = useTransition();

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">{item.category}</div>
      </TableCell>
      <TableCell>
        <Badge variant={item.group === "A" ? "default" : "secondary"}>{item.group}</Badge>
      </TableCell>
      <TableCell>
        <select
          defaultValue={item.type}
          disabled={pending}
          className="rounded-md border bg-transparent px-2 py-1 text-sm"
          onChange={(e) =>
            start(async () => {
              await setSourceType(item.id, e.target.value as "rss" | "html");
              toast.success("Typ uložen");
            })
          }
        >
          <option value="rss">rss</option>
          <option value="html">html</option>
        </select>
      </TableCell>
      <TableCell className="min-w-72">
        <Input
          type="url"
          defaultValue={item.url}
          disabled={pending}
          onBlur={(e) => {
            if (e.target.value === item.url) return;
            start(async () => {
              await setSourceUrl(item.id, e.target.value);
              toast.success("URL uloženo");
            });
          }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={item.active}
          disabled={pending}
          onCheckedChange={(v) =>
            start(async () => {
              await setSourceActive(item.id, v);
              toast.success(v ? "Aktivováno" : "Deaktivováno");
            })
          }
        />
      </TableCell>
    </TableRow>
  );
}
