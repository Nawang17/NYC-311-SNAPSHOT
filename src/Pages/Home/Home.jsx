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
  Chip,
  Tooltip,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconArrowRight,
  IconSparkles,
  IconBolt,
  IconTrendingUp,
  IconMapPin,
  IconClock,
  IconMoodSmile,
  IconTarget,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { subDays, format, isValid, endOfDay } from "date-fns";
import { Link } from "react-router";

// ------------------
// Config & constants
// ------------------
const SODA = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const PAGE_SIZE = 50000;
const SAFE_MAX = 300000;
const SLEEP_MS = 120;

const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];
// restrained palette, keep UI neutral; use only two accents
const ACCENTS = ["indigo", "teal", "indigo", "teal", "indigo"];

const dayStartLiteral = (d) => `${format(d, "yyyy-MM-dd")}T00:00:00`;
const dayEndLiteral = (d) => `${format(d, "yyyy-MM-dd")}T23:59:59`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const boroSlug = (b) => b.toLowerCase().replace(/\s+/g, "-");

// ------------------
// Data fetch (unchanged logic)
// ------------------
async function fetchWindowRange(startDate, endDate) {
  const startLit = dayStartLiteral(startDate);
  const endLit = dayEndLiteral(endDate);
  const where = `created_date between '${startLit}' and '${endLit}'`;
  const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
  let total = 0;
  try {
    const c = await axios.get(SODA, {
      headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : undefined,
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
      const r = await axios.get(SODA, {
        headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : undefined,
        params: { $query: q },
      });
      const batch = Array.isArray(r.data) ? r.data : [];
      rows.push(...batch);
      fetched += batch.length;
      offset += batch.length;
      if (batch.length < pageLimit) break;
      await sleep(SLEEP_MS);
    } catch (e) {
      if (e?.response?.status === 429) {
        await sleep(600);
        continue;
      }
      console.error("Page fetch failed:", e?.response?.status, e?.message);
      break;
    }
  }
  return { rows, total, capped: total > SAFE_MAX };
}

// ------------------
// Tiny visual helpers (no extra libs)
// ------------------
function RhythmBars({ data, color = "indigo" }) {
  const max = Math.max(1, ...data);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(24, 1fr)",
        gap: 3,
        height: 28,
      }}
    >
      {data.map((v, i) => (
        <Tooltip key={i} label={`${i}:00`} withArrow>
          <div
            style={{
              alignSelf: "end",
              width: "100%",
              height: `${Math.max(12, (v / max) * 100)}%`,
              borderRadius: 3,
              background: `var(--mantine-color-${color}-6)`,
              opacity: 0.85,
            }}
          />
        </Tooltip>
      ))}
    </div>
  );
}

function Meter({ value, color = "indigo" }) {
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: "var(--mantine-color-gray-2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamp(value)}%`,
          height: "100%",
          background: `var(--mantine-color-${color}-6)`,
        }}
      />
    </div>
  );
}

// ------------------
// Home Page Component
// ------------------
export default function HomePage() {
  const [thisWindow, setThisWindow] = useState([]);
  const [prevWindow, setPrevWindow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState({
    start: null,
    end: null,
    prevStart: null,
    prevEnd: null,
  });
  const [focusBorough, setFocusBorough] = useState("BROOKLYN");

  // compute date windows — last completed 7d vs the 7d before that
  const computeRanges = (now = new Date()) => {
    const end = endOfDay(subDays(now, 1)); // yesterday 23:59
    const start = subDays(end, 6); // last 7 days window
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, 6);
    return { start, end, prevStart, prevEnd };
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { start, end, prevStart, prevEnd } = computeRanges();
        const [tw, lw] = await Promise.all([
          fetchWindowRange(start, end),
          fetchWindowRange(prevStart, prevEnd),
        ]);
        setRange({ start, end, prevStart, prevEnd });
        setThisWindow(tw.rows);
        setPrevWindow(lw.rows);
      } catch (e) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- helpers ----------
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

  // totals
  const totalTW = thisWindow.length;
  const totalLW = prevWindow.length;
  const totalDeltaPct =
    totalLW === 0
      ? totalTW > 0
        ? 100
        : 0
      : ((totalTW - totalLW) / totalLW) * 100;

  // per-complaint aggregates
  const complaintsTW = useMemo(
    () => countBy(thisWindow, "complaint_type"),
    [thisWindow]
  );
  const complaintsLW = useMemo(
    () => countBy(prevWindow, "complaint_type"),
    [prevWindow]
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

  // borough mixes
  const boroughMix = useMemo(() => {
    const arr = toShare(countBy(thisWindow, "borough"), totalTW);
    const order = [...BOROUGHS];
    const known = arr
      .filter((a) => order.includes(a.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    const unknowns = arr.filter((a) => !order.includes(a.name));
    return [...known, ...unknowns];
  }, [thisWindow, totalTW]);

  // hourly rhythm per city and per borough
  const hourlyCity = useMemo(() => {
    const h = Array.from({ length: 24 }, () => 0);
    for (const r of thisWindow) {
      const d = new Date(r.created_date);
      if (!isValid(d)) continue;
      h[d.getHours()]++;
    }
    return h;
  }, [thisWindow]);

  const hourlyByBorough = useMemo(() => {
    const map = new Map();
    for (const b of BOROUGHS)
      map.set(
        b,
        Array.from({ length: 24 }, () => 0)
      );
    for (const r of thisWindow) {
      const b = BOROUGHS.includes(r.borough) ? r.borough : null;
      if (!b) continue;
      const d = new Date(r.created_date);
      if (!isValid(d)) continue;
      map.get(b)[d.getHours()]++;
    }
    return map;
  }, [thisWindow]);

  // top issue by borough
  const topIssueByBorough = useMemo(() => {
    const gb = new Map();
    for (const r of thisWindow) {
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
  }, [thisWindow]);

  // persona builder
  const personaFor = (b) => {
    const top = topIssueByBorough.get(b) || "—";
    const hourArr = hourlyByBorough.get(b) || [];
    let peakHour = 0,
      peakVal = -1;
    hourArr.forEach((v, i) => {
      if (v > peakVal) {
        peakVal = v;
        peakHour = i;
      }
    });
    const h12 = peakHour % 12 || 12;
    const ampm = peakHour < 12 ? "AM" : "PM";

    const vibe = (() => {
      const t = (top || "").toLowerCase();
      if (t.includes("noise") || t.includes("music")) return "Late-night hum";
      if (t.includes("heat") || t.includes("hot water"))
        return "Radiator watch";
      if (t.includes("illegal parking") || t.includes("blocked"))
        return "Parking patrol";
      if (t.includes("street condition") || t.includes("pothole"))
        return "Bumpy roads";
      if (t.includes("sanitation") || t.includes("collection"))
        return "Cleanup focus";
      if (t.includes("aircraft") || t.includes("airport"))
        return "Under the flight path";
      return "Attentive block";
    })();

    return {
      tagline: vibe,
      bullets: [
        `Peak around ${h12} ${ampm}`,
        `Signature: ${top}`,
        `Share of city: ${(
          boroughMix.find((x) => x.name === b)?.share || 0
        ).toFixed(1)}%`,
      ],
    };
  };

  // city mood label
  const cityMood = useMemo(() => {
    if (!complaintsTW.length) return { label: "Calm", why: "Very low volume" };
    const top = complaintsTW[0].name.toLowerCase();
    if (top.includes("noise"))
      return { label: "Noisy evening", why: "Noise leads citywide" };
    if (top.includes("heat") || top.includes("hot water"))
      return { label: "Chilly", why: "Heat/Hot water issues on top" };
    if (top.includes("illegal parking"))
      return { label: "Parking pains", why: "Illegal parking elevated" };
    if (top.includes("street condition") || top.includes("pothole"))
      return { label: "Bumpy", why: "Street conditions dominate" };
    if (top.includes("sanitation") || top.includes("collection"))
      return { label: "Cleanup mode", why: "Sanitation leads" };
    return { label: "Watchful", why: `Top: ${complaintsTW[0].name}` };
  }, [complaintsTW]);

  // extremes
  const extremes = useMemo(() => {
    if (!thisWindow.length) return [];
    const byDate = new Map();
    for (const r of thisWindow) {
      const d = new Date(r.created_date);
      if (!isValid(d)) continue;
      const ymd = format(d, "yyyy-MM-dd");
      byDate.set(ymd, (byDate.get(ymd) || 0) + 1);
    }
    const sorted = Array.from(byDate.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    return top ? [{ date: top[0], count: top[1] }] : [];
  }, [thisWindow]);

  // derived cards per borough
  const boroughCards = useMemo(() => {
    const boroTW = new Map(
      countBy(thisWindow, "borough").map((x) => [x.name, x.value])
    );
    const boroLW = new Map(
      countBy(prevWindow, "borough").map((x) => [x.name, x.value])
    );
    return BOROUGHS.map((b, i) => {
      const tw = boroTW.get(b) || 0;
      const lw = boroLW.get(b) || 0;
      const share = totalTW ? (tw / totalTW) * 100 : 0;
      const deltaPct = lw === 0 ? (tw > 0 ? 100 : 0) : ((tw - lw) / lw) * 100;
      const persona = personaFor(b);
      return { name: b, tw, share, deltaPct, accent: ACCENTS[i], persona };
    });
  }, [
    thisWindow,
    prevWindow,
    totalTW,
    topIssueByBorough,
    hourlyByBorough,
    boroughMix,
  ]);

  // "What if you moved here"
  const predictionFor = (b) => {
    const rows = thisWindow.filter((r) => r.borough === b);
    const localTop = countBy(rows, "complaint_type").slice(0, 3);
    const chance = ((rows.length / (totalTW || 1)) * 100).toFixed(1);
    const hourArr = hourlyByBorough.get(b) || [];
    let peakHour = 0,
      peakVal = -1;
    hourArr.forEach((v, i) => {
      if (v > peakVal) {
        peakVal = v;
        peakHour = i;
      }
    });
    const h12 = peakHour % 12 || 12;
    const ampm = peakHour < 12 ? "AM" : "PM";
    return {
      odds: `${chance}% of all city reports came from ${b}`,
      top3: localTop.map((x) => x.name),
      tip: localTop.find((x) => /noise/i.test(x.name))
        ? "Consider white noise / interior bedrooms"
        : localTop.find((x) => /heat|hot water/i.test(x.name))
        ? "Ask for heat history and boiler logs"
        : localTop.find((x) => /parking/i.test(x.name))
        ? "Check overnight parking options"
        : `Peak activity near ${h12} ${ampm}`,
    };
  };

  const selectedPrediction = predictionFor(focusBorough);
  const comparisonShort = "vs prior 7d";
  const ACCENT = "indigo";

  function QuietBadge({ icon, children, color = ACCENT }) {
    return (
      <Badge
        variant="outline"
        color={color}
        size="lg"
        leftSection={icon}
        // subtle tint + accent border
        style={{
          background: `var(--mantine-color-${color}-0)`,
          borderColor: `var(--mantine-color-${color}-3)`,
        }}
      >
        {children}
      </Badge>
    );
  }

  // ------------------
  // Render
  // ------------------
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

      {/* HERO: City vibe */}
      <Card
        withBorder
        radius="lg"
        shadow="sm"
        p="lg"
        mb="lg"
        style={{
          background:
            "linear-gradient(180deg, var(--mantine-color-gray-0), rgba(0,0,0,0))",
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} style={{ letterSpacing: -0.3 }}>
              NYC 311 Snapshot
            </Title>
            <Text size="sm" c="dimmed">
              {range.start && range.end ? (
                <>
                  Last 7 days ({format(range.start, "EEE, MMM d")} -{" "}
                  {format(range.end, "EEE, MMM d")})
                </>
              ) : (
                "Last 7 days"
              )}
            </Text>
          </div>

          <Group align="flex-start" gap="sm">
            <Badge
              color={totalDeltaPct >= 0 ? "teal" : "red"}
              variant="light"
              size="lg"
              tt="none"
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
                    {comparisonShort}
                  </span>
                  )
                </>
              )}
            </Badge>
          </Group>
        </Group>

        <Divider my="sm" />

        {loading ? (
          <Skeleton height={84} radius="md" />
        ) : totalTW === 0 ? (
          <Text size="sm" c="dimmed">
            No activity in this window.
          </Text>
        ) : (
          <Group gap="md" wrap="wrap">
            <QuietBadge icon={<IconMoodSmile size={12} />}>
              City mood: {cityMood.label}
            </QuietBadge>

            <QuietBadge icon={<IconBolt size={12} />}>
              Why: {cityMood.why}
            </QuietBadge>

            {extremes[0] && (
              <QuietBadge icon={<IconSparkles size={12} />}>
                Busiest day:{" "}
                {format(new Date(extremes[0].date + "T00:00:00"), "EEE, MMM d")}{" "}
                ({extremes[0].count.toLocaleString()} reports)
              </QuietBadge>
            )}

            {/* Optional city 24h rhythm strip */}
            {/* <div style={{ flex: 1, minWidth: 280 }}>
    <Text size="xs" c="dimmed" mb={4}>City rhythm (last window)</Text>
    <RhythmBars data={hourlyCity} color={ACCENT} />
  </div> */}
          </Group>
        )}
      </Card>

      {/* PERSONALITY PROFILES */}
      <Card withBorder radius="lg" shadow="sm" p="lg" mb="lg">
        <Group justify="space-between" mb="xs">
          <Title order={4} style={{ letterSpacing: -0.2 }}>
            Borough personality profiles
          </Title>
        </Group>
        {/* <Text size="sm" c="dimmed" mb="sm">
          A quick vibe from peak hours & signature issues. Color accents are
          restrained per-card.
        </Text> */}

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
                      minHeight: 220,
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
                    <Group justify="space-between" mb={6} wrap="nowrap">
                      <Group gap={6} wrap="nowrap">
                        <ThemeIcon
                          size="sm"
                          radius="xl"
                          variant="light"
                          color={b.accent}
                        >
                          <IconMapPin size={14} />
                        </ThemeIcon>
                        <Text fw={700} lineClamp={1}>
                          {b.name}
                        </Text>
                      </Group>
                      <Badge
                        color={up ? "teal" : "red"}
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
                      {b.tw.toLocaleString()} this window • Share{" "}
                      {b.share.toFixed(1)}%
                    </Text>

                    <Text fw={600} mb={6} style={{ fontSize: 14 }}>
                      {b.persona.tagline}
                    </Text>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {b.persona.bullets.map((t, i) => (
                        <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                          {t}
                        </li>
                      ))}
                    </ul>

                    {/* subtle hourly strip per borough */}
                    <div style={{ marginTop: 10 }}>
                      <Text size="xs" c="dimmed" mb={4}>
                        24h pattern
                      </Text>
                      <RhythmBars
                        data={
                          hourlyByBorough.get(b.name) ||
                          Array.from({ length: 24 }, () => 0)
                        }
                        color={b.accent}
                      />
                    </div>

                    <div style={{ marginTop: "auto" }}>
                      <Divider my={8} />
                      <Group justify="space-between" align="center">
                        <Group gap={6}>
                          <ThemeIcon
                            size="sm"
                            radius="xl"
                            variant="light"
                            color={b.accent}
                          >
                            <IconClock size={14} />
                          </ThemeIcon>
                          <Text size="xs" c="dimmed">
                            Tap to explore details
                          </Text>
                        </Group>
                        <Group
                          gap={6}
                          c={`${b.accent}.7`}
                          style={{ fontWeight: 600 }}
                        >
                          <span style={{ fontSize: 13 }}>Open</span>
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

      {/* WHAT IF YOU MOVED HERE */}
      <Card withBorder radius="lg" shadow="sm" p="lg" mb="lg">
        <Group justify="space-between" mb="xs" align="flex-end">
          <div>
            <Title order={4} style={{ letterSpacing: -0.2 }}>
              What if you moved here
            </Title>
            <Text size="sm" c="dimmed">
              Pick a borough to see likely nuisances and a practical tip.
            </Text>
          </div>
          <Chip.Group
            multiple={false}
            value={focusBorough}
            onChange={setFocusBorough}
          >
            <Group justify="flex-start" mt="md">
              {BOROUGHS.map((b, idx) => (
                <Chip
                  key={b}
                  value={b}
                  radius="sm"
                  variant="light"
                  color={ACCENTS[idx]}
                >
                  {b}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>
        {loading ? (
          <Skeleton height={120} radius="md" />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            <Card withBorder radius="md" p="md">
              <Group gap={6} mb={6}>
                <ThemeIcon size="sm" radius="xl" variant="light" color="teal">
                  <IconTarget size={14} />
                </ThemeIcon>
                <Text fw={600}>Odds</Text>
              </Group>
              <Text size="sm">{selectedPrediction.odds}</Text>
            </Card>
            <Card withBorder radius="md" p="md">
              <Group gap={6} mb={6}>
                <ThemeIcon size="sm" radius="xl" variant="light" color="indigo">
                  <IconSparkles size={14} />
                </ThemeIcon>
                <Text fw={600}>Top 3 issues</Text>
              </Group>
              <Group gap={6} wrap="wrap">
                {selectedPrediction.top3.map((t) => (
                  <Badge key={t} variant="light">
                    {t}
                  </Badge>
                ))}
              </Group>
            </Card>
            <Card withBorder radius="md" p="md">
              <Group gap={6} mb={6}>
                <ThemeIcon size="sm" radius="xl" variant="light" color="yellow">
                  <IconBolt size={14} />
                </ThemeIcon>
                <Text fw={600}>Tip</Text>
              </Group>
              <Text size="sm">{selectedPrediction.tip}</Text>
            </Card>
          </SimpleGrid>
        )}
      </Card>

      {/* EXPLORE BY BOROUGH (compact, restrained) */}
      {/* <Card withBorder radius="lg" shadow="sm" p="lg">
        <Group justify="space-between" mb="xs">
          <Title order={4} style={{ letterSpacing: -0.2 }}>
            Explore by borough
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mb="sm">
          Counts, week-over-week change, and share of city activity with a
          single accent color per card.
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
                        color={up ? "teal" : "red"}
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
                      {b.tw.toLocaleString()} this window • Share{" "}
                      {b.share.toFixed(1)}%
                    </Text>

                    <Meter value={b.share} color={b.accent} />

                    <div style={{ marginTop: "auto" }}>
                      <Divider my={8} />
                      <Group justify="space-between" align="center">
                        <div>
                          <Text size="xs" c="dimmed">
                            Persona
                          </Text>
                          <Text size="sm" fw={600} lineClamp={1}>
                            {b.persona.tagline}
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
      </Card> */}
    </Container>
  );
}
