---
name: react-feature-architecture
description: Build and maintain professional React applications using a feature-first, feature-owned architecture. Use when creating, organizing, refactoring, or extending React projects, especially React + TypeScript applications.
---

# React Feature-Based Architecture Skill

## 1. Purpose

Use this skill to structure React applications around **business features**, not around application-wide technical categories alone.

The preferred architecture is feature-first:

- Every feature owns its route-level pages, feature-specific components, hooks, API functions, types, and validation logic.
- Application-wide setup belongs to `app/`.
- Truly reusable, domain-agnostic building blocks belong to `shared/`.
- A feature should be understandable and maintainable without searching through unrelated feature folders.

The goal is a clear, scalable architecture without unnecessary abstraction, excessive folders, or premature complexity.

## 2. Mandatory First Steps

Before changing code:

1. Inspect the existing project structure and `package.json`.
2. Identify the current React, TypeScript, build, routing, styling, state-management, and data-fetching conventions.
3. Inspect nearby features and follow established conventions unless they are clearly harmful.
4. Identify whether the requested work belongs to an existing feature or requires a new feature.
5. Avoid reorganizing unrelated files or replacing project libraries just to match this document.
6. If the project is not TypeScript-based, do not migrate it to TypeScript unless explicitly requested.

Do not assume a package is installed. Check the project before using React Router, TanStack Query, Zustand, Redux, Zod, React Hook Form, or any other library.

## 3. Preferred Project Structure

Use this as the default structure for a medium-sized or larger application. Create only the folders that are actually needed; do not generate empty folders to imitate the example.

```text
src/
├── app/
│   ├── layouts/
│   │   └── MainLayout.tsx
│   ├── providers/
│   ├── router/
│   │   └── index.tsx
│   ├── config/
│   ├── App.tsx
│   └── main.tsx
│
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── validation/
│   │   └── index.ts
│   │
│   ├── users/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── dashboard/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   └── utils/
│
├── assets/
├── styles/
└── ...
```

The root may also contain the project's existing `vite.config.ts`, `tsconfig` files, lint configuration, and package files. Do not move build configuration into `src/` unless the project already follows that convention.

### 3.1 `app/` — Application Composition

Contains application-wide composition and startup concerns:

- Application entry and root component.
- Router configuration and route guards.
- Global providers (for example, query, authentication, theme, or localization providers).
- Application layouts and navigation shells used across multiple routes.
- Global configuration that is specific to bootstrapping the application.

Rules:

- `app/` wires features together; it should not become the home of feature business logic.
- Route definitions should point to page components owned by their features.
- Keep provider composition explicit and easy to trace.
- Do not create a provider for state that can remain local to a feature or component.

### 3.2 `features/` — The Main Application Structure

Each folder under `features/` represents a **business capability or product area**, such as `auth`, `users`, `courses`, `orders`, or `reports`.

A feature may contain the following folders when needed:

| Folder | Responsibility |
|---|---|
| `components/` | Components used primarily or exclusively by this feature. |
| `pages/` | Route-level screens belonging to this feature. |
| `api/` | Feature-specific API functions and endpoint integration. |
| `hooks/` | Feature-specific custom hooks and stateful behavior. |
| `types/` | Feature-specific TypeScript types and interfaces. |
| `validation/` | Feature-specific schemas and form validation rules. |
| `utils/` | Pure helpers used only by this feature. |
| `assets/` | Images, icons, or files owned by this feature. |

These are optional organizational boundaries, not a checklist. A small feature may need only `pages/` and `components/`.

#### Feature ownership rules

1. Put a component in its feature when its meaning, behavior, or styling is tied to that feature.
2. Put a screen in the feature's `pages/`, even though the router is configured in `app/`.
3. Keep feature-specific hooks, API calls, types, and validation close to the feature that owns them.
4. Do not create a separate feature for every component or every API endpoint. Features represent cohesive business capabilities.
5. Do not move a component to `shared/` merely because it might be reused someday. Move it only when reuse is real and the component is genuinely domain-agnostic.
6. If a feature grows substantially, organize its internals into smaller domain-focused subfolders rather than creating a flat folder with dozens of files.

Example:

```text
features/
└── courses/
    ├── api/
    │   ├── coursesApi.ts
    │   └── courseEnrollmentsApi.ts
    ├── components/
    │   ├── CourseCard.tsx
    │   ├── CourseFilters.tsx
    │   └── EnrollmentStatusBadge.tsx
    ├── hooks/
    │   ├── useCourses.ts
    │   └── useCourseDetails.ts
    ├── pages/
    │   ├── CoursesPage.tsx
    │   └── CourseDetailsPage.tsx
    ├── types/
    │   └── course.types.ts
    ├── validation/
    │   └── course.schema.ts
    └── index.ts
```

### 3.3 `shared/` — Reusable and Domain-Agnostic Code

Contains code that is genuinely reusable across multiple features and does not belong to one business domain.

- `components/ui/`: generic UI primitives such as Button, Input, Dialog, Badge, Spinner, and reusable table primitives.
- `hooks/`: generic hooks that are not owned by one feature.
- `lib/`: configured libraries and technical integrations, such as an HTTP client.
- `services/`: application-wide technical services when they are truly cross-feature.
- `types/`: generic shared types.
- `utils/`: pure, domain-agnostic utility functions.

Rules:

- Keep `shared/` independent from `features/` and `app/`.
- Never import a feature into a shared module.
- Avoid turning `shared/` into a dumping ground for code whose ownership is unclear.
- A component used by only one feature stays inside that feature.
- A generic Button may be shared; a CourseEnrollmentButton with course-specific behavior belongs to `features/courses/`.

### 3.4 Global Assets and Styles

- Put application-wide static assets in `src/assets/`.
- Put feature-specific assets inside that feature when doing so improves ownership and discoverability.
- Keep global styles, Tailwind entry styles, CSS variables, resets, and global typography in `src/styles/` or the project's established global stylesheet location.
- Do not place feature-specific styling rules in a global stylesheet unless they truly affect the application globally.

## 4. Dependency and Import Rules

Keep dependencies flowing in one direction:

```text
app  ───────► features ───────► shared
  └──────────────────────────► shared

shared must not import app or features.
features must not import app.
```

Rules:

1. `shared/` is the lowest-level reusable layer and must not depend on application or feature modules.
2. A feature may import from `shared/`.
3. `app/` may compose multiple features and shared modules.
4. Avoid direct imports into another feature's internal folders.
5. When another feature needs something from a feature, expose a small, intentional public API through that feature's `index.ts`.
6. Do not use public exports as an excuse to create circular dependencies. If two features become tightly coupled, reconsider ownership or introduce a suitable shared contract.
7. Prefer explicit imports over broad wildcard imports when they make dependencies unclear.

Example:

```ts
// Good: consume an intentionally exported feature API.
import { UserAvatar } from '@/features/users';

// Avoid: reaching into another feature's internal implementation.
import { UserAvatar } from '@/features/users/components/profile/UserAvatar';
```

Use the project's configured path aliases when available. Do not invent an alias such as `@/` unless it is configured in TypeScript and the build tooling.

## 5. Pages and Components

### Pages

A page is a route-level composition component. It should:

- Read route parameters and URL search parameters when needed.
- Coordinate feature-level hooks and components.
- Handle page-level loading, error, empty, and success states.
- Compose the screen without containing large amounts of reusable UI or complex business logic.

Keep pages inside `features/<feature>/pages/`.

### Components

A component should have a clear responsibility and a focused public interface.

- Keep feature components in the feature's `components/` folder.
- Keep generic, reusable visual primitives in `shared/components/ui/`.
- Use typed props and descriptive names.
- Avoid giant components that combine fetching, business rules, form state, and complex presentation.
- Extract a component when it improves readability, reuse, testability, or responsibility separation—not merely to reduce line count.
- Do not create abstractions for one-off markup without a meaningful benefit.

Prefer named function components and named exports for consistency, unless the existing codebase uses another established convention or a tool requires a default export.

Example:

```tsx
interface CourseCardProps {
  title: string;
  description: string;
  onOpen: () => void;
}

export function CourseCard({
  title,
  description,
  onOpen,
}: CourseCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" onClick={onOpen}>
        View course
      </button>
    </article>
  );
}
```

## 6. API Integration and Server State

Keep API integration out of presentational components.

Preferred separation:

```text
Feature Page
    │
    ▼
Feature Hook (when useful)
    │
    ▼
Feature API Function
    │
    ▼
Shared HTTP Client
    │
    ▼
Backend API
```

Rules:

1. Put feature endpoint functions in `features/<feature>/api/`.
2. Keep the shared HTTP client, base URL configuration, and cross-cutting request behavior in `shared/lib/` or the project's existing infrastructure location.
3. Give API functions meaningful names such as `getCourses`, `getCourseById`, `createCourse`, and `updateCourse`.
4. Type request payloads and response data. Do not use `any` to bypass API contract design.
5. Keep API request/response types close to the feature unless they are genuinely shared contracts.
6. Components should not repeat raw `fetch` or Axios configuration for the same backend concern.
7. Handle HTTP errors deliberately. Do not silently convert failures into successful empty data.
8. Do not expose secrets in frontend environment variables. Anything shipped to the browser must be treated as public.

### Server state versus UI state

- Server state belongs to the data-fetching strategy used by the project (for example, TanStack Query if installed and appropriate).
- Temporary UI state (open dialog, selected tab, expanded panel) should usually remain local to the component or feature.
- Use global state only when multiple distant parts of the application genuinely need the same client-side state.
- Do not introduce Redux, Zustand, Context, or another state library without a concrete requirement.
- Avoid duplicating server data in a global client store when the project already has a server-state cache.

## 7. React and TypeScript Standards

1. Use function components and React hooks.
2. Follow the Rules of Hooks. Never call hooks conditionally, inside loops, or from ordinary utility functions.
3. Prefer precise types over `any`, unsafe casts, and broad index signatures.
4. Use `unknown` at untrusted boundaries and narrow it safely.
5. Type component props explicitly.
6. Use discriminated unions for state or data models with distinct variants when they improve correctness.
7. Do not add `useMemo` or `useCallback` everywhere. Use memoization when it addresses a measured or clear referential/performance need.
8. Do not use `useEffect` to calculate values that can be derived during rendering.
9. Avoid effects for event-driven operations. Perform user-triggered actions in event handlers or appropriate mutations.
10. Clean up subscriptions, timers, and event listeners created by effects.
11. Use stable, meaningful React keys when rendering collections. Do not use array indexes as keys when item identity can change.
12. Keep state as close as practical to the components that own and update it.
13. Do not suppress TypeScript or ESLint errors without understanding and documenting why the suppression is necessary.

## 8. Routing and Layout

- Define application routes in `app/router/` or the established router configuration location.
- Route components should be pages exported by their owning features.
- Keep shared application shells (main navigation, sidebar, top bar) in `app/layouts/` when used across multiple features.
- Keep feature-specific page layout and composition within the feature.
- Use route-level lazy loading when it provides a practical bundle or startup benefit and is supported by the project's setup.
- Handle unknown routes and unauthorized access intentionally.
- Do not place all page components in a global `pages/` folder when using this feature-first architecture.

## 9. Styling and UI Consistency

Follow the project's existing styling system. For projects using Tailwind CSS:

- Use the installed Tailwind version and its conventions; do not mix configuration styles from different major versions.
- Prefer reusable design tokens and CSS variables for colors, spacing, radii, typography, and elevation.
- Keep feature-specific layout and styling near the feature component.
- Extract repeated visual patterns into shared UI components only when they are genuinely reusable.
- Avoid arbitrary one-off values when a design token already represents the intended value.
- Do not add another CSS framework to a project that already has a styling system without explicit approval.
- Avoid excessive conditional class strings and duplicated style logic; use a small helper or established variant pattern when complexity justifies it.
- Ensure responsive behavior, keyboard access, visible focus states, semantic HTML, and sufficient color contrast.

Do not redesign existing UI or replace the established visual language when the task is only to implement functionality.

## 10. Naming and File Conventions

Use consistent names:

| Item | Convention | Example |
|---|---|---|
| Feature folders | `kebab-case` | `course-management/` |
| Component files | `PascalCase.tsx` | `CourseCard.tsx` |
| Page files | `PascalCase.tsx` | `CourseDetailsPage.tsx` |
| Hook files | `camelCase` with `use` | `useCourses.ts` |
| API files | descriptive `camelCase` | `coursesApi.ts` |
| Utility files | descriptive `camelCase` | `formatDate.ts` |
| Types | descriptive names | `Course`, `CreateCourseRequest` |
| Constants | follow local convention | `courseStatusOptions` |

Use `.tsx` for files containing JSX and `.ts` for files without JSX.

Avoid vague names such as `data.ts`, `helpers.ts`, `common.ts`, or `misc.ts` when a domain-specific name communicates intent better.

## 11. Public Feature API (`index.ts`)

Use a feature's `index.ts` to expose only what other parts of the application are allowed to consume.

```ts
export { CoursesPage } from './pages/CoursesPage';
export { CourseDetailsPage } from './pages/CourseDetailsPage';
export { CourseCard } from './components/CourseCard';
export type { Course, CreateCourseRequest } from './types/course.types';
```

Rules:

- Export intentionally; do not automatically export every internal file.
- Keep internal implementation details private to the feature.
- Avoid importing a feature's own modules through its public `index.ts` from inside that same feature if this creates circular module paths.
- Use default exports only when required by the framework or established project convention.

## 12. Forms and Validation

- Keep form-specific logic inside the feature that owns the form.
- Separate form values from API request types when their shapes or responsibilities differ.
- Validate at the form boundary for user feedback, and rely on backend validation as the authoritative security and data-integrity boundary.
- Use the validation library already installed by the project. Do not introduce a new one without need.
- Keep reusable form controls in `shared/components/ui/`; keep feature-specific form fields and schemas in the feature.
- Display field-level errors clearly and preserve accessible labels and descriptions.

## 13. Testing and Quality

Follow the test tools already configured in the project.

- Co-locate focused tests with the feature or use the established test directory convention.
- Test meaningful user behavior, important conditional states, validation, and API integration boundaries.
- Prefer tests that verify observable behavior over tests coupled to implementation details.
- Do not add tests that merely restate trivial implementation details.
- Before declaring work complete, run the relevant lint, type-check, test, and build commands that are available in `package.json`.
- Report commands that could not be run and explain any remaining failures. Never claim tests passed without running them.

## 14. Anti-Patterns to Avoid

Do not:

- Put every component in one global `components/` folder and every page in one global `pages/` folder.
- Put feature-specific code in `shared/` just because it may be reused later.
- Let `shared/` import from `features/` or `app/`.
- Let features reach into other features' private implementation folders.
- Create a folder for every file or force every feature to contain every possible subfolder.
- Build giant page components containing all UI, API calls, and state transitions.
- Add global state for local UI concerns.
- Use `useEffect` as a general-purpose workflow engine or for values that can be derived.
- Duplicate API clients, endpoint definitions, validation rules, or design tokens.
- Add libraries or architectural layers without a concrete need.
- Refactor unrelated parts of the application while implementing a focused feature.
- Replace working project conventions without first explaining the reason.

## 15. Agent Implementation Workflow

For every feature implementation or structural change:

1. **Inspect:** Read the relevant files, project scripts, dependencies, and neighboring features.
2. **Classify:** Decide which parts belong in `app/`, the target feature, or `shared/`.
3. **Plan:** For substantial work, briefly state the files/modules to create or modify and the reason for their ownership.
4. **Implement:** Follow the existing stack and the dependency rules in this skill. Keep changes focused.
5. **Integrate:** Wire feature pages into the router, providers, and shared systems only where required.
6. **Verify:** Run available type-checking, linting, tests, and build commands relevant to the change.
7. **Explain:** After implementation, summarize:
   - What was created or changed.
   - Why each major part belongs in its location.
   - The flow between page, hooks, API functions, and shared infrastructure.
   - Validation and error-handling behavior.
   - Which checks were run and their actual results.
   - Any trade-offs, known limitations, or recommended next steps.

Do not merely dump code. Explain important architectural decisions in clear technical language, but avoid lengthy explanations of basic React concepts.

## 16. Decision Rule

When uncertain where a file belongs, ask these questions in order:

1. Is it application startup, routing, a global provider, or a cross-feature layout? Put it in `app/`.
2. Is it tied to one business capability? Put it inside that feature.
3. Is it genuinely reusable and domain-agnostic? Put it in `shared/`.
4. Is the responsibility unclear or shared by only two tightly related features? Do not rush to generalize it. Keep ownership explicit and reassess when a real reuse boundary emerges.

**Default principle: feature ownership first, shared abstraction only when justified.**
