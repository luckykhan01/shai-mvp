import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { EventsResponse, EvidenceResponse, Event } from "@/shared/types";
import { MOCK_EVENTS } from "@/mocks/data";

let items: Event[] = [...MOCK_EVENTS.items];
const blockedByIp = new Set<string>(items.filter(i => i.blocked).map(i => i.ip));

function sleep(ms = 200) { return new Promise(r => setTimeout(r, ms)); }

function randomEvent(): Event {
  const now = new Date().toISOString();
  const ips = ["185.23.54.12","185.23.54.13","185.23.54.41","185.23.54.88","10.0.0.19","10.0.0.22"];
  const types: Event["type"][] = ["brute_force","port_scan","error_flood","success"];
  const t = types[Math.floor(Math.random()*types.length)];
  const score = t === "success" ? 0 : 9 + Math.floor(Math.random()*8);
  const snippets: Record<Event["type"], string[]> = {
    brute_force: [
      "Failed password for admin",
      "Invalid user root",
      "PAM auth error for user guest",
    ],
    port_scan: [
      "UFW BLOCK TCP -> :22,80,443",
      "Port sweep detected on 445/3389",
      "SYN scan rate threshold exceeded",
    ],
    error_flood: [
      "ERROR burst: DB timeout",
      "ERROR flood: circuit breaker open",
      "ERROR spike: 5xx surge",
    ],
    success: [
      "Accepted publickey for service",
      "orders-service INFO processed",
      "auth-service INFO jwt verified",
    ],
  };
  const ip = ips[Math.floor(Math.random()*ips.length)];
  return {
    id: Math.floor(100000 + Math.random()*900000),
    timestamp: now,
    ip,
    type: t,
    score,
    snippet: `${snippets[t][Math.floor(Math.random()*snippets[t].length)]} from ${ip}`,
    blocked: blockedByIp.has(ip),
  };
}

function maybeTick() {
  // С вероятностью ~60% добавим новое событие
  if (Math.random() < 0.6) {
    const ev = randomEvent();
    items = [ev, ...items].slice(0, 500); // ограничим историю
  }
}

function applyFilters(
  data: Event[],
  p: { types?: string[]; minScore?: number; ip?: string; hideBlocked?: boolean }
) {
  let view = [...data];
  if (p.types && p.types.length) view = view.filter(i => p.types!.includes(i.type));
  if (typeof p.minScore === "number") view = view.filter(i => i.score >= p.minScore!);
  if (p.ip && p.ip.trim()) view = view.filter(i => i.ip.includes(p.ip!.trim()));
  if (p.hideBlocked) view = view.filter(i => !i.blocked);
  view.sort((a,b) => (b.score - a.score) || (b.timestamp.localeCompare(a.timestamp)));
  return view;
}

export const eventsApi = createApi({
  reducerPath: "eventsApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Events", "Evidence", "Blocked"],
  endpoints: (build) => ({
    getEvents: build.query<
      EventsResponse,
      { types?: string[]; minScore?: number; ip?: string; page?: number; size?: number; hideBlocked?: boolean }
    >({
      async queryFn(p) {
        await sleep();
        maybeTick();
        const page = p?.page ?? 0;
        const size = p?.size ?? 20;

        items = items.map(it => ({ ...it, blocked: blockedByIp.has(it.ip) }));
        const filtered = applyFilters(items, p ?? {});
        const start = page * size;
        const slice = filtered.slice(start, start + size);

        return { data: { items: slice, total: filtered.length, page, size } };
      },
      providesTags: [{ type: "Events", id: "LIST" }],
    }),

    getEvidence: build.query<EvidenceResponse, { ip: string }>({
      async queryFn({ ip }) {
        await sleep();
        const list = items
          .filter(i => i.ip === ip)
          .sort((a,b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 100);
        return { data: { ip, items: list } };
      },
      providesTags: (res, err, arg) => [{ type: "Evidence", id: arg.ip }],
    }),

    blockIp: build.mutation<{ ok: boolean; ip: string }, { ip: string }>({
      async queryFn({ ip }) {
        await sleep();
        blockedByIp.add(ip);
        items = items.map(i => i.ip === ip ? { ...i, blocked: true } : i);
        return { data: { ok: true, ip } };
      },
      invalidatesTags: (res, err, arg) => [
        { type: "Blocked", id: arg.ip },
        { type: "Events", id: "LIST" },
        { type: "Evidence", id: arg.ip },
      ],
    }),

    unblockIp: build.mutation<{ ok: boolean; ip: string }, { ip: string }>({
      async queryFn({ ip }) {
        await sleep();
        blockedByIp.delete(ip);
        items = items.map(i => i.ip === ip ? { ...i, blocked: false } : i);
        return { data: { ok: true, ip } };
      },
      invalidatesTags: (res, err, arg) => [
        { type: "Blocked", id: arg.ip },
        { type: "Events", id: "LIST" },
        { type: "Evidence", id: arg.ip },
      ],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEvidenceQuery,
  useBlockIpMutation,
  useUnblockIpMutation,
} = eventsApi;
