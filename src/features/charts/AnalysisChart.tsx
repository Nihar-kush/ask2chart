import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { BarChart, LineChart } from "echarts/charts";
import {
  DatasetComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import {
  color,
  getInstanceByDom,
  init,
  use as registerECharts,
} from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useTheme } from "@/components/theme/theme";
import type { AnalysisPlan, AnalysisRow } from "@/types/analysis";
import { downloadChartPng } from "./chartExport";

registerECharts([
  BarChart,
  LineChart,
  DatasetComponent,
  GridComponent,
  TooltipComponent,
  SVGRenderer,
]);

const axisNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export type AnalysisChartHandle = {
  exportPng: (title: string, metric: string) => Promise<void>;
};

type AnalysisChartProps = {
  ref: Ref<AnalysisChartHandle>;
  title: string;
  type: AnalysisPlan["chart"];
  metric: string;
  rows: AnalysisRow[];
};

export default function AnalysisChart({
  ref,
  title,
  type,
  metric,
  rows,
}: AnalysisChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const horizontalBars = type === "bar" && rows.length <= 12;

  useImperativeHandle(
    ref,
    () => ({
      async exportPng(title, metric) {
        const host = hostRef.current;
        const svg = host?.querySelector("svg");
        if (!host || !svg) throw new Error("The chart is still loading.");

        await downloadChartPng(title, metric, svg, getComputedStyle(host));
      },
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = init(host, undefined, { renderer: "svg" });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const chart = host && getInstanceByDom(host);
    if (!host || !chart) return;

    const style = getComputedStyle(host);
    const token = (name: string) => style.getPropertyValue(name).trim();
    const axisColor = token("--muted-foreground");
    const borderColor = token("--border");
    const textColor = token("--card-foreground");
    const seriesColor = token("--chart-3");
    const isMonthly = type === "line";

    const source = rows.map(({ group, value }) => {
      const number = value === null ? NaN : Number(value);
      // UTC month starts preserve the elapsed time between points.
      const x = isMonthly ? Date.parse(`${group}-01T00:00:00Z`) : group;
      return [x, Number.isFinite(number) ? number : null, group];
    });

    const categoryAxis = {
      type: "category",
      inverse: horizontalBars,
      axisTick: { show: false },
      axisLine: { onZero: false, lineStyle: { color: borderColor } },
      axisLabel: {
        color: axisColor,
        hideOverlap: true,
        overflow: "truncate",
        width: horizontalBars ? 80 : 100,
      },
    };
    const valueAxis = {
      type: "value",
      scale: isMonthly,
      show: !horizontalBars,
      axisLabel: {
        color: axisColor,
        formatter: (value: number) => axisNumber.format(value),
      },
      splitLine: { lineStyle: { color: borderColor, type: "dashed" } },
    };
    const series = {
      name: metric,
      type,
      encode: {
        x: horizontalBars ? "value" : "x",
        y: horizontalBars ? "x" : "value",
        itemName: "group",
        tooltip: ["value"],
      },
      emphasis: { itemStyle: { borderColor: textColor, borderWidth: 1 } },
    };
    const areaStyle = {
      opacity: 0.16,
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: seriesColor },
          // An explicit alpha gives the SVG stop a stop-opacity of zero.
          { offset: 1, color: color.modifyAlpha(seriesColor, 0) },
        ],
      },
    };
    const lineStyle = {
      symbol: "circle",
      symbolSize: rows.length <= 24 ? 6 : 4,
      lineStyle: { width: 2 },
      areaStyle,
      emphasis: { ...series.emphasis, areaStyle },
    };
    const barStyle = {
      barMaxWidth: horizontalBars ? 12 : 48,
      itemStyle: { borderRadius: 3 },
      showBackground: horizontalBars,
      backgroundStyle: { color: borderColor, borderRadius: 3 },
      label: {
        show: horizontalBars,
        position: "right",
        color: textColor,
        formatter: ({ dataIndex }: { dataIndex: number }) => {
          const value = source[dataIndex]?.[1];
          const label = rows[dataIndex]?.value;
          if (typeof value !== "number" || !label) return "";
          return label.length <= 8 ? label : axisNumber.format(value);
        },
      },
    };

    chart.setOption(
      {
        animation: false,
        useUTC: true,
        darkMode: resolvedTheme === "dark",
        backgroundColor: token("--card"),
        color: [seriesColor],
        textStyle: { color: textColor, fontFamily: style.fontFamily },
        dataset: { dimensions: ["x", "value", "group"], source },
        grid: horizontalBars
          ? { left: 94, right: 54, top: 8, bottom: 10 }
          : { left: 53, right: 18, top: 14, bottom: 29 },
        xAxis: isMonthly
          ? {
              type: "time",
              minInterval: 28 * 24 * 60 * 60 * 1000,
              axisTick: { show: false },
              axisLine: { lineStyle: { color: borderColor } },
              axisLabel: {
                color: axisColor,
                formatter: "{MMM} {yy}",
                hideOverlap: true,
              },
            }
          : horizontalBars
            ? valueAxis
            : categoryAxis,
        yAxis: horizontalBars ? categoryAxis : valueAxis,
        tooltip: {
          trigger: "axis",
          renderMode: "richText",
          confine: true,
          borderColor,
          backgroundColor: token("--popover"),
          textStyle: { color: token("--popover-foreground") },
          axisPointer: { lineStyle: { color: axisColor, type: "dashed" } },
        },
        series: [{ ...series, ...(isMonthly ? lineStyle : barStyle) }],
      },
      { notMerge: true },
    );
  }, [horizontalBars, metric, resolvedTheme, rows, type]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={title}
      className="h-56 min-w-0 overflow-hidden bg-card text-card-foreground sm:h-64"
      style={horizontalBars ? { minHeight: rows.length * 26 + 24 } : undefined}
    />
  );
}
