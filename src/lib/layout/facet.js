var d3 = require('d3');
var _ = require('underscore');
var Backbone = require('backbone');
var FacetedPanel = require('../generators/facetedPanel');
var commonOptionDefaults = require('../utils/default-options')();

// XXX might want to re-think this
// font size is css which needs to map to this
var FACET_LABEL_HEIGHT = 20;

// the padding between facet labels and the chart
var FACET_LABEL_PADDING = 10;

// the spacing between charts
var GUTTER = 25;

// allowed values for facet.width
var FACET_WIDTH_MAP = {
    '100%': 1,
    '50%': 2,
    '25%': 4,
    '20%': 5,
    '1': 1,
    '1/2': 2,
    '1/3': 3,
    '1/4': 4,
    '1/5': 5,
    '1/6': 6
};

/**
 * Faceted Chart Layout
 * @param {Object} svg the element
 * @param {Object} options
 */
var FacetLayout = function(svg, options) {
    var widthCfg;

    // the svg element to render charts to
    this._svg = svg.classed('facet-layout',true);
    this._attributes = options || {};

    this._animDuration = commonOptionDefaults.duration;

    // outer margins
    this._margin = {
        top: 0,
        bottom: 50,
        left: this._attributes.yScales.primary.displayOnAxis === 'left' ? 75 : 25,
        right: this._attributes.yScales.primary.displayOnAxis === 'left' ? 25 : 75
    };

    // collection of facet panels created
    this._facetPanels = [];

    this._chartCount = 0; // the number of facetd charts to be displayed
    this._colCount = 0; // number of columns
    this._rowCount = 1; // number of rows
    this._colWidth = 0; // width of column
    this._chartHeight = 0; // the height of the chart

    // facet.width configuration needs to be interpreted
    // could be column width (FIXED) OR number of columns (FLEXING)
    widthCfg = this._interpretWidthConfig(options.facet.width);
    this._layoutMode = widthCfg.mode;
    if (widthCfg.mode === 'fixed') {
        this._colWidth = widthCfg.value;
    }
    else if (widthCfg.mode === 'flex') {
        this._colCount = widthCfg.value;
    }

    this._facetTitleHeight = (options.facet.fields.length * FACET_LABEL_HEIGHT) + FACET_LABEL_PADDING; // the total height of vertically stacked facet field labels
    this._facetHeight = this._getFacetHeight(); // the height of the facet (incl titles and chart)

};

_.extend(FacetLayout.prototype, Backbone.Events);

FacetLayout.prototype.resize = function(width, height) {
    var self = this;

    this._width = width;

    if (this._layoutMode === 'fixed') {
        this._colCount = this._calculateColumnCount();
    }
    else {
        this._colWidth = this._calculateColumnWidth();
    }

    this._height = this._getHeight();

    this._svg
        .attr('width', this._width )
        .attr('height', this._height);

    this._positionAxisLabelContainers();

    this._chartHeight = this._calculateChartHeight();
    this._facetHeight = this._getFacetHeight();

    _.each(this._facetPanels, function(fp) {
        fp.resize(self._colWidth,self._facetHeight);
    });

    this._doLayout();

    return this._getChartSize();

};

FacetLayout.prototype._getChartSize = function() {
    return {
        w: this._colWidth,
        h: this._chartHeight
    };
};

/**
 * add chart to layout
 * @return svg group used as render target for chart
 */
FacetLayout.prototype.addChart = function(facetFields) {

    var fh = this._getFacetHeight();

    var chartMargin = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };

    this._chartCount++;

    // create render target
    var el = this._svg.append('g')
        .attr('class','facet-layout-panel-wrapper');

    var facetPanel = new FacetedPanel(el, {
        height: fh,
        width: this._colWidth,
        margin: chartMargin,
        headerHeight: this._facetTitleHeight,
        titleHeight: FACET_LABEL_HEIGHT,
        facetFields: facetFields
    });

    this._facetPanels.push(facetPanel);

    var chartSpec = {
        el: facetPanel.getBody(),
        width: this._colWidth,
        height: this._chartHeight,
        margin: chartMargin
    };

    this._doLayout();

    return chartSpec;

};

/**
 * add axis label container to layout
 * @return svg group used as render target for axis labels
 */
FacetLayout.prototype.addAxisLabelContainers = function() {

    var g = this._svg.append('g')
        .attr('class', 'axis-labels');

    this._xAxisLabelContainer = g.append('g');
    this._yAxisLabelContainer = g.append('g');

    return {
        xEl: this._xAxisLabelContainer,
        yEl: this._yAxisLabelContainer
    };

};

FacetLayout.prototype._doLayout = function() {
    var self = this;
    var cIdx = 0;
    var x = 0;
    var y = 0;
    var totalFacets = self._facetPanels.length;
    //var totalRows = Math.ceil(totalFacets/self._colCount);

    this._rowCount = 1;

    this._svg.selectAll('.facet-layout-panel-wrapper')
        .each( function(data, idx) {
            var facetPanel = d3.select(this);
            if (cIdx === self._colCount) {
                cIdx=0;
                self._rowCount++;
            }

            // determine x/y position
            x = (self._colWidth + GUTTER) * cIdx + self._margin.left;
            y = (self._facetHeight + GUTTER) * (self._rowCount-1) + self._margin.top;

            facetPanel
                // css that identifies the position of the panel in the layout matrix
                // we use this to affect the visibility of the chart axis
                .classed('left', cIdx === 0 )
                .classed('right', (cIdx === self._colCount-1 || idx === totalFacets-1) )
                .classed('bottom', idx >= totalFacets-self._colCount);

            facetPanel
                .transition().ease('linear').duration(self._animDuration)
                .attr('transform', 'translate('+ x + ',' + y +')');

            cIdx++;

        });

    this._adjustHeight();

};

FacetLayout.prototype._adjustHeight = function() {

    this._height = this._getHeight();

    this._svg
        .attr('height', this._height);

    this._positionAxisLabelContainers();

};

FacetLayout.prototype._positionAxisLabelContainers = function() {
    if (this._xAxisLabelContainer) {
        this._xAxisLabelContainer
            .attr('transform', 'translate(' + this._width/2 + ',' + (this._height - 20) + ')');
    }
    if (this._yAxisLabelContainer) {
        this._yAxisLabelContainer
            .attr('transform','translate(' + 20 + ',' + this._height/2 + ')rotate(-90)');
    }
};

FacetLayout.prototype._calculateChartHeight = function() {
    var ch;
    // if facet.height is defined use that for chart height
    if (this._attributes.facet.height) {
        return this._attributes.facet.height;
    }
    // otherwise use golden ratio or max 325
    else if (this._colWidth !== 0) {
        ch = this._colWidth / 1.6189;

        if (ch > 325) {
            ch = 325;
        }
        return ch;
    } else {
        return 0;
    }
};

FacetLayout.prototype._getFacetHeight = function() {
    return this._chartHeight + this._facetTitleHeight;
};

FacetLayout.prototype._calculateColumnWidth = function() {
    return (this._width - this._margin.left - this._margin.right - GUTTER*(this._colCount-1)) / this._colCount;
};

FacetLayout.prototype._calculateColumnCount = function() {
    return Math.floor((this._width  - this._margin.left - this._margin.right + GUTTER) / (this._colWidth + GUTTER));
};

FacetLayout.prototype._getHeight = function() {
    return this._rowCount*(this._facetHeight+GUTTER) + this._margin.bottom + this._margin.top;
};

FacetLayout.prototype._interpretWidthConfig = function(config) {
    var v;
    // if a number, assume it is the column width
    if (_.isNumber(config)) {
        return {
            mode: 'fixed',
            value: config
        };
    }

    // if a string translate to column count
    if (_.isString(config)) {
        v = FACET_WIDTH_MAP[config];
        if (_.isNumber(v)) {
            return {
                mode: 'flex',
                value: v
            };
        }
    }
    this.trigger('facet-width-error');
    return false;

};

module.exports = FacetLayout;
