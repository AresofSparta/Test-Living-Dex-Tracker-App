# Living Dex Tracker PWA

This package is a Progressive Web App version of your Living Dex tracker.

## How to use on your Phone
1. Unzip this folder somewhere you can host static files.
2. Serve it with any static web server over HTTPS.
3. Open it in Chrome on your phone.
4. Tap Chrome's menu and choose **Add to Home screen*

## Notes
- The app stores your tracker data in localStorage on the device/browser.
- It exports and imports JSON backups.
- It uses PokéAPI at runtime for the National Dex and for exact later-game regional pools when online.
- If those exact later-game requests fail, it falls back gracefully to built-in pools.

## Safety
This package does not request dangerous device permissions by itself.
