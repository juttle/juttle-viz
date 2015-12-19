/*jslint browser: true */

require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

var EventMarkers = require('./event-markers');
var d3 = require('d3');
var $ = require('jquery');

describe("Event marker generator", function() {
    it('hover correctly turned on and off', function() {
        var el = document.createElement('div');
        var eventMarkersView = new EventMarkers(el, {
            xfield : 'time',
            width : 400,
            height : 400,
            margin : {
                top : 0,
                bottom : 0,
                left : 0,
                right : 0,
            }
        });

        var domain = [new Date(0),new Date(10000)];
        var range = [0,400];

        eventMarkersView.setScales(d3.scale.linear().domain(domain).range(range));

        var data = [
            {
                time : new Date(0)
            },
            {
                time : new Date(1000)
            },
            {
                time : new Date(2000)
            },
        ];

        eventMarkersView.update({ data : data },domain);

        eventMarkersView.hover_on(data[0]);
        $(el).find('g.event-marker.hover').length.should.eql(1);
        eventMarkersView.hover_on(data[1]);
        $(el).find('g.event-marker.hover').length.should.eql(1);
        eventMarkersView.hover_off();
        $(el).find('g.event-marker.hover').length.should.eql(0);
    });
});