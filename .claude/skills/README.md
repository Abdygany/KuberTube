# Learnspace Skills Bundle

Четыре скилла, расширяющие Claude Code под проект Learnspace.

| Скилл                                                   | Назначение                                               | Триггер                                                       |
| ------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| [`karpathy-guidelines`](./karpathy-guidelines/SKILL.md) | Дисциплина кода: думай → минимум → хирургично → проверка | Перед любым нетривиальным изменением кода                     |
| [`learnspace-soul`](./learnspace-soul/SKILL.md)         | Голос продукта (тексты для пользователя)                 | UI-копи, onboarding, README, landing, docs                    |
| [`gstack-roles`](./gstack-roles/SKILL.md)               | 8 ролей виртуальной команды как `/ls-*` команды          | Задача попадает в роль (CEO/Eng/Design/Review/QA/Ship/CSO/DX) |
| [`superpowers`](./superpowers/SKILL.md)                 | Методология: brainstorm → plan → exec → finish           | Нетривиальные задачи (>2ч, ≥2 зоны кода)                      |

## Источники-вдохновители

Содержимое адаптировано под Learnspace, не копирует оригиналы дословно.

- Karpathy guidelines — по мотивам [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (распаковка наблюдений Андрея Карпатого).
- Soul — по мотивам [aaronjmars/soul.md](https://github.com/aaronjmars/soul.md).
- GStack roles — по мотивам [garrytan/gstack](https://github.com/garrytan/gstack) (Гарри Тан, Y Combinator).
- Superpowers workflow — по мотивам [obra/superpowers](https://github.com/obra/superpowers).

## Как Claude Code читает эти файлы

- Корневой `/CLAUDE.md` загружается автоматически в каждой сессии.
- `SKILL.md` каждого скилла подгружается, когда совпал триггер из его
  frontmatter `description`.
- Дочерние файлы (`SOUL.md`, `STYLE.md`) скилл читает сам, когда переходит в
  свой режим.

## Что делать дальше

1. Открой Claude Code в этом репозитории — корневой `CLAUDE.md` подхватится
   автоматически.
2. Для конкретных задач явно зови `/ls-brainstorm`, `/ls-plan`, `/ls-ship`
   и т.д. — пользователь и сам Claude видят их в SKILL.md.
3. Эти файлы — живые. Когда продукт обновляет PROJECT.pdf, обновляй и их.
