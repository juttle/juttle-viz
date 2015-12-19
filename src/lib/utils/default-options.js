// some simple default options to be shared accross objects
// you can change this to better suit your needs.
// it is a function, to get a fresh copy every time and avoid
// scope issues
module.exports = function() {
    return {
        width: 800,
        height: 400,
        margin: {
            top: 20,
            bottom: 0,
            left: 0,
            right: 0
        },
        xAccessor: function(d, i) {
            return i;
        },
        yAccessor: function(d, i) {
            return d;
        },
        categoryAccessor: function(d, i) {
            return i;
        },
        valueAccessor: function(d, i) {
            return d;
        },
        typeAccessor: function(d) {
            return d.type;
        },
        textAccessor: function(d) {
            return d.text;
        },
        titleAccessor: function(d) {
            return d.title;
        },
        colorAccessor: function(d, i) {
            return d.color;
        },
        orientation: 'vertical',
        yAxisOrientation: 'left',
        xAxisOrientation: 'bottom',
        yFromZero: true,
        drawYGrid: true,
        duration: 200,
        padding: 0
    };
};
