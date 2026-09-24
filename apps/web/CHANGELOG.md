# Changelog

## [0.14.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.13.0...web@v0.14.0) (2026-09-24)


### Features

* **web:** move Scoring and Theme controls off the map into app-level placement ([#247](https://github.com/sprajeesh/location-intelligence/issues/247)) ([0ef78a8](https://github.com/sprajeesh/location-intelligence/commit/0ef78a8cedfcb7cc185f2236d4a38348a813e24f))
* **web:** rebrand primary color scale to [#007198](https://github.com/sprajeesh/location-intelligence/issues/007198) ([#257](https://github.com/sprajeesh/location-intelligence/issues/257)) ([a0083ae](https://github.com/sprajeesh/location-intelligence/commit/a0083aee21d70b73e191f1a2fa1b728cc27098f5))


### Bug Fixes

* **web,api:** route remaining literal colors through brand tokens ([#249](https://github.com/sprajeesh/location-intelligence/issues/249)) ([06686f7](https://github.com/sprajeesh/location-intelligence/commit/06686f77e9324ab1336d0957ddfcb5f58a0c0cf6))
* **web:** apply brand color to secondary/outline/ghost variants and headings ([#259](https://github.com/sprajeesh/location-intelligence/issues/259)) ([e3d4940](https://github.com/sprajeesh/location-intelligence/commit/e3d49408c80f5feb2a9834cb5bd5643f99b5e353))
* **web:** neutralize outline variant text and dedupe 404 CTA styling ([#256](https://github.com/sprajeesh/location-intelligence/issues/256)) ([d5a3618](https://github.com/sprajeesh/location-intelligence/commit/d5a3618f9295cd8591b3cc9d18c77168eff87731))

## [0.13.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.12.4...web@v0.13.0) (2026-09-22)


### Features

* display wikidata-linked facilities in facility marker popups ([#216](https://github.com/sprajeesh/location-intelligence/issues/216)) ([dd66c53](https://github.com/sprajeesh/location-intelligence/commit/dd66c53b1ef95434d0b6692f2d5aacc31b90f2ad))
* surface OSM contact/hours tags on facility markers (Stage 1) ([#215](https://github.com/sprajeesh/location-intelligence/issues/215)) ([44a7ca2](https://github.com/sprajeesh/location-intelligence/commit/44a7ca284866981561c1d2f2bc592f074bbb37c8))

## [0.12.4](https://github.com/sprajeesh/location-intelligence/compare/web@v0.12.3...web@v0.12.4) (2026-09-21)


### Bug Fixes

* **ui:** show text on exit navigation button at larger screens ([#209](https://github.com/sprajeesh/location-intelligence/issues/209)) ([c5a20e7](https://github.com/sprajeesh/location-intelligence/commit/c5a20e75aa5050ef2389fe1dce5e2689fd675c9b))
* **web:** close map popup when exiting navigation ([#210](https://github.com/sprajeesh/location-intelligence/issues/210)) ([7c3f4f3](https://github.com/sprajeesh/location-intelligence/commit/7c3f4f3a8c33bc368bb15820e0071004e359314c))
* **web:** show Route icon instead of Undo2 when a travel mode is active ([#211](https://github.com/sprajeesh/location-intelligence/issues/211)) ([2b3c7e1](https://github.com/sprajeesh/location-intelligence/commit/2b3c7e16494e505a74ae9ed600824e13c3169572))
* **web:** show Route icon on mobile map view button when a route is displayed ([#212](https://github.com/sprajeesh/location-intelligence/issues/212)) ([2c9d8c0](https://github.com/sprajeesh/location-intelligence/commit/2c9d8c0b8abb44ef94ece36f54be50f3a0cb70b7))

## [0.12.3](https://github.com/sprajeesh/location-intelligence/compare/web@v0.12.2...web@v0.12.3) (2026-09-19)


### Bug Fixes

* **web:** clear map overlays when address is cleared or changed ([#206](https://github.com/sprajeesh/location-intelligence/issues/206)) ([7e07c34](https://github.com/sprajeesh/location-intelligence/commit/7e07c340eb0d45064c844f0c6bd8121d92293961))
* **web:** remove redundant nav search bar ([#205](https://github.com/sprajeesh/location-intelligence/issues/205)) ([b2da9f5](https://github.com/sprajeesh/location-intelligence/commit/b2da9f5d0566ec7de8669c943c91bc5c11a78d46))

## [0.12.2](https://github.com/sprajeesh/location-intelligence/compare/web@v0.12.1...web@v0.12.2) (2026-09-17)


### Bug Fixes

* **web:** consolidate facility popup back-to-results icon into nav row ([#201](https://github.com/sprajeesh/location-intelligence/issues/201)) ([15006df](https://github.com/sprajeesh/location-intelligence/commit/15006df22d835c847fc027463758003477910ab4))
* **web:** stop selected-facility marker from shadowing popup clicks ([#200](https://github.com/sprajeesh/location-intelligence/issues/200)) ([e858efd](https://github.com/sprajeesh/location-intelligence/commit/e858efd01c4740d0cc3632ade7b686c4d51dd4b1))

## [0.12.1](https://github.com/sprajeesh/location-intelligence/compare/web@v0.12.0...web@v0.12.1) (2026-09-16)


### Bug Fixes

* **web:** stop discarding explicit category weights that match a coincidental default ([#196](https://github.com/sprajeesh/location-intelligence/issues/196)) ([139c282](https://github.com/sprajeesh/location-intelligence/commit/139c28207f3c4b76f8b288b384a0d6d4e2c5adf3))

## [0.12.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.11.0...web@v0.12.0) (2026-09-15)


### Features

* **web:** pick route mode directly from facility marker popups ([#187](https://github.com/sprajeesh/location-intelligence/issues/187)) ([7cce2bf](https://github.com/sprajeesh/location-intelligence/commit/7cce2bf603e95b2be0e60fae8191cff10e5a7f23))

## [0.11.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.10.0...web@v0.11.0) (2026-09-14)


### Features

* **web:** add exact-value input alongside each category weight slider ([#182](https://github.com/sprajeesh/location-intelligence/issues/182)) ([69bd112](https://github.com/sprajeesh/location-intelligence/commit/69bd112b268cd8cb14cb9a4852f18fe233ab26a8))
* **web:** merge Nearby Facilities tab into Score tab with per-facility marker visibility ([#184](https://github.com/sprajeesh/location-intelligence/issues/184)) ([3ef68cc](https://github.com/sprajeesh/location-intelligence/commit/3ef68cc0eccb87a758c4c1b863722cde04e5a4e5))


### Bug Fixes

* **web:** block Save on zero-weight categories, explain why in Settings ([#183](https://github.com/sprajeesh/location-intelligence/issues/183)) ([92d106f](https://github.com/sprajeesh/location-intelligence/commit/92d106fc73d989b0cae08aa0eda0504987c42ecc))

## [0.10.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.9.0...web@v0.10.0) (2026-09-14)


### Features

* **web:** add lucide icons to score panel categories ([#173](https://github.com/sprajeesh/location-intelligence/issues/173)) ([e00e963](https://github.com/sprajeesh/location-intelligence/commit/e00e9638d3e7b78c07a97ee6927b959360b43a24))

## [0.9.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.8.0...web@v0.9.0) (2026-09-09)


### Features

* **web:** add brand logo and wired into the app manifest ([#170](https://github.com/sprajeesh/location-intelligence/issues/170)) ([370fbdb](https://github.com/sprajeesh/location-intelligence/commit/370fbdb877bf400ea94d4742169b47c41b5e2d04))


### Bug Fixes

* **web:** Restore search bar visibility on mobile landing screen ([#169](https://github.com/sprajeesh/location-intelligence/issues/169)) ([ea1026b](https://github.com/sprajeesh/location-intelligence/commit/ea1026b5bbe47584a66568bf32e4eaf3fe29cfa1))

## [0.8.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.7.0...web@v0.8.0) (2026-09-09)


### Features

* **web:** improved icon styling for map markers ([#166](https://github.com/sprajeesh/location-intelligence/issues/166)) ([ccbae58](https://github.com/sprajeesh/location-intelligence/commit/ccbae586ee8cfa6138fa3675b03af741aa2c3a5f))
* **web:** Show parcel details card on click with contextual positioning ([#165](https://github.com/sprajeesh/location-intelligence/issues/165)) ([62c3ae4](https://github.com/sprajeesh/location-intelligence/commit/62c3ae48b07f1c5a85f01c4916cf8d28b4212b68))


### Bug Fixes

* **web:** Make MapToolbarContainer accessible on small screens ([#164](https://github.com/sprajeesh/location-intelligence/issues/164)) ([f8fa6b5](https://github.com/sprajeesh/location-intelligence/commit/f8fa6b572f995db76b979c7262ff4560962d74c8))

## [0.7.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.6.0...web@v0.7.0) (2026-09-06)


### Features

* **web:** Add collapsible results panel with responsive positioning ([#156](https://github.com/sprajeesh/location-intelligence/issues/156)) ([f97a20a](https://github.com/sprajeesh/location-intelligence/commit/f97a20a44e0a14a19353ef4697c5e28be29be216))
* **web:** Hide zoom buttons on mobile screens ([#160](https://github.com/sprajeesh/location-intelligence/issues/160)) ([86fddb5](https://github.com/sprajeesh/location-intelligence/commit/86fddb5223a881125786118085b333c0b3599170))
* **web:** Remove mobile-specific code from PanelCollapseButton ([#157](https://github.com/sprajeesh/location-intelligence/issues/157)) ([e6aa0fc](https://github.com/sprajeesh/location-intelligence/commit/e6aa0fc75dcd41fc388de1cc39b431ce0c468235))
* **web:** responsive results panel layout in mobile screen ([#159](https://github.com/sprajeesh/location-intelligence/issues/159)) ([b26c841](https://github.com/sprajeesh/location-intelligence/commit/b26c84181f89701c59b69774fef7bfa0dadafda6))

## [0.6.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.5.0...web@v0.6.0) (2026-09-03)


### Features

* **web:** hide clear button in navigation mode input fields ([#153](https://github.com/sprajeesh/location-intelligence/issues/153)) ([442cae3](https://github.com/sprajeesh/location-intelligence/commit/442cae3f602bed6cd0d4b506faf241cadb9a7075))
* **web:** move settings button to top of map toolbar ([#152](https://github.com/sprajeesh/location-intelligence/issues/152)) ([4bebb92](https://github.com/sprajeesh/location-intelligence/commit/4bebb9211c4e9444272adc58731b7e339f060997))
* **web:** pin results/route panel as a sidebar with mobile 60/40 split ([#150](https://github.com/sprajeesh/location-intelligence/issues/150)) ([44e5c6a](https://github.com/sprajeesh/location-intelligence/commit/44e5c6aefd39bee8217f1bf089818cb502089a0c))
* **web:** style walking routes with dashed lines and thinner weight ([#151](https://github.com/sprajeesh/location-intelligence/issues/151)) ([e1ceb9e](https://github.com/sprajeesh/location-intelligence/commit/e1ceb9e4baa02c05b0249838e68159719bf9bea8))


### Bug Fixes

* **web:** include API key header in parcels BFF proxy ([#148](https://github.com/sprajeesh/location-intelligence/issues/148)) ([e8078f0](https://github.com/sprajeesh/location-intelligence/commit/e8078f01b2d021522c29bf496dea0502d2309196))

## [0.5.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.4.0...web@v0.5.0) (2026-09-02)


### Features

* **web:** highlight matched parcel on address search instead of a pin ([#140](https://github.com/sprajeesh/location-intelligence/issues/140)) ([5090034](https://github.com/sprajeesh/location-intelligence/commit/5090034fefe0110bbe5991673c91b9aeee83b5bf))


### Bug Fixes

* **ui:** prevent long facility names from pushing distance and navigate button out of alignment ([#138](https://github.com/sprajeesh/location-intelligence/issues/138)) ([b5a1095](https://github.com/sprajeesh/location-intelligence/commit/b5a1095e5c0330f6c561ace89619221d8df51d0b))
* **web:** prevent analysis results from re-zooming map after address search ([#143](https://github.com/sprajeesh/location-intelligence/issues/143)) ([5a91bd5](https://github.com/sprajeesh/location-intelligence/commit/5a91bd553af15dee7d7a45843592e26122a5c4df))

## [0.4.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.3.1...web@v0.4.0) (2026-08-31)


### Features

* **web:** add food and drink category support to location scoring UI ([#133](https://github.com/sprajeesh/location-intelligence/issues/133)) ([4ca3b26](https://github.com/sprajeesh/location-intelligence/commit/4ca3b268bda2746115aaf7868b40e26503058cf8))


### Bug Fixes

* **nav:** fix NaNh duration display by normalizing route API response ([#134](https://github.com/sprajeesh/location-intelligence/issues/134)) ([6cc79a8](https://github.com/sprajeesh/location-intelligence/commit/6cc79a8e7c489853a5948259fa52bd328db0eefd))

## [0.3.1](https://github.com/sprajeesh/location-intelligence/compare/web@v0.3.0...web@v0.3.1) (2026-08-31)


### Bug Fixes

* **nav:** proxy route requests through backend to fix straight-line production bug ([#127](https://github.com/sprajeesh/location-intelligence/issues/127)) ([434e124](https://github.com/sprajeesh/location-intelligence/commit/434e124a9900c73b86291cb32c62b2ec98557c45))

## [0.3.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.2.1...web@v0.3.0) (2026-08-28)


### Features

* **web:** improvements to the slider ([#120](https://github.com/sprajeesh/location-intelligence/issues/120)) ([3e35d2f](https://github.com/sprajeesh/location-intelligence/commit/3e35d2f89f888e86c42b487edacf85f126185a48))


### Bug Fixes

* **web:** hide address suggestion list immediately on selection ([#121](https://github.com/sprajeesh/location-intelligence/issues/121)) ([3a86a9a](https://github.com/sprajeesh/location-intelligence/commit/3a86a9a9c0931290162e96c9f442ad2ead0bf8ba))
* **web:** restore address when returning from navigate mode ([#123](https://github.com/sprajeesh/location-intelligence/issues/123)) ([0171154](https://github.com/sprajeesh/location-intelligence/commit/017115406ad77a31204160163d6c6f72851b606f))

## [0.2.1](https://github.com/sprajeesh/location-intelligence/compare/web@v0.2.0...web@v0.2.1) (2026-08-24)


### Bug Fixes

* **web:** keep modal header/footer visible on mobile viewports ([#116](https://github.com/sprajeesh/location-intelligence/issues/116)) ([7ce67d5](https://github.com/sprajeesh/location-intelligence/commit/7ce67d5af79573de40ede45fc89aa1d2e6ce7a77))

## [0.2.0](https://github.com/sprajeesh/location-intelligence/compare/web@v0.1.0...web@v0.2.0) (2026-08-24)


### Features

* **web:** add category weightage sliders to Settings ([#111](https://github.com/sprajeesh/location-intelligence/issues/111)) ([9aef073](https://github.com/sprajeesh/location-intelligence/commit/9aef0734f0f07a63aa964c3c8de3793a6d2ecdea))
* **web:** animate results panel, score reveal, and facility list ([#109](https://github.com/sprajeesh/location-intelligence/issues/109)) ([96e2b88](https://github.com/sprajeesh/location-intelligence/commit/96e2b8883a2fe5af43591d83f72660f978476da7))
* **web:** inline weight sliders in Settings, one per category header ([#112](https://github.com/sprajeesh/location-intelligence/issues/112)) ([e763b7e](https://github.com/sprajeesh/location-intelligence/commit/e763b7e0c884ed7903a14d9a19317db0f61bd818))

## Changelog

All notable changes to the Web frontend will be documented in this file.
