import { useGetEvidenceQuery } from "../api";


type Props = { ip?: string; onClose: () => void };

export function EvidenceDrawer({ ip, onClose }: Props) {
  const { data, isFetching, isError } = useGetEvidenceQuery(
    { ip: ip! },
    { skip: !ip }
  );
  if (!ip) return null;

  return (
    <div className="drawer-backdrop">
      <div className="drawer">
        <div className="drawer-head">
          <h2 className="title">Evidence — {ip}</h2>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        {isFetching && <div>Loading…</div>}
        {isError && <div className="error">Failed to load evidence</div>}
        {data && (
          <div className="drawer-list">
            {data.items.map((ev) => (
              <div key={ev.id} className="card">
                <div className="muted">
                  {new Date(ev.timestamp).toLocaleString()}
                </div>
                <div>
                  {ev.status} · 1h: {ev.count_1h} · score: {ev.score}
                </div>
                <div className="muted">
                  user: {ev.user} • #{ev.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
