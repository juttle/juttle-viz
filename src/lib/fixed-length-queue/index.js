var _ = require('underscore');

/**
 * Constructs a new FixedLengthQueue
 * @param {[type]} bufferLimit The number of items to buffer before dropping the oldest ones.
 */
function FixedLengthQueue(maxSize) {
    if (! _.isNumber(maxSize)) {
        throw new Error('must specify numeric maxSize');
    }
    this._maxSize = maxSize;
    this._queue = [];
}

/**
 * Adds an item to the buffer. And drops old items if total length exceeds buffer limit.
 * @param  {[type]} bufferItem [description]
 * @return {[type]}            [description]
 */
FixedLengthQueue.prototype.push = function(item) {
    this._queue.push(item);

    if (this._queue.length > this._maxSize) {
        this._queue = this._queue.slice(0, this._maxSize - this._queue.length);
    }
};

/**
 * Returns the buffered items and resets the buffer to empty.
 * @return {[type]} [description]
 */
FixedLengthQueue.prototype.flush = function() {
    var items = this._queue;
    this._queue = [];
    return items;
};

module.exports = FixedLengthQueue;