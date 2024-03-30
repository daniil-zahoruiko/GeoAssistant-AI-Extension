// initialize mutex(prevents race conditions with access to chrome storage)  (move it to a class?)
var Mutex = function() {
    this._busy  = false;
    this._queue = [];
};

Mutex.prototype.synchronize = function(task) {
    this._queue.push(task);
    if (!this._busy) this._dequeue();
};

Mutex.prototype._dequeue = function() {
    this._busy = true;
    var next = this._queue.shift();

    if (next)
        this._execute(next);
    else
        this._busy = false;
};

Mutex.prototype._execute = function(task) {
    var self = this;

    task().then(function() {
        self._dequeue();
    }, function() {
        self._dequeue();
    });
};

const mutex = new Mutex();

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

function doneLoading(panoId, tabId) {
    let kvp = {}
    kvp[tabId] = null;
    kvp[tabId + 'initialPOV'] = null;
    console.log(`done loading ${panoId}`);
    mutex.synchronize(() => {
        return chrome.storage.local.get(kvp).then((res) => {
            if(res[tabId].panoramas[panoId].loadingStatus === false) {
                return Promise.resolve();
            }
            console.log(res)
            var topleftx = 100, toplefty = 100, bottomrightx = -1, bottomrighty = -1;
            for(let i = 0; i < res[tabId].panoramas[panoId].tiles.length; i++) {
                topleftx = Math.min(res[tabId].panoramas[panoId].tiles[i][0], topleftx);
                toplefty = Math.min(res[tabId].panoramas[panoId].tiles[i][1], toplefty);
                bottomrightx = Math.max(res[tabId].panoramas[panoId].tiles[i][0], bottomrightx);
                bottomrighty = Math.max(res[tabId].panoramas[panoId].tiles[i][1], bottomrighty);
            }

            res[tabId].panoramas[panoId].startPos = {pov: res[tabId + 'initialPov'], 
                                                    topleft: [topleftx, toplefty],
                                                    bottomright: [bottomrightx, bottomrighty]}; // remember current initial pov, top left, and bottom right tiles to reuse them in the future
            res[tabId].panoramas[panoId].loadingStatus = false;
            res[tabId].panoramas[panoId].tiles = []; // clear tiles since we already calculated what we needed
            chrome.storage.local.set(res);
            return updateObjects(res[tabId].panoramas[panoId].startPos.topleft, res[tabId].panoramas[panoId].startPos.bottomright, panoId, 4).then(() => Promise.resolve());
        });
    });
}

function newTile(requestDetails) {
    const url = requestDetails.url;
    const tabId = requestDetails.tabId;
    console.log(url, Date.now());

    const panoId = separateParams(url, "panoid", true),
            x = parseInt(separateParams(url, "x")),
            y = parseInt(separateParams(url, "y")),
            zoom = parseInt(separateParams(url, "zoom"));
    
    if(zoom === 4) // TODO: fix zoom
    {
        mutex.synchronize(() => {
            let kvp = {}
            kvp[tabId] = null;
            return chrome.storage.local.get(kvp).then((res) => {
                if(res[tabId] != null) { // first load for a particular panorama
                    kvp[tabId] = res[tabId];
                    if(kvp[tabId].panoramas[panoId] == null) {
                        kvp[tabId].panoramas[panoId] = {};
                        kvp[tabId].panoramas[panoId].tiles = [];
                    }
                }
                else {  // first load on a tab
                    kvp[tabId] = {};
                    kvp[tabId].panoramas = {};
                    kvp[tabId].panoramas[panoId] = {};
                    kvp[tabId].panoramas[panoId].tiles = [];
                }
                if(kvp[tabId].panoramas[panoId].loadingStatus === true || kvp[tabId].panoramas[panoId].loadingStatus == null) {
                    if(kvp[tabId].panoramas[panoId].tiles.length === 0) {
                        console.log(Date.now());
                        setTimeout(() => {console.log(Date.now()); doneLoading(panoId, tabId)}, 750); // assume we loaded everything in 750 milliseconds
                    }
                    kvp[tabId].panoramas[panoId].tiles = [...kvp[tabId].panoramas[panoId].tiles, [x, y]];
                    console.log(kvp[tabId].panoramas[panoId].tiles);
                    kvp[tabId].panoramas[panoId].loadingStatus = true;
                    if(kvp[tabId].panoramas[panoId].timer != null) {
                        console.log("clearing timeout");
                        clearTimeout(kvp[tabId].panoramas[panoId].timer);
                    }
                    kvp[tabId].panoramas[panoId].timer = setTimeout(() => doneLoading(panoId, tabId), 300);
                    return chrome.storage.local.set(kvp).then(() => Promise.resolve());
                }
                else {
                    return Promise.resolve();
                }
            });
        });
    }
}

function handleInitialPovChange(pov, sender) {
    let kvp = {}
    kvp[sender.tab.id + 'initialPOV'] = pov;
    console.log('initial pov change');
    chrome.storage.local.set(kvp);
}

function handlePovChanged(pov, sender) {
    //console.log('pov changed');
}

async function updateObjects(topleft, bottomright, panoId, zoom) {
    const url = "http://127.0.0.1:5000/objects?"
    console.log(topleft);
    console.log(bottomright);
    return await fetch(url + new URLSearchParams({
        'topleftx': topleft[0],
        'toplefty': topleft[1],
        'bottomrightx': bottomright[0],
        'bottomrighty': bottomright[1],
        'panoId': panoId,
        'zoom': zoom
    }), {
        method: "GET",
        mode: 'cors'
    }).then((boundingBoxes) => {
        // display new bounding boxes
    });
}

chrome.webRequest.onBeforeRequest.addListener(newTile, 
    { urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"] }  
);

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'initialPOV') {
        handleInitialPovChange(msg.value, sender);
    }
    else if(msg.msg === 'POVchanged') {
        handlePovChanged(msg.value, sender);
    }
});