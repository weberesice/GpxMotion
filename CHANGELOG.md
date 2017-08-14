# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
- option to play all sections simultaneously
- option to play synchronous simultaneous drawing
[#5](https://gitlab.com/eneiluj/gpxmotion-oc/issues/5) @klakla2
- new edit field to set synchronized animation duration
[#9](https://gitlab.com/eneiluj/gpxmotion-oc/issues/9) @klakla2
- new button to reload view/public page with restriction bounds on animation

### Changed
- update leaflet to 1.2.0
- update sidebarv2
- do not artificially link sections together
[#5](https://gitlab.com/eneiluj/gpxmotion-oc/issues/5) @klakla2
- default section plan is now making one section per track/route
- lines style
- display all on page load if no autoplay
- display all when animation ends if no loop no simultaneous
[#8](https://gitlab.com/eneiluj/gpxmotion-oc/issues/8) @eneiluj
- bring polylines layers to front on mouseover
- don't display beginmarkers if simultaneous
- in simultaneous drawing (synchro or not) begin markers and moving markers are circles containing section numbers
[#10](https://gitlab.com/eneiluj/gpxmotion-oc/issues/10) @klakla2
- improve legend and make random colors in simultaneous mode
[#11](https://gitlab.com/eneiluj/gpxmotion-oc/issues/11) @klakla2
- make legend scroll when changing section
- no padding in zoomed page except when zooming on one section during playing in normal mode
[#12](https://gitlab.com/eneiluj/gpxmotion-oc/issues/12) @klakla2
- add autoplay for zoom view, keep loop option when zooming, keep zoomed view when generating share link
[#13](https://gitlab.com/eneiluj/gpxmotion-oc/issues/13) @klakla2

### Fixed
- allow to save file when there is no section set
- if no section title, take the trk name, fix summary text
[#7](https://gitlab.com/eneiluj/gpxmotion-oc/issues/7) @eneiluj
- bring sections layers to front when zoomed in editor
[#6](https://gitlab.com/eneiluj/gpxmotion-oc/issues/6) @eneiluj

## 0.0.4 – 2017-06-27
### Added
- when viewing in real time and there is no missing time, display the time in a new dialog (bottomleft)
[#4](https://gitlab.com/eneiluj/gpxmotion-oc/issues/4) @klakla2

### Changed
- style of custom tile server management
- make autoplay URL param also work with normal view page
- autoplay when view from files app

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
