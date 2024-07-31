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

async function handleImageSave() {
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];
        
        if(tab != null) {
            const tabId = tab.id;
            await chrome.tabs.sendMessage(tabId, { msg: 'imgSave' });
        }
    });
    
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'SaveImage') {
        handleImageSave();
    }
});