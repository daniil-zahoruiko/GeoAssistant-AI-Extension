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
    kvp.initialPOV = null;
    console.log(`done loading ${panoId}`);
    chrome.storage.local.get(kvp, (res) => {
        console.log(res)
        var topleft = 0, bottomright = 0;
        for(let i = 1; i < res[tabId].panoramas[panoId].tiles.length; i++) {
            const sum = res[tabId].panoramas[panoId].tiles[i][0] + res[tabId].panoramas[panoId].tiles[i][1];
            if(sum < res[tabId].panoramas[panoId].tiles[topleft][0] + res[tabId].panoramas[panoId].tiles[topleft][1]) {
                topleft = i;
            }
            if(sum > res[tabId].panoramas[panoId].tiles[bottomright][0] + res[tabId].panoramas[panoId].tiles[bottomright][1]) {
                bottomright = i;
            }
        }
        //chrome.storage.local.get('initialPOV', (res) => console.log(res));
        res[tabId].panoramas[panoId].loadingStatus = false;
        chrome.storage.local.set(res)
        getObjects(res[tabId].panoramas[panoId].tiles[topleft], res[tabId].panoramas[panoId].tiles[bottomright], panoId, 4);
    });
}

function newTile(requestDetails) {
    const url = requestDetails.url;
    const tabId = requestDetails.tabId;
    console.log(url);

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
                if(res[tabId] != null) {
                    kvp[tabId] = res[tabId];
                    if(kvp[tabId].panoramas[panoId] == null) {
                        kvp[tabId].panoramas[panoId] = {};
                        kvp[tabId].panoramas[panoId].tiles = [];
                    }
                    kvp[tabId].panoramas[panoId].tiles = [...kvp[tabId].panoramas[panoId].tiles, [x, y]];
                }
                else {
                    kvp[tabId] = {};
                    kvp[tabId].panoramas = {};
                    kvp[tabId].panoramas[panoId] = {};
                    kvp[tabId].panoramas[panoId].tiles = [[x, y]];
                }
                if(kvp[tabId].panoramas[panoId].loadingStatus === true || kvp[tabId].panoramas[panoId].loadingStatus == null) {
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

async function getObjects(topleft, bottomright, panoId, zoom) {
    const url = "http://127.0.0.1:5000/objects?"
    console.log(topleft);
    console.log(bottomright);
    const response = await fetch(url + new URLSearchParams({
        'topleftx': topleft[0],
        'toplefty': topleft[1],
        'bottomrightx': bottomright[0],
        'bottomrighty': bottomright[1],
        'panoId': panoId,
        'zoom': zoom
    }), {
        method: "GET",
        mode: 'cors'
    })
}

chrome.webRequest.onBeforeRequest.addListener(newTile, 
    { urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"] }  
);