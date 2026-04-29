# Sample authoring

MCEval samples should be hand-written, small, and deterministic.

## Good sample shape

```ts
{
  id: "vanilla-versions-001",
  input: "Which Minecraft update added the Nether dimension?",
  target: "Alpha 1.2.0",
  metadata: {
    acceptedTargets: ["Halloween Update"],
    tags: ["vanilla", "versions"],
    difficulty: "easy",
    rationale: "Tests historical version knowledge with one stable answer."
  }
}
```

## Rules

- Use stable lowercase ids.
- Ask one thing per sample.
- Prefer answers that can be scored without another model.
- Put wording variants in `metadata.acceptedTargets`.
- Add tags for topic and difficulty.
- Avoid broad essay prompts until a deterministic scorer exists.

Validate drafts from the dashboard before freezing a ready version.
