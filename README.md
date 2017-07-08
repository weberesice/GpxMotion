# GpxMotion ownCloud/Nextcloud application

GpxMotion is an ownCloud/Nextcloud application to create and display path animations on an interactive map.

To watch an animation, click the "Load and view file" button in GpxMotion main page.
If no animation information was set, a default one (one section of 10 seconds per tracks/routes) is shown.
If no time information is missing in an animation section and the "use real time proportions"
is enabled (by default, it is), the animation duration will not change but the animation speed will be proportional to real speed.

To define an animation, go to GpxMotion main page and load a GPX file already containing ordered tracks/routes.
Then define the animation steps. Then check you are satisfied with the animation preview. Then
save the result to a GPX file (the animation data is saved as JSON in the GPX description field).

If a file is
publicly shared without password in "Files" app, you can produce a GpxMotion public link to
its animation with the "Share" button in the "view" page.

This app is tested on ownCloud 10 with Firefox and Chromium.
This app is tested on Nextcloud 11 and 12 with Firefox and Chromium.

Any feedback will be appreciated.

If you want to help to translate this app in your language, take the english=>french files in "l10n" directory as examples.

## Demo

* [First demo (dummy bike trip)](https://nuage.pluton.cassio.pe/index.php/apps/gpxmotion/publicview?token=EqPISeOfUQ6hUtq&autoplay=1&loop=1&autozoom=1)
* [Second demo (dummy world travel)](https://nuage.pluton.cassio.pe/index.php/apps/gpxmotion/publicview?token=f0Wj7VxIITbLuVG&autoplay=1&loop=1&autozoom=1)
* [Third demo (simple real time speed)](https://nuage.pluton.cassio.pe/apps/gpxmotion/publicview?token=D9H8VURFUK0qzz1&layer=OpenStreetMap&autoplay=1&autozoom=1&loop=1)
* [Fourth demo (simple simultaneous drawing)](https://nuage.pluton.cassio.pe/apps/gpxmotion/publicview?token=whUvTpOXcMwmscn&layer=OpenStreetMap&autoplay=1&autozoom=1&loop=1)
* [Fifth demo (dummy synchronized simultaneous drawing)](https://nuage.pluton.cassio.pe/apps/gpxmotion/publicview?token=dahOsWhyJPS6pAX&layer=OpenStreetMap&autoplay=1&autozoom=1&loop=1)

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
