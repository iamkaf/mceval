"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export type TokenBarItem = {
  name: string;
  promptTokens: number;
  completionTokens: number;
  color: string;
};

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function TokenUsageBarChart({ data }: { data: TokenBarItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

    const sorted = [...data].sort((a, b) => {
      const totalA = a.promptTokens + a.completionTokens;
      const totalB = b.promptTokens + b.completionTokens;
      return totalB - totalA;
    });

    const option = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown[]) => {
          const p = params as Array<{ name: string; value: number; seriesName: string }>;
          const name = p[0]?.name ?? "";
          const rows = p
            .map(
              (item) =>
                `${item.seriesName}: ${Number(item.value).toLocaleString()}`,
            )
            .join("<br/>");
          return `${name}<br/>${rows}`;
        },
      },
      legend: {
        data: ["Prompt tokens", "Completion tokens"],
        textStyle: { color: "#888" },
        bottom: 0,
      },
      grid: { top: 10, right: 30, bottom: 40, left: 120 },
      xAxis: {
        type: "value",
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#2a2a2a" } },
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#888", formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)) },
      },
      yAxis: {
        type: "category",
        data: sorted.map((d) => d.name),
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#aaa", fontSize: 11 },
        inverse: true,
      },
      series: [
        {
          name: "Prompt tokens",
          type: "bar",
          stack: "total",
          data: sorted.map((d) => ({
            value: d.promptTokens,
            itemStyle: { color: "#60a5fa", opacity: 0.6 },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: "inside",
            formatter: (p: { value: number }) =>
              p.value > 500 ? formatTokens(p.value) : "",
            color: "#fff",
            fontSize: 10,
          },
        },
        {
          name: "Completion tokens",
          type: "bar",
          stack: "total",
          data: sorted.map((d) => ({
            value: d.completionTokens,
            itemStyle: { color: "#3b82f6", opacity: 0.9 },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: "inside",
            formatter: (p: { value: number }) =>
              p.value > 500 ? formatTokens(p.value) : "",
            color: "#fff",
            fontSize: 10,
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={containerRef} className="h-[320px] w-full" />;
}
