import React from "react";
import type { Event } from "@/shared/types";
import { useGetEvidenceQuery } from "../api";

type Props = { event?: Event; onClose: () => void };

export default function RawLogsDrawer({ event, onClose }: Props) {
  const ip = event?.ip;
  const { data, isFetching, isError } = useGetEvidenceQuery({ ip: ip! }, { skip: !ip });

  if (!event) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2 className="title">Raw Logs — {event.ip}</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="muted">Selected event JSON</div>
          <pre style={{ margin: 0, overflowX: "auto" }}>
{JSON.stringify(event, null, 2)}
          </pre>
        </div>

        {isFetching && <div>Loading…</div>}
        {isError && <div className="error">Failed to load evidence</div>}

        {data && (
          <>
            <div className="muted" style={{ margin: "8px 0" }}>
              Last related events by IP ({data.items.length})
            </div>
            <div className="drawer-list">
              {data.items.map(ev => (
                <div key={ev.id} className="card">
                  <div className="muted">{new Date(ev.timestamp).toLocaleString()}</div>
                  <div>{ev.type} · score: {ev.score} · {ev.ip}</div>
                  <div className="muted">{ev.snippet}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

