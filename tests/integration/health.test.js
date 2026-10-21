import { describe, expect, test } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";

describe("health endpoint", () => {
  test("returns API health without authentication", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
