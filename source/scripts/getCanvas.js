const canvas = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__canvas widget-scene-canvas");

console.log(canvas[0].toDataURL());

const img = document.getElementsByTagName("img");
img[0].src = canvas[0].toDataURL();