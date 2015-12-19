var Timestamp = require('../generators/timestamp');
var _ = require('underscore');
var $ = require('jquery');
var d3 = require('d3');

function Tile(attributes) {
    this.el = document.createElement('div');
    this._attributes = attributes;
}

Tile.prototype.consume = function(points) {
    var lastPoint = _.last(points);
    this.render(lastPoint[this._attributes.valueField], lastPoint[this._attributes.timeField], lastPoint[this._attributes.levelField]);
};

Tile.prototype.render = function(value, timestamp, level) {
    var $el = $(this.el);

    $el.addClass('chart metric');
    this._setLevel($el, level);
    this._renderIcon($el, level);
    this._renderMetric($el, value);

    if (!this.timestamp) {
        this.timestamp = new Timestamp($el);
    }
    this._renderTimestamp(timestamp);
};

Tile.prototype._renderIcon = function($el, level) {
    var icon = $el.find('.icon');

    if (icon.length === 0) {
        icon = $('<i/>');
        icon.addClass('icon fa ji-alert-success pull-right');
        $el.append(icon);
    }

    if (level === 'warning') {
        icon.removeClass('ji-alert-success ji-alert-danger');
        icon.addClass('ji-alert-warning');
    } else if (level === 'error') {
        icon.removeClass('ji-alert-warning ji-alert-success');
        icon.addClass('ji-alert-danger');
    } else {
        icon.removeClass('ji-alert-danger ji-alert-warning');
        icon.addClass('ji-alert-success');
    }
};

Tile.prototype._renderTimestamp = function(timestamp) {
    this.timestamp.update(timestamp);
};

Tile.prototype._setLevel = function($el, level) {
    if (level === 'warning') {
        $el.removeClass('ok success error');
    } else if (level === 'error') {
        $el.removeClass('ok success warning');
    } else if (level === 'success') {
        $el.removeClass('ok warning error');
    } else {
        $el.removeClass('success warning error');
        level = 'ok';
    }

    $el.addClass(level);
};

Tile.prototype._renderMetric = function($el, value) {
    var metric = $el.find('.value');
    var formatString = this._attributes.valueFormat;
    var valueEl, formatted, unit;

    if (metric.length === 0) {
        metric = $('<div/>');
        metric.addClass('value');

        valueEl = $('<span/>');
        valueEl.addClass('data');

        if (formatString) {
            //test to see if we're formatting percentages since we need to alter the UI in this case
            if (formatString.indexOf('%') > -1 || formatString.indexOf('p') > -1) {
                unit = $('<span/>');
                unit.addClass('metric-unit');
                unit.append('%');
            }
        }

        metric.append(valueEl);
        metric.append(unit);

        $el.append(metric);
    } else {
        valueEl = metric.find('.data');
    }

    if (!value && value !== 0) {
        valueEl.text('-');
    } else if (formatString) {
        //test to see if we're formatting percentages since we need to alter the UI in this case
        if (formatString.indexOf('%') > -1 || formatString.indexOf('p') > -1) {
            formatted = d3.format(formatString)(value).replace('%', '');

        } else {
            formatted = d3.format(formatString)(value);
        }

        valueEl.text(formatted);
    } else {
        valueEl.text(value);
    }
};

module.exports = Tile;
