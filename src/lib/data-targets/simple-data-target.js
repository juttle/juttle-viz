// simple data target, just spews
// all data passed to it.

var BaseDataTarget = require('./base-data-target');

var SimpleDataTarget = BaseDataTarget.extend({
    setData: function(data) {
        this._data = data;

        this.trigger('data', {
            data : this._data,
            id : this.id
        });
    },
    update: function(data) {
        this._data = this._data.concat(data);

        this.trigger('update', {
            data: this._data,
            newData: data,
            id: this.id
        });
    }
});

module.exports = SimpleDataTarget;
