"use client";

import { FilePdfIcon } from "@phosphor-icons/react";
import { Button } from "./ui";

/** Opens the browser print dialog; "Salva come PDF" produces the file (layout in globals.css @media print). */
export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <FilePdfIcon size={14} aria-hidden />
      Esporta PDF
    </Button>
  );
}
