# I Glow Beauty Bar — Before & After Catalog

This catalog is the editorial companion to `data/transformations.json`. Each transformation receives one stable `BA-###` ID even when it contains multiple photos or videos.

## Publication standard

A case is publishable only when:

- the client media is confirmed for public use;
- at least one before image and one after image are hosted at stable paths/URLs;
- the treatment/service label is confirmed or written conservatively;
- alt text describes visible content without making unsupported claims;
- lighting, angle, styling, and other meaningful comparison differences are disclosed when relevant;
- related reviews are linked only when the relationship is verified.

## Media naming

For case `BA-001`:

- `ba-001-before.jpg`
- `ba-001-after.jpg`
- `ba-001-before.mp4`
- `ba-001-after.mp4`

Additional media may use `-02`, `-03`, etc. before the extension.

## Catalog

| ID | Title | Category | Core media | Status |
|---|---|---|---|---|
| BA-001 | Copper Revival | Hair / Color Transformation | Before photo + before video + after photo + after video | Staged — awaiting hosted assets and consent confirmation |
| BA-002 | Reserved | — | — | Open |
| BA-003 | Reserved | — | — | Open |
| BA-004 | Reserved | — | — | Open |
| BA-005 | Reserved | — | — | Open |
| BA-006 | Reserved | — | — | Open |
| BA-007 | Reserved | — | — | Open |
| BA-008 | Reserved | — | — | Open |
| BA-009 | Reserved | — | — | Open |
| BA-010 | Reserved | — | — | Open |

## BA-001 — Copper Revival

**Category:** Hair · Color Transformation  
**Working service label:** Hair Color Transformation + Cut + Style  
**Service confirmation required:** Yes  
**Featured candidate:** Yes

### Source media

- Before photo: `9183.jpg`
- Before video: `9185.mp4`
- After photo: `9189.jpg`
- After video: `9188.mp4`

### Visible transformation

The source set documents long hair with dark regrowth and uneven warm copper/orange lengths before the service. The finished set shows a shorter shaped result with a more consistent copper-auburn appearance, additional shine, and soft waves.

### Comparison integrity note

The before and after media use different lighting and backgrounds. Public copy should describe visible differences without implying that every perceived change comes from treatment alone.

### Recommended headline

**Copper Revival**

### Recommended short caption

From uneven warm tones to a polished copper finish with a refreshed shape and soft waves.

### Alt text

**Before:** Before hair transformation showing long hair with dark regrowth and uneven warm copper-orange lengths.

**After:** After hair transformation showing a polished shoulder-length copper auburn style with soft waves.

## Standard fields for every future case

1. `id`
2. `title`
3. `service`
4. `service_tags`
5. `customer_label`
6. `before_image`
7. `before_alt`
8. `after_image`
9. `after_alt`
10. `before_video`
11. `after_video`
12. `source_media`
13. `caption`
14. `description`
15. `date`
16. `consent_confirmed`
17. `media_status`
18. `lighting_note`
19. `service_confirmation_required`
20. `related_review_ids`
21. `featured`

## Intake workflow

1. Assign the next unused BA ID.
2. Group all media from the same client/service session under that ID.
3. Classify each asset as before, after, process, or supporting media.
4. Preserve original filenames in `source_media`.
5. Create web-safe hosted versions using the BA naming convention.
6. Confirm service wording and client permission.
7. Add truthful alt text and comparison notes.
8. Link a related testimonial only when verified.
9. Set `consent_confirmed: true` only after confirmation.
10. Publish and optionally mark exceptional cases as `featured: true`.
