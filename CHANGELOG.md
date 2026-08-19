# Changelog

## [0.1.6](/github.com/xTCry/max-io/compare/v0.1.5...v0.1.6) (2026-08-19)

### ⚙️ Chore

* **deps:** update development dependencies ([d86bd96](/github.com/xTCry/max-io/commit/d86bd965cfc19a1766426902745d6397fb2533e7))
* **runtime:** require nodejs `18.18` or newer ([d7ed457](/github.com/xTCry/max-io/commit/d7ed4577fe74e363cdbbf0d29cbe05ebe0901b0a))

### 🚀 Features

* **api:** export bot runtime configuration types ([7024ce4](/github.com/xTCry/max-io/commit/7024ce49ece8534ea4d992d8f0543002f34bf655))
* **comments:** add channel post comments api ([3a43efd](/github.com/xTCry/max-io/commit/3a43efd18dca05dc7fc53657b796ba1d206d853e))

### 🐛 Bug Fixes

* **api:** encode url path parameters ([b843366](/github.com/xTCry/max-io/commit/b8433660e766b263eabb1cc3ab8617381d124d8c))
* **build:** add `tsx` build dependency ([6b0b88c](/github.com/xTCry/max-io/commit/6b0b88c7e661d4217868a917a485991cd796b280))
* **polling:** abort active long-poll requests on stop ([12e80cc](/github.com/xTCry/max-io/commit/12e80ccd3537dce9292c388f90c8a103987d721b))
* **polling:** retry native fetch network failures ([35742b0](/github.com/xTCry/max-io/commit/35742b046094dae9187ca013ff04d95b65327d3e))
* **security:** protect webhook payloads and redact debug logs ([92a3c62](/github.com/xTCry/max-io/commit/92a3c62f7048575f02beb3d72ab4422589ed7afa))
* **transport:** handle non-json responses ([261e88a](/github.com/xTCry/max-io/commit/261e88a9b34d132f6226c1daf379652fd9286851))

### 📖 Documentation

* **api:** sync type descriptions with schema 0.0.33 ([c34f6a7](/github.com/xTCry/max-io/commit/c34f6a76b67a2a12b52663de4b96bf6d52967663))

### ☯ Styling

* **format:** apply prettier formatting ([99ec3c8](/github.com/xTCry/max-io/commit/99ec3c854b5784689e341830ec89da01ee16f4be))
* **prettier:** format source files ([14f12b7](/github.com/xTCry/max-io/commit/14f12b7b858212a73186fafeb5dc4909a8d7f083))

### 🛠️ CI

* add package verification workflow ([f0cdcbb](/github.com/xTCry/max-io/commit/f0cdcbb265f3daf8eb9fd9b989a9e82e39672f8e))

## <small>0.1.5 (2026-07-23)</small>

* fix(upload): handle multipart media uploads consistently ([a59713e](github.com/xTCry/max-io/commits/a59713e))
* fix(upload): support file uploads from paths and streams ([c1d4002](github.com/xTCry/max-io/commits/c1d4002))
* fix(upload): support media uploads from all source types ([17a08bf](github.com/xTCry/max-io/commits/17a08bf))
* feat(upload): support custom upload filenames ([ab8d873](github.com/xTCry/max-io/commits/ab8d873))
* test(examples): add schema compatibility smoke scenario ([894f160](github.com/xTCry/max-io/commits/894f160))
* docs(api): align schema compatibility notes ([b8497d0](github.com/xTCry/max-io/commits/b8497d0))

## <small>0.1.4 (2026-07-11)</small>

* feat(api): support custom endpoint and command updates ([24f78a6](github.com/xTCry/max-io/commits/24f78a6))

## <small>0.1.3 (2026-06-08)</small>

* docs(api): document schema compatibility policy ([a84354f](https://github.com/xTCry/max-io/commit/a84354f))
* docs(readme): document api schema source ([ae25a0c](https://github.com/xTCry/max-io/commit/ae25a0c))
* docs(readme): update api schema reference ([5be8570](https://github.com/xTCry/max-io/commit/5be8570))
* chore(types): mark legacy schema fields as deprecated ([1ef01b7](https://github.com/xTCry/max-io/commit/1ef01b7))
* fix(api): restore chat lookup by channel link ([308b9ad](https://github.com/xTCry/max-io/commit/308b9ad))
* fix(api): sync chat admin permissions with schema ([409a2e7](https://github.com/xTCry/max-io/commit/409a2e7))
* fix(types): align markup and contact fields with latest schema ([bc9a27d](https://github.com/xTCry/max-io/commit/bc9a27d))

## <small>0.1.2 (2026-05-21)</small>

* fix(types): align api response fields with schema ([9ce93ac](https://github.com/xTCry/max-io/commit/9ce93ac))

## <small>0.1.1 (2026-05-13)</small>

* fix(api): deprecate removed chat link lookup ([cde01dc](https://github.com/xTCry/max-io/commit/cde01dc))
* fix(examples): align scene manager typing ([7bafb08](https://github.com/xTCry/max-io/commit/7bafb08))
* fix(package): expose root types entry ([4b73288](https://github.com/xTCry/max-io/commit/4b73288))
* fix(types): allow missing chat page marker ([5b140b7](https://github.com/xTCry/max-io/commit/5b140b7))
* fix(types): export helper utility types ([3ef558f](https://github.com/xTCry/max-io/commit/3ef558f))
* chore(examples): update gitignore ([28228ae](https://github.com/xTCry/max-io/commit/28228ae))
* chore(lint): configure eslint flat config ([5424dd6](https://github.com/xTCry/max-io/commit/5424dd6))
* sample(examples): update max-io version ([2a0ab9f](https://github.com/xTCry/max-io/commit/2a0ab9f))

## 0.1.0 (2026-05-11)

* docs: add usage guides and examples overview ([f0abcee](https://github.com/xTCry/max-io/commit/f0abcee))
* docs: link example references ([2d39243](https://github.com/xTCry/max-io/commit/2d39243))
* docs(api): document public helper api ([03a4aca](https://github.com/xTCry/max-io/commit/03a4aca))
* docs(api): expand schema-driven jsdoc ([f421f0c](https://github.com/xTCry/max-io/commit/f421f0c))
* docs(examples): add sessions scenes i18n guide ([ac87d1b](https://github.com/xTCry/max-io/commit/ac87d1b))
* docs(readme): overhaul doc ([8d0f5f0](https://github.com/xTCry/max-io/commit/8d0f5f0))
* docs(repo): add license, notices and contribution guides ([e360954](https://github.com/xTCry/max-io/commit/e360954))
* docs(types): document bot api schemas ([0759cc1](https://github.com/xTCry/max-io/commit/0759cc1))
* chore(package): improve npm package metadata ([dc7be36](https://github.com/xTCry/max-io/commit/dc7be36))
* chore(prettier): format ([63d261f](https://github.com/xTCry/max-io/commit/63d261f))
* fix(api): send remove chat member params as query ([ad1c743](https://github.com/xTCry/max-io/commit/ad1c743))
* fix(build): rewrite ts path aliases in output ([fcc5362](https://github.com/xTCry/max-io/commit/fcc5362))
* fix(composer): parse command payload and args ([593285f](https://github.com/xTCry/max-io/commit/593285f))
* fix(messages): limit attachment retry and support abort signal ([ec29749](https://github.com/xTCry/max-io/commit/ec29749))
* fix(upload): restore media upload flow and image multipart handling ([0dd1ecd](https://github.com/xTCry/max-io/commit/0dd1ecd))
* feat(api): add chat admin management methods ([5a7dd75](https://github.com/xTCry/max-io/commit/5a7dd75))
* feat(api): add video attachment details method ([33d433c](https://github.com/xTCry/max-io/commit/33d433c))
* feat(api): add webhook subscription methods ([c0317c9](https://github.com/xTCry/max-io/commit/c0317c9))
* feat(bot): add webhook callback runtime ([14eb2b8](https://github.com/xTCry/max-io/commit/14eb2b8))
* feat(examples): add basic upstream bot samples ([5f29b1a](https://github.com/xTCry/max-io/commit/5f29b1a))
* feat(examples): add pr upload scenarios project ([3443d03](https://github.com/xTCry/max-io/commit/3443d03))
* feat(examples): add upload progress scenarios and basic bot ([e342798](https://github.com/xTCry/max-io/commit/e342798))
* feat(examples): add webhook server modes ([71e0044](https://github.com/xTCry/max-io/commit/71e0044))
* feat(examples): improve `01-basic sample` runtime and setup ([772d70d](https://github.com/xTCry/max-io/commit/772d70d))
* feat(exports): split runtime and type exports ([e83aa6a](https://github.com/xTCry/max-io/commit/e83aa6a))
* feat(keyboard): add open app message and clipboard buttons ([a491271](https://github.com/xTCry/max-io/commit/a491271))
* feat(keyboard): add reply keyboard support ([7c52b0d](https://github.com/xTCry/max-io/commit/7c52b0d))
* feat(polling): add public marker control ([dc677b3](https://github.com/xTCry/max-io/commit/dc677b3))
* feat(types): add missing update event types ([0867919](https://github.com/xTCry/max-io/commit/0867919))
* feat(upload): add progress callbacks and abortable upload ([e14888a](https://github.com/xTCry/max-io/commit/e14888a))
* test(examples): add chat admin management sample ([c0ac5a9](https://github.com/xTCry/max-io/commit/c0ac5a9))
* test(examples): add chat moderation scenario ([fa8944a](https://github.com/xTCry/max-io/commit/fa8944a))
* test(examples): add reply keyboard validation scenario ([9dd2dde](https://github.com/xTCry/max-io/commit/9dd2dde))
* test(examples): add video attachment details scenario ([966a417](https://github.com/xTCry/max-io/commit/966a417))
* test(examples): add webhook subscriptions sample ([8011210](https://github.com/xTCry/max-io/commit/8011210))
* test(examples): use ctx command args scenario ([4d51d0f](https://github.com/xTCry/max-io/commit/4d51d0f))

## <small>0.0.4 (2026-01-15)</small>

* docs(readme): update ([da948ce](https://github.com/xTCry/max-io/commit/da948ce))
* feat: add initial lib code and adjust project configuration ([f63667f](https://github.com/xTCry/max-io/commit/f63667f))
* feat: init repos ([2ccb7c3](https://github.com/xTCry/max-io/commit/2ccb7c3))
* feat(api): extend subscription update types for user data ([1dd4a70](https://github.com/xTCry/max-io/commit/1dd4a70))
* feat(core): allow functional triggers with `ctx` in `Composer` and escape string patterns ([73cb4e0](https://github.com/xTCry/max-io/commit/73cb4e0))
* feat(i18n): add `i18n` lib for locale ([afc0240](https://github.com/xTCry/max-io/commit/afc0240))
* feat(redis): make `ioredis` (`^4 || ^5`) optional and support injected clients ([2987810](https://github.com/xTCry/max-io/commit/2987810))
* feat(scene): add `scene` & `session` lib ([1796ed8](https://github.com/xTCry/max-io/commit/1796ed8))
* chore: release v0.0.2 ([c40a6d7](https://github.com/xTCry/max-io/commit/c40a6d7))
* chore: release v0.0.3 ([ce2e6ec](https://github.com/xTCry/max-io/commit/ce2e6ec))
* chore(session): rename to `index.ts` ([0997330](https://github.com/xTCry/max-io/commit/0997330))

## <small>0.0.3 (2026-01-14)</small>

* feat: add initial lib code and adjust project configuration ([f63667f](https://github.com/xTCry/max-io/commit/f63667f))
* feat: init repos ([2ccb7c3](https://github.com/xTCry/max-io/commit/2ccb7c3))
* feat(api): extend subscription update types for user data ([1dd4a70](https://github.com/xTCry/max-io/commit/1dd4a70))
* feat(core): allow functional triggers with `ctx` in `Composer` and escape string patterns ([73cb4e0](https://github.com/xTCry/max-io/commit/73cb4e0))
* feat(i18n): add `i18n` lib for locale ([afc0240](https://github.com/xTCry/max-io/commit/afc0240))
* feat(scene): add `scene` & `session` lib ([1796ed8](https://github.com/xTCry/max-io/commit/1796ed8))
* chore: release v0.0.2 ([c40a6d7](https://github.com/xTCry/max-io/commit/c40a6d7))
* chore(session): rename to `index.ts` ([0997330](https://github.com/xTCry/max-io/commit/0997330))

## <small>0.0.2 (2026-01-12)</small>

* chore(session): rename to `index.ts` ([0997330](https://github.com/xTCry/max-io/commit/0997330))
* feat: add initial lib code and adjust project configuration ([f63667f](https://github.com/xTCry/max-io/commit/f63667f))
* feat: init repos ([2ccb7c3](https://github.com/xTCry/max-io/commit/2ccb7c3))
* feat(i18n): add `i18n` lib for locale ([afc0240](https://github.com/xTCry/max-io/commit/afc0240))
* feat(scene): add `scene` & `session` lib ([1796ed8](https://github.com/xTCry/max-io/commit/1796ed8))
