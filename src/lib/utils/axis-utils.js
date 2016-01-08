var d3 = require('d3');
var _ = require('underscore');

var _fmt_e = d3.format('e');
var _fmt_s = d3.format('s');
function default_format(n) {
    if (_.isString(n)) { return n; }

    var absN = Math.abs(n);
    if (absN === 0) {
        return '0';
    }
    else if (absN < 0.001) {
        return _fmt_e(n);
    }
    else if (absN < 1000) {
        return n.toString();
    }
    else {
        return _fmt_s(n);
    }
}

var defaultTimeFormat = d3.time.format.utc.multi([
        [".%L", function(d) { return d.getUTCMilliseconds(); }],
        [":%S", function(d) { return d.getUTCSeconds(); }],
        ["%H:%M", function(d) { return d.getUTCMinutes() && d.getUTCMinutes() !== 0; }],
        ["%H:00", function(d) { return d.getUTCHours() && d.getUTCHours() !== 0; }],
        ["%a %d", function(d) { return d.getUTCDate() !== 1; }],
        ["%B", function(d) { return d.getUTCMonth() && d.getUTCMonth() !== 0; }],
        ["%Y", function(d) { return true; }]
]);

function calculateTickValues(min, max, ticks) {
    var neg_ticks;
    if (min < 0 && max > 0) {
        var pos_ticks = _tickValues(0, max, ticks/2);
        neg_ticks = _tickValues(0, min*-1, ticks/2);
        var pos_step = pos_ticks[1] - pos_ticks[0];
        var neg_step = neg_ticks[1] - neg_ticks[0];
        var actual_step = pos_step > neg_step ? pos_step : neg_step;
        var actual_start = Math.floor(min / actual_step) * actual_step;
        var actual_stop = Math.ceil(max / actual_step) * actual_step;
        return calculateRange(actual_start, actual_stop, actual_step);
    }
    if (min < 0 && max === 0) {
        neg_ticks = _tickValues(0, min*-1, ticks);
        neg_ticks.reverse();
        return _.map(neg_ticks, function(x) { return x*-1; });
    }
    return _tickValues(min, max, ticks);

}

function _tickValues(min, max, ticks) {
    var extent = [min, max], 
        span = extent[1] - extent[0], 
        step = Math.pow(10, Math.floor(Math.log(span / ticks) / Math.LN10)), 
        // This figures out what power of 10 we want the step to be
        err = ticks / span * step;

    if (step === 0) {
        step = 1;
    }

    // err determines if we want 2x, 5x, or 10x of step for the actual step
    // i.e. for a range of 0 to 160, and 8 ticks we want steps of 20, not 10

    if (err <= 0.15) { step *= 10; } 
    else if (err <= 0.35) { step *= 5; }
    else if (err <= 0.75) { step *= 2; }

    extent[0] = Math.ceil(extent[0] / step) * step;
    extent[1] = Math.floor(extent[1] / step) * step;
    // we pad the values by step * 1.5 so that the highest tick is always
    // greater than the highest value in the chart
    if (max > 0 && max % step !== 0) {
        extent[1] = extent[1] + step * 1.5;
    }
    if (min < 0 && min % step !== 0) {
        extent[0] = extent[0] - step * 1.5;
    }

    if (max > 0 && extent[1] === max) {
        extent[1] += step * 0.6;
    }

    if (min < 0 && min === extent[0]) {
        extent[0] = extent[0] - step * 0.5;
    }

    if (extent[0] === extent[1]) {
        if (extent[0] < 0) {
            extent[0] -= step*ticks;
        }
        else {
            extent[1] += step*ticks;
        }
    }
    return calculateRange(extent[0], extent[1], step);
}


function calculateRange(start, stop, step) { 
    /*
       This function makes sure the tick values do not have
       a lot of leading decimals.
       */
    if ((stop - start) / step === Infinity) {
        throw new Error("infinite range");
    }
    var range = [],
        k = integerScale(Math.abs(step)),
        i = -1,
        j;
    // k is a factor of 10 that everything is multiplied by
    // so that we do not have floating point issues
    start *= k;
    stop *= k;
    step *= k;
    if (step < 0) {
        while ((j = start + step * ++i) >= stop) {
            range.push(j / k);
        }
    }
    else {
        while ((j = start + step * ++i) <= stop) {
            range.push(j / k);
        }
    }
    if (range.length > 8 && range[range.length - 1] % (step * 2) === 0) {
        range = calculateRange(range[0], range[range.length - 1], step*2);
    }
    return range;
}

function integerScale(x) {
    var k = 1;
    while (x * k % 1) { k *= 10; }
    return k;
}

module.exports = {
    calculateTickValues : calculateTickValues,
    getDefaultTickFormat : function() {
        return default_format;
    },
    getDefaultTimeFormat: function() {
        return defaultTimeFormat;
    }
};
