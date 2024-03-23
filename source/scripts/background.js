// what panoramas on what tabs is stored in session storage
/*let panoramas = {};   // keeps panoramas start positions
let loadingPanos = {};  // panorama that's currently being loaded for each tab

function separateParams(url, paramName, searchFirst = false)
{
    var pos = -1;
    if(searchFirst){
        pos = url.indexOf(paramName) + paramName.length + 1;
    }
    else {
        pos = url.lastIndexOf(paramName) + paramName.length + 1;
    }

    return url.substring(pos, url.indexOf("&", pos));
}

function changePano(requestDetails) {
    const decodedData = decodeURIComponent(String.fromCharCode.apply(null,
        new Uint8Array(requestDetails.requestBody.raw[0].bytes)));
    const kvp = {}
    kvp[requestDetails.tabId] = JSON.parse(decodedData)[2][0][0][1];

    chrome.storage.session.set(kvp)
    loadingPanos[requestDetails.tabId] = kvp[requestDetails.tabId];
}

function newTile(requestDetails) {
    const url = requestDetails.url;
    
    const panoId = separateParams(url, "panoid", true),
            x = parseInt(separateParams(url, "x")),
            y = parseInt(separateParams(url, "y")),
            zoom = parseInt(separateParams(url, "zoom"));
    
    if(zoom !== 0)
    {
        panoramas[panoId] = panoramas[panoId] ?? {loaded: false, tiles: []};
        
        if(!panoramas[panoId]["loaded"]) {
            loadingPanos[requestDetails.tabId] = panoId;
            panoramas[panoId]["tiles"] = [...panoramas[panoId]["tiles"], [x, y]];
        }
    }
}

function doneLoading(requestDetails) {
    const panoId = loadingPanos[requestDetails.tabId];
    if(panoId != null && panoramas[panoId] != null){
        panoramas[panoId]["loaded"] = true;
        console.log(`Panorama ${panoId} was loaded.`,
                `Its coordinates:`, 
                panoramas[panoId]["tiles"]);
        loadingPanos[requestDetails.tabId] = null;
    }
}

chrome.webRequest.onBeforeRequest.addListener(changePano, 
    { urls: ["https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetMetadata"] },
    ['requestBody']
);

chrome.webRequest.onBeforeRequest.addListener(newTile, 
    { urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"] }  
);

chrome.webRequest.onBeforeRequest.addListener(doneLoading,
    { urls: ["https://maps.googleapis.com/maps/api/js/GeoPhotoService.GetMetadata*"] }
);

chrome.storage.onChanged.addListener((changes) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
            `Panorama on tab ${key} was changed.`,
            `Old value was ${oldValue}, new value is ${newValue}.`
        );
    }
});*/