---
name: blocks-iam-sso-oidc-implementation
description: "Extend or debug the hosted SSO/OIDC login flow `blocks new web` scaffolds into every Blocks app: redirectToProvider → `/login/callback` → session, via the single `blocksClient`. Covers `AuthProvider` status/claims, `RequireAuth`/`RedirectIfAuthenticated` guards, and token refresh. Use for a login button, the OIDC callback, protected routes, a disabled login button, redirect loops, or a session that doesn't stick — on an app `blocks new web` already created. Requires a registered OIDC client (`blocks-iam-sso-oidc-configuration`) and HTTPS on the real domain for testing (`blocks-frontend-local-https`)."
---

# blocks-iam-sso-oidc-implementation

This skill's content lives at [`.codex/skills/blocks-iam-sso-oidc-implementation/SKILL.md`](../../../.codex/skills/blocks-iam-sso-oidc-implementation/SKILL.md).

**Read that file now and follow it.** Its relative links (`flows/`, sibling files) resolve from that directory, not this one.

This stub exists so Claude Code discovers the skill. It holds no guidance of its own and must never be given any — the `.codex` copy is the single source of truth, and a second copy would drift.
