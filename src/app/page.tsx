import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { ModelIcon } from "@/components/model-icon";
import { benchmarks } from "@/data/benchmarks";
import { flagshipModels } from "@/data/models";

const columns = ["Model", ...benchmarks.map((benchmark) => benchmark.name.replace(" Bench", "")), "Overall"];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between gap-6 border-b border-kumo-hairline pb-6">
          <div className="space-y-2">
            <Text as="h1" variant="heading1">
              MCEval
            </Text>
            <Text variant="secondary">Minecraft AI evaluation</Text>
          </div>
          <Text variant="mono-secondary">
            mceval.kaf.sh
          </Text>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {benchmarks.map((benchmark) => (
            <Surface
              className="rounded-xl border border-kumo-hairline bg-kumo-base p-5"
              key={benchmark.name}
            >
              <div className="space-y-3">
                <Text as="h2" variant="heading3">
                  {benchmark.name}
                </Text>
                <Text variant="secondary" size="sm">
                  {benchmark.scope}
                </Text>
              </div>
            </Surface>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Surface className="overflow-hidden rounded-xl border border-kumo-hairline bg-kumo-base">
            <div className="border-b border-kumo-hairline px-5 py-4">
              <Text as="h2" variant="heading3">
                Leaderboard
              </Text>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="border-b border-kumo-hairline text-kumo-subtle">
                  <tr>
                    {columns.map((column) => (
                      <th className="px-5 py-3 font-medium" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flagshipModels.map((entry) => (
                    <tr className="border-b border-kumo-hairline last:border-0" key={entry.provider}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ModelIcon
                            icon={entry.icon}
                            iconAlt={entry.iconAlt}
                            initials={entry.initials}
                          />
                          <div className="space-y-1">
                            <Text>{entry.model}</Text>
                            <Text variant="secondary" size="sm">
                              {entry.provider}
                            </Text>
                          </div>
                        </div>
                      </td>
                      {benchmarks.map((benchmark) => (
                        <td className="px-5 py-4 text-kumo-subtle" key={benchmark.name}>
                          —
                        </td>
                      ))}
                      <td className="px-5 py-4 text-kumo-subtle">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>

          <aside className="space-y-6">
            <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <div className="space-y-4">
                <Text as="h2" variant="heading3">
                  Benchmark suites
                </Text>
                <div className="space-y-3">
                  {benchmarks.map((benchmark, index) => (
                    <div className="grid grid-cols-[2rem_1fr] gap-3" key={benchmark.name}>
                      <Text variant="mono-secondary">
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                      <div className="space-y-1">
                        <Text>{benchmark.name}</Text>
                        <Text variant="secondary" size="sm">
                          {benchmark.scope}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>

            <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-5">
              <div className="space-y-4">
                <Text as="h2" variant="heading3">
                  Flagship models
                </Text>
                <div className="divide-y divide-kumo-hairline">
                  {flagshipModels.map((entry) => (
                    <div className="grid grid-cols-[8rem_1fr] items-center gap-4 py-3 first:pt-0 last:pb-0" key={entry.provider}>
                      <div className="flex items-center gap-3">
                        <ModelIcon
                          icon={entry.icon}
                          iconAlt={entry.iconAlt}
                          initials={entry.initials}
                        />
                        <Text variant="secondary" size="sm">
                          {entry.provider}
                        </Text>
                      </div>
                      <Text size="sm">{entry.model}</Text>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          </aside>
        </section>
      </div>
    </main>
  );
}
