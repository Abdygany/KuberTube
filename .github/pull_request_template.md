## Summary

<!-- 1-3 bullets: what changed and why. -->

## Test plan

<!--
- [ ] Manual flow: ...
- [ ] Unit tests added / updated
- [ ] CI is green
-->

## PROJECT.pdf check

<!--
Any user-facing change should be cross-referenced against PROJECT.pdf
§5 ("Девять UX-принципов"). Confirm the change doesn't violate:

- [ ] No recommendations / "похожих" anywhere
- [ ] No autoplay
- [ ] No infinite scroll
- [ ] No bright notification badges
- [ ] No streaks/badges/XP
- [ ] No dark patterns
- [ ] No surprise content inside a workspace
-->

## Security check (if applicable)

<!--
- [ ] Any user URL passes through `httpsUrlSchema`
- [ ] Any outbound user-URL fetch goes through the SSRF-protected reader pipeline
- [ ] Any new SQL access scoped by `workspaces.user_id = ctx.user.id`
- [ ] Any new server-only file imports `"server-only"` if it uses node-only APIs
-->
