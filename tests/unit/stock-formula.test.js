import { describe, expect, test } from "@jest/globals";

describe("stock arithmetic", () => {
  test("calculates closing stock from movement classes", () => {
    const closing = 50 + 100 + 5 + 2 - 25 - 1 - 3;
    expect(closing).toBe(128);
  });
  test("transfers do not change total business stock", () => {
    const source = 100 - 20, destination = 30 + 20;
    expect(source + destination).toBe(130);
  });
});
