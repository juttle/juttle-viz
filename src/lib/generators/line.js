var d3 = require('d3');
var _ = require('underscore');

var seriesGeneratorUtils = require('./utils/series-generator-utils');

var INTERPOLATION_BREAK = 'INTERPOLATION_BREAK';

function findLonelyPoints(points, valueField) {
    var lonelyPoints = [];

    for (var i = 0; i < points.length; i++) {
        var thisPoint = points[i];

        if (thisPoint[valueField] === INTERPOLATION_BREAK) {
            continue;
        }

        var prevPoint = points[i - 1];
        var nextPoint = points[i + 1];

        if ((prevPoint === undefined || prevPoint[valueField] === INTERPOLATION_BREAK)
            && (nextPoint === undefined || nextPoint[valueField] === INTERPOLATION_BREAK)) {
            lonelyPoints.push(thisPoint);
        }
    }

    return lonelyPoints;
}

// line constructor
var Line = function(el, options) {
    var self = this;
    if (typeof options === 'undefined' ) {
        options = {};
    }

    this.xfield = options.xfield || 'time';
    this.yfield = options.yfield || 'value';
    this.type = 'slide';
    this.duration = options.duration || 0;

    this.el = el;

    this.selection = d3.select(el);

    this.line = d3.svg.line();

    this.line.defined(function(d) {
        return d[self.yfield] !== INTERPOLATION_BREAK;
    });

    this.series = this.selection.append('g')
        .attr("class", "series");

    this._attributes = options;

    if (options.label) {
        this.series.attr("id", options.label);
    }

    this.data = [];
    this.draw_range = undefined;

    this.hover_point = null;
};

Line.prototype.set_yfield = function(y) {
    this.yfield = y;
};

Line.prototype.set_id = function(id) {
    this.id = id;
    this.series.attr("id", id);
};

Line.prototype.set_color = function(c) {
    this.color = c;
    this.series.selectAll('path.line').style('stroke', this.color);
    this.series.selectAll('circle.data').attr('fill', this.color);
    this.series.selectAll('circle.lonely-point').attr('fill', this.color);
};

Line.prototype.set_duration = function(d) {
    this.duration = d;
};

Line.prototype.remove = function() {
    this.series.remove();
};

Line.prototype.hide = function() {
    this.series.attr('display', 'none');
};

Line.prototype.show = function() {
    this.series.attr('display', null);
};

Line.prototype.setScales = function(xScale, yScale) {
    // setup the line generator properly
    var self = this;

    if (!xScale) {
        throw new Error('An x scale should be set as xScale property');
    }

    if (!yScale) {
        throw new Error('A y scale should be set as yScale property');
    }

    this.xScale = xScale;
    this.yScale = yScale;

    this.line
        .x(function(d) { return self.xScale(d[self.xfield]); } )
        .y(function(d) { return self.yScale(d[self.yfield]); } );
};

Line.prototype.redraw = function(range) {
    this.draw_range = range;
    this.draw();
};

Line.prototype.update = function(payload, range) {
    var self = this;
    var payloadData = payload.data;
    var interplationBreaks = payload.interpolationBreaks;

    var noLongerExistingPointsFromPreviousRange = this._getPreviousPointsToKeep(payloadData[0]);

    if (interplationBreaks !== undefined) {
        this._interpolationBreaks = interplationBreaks.map(function(breakTime) { 
            var obj = {};
            obj[self.xfield] = breakTime;
            obj[self.yfield] = INTERPOLATION_BREAK;
            return obj;
        });        
    }

    this.draw_range = range;

    // tack on any points from the previous data that were in the previous range
    // so that the transition on the left side
    // of the graph gets rendered correctly and we don't drop lines before
    // they make it off the graph
    if (noLongerExistingPointsFromPreviousRange.length > 0) {
        this.data = noLongerExistingPointsFromPreviousRange.concat(payloadData);
    }
    else {
         this.data = payloadData;
    }
    
    this.draw();
};

Line.prototype._getPreviousPointsToKeep = function(oldestNewPoint) {
    var noLongerExistingPointsFromPreviousRange = [];

    for (var i = 0; i < this.data.length; i++) {
        var oldPt = this.data[i];
        // if theres no new data, treat all points as older than first new point
        var olderThanFirstNewPoint = oldestNewPoint !== undefined ? (oldPt[this.xfield] < oldestNewPoint[this.xfield]) : true;
        var newerThanStartOfCurrentRange = oldPt[this.xfield] >= this.draw_range[0];
        if (olderThanFirstNewPoint && newerThanStartOfCurrentRange) {
            noLongerExistingPointsFromPreviousRange.push(oldPt);
        }
    }

    return noLongerExistingPointsFromPreviousRange;
};

Line.prototype.draw = function() {
    var self = this;
    if (this.data.length === 0) { return; }

    if (this.draw_range !== undefined) {
        if (this.hover_point) {
            var v = this.hover_point[this.xfield];
            if (v >= this.draw_range[0] && v <= this.draw_range[1]) {
                this.hover_point = null;
            }
        }
    }

    var data = this.data;
    if (this._interpolationBreaks) {
        data = this.data.concat(this._interpolationBreaks);
        data = _.sortBy(data, function(d) {
            return d[self.xfield];
        });
    }

    this._drawLonelyPoints(findLonelyPoints(data, self.yfield));

    this._drawMarkers(this.data);
    this._drawLines(data);
    this.draw_hover();
};

Line.prototype._drawLines = function(data) {
    var path = this.series.selectAll('path.line');
    path = path.data([data]);

    path.enter()
      .append("path")
        .attr("class", "line")
        .style("stroke", this.color);

    path.exit()
        .remove();

    path.attr('d', this.line);

};

Line.prototype._drawMarkers = function(data) {
    var self = this;
    if (this._attributes.markerSize === 0) {
        return;
    }

    var circle = this.series.selectAll('circle.data');

    circle = circle.data(this.data, function(d) {
        return d[self.xfield];
    });

    circle.enter().append('circle')
        .attr('class', 'data');

    circle
        .attr('cx', function(d) {
            return self.xScale(d[self.xfield]);
        })
        .attr('cy', function(d) {
            return self.yScale(d[self.yfield]);
        })
        .attr('r', this._attributes.markerSize)
        .attr('fill', this.color);

    circle.exit().remove();
};

Line.prototype._drawLonelyPoints = function(lonelyPoints) {
    var self = this;
    var circle = this.series.selectAll('circle.lonely-point');

    circle = circle.data(lonelyPoints, function(d) {
        return d[self.xfield];
    });

    circle.enter().append('circle')
        .attr('class', 'lonely-point');

    circle
        .attr('cx', function(d) {
            return self.xScale(d[self.xfield]);
        })
        .attr('cy', function(d) {
            return self.yScale(d[self.yfield]);
        })
        .attr('r', 2)
        .attr('fill', this.color);

    circle.exit().remove();
};

Line.prototype.hover_find = function(t) {
    var closestIndex = seriesGeneratorUtils.getClosestIndex(t, _.pluck(this.data, this.xfield));
    var closestPoint = this.data[closestIndex];

    return seriesGeneratorUtils.checkIfPointWithinThreshold(t, closestPoint, this.xScale, this.xfield) ? closestPoint : null;
};

Line.prototype.hover_on = function(d) {
    this.hover_point = d;
    this.draw_hover();
    return d[this.yfield];
};

Line.prototype.hover_off = function() {
    this.hover_point = null;
    this.draw_hover();
};

Line.prototype.draw_hover = function() {
    var self = this;

    var d = [];
    if (this.hover_point) { d.push(this.hover_point); }
    var circle = this.series.selectAll('circle.hover').data(d);
    circle.enter().append('circle')
        .attr('class', 'hover')
        .attr('r', 4.5)
        .attr('fill', this.color);
    
    circle.exit().remove();

    circle
        .attr('cx', function(d) {
            return self.xScale(d[self.xfield]);
        })
        .attr('cy', function(d) {
            return self.yScale(d[self.yfield]);
        });
};

Line.prototype.getTooltipContents = function(d, series) {
    return seriesGeneratorUtils.getTooltipContents(d ? d[this.yfield] : null, series);
};

module.exports = Line;
