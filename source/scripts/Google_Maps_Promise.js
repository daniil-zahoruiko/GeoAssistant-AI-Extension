// ==UserScript==
// @exclude *
//
// ==UserLibrary==
// @name Google Maps Promise
// @description Add a promise that resolves as soon as Google Maps is loaded,
//   for intercepting its functions.
// @copyright 2020, xsanda (https://openuserjs.org/users/xsanda)
// @license MIT
// @version 0.1.1
// ==/UserLibrary==
//
// ==OpenUserJs==
// @author xsanda
// ==/OpenUserJs==
// ==/UserScript==

/*jshint esversion: 6 */
/* globals runAsClient, googleMapsPromise */

const MAPS_API_URL = "https://maps.googleapis.com/maps/api/js?";
var googleMapsPromise = new Promise(resolve => {

  // Watch <head> and <body> for the Google Maps script to be added
  let scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === "SCRIPT" && node.src.startsWith(MAPS_API_URL)) {
          // When it’s been added and loaded, load the script below.
          node.addEventListener('load', () => resolve()); // jshint ignore:line
          if (scriptObserver) scriptObserver.disconnect();
          scriptObserver = undefined;
        }
      }
    }
  });

  // Wait for the head and body to be actually added to the page, applying the
  // observer above to these elements directly.
  // There are two separate observers because only the direct children of <head>
  // and <body> should be watched, but these elements are not necessarily
  // present at document-start.
  let bodyDone = false;
  let headDone = false;
  new MutationObserver((_, observer) => {
    if (!bodyDone && document.body) {
      bodyDone = true;
      if (scriptObserver) scriptObserver.observe(document.body, {
        childList: true
      });
    }
    if (!headDone && document.head) {
      headDone = true;
      if (scriptObserver) scriptObserver.observe(document.head, {
        childList: true
      });
    }
    if (headDone && bodyDone) observer.disconnect();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
});

export { googleMapsPromise };