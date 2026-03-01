// =============================================================================
// generate.ts — Theme CSS generator for vapenyk-eleventy-template-themes
// =============================================================================
// Reads:   ./schemes/{base16,base24}/*.yaml  (tinted-theming format)
// Writes:  ./dist/{system}/{variant}/{slug}.css
//
// Features:
//   - Auto-detects prefix directories (base16, base24, ...)
//   - Reads `variant` field from YAML for dark/light classification
//   - Validates WCAG 2.1 contrast ratios (rejects low-contrast themes)
//   - Generates semantic CSS custom properties + HSL decomposition
//
// Usage:   bun run generate.ts
// Repository: https://github.com/vapenyk/vapenyk-eleventy-template-themes
// =============================================================================

import { readdir, rm, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { Glob } from "bun";

// =============================================================================
// Types
// =============================================================================

export interface TintedScheme {
    system?: string;
    name: string;
    author: string;
    variant?: string;
    palette: Record<string, string>;
}

interface Stats {
    success: number;
    dark: number;
    light: number;
    rejectedWcag: number;
    skippedMissingKeys: number;
    errors: number;
}

// =============================================================================
// Color math — WCAG 2.1 contrast, relative luminance, hex ↔ HSL
// =============================================================================

// -----------------------------------------------------------------------------
// parseHex — "#rrggbb" → [r, g, b] as floats in [0.0, 1.0]
// Strips leading '#', returns null on invalid input.
// -----------------------------------------------------------------------------
export function parseHex(hex: string): [number, number, number] | null {
    hex = hex.replace(/^#/, "");
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
}

// -----------------------------------------------------------------------------
// relativeLuminance — WCAG 2.1 §1.4.3 relative luminance of a hex color
// Used by contrastRatio() to validate accessibility.
// -----------------------------------------------------------------------------
export function relativeLuminance(hex: string): number {
    const [r, g, b] = parseHex(hex) ?? [0, 0, 0];
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// -----------------------------------------------------------------------------
// contrastRatio — WCAG 2.1 contrast ratio between two hex colors
// Returns a value ≥ 1.0; higher = more contrast.
// Thresholds: 4.5:1 for normal text, 3.0:1 for large text / UI components.
// -----------------------------------------------------------------------------
export function contrastRatio(hex1: string, hex2: string): number {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (brighter + 0.05) / (darker + 0.05);
}

// -----------------------------------------------------------------------------
// hexToHsl — convert "#rrggbb" to [H, S%, L%] for CSS HSL decomposition
// Outputs H in [0, 360), S and L in [0, 100].
// -----------------------------------------------------------------------------
export function hexToHsl(hex: string): [number, number, number] {
    const [r, g, b] = parseHex(hex) ?? [0, 0, 0];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (Math.abs(max - min) < 1e-10) return [0, 0, l * 100];

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    if (Math.abs(max - r) < 1e-10) {
        h = (g - b) / d + (g < b ? 6 : 0);
    } else if (Math.abs(max - g) < 1e-10) {
        h = (b - r) / d + 2;
    } else {
        h = (r - g) / d + 4;
    }

    return [h * 60, s * 100, l * 100];
}

// =============================================================================
// Theme classification — variant (dark/light) and system (base16/base24)
// =============================================================================

// -----------------------------------------------------------------------------
// determineVariant — read `variant` from YAML, fall back to luminance check
// Priority: YAML field → luminance(base00) vs luminance(base05)
// -----------------------------------------------------------------------------
export function determineVariant(scheme: TintedScheme, base00: string, base05: string): string {
    if (scheme.variant) {
        const v = scheme.variant.toLowerCase();
        if (v === "dark" || v === "light") return v;
    }
    return relativeLuminance(base00) < relativeLuminance(base05) ? "dark" : "light";
}

// -----------------------------------------------------------------------------
// determineSystem — read `system` from YAML, fall back to prefix directory name
// Priority: YAML field → prefix parameter → "base16"
// -----------------------------------------------------------------------------
export function determineSystem(scheme: TintedScheme, prefix: string): string {
    if (scheme.system) return scheme.system.toLowerCase();
    return prefix || "base16";
}

// =============================================================================
// Color normalization
// =============================================================================

// -----------------------------------------------------------------------------
// normalizeColor — strip leading '#', lowercase, re-add single '#'
// Prevents the "##rrggbb" bug when YAML values already contain '#'.
// -----------------------------------------------------------------------------
export function normalizeColor(raw: string): string {
    return `#${raw.trim().replace(/^#+/, "").toLowerCase()}`;
}

// =============================================================================
// CSS generation — semantic design tokens for Eleventy templates
// =============================================================================

// -----------------------------------------------------------------------------
// generateCss — build a complete :root {} block for the given scheme
// Sections: palette → HSL decomposition → semantic tokens →
//           shadows → radii → transitions
// -----------------------------------------------------------------------------
export function generateCss(scheme: TintedScheme, variant: string, system: string): string {
    const lines: string[] = [];
    const push = (s: string) => lines.push(s);

    // Header comment
    push(`/**`);
    push(` * @theme   ${scheme.name}`);
    push(` * @author  ${scheme.author}`);
    push(` * @system  ${system}`);
    push(` * @variant ${variant}`);
    push(` *`);
    push(` * Generated by vapenyk-theme-generator`);
    push(` * https://github.com/vapenyk/vapenyk-eleventy-template-themes`);
    push(` */`);
    push(``);
    push(`:root {`);
    push(`  color-scheme: ${variant};`);

    // Palette — base00..base0F (base16), base10..base17 (base24)
    push(``);
    push(`  /* ── Palette ── */`);
    const keys = Object.keys(scheme.palette).sort();
    for (const key of keys) {
        push(`  --${key}: ${normalizeColor(scheme.palette[key])};`);
    }

    // HSL decomposition of key colors — for alpha/mix operations in CSS
    const hslKeys = ["base00", "base05", "base08", "base0B", "base0D", "base0E"];
    push(``);
    push(`  /* ── HSL decomposed (for alpha/mix) ── */`);
    for (const key of hslKeys) {
        if (scheme.palette[key]) {
            const [h, s, l] = hexToHsl(scheme.palette[key]);
            push(`  --${key}-h: ${h.toFixed(1)};`);
            push(`  --${key}-s: ${s.toFixed(1)}%;`);
            push(`  --${key}-l: ${l.toFixed(1)}%;`);
        }
    }

    // Semantic design tokens
    push(``);
    push(`  /* ── Semantic Design Tokens ── */`);

    push(``);
    push(`  /* Backgrounds */`);
    push(`  --color-bg:              var(--base00);`);
    push(`  --color-bg-alt:          var(--base01);`);
    push(`  --color-surface:         var(--base01);`);
    push(`  --color-surface-hover:   var(--base02);`);
    push(`  --color-surface-active:  var(--base03);`);

    push(``);
    push(`  /* Typography */`);
    push(`  --color-text:            var(--base05);`);
    push(`  --color-text-strong:     var(--base06);`);
    push(`  --color-text-muted:      var(--base04);`);
    push(`  --color-text-subtle:     var(--base03);`);
    push(`  --color-heading:         var(--base06);`);

    push(``);
    push(`  /* Accents */`);
    push(`  --color-accent:          var(--base0D);`);
    push(`  --color-accent-hover:    var(--base0C);`);
    push(`  --color-accent-subtle:   var(--base0D);`);
    push(`  --color-link:            var(--base0D);`);
    push(`  --color-link-hover:      var(--base0C);`);
    push(`  --color-link-visited:    var(--base0E);`);

    push(``);
    push(`  /* Status */`);
    push(`  --color-success:         var(--base0B);`);
    push(`  --color-warning:         var(--base0A);`);
    push(`  --color-error:           var(--base08);`);
    push(`  --color-info:            var(--base0C);`);

    push(``);
    push(`  /* Borders & Dividers */`);
    push(`  --color-border:          var(--base02);`);
    push(`  --color-border-strong:   var(--base03);`);
    push(`  --color-divider:         var(--base01);`);

    push(``);
    push(`  /* Code & Syntax */`);
    push(`  --color-code-bg:         var(--base01);`);
    push(`  --color-code-text:       var(--base05);`);
    push(`  --color-code-keyword:    var(--base0E);`);
    push(`  --color-code-string:     var(--base0B);`);
    push(`  --color-code-comment:    var(--base03);`);
    push(`  --color-code-function:   var(--base0D);`);
    push(`  --color-code-variable:   var(--base08);`);
    push(`  --color-code-constant:   var(--base09);`);
    push(`  --color-code-tag:        var(--base08);`);
    push(`  --color-code-attribute:  var(--base0A);`);

    // Shadows — opacity varies by variant
    push(``);
    push(`  /* Shadows */`);
    if (variant === "dark") {
        push(`  --shadow-color:          0deg 0% 0%;`);
        push(`  --shadow-sm:             0 1px 2px hsl(var(--shadow-color) / 0.40);`);
        push(`  --shadow-md:             0 4px 8px hsl(var(--shadow-color) / 0.45),`);
        push(`                           0 2px 4px hsl(var(--shadow-color) / 0.35);`);
        push(`  --shadow-lg:             0 8px 24px hsl(var(--shadow-color) / 0.50),`);
        push(`                           0 4px 8px hsl(var(--shadow-color) / 0.40);`);
    } else {
        push(`  --shadow-color:          0deg 0% 50%;`);
        push(`  --shadow-sm:             0 1px 2px hsl(var(--shadow-color) / 0.12);`);
        push(`  --shadow-md:             0 4px 8px hsl(var(--shadow-color) / 0.14),`);
        push(`                           0 2px 4px hsl(var(--shadow-color) / 0.08);`);
        push(`  --shadow-lg:             0 8px 24px hsl(var(--shadow-color) / 0.16),`);
        push(`                           0 4px 8px hsl(var(--shadow-color) / 0.10);`);
    }

    // Radii
    push(``);
    push(`  /* Radii */`);
    push(`  --radius-sm:  4px;`);
    push(`  --radius-md:  8px;`);
    push(`  --radius-lg:  16px;`);
    push(`  --radius-xl:  24px;`);
    push(`  --radius-full: 9999px;`);

    // Transitions
    push(``);
    push(`  /* Transitions */`);
    push(`  --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);`);
    push(`  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);`);
    push(`  --transition-slow:   400ms cubic-bezier(0.4, 0, 0.2, 1);`);
    push(`}`);
    push(``);

    return lines.join("\n");
}

// =============================================================================
// main — discover prefixes, walk schemes, validate & generate CSS
// =============================================================================

const SCHEMES_DIR = "./schemes";
const OUTPUT_DIR = "./dist";
const REQUIRED_KEYS = ["base00", "base03", "base05", "base0D"] as const;

async function main() {
    // Clean dist before generation
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Auto-discover prefix directories that contain .yaml files
    const entries = await readdir(SCHEMES_DIR, { withFileTypes: true });
    const prefixes: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subEntries = await readdir(join(SCHEMES_DIR, entry.name));
        const hasYaml = subEntries.some((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
        if (hasYaml) prefixes.push(entry.name);
    }

    console.log(`🔍 Discovered prefixes: [${prefixes.map((p) => `"${p}"`).join(", ")}]`);

    const stats: Stats = {
        success: 0,
        dark: 0,
        light: 0,
        rejectedWcag: 0,
        skippedMissingKeys: 0,
        errors: 0,
    };

    // Walk only discovered prefix directories using Bun.Glob
    const glob = new Glob("*.{yaml,yml}");

    for (const prefix of prefixes) {
        const prefixDir = join(SCHEMES_DIR, prefix);

        for await (const file of glob.scan(prefixDir)) {
            const slug = basename(file, extname(file));

            // Skip README and other non-scheme files
            if (slug === "README") continue;

            const filePath = join(prefixDir, file);

            // Read and parse YAML using Bun.file
            let content: string;
            try {
                content = await Bun.file(filePath).text();
            } catch (e) {
                console.error(`⚠️  Failed to read ${filePath}: ${e}`);
                stats.errors++;
                continue;
            }

            let scheme: TintedScheme;
            try {
                scheme = Bun.YAML.parse(content) as TintedScheme;
            } catch (e) {
                console.error(`⚠️  YAML parse error ${filePath}: ${e}`);
                stats.errors++;
                continue;
            }

            if (!scheme?.palette) {
                stats.errors++;
                continue;
            }

            // Check required palette keys
            if (REQUIRED_KEYS.some((k) => !scheme.palette[k])) {
                stats.skippedMissingKeys++;
                continue;
            }

            const base00 = scheme.palette["base00"];
            const base03 = scheme.palette["base03"];
            const base05 = scheme.palette["base05"];
            const base0D = scheme.palette["base0D"];

            // WCAG 2.1 contrast validation
            if (
                contrastRatio(base00, base05) < 4.5 ||
                contrastRatio(base00, base03) < 3.0 ||
                contrastRatio(base00, base0D) < 3.0
            ) {
                stats.rejectedWcag++;
                continue;
            }

            // Classify — no hardcoded keywords
            const variant = determineVariant(scheme, base00, base05);
            const system = determineSystem(scheme, prefix);

            // Generate CSS
            const cssContent = generateCss(scheme, variant, system);

            // Write to dist/{system}/{variant}/{slug}.css using Bun.write
            const outDir = join(OUTPUT_DIR, system, variant);
            await mkdir(outDir, { recursive: true });
            await Bun.write(join(outDir, `${slug}.css`), cssContent);

            if (variant === "dark") stats.dark++;
            if (variant === "light") stats.light++;
            stats.success++;
        }
    }

    // Summary
    console.log();
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║     VAPENYK THEME GENERATOR  —  SUMMARY     ║");
    console.log("╠══════════════════════════════════════════════╣");
    console.log(`║  ✅ Generated themes:         ${String(stats.success).padStart(4)}           ║`);
    console.log(`║     ├── 🌙 dark:              ${String(stats.dark).padStart(4)}           ║`);
    console.log(`║     └── ☀️  light:             ${String(stats.light).padStart(4)}           ║`);
    console.log(`║  🗑️  Rejected (WCAG 2.1):      ${String(stats.rejectedWcag).padStart(4)}           ║`);
    console.log(`║  ⏭️  Skipped (missing keys):   ${String(stats.skippedMissingKeys).padStart(4)}           ║`);
    console.log(`║  ❌ Read/parse errors:         ${String(stats.errors).padStart(4)}           ║`);
    console.log("╚══════════════════════════════════════════════╝");
}

// Only run when executed directly (not when imported by tests)
if (import.meta.main) {
    main();
}
