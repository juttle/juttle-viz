var d3 = require('d3');
var _ = require('underscore');
// a simple colour scale with
// jut's colors for the charts


var colorMappings = [
    {
        name: 'orange',
        value: '#D87118'
    },
    {
        name: 'blue',
        value: '#4E8DB8'
    },
    {
        name: 'yellow',
        value: '#FED66F'
    },
    {
        name: 'aqua',
        value: '#79E0CB'
    },
    {
        name: 'green',
        value: '#A4B946'
    },
    {
        name: 'pink',
        value: '#EB91C0'
    },
    {
        name: 'olive',
        value: '#666E4C'
    },
    {
        name: 'purple',
        value: '#8A406D'
    },
    {
        name: 'red',
        value: '#CC2200'
    }
];

var jutColors = _.pluck(colorMappings, 'value');

// no need to specify the domain if you give
// an explicit range :)
module.exports = { 
    getColorScale: function() {return d3.scale.ordinal()
            .range(jutColors);},
    getColorMappings: function() {return colorMappings;}
};    
