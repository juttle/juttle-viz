// window version of the data target.
// we will inherit from BaseDataTarget which handles
// all of the pub-sub stuff
var BaseDataTarget = require('./base-data-target');

var WindowedDataTarget = BaseDataTarget.extend({
    setData: function(data) {
        this._data = data;

        this.trigger('data', {
            data: this._data,
            id: this.id
        });
    },
    update: function(data) {
        var newData;
        // add the data to the end of our current
        // data array.
        this._data = this._data.concat(data);
        // quickly copy the array to create
        // an array with the old and the new. This guy
        // is necessary for smoothly updating line
        // and area charts.
        newData = this._data.slice();

        // and now shift to create a window.
        this._data.splice(0, data.length);

        // don't notify if the window is not in focus
        // XXX this is to avoid crashes when the update
        // is set on an interval. However, phantomjs doesn't
        // support this. ;_;
        // if (!document.hasFocus()) {
        //     return;
        // }

        // trigger an update event to the listeners
        // with the payload.
        this.trigger('update', {
            data: this._data,
            newData: newData,
            id: this.id,
        });
    }
});

module.exports = WindowedDataTarget;
