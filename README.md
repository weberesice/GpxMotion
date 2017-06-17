# GpxMotion ownCloud/Nextcloud application

GpxMotion is an ownCloud/Nextcloud application to create and display path animations on an interactive map.

To produce an animation, go to GpxMotion main page and load a GPX file already containing ordered tracks/routes.
Then define the animation steps. Then check you are satisfied with the animation preview. Then
save the result to a GPX file (the animation data is saved as JSON in the GPX description field).

To watch an animation, go to the "view" page of GpxMotion and load a GPX file.
If no animation information was set, a default one (all tracks/routes in 10 seconds) is shown.
If no time information is missing in an animation section and the "use real time proportions"
option is checked, the animation time will not change but the animation speed will be proportional to real speed.

In the "view" page, if the file is
publicly shared without password in "Files" app, you can produce a GpxMotion public link to
the current animation with the "Share" button.

This app is tested on ownCloud 10 with Firefox and Chromium.
This app is tested on Nextcloud 11 and 12 with Firefox and Chromium.

Any feedback will be appreciated.

If you want to help to translate this app in your language, take the english=>french files in "l10n" directory as examples.

## Demo

* [First demo](https://nuage.pluton.cassio.pe/index.php/apps/gpxmotion/publicview?token=EqPISeOfUQ6hUtq)
* [Second demo](https://nuage.pluton.cassio.pe/index.php/apps/gpxmotion/publicview?token=f0Wj7VxIITbLuVG)

## Donation

I develop this app during my free time. You can make a donation to me on Paypal. [Click HERE to make a donation](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=66PALMY8SF5JE) (you don't need a paypal account)

## Installation

Check the [AdminDoc](https://gitlab.com/eneiluj/gpxmotion-oc/wikis/admindoc) for installation details and integration in "Files" app.

## Releases

[Here](https://gitlab.com/eneiluj/gpxmotion-oc/wikis/home#releases) are the GpxMotion releases.

## Alternatives

If you look for alternatives, take a look at :
- [gpxanim](https://github.com/rvl/gpxanim) creates a video file
- [GPX Animator](http://zdila.github.io/gpx-animator/) creates a video file
