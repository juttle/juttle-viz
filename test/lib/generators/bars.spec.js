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
                category: 'category',
                value: 'value'
            });
            var xScale = d3.scale.ordinal();
            var yScale = d3.scale.linear();
            this.bars.setScales(xScale, yScale);
        });

        afterEach(function() {
            delete this.bars;
        });

        it('should draw rects correctly', function() {
            var self = this;
            var data = [
                { category: 'a', value: -1 },
                { category: 'b', value: 0 },
                { category: 'c', value: 1 }
            ];
            this.bars.category_scale.domain(['a', 'b', 'c']).rangeBands([0, 800]);
            this.bars.value_scale.domain([-1, 1]).range([200, 0]);
            return this.bars.draw(data)
                .then(function() {
                    var rects = self.bars.el.querySelectorAll('rect.bar');
                    rects.should.be.truthy;
                    rects.length.should.equal(3);
                    parseInt(rects[0].getAttribute('height'), 10).should.be.approximately(100, 2);
                    parseInt(rects[1].getAttribute('height'), 10).should.equal(0, 2);
                    parseInt(rects[2].getAttribute('height'), 10).should.equal(100, 2);
                });

        });

    });

});
