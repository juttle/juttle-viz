var _ = require('underscore');
var stringUtils = require('../utils/string-utils');
var commonOptionDefaults = require('../utils/default-options')();

var TITLE_MAX_LENGTH = 20;

var FacetedPanel = function(el, options) {

    this._width = options.width;
    this._height = options.height;
    this._margin = options.margin;
    this._animDuration = commonOptionDefaults.duration;

    // XXX facetTitles are not the fields but the titles for each facet displayed
    this._facetTitles = options.facetFields;
    this._facetTitleHeight = options.titleHeight;
    this._headerHeight = options.headerHeight;
    this._el = el;
    this._el
        .append('rect')
            .attr('transform', 'translate(' + this._margin.left + ',0)')
            .attr('height', this._height-this._margin.bottom)
            .attr('width', this._width - this._margin.left - this._margin.right );

    this._el.append('g')
        .attr('class', 'header');

    this._renderTitle();

    this._el.append('g')
        .attr('class', 'body')
        .attr('transform', 'translate(0,'+this._headerHeight+')');

    return this;

};

FacetedPanel.prototype.getBody = function() {
    return this._el.select('.body');
};

FacetedPanel.prototype.resize = function(w,h) {
    var self = this;
    this._width = w;
    this._height = h;

    this._el.select('.header').selectAll('text')
        .attr('transform', function(d,i) {
            return 'translate('+self._width/2+',' + self._facetTitleHeight*(i+1) + ')';
        });

    this._el.select('rect')
        .transition().ease('linear').duration(this._animDuration)
        .attr('height', this._height - this._margin.bottom - this._margin.bottom)
        .attr('width', this._width - this._margin.left - this._margin.right );

};

FacetedPanel.prototype._renderTitle = function() {
    var self = this;
    var header = this._el.select('.header');
    var facetFields = _.toArray(this._facetTitles);

    header.selectAll('text')
        .data(facetFields)
        .enter()
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', function(d,i) {
                return 'translate('+self._width/2+',' + self._facetTitleHeight*(i+1) + ')';
            })
            .text(function (d) {
                return stringUtils.truncateString(d, TITLE_MAX_LENGTH);
            });
};

/**
 * applies cssTags that affect the display of the chart axis
 * @param {[type]} cssTags [description]
 */
FacetedPanel.prototype._setAxisDisplayCss = function(cssTags) {
    var css = '';
    _.each(cssTags, function(tag) {
        css += tag;
    });
    this._el.select('.body')
        .attr('class', css);
};

module.exports = FacetedPanel;
