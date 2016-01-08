/**
 * Single Chart Layout 
 * @param {Object} svg the element
 * @param {Object} options
 */
var SimpleLayout = function(svg, options) {

    // the svg element to render charts to
    this._svg = svg;
    this._attributes = options || {};

    // outer margins
    this._margin = {
        top: 20,
        bottom: 75,
        left: this._attributes.yScales.primary.displayOnAxis === 'left' ? 75 : 25,
        right: this._attributes.yScales.primary.displayOnAxis === 'left' ? 25 : 75
    };

};

SimpleLayout.prototype.resize = function(width, height) {

    if (width) {
        height = width / 1.6189;

        // scatterplots work better with an increased height
        // other sinks have a max height of 325 which does not work well for scatterplots
        if (height > 525) {
            height = 525;
        }
    } else {
        return;
    }

    this._height = height;
    this._width = width;

    this._svg
        .attr('height', height)
        .attr('width', width);

    this._positionAxisLabelContainers();

    return this._getChartSize();

};

/**
 * add chart to layout
 * @return svg group used as render target for chart
 */
SimpleLayout.prototype.addChart = function() {

    var chartMargin = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };
    
    // create render target 
    var el = this._svg.append('g')
        .attr('class','simple-layout-chart-wrapper')
        .attr('transform', 'translate(' + this._margin.left + ',' + this._margin.top + ')');

    var chartSize = this._getChartSize();

    var chartSpec = {
        el: el,
        width: chartSize.w,
        height: chartSize.h,
        margin: chartMargin
    };

    return chartSpec;

};

SimpleLayout.prototype._getChartSize = function() {
    return {
        w: this._width - this._margin.left - this._margin.right,
        h: this._height - this._margin.bottom - this._margin.top 
    };

};

/**
 * add axis label container to layout
 * @return svg group used as render target for axis labels
 */
SimpleLayout.prototype.addAxisLabelContainers = function() {

    var g = this._svg.append('g')
        .attr('class', 'axis-labels');

    this._xAxisLabelContainer = g.append('g');
    this._yAxisLabelContainer = g.append('g');
     
    return {
        xEl: this._xAxisLabelContainer,
        yEl: this._yAxisLabelContainer
    };

};

SimpleLayout.prototype._positionAxisLabelContainers = function() {
    if (this._xAxisLabelContainer) {
        this._xAxisLabelContainer
            .attr('transform', 'translate(' + this._width/2 + ',' + (this._height - 20) + ')');
    }
    if (this._yAxisLabelContainer) {
        this._yAxisLabelContainer
            .attr('transform','translate(' + 20 + ',' + this._height/2 + ')rotate(-90)');
    }
};

module.exports = SimpleLayout;
