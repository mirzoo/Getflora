# Cursor Setup For Getflora

Как проект настроен для **Codex + Cursor** одновременно.

## Что где лежит

| Уровень | Где | Что | Codex | Cursor |
|---------|-----|-----|-------|--------|
| Проект | `AGENTS.md` | Полные правила Getflora | ✅ | ✅ |
| Проект | `.cursor/rules/*.mdc` | То же, разбито по темам | ❌ | ✅ |
| Проект | `docs/*` | Статус, roadmap, security, QA | ✅ | ✅ |
| Проект | `skills/getflora-qa/` | QA-сценарии | ✅ | ⚠️ вручную |
| Пользователь | Cursor User Rules | Личный workflow | ❌ | ✅ |
| Пользователь | Codex Custom Instructions | Личный workflow | ✅ | ❌ |

**Канон:** `AGENTS.md` — один источник проектных правил для обоих инструментов.

## User Rules / Codex Instructions

Один и тот же текст из `docs/CURSOR_USER_RULES.md`:

- **Cursor** → Settings → Rules → User Rules
- **Codex** → Custom Instructions / project instructions

Туда — только личный стиль и git-протокол. Проектные правила Getflora не дублируй — они в `AGENTS.md`.

## QA Skill (только Cursor)

Repo-скил Cursor не подхватывает сам. Варианты:

```bash
mkdir -p ~/.cursor/skills-cursor/getflora-qa
cp skills/getflora-qa/SKILL.md ~/.cursor/skills-cursor/getflora-qa/SKILL.md
```

Codex: читает `skills/getflora-qa/SKILL.md` из репозитория напрямую (если skills включены).

## Memory-bank

Не используем. Источник правды — `docs/PROJECT_NOTES.md` и `docs/ITERATIONS.md`.

## `.cursor/rules/` (опционально для Cursor)

| Файл | Назначение |
|------|------------|
| `getflora-core.mdc` | Стек, команды, контекст |
| `getflora-boundaries.mdc` | Always / Ask First / Never |
| `getflora-security.mdc` | Security, prompt injection |
| `getflora-features.mdc` | `features/*` (по glob) |

Содержание дублирует `AGENTS.md` — это нормально: Cursor получает короткие блоки по контексту.
