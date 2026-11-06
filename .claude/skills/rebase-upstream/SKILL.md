---
name: rebase-upstream
description: Rebase this fork onto upstream Gitea and resolve conflicts. Use when the user asks to update from upstream, pull in Gitea changes, or get security fixes.
---

# Rebase on upstream Gitea

This fork is upstream plus a small stack of commits, with the UI rebuild as one commit. Keep it that way: fold UI work into that commit instead of adding more.

1. Start on `main` with a clean tree. Run `git config rerere.enabled true` so a resolved conflict stays resolved.
2. Run `git fetch upstream main`, list the incoming commits with `git log --oneline main..upstream/main`, and point out security fixes, breaking changes and removed features.
3. Run `git rebase upstream/main`.
4. Resolve each conflict:
   - Keep upstream's behavior and markup, including new fields, classes and conditions.
   - Keep the fork's look: tokens from `web_src/css/tokens.css` instead of raw colors, radii, sizes, shadows or durations.
   - If upstream edited a rule the fork rewrote, apply upstream's intent to the fork's rule.
   - In `options/locale`, change only `locale_en-US.json`.
5. Style anything new that upstream added with its own raw values, using the same tokens.
6. Push with `git push --force-with-lease origin main`.

Conflicts land in `web_src/css`, `templates` and Vue components. Backend Go rarely conflicts. Rebasing weekly keeps each round small.
