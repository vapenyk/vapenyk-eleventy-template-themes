// =============================================================================
// generate.test.ts — Unit tests for pure functions in generate.ts
// =============================================================================
// Covers:  parseHex, relativeLuminance, contrastRatio, hexToHsl,
//          normalizeColor, determineVariant, determineSystem, generateCss
//
// Usage:   bun test
// =============================================================================

import { describe, test, expect } from "bun:test";
import {
    parseHex,
    hexToHsl,
    normalizeColor,
    determineVariant,
    determineSystem,
    generateCss,
    type TintedScheme,
} from "./generate";

// =============================================================================
// Color math — hex parsing
// =============================================================================

describe("parseHex", () => {
    test("parses 6-digit hex with #", () => {
        expect(parseHex("#ff0000")).toEqual([1, 0, 0]);
    });

    test("parses 6-digit hex without #", () => {
        expect(parseHex("00ff00")).toEqual([0, 1, 0]);
    });

    test("returns null for short strings", () => {
        expect(parseHex("#fff")).toBeNull();
    });

    test("returns null for empty string", () => {
        expect(parseHex("")).toBeNull();
    });

    test("returns null for invalid hex characters", () => {
        expect(parseHex("#zzzzzz")).toBeNull();
    });

    test("handles black and white", () => {
        expect(parseHex("#000000")).toEqual([0, 0, 0]);
        expect(parseHex("#ffffff")).toEqual([1, 1, 1]);
    });
});


// =============================================================================
// Color math — hex to HSL conversion
// =============================================================================

describe("hexToHsl", () => {
    test("pure red → H=0, S=100, L=50", () => {
        const [h, s, l] = hexToHsl("#ff0000");
        expect(h).toBeCloseTo(0, 0);
        expect(s).toBeCloseTo(100, 0);
        expect(l).toBeCloseTo(50, 0);
    });

    test("pure green → H=120", () => {
        const [h] = hexToHsl("#00ff00");
        expect(h).toBeCloseTo(120, 0);
    });

    test("pure blue → H=240", () => {
        const [h] = hexToHsl("#0000ff");
        expect(h).toBeCloseTo(240, 0);
    });

    test("white → S=0, L=100", () => {
        const [, s, l] = hexToHsl("#ffffff");
        expect(s).toBeCloseTo(0, 0);
        expect(l).toBeCloseTo(100, 0);
    });

    test("black → S=0, L=0", () => {
        const [, s, l] = hexToHsl("#000000");
        expect(s).toBeCloseTo(0, 0);
        expect(l).toBeCloseTo(0, 0);
    });

    test("gray → S=0", () => {
        const [, s] = hexToHsl("#808080");
        expect(s).toBeCloseTo(0, 0);
    });
});

// =============================================================================
// Color normalization — strip/add '#', lowercase, trim
// =============================================================================

describe("normalizeColor", () => {
    test("adds # to bare hex", () => {
        expect(normalizeColor("aabbcc")).toBe("#aabbcc");
    });

    test("keeps single # intact", () => {
        expect(normalizeColor("#aabbcc")).toBe("#aabbcc");
    });

    test("fixes ## double-hash bug", () => {
        expect(normalizeColor("##aabbcc")).toBe("#aabbcc");
    });

    test("lowercases input", () => {
        expect(normalizeColor("AABBCC")).toBe("#aabbcc");
    });

    test("trims whitespace", () => {
        expect(normalizeColor("  #aabbcc  ")).toBe("#aabbcc");
    });
});

// =============================================================================
// Theme classification — variant (dark/light)
// =============================================================================

describe("determineVariant", () => {
    const base = { name: "test", author: "test", palette: {} };

    test("uses YAML variant field when present", () => {
        expect(determineVariant({ ...base, variant: "dark" })).toBe("dark");
        expect(determineVariant({ ...base, variant: "Light" })).toBe("light");
    });

    test("falls back to dark when variant is missing or invalid", () => {
        expect(determineVariant(base)).toBe("dark");
        expect(determineVariant({ ...base, variant: "blue" })).toBe("dark");
    });
});

// =============================================================================
// Theme classification — system (base16/base24)
// =============================================================================

describe("determineSystem", () => {
    const base = { name: "test", author: "test", palette: {} };

    test("uses YAML system field when present", () => {
        expect(determineSystem({ ...base, system: "base24" }, "base16")).toBe("base24");
    });

    test("falls back to prefix", () => {
        expect(determineSystem(base, "base16")).toBe("base16");
    });

    test("falls back to 'base16' when prefix is empty", () => {
        expect(determineSystem(base, "")).toBe("base16");
    });

    test("lowercases system from YAML", () => {
        expect(determineSystem({ ...base, system: "Base24" }, "base16")).toBe("base24");
    });
});

// =============================================================================
// CSS generation — semantic design tokens
// =============================================================================

describe("generateCss", () => {
    const scheme: TintedScheme = {
        name: "Test Theme",
        author: "Test Author",
        palette: {
            base00: "1a1a2e",
            base01: "16213e",
            base02: "0f3460",
            base03: "533483",
            base04: "8884ff",
            base05: "e0e0e0",
            base06: "f0f0f0",
            base07: "ffffff",
            base08: "e94560",
            base09: "f5a623",
            base0A: "f7dc6f",
            base0B: "52be80",
            base0C: "76d7ea",
            base0D: "5dade2",
            base0E: "a569bd",
            base0F: "d35400",
        },
    };

    test("starts with header comment", () => {
        const css = generateCss(scheme, "dark", "base16");
        expect(css).toStartWith("/**");
        expect(css).toContain("@theme   Test Theme");
        expect(css).toContain("@author  Test Author");
    });

    test("contains :root with color-scheme", () => {
        const css = generateCss(scheme, "dark", "base16");
        expect(css).toContain("color-scheme: dark;");
    });

    test("contains palette variables", () => {
        const css = generateCss(scheme, "dark", "base16");
        expect(css).toContain("--base00: #1a1a2e;");
        expect(css).toContain("--base0D: #5dade2;");
    });



    test("ends with closing brace", () => {
        const css = generateCss(scheme, "dark", "base16");
        expect(css.trim()).toEndWith("}");
    });
});
