(async() => {
    const src1 = chrome.runtime.getURL("scripts/Google_Maps_Promise.js");
    const googleMapsPromiseModule = await import(src1);
    // const src2 = chrome.runtime.getURL("scripts/Run_code_as_client.js");
    // const runAsClientModule = await import(src2);

    googleMapsPromiseModule.googleMapsPromise.then(() => {
        var script = document.createElement('script');
        script.src = chrome.runtime.getURL("scripts/injected.js");
        (document.head || document.documentElement).appendChild(script);
    });
})();

/*
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
});*/