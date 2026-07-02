import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReflectiveSpaceWorkspace } from "@/src/ui/reflective-space/reflective-space-workspace";

describe("ReflectiveSpaceWorkspace", () => {
  it("does not render the removed Observation Orientation panel label", () => {
    const markup = renderToStaticMarkup(<ReflectiveSpaceWorkspace />);

    expect(markup).toContain("Reflective Space");
    expect(markup).toContain("Reflective Material");
    expect(markup).toContain("Continuity Memory");
    expect(markup).toContain("Optional Openings");
    expect(markup).not.toContain("Observation Orientation");
  });
});
