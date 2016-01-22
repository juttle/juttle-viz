require('chai').should();

describe('Bars generator', function() {
    function createBarElement() {
        var container = document.createElement('div');
        var svg = document.createElement('svg');
        container.appendChild(svg);
        var seriesCont = document.createElement('g');
        svg.appendChild(seriesCont);
        var el = document.createElement('g');
        seriesCont.appendChild(el);

        return el;
    }


    var Bars = require('../../../src/lib/generators/bars');
    var d3 = require('d3');

    describe('initialisation', function() {
        beforeEach(function () {
            // create a new svg element
            var el = createBarElement();
            this.bars = new Bars(el, {});
            this.bars.xScale = d3.scale.ordinal();
            this.bars.yScale = d3.scale.linear();
        });

        afterEach(function() {
            delete this.bars;
        });

        it('should create a bars object', function() {
            this.bars.should.exist;
        });

        it('should have an element to operate on', function() {
            this.bars.el.should.exist;
            this.bars.el.should.be.an.instanceof(HTMLElement);
        });

        it('should have a draw function', function() {
            this.bars.should.have.property('draw');
            this.bars.draw.should.be.a.function;
        });

    });

    describe('setting scales', function() {
        it('should set scales and accessor functions', function() {
            this.el = createBarElement();
            this.bars = new Bars(this.el, {});
            var xScale = d3.scale.ordinal();
            var yScale = d3.scale.linear();
            this.bars.setScales(xScale, yScale);
        });
    });

    describe('simple drawing', function() {
        beforeEach(function() {
            this.el = createBarElement();
            this.bars = new Bars(this.el, {
                duration: 0,
                category: 'category'
            });
            var xScale = d3.scale.ordinal();
            var yScale = d3.scale.linear();
            this.bars.setScales(xScale, yScale);
        });

        afterEach(function() {
            delete this.bars;
        });

        it('should draw rects correctly', function() {
            var data = [ { category: 'a', value: 1 },
                         { category: 'b', value: 2 },
                         { category: 'c', value: 3 },
                         { category: 'd', value: 4 } ];
            this.bars.category_scale.domain([0, 1, 2, 3]).rangeBands([0, 800]);
            this.bars.value_scale.domain([0, 4]).range([400, 0]);
            this.bars.draw(data);
            var rects = this.bars.el.querySelectorAll('rect.bar');
            rects.should.be.truthy;
            rects.length.should.equal(4);
        });

    });

});
