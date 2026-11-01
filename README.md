# meal-planning

Вебзастосунок для збереження рецептів і планування харчування. Публікується як артефакт claude.ai.

- Вимоги: [docs/requirements.md](docs/requirements.md)
- Архітектурні рішення: [docs/decisions/](docs/decisions/)

## Розробка

Потрібен Node.js 22+.

```sh
npm install
npm run dev        # локальний сервер розробки
npm test           # тести
npm run lint       # лінтер, зокрема межі шарів
npm run typecheck  # перевірка типів
npm run build      # збірка; результат для публікації — dist/artifact.html
```

## Структура

```
src/
  domain/          сутності й чисті функції
  application/     сценарії використання й порти
  infrastructure/  адаптери портів (платформа, in-memory)
  ui/              React-компоненти, рядки інтерфейсу, стилі
  main.tsx         точка композиції
```

Правила залежностей між шарами описані в [0002](docs/decisions/0002-layered-architecture.md) і перевіряються лінтером.
