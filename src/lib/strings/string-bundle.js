var _ = require('underscore');
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

        var template = _.template(string, {
            interpolate: /\{\{([^}]*)\}\}/g
        });

        return template(info);
    }
});
