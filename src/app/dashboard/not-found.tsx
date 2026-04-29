import { Text } from "@cloudflare/kumo/components/text";
import { Surface } from "@cloudflare/kumo/components/surface";

export default function DashboardNotFound() {
  return (
    <div className="space-y-6">
      <header className="border-b border-kumo-hairline pb-6">
        <Text as="h1" variant="heading1">Not found</Text>
      </header>
      <Surface className="rounded-xl border border-kumo-hairline bg-kumo-base p-8">
        <Text variant="secondary">The page or resource you requested does not exist.</Text>
      </Surface>
    </div>
  );
}
