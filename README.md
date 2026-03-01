# vapenyk-eleventy-template-themes

Pre-built CSS theme files for [Eleventy](https://www.11ty.dev/) templates, generated from [tinted-theming/schemes](https://github.com/tinted-theming/schemes).

Each theme provides a complete set of CSS custom properties for palette colors, ready to drop into any Eleventy project, backing a centralized theme setup.

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
/* Example mapping of base16 palette to semantic elements */
body {
  background: var(--base00); /* Default Background */
  color: var(--base05);      /* Default Foreground/Text */
}

a {
  color: var(--base0D);      /* Functions, Methods, Attribute IDs, Headings, Links */
}

a:hover {
  color: var(--base0C);      /* Support, Regular Expressions, Escape Characters, Markup Quotes */
}

.card {
  background: var(--base01); /* Lighter Background (Used for status bars, line number and folding marks) */
  border: 1px solid var(--base02); /* Selection Background */
}
```

## CSS Variables Reference

Each generated theme provides the following custom properties:

| Category | Variables |
|----------|-----------|
| **Palette** | `--base00` … `--base0F` (base16), `--base10` … `--base17` (base24) |

## How It Works

```
schemes/base16/*.yaml ──┐
                        ├──▶ parse YAML ──▶ validate ──▶ generate CSS ──▶ dist/
schemes/base24/*.yaml ──┘
```

1. **Discover** — scan `schemes/` for subdirectories with `.yaml` files
2. **Parse** — deserialize each YAML file (`Bun.YAML`)
3. **Validate** — check palette keys
4. **Classify** — `variant` (dark/light) from YAML, `system` from YAML or directory
5. **Generate** — CSS with palette variables
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

Unit tests cover all pure functions: color math (hex parsing), color normalization, theme classification (variant/system), and CSS generation.

## Credits

- Color schemes: [tinted-theming/schemes](https://github.com/tinted-theming/schemes) (MIT)
- Generator: [vapenyk](https://github.com/vapenyk)

## License

MIT
