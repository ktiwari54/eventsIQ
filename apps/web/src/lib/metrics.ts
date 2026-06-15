// Lightweight in-process metrics registry that renders Prometheus text format.
// Scraped at /api/metrics (see infrastructure/docker/prometheus.yml). Avoids a
// heavy OpenTelemetry/prom-client dependency while giving real, working metrics.

type Labels = Record<string, string>;

interface CounterSeries {
  help: string;
  values: Map<string, { labels: Labels; value: number }>;
}
interface HistogramSeries {
  help: string;
  buckets: number[];
  values: Map<string, { labels: Labels; counts: number[]; sum: number; count: number }>;
}

const globalForMetrics = globalThis as unknown as {
  __counters?: Map<string, CounterSeries>;
  __histograms?: Map<string, HistogramSeries>;
};

const counters: Map<string, CounterSeries> = (globalForMetrics.__counters ??= new Map());
const histograms: Map<string, HistogramSeries> = (globalForMetrics.__histograms ??= new Map());

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function keyOf(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`)
    .join(",");
}

export function incCounter(name: string, labels: Labels = {}, help = ""): void {
  const series: CounterSeries = counters.get(name) ?? { help, values: new Map() };
  const k = keyOf(labels);
  const cur = series.values.get(k) ?? { labels, value: 0 };
  cur.value += 1;
  series.values.set(k, cur);
  counters.set(name, series);
}

export function observeHistogram(name: string, value: number, labels: Labels = {}, help = ""): void {
  const series: HistogramSeries =
    histograms.get(name) ?? { help, buckets: DEFAULT_BUCKETS, values: new Map() };
  const k = keyOf(labels);
  const cur =
    series.values.get(k) ?? { labels, counts: new Array(series.buckets.length).fill(0), sum: 0, count: 0 };
  series.buckets.forEach((b, i) => {
    if (value <= b) cur.counts[i] += 1;
  });
  cur.sum += value;
  cur.count += 1;
  series.values.set(k, cur);
  histograms.set(name, series);
}

/** Render all metrics in Prometheus exposition format. */
export function renderMetrics(): string {
  const lines: string[] = [];

  for (const [name, series] of counters) {
    if (series.help) lines.push(`# HELP ${name} ${series.help}`);
    lines.push(`# TYPE ${name} counter`);
    for (const { labels, value } of series.values.values()) {
      lines.push(`${name}${formatLabels(labels)} ${value}`);
    }
  }

  for (const [name, series] of histograms) {
    if (series.help) lines.push(`# HELP ${name} ${series.help}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const { labels, counts, sum, count } of series.values.values()) {
      series.buckets.forEach((b, i) => {
        lines.push(`${name}_bucket${formatLabels({ ...labels, le: String(b) })} ${counts[i]}`);
      });
      lines.push(`${name}_bucket${formatLabels({ ...labels, le: "+Inf" })} ${count}`);
      lines.push(`${name}_sum${formatLabels(labels)} ${sum}`);
      lines.push(`${name}_count${formatLabels(labels)} ${count}`);
    }
  }

  return lines.join("\n") + "\n";
}

function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (!entries.length) return "";
  return `{${entries.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
}
