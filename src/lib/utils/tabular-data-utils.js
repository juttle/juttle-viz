var _ = require('underscore');

module.exports = {
    /**
     * Returns an array of columns for the given data (generated from the keys in the data items).
     * By default, lists time, name, and value first if present.
     * @param  {[type]} data            
     * @param  {[type]} existingColumns Any columns that already exist (and will be listed first)
     * @param  {[type]} columnOrder     If specified, these columns will be listed first, followed by any additional ones seen.
     * @return {[type]}                 [description]
     */
    findColumns : function(data, existingColumns, columnOrder) {
        // columns that should always be listed first, if present in data
        var FIRST_COLUMNS = ['time', 'name', 'value'];

        // mapping keys to data returns an array of arrays, which
        // we pass to union, who takes each array individually as an argument,
        // using apply, since apply takes a context and an array of arguments.
        
        var columns = _.union.apply(_, _.map(data, _.keys));
        
        if (_.isArray(columnOrder)) {
            columns = columnOrder.concat(_.difference(columns, columnOrder));
        }
        else {
            columns.sort();
            // if we haven't seen any columns, check to see if there are time, name, or value
            // fields in the data and move them to the front of the columns
            if (existingColumns.length === 0) {
                var firstColumnsSeen = [];

                FIRST_COLUMNS.forEach(function(firstColumn) {
                    if (_.contains(columns, firstColumn)) {
                        firstColumnsSeen.push(firstColumn);
                    }
                });
                columns = firstColumnsSeen.concat(_.without.apply(null,[columns].concat(firstColumnsSeen)));
            }
            else {
                // append the new columns we find to the end of the columns array
                columns = existingColumns.concat(_.difference(columns,existingColumns).sort());
            } 
        }
        
        return columns;
    }
};
