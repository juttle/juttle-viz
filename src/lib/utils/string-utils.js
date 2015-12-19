var ELLIPSIS = '...';
var _ = require('underscore');

module.exports = {
    /**
     * Truncate string to a maxLength 
     * @param  {[type]} str       [description]
     * @param  {[type]} maxLength [description]
     * @param  {[type]} where     where to truncate and put the ellipsis (start, middle, or end). defaults to middle.
     * @return {[type]}           [description]
     */
    truncateString : function(str, maxLength, where) {
        if (!_.isString(str)) {
            return str;
        }

        var strLength = str.length;

        if (strLength <= maxLength) {
            return str;
        }
        
        // limit the length of the series name by dropping characters and inserting an ELLIPSIS where specified
        switch(where) {
            case 'start':
                str = ELLIPSIS + str.substr(strLength - maxLength - 1);
                break;
            case 'end':
                str = str.substr(0, Math.floor(maxLength) - 1) + ELLIPSIS;
                break;
            default:
                str = str.substr(0, Math.floor(maxLength/2) - 1) + ELLIPSIS + str.substr(-1 * (Math.floor(maxLength/2) + 1));
        }

        return str;
    }
};