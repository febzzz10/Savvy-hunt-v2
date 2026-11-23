import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeleteAnnouncementDialog } from "../components/admin/announcements/delete-dialog";
const noop = () => {};
const render = (busy = false, error = "") => renderToStaticMarkup(<DeleteAnnouncementDialog title="Sports day moved" busy={busy} error={error} onCancel={noop} onConfirm={noop} />);

describe("delete announcement dialog", () => {
  it("names the announcement, warns that deletion is permanent, and offers both actions", () => {
    const html = render();
    expect(html).toContain("Delete <strong>Sports day moved</strong>?");
    expect(html).toContain("permanently deletes the announcement");
    expect(html).toContain("Audit history is retained");
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain(">Delete Announcement</button>");
  });

  it("shows progress and disables actions while deleting", () => {
    const html = render(true);
    expect(html).toContain("Deleting…");
    expect(html).not.toContain(">Delete Announcement</button>");
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the backend error", () => {
    expect(render(false, "Announcement missing")).toContain("Announcement missing");
  });
});
