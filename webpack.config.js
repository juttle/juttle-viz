module.exports = {
    output: {
        library: 'JuttleViz',
        libraryTarget: 'umd'
    },
    externals: {
        highcharts: 'Highcharts',
        moment: 'moment'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loaders: ['babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.json$/,
                include: __dirname,
                loader: 'json'
            }
        ]
    }
};
