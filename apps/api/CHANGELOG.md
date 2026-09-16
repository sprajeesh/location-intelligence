# Changelog

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
