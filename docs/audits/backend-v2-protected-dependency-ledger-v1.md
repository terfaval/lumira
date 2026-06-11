# Backend V2 Protected Dependency Ledger v1

Date: 2026-06-11 UTC
Purpose: Record protected pages, routes, and UI surfaces that still depend on quarantined legacy backend modules after the clean-room severance pass.

## Protected Surface Dependencies

| Protected surface | Legacy backend dependency |
| --- | --- |
| `app/capture/page.tsx` | `createReflectiveObjectRepository`, `createObservationV2WriteStore`, `buildLlmSceneObservationExtraction` |
| `app/page.tsx` | `createReflectiveObjectRepository`, homepage orientation composition over reflective-object substrate |
| `app/objects/[objectId]/page.tsx` | object-orientation composition over `ReflectiveObjectRepository`, observation/opening/thread legacy substrate |
| `app/objects/[objectId]/reflect/page.tsx` | object-orientation and reflective-space composition dependencies rooted in legacy backend modules |
| `app/api/reflective-space/viewport/route.ts` | `composeReflectiveSpaceViewport`, `createReflectiveObjectRepository`, current observation/glossary/openings/threads/responses repositories |
| `app/api/reflective-objects/route.ts` | `parseCreateReflectiveObjectInput`, `createReflectiveObjectRepository` |
| `app/api/reflective-objects/[id]/route.ts` | `parseUpdateReflectiveObjectInput`, `createReflectiveObjectRepository` |
| `app/api/reflective-objects/[id]/observations/route.ts` | `parseCreateObservationInput`, `createObservationRepository`, `createReflectiveObjectRepository` |
| `app/api/reflective-objects/[id]/glossary-candidates/route.ts` | `createGlossaryRepository`, `createReflectiveObjectRepository`, current glossary candidate substrate |
| `app/api/reflective-objects/[id]/latent-snapshots/route.ts` | `createLatentRepository`, `createReflectiveObjectRepository`, current latent snapshot substrate |
| `app/api/threads/route.ts` and `app/api/threads/[id]/**` | current threads domain and object-association persistence substrate |
| `app/api/responses/route.ts` and `app/api/responses/[id]/**` | current responses/reflections domain and object-association persistence substrate |
| `app/api/openings/**` | current openings domain and latent-derived persistence substrate |

## Notes

- These surfaces were kept intact on purpose.
- No page, route, or UI deletion was performed in this pass.
- Future Backend V2 reconnect work should replace these dependencies without treating the quarantined backend substrate as canonical.
