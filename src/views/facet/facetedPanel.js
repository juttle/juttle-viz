var NestableTemplate = require('./nestableTemplate');
var $ = require('jquery');
var d3 = require('d3');
var stringUtils = require('../../lib/utils/string-utils');

var TITLE_MAX_LENGTH = 20;

function FacetedPanel(facetFields) {
    this._template = new NestableTemplate();
    this.el = this._template.el;
    $(this.el).addClass('faceted-panel');
    this._renderTitle(facetFields);
}

FacetedPanel.prototype.setBody = function(el) {
    this._template.setBody(el);
};

FacetedPanel.prototype._renderTitle = function(facetFields) {
    var title = document.createElement('ul');
    d3.select(title)
        .classed('title', true)
        .selectAll('li')
        .data(facetFields)
        .enter()
        .append('li')
        .classed('facet-field', true)
        .attr('title', function(d) {
            return d.value;
        })
        .text(function (d) {
            return stringUtils.truncateString(d.value, TITLE_MAX_LENGTH);
        });
    this._template.setHeader(title);
};

module.exports = FacetedPanel;
