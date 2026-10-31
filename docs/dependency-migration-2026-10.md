# Dependency migration — 31 October 2026

## Project assessment

TeilFair is a pnpm workspace with three packages: a Vite/React web app, an Expo/React Native
mobile app, and shared TypeScript calculations, types, translations, themes, and store logic.
Both clients use Supabase directly through platform-specific API adapters. This migration
updates the application toolchains and dependencies; it does not apply database migrations
or change deployed services.

The initial web build, web lint, mobile typecheck, and 15 calculation tests passed. The main
gaps were outdated dependencies, unvalidated native version combinations, obsolete build
configuration, and CI coverage that omitted mobile and browser runtime checks.

## Updates

Registry `latest` tags were checked on 31 October 2026. Direct dependencies were upgraded
to the latest stable releases compatible with the frameworks, and transitive dependencies
were refreshed within their declared ranges. pnpm 12.16.1 was already current.

| Dependency | Before | After |
| --- | --- | --- |
| Expo | 57.0.1 | 58.0.21 |
| React Native | 0.86.0 | 0.88.1 |
| React / React DOM, web | 19.2.7 | 19.3.1 |
| React / React DOM, mobile | 19.2.7 | 19.3.0 |
| Vite | 8.1.2 | 8.3.5 |
| Vite React plugin | 6.0.3 | 6.1.2 |
| Vitest | 4.1.9 | 5.0.5 |
| Playwright | 1.61.1 | 1.64.1 |
| ESLint | 10.6.0 | 10.13.0 |
| typescript-eslint | 8.63.0 | 8.72.1 |
| Supabase JS | 2.110.0 | 2.118.0 |
| React Router | 7.18.1 | 7.18.5 |
| React Navigation native / stack | 7.3.5 / 7.17.7 | 7.5.1 / 7.21.0 |
| i18next / react-i18next | 26.3.4 / 17.0.8 | 26.5.12 / 17.1.9 |
| Zustand | 5.0.14 | 5.0.16 |
| dotenv | 17.4.2 | 18.0.9 |
| Babel core | 7.29.7 resolved | 7.29.7, manifest minimum updated |

Font Awesome, React/Node type definitions, other lint tools, Expo modules, and supported
React Native libraries were also updated. The lockfile records the full resolved tree.

## Migration changes

- Moved Vite's Rollup compatibility configuration to `rolldownOptions` and
  `output.codeSplitting`; replaced `__dirname` with `import.meta.dirname` for native config loading.
- Replaced manual Metro workspace overrides with Expo's automatic pnpm monorepo support.
- Removed obsolete `newArchEnabled` and `android.edgeToEdgeEnabled` app configuration.
- Migrated the legacy `splash` object to the SDK 58 `expo-splash-screen` config plugin,
  preserving the image, background color, and contain mode. Added the date picker plugin.
- Aligned native versions with the installed Expo SDK's `bundledNativeModules.json` through
  `expo install --fix`. Kept Expo modules and native library ranges within their supported lines.
- Put the shared package's `types` export condition first for TypeScript resolution.
- Added production browser smoke tests and included Playwright configuration/tests in typechecking.
  Smoke builds use a separate output directory and placeholder settings, preserving normal build artifacts.
- Added mobile typecheck/export scripts and ensured root mobile commands build shared code first.
- Moved CI to Node.js 26 and added lint, mobile typecheck, browser smoke tests, and mobile export.
- Removed obsolete release-age exceptions and ignored generated Playwright files.

## Intentional version constraints

These are the only direct dependencies reported behind `latest` after the migration:

| Dependency | Retained | Registry latest | Reason |
| --- | --- | --- | --- |
| TypeScript | 6.0.3 | 7.0.2 | Latest typescript-eslint supports `>=4.8.4 <6.1.0`; retain a supported compiler across the workspace. |
| Babel core | 7.29.7 | 8.0.10 | Expo's Babel preset and React Native transforms still use the Babel 7 toolchain. |
| Async Storage | 2.2.0 | 3.1.1 | Expo SDK 58's tested native version. This corrects an existing incompatible version selection. |
| Date picker | 9.2.1 | 9.2.2 | Expo SDK 58's tested native version. |
| Mobile React / React DOM | 19.3.0 | 19.3.1 | Expo SDK 58's tested renderer versions; the independent web app uses latest. |
| Safe area context | 5.10.1 | 5.11.0 | Expo SDK 58's tested native version. |

Relevant upstream guidance: [Expo SDK 58 upgrade guide](https://expo.dev/blog/how-to-upgrade-to-sdk-58),
[typescript-eslint supported versions](https://typescript-eslint.io/users/dependency-versions/),
[Vitest 5 migration](https://main.vitest.dev/guide/migration/), and
[Expo splash-screen configuration](https://docs.expo.dev/versions/latest/sdk/splash-screen/).

## Dependency audit

The pnpm audit decreased from **71 findings** (1 critical, 45 high, 20 moderate, 5 low)
to **4 findings** (0 critical, 1 high, 2 moderate, 1 low). These counts are registry audit
findings, not a measurement of application exploitability.

| Remaining package | Severity | Dependency owner | Fix constraint |
| --- | --- | --- | --- |
| [zod 3.25.76](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | High | Expo CLI | Published fix is 4.6.6+; Expo still requires the incompatible 3.x API. |
| [minimatch 10.2.6](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Moderate | ESLint/config-array | Published fix is 11.0.1+, outside the declared major range. |
| [glob 13.0.6](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Moderate | Expo configuration/plugins | Published fix is 14.0.2+, outside the declared major range. |
| [deepmerge 4.3.1](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low | Expo configuration | No patched release reported. |

These are in development/build tool chains. No audit findings were suppressed or forced
across incompatible major versions. Resolve them when the owning dependencies adopt patched
versions, or after a separately validated upstream patch.

## Verification and remaining manual checks

Passed locally on Windows with Node.js 26.13.0 and pnpm 12.16.1:

- Frozen lockfile installation.
- Shared and production web builds.
- All 15 shared calculation tests under Vitest 5.
- Web ESLint and mobile TypeScript checks; Playwright files are included in web typechecking.
- Four production Chromium smoke tests: forms, language/theme persistence, privacy, imprint, and unknown routes.
- Production Expo export for Android, iOS, and web, including Hermes bytecode generation.
- Expo Doctor: 20/20 checks.
- Expo native config introspection for iOS and Android, including the migrated splash plugin.

Native compilation and physical-device checks remain necessary, particularly splash appearance,
navigation, date picking, and persisted data. Build a new SDK 58 development client with
`pnpm --filter @teilfair/mobile run android` or, on macOS, `pnpm --filter @teilfair/mobile run ios`.
The existing SDK 57 binary cannot be reused. Root `pnpm mobile` builds shared code before startup.

The existing Supabase write/delete system tests were not run: they require a dedicated writable
test group and token. The new smoke suite uses no backend data and blocks external requests.
The updated GitHub Actions workflow has not been executed remotely.
