import { expect, test } from "bun:test";
import { formatPostDate } from "./dates";

test("a late-evening UTC post shows the Stockholm day", () => {
  // 23:30 UTC on 1 Nov is already 2 Nov in Stockholm.
  expect(formatPostDate("2026-11-01T23:30:00Z")).toBe("November 2, 2026");
});

test("an unreadable date renders nothing instead of Invalid Date", () => {
  expect(formatPostDate("not a date")).toBe("");
});
