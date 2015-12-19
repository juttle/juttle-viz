var _ = require('underscore');
var paramUtils = require('./param-utils');
var moment = require('moment');

var SUPPORTED_BOUND_TYPES = ["from","to"];

module.exports = {
    getTimeBound: function(timeBound, now, boundType) {
        if (!_.contains(SUPPORTED_BOUND_TYPES, boundType)) {
            throw "boundType must be one of " + SUPPORTED_BOUND_TYPES.join(", ");
        }

        var bound;
        if (timeBound.last) {
            if (boundType === 'from') {
                bound = moment(now).subtract(paramUtils.convertToDuration(timeBound.last)).toDate();
            }
            else if (boundType === 'to') {
                bound = now;
            }
        }
        else if (timeBound[boundType]) {
            bound = timeBound[boundType];
        }

        return bound;
    },

    getExtremeTimeBound: function(timeBounds, now, boundType) {
        if (!_.contains(SUPPORTED_BOUND_TYPES, boundType)) {
            throw "boundType must be one of " + SUPPORTED_BOUND_TYPES.join(", ");
        }

        var extremeBound;
        _.each(timeBounds, function(timeBound) {
            var bound = this.getTimeBound(timeBound, now, boundType);

            if (extremeBound === undefined) {
                extremeBound = bound;
            }
            else if (boundType === 'from' && bound < extremeBound) {
                extremeBound = bound;
            }
            else if (boundType === 'to' && bound > extremeBound) {
                extremeBound = bound;
            }
        }, this);

        return extremeBound;
    },

    convertFromToTimeBoundsToDates: function(timeBounds) {
        _.each(timeBounds, function(timeBound) {
            if (_.isString(timeBound.from)) {
                timeBound.from = new Date(timeBound.from);
            }

            if (_.isString(timeBound.to)) {
                timeBound.to = new Date(timeBound.to);
            }
        });
    }
};
