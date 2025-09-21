import React from "react";
import { useGetEventsQuery } from "../entities/events/api";
import { EventsTable } from "../entities/events/components/EventsTable";
import RawLogsDrawer from "../entities/events/components/RawLogsDrawer";
import { FiltersBar } from "../entities/events/components/FiltersBar";
import AlertsOverTime from "../entities/events/components/AlertsOverTime";
import type { AttackType, Event } from "../shared/types";
import Hero from "@/components/Hero";

export default function EventsPage() {
  const [page, setPage] = React.useState(0);
  const [size] = React.useState(20);

  const [types, setTypes] = React.useState<AttackType[]>([
    "brute_force", "port_scan", "error_flood", "success",
  ]);

  const [minScore, setMinScore] = React.useState(0);
  const [ip, setIp] = React.useState("");
  const [hideBlocked, setHideBlocked] = React.useState(true);

  const [selected, setSelected] = React.useState<Event | undefined>();

  const { data, isFetching, refetch } = useGetEventsQuery({
    types, minScore, ip, page, size, hideBlocked,
  });

  // автообновление каждые ~1.5 сек
  React.useEffect(() => {
    const id = setInterval(() => refetch(), 1500);
    return () => clearInterval(id);
  }, [refetch]);

  const items = data?.items ?? [];

  const total = data?.total ?? 0;
  const alerts = items.filter(i => i.score >= 10).length;
  const critical = items.filter(i => i.score >= 14).length;
  const suspiciousPct = total > 0
    ? Math.round((items.filter(i => i.score >= 10).length / Math.max(1, items.length)) * 100)
    : 0;

  const threatIndicator = critical > 0 ? "🔴 High"
    : alerts > 0 ? "🟠 Medium"
    : "🟢 Low";

  return (
    <>
    <Hero />  
    <div id="dashboard" className="page">
      <h1 className="h1">Security Live Dashboard</h1>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="muted">Всего событий</div>
          <div className="kpi-val">{total}</div>
        </div>
        <div className="kpi">
          <div className="muted">Alerts (M/C)</div>
          <div className="kpi-val">{alerts} / {critical}</div>
        </div>
        <div className="kpi">
          <div className="muted">% подозрительных</div>
          <div className="kpi-val">{suspiciousPct}%</div>
        </div>
        <div className="kpi">
          <div className="muted">Уровень угроз</div>
          <div className="kpi-val">{threatIndicator}</div>
        </div>
      </div>

      <FiltersBar
        types={types}
        setTypes={setTypes}
        minScore={minScore}
        setMinScore={setMinScore}
        ip={ip}
        setIp={setIp}
        hideBlocked={hideBlocked}
        setHideBlocked={setHideBlocked}
        onRefresh={() => refetch()}
      />

      {isFetching && <div className="muted">Updating…</div>}

      <div style={{ marginBottom: 12 }}>
        <AlertsOverTime data={items} minutes={10} />
      </div>

      <EventsTable
        data={items}
        total={data?.total ?? 0}
        page={page}
        size={size}
        onPageChange={setPage}
        onRowOpenRaw={(r) => setSelected(r)}
      />

      <RawLogsDrawer event={selected} onClose={() => setSelected(undefined)} />
    </div>
  </>
  );
}
