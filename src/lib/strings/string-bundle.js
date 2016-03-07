var format = require('string-template');
var Base = require('extendable-base');

module.exports = Base.extend({
    initialize: function(stringBundle) {
        this._stringBundle = stringBundle;
    },

    getStringForCode: function(code, info) {
        var string = this._stringBundle[code];
        if (string === undefined) {
            return code;
        }

        return format(string, info);
    }
});
