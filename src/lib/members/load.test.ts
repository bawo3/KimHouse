import { describe, expect, it } from "vitest";
import { loadMembersFromDisk } from "@/lib/members/load";

describe("loadMembersFromDisk", () => {
  it("loads and validates the real data/members.json seed file", () => {
    const members = loadMembersFromDisk();

    expect(members.length).toBeGreaterThan(0);
    expect(members.some((member) => member.role === "admin")).toBe(true);
  });
});
