
var canvas = document.getElementsByClassName("widget-scene-canvas")[0];
var gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});

var tempCanvas = document.createElement('canvas');
var tempCtx = tempCanvas.getContext('2d');

tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;

tempCtx.drawImage(canvas, 0, 0);

var imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
var pixels = imageData.data;
console.log(pixels)
// var image = new Image();
// image.src = canvas[0].toDataURL()
// var w = window.open("");
// w.document.write(image.outerHTML);