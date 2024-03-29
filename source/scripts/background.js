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

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        const tabId = sender.tab.id;
        if(request.loadingStatus) {
            const tabInfo = {loading: true, tiles: [], zoom: 0}  // TODO: deal with zoom
            let kvp = {}
            kvp[tabId] = tabInfo;
            chrome.storage.session.set(kvp).then(() => console.log(`tab ${tabId} is reading`));
        }
        else {
            let kvp = {}
            kvp[tabId] = null;
            chrome.storage.session.get(kvp, (res) => {
                if(res[tabId] != null) {
                    kvp[tabId] = res[tabId];
                    kvp[tabId].loadingStatus = false;
                    chrome.storage.session.set(kvp).then(() => {console.log(`tab ${tabId} stopped reading`); console.log(kvp[tabId].tiles);});
                }
            });
        }
    }
);

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
    console.log(`done loading ${panoId}`);
    chrome.storage.local.get(kvp, (res) => {
        console.log([res[tabId].panoramas[panoId].tiles]);
        res[tabId].panoramas[panoId].loadingStatus = false;
        chrome.storage.local.set(res);
    });
    chrome.storage.local.get('initialPOV', (res) => console.log(res));
}

function newTile(requestDetails) {
    const url = requestDetails.url;
    const tabId = requestDetails.tabId;
    console.log(url);

    const panoId = separateParams(url, "panoid", true),
            x = parseInt(separateParams(url, "x")),
            y = parseInt(separateParams(url, "y")),
            zoom = parseInt(separateParams(url, "zoom"));
    
    if(zoom !== 0)
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
                    kvp[tabId].panoramas[panoId].timer = setTimeout(() => doneLoading(panoId, tabId), 200);
                    return chrome.storage.local.set(kvp).then(() => Promise.resolve());
                }
                else {
                    return Promise.resolve();
                }
            });
        });
    }
}

chrome.webRequest.onBeforeRequest.addListener(newTile, 
    { urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"] }  
);