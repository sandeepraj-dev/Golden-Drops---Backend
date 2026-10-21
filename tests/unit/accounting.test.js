import { describe, expect, test } from "@jest/globals";
import { roundMoney, sumMoney, toPaise, fromPaise } from "../../src/utils/money.js";

describe("money helpers", () => {
  test("rounds rupee amounts to two decimals", () => expect(roundMoney(10.235)).toBe(10.24));
  test("sums without carrying floating point noise", () => expect(sumMoney([0.1,0.2])).toBe(0.3));
  test("converts rupees and paise", () => expect(fromPaise(toPaise(125.45))).toBe(125.45));
});
