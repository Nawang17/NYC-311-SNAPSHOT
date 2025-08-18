import {
  Container,
  Select,
  Loader,
  Text,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Title,
  ThemeIcon,
  Divider,
  Badge,
  Progress,
  Alert,
  Button,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuilding,
  IconMapPin,
  IconInfoCircle,
  IconClipboardCheck,
  IconCheckupList,
  IconTrophy,
  IconClockHour3,
  IconDownload,
  IconArrowLeft,
  IconBolt,
  IconTrendingUp,
  IconSparkles,
  IconClock,
  IconTarget,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import { DatePickerInput } from "@mantine/dates";
import { useParams, useNavigate, Link } from "react-router";

const SODA = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const PAGE_SIZE = 50000;

/** ---------- helpers ---------- */
const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];
const ACCENT_BY_BORO = {
  MANHATTAN: "indigo",
  BROOKLYN: "teal",
  QUEENS: "indigo",
  BRONX: "teal",
  "STATEN ISLAND": "indigo",
};

const slugify = (b) => b.toLowerCase().replace(/\s+/g, "-");
const slugToBorough = (slug) => {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  return BOROUGHS.find((b) => slugify(b) === s) || null;
};

// SoQL timestamp with local time (avoid UTC shift)
const soqlLocal = (d) => format(d, "yyyy-MM-dd'T'HH:mm:ss");

// SAFE normalizer: accepts Date | string | number | null
const normalizePickedDate = (d) => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  // Use UTC parts to avoid TZ-induced previous-day shifts
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// Default last 7 days (local)
const defaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return [start, now];
};

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

const addShare = (items, total) =>
  items.map((x) => ({ ...x, share: total ? (x.value / total) * 100 : 0 }));

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);
const safeTop = (arr) => (arr && arr.length ? arr[0] : null);
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
// Page through all rows in the window
async function fetchBoroughRangeAll(borough, startSOQL, endSOQL) {
  const where = `borough='${borough}' AND created_date between '${startSOQL}' and '${endSOQL}'`;
  let offset = 0;
  const all = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q =
      `SELECT unique_key, created_date, complaint_type, descriptor, borough, incident_zip, ` +
      `agency_name, status, resolution_description, location_type, city ` +
      `WHERE ${where} ORDER BY created_date DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

    const res = await axios.get(SODA, {
      params: { $query: q },
      headers: APP_TOKEN ? { "X-App-Token": APP_TOKEN } : undefined,
    });

    const batch = Array.isArray(res.data) ? res.data : [];
    all.push(...batch);
    offset += batch.length;

    if (batch.length < PAGE_SIZE) break;
    await new Promise((r) => setTimeout(r, 120)); // avoid 429
  }

  return all;
}

/** tiny visual from Home: 24h micro-bars */
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

export default function BoroughsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // init from URL; fallback to MANHATTAN if slug invalid/missing
  const [borough, setBorough] = useState(
    () => slugToBorough(slug) || "MANHATTAN"
  );
  const [dateRange, setDateRange] = useState(defaultRange()); // [start, end]
  const [data, setData] = useState([]);
  const [prevData, setPrevData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // keep state in sync if the URL slug changes externally
  useEffect(() => {
    const b = slugToBorough(slug);
    if (b && b !== borough) setBorough(b);
    if (!b && slug) {
      // unknown slug — normalize URL to default
      navigate(`/borough/${slugify("MANHATTAN")}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // when user changes Select, update both state and URL
  const onBoroughChange = (val) => {
    if (!val) return;
    setBorough(val);
    navigate(`/borough/${slugify(val)}`);
  };

  // Derive normalized bounds and pretty labels from dateRange (stable via memo)
  const {
    normStartForBadge,
    normEndForBadge,
    badgeStart,
    badgeEnd,
    prevStart,
    prevEnd,
  } = useMemo(() => {
    const [rawStart, rawEnd] = dateRange || [];
    const nStart = startOfDay(normalizePickedDate(rawStart) || new Date());
    const nEnd = endOfDay(normalizePickedDate(rawEnd) || new Date());
    // previous window = equal length immediately before start
    const spanMs = Math.max(0, nEnd.getTime() - nStart.getTime());
    const pEnd = new Date(nStart.getTime() - 1);
    const pStart = new Date(pEnd.getTime() - spanMs);
    return {
      normStartForBadge: nStart,
      normEndForBadge: nEnd,
      badgeStart: format(nStart, "MMM d, yyyy"),
      badgeEnd: format(nEnd, "MMM d, yyyy"),
      prevStart: startOfDay(pStart),
      prevEnd: endOfDay(pEnd),
    };
  }, [dateRange]);

  // Fetch on borough or range change (both current and previous window)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [rows, rowsPrev] = await Promise.all([
          fetchBoroughRangeAll(
            borough,
            soqlLocal(normStartForBadge),
            soqlLocal(normEndForBadge)
          ),
          fetchBoroughRangeAll(
            borough,
            soqlLocal(prevStart),
            soqlLocal(prevEnd)
          ),
        ]);
        if (!cancelled) {
          setData(rows);
          setPrevData(rowsPrev);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setErr(e?.message || "Failed to load borough data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [borough, normStartForBadge, normEndForBadge, prevStart, prevEnd]);

  const total = data.length;
  const totalPrev = prevData.length;
  const pctChange =
    totalPrev === 0
      ? total > 0
        ? 100
        : 0
      : ((total - totalPrev) / totalPrev) * 100;

  // Aggregations (current)
  const topComplaint = useMemo(
    () => safeTop(countBy(data, "complaint_type")),
    [data]
  );
  const busiestZip = useMemo(
    () => safeTop(countBy(data, "incident_zip")),
    [data]
  );
  const topAgency = useMemo(
    () => safeTop(countBy(data, "agency_name")),
    [data]
  );

  const complaintsList = useMemo(
    () => addShare(countBy(data, "complaint_type").slice(0, 8), total),
    [data, total]
  );
  const agenciesList = useMemo(
    () => addShare(countBy(data, "agency_name").slice(0, 6), total),
    [data, total]
  );
  const zipsList = useMemo(
    () =>
      countBy(data, "incident_zip")
        .filter((x) => x.name !== "Unknown")
        .slice(0, 6),
    [data]
  );
  const descriptorsList = useMemo(
    () => countBy(data, "descriptor").slice(0, 6),
    [data]
  );
  const statusList = useMemo(
    () => addShare(countBy(data, "status"), total),
    [data, total]
  );
  const locationsList = useMemo(
    () => addShare(countBy(data, "location_type").slice(0, 6), total),
    [data, total]
  );

  const closureRate =
    useMemo(() => {
      const closed = data.filter((r) =>
        (r.status || "").toLowerCase().includes("closed")
      ).length;
      return total ? (closed / total) * 100 : 0;
    }, [data, total]) || 0;

  const recent = useMemo(
    () =>
      data.slice(0, 6).map((r) => ({
        id: r.unique_key,
        when: r.created_date,
        complaint: r.complaint_type || "Unknown",
        zipcode: r.incident_zip || "—",
        agency: r.agency_name || "—",
      })),
    [data]
  );

  const randomDescriptor = useMemo(() => {
    const list = data.map((d) => d.descriptor).filter(Boolean);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }, [data]);

  // Hourly rhythm + busiest hour
  const hourlyArr = useMemo(() => {
    const h = Array.from({ length: 24 }, () => 0);
    for (const r of data) {
      const d = new Date(r.created_date);
      if (!isValid(d)) continue;
      h[d.getHours()]++;
    }
    return h;
  }, [data]);

  const busiestHour = useMemo(() => {
    let idx = 0,
      max = -1;
    hourlyArr.forEach((v, i) => {
      if (v > max) {
        max = v;
        idx = i;
      }
    });
    const h12 = idx % 12 || 12;
    const ampm = idx < 12 ? "AM" : "PM";
    return { idx, label: `${h12} ${ampm}` };
  }, [hourlyArr]);

  // Fastest risers vs prior window (same length)
  const complaintDelta = useMemo(() => {
    const nowMap = new Map(
      countBy(data, "complaint_type").map((x) => [x.name, x.value])
    );
    const prevMap = new Map(
      countBy(prevData, "complaint_type").map((x) => [x.name, x.value])
    );
    const keys = new Set([...nowMap.keys(), ...prevMap.keys()]);
    const rows = [];
    for (const k of keys) {
      const cur = nowMap.get(k) || 0;
      const prev = prevMap.get(k) || 0;
      const pct =
        prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
      rows.push({ name: k, cur, prev, deltaPct: pct });
    }
    // only show items with enough base to matter
    return rows
      .filter((r) => r.cur >= 10 || r.prev >= 10)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 5);
  }, [data, prevData]);

  const accent = ACCENT_BY_BORO[borough] || "indigo";

  const SectionCard = ({ title, icon, color, children, right }) => (
    <Card withBorder shadow="sm" radius="md" p="md">
      <Group justify="space-between" mb="xs" align="center">
        <Group>
          <ThemeIcon variant="light" color={color} radius="xl">
            {icon}
          </ThemeIcon>
          <Title order={6} c={`${color}.9`}>
            {title}
          </Title>
        </Group>
        {right}
      </Group>
      {children}
    </Card>
  );

  const ListWithBars = ({ items, color }) => (
    <Stack gap="sm">
      {items.map((x) => (
        <div key={`${x.name}-${x.value}`}>
          <Group justify="space-between" mb={4}>
            <Text size="sm" c="gray.7" lineClamp={1} title={x.name}>
              {x.name}
            </Text>
            <Text size="xs" c="gray.6">
              {fmt(x.value)}
              {typeof x.share === "number" ? ` • ${x.share.toFixed(1)}%` : ""}
            </Text>
          </Group>
          {typeof x.share === "number" ? (
            <Progress
              value={Math.min(100, Math.max(0, x.share))}
              color={color}
            />
          ) : null}
        </div>
      ))}
    </Stack>
  );

  const exportCsv = () => {
    const headers = [
      "unique_key",
      "created_date",
      "complaint_type",
      "descriptor",
      "borough",
      "incident_zip",
      "agency_name",
      "status",
      "resolution_description",
      "location_type",
      "city",
    ];
    const lines = [
      headers.join(","),
      ...data.map((r) =>
        headers
          .map((h) => {
            const v = r[h] ?? "";
            const s = String(v).replaceAll('"', '""');
            return `"${s}"`;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nyc311_${borough}_${format(
      normStartForBadge,
      "MMM_d_yyyy"
    )}_to_${format(normEndForBadge, "MMM_d_yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // borough vibe + move-in tip (mirrors Home)
  const top3 = complaintsList.slice(0, 3).map((x) => x.name);
  const moveTip = top3.find((t) => /noise/i.test(t))
    ? "Consider white noise / interior bedrooms"
    : top3.find((t) => /heat|hot water/i.test(t))
    ? "Ask for heat history and boiler logs"
    : top3.find((t) => /parking/i.test(t))
    ? "Check overnight parking options"
    : `Peak activity near ${busiestHour.label}`;

  return (
    <Container size="xl" py="xl">
      {/* top controls */}
      <Group mb="lg" align="flex-end" justify="space-between" wrap="wrap">
        <Group align="flex-end">
          <Select
            label="Select borough"
            value={borough}
            onChange={onBoroughChange}
            data={BOROUGHS}
            w={220}
          />

          <DatePickerInput
            type="range"
            label="Date range"
            placeholder="Pick range"
            value={dateRange}
            onChange={setDateRange}
            maxDate={new Date()}
            allowSingleDateInRange
            clearable
            w={280}
          />
        </Group>
        {/* 
        <Button
          variant="light"
          leftSection={<IconDownload size={16} />}
          onClick={exportCsv}
        >
          Export CSV
        </Button> */}
      </Group>

      {err && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="red"
          mb="md"
          title="Data error"
        >
          {err}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" mt="md">
          <Loader />
        </Group>
      ) : (
        <>
          {/* Snapshot hero (accented like Home) */}
          <Card
            withBorder
            shadow="xs"
            radius="md"
            p="lg"
            mb="xl"
            style={{
              background:
                "linear-gradient(180deg, var(--mantine-color-gray-0), rgba(0,0,0,0))",
              borderLeft: `4px solid var(--mantine-color-${accent}-6)`,
            }}
          >
            <Group justify="space-between" align="center" mb="xs">
              <Group gap="xs" align="center" wrap="wrap">
                <ThemeIcon variant="light" color={accent} radius="xl">
                  <IconTrophy size={18} />
                </ThemeIcon>
                <Title
                  order={4}
                  c={`${accent}.9`}
                  style={{ letterSpacing: -0.2 }}
                >
                  {borough} snapshot
                </Title>
                <Badge variant="light" color="gray">
                  {badgeStart} → {badgeEnd}
                </Badge>
              </Group>

              <Group gap="xs" wrap="wrap">
                <Badge
                  color={pctChange >= 0 ? "teal" : "red"}
                  variant="light"
                  size="lg"
                  leftSection={
                    <IconTrendingUp
                      size={14}
                      style={{
                        transform: pctChange >= 0 ? "none" : "rotate(180deg)",
                      }}
                    />
                  }
                >
                  {fmt(total)} total ({pctChange >= 0 ? "+" : ""}
                  {isFinite(pctChange) ? pctChange.toFixed(1) : "0"}% vs prior
                  window)
                </Badge>
                <Button
                  component={Link}
                  to="/"
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  Back to overview
                </Button>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              <SectionCard
                title="Total complaints"
                icon={<IconClipboardCheck size={18} />}
                color={accent}
              >
                <Text size="sm" c="gray.7">
                  {fmt(total)} records in {borough} during {badgeStart} →{" "}
                  {badgeEnd}.
                </Text>
              </SectionCard>

              <SectionCard
                title="Top complaint"
                icon={<IconAlertTriangle size={18} />}
                color="red"
              >
                <Text size="sm">
                  {topComplaint?.name || "—"}{" "}
                  <Text span size="sm" c="gray.7">
                    ({fmt(topComplaint?.value)} reports)
                  </Text>
                </Text>
              </SectionCard>

              <SectionCard
                title="Busiest ZIP"
                icon={<IconMapPin size={18} />}
                color="teal"
              >
                <Text size="sm">
                  {busiestZip?.name || "—"}{" "}
                  <Text span size="sm" c="gray.7">
                    ({fmt(busiestZip?.value)})
                  </Text>
                </Text>
              </SectionCard>

              <SectionCard
                title="Most involved agency"
                icon={<IconBuilding size={18} />}
                color="indigo"
              >
                <Text size="sm">
                  {topAgency?.name || "—"}{" "}
                  <Text span size="sm" c="gray.7">
                    ({fmt(topAgency?.value)})
                  </Text>
                </Text>
              </SectionCard>
            </SimpleGrid>

            <Divider my="md" />

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {/* Vibe + tip */}
              <SectionCard
                title="Borough vibe"
                icon={<IconSparkles size={18} />}
                color={accent}
                right={
                  <Badge variant="light" color="gray">
                    Peak hour: {busiestHour.label}
                  </Badge>
                }
              >
                <Stack gap={6}>
                  <Group gap={6} wrap="no-wrap">
                    <ThemeIcon
                      size="sm"
                      variant="light"
                      color="yellow"
                      radius="xl"
                    >
                      <IconBolt size={14} />
                    </ThemeIcon>
                    <Text size="sm">{top3.join(" • ") || "—"}</Text>
                  </Group>
                  <Group gap={6} wrap="no-wrap">
                    <ThemeIcon
                      size="sm"
                      variant="light"
                      color="teal"
                      radius="xl"
                    >
                      <IconTarget size={14} />
                    </ThemeIcon>
                    <Text size="sm">Tip: {moveTip}</Text>
                  </Group>
                </Stack>
              </SectionCard>

              {/* 24h rhythm */}
              <SectionCard
                title="24-hour pattern"
                icon={<IconClock size={18} />}
                color={accent}
              >
                <Text size="xs" c="dimmed" mb={6}>
                  Last window activity by hour
                </Text>
                <RhythmBars data={hourlyArr} color={accent} />
              </SectionCard>

              {/* Risers vs prior window */}
              <SectionCard
                title="Fastest risers (vs prior)"
                icon={<IconTrendingUp size={18} />}
                color="teal"
              >
                {complaintDelta.length === 0 ? (
                  <Text size="sm" c="gray.7">
                    No clear risers for this window.
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {complaintDelta.map((r) => {
                      const up = r.deltaPct >= 0;
                      return (
                        <Group key={r.name} justify="space-between">
                          <Text size="sm" lineClamp={1} title={r.name}>
                            {r.name}
                          </Text>
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
                            {isFinite(r.deltaPct) ? r.deltaPct.toFixed(0) : "0"}
                            %
                          </Badge>
                        </Group>
                      );
                    })}
                  </Stack>
                )}
              </SectionCard>
            </SimpleGrid>

            <Divider my="md" />

            <Stack gap="xs">
              <Group gap="xs">
                <Text size="sm">
                  Recent descriptor:{" "}
                  <strong>{randomDescriptor || "n/a"}</strong>
                </Text>
              </Group>
              <Group gap="xs">
                <Text size="sm">
                  Closure rate: <strong>{closureRate.toFixed(1)}%</strong>{" "}
                  <Text span size="sm" c="gray.7">
                    (share of records with status that includes "Closed")
                  </Text>
                </Text>
              </Group>
            </Stack>
          </Card>

          {/* Detailed Breakdown */}
          <Title order={4} mb="sm">
            Detailed breakdown
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            <SectionCard
              title="Top complaint types"
              icon={<IconAlertTriangle size={18} />}
              color="red"
            >
              <ListWithBars items={complaintsList} color="red" />
            </SectionCard>

            <SectionCard
              title="Top agencies"
              icon={<IconBuilding size={18} />}
              color="blue"
            >
              <ListWithBars items={agenciesList} color="blue" />
            </SectionCard>

            <SectionCard
              title="Top ZIP codes"
              icon={<IconMapPin size={18} />}
              color="teal"
            >
              <ListWithBars
                items={zipsList.map((x) => ({ ...x, share: undefined }))}
                color="teal"
              />
            </SectionCard>

            <SectionCard
              title="Common descriptors"
              icon={<IconInfoCircle size={18} />}
              color="indigo"
            >
              <ListWithBars
                items={descriptorsList.map((x) => ({ ...x, share: undefined }))}
                color="indigo"
              />
            </SectionCard>

            <SectionCard
              title="Status breakdown"
              icon={<IconCheckupList size={18} />}
              color="grape"
            >
              <ListWithBars items={statusList} color="grape" />
            </SectionCard>

            <SectionCard
              title="Where it happens"
              icon={<IconMapPin size={18} />}
              color="orange"
            >
              <ListWithBars items={locationsList} color="orange" />
            </SectionCard>
          </SimpleGrid>

          {/* Recent activity */}
          <Title order={4} mt="xl" mb="sm">
            Recent activity
          </Title>
          <Card withBorder radius="md" shadow="sm" p="md">
            {recent.length === 0 ? (
              <Text size="sm" c="gray.7">
                No recent items.
              </Text>
            ) : (
              <Stack gap="sm">
                {recent.map((r) => (
                  <Group key={r.id} justify="space-between" wrap="wrap">
                    <Group gap="xs">
                      <ThemeIcon variant="light" color="gray" radius="xl">
                        <IconClockHour3 size={16} />
                      </ThemeIcon>
                      <Text size="sm" fw={600}>
                        {r.complaint}
                      </Text>
                      <Badge variant="dot" color="gray">
                        {r.zipcode}
                      </Badge>
                      <Badge variant="light" color="blue">
                        {r.agency}
                      </Badge>
                    </Group>
                    <Text size="xs" c="gray.6" style={{ whiteSpace: "nowrap" }}>
                      {formatDistanceToNowStrict(new Date(r.when))} ago
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
