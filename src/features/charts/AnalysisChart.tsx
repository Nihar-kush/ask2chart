import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { BarChart, LineChart } from "echarts/charts";
import {
  DatasetComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { getInstanceByDom, init, use as registerECharts } from "echarts/core";
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

    const isMonthly = type === "line";
    const source = rows.map(({ group, value }) => {
      const number = value === null ? NaN : Number(value);
      // Use UTC month starts so the distance between points shows elapsed time
      const x = isMonthly ? Date.parse(`${group}-01T00:00:00Z`) : group;
      return [x, Number.isFinite(number) ? number : null, group];
    });

    chart.setOption(
      {
        animation: false,
        useUTC: true,
        dataset: { dimensions: ["x", "value", "group"], source },
        grid: { left: 64, right: 20, top: 18, bottom: 36 },
        tooltip: {
          trigger: "axis",
          renderMode: "richText",
          confine: true,
        },
        xAxis: {
          type: isMonthly ? "time" : "category",
          axisTick: { show: false },
          axisLabel: {
            formatter: isMonthly ? "{yyyy}-{MM}" : (label: string) => label,
            hideOverlap: true,
            overflow: "truncate",
            width: 100,
          },
        },
        yAxis: {
          type: "value",
          scale: type === "line",
          axisLabel: {
            formatter: (value: number) => axisNumber.format(value),
          },
        },
        series: [
          {
            id: "metric",
            name: metric,
            type,
            encode: {
              x: "x",
              y: "value",
              itemName: "group",
              tooltip: ["value"],
            },
            barMaxWidth: 64,
            symbolSize: 7,
            lineStyle: { width: 2 },
            emphasis: {
              itemStyle: { color: "inherit" },
              lineStyle: { width: 3 },
            },
          },
        ],
      },
      { replaceMerge: "series" },
    );
  }, [metric, rows, type]);

  useEffect(() => {
    const host = hostRef.current;
    const chart = host && getInstanceByDom(host);
    if (!host || !chart) return;

    const style = getComputedStyle(host);
    const token = (name: string) => style.getPropertyValue(name).trim();
    const axisColor = token("--muted-foreground");
    const borderColor = token("--border");
    const textColor = token("--card-foreground");
    const tooltipBackground = token("--popover");
    const tooltipText = token("--popover-foreground");

    // Merge appearance so switching themes keeps the current chart and dataset
    chart.setOption(
      {
        darkMode: resolvedTheme === "dark",
        backgroundColor: token("--card"),
        color: [token("--chart-3")],
        textStyle: { color: textColor, fontFamily: style.fontFamily },
        xAxis: {
          axisLine: { lineStyle: { color: borderColor } },
          axisLabel: { color: axisColor },
        },
        yAxis: {
          axisLabel: { color: axisColor },
          splitLine: { lineStyle: { color: borderColor } },
        },
        tooltip: {
          borderColor,
          backgroundColor: tooltipBackground,
          textStyle: { color: tooltipText },
          axisPointer: {
            lineStyle: { color: axisColor, type: "dashed" },
            label: { color: tooltipText, backgroundColor: tooltipBackground },
          },
        },
        series: [
          {
            id: "metric",
            type,
            label: { color: textColor },
            emphasis: { itemStyle: { borderColor: textColor, borderWidth: 1 } },
          },
        ],
      },
      { silent: true },
    );
  }, [resolvedTheme, type]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={title}
      className="h-64 min-w-0 bg-card text-card-foreground sm:h-72"
    />
  );
}
