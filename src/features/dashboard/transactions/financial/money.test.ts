import { describe, expect, it } from "vitest";
import {
  clampToZero,
  subtractAmounts,
  sumAmounts,
} from "@/features/dashboard/transactions/financial/money";

describe("sumAmounts", () => {
  it("avoids float precision drift", () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });

  it("sums an empty list to zero", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("sums several decimal amounts exactly", () => {
    expect(sumAmounts([12500.5, 340.25, 8990])).toBe(21830.75);
  });
});

describe("subtractAmounts", () => {
  it("avoids float precision drift", () => {
    expect(subtractAmounts(1, 0.9)).toBe(0.1);
  });

  it("can go negative", () => {
    expect(subtractAmounts(5, 10)).toBe(-5);
  });
});

describe("clampToZero", () => {
  it("leaves positive amounts untouched", () => {
    expect(clampToZero(42)).toBe(42);
  });

  it("clamps negative amounts to zero", () => {
    expect(clampToZero(-42)).toBe(0);
  });

  it("leaves zero as zero", () => {
    expect(clampToZero(0)).toBe(0);
  });
});
