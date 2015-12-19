var $ = require('jquery');
var _ = require('underscore');
var moment = require('moment');
var d3Formatters = require('../utils/d3-formatters');
var timefmt = d3Formatters.time;
var datefmt = d3Formatters.date;

var Timestamp = function(el) {

    this._wrapper = $("<div>")
        .addClass("timestamp");

    $(el).append(this._wrapper);

};

Timestamp.prototype.update = function(fromDate,toDate) {
    
    if (!_.isDate(fromDate)) {
        return;
    }
    // single date
    else if (!_.isDate(toDate) ) {
        this._renderSingleDate(fromDate);
    }
    // date range
    else {
        this._renderDateRange(fromDate,toDate);
    }

};

/**
 * set left and right css margins
 * @param {number} left
 * @param {number} right
 */
Timestamp.prototype.setHorizontalPadding = function(left, right) {
    this._wrapper.css({
        "padding-left": left + "px",
        "padding-right": right + "px"
    });
};

Timestamp.prototype._renderSingleDate = function(date) {
    $(this._wrapper).html('<span class="time">' + timefmt(date) + '</span><span class="preposition">on</span><span class="date">' + datefmt(date) + ' (UTC)</span>');
};

Timestamp.prototype._renderDateRange = function(fromDate,toDate) {
    var html = '<span class="window">' + moment.duration(fromDate - toDate).humanize() + '</span>';

    html += '<span class="preposition">from</span><span class="time">' + timefmt(fromDate) + '</span>';

    if (datefmt(toDate) === datefmt(fromDate)) {
        html += '<span class="preposition">to</span><span class="time">' + timefmt(toDate) + '</span>';
        html += '<span class="preposition">on</span><span class="date">' + datefmt(toDate) + ' (UTC)</span>';
    }
    else {
        html += '<span class="preposition">on</span><span class="date">' + datefmt(fromDate) + '</span>';
        html += '<span class="preposition">to</span><span class="time">' + timefmt(toDate) + '</span>';
        html += '<span class="preposition">on</span><span class="date">' + datefmt(toDate) + ' (UTC)</span>';
    }

    $(this._wrapper).html(html);

};

module.exports = Timestamp;
