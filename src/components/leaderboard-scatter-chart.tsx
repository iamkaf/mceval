"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export type ScatterPoint = {
  name: string;
  cost: number;
  score: number;
  color: string;
};

export function LeaderboardScatterChart({ data }: { data: ScatterPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });

    const option = {
      backgroundColor: "transparent",
      grid: { top: 50, right: 120, bottom: 50, left: 60 },
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as { dataIndex: number };
          const d = data[p.dataIndex];
          return `${d.name}<br/>Score: ${Math.round(d.score * 100)}<br/>Cost: $${d.cost.toFixed(6)}`;
        },
      },
      xAxis: {
        type: "value",
        name: "Cost (USD)",
        nameLocation: "middle",
        nameGap: 30,
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#2a2a2a" } },
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#888", formatter: (v: number) => `$${v.toFixed(4)}` },
      },
      yAxis: {
        type: "value",
        name: "Score",
        max: 100,
        splitLine: { show: true, lineStyle: { type: "dashed", color: "#2a2a2a" } },
        axisLine: { lineStyle: { color: "#444" } },
        axisLabel: { color: "#888" },
      },
      series: [
        {
          type: "scatter",
          data: data.map((d) => ({
            value: [d.cost, Math.round(d.score * 100)],
            itemStyle: { color: d.color },
            label: {
              show: true,
              formatter: d.name,
              position: "right",
              color: "#a0a0a0",
              fontSize: 10,
              distance: 6,
            },
            symbolSize: 10,
          })),
          markArea: {
            silent: true,
            itemStyle: { color: "rgba(34, 197, 94, 0.05)" },
            data: [
              [
                { xAxis: 0, yAxis: 50 },
                { xAxis: "max", yAxis: 100 },
              ],
            ],
          },
        },
      ],
      graphic: [
        {
          type: "text",
          left: 10,
          top: 10,
          style: {
            text: "Most attractive quadrant",
            fill: "#22c55e",
            fontSize: 11,
            fontWeight: "bold",
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

  return <div ref={containerRef} className="h-80 w-full" />;
}
