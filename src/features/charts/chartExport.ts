import type { AnalysisResult } from "@/types/analysis";
import { getAnalysisLabels } from "./analysisLabels";

function safeFilename(title: string) {
  const name = title.replace(/[<>:"/\\|?*]/g, "-").trim();
  return name.slice(0, 100).replace(/[. ]+$/, "") || "analysis";
}

function downloadFile(file: Blob, title: string, extension: "csv" | "png") {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(title)}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function csvCell(value: string, numeric = false) {
  const formulaLike = /^[\t\r\n]|^\s*[=+\-@]/.test(value);
  const text = formulaLike && !numeric ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function downloadResultCsv(title: string, result: AnalysisResult) {
  const { groupLabel, metricLabel } = getAnalysisLabels(result.plan);
  const lines = [
    [csvCell(groupLabel), csvCell(metricLabel)].join(","),
    ...result.rows.map(({ group, value }) => {
      const numeric =
        value !== null && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value);
      return [csvCell(group), csvCell(value ?? "", numeric)].join(",");
    }),
  ];
  const file = new Blob(["\uFEFF", lines.join("\r\n"), "\r\n"], {
    type: "text/csv;charset=utf-8",
  });
  downloadFile(file, title, "csv");
}

export async function downloadChartPng(
  title: string,
  metric: string,
  svg: SVGSVGElement,
  style: CSSStyleDeclaration,
) {
  const { width, height } = svg.getBoundingClientRect();
  if (width <= 0 || height <= 0) throw new Error("The chart is not visible.");
  const { backgroundColor, color, fontFamily } = style;

  // Serialize the rendered SVG so quotes in font names and labels are escaped
  const markup = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  await image.decode();

  const headerHeight = 56;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * 2);
  canvas.height = Math.ceil((height + headerHeight) * 2);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the image.");

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.scale(2, 2);
  const padding = Math.min(16, width / 4);
  context.fillStyle = color;
  context.font = `600 16px ${fontFamily}`;
  context.fillText(title, padding, 25, width - padding * 2);
  if (title !== metric) {
    context.font = `13px ${fontFamily}`;
    context.fillText(metric, padding, 44, width - padding * 2);
  }
  context.drawImage(image, 0, headerHeight, width, height);

  const file = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!file) throw new Error("Could not create the PNG.");
  downloadFile(file, title, "png");
}
