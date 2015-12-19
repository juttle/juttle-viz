var d3 = require('d3');
var stringUtils = require('../../utils/string-utils');

var MAX_SERIES_NAME_LENGTH = 30;
var DEFAULT_THRESHOLD = 5;

module.exports = {
    getClosestIndex: function(t, data, direction) {
        if (data.length === 0) {
            return null;
        }
        else if (data.length === 1) {
            return 0;
        }

        var bisector;

        if (direction) {
            bisector = d3.bisector(function(d) {
                return d;
            })[direction];
            return bisector(data, t);
        }
        else {
            bisector = d3.bisector(function(d) {
                return d;
            }).right;
            var index = bisector(data, t);

            if (index === 0) {
                return 0;
            }
            else if (index === data.length) {
                return index-1;
            }

            var d0 = t - data[index-1];
            var d1 = data[index] - t;

            return (d0 < d1) ? index-1 : index;
        }
    },

    checkIfPointWithinThreshold: function(t, pt, xScale, xfield, threshold) {
        threshold = threshold || DEFAULT_THRESHOLD;

        if (!pt) {
            return null;
        }

        return Math.abs(xScale(t)-xScale(pt[xfield])) < threshold;
    },

    getTooltipContents: function(value, series) {
        var body = d3.select(document.createElement('li'));

        var seriesName = stringUtils.truncateString(series.label, MAX_SERIES_NAME_LENGTH);
        seriesName += ( series.axis === 'right' ? ' (RHS)' : '' ) + ': ';
        var text = '---';
        if (value !== null && typeof value === 'number') {
            var n = Math.round(value*1000)/1000;
            var formatter = d3.format(series.valueFormat);
            text = formatter(n);
        }

        body.classed('metric', true);

        body.append('span')
            .classed('series-name', true)
            .text(seriesName)
            .attr('title', series.label)
            .style('color', series.color);

        body.append('span')
            .classed('series-value', true)
            .text(text);

        return body.node();
    }
};
