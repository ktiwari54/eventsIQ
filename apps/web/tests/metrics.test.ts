import { incCounter, observeHistogram, renderMetrics } from "@/lib/metrics";

describe("metrics registry", () => {
  it("renders counters in Prometheus format with labels", () => {
    incCounter("eventiq_test_total", { method: "GET", status: "200" }, "test counter");
    incCounter("eventiq_test_total", { method: "GET", status: "200" });
    const out = renderMetrics();
    expect(out).toContain("# TYPE eventiq_test_total counter");
    expect(out).toMatch(/eventiq_test_total\{method="GET",status="200"\} 2/);
  });

  it("renders histograms with buckets, sum and count", () => {
    observeHistogram("eventiq_test_duration_ms", 12, { method: "GET" });
    observeHistogram("eventiq_test_duration_ms", 300, { method: "GET" });
    const out = renderMetrics();
    expect(out).toContain("# TYPE eventiq_test_duration_ms histogram");
    expect(out).toContain('eventiq_test_duration_ms_bucket{method="GET",le="+Inf"} 2');
    expect(out).toContain('eventiq_test_duration_ms_count{method="GET"} 2');
    expect(out).toContain('eventiq_test_duration_ms_sum{method="GET"} 312');
  });

  it("counts values into the correct buckets", () => {
    observeHistogram("eventiq_bucket_test", 8, {});
    const out = renderMetrics();
    // 8 <= 10 bucket should be 1
    expect(out).toContain('eventiq_bucket_test_bucket{le="10"} 1');
    // 8 > 5 bucket should be 0
    expect(out).toContain('eventiq_bucket_test_bucket{le="5"} 0');
  });
});
