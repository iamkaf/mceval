import { benchmarkSuiteSchema } from "../schema";

export const minecraftCoreSuite = benchmarkSuiteSchema.parse({
  id: "minecraft-core",
  name: "Minecraft Core Bench",
  description: "Core Minecraft benchmark suite for developing and validating the evaluator harness.",
  samples: [
    {
      id: "knowledge-001",
      input: "Which Minecraft update added the Nether? Answer with the release name only.",
      target: "Alpha 1.2.0",
      metadata: { category: "knowledge", acceptedTargets: ["Halloween Update", "Alpha v1.2.0"] },
    },
    {
      id: "code-001",
      input: "In Minecraft modding, what is a mixin primarily used for? Answer in one sentence.",
      target: "modify",
      metadata: { category: "code" },
    },
    {
      id: "platforms-001",
      input: "Name one major Minecraft mod distribution platform other than CurseForge.",
      target: "Modrinth",
      metadata: { category: "platforms" },
    },
    {
      id: "ecosystem-001",
      input: "Name one modern Minecraft mod loader in the Forge/Fabric ecosystem.",
      target: "Fabric",
      metadata: { category: "ecosystem" },
    },
  ],
});
