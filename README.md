<p align="center">
  <img width="70%" src="./readme_helpers/logo.svg">
</p>

<p>
  <a href="https://www.geoguessr.com/">
    <img src="https://img.shields.io/badge/GeoGuessr-563B9A?style=for-the-badge"
  </a>
  <a href="https://youtu.be/MwEQZH-DiUg">
    <img src="https://img.shields.io/badge/Video%20Presentation-563B9A?style=for-the-badge"
  </a>
</p>
<p>
  <img src="https://img.shields.io/badge/release-v1.0.0-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/release_date-september_2024-979621?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-red?style=flat-square"/>
  <img src="https://img.shields.io/badge/Google-StreetViewAPI-4285F4?logo=googlemaps&style=flat-square"/>
  <img src="https://img.shields.io/badge/Google-Chrome_Extension-00897B?logo=googlechrome&style=flat-square"/>
  <img src="https://img.shields.io/badge/Made_with-JavaScript-F7DF1E?logo=javascript&style=flat-square"/>
</p>

<p align="center">
    GeoAssistant AI is designed to help users that have little to no experience become better in the game of GeoGuessr. The extension is powered by a back-end AI model on a separate server, which is used to detect certain distinct patterns such as bollards, cars, traffic signs, language, etc. The idea is to highlight such patterns on a user's screen with a brief description of what it is and in what country it can be seen. This approach can teach users tricks on how to become better GeoGuessr players in an interactive manner without using any additional resources.
  <br>
  <br>
This extension is designed to be used only for educational purposes, thus, to align with GeoGuessr rules and competitiveness, we have disabled the extension in multiplayer, both ranked and unranked, as well as in custom parties.
</p>

<h1 align="center">Documentation</h1>
<h3>We strongly recommend watching <a href="https://youtu.be/MwEQZH-DiUg">Video Presentation</a>, as it showcases the extension's gameplay and covers all the essential features.</h3>
<hr>

<h3>UI</h3>

The extension handlers are positioned to the left of the gameplay screen, just above the original GeoGuessr UI.

<img src="https://github.com/daniil-zahoruiko/GeoAssistant-AI-Extension/blob/main/readme_helpers/UI.png"/>

- **Scan 360** - Scans the whole panorama around you.
- **Scan visible area** -  Scans only the area of the panorama currently displayed on the screen. This option is ideal for quickly identifying specific objects or high response speed.

<h3>Use extension pop-up to setup preferences</h3>

![](https://github.com/daniil-zahoruiko/GeoAssistant-AI-Extension/blob/main/readme_helpers/pop_up.gif)

<p>*Use "Contact Us" button on the same pop-up page to report a bug or directly email on geoassistantai@gmail.com</p>

<h1 align="center">Supported countries</h1>

- France
  * Red bollards
  * Grey bollards
- Italy
  * Bollards
- Guatemala, Dominican Republic, Curacao, Kyrgyzstan, Mongolia, Ghana, Senegal
  * Google Car Roof Rack

<h1 align="center">Technologies used</h1>

- **JavaScript**
- **<a href="https://developer.chrome.com/docs/extensions/develop">Chrome Extensions</a>**
- **<a href="https://developers.google.com/maps/documentation/streetview?_gl=1*1rn0145*_up*MQ..*_ga*MTM0ODA3MDYyNC4xNzI2MTI3MzEy*_ga_NRWSTWS78N*MTcyNjEyNzMxMS4xLjAuMTcyNjEyNzMxMS4wLjAuMA..">Google StreetView API</a>**
- **<a href="https://en.wikipedia.org/wiki/Equirectangular_projection">Equirectangular projection</a>**
  - Our approach to calculating the screen coordinates of bounding boxes is based on the mathematical conversion between equirectangular and perspective projections. Once we receive the bounding box coordinates from the server, we first transform them into spherical coordinates on the equirectangular image, which is essentially the same as converting from perspective to equirectangular projection. <br>
  
    To compute the current screen coordinates of a bounding box, we take these spherical coordinates and apply the current heading, pitch, and zoom. This process is the same as converting from the equirectangular back to the perspective projection. It allows us to map the bounding box accurately onto the screen. If you would like to understand how it works deeper, here is a good <a href="https://blogs.codingballad.com/unwrapping-the-view-transforming-360-panoramas-into-intuitive-videos-with-python-6009bd5bca94">article</a> that goes into more details about these conversions.

<h1 align="center">Contributions</h1>
App was created by Daniil Zahoruiko and Dmytro Avdieienko.
