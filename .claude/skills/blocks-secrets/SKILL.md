---
name: blocks-secrets
description: "Save and retrieve arbitrary named secret values (e.g. captcha provider config, third-party API keys) for a SELISE Blocks project via the blocks CLI's `secrets get`/`secrets save` commands, project-scoped with an impersonated project token. CLI-only surface, no SDK equivalent by design. Storage is generic key/value — shape depends entirely on the secret key, not fixed per type. Use for saving/rotating a secret's key-value pairs or reading one back. `get`'s response is the raw, unredacted value — treat CLI output as sensitive."
---

# blocks-secrets

This skill's content lives at [`.codex/skills/blocks-secrets/SKILL.md`](../../../.codex/skills/blocks-secrets/SKILL.md).

**Read that file now and follow it.** Its relative links (`flows/`, sibling files) resolve from that directory, not this one.

This stub exists so Claude Code discovers the skill. It holds no guidance of its own and must never be given any — the `.codex` copy is the single source of truth, and a second copy would drift.
