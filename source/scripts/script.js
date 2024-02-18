let button = document.getElementById("button")
const canvas = document.getElementsByClassName("widget-in-game_content__oDaT9-canvas")


button.onclick = function() {
  alert("button clicked" + canvas.length);
  console.log(canvas);
}

