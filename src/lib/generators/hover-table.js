var d3 = require('d3');

var PLACEHOLDER = '----------';

var HoverTable = function(el, options) {
    if (typeof options === 'undefined' ) {
        options = {};
    }

    this.options = options;

    this.tableContainer = d3.select(el)
        .append('div')
        .attr('class', 'overlay table-container')
        .style('display', 'none')
        .style('margin-top', '-10px');

    this.table = this.tableContainer.append('table')
        .attr('class', 'table table-striped');

    this.tableHead = this.table.append('thead');
    var tableHeaderRow = this.tableHeaderRow = this.tableHead.append('tr');
    tableHeaderRow.append('th').style('width','50%').text('Name');
    tableHeaderRow.append('th').style('width','25%').text('Time');
    tableHeaderRow.append('th').style('width','25%').text('Value');
    this.tableBody = this.table.append('tbody');
};

HoverTable.prototype.show = function() {
    this.tableContainer.style('display', null);
};

HoverTable.prototype.hide = function() {
    this.tableContainer.style('display', 'none');
};

HoverTable.prototype.resize = function(w, h) {
    this.options.width = w;
    this._applyResize();
};

HoverTable.prototype.set_margin = function(margin) {
    this.options.margin = margin;
    this._applyResize();
};

HoverTable.prototype._applyResize = function() {
    var width = this.options.width - (this.options.margin.left + this.options.margin.right);
    this.tableContainer
        .style('margin-left', this.options.margin.left + 'px')
        .style('width', width + 'px');
};

HoverTable.prototype.updateTable = function(datapoints) {
    var self = this;
    datapoints.sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    var rows = this.tableBody.selectAll('tr')
        .data(datapoints);

    rows.enter()
        .append('tr')
        .attr('id', function(d) {
            return d.label || d.name;
        });

    rows.exit().remove('tr');

    var cells = rows.selectAll('td')
        .data(function(row) {
            return [
                {
                    color: row.color,
                    label: row.label || row.name
                },
                row.time === undefined ? PLACEHOLDER : self.options.timeFormat(row.time),
                row.value === undefined ? PLACEHOLDER : row.value
            ];
        });

    cells.enter()
        .append('td');

    cells.each(function(d) {
        var cell = d3.select(this);

        if (d.hasOwnProperty('color')) {
            cell.selectAll('div').remove();
            cell.append('div')
                .attr('class', 'color-box')
                .style('background-color', d3.rgb(d.color));
            cell.append('div')
                .attr('class', 'legend-label')
                .text(d.label);
        } else {
            cell.text(d);
        }
    });
};

module.exports = HoverTable;
