import { useEffect, useRef } from "react";
import { BarChart, LineChart } from "echarts/charts";
import {
  DatasetComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { getInstanceByDom, init, use as registerECharts } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { AnalysisPlan, AnalysisRow } from "@/types/analysis";

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

type AnalysisChartProps = {
  title: string;
  type: AnalysisPlan["chart"];
  metric: string;
  rows: AnalysisRow[];
};

export default function AnalysisChart({
  title,
  type,
  metric,
  rows,
}: AnalysisChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);

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
    const axisColor = style.getPropertyValue("--muted-foreground").trim();
    const borderColor = style.getPropertyValue("--border").trim();
    const seriesColor = style.getPropertyValue("--chart-3").trim();

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
        color: [seriesColor],
        textStyle: { fontFamily: style.fontFamily },
        useUTC: true,
        dataset: { dimensions: ["x", "value", "group"], source },
        grid: { left: 64, right: 20, top: 18, bottom: 36 },
        tooltip: {
          trigger: "axis",
          renderMode: "richText",
          confine: true,
          borderColor,
          backgroundColor: style.backgroundColor,
          textStyle: { color: style.color },
        },
        xAxis: {
          type: isMonthly ? "time" : "category",
          axisTick: { show: false },
          axisLine: { lineStyle: { color: borderColor } },
          axisLabel: {
            color: axisColor,
            formatter: isMonthly ? "{yyyy}-{MM}" : undefined,
            hideOverlap: true,
            overflow: "truncate",
            width: 100,
          },
        },
        yAxis: {
          type: "value",
          scale: type === "line",
          axisLabel: {
            color: axisColor,
            formatter: (value: number) => axisNumber.format(value),
          },
          splitLine: { lineStyle: { color: borderColor } },
        },
        series: [
          {
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
              // Set the hover color explicitly because ECharts can hide bars and lines with OKLCH
              itemStyle: { color: style.color, borderColor: style.color },
              lineStyle: { color: style.color },
            },
          },
        ],
      },
      { notMerge: true },
    );
  }, [metric, rows, type]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={title}
      className="h-64 min-w-0 bg-card text-card-foreground sm:h-72"
    />
  );
}
