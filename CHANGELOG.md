# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## 0.0.3 – 2017-06-22
### Added
- option to make segment times proportional to real time, enable it in default animation
[#2](https://gitlab.com/eneiluj/gpxmotion-oc/issues/2) @klakla2
- import from gpxedit : support for WMS tile and overlay servers. base and user servers
- add autoplay option in public links, default to 1
[#3](https://gitlab.com/eneiluj/gpxmotion-oc/issues/3) @klakla2
- put options values in public link, restore them on public page load

### Changed
- removed useless conversion to geojson, now parsing gpx directly as xml

## 0.0.2 – 2017-06-14
### Added
- view page : default animation if nothing is set
[#1](https://gitlab.com/eneiluj/gpxmotion-oc/issues/1) @klakla2
- option to loop animation
- option to toggle auto zoom during animation

### Fixed
- edit page : error when loading a file without desc or metadata tag
[#1](https://gitlab.com/eneiluj/gpxmotion-oc/issues/1) @mizhgan1
- style details

## 0.0.1 – 2017-06-10
### Added
- animation sections editor
- line snake animation
- french translation
