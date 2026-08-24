import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable({ headers, rows, empty = "No records available" }: { headers: string[]; rows: ReactNode[][]; empty?: string }) {
  return (
    <Card className="overflow-hidden">
      {rows.length ? (
        <Table>
          <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{rows.map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
      ) : (
        <div className="grid min-h-48 place-items-center px-6 text-center"><div><p className="font-medium">{empty}</p><p className="mt-1 text-sm text-muted-foreground">Records will appear here when they are available.</p></div></div>
      )}
    </Card>
  );
}
