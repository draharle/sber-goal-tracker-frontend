# Дизайн решения: страница модуля ККД

## 1. Стек

Vite 7 + React 18 + TypeScript 5 (strict) + Ant Design 5 + `@ant-design/icons`, шрифт Inter из `@fontsource/inter`
(лежит в сборке, без CDN). Тесты — Vitest. Роутер, менеджер состояния и библиотека запросов не нужны:
страница одна, состояние — в адресе, запросы — свой слой на ~150 строк.

React 18, а не 19: antd 5 официально поддерживает React 16–18, для 19 нужен отдельный патч.

## 2. Модель данных (типы ответов API)

Все типы — в `src/api/types.ts`, формы взяты из `app/main.py` и `app/store.py` mock API.

| Тип | Эндпоинт | Главное |
|---|---|---|
| `Meta` | `GET /api/meta` | `units` (id, name, level, `parent_id`, depth), `rules`, `severities`, `goal_levels`, `metrics`, `delta_statuses` |
| `RunsResponse` = `Page<Run>` | `GET /api/runs?limit=100` | `Run`: id, number, `status` (completed / failed / running), `snapshot_date`, `compared_to_run_id`, `error` |
| `Summary` | `GET /api/kkd/summary?run_id&unit_id` | `run`, `compared_to: Run \| null`, `unit` (с `path`), `metrics: Metric[]`, `issues_by_severity`, `issues_by_rule`, `delta: {new, persisting, resolved}` (каждое `number \| null`) |
| `Metric` | в `Summary` | `value`, `previous`, `delta`, `delta_pct` — `number \| null`; `trend: better \| worse \| same \| null`; `higher_is_better: boolean \| null` |
| `IssuesResponse` | `GET /api/kkd/issues` | `items: Issue[]`, `total`, `limit`, `offset` |
| `Issue` | в списке | `severity`, `rule_code` / `rule_title`, цель и КР, `owner \| null`, `delta_status`, `actual` / `expected` (могут быть `null`), `first_detected_run_id`, `runs_in_row` |
| `IssueDetail` | `GET /api/kkd/issues/{id}?run_id` | `Issue` + `history: {run_id, snapshot_date, run_status, present: boolean \| null}[]` |

Ошибки API — единый формат `{"error": {"code", "message"}}`. Фронтенд превращает их в `ApiError(status, code, message)`
и добавляет свои коды: `NETWORK_ERROR`, `TIMEOUT`, `SERVER_UNAVAILABLE` (5xx без тела — прокси не достучался до API).

## 3. Как страница ходит в API

```
браузер ──/api/*──► Vite dev-сервер (npm run dev) ──► API_PROXY_TARGET (по умолчанию http://localhost:8000)
браузер ──/api/*──► nginx в контейнере (Docker)    ──► http://mock-api:8000
```

- `src/api/http.ts` — `getJson(path, signal)`: базовый адрес `VITE_API_URL` (пусто = тот же origin),
  таймаут 15 секунд, разбор ошибок.
- `src/api/endpoints.ts` — построение путей. Путь с query-строкой — ключ кэша.
- `src/api/queryCache.ts` + `src/hooks/useApiQuery.ts` — кэш запросов (см. решение 4.3).

Порядок запросов при открытии: `meta` и `runs` параллельно → когда известен прогон,
`summary` и `issues` параллельно. Карточка проблемы — только при открытии.

## 4. Ключевые решения

### 4.1. Знак дельты ≠ «лучше / хуже»
Направление (стрелка ↑ / ↓ и знак числа) берётся из знака `delta`. Оценка и цвет — **только** из `trend`.
Поэтому «Найдено проблем ↑ +9» красная с подписью «Хуже», а «Доля корректных целей ↑ +0,8 п.п.» — зелёная «Лучше».
Если `trend = null` (у метрики нет направления «хорошо»), оценка «Без оценки» нейтральным цветом.
У счётчиков по важности и правилам API не отдаёт `trend` — там показываем изменение нейтрально, без оценки:
придумывать её на фронтенде значило бы пересчитывать то, что должен решать бэкенд.
Код: `assessmentOf`, `deltaDirection` в `src/lib/format.ts`, компоненты `DeltaValue`, `AssessmentBadge`.

### 4.2. `null` ≠ 0
`comparisonKind(metric)` различает три случая: `no-value` (значения нет — «Нет данных»),
`no-previous` (сравнивать не с чем — «Нет данных для сравнения»), `compared`. Ноль — настоящее значение,
он показывается как 0. Подразделение без активных целей (`goals_active = 0`, доли `null`) —
отдельное пустое состояние (`isEmptyUnit`), а не карточки с прочерками.

### 4.3. Свой кэш запросов вместо React Query
Нужно было три вещи, и все три — 150 строк без зависимостей:
- **без дублирования**: ключ — путь запроса; пока запрос по ключу идёт или выполнен, второй не отправляется;
- **отмена устаревших**: когда ключ больше никому не нужен (сменили фильтр), его запрос отменяется
  через `AbortController`. Отмена откладывается на один тик: React в StrictMode отписывается и сразу
  подписывается снова — без задержки каждый запрос уходил бы дважды;
- **кэш**: результаты завершённого прогона не меняются, поэтому возврат к уже открытому фильтру — без запроса.
  Хранится до 100 записей, старые неиспользуемые вытесняются.
Подписка компонентов — через `useSyncExternalStore`. Для таблицы есть `keepPreviousData`:
при смене страницы старые строки видны со спиннером, а не мигают скелетоном.
React Query дал бы то же самое плюс то, что здесь не нужно (фоновое обновление, мутации, devtools).

### 4.4. Состояние в адресной строке
`src/lib/pageState.ts`: `parsePageState` / `serializePageState` / `applyPatch`, хук `usePageState`
на History API (`pushState` + `popstate`), без роутера.

| Параметр | Значение | По умолчанию |
|---|---|---|
| `unit` | код подразделения | `B2B` (в адрес не пишется) |
| `run` | `RUN-NNN` | последний успешный, подставляется в адрес через `replaceState` |
| `rule`, `severity`, `status` | списки через запятую | пусто |
| `sort` | `severity` / `age` / `unit` / `rule` | `severity` |
| `page`, `size` | номер страницы, 10 / 20 / 50 | 1, 20 |
| `issue` | id открытой карточки | нет |

Правила: смена подразделения, прогона, фильтра или сортировки сбрасывает страницу на первую;
смена подразделения или прогона закрывает карточку. Мусор в адресе отбрасывается при разборе,
неизвестные коды правил — после загрузки справочника (иначе API ответит 422).

### 4.5. Упавший прогон
Статус прогона известен из `GET /api/runs`. Для `failed` и `running` сводку и таблицу не запрашиваем:
ответ заранее известен (409). Показываем причину (`run.error`) и кнопки на соседние успешные прогоны
(`nearestCompletedRuns`). Если API всё же вернул 409 (статус поменялся), показывается тот же блок.

### 4.6. Тема из токенов
`src/theme/theme.ts` — тема из раздела 1 `UI-KIT.md` один в один, плюс токены из раздела 2
(фон и текст семантических цветов, hover / active / фон акцента) и радиус модалки 28px.
Подключена одним `ConfigProvider` с `ru_RU` в `main.tsx`. Компоненты берут цвета через `theme.useToken()`.
Для своих стилей (`styles.css`: сетки, фокус, hover) `ThemeCssVars` кладёт нужные токены в CSS-переменные
`--kkd-*` на `<html>`. Итог: hex-цвета есть только в `theme.ts`.

Контраст: мелкий текст «лучше / хуже» и тег «Критичная» используют `colorSuccessText` / `colorErrorText`
из кита (контраст ≥ 4.5:1), а основные `colorSuccess` / `colorError` — для значков. Жёлтый текст кита
(`colorWarningText`) на светлом фоне не дотягивает до 4.5:1, поэтому у тега «Существенная» текст основного цвета,
а жёлтые — фон, рамка и значок.

### 4.7. Иерархия
Метрики → «что исправлять первым» → таблица. «Что исправлять первым» сортирует правила по важности,
внутри важности — по числу проблем (`rulesToFix`). Это сортировка, числа — из API.

## 5. Структура папок

```
src/
  api/          types.ts, http.ts, endpoints.ts, queryCache.ts — всё про сеть
  hooks/        useApiQuery.ts, usePageState.ts
  lib/          чистые функции без React: format, pageState, units, runs, summary, errors (+ *.test.ts)
  components/   PageHeader, ContextStrip, MetricCards, FixFirst, IssuesTable, IssueModal,
                StatusTags, Delta, ErrorResult, States (упавший прогон, пустое подразделение, долгая загрузка), Heading
  pages/        KkdPage.tsx — собирает страницу и решает, какое состояние показать
  theme/        theme.ts (токены UI-KIT), ThemeCssVars.tsx
  main.tsx, styles.css
```

## 6. Тесты

`npm test` — Vitest, чистые функции: формат дельты и единиц (п.п.), оценка из `trend`, `null` ≠ 0,
даты, склонения, разбор и сборка адреса, `limit` / `offset`, дерево подразделений, пропущенные и соседние
прогоны, пустое подразделение, порядок «что исправлять первым», разбор ошибок API.

## 7. Что не сделано и почему

- Динамика метрики по прогонам (`GET /api/kkd/trend`), метрики по оргструктуре (`/api/kkd/units`),
  поиск `q`, выгрузка CSV, запуск прогона (`POST /api/runs`) — необязательные эндпоинты. Следующий шаг — тренд
  доли корректных целей мини-графиком в карточке (с разрывом на упавшем прогоне).
- Компонентные тесты (Testing Library) и e2e — проверено вручную в браузере по критериям из `requirements.md`.
