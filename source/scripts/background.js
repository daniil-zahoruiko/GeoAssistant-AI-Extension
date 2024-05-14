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

var Fetcher = function () {
    this._busy = false;
    this._nextTask = null;
}

Fetcher.prototype.setNextTask = function(task) {
    this._nextTask = task;
    if(!this._busy) {
        this._busy = true;
        this._execute(task);
    }
}

Fetcher.prototype._execute = function(task) {
    var self = this;
    self._nextTask = null;

    task().then(function () {
        if(self._nextTask) 
            self._execute(self._nextTask);
        else 
            self._busy = false;
    }, function () {
        if(self._nextTask) 
            self._execute(self._nextTask);
        else 
            self._busy = false;
    });
}

const mutex = new Mutex();
const fetcher = new Fetcher();

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

function newTile(requestDetails) {
    const url = requestDetails.url;
    const tabId = requestDetails.tabId;
    // console.log(url);

    const panoId = separateParams(url, "panoid", true),
            x = parseInt(separateParams(url, "x")),
            y = parseInt(separateParams(url, "y")),
            zoom = parseInt(separateParams(url, "zoom"));
    if(zoom >= 3) {
        let kvp = {}
        kvp[tabId] = null;
        mutex.synchronize(() => {
            return chrome.storage.local.get(kvp).then((res) => {
                if(res[tabId] == null || panoId !== res[tabId].pano) {
                    if(res[tabId] == null) {
                        res[tabId] = {};
                    }
                    res[tabId].pano = panoId;
                    chrome.storage.local.set(res, () => chrome.tabs.sendMessage(tabId, {msg: 'fetchOriginPOV', value: panoId})).then(() => Promise.resolve());
                }
                else {
                    return Promise.resolve();
                }
            });
        });
    }
}

function handlePovChanged(pov, sender) {
    const tabId = sender.tab.id;
    let kvp = {};
    kvp[tabId] = null;
    chrome.storage.local.get(kvp, (res) => {
        if(res[tabId] == null) {
            res[tabId] = {};
        }
        res[tabId].currentPov = {heading: pov.heading, pitch: pov.pitch};
        chrome.storage.local.set(res, () => {
            if(res[tabId].pano != null) {
                updateObjects(tabId);
            }
        });
    });
}

function handleOriginPovChange(tiles, sender) {
    const tabId = sender.tab.id;
    let kvp = {};
    kvp[tabId] = null;
    chrome.storage.local.get(kvp, (res) => {
        if(res[tabId] != null) {
            res[tabId].originPov = {heading: tiles.originHeading, pitch: tiles.originPitch};
            res[tabId].tileSize = {width: tiles.tileSize.width, height: tiles.tileSize.height};
            res[tabId].worldSize = {width: tiles.worldSize.width, height: tiles.worldSize.height};
            chrome.storage.local.set(res, () => updateObjects(tabId));
        }
    });
}

// TODO: maybe change these to POST

async function handleImageSave() {
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = tabs[0];
        
        if(tab != null) {
            const tabId = tab.id;
            let kvp = {}
            kvp[tabId] = null;
            fetcher.setNextTask(() => {
                return chrome.storage.local.get(kvp).then((res) =>
                {
                    console.log(res);
                    if(res[tabId] != null) {
                        const url = "http://127.0.0.1:5000/imsave?";
                        return fetch(url + defaultURLSearchParams(res[tabId]), {
                            method: "GET",
                            mode: 'cors'
                        }).then(() => {
                            return Promise.resolve();
                        });
                    }
                    else {
                        return Promise.resolve();
                    }
                });
            });
        }
    });
    
}

async function updateObjects(tabId) {
    let kvp = {}
    kvp[tabId] = null;
    fetcher.setNextTask(() => {
        return chrome.storage.local.get(kvp).then((res) =>
        {
            console.log(res);
            if(res[tabId] != null) {
                const url = "http://127.0.0.1:5000/objects?";
                return fetch(url + defaultURLSearchParams(res[tabId]), {
                    method: "GET",
                    mode: 'cors'
                }).then((boundingBoxes) => {
                    // display new bounding boxes
                    return Promise.resolve();
                });
            }
            else {
                return Promise.resolve();
            }
        });
    });
}

function defaultURLSearchParams(storageObj) {
    return new URLSearchParams({
        'tileWidth': storageObj.tileSize.width,
        'tileHeight': storageObj.tileSize.height,
        'worldWidth': storageObj.worldSize.width,
        'worldHeight': storageObj.worldSize.height,
        'originHeading': storageObj.originPov.heading,
        'originPitch': storageObj.originPov.pitch,
        'currentHeading': storageObj.currentPov.heading,
        'currentPitch': storageObj.currentPov.pitch,
        'panoId': storageObj.pano,
        'zoom': 4   // TODO: make all levels of zoom work
    });
}

chrome.webRequest.onBeforeRequest.addListener(newTile, 
    { urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"] }  
);

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'POVchanged') {
        handlePovChanged(msg.value, sender);
    }
    else if(msg.msg === 'sendOriginPOV') {
        handleOriginPovChange(msg.value, sender);
    }
    else if(msg.msg === 'SaveImage') {
        handleImageSave();
    }
});