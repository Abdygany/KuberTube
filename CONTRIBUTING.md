# Contributing to KuberTube

Спасибо за интерес. KuberTube — open-source учебный workspace под MIT
лицензией. Здесь — короткий гайд как развернуть локально и какие правила
соблюдает кодовая база.

## Local setup

```bash
git clone https://github.com/Abdygany/KuberTube.git
cd KuberTube
cp .env.example .env
# Сгенерируйте секреты:
#   openssl rand -base64 32   → BETTER_AUTH_SECRET
#   openssl rand -hex 32      → ENCRYPTION_KEY
pnpm install
docker compose up -d
pnpm db:migrate   # или `pnpm db:push` для быстрого dev-цикла
pnpm dev          # web на :3000, api на :3001
```

Подробности — `/docs/self-host` или [docs/self-host/page.tsx](apps/web/src/app/docs/self-host/page.tsx).

## Что меняется и где

| Хочешь делать | Файлы |
|---|---|
| Добавить tRPC процедуру | `apps/api/src/trpc/routers/` |
| Изменить DB-схему | `packages/db/src/schema/*` → `pnpm db:generate` → коммит миграции |
| Добавить чистую утилиту (без node-only зависимостей) | `packages/core/src/` + тест |
| Поправить UI | `apps/web/src/` |
| Поменять копирайт продукта | помни про PDF §5 «Девять UX-принципов» |

## Принципы кода

Эти конкретные правила — отражение того, что мы [уже исправляли в ревью](https://github.com/Abdygany/KuberTube/pulls). Просьба соблюдать.

1. **Никаких рекомендаций / «похожих»**. PDF §5 принцип 1: «Никогда. Ни на каком экране». Если задача требует что-то рекомендовать — это сигнал что задача мимо позиционирования продукта.
2. **Server-only маркер**. Любой файл в `@kubertube/core`, использующий `node:*` модули, должен иметь `import "server-only";` сверху. Подвыходы `./filters`, `./url`, `./format`, `./html`, `./slug`, `./search-types` обязаны оставаться браузер-совместимыми — клиентский код импортирует их без вытягивания crypto.
3. **AAD в crypto**. Любой новый зашифрованный per-row payload использует `apiKeyAad(userId, provider)` или аналогичную привязку, чтобы ciphertext одной строки нельзя было подсунуть в другую.
4. **httpsUrlSchema**. Любой user-supplied URL валидируется через `httpsUrlSchema` (`@kubertube/core/url`) — `z.string().url()` пропускает `javascript:` и `data:`.
5. **SSRF**. Любая outbound-фетч пользовательских URL идёт через `apps/api/src/lib/reader.ts` (custom undici Agent с DNS pinning + private-IP guard) или эквивалент. Не используйте `fetch` напрямую для user-supplied хостов.
6. **Авторизация по join'ам**. Доступ к ресурсу/заметке проверяется JOIN'ом через `workspaces.user_id = ctx.user.id`, не доверяя `resourceId` напрямую. Шаблон — `assertOwnsResource` / `assertOwnsNote`.
7. **Optimistic updates** для мутаций, чей результат сразу показывается пользователю (add/remove/markCompleted). См. шаблон в `_client.tsx`.
8. **Tests на крипто/безопасность**. Любая правка в `crypto.ts`, `key-validators.ts`, `reader.ts isPrivateIp` обязана сопровождаться тестом.

## Workflow

1. Создай ветку от `main`.
2. Сделай коммит. Pre-commit hook прогонит `prettier --write` через `lint-staged` на staged-файлах. Полные проверки (`pnpm lint && pnpm typecheck && pnpm test`) — рекомендуется прогонять локально перед пушем; они обязательны в CI.
3. Открой PR против `main`. Шаблон заполнится автоматически.
4. CI (`.github/workflows/ci.yml`) запускает typecheck + lint + test + format:check + build. Должно быть зелёное.
5. Один аппрув + зелёный CI → merge.

## Что НЕ принимаем

- Фичи из «Won't have for MVP» (PDF §2): рекомендации, ленты, геймификация, флешкарты, AI-агент проводящий через материал, push без явного запроса. Их обсуждаем в issue до начала работы.
- Изменения, добавляющие трекинг / телеметрию пользовательских действий за пределами требуемого для работы продукта. Принцип «продукт не борется за внимание» — закон проекта.
- Зависимости весом > 100 KB без обсуждения.

## License

Соглашаясь с PR, ты соглашаешься на MIT лицензию для своего вклада.
