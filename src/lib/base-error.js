var Base = require('extendable-base');

module.exports = Base.inherits(Error, {
    initialize: function(message, code, info) {
        Error.call(this, message);

        // not present on IE
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.message = message || this.default_message || '';

        this.code = code;
        this.info = info || this.default_info || {};
    }
});
