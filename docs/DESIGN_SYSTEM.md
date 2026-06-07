# GetFlora Design System (локальный snapshot)

Локальная копия UI Kit из Figma. **Агент читает файлы ниже вместо запросов в Figma** для токенов, типографики и списка компонентов.

| Файл | Содержимое |
|------|------------|
| `design/tokens.colors.json` | Все цветовые токены (Text, Background, Border, Status) |
| `design/tokens.typography.json` | Heading H1–H6, Body L/M/S/XS |
| `design/tokens.css` | CSS variables `--gf-*` + utility `.gf-text-h1` … `.gf-text-body-xs` |
| `design/ui-kit.snapshot.json` | Компоненты UI Kit + ссылки на секции Figma |
| `app/globals.css` | Подключает `design/tokens.css` |

Figma MCP — только для refresh или pixel-perfect layout конкретного экрана.

## Источник в Figma

| Секция | nodeId | URL fragment |
|--------|--------|--------------|
| UI Kit (компоненты) | `99:20850` | [UI Kit](https://www.figma.com/design/XMtbYH7An0vDncxWEhAt07/GetFlora?node-id=99-20850) |
| Colors | `31:2004` | Colors frame |
| Typography | `53:11981` | Typography frame |
| fileKey | `XMtbYH7An0vDncxWEhAt07` | |

## Цвета (кратко)

Полный список — `design/tokens.colors.json`.

| Группа | Примеры |
|--------|---------|
| Text | Primary `#222222`, Secondary `#8891A3`, Action `#FD4604` |
| Background | Base `#FFFFFF`, Base Alt `#F6F7F8`, Accent `#FD4604` |
| Border | Normal `#D9DCE1`, Hover `#C9D0D8` |
| Status | Negative `#F12626`, Positive `#15803D`, Info `#2563EB`, Warning `#D97706` |

В CSS и Tailwind:

| Semantic (Tailwind) | Figma token | Значение |
|---------------------|-------------|----------|
| `background` | Background/Base | `#FFFFFF` |
| `foreground` | Text/Primary | `#222222` |
| `muted` | Background/Base Alt | `#F6F7F8` |
| `muted-foreground` | Text/Secondary | `#8891A3` |
| `border` | Border/Normal | `#D9DCE1` |
| `primary` | Background/Accent/Accent 1 | `#FD4604` |
| `primary-foreground` | Text/Primary On Accent 1 | `#FFFFFF` |

Прямые Figma-токены: `text-gf-text-secondary`, `bg-gf-bg-accent-hover`, `text-gf-h4`, `text-gf-body-m`.
Переменные: `var(--gf-*)` в `design/tokens.css`.

## Типографика (кратко)

Полный список — `design/tokens.typography.json`. Шрифт **Inter**.

| Стиль | Size / Line-height | Weight |
|-------|-------------------|--------|
| Heading H1 | 60 / 72 | 700 |
| Heading H2 | 48 / 58 | 700 |
| Heading H3 | 40 / 48 | 700 |
| Heading H4 | 30 / 38 | 700 |
| Heading H5 | 28 / 40 | 600 |
| Heading H6 | 24 / 30 | 600 |
| Body L | 18 / 26 | 400–700 |
| Body M | 16 / 24 | 400–700 |
| Body S | 14 / 22 | 400, 500 |
| Body XS | 12 / 20 | 400, 500 |

Utility-классы: `.gf-text-h1` … `.gf-text-body-xs` (добавить `font-medium`, `font-semibold`, `font-bold` по весу).

Цвет текста по умолчанию в макетах: heading `#111928`, body `#1F2A37`.

## Компоненты UI Kit

См. `design/ui-kit.snapshot.json`.

## Обновление из Figma

Попросите агента «refresh design tokens»:

1. `get_variable_defs` для `31:2004` (Colors) и `get_design_context` для секций Typography (`53:12004`, `53:12024`, …)
2. Обновить `design/tokens.*.json`, `design/tokens.css`, `snapshotAt`
