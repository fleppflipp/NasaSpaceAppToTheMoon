# Space App

React, TypeScript, and Vite.

## Development and checks

Run these commands from the `space-app` directory:

```sh
npm ci
npm run dev
```

Run all checks before committing:

```sh
npm run check
```

This checks TypeScript types, ESLint rules, and Prettier formatting in sequence.
Any type error, lint error, lint warning, or formatting difference makes it fail.
The checks do not modify files.

| Command                | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run typecheck`    | Check application and Vite configuration types without emitting files |
| `npm run lint`         | Run ESLint with zero allowed warnings                                 |
| `npm run lint:fix`     | Apply available ESLint fixes                                          |
| `npm run format:check` | Check formatting                                                      |
| `npm run format`       | Format files with Prettier                                            |
| `npm run build`        | Check types and create the production bundle                          |
| `npm run preview`      | Preview the production bundle                                         |

TypeScript enables `strict`, checks indexed access and optional properties,
and rejects unused variables, missing return paths, and switch fallthrough.
ESLint uses the `strictTypeChecked` and `stylisticTypeChecked` presets,
React Hooks and Fast Refresh rules, and exhaustive switch checks.
Prettier handles formatting; `eslint-config-prettier` prevents conflicting
ESLint formatting rules.

Use `.ts` and `.tsx` for application source files in `src/`.

On Windows PowerShell, if execution policy blocks `npm.ps1`, use `npm.cmd`
instead of `npm`, for example `npm.cmd run check`.
