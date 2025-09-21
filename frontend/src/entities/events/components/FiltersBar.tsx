import type { AttackType } from "@/shared/types";

const ALL: AttackType[] = ["success", "brute_force", "port_scan", "error_flood"];

type Props = {
  types: AttackType[];
  setTypes: (v: AttackType[]) => void;
  minScore: number;
  setMinScore: (n: number) => void;
  ip: string;
  setIp: (s: string) => void;
  hideBlocked: boolean;
  setHideBlocked: (b: boolean) => void;
  onRefresh?: () => void;
};

export function FiltersBar(p: Props) {
  function toggle(t: AttackType) {
    if (p.types.includes(t)) p.setTypes(p.types.filter(x => x !== t));
    else p.setTypes([...p.types, t]);
  }

  return (
    <div className="filters">
      <div className="statuses">
        {ALL.map((t) => (
          <button
            key={t}
            className={"chip" + (p.types.includes(t) ? " chip--active" : "")}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="range">
        <label>Min score</label>
        <input type="range" min={0} max={20} value={p.minScore} onChange={(e) => p.setMinScore(Number(e.target.value))} />
        <span className="range-value">{p.minScore}</span>
      </div>

      <input className="input" placeholder="Search Source IP" value={p.ip} onChange={(e) => p.setIp(e.target.value)} />

      <label className="check">
        <input type="checkbox" checked={p.hideBlocked} onChange={(e) => p.setHideBlocked(e.target.checked)} />
        Hide blocked
      </label>

      <button className="btn" onClick={p.onRefresh}>Refresh</button>
    </div>
  );
}
