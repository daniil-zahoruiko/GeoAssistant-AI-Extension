function trackMouse(e)
{
    console.log(e);
}

var observer = new MutationObserver(function(mutations) {
    const element = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__root widget-scene")[0];
    mutations.forEach(function(mutation) {
        if (mutation.type === "attributes") {
            if(element.style.cursor === "move") {
                document.addEventListener('mousemove', trackMouse, false);
            }
            else {
                document.removeEventListener('mousemove', trackMouse, false);
            }
        }
    });
  });

const elementObserver = new MutationObserver(function (mutations, mutationInstance) {
    const element = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__root widget-scene")[0];
    if (element) {
        observer.observe(element, {
            attributes: true,
            attributeFilter: ["style"]
        });
        mutationInstance.disconnect();
    }
});

elementObserver.observe(document, {
    childList: true,
    subtree:   true
});