import React from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useBlockIpMutation, useUnblockIpMutation } from "../api";
import type { Event } from "@/shared/types";

type Props = {
  data: Event[];
  total: number;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onRowOpenRaw: (row: Event) => void;
};

function riskDot(score: number) {
  if (score >= 14) return "🔴";
  if (score >= 10) return "🟠";
  return "🟢";
}

export function EventsTable({ data, total, page, size, onPageChange, onRowOpenRaw }: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "score", desc: true }]);
  const [blockIp] = useBlockIpMutation();
  const [unblockIp] = useUnblockIpMutation();

  const columns = React.useMemo<ColumnDef<Event>[]>(() => [
    { accessorKey: "timestamp", header: "Timestamp", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(), },
    { accessorKey: "ip", header: "Source IP" },
    { accessorKey: "type", header: "Type" },
    { id: "risk", header: "Risk", cell: ({ row }) => <span title={`score=${row.original.score}`}>{riskDot(row.original.score)}</span> },
    { accessorKey: "snippet", header: "Event snippet", size: 480, cell: ({ getValue }) => <span style={{ whiteSpace: "nowrap" }}>{getValue<string>()}</span> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="actions">
            {!r.blocked ? (
              <button className="btn" onClick={() => blockIp({ ip: r.ip })}>Block</button>
            ) : (
              <button className="btn" onClick={() => unblockIp({ ip: r.ip })}>Unblock</button>
            )}
            <button className="btn" onClick={() => onRowOpenRaw(r)}>Raw</button>
          </div>
        );
      },
    },
  ], [blockIp, unblockIp, onRowOpenRaw]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageCount = Math.max(1, Math.ceil(total / size));

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()} className="th">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => onRowOpenRaw(r.original)}>
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className="td">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span> Page {page + 1} / {pageCount} </span>
        <div className="pager-buttons">
          <button className="btn" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>Prev</button>
          <button className="btn" onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))} disabled={page + 1 >= pageCount}>Next</button>
        </div>
      </div>
    </div>
  );
}
