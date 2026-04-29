"use client";

import { useState } from "react";

import { Badge } from "@cloudflare/kumo/components/badge";
import { Select } from "@cloudflare/kumo/components/select";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Table } from "@cloudflare/kumo/components/table";
import { Text } from "@cloudflare/kumo/components/text";

import type { PublishedSuiteSample } from "@/server/db/cloud-suites";

export type SamplesViewProps = {
  samples: PublishedSuiteSample[];
  suiteKeys: string[];
  selectedSuite: string;
};

export function SamplesView({ samples, suiteKeys, selectedSuite }: SamplesViewProps) {
  const [suite, setSuite] = useState(selectedSuite);

  const filtered = suite ? samples.filter((s) => s.suiteKey === suite) : samples;

  return (
    <div className="space-y-6">
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Samples</Text>
        <Text variant="secondary">Browse published suite samples.</Text>
      </header>

      {suiteKeys.length > 0 && (
        <div className="max-w-sm">
          <Select
            label="Suite"
            value={suite}
            onValueChange={(value) => {
              const v = value ?? "";
              setSuite(v);
              const url = new URL(window.location.href);
              url.searchParams.set("suite", v);
              window.history.replaceState({}, "", url);
            }}
            items={suiteKeys.map((key) => ({ label: key, value: key }))}
          />
        </div>
      )}

      <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
        <div className="overflow-x-auto">
          <Table layout="auto">
            <Table.Header>
              <Table.Row>
                <Table.Head>ID</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Difficulty</Table.Head>
                <Table.Head>Prompt</Table.Head>
                <Table.Head>Target</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((sample) => (
                <Table.Row key={`${sample.suiteKey}-${sample.stableId}`}>
                  <Table.Cell className="font-mono text-xs">{sample.stableId}</Table.Cell>
                  <Table.Cell>
                    <Badge variant="secondary">{sample.category || "—"}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="secondary">{sample.difficulty || "—"}</Badge>
                  </Table.Cell>
                  <Table.Cell className="max-w-md">
                    <Text size="sm">{sample.input}</Text>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-xs">{sample.target ?? "—"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Surface>
    </div>
  );
}
