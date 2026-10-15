# Changelog

## [0.14.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.13.0...api@v0.14.0) (2026-10-15)


### Features

* **api:** add map_corrections table (migration, model, repository) ([#400](https://github.com/sprajeesh/location-intelligence/issues/400)) ([fcbd46b](https://github.com/sprajeesh/location-intelligence/commit/fcbd46bd460742dcc57946dfebc8e89d468c679a))
* **api:** POST /map-corrections endpoint (validation, dedupe, rate limit) ([#401](https://github.com/sprajeesh/location-intelligence/issues/401)) ([21b6c00](https://github.com/sprajeesh/location-intelligence/commit/21b6c00b137aef802608901d0ede6c6007169da6))


### Documentation

* correct the remove request contract and the map corrections frontend notes ([#405](https://github.com/sprajeesh/location-intelligence/issues/405)) ([77928d1](https://github.com/sprajeesh/location-intelligence/commit/77928d1b884a503d02c98990550a14f31b7e54f4))
* refresh AGENTS.md and split API and frontend detail into docs ([#394](https://github.com/sprajeesh/location-intelligence/issues/394)) ([797c6ca](https://github.com/sprajeesh/location-intelligence/commit/797c6ca9b0ae55624683e7f58e5f44afe94adf92))

## [0.13.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.12.0...api@v0.13.0) (2026-10-12)


### Features

* frontend error tracking and request ID correlation ([#359](https://github.com/sprajeesh/location-intelligence/issues/359)) ([#367](https://github.com/sprajeesh/location-intelligence/issues/367)) ([f1d343c](https://github.com/sprajeesh/location-intelligence/commit/f1d343c5bb5d24afac7ab91356d4204d4e37bc37))
* per-action correlation IDs across frontend, API and backend logs ([#360](https://github.com/sprajeesh/location-intelligence/issues/360)) ([#368](https://github.com/sprajeesh/location-intelligence/issues/368)) ([dbfb028](https://github.com/sprajeesh/location-intelligence/commit/dbfb02849cca2154e0d0210bc2b4b67571406452))


### Documentation

* document logging, tracing and event conventions ([#362](https://github.com/sprajeesh/location-intelligence/issues/362)) ([#371](https://github.com/sprajeesh/location-intelligence/issues/371)) ([5945cb5](https://github.com/sprajeesh/location-intelligence/commit/5945cb58a34e863fb400332e14407deb708f6cef))

## [0.12.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.11.0...api@v0.12.0) (2026-10-12)


### Features

* **api:** move DB pool sizes into Settings and document the connection budget ([#356](https://github.com/sprajeesh/location-intelligence/issues/356)) ([5328af9](https://github.com/sprajeesh/location-intelligence/commit/5328af9a9623a3470e04b3dead490ad2ec926d67))
* **api:** set a server-side statement_timeout on DB connections ([#363](https://github.com/sprajeesh/location-intelligence/issues/363)) ([7a01f63](https://github.com/sprajeesh/location-intelligence/commit/7a01f6364ef9bc06c2a30c8cd80c595635a2cbf6)), closes [#351](https://github.com/sprajeesh/location-intelligence/issues/351)
* **api:** structured JSON logging and request IDs ([#358](https://github.com/sprajeesh/location-intelligence/issues/358)) ([#364](https://github.com/sprajeesh/location-intelligence/issues/364)) ([8d2770c](https://github.com/sprajeesh/location-intelligence/commit/8d2770c4f700cb204cb339659b9b7f02ec3e7359))


### Bug Fixes

* **api:** enable pool_pre_ping and pool_recycle on the DB engine ([#357](https://github.com/sprajeesh/location-intelligence/issues/357)) ([baa3adf](https://github.com/sprajeesh/location-intelligence/commit/baa3adfed068a9a1749f9512b32e9511b0e28a9e))

## [0.11.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.10.0...api@v0.11.0) (2026-10-08)


### Features

* add Contact page and feedback form ([#337](https://github.com/sprajeesh/location-intelligence/issues/337)) ([192476a](https://github.com/sprajeesh/location-intelligence/commit/192476a83cab1339cc5bdf4f56c0ec0bdc6a7662))

## [0.10.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.9.0...api@v0.10.0) (2026-10-03)


### Features

* **api:** report data model with per-facility score breakup and low-score hints ([#306](https://github.com/sprajeesh/location-intelligence/issues/306)) ([7a02e59](https://github.com/sprajeesh/location-intelligence/commit/7a02e5925bb65f148b3b9d40f0a7cdae678be80b))

## [0.9.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.8.0...api@v0.9.0) (2026-09-28)


### Features

* **web,api:** expose facility-level score sub-components in UI ([#278](https://github.com/sprajeesh/location-intelligence/issues/278)) ([48b3989](https://github.com/sprajeesh/location-intelligence/commit/48b3989248083a180078fbad3f9bc6aaa23c7ea2))

## [0.8.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.7.1...api@v0.8.0) (2026-09-25)


### Features

* **api,web:** add score explainability with per-criterion breakdown and contribution weights ([#263](https://github.com/sprajeesh/location-intelligence/issues/263)) ([a7a0eb4](https://github.com/sprajeesh/location-intelligence/commit/a7a0eb46f130f5d15ccb0f854fb6b1feb7a80ae3))

## [0.7.1](https://github.com/sprajeesh/location-intelligence/compare/api@v0.7.0...api@v0.7.1) (2026-09-24)


### Bug Fixes

* **web,api:** route remaining literal colors through brand tokens ([#249](https://github.com/sprajeesh/location-intelligence/issues/249)) ([06686f7](https://github.com/sprajeesh/location-intelligence/commit/06686f77e9324ab1336d0957ddfcb5f58a0c0cf6))

## [0.7.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.6.1...api@v0.7.0) (2026-09-22)


### Features

* display wikidata-linked facilities in facility marker popups ([#216](https://github.com/sprajeesh/location-intelligence/issues/216)) ([dd66c53](https://github.com/sprajeesh/location-intelligence/commit/dd66c53b1ef95434d0b6692f2d5aacc31b90f2ad))
* surface OSM contact/hours tags on facility markers (Stage 1) ([#215](https://github.com/sprajeesh/location-intelligence/issues/215)) ([44a7ca2](https://github.com/sprajeesh/location-intelligence/commit/44a7ca284866981561c1d2f2bc592f074bbb37c8))

## [0.6.1](https://github.com/sprajeesh/location-intelligence/compare/api@v0.6.0...api@v0.6.1) (2026-09-16)


### Bug Fixes

* **api:** compute overall score when all scored categories default to zero weight ([#195](https://github.com/sprajeesh/location-intelligence/issues/195)) ([31ffb75](https://github.com/sprajeesh/location-intelligence/commit/31ffb75ae59cff342d1081b3f9218e239988919c))
* **deploy:** auto-provision OSRM datasets and health-check all profiles ([#192](https://github.com/sprajeesh/location-intelligence/issues/192)) ([ceeb839](https://github.com/sprajeesh/location-intelligence/commit/ceeb8398fd37e99de6cea674893c8fc24729e8b7))
* **deploy:** stop auto-running setup-osrm.sh in deploy-api, it OOMs the VM ([#194](https://github.com/sprajeesh/location-intelligence/issues/194)) ([458dba3](https://github.com/sprajeesh/location-intelligence/commit/458dba3e56bb7f1f04d5244f766da3fb124fcfee))

## [0.6.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.5.1...api@v0.6.0) (2026-09-15)


### Features

* **web:** pick route mode directly from facility marker popups ([#187](https://github.com/sprajeesh/location-intelligence/issues/187)) ([7cce2bf](https://github.com/sprajeesh/location-intelligence/commit/7cce2bf603e95b2be0e60fae8191cff10e5a7f23))


### Bug Fixes

* **nav:** serve walking/cycling routes from real OSRM profiles ([#188](https://github.com/sprajeesh/location-intelligence/issues/188)) ([e52dd8a](https://github.com/sprajeesh/location-intelligence/commit/e52dd8a2b81dd1c85193107ce129760af092ef71))

## [0.5.1](https://github.com/sprajeesh/location-intelligence/compare/api@v0.5.0...api@v0.5.1) (2026-09-14)


### Bug Fixes

* **api:** freeze migration 0001's seed data as a historical snapshot ([#178](https://github.com/sprajeesh/location-intelligence/issues/178)) ([71fdf57](https://github.com/sprajeesh/location-intelligence/commit/71fdf5784fa534265995d79a572a5a9651531244))

## [0.5.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.4.0...api@v0.5.0) (2026-09-06)


### Features

* **web:** Add collapsible results panel with responsive positioning ([#156](https://github.com/sprajeesh/location-intelligence/issues/156)) ([f97a20a](https://github.com/sprajeesh/location-intelligence/commit/f97a20a44e0a14a19353ef4697c5e28be29be216))

## [0.4.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.3.0...api@v0.4.0) (2026-09-02)


### Features

* **api:** add LINZ parcel lookup endpoint ([#139](https://github.com/sprajeesh/location-intelligence/issues/139)) ([80f96da](https://github.com/sprajeesh/location-intelligence/commit/80f96da0286e054c21d9bc90d7ae262ed5726c0a))
* **ci:** wire LINZ_API_KEY into production deploy pipeline ([#142](https://github.com/sprajeesh/location-intelligence/issues/142)) ([76ea445](https://github.com/sprajeesh/location-intelligence/commit/76ea44570e48f3433128fc4b6189472fbc98b5c1))

## [0.3.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.2.2...api@v0.3.0) (2026-08-31)


### Features

* **db:** add food and drink category with restaurants and pubs facility types ([#131](https://github.com/sprajeesh/location-intelligence/issues/131)) ([d640eaa](https://github.com/sprajeesh/location-intelligence/commit/d640eaa271ce02587351edb1d36354df39b5d270))


### Bug Fixes

* **nav:** fix NaNh duration display by normalizing route API response ([#134](https://github.com/sprajeesh/location-intelligence/issues/134)) ([6cc79a8](https://github.com/sprajeesh/location-intelligence/commit/6cc79a8e7c489853a5948259fa52bd328db0eefd))

## [0.2.2](https://github.com/sprajeesh/location-intelligence/compare/api@v0.2.1...api@v0.2.2) (2026-08-31)


### Bug Fixes

* **nav:** proxy route requests through backend to fix straight-line production bug ([#127](https://github.com/sprajeesh/location-intelligence/issues/127)) ([434e124](https://github.com/sprajeesh/location-intelligence/commit/434e124a9900c73b86291cb32c62b2ec98557c45))

## [0.2.1](https://github.com/sprajeesh/location-intelligence/compare/api@v0.2.0...api@v0.2.1) (2026-08-28)


### Documentation

* updated and tidied project readme ([#119](https://github.com/sprajeesh/location-intelligence/issues/119)) ([8b03ec6](https://github.com/sprajeesh/location-intelligence/commit/8b03ec6c49cbd16c1c007edacbc3666b04a28e12))

## [0.2.0](https://github.com/sprajeesh/location-intelligence/compare/api@v0.1.0...api@v0.2.0) (2026-08-24)


### Features

* **api:** support per-request category weight overrides ([#110](https://github.com/sprajeesh/location-intelligence/issues/110)) ([ed4a3a6](https://github.com/sprajeesh/location-intelligence/commit/ed4a3a66d4b531308e9a08d26ccdf26f87b406d9))

## Changelog

All notable changes to the API will be documented in this file.
