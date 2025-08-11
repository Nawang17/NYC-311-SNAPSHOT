import {
  Container,
  Title,
  Text,
  Grid,
  Card,
  Group,
  ThemeIcon,
  Skeleton,
  Badge,
  Divider,
  SimpleGrid,
  Progress,
  Alert,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconMapPin,
  IconBuildingSkyscraper,
  IconTrendingUp,
  IconClockHour3,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { subDays, format, isValid } from "date-fns";

const SODA = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const PAGE_SIZE = 50000; // SODA 2.0 per-request max
const SAFE_MAX = 300000; // safety ceiling to avoid huge downloads
const SLEEP_MS = 120;

// ---------- helpers ----------
const dayStartLiteral = (d) => `${format(d, "yyyy-MM-dd")}T00:00:00`;
const dayEndLiteral = (d) => `${format(d, "yyyy-MM-dd")}T23:59:59`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

// Use a single $query for consistency
async function fetchWindowRange(startDate, endDate) {
  const startLit = dayStartLiteral(startDate);
  const endLit = dayEndLiteral(endDate);

  const where = `created_date between '${startLit}' and '${endLit}'`;

  // 1) count total rows for the window
  let total = 0;
  try {
    const c = await axios.get(SODA, {
      params: { $query: `SELECT count(1) WHERE ${where}` },
    });
    total = Number(c.data?.[0]?.count || c.data?.[0]?.count_1 || 0);
  } catch (e) {
    console.error("Count failed:", e?.response?.status, e?.message);
  }

  // 2) page through in 50k chunks
  const rows = [];
  let offset = 0;
  let fetched = 0;
  const hardCap = Math.min(total, SAFE_MAX); // don’t exceed safety ceiling

  while (fetched < hardCap) {
    const pageLimit = Math.min(PAGE_SIZE, hardCap - fetched);
    const q =
      `SELECT unique_key, created_date, complaint_type, borough, agency_name, location_type, city ` +
      `WHERE ${where} ORDER BY created_date DESC LIMIT ${pageLimit} OFFSET ${offset}`;

    try {
      const r = await axios.get(SODA, {
        params: { $query: q },
        // headers: { "X-App-Token": "YOUR_TOKEN" }, // optional but recommended
      });
      const batch = Array.isArray(r.data) ? r.data : [];
      rows.push(...batch);
      fetched += batch.length;
      offset += batch.length;

      // done if short page
      if (batch.length < pageLimit) break;
      await sleep(SLEEP_MS);
    } catch (e) {
      // simple retry once on 429s
      if (e?.response?.status === 429) {
        await sleep(500);
        continue;
      }
      console.error("Page fetch failed:", e?.response?.status, e?.message);
      break;
    }
  }

  const capped = total > SAFE_MAX; // only show banner if we hit safety ceiling
  console.log(
    "[311] window:",
    startLit,
    "->",
    endLit,
    "total:",
    total,
    "rows:",
    rows.length,
    "capped:",
    capped
  );
  return { rows, total, capped };
}
export default function HomePage() {
  const [thisWeek, setThisWeek] = useState([]); // now = last 7 days
  const [lastWeek, setLastWeek] = useState([]); // previous 7 days
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        // Last 7 days: [now-7d 00:00, today 23:59]
        const last7Start = subDays(now, 7);
        const last7End = now;
        // Previous 7 days: [now-14d 00:00, now-7d 23:59]
        const prev7Start = subDays(now, 14);
        const prev7End = subDays(now, 7);

        const [tw, lw] = await Promise.all([
          fetchWindowRange(last7Start, last7End),
          fetchWindowRange(prev7Start, prev7End),
        ]);

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
  const safeTop = (arr) => (arr && arr.length ? arr[0] : null);

  const totalTW = thisWeek.length;
  const totalLW = lastWeek.length;
  const totalDeltaPct =
    totalLW === 0 ? 0 : ((totalTW - totalLW) / totalLW) * 100;

  const topComplaintTW = safeTop(countBy(thisWeek, "complaint_type"));
  const topBoroughTW = safeTop(countBy(thisWeek, "borough"));
  const topAgencyTW = safeTop(countBy(thisWeek, "agency_name"));
  const topLocationTW = safeTop(countBy(thisWeek, "location_type"));

  const boroughMix = useMemo(() => {
    const arr = toShare(countBy(thisWeek, "borough"), totalTW);
    const order = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];
    const known = arr
      .filter((a) => order.includes(a.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    const unknowns = arr.filter((a) => !order.includes(a.name));
    return [...known, ...unknowns];
  }, [thisWeek, totalTW]);

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

  const topComplaintsWithShare = useMemo(
    () => toShare(complaintsTW.slice(0, 8), totalTW),
    [complaintsTW, totalTW]
  );

  // Interesting facts
  // --- replace your existing `facts` useMemo with this ---
  const facts = useMemo(() => {
    if (!thisWeek.length) return [];
    const out = [];

    // Busiest calendar DATE (not just day-of-week)
    const byDate = new Map(); // key: 'yyyy-MM-dd' -> count
    const byHour = new Map(); // key: 0..23 -> count

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
      // Pretty label like "Tue, Aug 5"
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

    // Fastest riser vs previous 7 days (ignore tiny categories)
    const minBaseline = 25;
    const risers = complaintDelta
      .filter((x) => x.value >= minBaseline) // at least 25 cases in last 7 days
      .sort((a, b) => b.deltaPct - a.deltaPct); // biggest % increase first
    if (risers[0]) {
      const sign = risers[0].deltaPct >= 0 ? "+" : "";
      out.push(
        `Fastest riser: ${risers[0].name} (${sign}${risers[0].deltaPct.toFixed(
          0
        )}% vs previous 7 days).`
      );
    }

    // Most concentrated borough
    if (boroughMix.length) {
      const lead = boroughMix.slice().sort((a, b) => b.share - a.share)[0];
      out.push(
        `Most concentrated borough: ${lead.name} (${lead.share.toFixed(1)}%).`
      );
    }

    // Commonest location
    if (topLocationTW) {
      out.push(
        `Commonest location: ${
          topLocationTW.name
        } (${topLocationTW.value.toLocaleString()} mentions).`
      );
    }

    return out;
  }, [thisWeek, complaintDelta, boroughMix, topLocationTW]);

  // ---------- UI ----------
  const Section = ({ title, right }) => (
    <Group justify="space-between" mb="xs">
      <Title order={5}>{title}</Title>
      {right}
    </Group>
  );

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

      <Card withBorder radius="md" shadow="sm" mb="xl" p="lg">
        <Group justify="space-between" align="flex-start" mb="xs">
          <div>
            <Title order={3} c="orange.9" mb={2}>
              NYC 311 - Last 7 days
            </Title>
            <Text size="sm" c="gray.7">
              What New Yorkers reported in the past week, along with changes
              compared to the previous 7 days.
            </Text>
          </div>

          <Badge
            color={totalDeltaPct >= 0 ? "green" : "red"}
            variant="light"
            size="lg"
          >
            {totalTW.toLocaleString()} total ({totalDeltaPct >= 0 ? "+" : ""}
            {isFinite(totalDeltaPct) ? totalDeltaPct.toFixed(1) : "0"}%)
          </Badge>
        </Group>
        <Divider my="md" />

        {loading ? (
          <Skeleton height={120} radius="md" />
        ) : totalTW === 0 ? (
          <Text size="sm" c="dimmed">
            No complaints found for the last 7 days.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            <Card withBorder padding="md" radius="md">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size="lg" radius="xl" variant="light" color="red">
                  <IconAlertTriangle size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Most Reported Issue
                  </Text>
                  <Text fw={600} c="red.8">
                    {topComplaintTW?.name || "—"}
                  </Text>
                  <Text size="xs">
                    {topComplaintTW?.value?.toLocaleString()} reports
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                  <IconMapPin size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Borough with Most Activity
                  </Text>
                  <Text fw={600} c="blue.8">
                    {topBoroughTW?.name || "—"}
                  </Text>
                  <Text size="xs">
                    {topBoroughTW?.value?.toLocaleString()} complaints
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size="lg" radius="xl" variant="light" color="indigo">
                  <IconBuildingSkyscraper size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Most Involved Agency
                  </Text>
                  <Text fw={600} c="indigo.8">
                    {topAgencyTW?.name || "—"}
                  </Text>
                  <Text size="xs">
                    {topAgencyTW?.value?.toLocaleString()} cases
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size="lg" radius="xl" variant="light" color="grape">
                  <IconBuildingCommunity size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Most Common Location
                  </Text>
                  <Text fw={600} c="grape.8">
                    {topLocationTW?.name || "—"}
                  </Text>
                  <Text size="xs">
                    {topLocationTW?.value?.toLocaleString()} mentions
                  </Text>
                </div>
              </Group>
            </Card>
          </SimpleGrid>
        )}
      </Card>

      {/* Borough Mix */}
      <Card withBorder radius="md" shadow="sm" p="lg" mb="lg">
        <Section title="Borough mix (share of last 7 days)" />
        {loading ? (
          <Skeleton height={160} radius="md" />
        ) : (
          <>
            {boroughMix.map((b) => (
              <div key={b.name} style={{ marginBottom: 12 }}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>
                    {b.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {b.value.toLocaleString()} • {b.share.toFixed(1)}%
                  </Text>
                </Group>
                <Progress value={clamp(b.share)} />
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Top Complaint Types */}
      <Card withBorder radius="md" shadow="sm" p="lg" mb="lg">
        <Section
          title="Top complaint types - last 7 days (vs previous 7 days)
"
        />
        {loading ? (
          <Skeleton height={220} radius="md" />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {topComplaintsWithShare.map((c) => {
              const delta =
                complaintDelta.find((d) => d.name === c.name)?.deltaPct ?? 0;
              const up = delta >= 0;
              return (
                <Card key={c.name} withBorder padding="md" radius="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={600}>{c.name}</Text>
                      <Text size="xs" c="dimmed">
                        {c.value.toLocaleString()} in last 7 days •{" "}
                        {c.share.toFixed(1)}%
                      </Text>
                    </div>
                    <Badge
                      color={up ? "green" : "red"}
                      variant="light"
                      leftSection={
                        <IconTrendingUp
                          size={12}
                          style={{ transform: up ? "none" : "rotate(180deg)" }}
                        />
                      }
                    >
                      {up ? "+" : ""}
                      {isFinite(delta) ? delta.toFixed(0) : "0"}%
                    </Badge>
                  </Group>
                  <Progress mt="sm" value={clamp(c.share)} />
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Card>

      {/* Interesting Facts */}
      <Card withBorder radius="md" shadow="sm" p="lg">
        <Section
          title="Interesting facts (last 7 days)"
          right={
            <Badge
              leftSection={<IconClockHour3 size={12} />}
              color="violet"
              variant="light"
            >
              Auto-generated
            </Badge>
          }
        />
        {loading ? (
          <Skeleton height={120} radius="md" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {facts.map((f, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <Text size="sm">{f}</Text>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
