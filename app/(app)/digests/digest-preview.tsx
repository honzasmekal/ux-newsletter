"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DigestPreview({ weekOf, html }: { weekOf: string; html: string | null }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={!html}>
            Náhled
          </Button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Digest — týden {weekOf}</DialogTitle>
        </DialogHeader>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-muted-foreground">Prázdný digest.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
