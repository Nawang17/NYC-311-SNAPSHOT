import {
  Container,
  Title,
  Text,
  Card,
  Group,
  ThemeIcon,
  Skeleton,
  Badge,
  Divider,
  SimpleGrid,
  Alert,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconArrowRight,
  IconSparkles,
  IconBolt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { subDays, format, isValid } from "date-fns";
import { Link } from "react-router";

const SODA = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const PAGE_SIZE = 50000;
const SAFE_MAX = 300000;
const SLEEP_MS = 120;

const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];
const ACCENTS = ["indigo", "teal", "violet", "orange", "grape"];

const dayStartLiteral = (d) => `${format(d, "yyyy-MM-dd")}T00:00:00`;
const dayEndLiteral = (d) => `${format(d, "yyyy-MM-dd")}T23:59:59`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const boroSlug = (b) => b.toLowerCase().replace(/\s+/g, "-");

// --- data fetch (unchanged) ---
async function fetchWindowRange(startDate, endDate) {
  const startLit = dayStartLiteral(startDate);
  const endLit = dayEndLiteral(endDate);
  const where = `created_date between '${startLit}' and '${endLit}'`;

  let total = 0;
  try {
    const c = await axios.get(SODA, {
      params: { $query: `SELECT count(1) WHERE ${where}` },
    });
    total = Number(c.data?.[0]?.count || c.data?.[0]?.count_1 || 0);
  } catch (e) {
    console.error("Count failed:", e?.response?.status, e?.message);
  }

  const rows = [];
  let offset = 0,
    fetched = 0;
  const hardCap = Math.min(total, SAFE_MAX);
  while (fetched < hardCap) {
    const pageLimit = Math.min(PAGE_SIZE, hardCap - fetched);
    const q =
      `SELECT unique_key, created_date, complaint_type, borough, agency_name, location_type, city ` +
      `WHERE ${where} ORDER BY created_date DESC LIMIT ${pageLimit} OFFSET ${offset}`;
    try {
      const r = await axios.get(SODA, { params: { $query: q } });
      const batch = Array.isArray(r.data) ? r.data : [];
      rows.push(...batch);
      fetched += batch.length;
      offset += batch.length;
      if (batch.length < pageLimit) break;
      await sleep(SLEEP_MS);
    } catch (e) {
      if (e?.response?.status === 429) {
        await sleep(500);
        continue;
      }
      console.error("Page fetch failed:", e?.response?.status, e?.message);
      break;
    }
  }
  return { rows, total, capped: total > SAFE_MAX };
}

export default function HomePage() {
  const [thisWeek, setThisWeek] = useState([]);
  const [lastWeek, setLastWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({
    start: null,
    end: null,
    prevStart: null,
    prevEnd: null,
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const now = new Date();
        const last7Start = subDays(now, 7);
        const last7End = now;
        const prev7Start = subDays(now, 14);
        const prev7End = subDays(now, 7);
        const [tw, lw] = await Promise.all([
          fetchWindowRange(last7Start, last7End),
          fetchWindowRange(prev7Start, prev7End),
        ]);
        // store the range for display
        setRange({
          start: last7Start,
          end: last7End,
          prevStart: prev7Start,
          prevEnd: prev7End,
        });
        setThisWeek(tw.rows);
        setLastWeek(lw.rows);
      } catch (e) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- aggregations ----------
  const countBy = (rows, field) => {
    const map = new Map();
    for (const r of rows) {
      const key = r[field] || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  const toShare = (items, total) =>
    items.map((d) => ({ ...d, share: total ? (d.value / total) * 100 : 0 }));

  const totalTW = thisWeek.length;
  const totalLW = lastWeek.length;
  const totalDeltaPct =
    totalLW === 0
      ? totalTW > 0
        ? 100
        : 0
      : ((totalTW - totalLW) / totalLW) * 100;

  const complaintsTW = useMemo(
    () => countBy(thisWeek, "complaint_type"),
    [thisWeek]
  );
  const complaintsLW = useMemo(
    () => countBy(lastWeek, "complaint_type"),
    [lastWeek]
  );

  const complaintDelta = useMemo(() => {
    const lastMap = new Map(complaintsLW.map((x) => [x.name, x.value]));
    return complaintsTW.map((x) => {
      const prev = lastMap.get(x.name) || 0;
      const pct =
        prev === 0 ? (x.value > 0 ? 100 : 0) : ((x.value - prev) / prev) * 100;
      return { ...x, deltaPct: pct };
    });
  }, [complaintsTW, complaintsLW]);

  const topLocationTW = useMemo(
    () => countBy(thisWeek, "location_type")[0] || null,
    [thisWeek]
  );

  const boroughMix = useMemo(() => {
    const arr = toShare(countBy(thisWeek, "borough"), totalTW);
    const order = [...BOROUGHS];
    const known = arr
      .filter((a) => order.includes(a.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    const unknowns = arr.filter((a) => !order.includes(a.name));
    return [...known, ...unknowns];
  }, [thisWeek, totalTW]);

  // -------- interesting facts (as before) --------
  const facts = useMemo(() => {
    if (!thisWeek.length) return [];
    const out = [];
    const byDate = new Map();
    const byHour = new Map();

    for (const r of thisWeek) {
      const d = new Date(r.created_date);
      if (!isValid(d)) continue;
      const ymd = format(d, "yyyy-MM-dd");
      byDate.set(ymd, (byDate.get(ymd) || 0) + 1);
      byHour.set(d.getHours(), (byHour.get(d.getHours()) || 0) + 1);
    }

    const busiestDateEntry = Array.from(byDate.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (busiestDateEntry) {
      const [ymd, count] = busiestDateEntry;
      const dow = format(new Date(ymd + "T00:00:00"), "EEEE");
      const pretty = format(new Date(ymd + "T00:00:00"), "MMM d");
      out.push(
        `Busiest day: ${dow}, ${pretty} (${count.toLocaleString()} reports).`
      );
    }

    const busiestHourEntry = Array.from(byHour.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (busiestHourEntry) {
      const [hour24, count] = busiestHourEntry;
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 < 12 ? "AM" : "PM";
      out.push(
        `Peak hour: ${hour12} ${ampm} (${count.toLocaleString()} reports).`
      );
    }

    const minBaseline = 25;
    const risers = complaintDelta
      .filter((x) => x.value >= minBaseline)
      .sort((a, b) => b.deltaPct - a.deltaPct);
    if (risers[0]) {
      const sign = risers[0].deltaPct >= 0 ? "+" : "";
      out.push(
        `Fastest riser: ${risers[0].name} (${sign}${risers[0].deltaPct.toFixed(
          0
        )}% vs previous 7 days).`
      );
    }

    if (boroughMix.length) {
      const lead = boroughMix.slice().sort((a, b) => b.share - a.share)[0];
      out.push(
        `Most concentrated borough: ${lead.name} (${lead.share.toFixed(1)}%).`
      );
    }

    if (topLocationTW) {
      out.push(
        `Commonest location: ${
          topLocationTW.name
        } (${topLocationTW.value.toLocaleString()} mentions).`
      );
    }
    return out;
  }, [thisWeek, complaintDelta, boroughMix, topLocationTW]);

  const topFacts = useMemo(() => facts.slice(0, 3), [facts]);

  // ---- per-borough cards ----
  const boroTWMap = useMemo(
    () => new Map(countBy(thisWeek, "borough").map((x) => [x.name, x.value])),
    [thisWeek]
  );
  const boroLWMap = useMemo(
    () => new Map(countBy(lastWeek, "borough").map((x) => [x.name, x.value])),
    [lastWeek]
  );
  const topIssueByBorough = useMemo(() => {
    const gb = new Map();
    for (const r of thisWeek) {
      const b = r.borough || "Unknown";
      if (!gb.has(b)) gb.set(b, []);
      gb.get(b).push(r);
    }
    const out = new Map();
    for (const b of BOROUGHS) {
      const rows = gb.get(b) || [];
      const top = countBy(rows, "complaint_type")[0];
      out.set(b, top?.name || "—");
    }
    return out;
  }, [thisWeek]);

  const boroughCards = useMemo(() => {
    return BOROUGHS.map((b, i) => {
      const tw = boroTWMap.get(b) || 0;
      const lw = boroLWMap.get(b) || 0;
      const share = totalTW ? (tw / totalTW) * 100 : 0;
      const deltaPct = lw === 0 ? (tw > 0 ? 100 : 0) : ((tw - lw) / lw) * 100;
      const top = topIssueByBorough.get(b) || "—";
      return { name: b, tw, share, deltaPct, top, accent: ACCENTS[i] };
    });
  }, [boroTWMap, boroLWMap, topIssueByBorough, totalTW]);

  return (
    <Container size="xl" py="xl">
      {error && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          title="Data error"
          color="red"
          mb="md"
        >
          {error}
        </Alert>
      )}

      {/* SUMMARY (rolling last 7 days) */}
      <Card
        withBorder
        radius="lg"
        shadow="sm"
        p="lg"
        mb="lg"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0))",
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} style={{ letterSpacing: -0.3 }}>
              NYC 311 Snapshot
            </Title>

            <Text size="sm" c="dimmed">
              {range.start && range.end
                ? `Last 7 days (${format(range.start, "EEE, MMM d")} - ${format(
                    range.end,
                    "EEE, MMM d"
                  )})`
                : "Last 7d"}
            </Text>
          </div>
          <Badge
            color={totalDeltaPct >= 0 ? "green" : "red"}
            variant="light"
            size="lg"
            tt="none" // disable ALL CAPS (Mantine v7 shorthand)
          >
            {loading ? (
              "…"
            ) : (
              <>
                {totalTW.toLocaleString()} total (
                {totalDeltaPct >= 0 ? "+" : ""}
                {isFinite(totalDeltaPct) ? totalDeltaPct.toFixed(1) : "0"}%
                <span style={{ fontSize: "0.85em", opacity: 0.8 }}>
                  {" "}
                  vs prior 7d
                </span>
                )
              </>
            )}
          </Badge>
        </Group>

        <Divider my="sm" />

        {loading ? (
          <Skeleton height={84} radius="md" />
        ) : totalTW === 0 ? (
          <Text size="sm" c="dimmed">
            No complaints found for the last 7 days.
          </Text>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: 8 }}
          >
            {topFacts.map((f, i) => {
              const leftIcon =
                i === 0 ? (
                  <IconSparkles size={14} color="violet" />
                ) : i === 1 ? (
                  <IconBolt size={14} color="gold" />
                ) : (
                  <IconTrendingUp size={14} color="teal" />
                );
              return (
                <Group key={i} gap={8} align="flex-start" wrap="nowrap">
                  <ThemeIcon size="sm" radius="xl" variant="light" color="gray">
                    {leftIcon}
                  </ThemeIcon>
                  <Text size="sm" style={{ lineHeight: 1.35 }}>
                    {f}
                  </Text>
                </Group>
              );
            })}
          </div>
        )}
      </Card>

      {/* EXPLORE BY BOROUGH */}
      <Card withBorder radius="lg" shadow="sm" p="lg">
        <Group justify="space-between" mb="xs">
          <Title order={4} style={{ letterSpacing: -0.2 }}>
            Explore by Borough
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mb="sm">
          See this week’s counts, week-over-week change, share of city activity,
          and each borough’s top issue.
        </Text>

        {loading ? (
          <Skeleton height={220} radius="md" />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {boroughCards
              .sort((a, b) => b.tw - a.tw)
              .map((b) => {
                const up = b.deltaPct >= 0;
                return (
                  <Card
                    key={b.name}
                    withBorder
                    radius="md"
                    padding="lg"
                    component={Link}
                    to={`/borough/${boroSlug(b.name)}`}
                    style={{
                      textDecoration: "none",
                      transition:
                        "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(0,0,0,0.08)";
                      e.currentTarget.style.borderColor =
                        "var(--mantine-color-gray-5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "var(--mantine-color-gray-4)";
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text fw={700}>{b.name}</Text>
                      <Badge
                        color={up ? "green" : "red"}
                        variant="light"
                        leftSection={
                          <IconTrendingUp
                            size={12}
                            style={{
                              transform: up ? "none" : "rotate(180deg)",
                            }}
                          />
                        }
                      >
                        {up ? "+" : ""}
                        {isFinite(b.deltaPct) ? b.deltaPct.toFixed(0) : "0"}%
                      </Badge>
                    </Group>

                    <Text size="xs" c="dimmed" mb={8}>
                      {b.tw.toLocaleString()} this week • Share:{" "}
                      {b.share.toFixed(1)}%
                    </Text>

                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: "var(--mantine-color-gray-2)",
                        overflow: "hidden",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: `${clamp(b.share)}%`,
                          height: "100%",
                          background: `var(--mantine-color-${b.accent}-5)`,
                        }}
                      />
                    </div>

                    <div style={{ marginTop: "auto" }}>
                      <Divider my={8} />
                      <Group justify="space-between" align="center">
                        <div>
                          <Text size="xs" c="dimmed">
                            Top issue
                          </Text>
                          <Text size="sm" fw={600} lineClamp={1}>
                            {b.top}
                          </Text>
                        </div>
                        <Group
                          gap={6}
                          c={`${b.accent}.7`}
                          style={{ fontWeight: 600 }}
                        >
                          <span style={{ fontSize: 13 }}>Explore</span>
                          <IconArrowRight size={16} />
                        </Group>
                      </Group>
                    </div>
                  </Card>
                );
              })}
          </SimpleGrid>
        )}
      </Card>
    </Container>
  );
}
