var d3 = require('d3');
var _ = require('underscore');
var $ = require('jquery');

var DataTarget = require('../data-targets/adaptive-data-target');
var HoverRect = require('../components/hover-rect');
var SharedRange = require('../data-targets/shared-range');
var xAxisGenerator = require('../generators/x-axis');
var yAxisGenerator = require('../generators/y-axis');
var commonOptionDefaults = require('../utils/default-options')();
var axisUtils = require('../utils/axis-utils');
var calculateTickValues = axisUtils.calculateTickValues;
var Backbone = require('backbone');


function Scale(scale, options) {
    this.d3scale = scale;
    this.options = options;
    this.series = [];
}

var EVENT_MARKER_HEIGHT = 20;
var LABEL_WIDTH = 100;
var DEFAULT_VALUE_FORMAT = ',';

// TimeBase handles drawing and updating a chart that displays
// a cartesian plane with time on the horizontal axis.  Arbtirary
// shapes (XXX) can be rendered on the chart, using generators.
// This base class manages drawing shared elements: the legend,
// the axes, and the "hover overlay table".  It also manages a set
// of shared scales for the vertical dimension of the chart.
var TimeBase = function(element, options) {
    _.extend(this, Backbone.Events);

    // set to be an object in case
    // it's undefined
    options = options || {};

    this.margin = _.extend({
        top: 20,
        bottom: 100,
        left: 20,
        right: 20
    }, options.margin);

    this.width = options.width || commonOptionDefaults.width;
    this.height = options.height || commonOptionDefaults.height;

    var wrapper = $('<div/>');
    wrapper.addClass('jut-chart-wrapper');
    $(element).append(wrapper);

    this.svg = d3.select(wrapper[0]).append('svg')
        .attr('class', 'jut-chart time-chart')
        .attr('width', this.width)
        .attr('height', this.height);

    // This is public and is the rectangle that is bounded by the axes.
    // Other components can access and rely on it.
    this.el = this.svg.append('g')
        .attr('class', 'chart-container')
        .attr('transform',
              'translate(' + this.margin.left + ',' + this.margin.top + ')');

    // add layers for axes
    // so that the data draws on top
    this.axesArea = this.el.append('g')
        .attr('class', 'axes');

    this.id = options.id || (Math.floor(Math.random() * 10000));
    var clipid = "chartClip-" + this.id;

    this.clipRect = this.el.append('defs')
        .append('clipPath')
        .attr("id", clipid)
        .append('rect')
        .attr('y', -1 * EVENT_MARKER_HEIGHT);

    this._updateClipRectDimensions();

    // The actual plane where data series are represented.
    // seriesOuter is a simple <g> container to clip the
    // actual drawn series to the display area.
    this.seriesOuter = this.el.append('g')
        .attr("clip-path", "url(#" + clipid + ")");

    // seriesArea is the <g> into which generators attached to this
    // chart will render themselves.  Animations on the x axis are
    // handled by panning and scaling this entire container.
    this.seriesArea = this.seriesOuter.append('g')
        .attr('class', 'data');

    this.setup_hover_events();

    // time_range holds the range of times to be displayed on the
    // horizontal axis.  The data targets corresponding to all
    // the series displayed on the chart use this object to keep
    // themselves synchronized.
    this.ropts = {
        tfield: options.xfield,
        window: options.window,
        live: options.live
    };
    this.time_range = new SharedRange(this.ropts);

    this._animate = true;

    // series holds an object for each series being displayed on
    // the chart.  See add_series() below for details on what
    // is kept for each series.
    this.series = {};
    this.next_series = 0;

    // prototype of options for new DataTargets
    this.dtopts = _.pick(options, 'xfield', 'yfield', 'downsample_limit');
    this.dtopts.range = this.time_range;

    // State for handling animations on the horizontal axis.
    // See _slide() for the gory details.
    this.sliding = false;
    this.current_range = null;
    this.target_range = null;

    this._registerRangeChangeEvent(this.time_range);

    // Generators for drawing the axes.
    var axisopts = _.extend(_.clone(options), { margin: this.margin });
    this.xAxis = new xAxisGenerator(this.axesArea.node(), axisopts);

    this.leftAxis = null;
    this.rightAxis = null;

    // A collection of scales for the vertical (Y) axis.
    // Also state for managing updates to the Y scales/axes.
    // XXX this are could use a little more work
    this.scales = {
        yScales: {},
        xScales: {}
    };
    this.scaley = 1.0;

    this.timer = null;
    this.updates = {};
    this.transition_duration = 750;
    this.last_update = null;
    this.in_transition = false;

    this._components = [];

};


TimeBase.prototype._registerRangeChangeEvent = function(time_range) {
    var self = this;
    time_range.on('change:range', function(e, range) {
        self.target_range = range;
        self._slide();
    } );
};

TimeBase.prototype.set_downsample_limit = function(v) {
    this.dtopts.downsample_limit = v;
};

// Get the element for the "field" where data gets drawn
TimeBase.prototype.field = function() {
    return this.seriesArea.node();
};

TimeBase.prototype.registerComponent = function(component) {
    this._components.push(component);
};

TimeBase.prototype.set_duration = function(duration) {
    this.transition_duration = duration;

    this.xAxis.setDuration(duration);

    if (this.leftAxis) {
        this.leftAxis.setDuration(duration);
    }

    if (this.rightAxis) {
        this.rightAxis.setDuration(duration);
    }

    _.each(this.series, function(s) {
        if (s.generator.set_duration) { s.generator.set_duration(duration); }
    } );

    this._components.forEach(function(component) {
        component.setDuration(duration);
    });
};

TimeBase.prototype.setup_hover_events = function() {
    var self = this;
    
    // Create an invisible rectangle on top of the series area
    // to grab mouse events
    this.hover_rect = new HoverRect(this.seriesOuter.node(), {
        width : this.width - (this.margin.left + this.margin.right),
        height : this.height - (this.margin.top + this.margin.bottom)
    });

    this.hover_rect
        .on('mouseover', function(event) {
            if (self.have_data) {
                self.trigger('mouseover', event);
            }
        })
        .on('mouseout', function(event) {
            if (self.have_data) {
                self.trigger('mouseout', event);
            }
        })
        .on('mousemove', function(mouse) {
            if (self.have_data) {
                self.trigger('mousemove', mouse);
            }
        })
        .on('click', function(mouse) {
            if (self.have_data) {
                self.trigger('click', mouse);
            }
        });
};

// "margin" might not be the right word here, it means the space
// between the boundaries of the <svg> element and the actual
// spaces where series are drawn (ie, it the space in which the
// axes are drawn).  This spacing gets updated when we add something
// to an axis, this method updates everything that has geometry that
// depends on the margins.
TimeBase.prototype.set_margin = function(margin) {
    var self = this;
    this.margin = margin;

    this.el
        .attr('transform',
              'translate(' + margin.left + ',' + margin.top + ')');

    this._updateClipRectDimensions();

    this.xScale
        .range([ 0, this.width - (margin.left + margin.right) ]);

    var yrange = [ this.height - (margin.top + margin.bottom), 0 ];
    _.each(this.scales.yScales, function(scale) {
        scale.d3scale.range(yrange);
    });

    if (this.leftAxis) { this.leftAxis.set_margin(margin); }
    if (this.rightAxis) { this.rightAxis.set_margin(margin); }
    if (this.xAxis) { this.xAxis.setMargin(margin); }

    this.trigger('box-model-update', {
        height : this.height,
        width : this.width,
        margin : this.margin
    });

    this._components.forEach(function(component) {
        component.resize({
            height : self.height,
            width : self.width,
            margin : self.margin
        });
    });
};

// update everything that has geometry dependent on our overall
// width and height.
TimeBase.prototype.resize = function(width, height) {
    var self = this;
    this.width = width;
    this.height = height;

    this.svg
        .attr('width', width)
        .attr('height', height);

    var inner_width = width - (this.margin.left + this.margin.right);
    var inner_height = height - (this.margin.top + this.margin.bottom);

    this.hover_rect.resize(inner_width, inner_height);

    var yrange = [ inner_height, 0 ];
    _.each(this.scales.yScales, function(scale) {
        scale.d3scale.range(yrange);
    });

    _.each(this.scales.xScales, function(scale) {
        scale.d3scale.range([ 0, inner_width ]);
    });

    this.xAxis.axis.ticks(Math.round(inner_width/LABEL_WIDTH));
    this.xAxis.resize(width, height);

    

    if (this.leftAxis) { this.leftAxis.resize(width, height); }
    if (this.rightAxis) { this.rightAxis.resize(width, height); }

    this.trigger('box-model-update', {
        height : this.height,
        width : this.width,
        margin : this.margin
    });

    this.clipRect
        .attr('height', inner_height + EVENT_MARKER_HEIGHT)
        .attr('width', inner_width);

    _.each(this.series, function(series) {
        if (series.generator.resize) { series.generator.resize(width, height); }
        series.generator.draw();
    } );

    this._components.forEach(function(component) {
        component.resize({
            height : self.height,
            width : self.width,
            margin : self.margin
        });
    });
};

TimeBase.prototype.add_scale = function(isXScale, name, scale, opts) {
    var xOrYScale;
    if (isXScale) {
        xOrYScale = this.scales.xScales;
        scale.range([ 0, this.width - (this.margin.left + this.margin.right)]);
        if ( name === 'primary') {
            this.xScale = scale;
        }
        
    } else {
        xOrYScale = this.scales.yScales;
        scale.range([ this.height - (this.margin.top + this.margin.bottom), 0 ]);
    }

    xOrYScale[name] = new Scale(scale, opts);
};

// Display the given scale on a given axis (which must be 'left' or 'right')
TimeBase.prototype.show_scale = function(isXScale, name) {
    if (isXScale) {
        this.xAxis.setScale(this.xScale);
        var defaultFormat = axisUtils.getDefaultTimeFormat();
        if (this.scales.xScales[name].options.tickFormat) {
            var formatter = d3.time.format.utc(this.scales.xScales[name].options.tickFormat);
            this.xAxis.setFormat(formatter);
        }
        else{
            this.xAxis.setFormat(defaultFormat);
        }
        this.xAxis.axis.ticks(Math.round((this.width - (this.margin.left + this.margin.right))/LABEL_WIDTH));
    } else {
        this._showYScale(name);
    }
};

TimeBase.prototype._updateClipRectDimensions = function() {
    this.clipRect
        .attr('height', this.height + EVENT_MARKER_HEIGHT - (this.margin.top + this.margin.bottom))
        .attr('width', this.width - (this.margin.left + this.margin.right));
};

TimeBase.prototype._showYScale = function(name) {
    if (!this.scales.yScales.hasOwnProperty(name)) {
        throw new Error('no such scale ' + name);
    }
    var scale = this.scales.yScales[name];
    var newmargin;
    if (scale.options.displayOnAxis === 'left' || scale.options.displayOnAxis === 'right') {
        // XXX overloading margins to indicate if axis is shown
        if (this.margin[scale.options.displayOnAxis] !== 20) {
            throw new Error(scale.options.displayOnAxis + ' axis already set up');
        }

        newmargin = _.clone(this.margin);
        newmargin[scale.options.displayOnAxis] += 55;
        this.set_margin(newmargin);

        var axisopts = {
            width: this.width,
            height: this.height,
            margin: this.margin
        };

        var yAxis = new yAxisGenerator(this.axesArea.node(), axisopts);

        yAxis.setScale(scale.d3scale);
        yAxis.setFormat(scale.options.tickFormat);
        yAxis.orient(scale.options.displayOnAxis);

        if (scale.options.displayOnAxis === 'right') {
            this.rightAxis = yAxis;

        }
        else { 
            this.leftAxis = yAxis;
        }

    } else {
        throw new Error('bogus options.displayOnAxis argument ' + scale.options.displayOnAxis);
    }
};

TimeBase.prototype.hasSecondaryY = function() {
    return (!!this.scales.yScales.secondary);
};

TimeBase.prototype.setDisplayedXScale = function(xScale) {
    this.xScale = xScale;
    this.xAxis.setScale(xScale);
    this.updateTimeRange(xScale);
    this.xAxis.draw(false);
};

TimeBase.prototype.getDisplayedXScale = function() {    
    return this.xScale;
};

// Add a series to the chart.
//   generator actually draws the series.
//   scalename controls which Y scale the series will use.
TimeBase.prototype.add_series = function(generator, xScaleName, yScaleName, options) {
    if (!this.scales.yScales.hasOwnProperty(yScaleName)) {
        throw new Error('cannot add series for unknown scale ' + yScaleName);
    }

    if (!this.scales.xScales.hasOwnProperty(xScaleName)) {
        throw new Error('cannot add series for unknown scale ' + xScaleName);
    }

    options = _.defaults(options, {
        visible: true
    });

    var xScale = this.scales.xScales[xScaleName];
    var yScale = this.scales.yScales[yScaleName];

    generator.setScales(xScale.d3scale, yScale.d3scale);

    var id = this.next_series++;
    var color = options.color;
    var label = options.label || 'Series ' + id;

    // XXX make the choice of whether this should happen explicit in options
    if (generator.set_color) {
        generator.set_color(color);
    }

    var dtopts = _.extend({},this.dtopts);

    if (xScaleName !== 'primary') {
        dtopts.range = new SharedRange(this.ropts);
    }

    if (options.visible) {
        generator.show();
    }
    else {
        generator.hide();
    }
    
    var target = new DataTarget(id, dtopts);
    this.series[id] = {
        label: label,
        id : id,
        generator: generator,
        target: target,
        xScale : xScale,
        visible : options.visible,
        axis : yScale.options.displayOnAxis,
        color: color,
        show_on_legend: options.hasOwnProperty('show_on_legend')
           ? options.show_on_legend : true,
        token: target.on('update', this.onUpdate, this),
        valueFormat: options.valueFormat || yScale.options.tickFormat || DEFAULT_VALUE_FORMAT
    };

    yScale.series.push(this.series[id]);

    return this.series[id];
};

TimeBase.prototype.remove_series = function(seriesId) {
    this.series[seriesId].generator.remove();
    delete(this.series[seriesId]);
};

TimeBase.prototype.hide_series = function(seriesId) {
    this.series[seriesId].generator.hide();
    this.series[seriesId].visible = false;
};

TimeBase.prototype.show_series = function(seriesId) {
    this.series[seriesId].generator.show();
    this.series[seriesId].visible = true;
};

TimeBase.prototype.set_value = function(val) {
    this.dtopts.yfield = val;
};

TimeBase.prototype.updateTimeRange = function(scale) {
    var domainStart = scale.domain()[0];
    var domainEnd = scale.domain()[1];
    this.trigger('updatetime',{
        from: domainStart,
        to: domainEnd
    });
};

// This method is called whenever the time range to be displayed is
// updated.  If there isn't a current animation going it starts a
// new one.  If an animation is currently active, we just store the
// new range in target_range and then a new animation will be started
// when the current one finishes.
TimeBase.prototype._slide = function() {
    if (this.sliding) {
        return;
    }

    var duration = 750;
    var this_update = new Date().getTime();

    if (this._animate) {
        if (this.last_update !== null) {
            duration = Math.min(duration, this_update - this.last_update);
        }
    }
    else {
        duration = 0;
    }

    this.last_update = this_update;
    this.xAxis.setDuration(duration);

    // some heuristics here for the case where we just have a single
    // point (or a small number clustered together).  in that case, we
    // want to pull that point or points toward the beginning of the chart.
    this.scaley = 1.0;
    if ((this.target_range[1] - this.target_range[0]) < 10000) {
        var pad = 10000 - (this.target_range[1] - this.target_range[0]);
        this.scaley += pad/10000;
        
        this.target_range = [
            new Date(this.target_range[0].getTime()),
            new Date(this.target_range[1].getTime() + pad)
        ];
    }

    this.xScale.domain(this.target_range);

    this.updateTimeRange(this.xScale);

    var full_range;
    if (this.current_range === null) {
        full_range = this.target_range;
        this.xAxis.setDuration(0);
    }
    else {
        this.sliding = true;
        var dx = this.xScale(this.target_range[0])
            - this.xScale(this.current_range[0]);
        var scale = (this.target_range[1] - this.target_range[0]) / (this.current_range[1] - this.current_range[0]);

        var self = this;
        var transform = 'translate(' + dx + ',0)'
            + ' scale(' + scale + ',1)';
        this.seriesArea
            .attr('transform', transform)
          .transition().duration(duration).ease('linear')
            .attr('transform', 'translate(0) scale(1,1)')
            .each('end', function() { self._slide_end(); } );
        
        full_range = [ this.current_range[0], this.target_range[1] ];
    }

    this.xAxis.draw();
    
    _.each(this.series, function(series) {
        series.generator.redraw(full_range);
    } );
    this.current_range = this.target_range;
};

TimeBase.prototype._slide_end = function() {
    this.sliding = false;
    if (!_.isEqual(this.current_range, this.target_range)) {
        this._slide();
    }
};

TimeBase.prototype.extendTimeRange = function(t) {
    if (this.time_range.range === null) {
        this.time_range.set_range([t, t]);
    }
    else if (t < this.time_range.range[0]) {
        this.time_range.set_range([t, this.time_range.range[1]]);
    }
    else if (t > this.time_range.range[1]) {
        this.time_range.set_range([this.time_range.range[0], t]);
    }
};

/*
 * XXX explain how updates are applied
 */
TimeBase.prototype._schedule = function() {
    if (this._animate) {
        if (!this.in_transition && this.timer === null) {
            this.timer = setTimeout(_.bind(this.apply_update, this), 100);
        }
    }
    else {
        this.apply_update();
    }

};

TimeBase.prototype._end_transition = function() {
    this.in_transition = false;
    if (_.keys(this.updates).length > 0) {
        this._schedule();
    }
};

TimeBase.prototype.onUpdate = function(event, data) {
    this.updates[data.id] = data;
    this._schedule();
};

TimeBase.prototype.toggleAnimations = function(enabled) {
    this._animate = enabled;
};

TimeBase.prototype.getVisibleSeries = function() {
    return _.chain(this.series)
        .values()
        .where({
            visible: true
        })
        .value();
};

TimeBase.prototype.apply_update = function() {
    var this_update = new Date().getTime();

    if (this._animate) {
        if (this.last_update !== null) {
            var duration = Math.min(750, this_update - this.last_update);
            this.set_duration(duration);
        }
    }
    else {
        this.set_duration(0);
    }

    this.last_update = this_update;
    
    var self = this;
    this.in_transition = true;
    setTimeout(function() { self._end_transition(); }, this.transition_duration);

    this.have_data = true;

    this.timer = null;

    this.updateScales();

    if (this.leftAxis) {
        this.leftAxis.draw();
    }

    if (this.rightAxis) {
        this.rightAxis.draw();
    }

    var full_range = (this.current_range === null)
        ? this.target_range : [ this.current_range[0], this.target_range[1] ];

    _.each(this.series, function(series, id) {
        if (self.updates.hasOwnProperty(id)) {
            series.generator.update({
                data : self.updates[id].data,
                interpolationBreaks : self.updates[id].interpolationBreaks
            }, full_range);
        }
        else {
            if (series.generator.redraw) { series.generator.redraw(full_range); }
        }
    } );

    this.updates = {};

    this.trigger('update');

    this._components.forEach(function(component) {
        component.draw();
    });
    
};

TimeBase.prototype.destroy = function() {
    this.hover_rect.destroy();
};

TimeBase.prototype.updateScales = function() {
    // update each y scale
    var scaley = this.scaley;
    var self = this;

    _.each(this.scales.yScales, function(scale) {
        var yrange = [ scale.options.minValue, scale.options.maxValue ];
        if (yrange[0] === 'auto' || yrange[1] === 'auto') {
            var ranges = scale.series.filter(function(serie) {
                return serie.visible;
            }).map(function(s) {
                return s.target.yDomain;
            });
            var dynamic_range = _.reduce(ranges, function(r1, r2) {
                return (r2 !== null && r2[0] !== undefined && r2[1] !== undefined)
                    ? [ Math.min(r1[0], r2[0]), Math.max(r1[1], r2[1]) ] : r1;
            }, [ 0, 0 ]);
            
            if (yrange[0] === 'auto') { yrange[0] = dynamic_range[0]; }
            if (yrange[1] === 'auto') { yrange[1] = scaley * dynamic_range[1]; }
        }

        if (scale.options.displayOnAxis === 'none') {
            scale.d3scale.domain([yrange[0], yrange[1]]);
        }
        else {
            var num_ticks;
            if (scale.options.displayOnAxis === 'left') {
                num_ticks = self.leftAxis.axis.ticks()[0];
            }
            if (scale.options.displayOnAxis === 'right') {
                num_ticks = self.rightAxis.axis.ticks()[0];
            }
            var tick_values = calculateTickValues(yrange[0], yrange[1], num_ticks);
            if (scale.options.displayOnAxis === 'left') {
                self.leftAxis.axis.tickValues(tick_values);
            }
            if (scale.options.displayOnAxis === 'right') {
                self.rightAxis.axis.tickValues(tick_values);
            }
            scale.d3scale.domain([tick_values[0], tick_values[tick_values.length - 1]]);
        }
    } );
};

module.exports = TimeBase;
