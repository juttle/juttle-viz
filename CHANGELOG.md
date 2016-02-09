# Change Log

This file documents all notable changes to juttle-viz. The release numbering uses [semantic versioning](http://semver.org).

## 0.4.2

Released 2016-02-09

## Minor Changes

- change Outrigger references to Juttle Engine [[#49](https://github.com/juttle/juttle-viz/pull/49)]

## 0.4.1

Released 2016-02-08

## Minor Changes

- juttle-view: add static method getFlattenedParamValidationErrors [[#40](https://github.com/juttle/juttle-viz/pull/40)]

## 0.4.0

Released 2016-02-05

### Major Changes

- add umd build [[#43](https://github.com/juttle/juttle-viz/pull/43)]
 - This changes the location of the built css from `build/charts.css` to `dist/juttle-viz.css`

### Minor Changes

- timechart series detection: don't add fields with null values to a series' keys [[#44](https://github.com/juttle/juttle-viz/pull/44)]

## 0.3.1

Released 2016-01-21

### Bug Fixes

- time field: fix which views require time in points and which ones don't [[#32](https://github.com/juttle/juttle-viz/pull/32)]

## 0.3.0

Released 2016-01-20

### Major Changes

- Expect dates and durations [[#25](https://github.com/juttle/juttle-viz/pull/25)]
 - As part of this, make `moment` a peerDependency, change the example to use the `lib` build of juttle-viz, and remove the `dist` build. See PR for details.

## 0.2.0

Released 2016-01-06

### Major Changes

- barchart: move display.* params to top level [[#9](https://github.com/juttle/juttle-viz/pull/9)]
- Scatterchart remove display param nesting [[#10](https://github.com/juttle/juttle-viz/pull/10)]

## v0.1.0

Released 2015-12-18

### Major Changes

- Initial release of the standalone juttle-viz project.
