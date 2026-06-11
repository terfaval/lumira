import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("backend v2 clean-room quarantine markers", () => {
  it("publishes the backend v2 construction-site note", () => {
    const note = readWorkspaceFile("docs/canon/backend-v2/BACKEND_V2_CONSTRUCTION_SITE.md");

    expect(note).toContain("Backend V2 is clean-room, not V1 migration.");
    expect(note).toContain("reflective_object substrate must not be used for new Backend V2 work.");
    expect(note).toContain("current domain tables are disposable unless explicitly re-approved.");
    expect(note).toContain("V2 canon remains the source of truth.");
  });

  it("marks backend-v2 migration docs as historical only", () => {
    const readme = readWorkspaceFile("docs/backend-v2-migration/README.md");

    expect(readme).toContain("historical");
    expect(readme).toContain("not active implementation authority");
    expect(readme).toContain("not a migration execution authority for new Backend V2 work");
  });

  it("records protected surfaces that still depend on legacy backend modules", () => {
    const ledger = readWorkspaceFile("docs/audits/backend-v2-protected-dependency-ledger-v1.md");

    expect(ledger).toContain("app/capture/page.tsx");
    expect(ledger).toContain("app/page.tsx");
    expect(ledger).toContain("app/objects/[objectId]/page.tsx");
    expect(ledger).toContain("app/api/reflective-space/viewport/route.ts");
  });

  it("removes reflective objects from the default domain barrel", () => {
    const barrel = readWorkspaceFile("src/domain/index.ts");

    expect(barrel).not.toContain('export * from "@/src/domain/reflective-objects/types";');
  });

  it("marks the old backend root and persistence bridge as quarantined legacy areas", () => {
    const reflectiveObjectsReadme = readWorkspaceFile("src/domain/reflective-objects/README.md");
    const persistenceReadme = readWorkspaceFile("src/infrastructure/persistence/README.md");

    expect(reflectiveObjectsReadme).toContain("Legacy Backend V1 Quarantine");
    expect(reflectiveObjectsReadme).toContain("must not be used as the Backend V2 root");
    expect(persistenceReadme).toContain("Legacy Backend V1 Quarantine");
    expect(persistenceReadme).toContain("observation-v2-write-store.ts");
  });
});
