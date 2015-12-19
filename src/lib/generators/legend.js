// A legend generator.
// It works sligthly differently than
// other generators as it takes an array of
// dataTargets and just checks what their name or
// id is to draw the legend
var _ = require('underscore');
var $ = require('jquery');

var Legend = function(container, options) {

    var defaults = require('../utils/default-options')();
    var collapsedTitle = $('<span>Legend</span>')
            .addClass('collapsed-title');

    if (typeof options === 'undefined') {
        options = {};
    }

    this.options = _.defaults(options, defaults);

    this._series = [];

    this._legendBody = $('<span/>')
        .addClass('legend-body');

    this._toggleBtn = $('<i>')
        .addClass('fa  fa-angle-double-up legend-toogle-btn')
        .prop('title', "Collapse/Expand Legend")
        .click(_.bind(this._toggleLegend, this))
        .append(collapsedTitle);

    // el should be the container of the chart
    this._wrapper = $('<div/>')
        .addClass('jut-legend')
        .append(this._toggleBtn, this._legendBody);

    $(container).append(this._wrapper);


};

Legend.prototype.set_value = function(val) {
    this.valueField = val;
};

Legend.prototype.setSeriesOrder = function(seriesOrder) {
    this._seriesOrder = seriesOrder;
};

Legend.prototype.resize = function(w,h) {
    this._updateLegendItemWidth();
};

Legend.prototype.update = function(series) {
    var self = this;
    series = _.sortBy(series, function(series) {
        return self._seriesOrder ? self._seriesOrder.indexOf(series.id) : series.label;
    });

    this._series = series;
    this.draw(series);
};

Legend.prototype.draw = function(series) {

    var html = series.map(function(series) {
        return'<div class="legend-item"><span class="color-chip" style="background-color:' + series.color + '"/><span class="series-label" title="'+series.label+'">' + series.label + (series.axis === 'right' ? ' (RHS)' : '' ) + '</span></div>';
    }).join('');

    // add container that is used to calculate the pixel width of the longest series label
    html += '<div class="series-label-width-test" ></div>';

    $(this._legendBody).html(html);

    this._updateLegendItemWidth();

};

Legend.prototype._updateLegendItemWidth = function() {
    var maxLegendWidth = this._getMaxSeriesLabelWidth(this._series);
    var bodyW = $(this._legendBody).width();
    var chipW = $(this._legendBody).find('.color-chip').width();
    var w = Math.min(maxLegendWidth,bodyW-chipW);
    $(this._legendBody).find('.series-label').width(w);
};

/**
 * determine the calculated pixel width of the longest series label
 * @param {Array} series
 */
Legend.prototype._getMaxSeriesLabelWidth = function(series) {
    // find the longest label in the series
    var longest = _.max(series, function(s) {
        if (s.label) {
            return s.label.length;
        }
    });
    // calculate the pixel width; add extra character to compensate for slightly inaccurate width calculation
    return $(this._legendBody).children('.series-label-width-test').text(longest.label+'_').innerWidth();
};

/**
 * Collapse/expand legend
 */
Legend.prototype._toggleLegend = function() {
    this._wrapper
        .toggleClass('collapsed');

    this._toggleBtn
        .toggleClass('fa-angle-double-up fa-angle-double-down');

    this._updateLegendItemWidth();
};

module.exports = Legend;
