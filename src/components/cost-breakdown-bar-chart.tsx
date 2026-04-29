"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export type CostBarItem = {
  name: string;
  cost: number;
  color: string;
};

export function CostBreakdownBarChart({ data }: { data: CostBarItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

    const sorted = [...data].sort((a, b) => b.cost - a.cost);

    const option = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown[]) => {
          const p = params as Array<{ name: string; value: number }>;
          const item = p[0];
          return `${item.name}<br/>Cost: $${Number(item.value).toFixed(6)}`;
        },
      },
      grid: { top: 10, right: 80, bottom: 20, left: 120 },
      xAxis: {
        type: "value",
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#2a2a2a" } },
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#888", formatter: (v: number) => `$${v.toFixed(3)}` },
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
          type: "bar",
          data: sorted.map((d) => ({
            value: d.cost,
            itemStyle: { color: d.color, opacity: 0.85 },
          })),
          barWidth: 18,
          label: {
            show: true,
            position: "right",
            formatter: (p: { value: number }) => `$${Number(p.value).toFixed(6)}`,
            color: "#aaa",
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
