"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { setRecipientActive, deleteRecipient } from "./actions";

export interface RecipientRowData {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
}

export function RecipientRow({ item }: { item: RecipientRowData }) {
  const [pending, start] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{item.email}</TableCell>
      <TableCell>{item.name ?? "—"}</TableCell>
      <TableCell>
        <Switch
          checked={item.active}
          disabled={pending}
          onCheckedChange={(v) =>
            start(async () => {
              await setRecipientActive(item.id, v);
              toast.success(v ? "Aktivní" : "Neaktivní");
            })
          }
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteRecipient(item.id);
              toast.success("Smazáno");
            })
          }
        >
          Smazat
        </Button>
      </TableCell>
    </TableRow>
  );
}
