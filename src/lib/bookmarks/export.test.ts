import { beforeEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => new Map<string, unknown>());
vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: data.get(key) }),
        set: async (values: Record<string, unknown>) =>
          Object.entries(values).forEach(([key, value]) =>
            data.set(key, value),
          ),
      },
    },
  },
}));
import { backup, deserialize, importFolders, serialize } from "./export";
import { currentLocation, getFolders, getTrades } from "./storage";
const v1 =
  "eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIiwidHJzIjpbeyJ0aXQiOiJ0ZXN0IHRyYWRlIiwibG9jIjoic2VhcmNoOm93V0pRRWtpbCJ9XX0=";
const v2 =
  "2:eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIPCfl4EiLCJ0cnMiOlt7InRpdCI6InRlc3QgdHJhZGUg8J+amiIsImxvYyI6InNlYXJjaDpvd1dKUUVraWwifV19";
const v3 =
  "3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ0ZXN0IFBvRSAyIGZvbGRlciDwn5eBIiwidmVyIjoiMiIsInRycyI6W3sidGl0IjoidGVzdCBQb0UgMiB0cmFkZSDwn5qaIiwibG9jIjoiMjpzZWFyY2g6Zm9vYmFyIn1dfQ==";
beforeEach(() => data.clear());
describe("legacy bookmark compatibility", () => {
  it("parses both game URLs, live searches, and console realm leagues", () => {
    expect(currentLocation("/trade/search/Standard/abc/live")).toEqual({
      version: "1",
      type: "search",
      league: "Standard",
      slug: "abc",
    });
    expect(currentLocation("/trade2/search/poe2/Standard/abc")).toEqual({
      version: "2",
      type: "search",
      league: "poe2/Standard",
      slug: "abc",
    });
    expect(currentLocation("/trade/exchange/xbox/Standard/xyz").league).toBe(
      "xbox/Standard",
    );
  });
  it("reads original v1, Unicode v2 and PoE2 v3 exports", () => {
    expect(deserialize(v1).trades[0].location).toEqual({
      version: "1",
      type: "search",
      slug: "owWJQEkil",
    });
    expect(deserialize(v2).folder.title).toBe("test folder 🗁");
    expect(deserialize(v3).trades[0].location).toEqual({
      version: "2",
      type: "search",
      slug: "foobar",
    });
  });
  it("round-trips Unicode names and produces new IDs", () => {
    const entry = deserialize(v3);
    const decoded = deserialize(serialize(entry.folder, entry.trades));
    expect(decoded.folder.title).toBe(entry.folder.title);
    expect(decoded.trades[0].title).toBe(entry.trades[0].title);
    expect(decoded.folder.id).not.toBe(entry.folder.id);
  });
  it("validates the entire restore before writing", async () => {
    await expect(importFolders(v1 + "\ninvalid")).rejects.toThrow();
    expect(data.size).toBe(0);
  });
  it("restores both backup sections with legacy envelopes and archive state", async () => {
    await importFolders(v1 + "\n--------------------\n" + v3, true);
    const folders = await getFolders();
    expect(folders).toHaveLength(2);
    expect(folders[0].archivedAt).toBeNull();
    expect(folders[1].archivedAt).toBeTruthy();
    expect(await getTrades(folders[1].id)).toHaveLength(1);
    expect(data.get("bookmark-folders")).toMatchObject({ expiresAt: null });
    const text = await backup();
    expect(text.split("\n--------------------\n")).toHaveLength(2);
  });
  it("migrates legacy folders and trades with missing game versions", async () => {
    data.set("bookmark-folders", {
      value: [{ id: "old", title: "Old" }],
      expiresAt: null,
    });
    data.set("bookmark-trades--old", {
      value: [{ id: "trade", location: { type: "search", slug: "abc" } }],
      expiresAt: null,
    });
    expect((await getFolders())[0].version).toBe("1");
    expect((await getTrades("old"))[0].location.version).toBe("1");
  });
});
