# vapenyk-eleventy-template-themes

Pre-built CSS theme files for [Eleventy](https://www.11ty.dev/) templates, generated from [tinted-theming/schemes](https://github.com/tinted-theming/schemes).

Each theme provides a complete set of CSS custom properties — palette colors, semantic design tokens, HSL decomposition, shadows, radii, and transitions — ready to drop into any Eleventy project.

## Structure

```
.
├── schemes/            # git submodule → tinted-theming/schemes
│   ├── base16/         # 305 base16 color schemes (.yaml)
│   └── base24/         # 184 base24 color schemes (.yaml)
├── generate.ts         # Bun script that reads schemes and generates CSS
├── generate.test.ts    # Unit tests for pure functions (bun test)
├── package.json        # bun run generate / bun test
└── dist/               # Generated CSS files
    ├── base16/
    │   ├── dark/
    │   └── light/
    └── base24/
        ├── dark/
        └── light/
```

> Themes that fail WCAG 2.1 contrast validation are automatically rejected during generation.

## Quick Start

```bash
git clone --recurse-submodules https://github.com/vapenyk/vapenyk-eleventy-template-themes.git
cd vapenyk-eleventy-template-themes
bun install
bun run generate
bun test
```

## Usage

### 1. Pick a theme

Browse `dist/` and choose a CSS file, for example `dist/base16/dark/dracula.css`.

### 2. Include in your Eleventy project

```html
<link rel="stylesheet" href="/css/theme.css">
```

### 3. Use the variables

```css
body {
  background: var(--color-bg);
  color: var(--color-text);
}

a {
  color: var(--color-link);
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-link-hover);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

## CSS Variables Reference

Each generated theme provides the following custom properties:

| Category | Variables |
|----------|-----------|
| **Palette** | `--base00` … `--base0F` (base16), `--base10` … `--base17` (base24) |
| **HSL** | `--base00-h/s/l`, `--base05-h/s/l`, `--base08-h/s/l`, `--base0B-h/s/l`, `--base0D-h/s/l`, `--base0E-h/s/l` |
| **Backgrounds** | `--color-bg`, `--color-bg-alt`, `--color-surface`, `--color-surface-hover`, `--color-surface-active` |
| **Typography** | `--color-text`, `--color-text-strong`, `--color-text-muted`, `--color-text-subtle`, `--color-heading` |
| **Accents** | `--color-accent`, `--color-accent-hover`, `--color-link`, `--color-link-hover`, `--color-link-visited` |
| **Status** | `--color-success`, `--color-warning`, `--color-error`, `--color-info` |
| **Borders** | `--color-border`, `--color-border-strong`, `--color-divider` |
| **Code** | `--color-code-bg`, `--color-code-text`, `--color-code-keyword`, `--color-code-string`, `--color-code-comment`, `--color-code-function`, `--color-code-variable`, `--color-code-constant`, `--color-code-tag`, `--color-code-attribute` |
| **Shadows** | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| **Radii** | `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (16px), `--radius-xl` (24px), `--radius-full` |
| **Transitions** | `--transition-fast` (150ms), `--transition-normal` (250ms), `--transition-slow` (400ms) |

## How It Works

```
schemes/base16/*.yaml ──┐
                        ├──▶ parse YAML ──▶ validate WCAG ──▶ generate CSS ──▶ dist/
schemes/base24/*.yaml ──┘
```

1. **Discover** — scan `schemes/` for subdirectories with `.yaml` files
2. **Parse** — deserialize each YAML file (`Bun.YAML`)
3. **Validate** — check palette keys + WCAG 2.1 contrast ratios
4. **Classify** — `variant` (dark/light) from YAML, `system` from YAML or directory
5. **Generate** — CSS with palette, HSL, semantic tokens, shadows, radii, transitions
6. **Write** — `dist/{system}/{variant}/{slug}.css` via `Bun.write()`

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Bun](https://bun.sh/) | Runtime, file I/O, YAML parsing, test runner (`Bun.file`, `Bun.write`, `Bun.Glob`, `Bun.YAML`, `bun:test`) |
| [tinted-theming/schemes](https://github.com/tinted-theming/schemes) | Source color schemes (git submodule) |

## Testing

```bash
bun test
```

Unit tests cover all pure functions: color math (hex parsing, WCAG 2.1 luminance/contrast, HSL conversion), color normalization, theme classification (variant/system), and CSS generation.

## Credits

- Color schemes: [tinted-theming/schemes](https://github.com/tinted-theming/schemes) (MIT)
- Generator: [vapenyk](https://github.com/vapenyk)

## License

MIT
