module.exports = {
    // core src/views
    Text: require('./src/views/text'),
    Table: require('./src/views/table'),
    Timechart: require('./src/views/timechart'),
    Barchart: require('./src/views/barchart'),
    Piechart: require('./src/views/piechart'),
    Scatterchart: require('./src/views/scatterchart'),
    Less: require('./src/views/logexplorer'),
    Tile: require('./src/views/tile'),
    File: require('./src/views/file'),
    Events: require('./src/views/events'),
    // prototypes
    TimechartVisjs: require('./src/prototype-views/timechart-visjs')
};
