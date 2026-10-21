import { describe, expect, test } from "@jest/globals";
import { saleSchema } from "../../src/validators/schemas.js";

describe("sale validation", () => {
  test("rejects zero quantity", () => {
    const result = saleSchema.safeParse({ body:{ items:[{oilTypeId:"507f1f77bcf86cd799439011",storageLocationId:"507f1f77bcf86cd799439012",quantityKg:0}] }, query:{}, params:{} });
    expect(result.success).toBe(false);
  });
});
