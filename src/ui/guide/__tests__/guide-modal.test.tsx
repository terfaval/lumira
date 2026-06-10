import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getSleepDreamGuideCardBySlug } from "@/src/content/sleep-dream-guide/search";
import { GuideModal } from "@/src/ui/guide/guide-modal";

describe("GuideModal", () => {
  it("renders card content as one continuous reading block", () => {
    const card = getSleepDreamGuideCardBySlug("stressz-es-alvas");

    expect(card).toBeDefined();

    const markup = renderToStaticMarkup(
      <GuideModal activeCard={card!} relatedCards={[]} onClose={() => undefined} onSelectRelated={() => undefined} />,
    );

    expect(markup).toContain("<div class=");
    expect(markup).toContain(card!.content.join(" "));
    expect(markup).not.toContain(`${card!.content[0]}</p><p>`);
  });
});
