var _ = require('underscore');
var d3 = require('d3');
var tabularDataUtils = require('../utils/tabular-data-utils');
var d3Formatters = require('../utils/d3-formatters');
var Backbone = require('backbone');
var marked = require('marked');

var HOVER_TIMER = 600;
// initialise the table
// and create some scaffolding
var Table = function(element, options) {
    _.extend(this, Backbone.Events);

    var defaults = require('../utils/default-options')();
    // set to be an object in case
    // it's undefined
    options = options || {};

    // extend the defaults
    options = _.extend(defaults, options);

    this.options = options;

    this._currentColumns = [];

    this.container = element;

    this.innerContainer = document.createElement('div');
    this.innerContainer.classList.add('inner-container');
    this.innerContainer.classList.add('hide-overflow');

    this.el = document.createElement('table');
    this.el.classList.add('table');
    this.el.classList.add('table-striped');
    this.container.classList.add('table-sink-container');
    this.innerContainer.appendChild(this.el);
    this.container.appendChild(this.innerContainer);

    this.innerContainer.style.maxHeight = options.height + 'px';

    this.resize();

    // create some scaffolding
    this.table = d3.select(this.el);
    this.thead = this.table.append('thead');
    this.tbody = this.table.append('tbody');

    // set if we should append to the existing table data
    // and not reset on batch_end
    this._append = options._append;

    this._markdownFields = this.options.markdownFields || [];

    this._bindScrollBlocker();

    // We don't need a fully-fledged data target here,
    // so we just add functions as per feedback from @demmer
    var self = this;
    this.dataTarget = {
        _data: [],
        push: function(data) {
            // clear the table if we've done batch_end / stream_end before
            if (this._data.length === 0) {
                self.clearTable();
            }

            // limit the data to avoid crashing the browser. If limit
            // is zero, then it is ignored. If the limit has been reached,
            // we return early and don't display the new data

            // check that we aren't already over the limit
            if (this._data.length >= self.options.limit) {

                // display the message and don't do anything else
                self._sendRowLimitReachedMessage();
                return;

            // check that the new data won't make us go over the limit
            } else if ((this._data.length + data.length) > self.options.limit) {

                self._sendRowLimitReachedMessage();

                // just add from new data until we get to the limit
                var i = 0;
                while (this._data.length < self.options.limit) {
                    this._data.push(data[i++]);
                }
            }
            // we're fine.
            else {
                self._clearRowLimitReachedMessage();
                this._data = this._data.concat(data);
            }

            // if you got here, draw the table
            self.onData(this._data);

        },
        batch_end: function() {
            if (self.options.update === 'replace') {
                this._data = [];
            }
        },
        stream_end: function() {
        }
    };

};

Table.prototype._bindScrollBlocker = function() {
    // stop scrolling if the table isnt focused or hovered over
    var self = this;
    this.table.on('mouseup', function setFocused() {
        self.innerContainer.classList.remove('hide-overflow');
    });

    if (this.container.parentNode) {

        this.container.parentNode.addEventListener('mouseenter', function startHoverTimer() {
            self.hoverTimer = setTimeout(function enableScroll() {
                self.innerContainer.classList.remove('hide-overflow');
            }, HOVER_TIMER);
        });

        this.container.parentNode.addEventListener('mouseleave', function stopHoverTimer() {
            clearTimeout(self.hoverTimer);
            self.innerContainer.classList.add('hide-overflow');
        });

        this.innerContainer.addEventListener('scroll', function scrollHeader(e) {
            self.thead.selectAll('div').style({'margin-left': '-' + e.target.scrollLeft + 'px'});
        });
    }
};

Table.prototype._findColumns = function(data) {
    this._currentColumns = tabularDataUtils.findColumns(data, this._currentColumns, this.options.columnOrder);
    return this._currentColumns;
};

Table.prototype._sendRowLimitReachedMessage = function() {
    var self = this;
    if (!self.rowLimitReachedMessage) {
        self.rowLimitReachedMessage = new Backbone.Model({
            code : 'TABLE_ROW_LIMIT_REACHED',
            info : {
                rowLimit : self.options.limit
            }
        });
    }

    self.trigger('addRuntimeMessage', self.rowLimitReachedMessage);
};

Table.prototype._clearRowLimitReachedMessage = function() {
    var self = this;
    if (self.rowLimitReachedMessage) {
        self.trigger('removeRuntimeMessage', self.rowLimitReachedMessage);
        self.rowLimitReachedMessage = null;
    }
};

// clear the table
Table.prototype.clearTable = function() {

    this.thead.selectAll('tr').remove();
    this.tbody.selectAll('tr').remove();

};

Table.prototype.resize = function() {
    this.el.style.minWidth = (this.options.width - 50) + 'px';
};

// receives the data, then draws the table;
Table.prototype.onData = function(data) {
    var columns = this._findColumns(data);

    this.draw(columns, data);
};

Table.prototype.draw = function(columns, data) {
    var self = this;

    var headerRow = this.thead.selectAll('tr')
        .data([columns]);

    headerRow.enter()
        .append('tr');

    var theadCells = headerRow
        .selectAll('th')
        .data(function(d) {
            return d;
        });

    theadCells.enter()
        .append('th');

    theadCells
        .text(function(column) {
            return ' ' + column + ' ';
        })
        .append('div')
        .text(function(d) {
            return d; // secondary fake header to float on top.
        });

    var rows = this.tbody.selectAll('tr')
        .data(data);

    rows.enter()
        .append('tr');

    rows.exit()
        .remove();

    var cells = rows.selectAll('td')
        .data(function(row) {
            return columns.map(function(column) {
                if (self._markdownFields.indexOf(column) !== -1) {
                    return {content: marked(row[column]), type: 'markup'};
                }
                return {content: row[column], type: 'text'};
            });
        });

    cells
        .enter()
        .append('td');

    var dateFormatter;
    if (this.options.dateFormat) {
        dateFormatter = d3.time.format.utc(this.options.dateFormat);
    } else {
        dateFormatter = d3Formatters.timeUTC;
    }

    cells.filter(function(cell) {
        return cell.type === 'markup';
    }).html(function(d) {
        return d.content;
    });

    cells.filter(function(cell) {
        return cell.type === 'text';
    }).text(function(d) {
        if (_.isDate(d.content)) {
            return dateFormatter(d.content);
        } else {
            return d.content;
        }
    });
};


module.exports = Table;
