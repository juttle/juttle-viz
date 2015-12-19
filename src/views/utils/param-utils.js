var _ = require('underscore');
var MomentParser = require('moment-parser');
var moment = require('moment');

var parser = new MomentParser();

module.exports = {
    /**
     * Converts an input into a duration. If the value is numeric, treat it as seconds, otherwise it
     * should be a string representation of a juttle duration.
     * @param  {[type]} val [description]
     * @return {[type]}     [description]
     */
    convertToDuration : function(val) {
        if (val === undefined) {
            return;
        }
        else if (_.isNumber(val)) {
            return moment.duration(val);
        }
        else if (_.isString(val)) {
            try {
                return parser.parseDuration(val);
            }
            catch(e) {
                return false;
            }
        }
        else {
            throw new Error('val should be a number or a juttle duration string');
        }
    }
};
