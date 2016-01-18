var JuttleViz = require("../lib");

var Text = JuttleViz.Text;

var text = new Text({});

var textData = [
    { time: new Date(), host: "hostA"}
];

document.querySelector("#text").appendChild(text.visuals[0]);

text.consume(textData);



var Table = JuttleViz.Table;

var table = new Table({});

var tableData = [
    { time: new Date(), host: "hostA"},
    { time: new Date(), host: "hostB"},
    { time: new Date(), host: "hostC"}
];

document.querySelector("#table").appendChild(table.visuals[0]);

table.consume(tableData);



var Timechart = JuttleViz.Timechart;

var timechart = new Timechart({
  juttleEnv: {
    now: new Date()
  },
  params: {
      title: "has a title!",
      duration: "50s"
  }
});

document.querySelector("#timechart").appendChild(timechart.visuals[0]);

timechart.setDimensions(null, document.body.clientWidth, 500);

var timechartData = [
    {time: new Date(1000), host: 'A', value: 1},
    {time: new Date(2000), host: 'A', value: 2},
    {time: new Date(3000), host: 'A', value: 3},
    {time: new Date(3000), host: 'B', value: 8},
    {time: new Date(4000), host: 'A', value: 4},
    {time: new Date(4000), host: 'B', value: 9},
    {time: new Date(5000), host: 'A', value: 5},
    {time: new Date(5000), host: 'B', value: 7},
];

timechart.consume(timechartData);

var timechartWithLast = new Timechart({
  juttleEnv: {
    now: new Date()
  },
  _jut_time_bounds: [{
      last: "20m"
  }],
  params: {
      id: "timechart1",
      markerSize: 10
  }
});

document.querySelector("#timechartWithLast").appendChild(timechartWithLast.visuals[0]);

timechartWithLast.setDimensions(null, document.body.clientWidth, 500);

var timechartWithLastData = [
    {time: new Date(Date.now() - 10000), name: "what", host: 'A', value: 1}
];

timechartWithLast.consume(timechartWithLastData);
timechartWithLast.consume_eof();

var Events = JuttleViz.Events;

var events = new Events({
  juttleEnv: {
    now: new Date()
  },
  _jut_time_bounds: [{
      last: "20m"
  }],
  params: {
      on: "timechart1",
      messageField: "message",
      nameField: "name"
  }
}, [timechartWithLast]);

var eventData = [
    {time: new Date(Date.now() - 50000), name: 'event 1', message: 'event 1 message'},
    {time: new Date(Date.now() - 20000), name: 'event 2', message: 'event 2 message'}
];

events.consume(eventData);
events.consume_eof();




var timechartWithTimerangeOverlay = new Timechart({
  juttleEnv: {
    now: new Date()
  },
  params: {
      title: "has a title!",
      duration: "2m",
      overlayTime: true
  }
});

document.querySelector("#timechartWithTimerangeOverlay").appendChild(timechartWithTimerangeOverlay.visuals[0]);

timechartWithTimerangeOverlay.setDimensions(null, document.body.clientWidth, 500);

var now = Date.now();
var timechartWithTimerangeOverlayData = [
    {time: new Date(now - 10 * 60 * 1000), value: 1},
    {time: new Date(now - 8 * 60 * 1000), value: 2},
    {time: new Date(now - 6 * 60 * 1000), value: 3},
    {time: new Date(now - 4 * 60 * 1000), value: 4}
];

console.log(JSON.stringify(timechartWithTimerangeOverlayData, null, 2));

timechartWithTimerangeOverlay.consume(timechartWithTimerangeOverlayData);

var TimechartVisjs = JuttleViz.TimechartVisjs;

var timechartVisjs = new TimechartVisjs({
  juttleEnv: {
    now: new Date()
  },
  params: {
      title: "has a title!"
  }
});

document.querySelector("#timechart-visjs").appendChild(timechartVisjs.visuals[0]);

timechartVisjs.consume(timechartData);

timechartVisjs.consume_eof();



var timechartWithRuntimeMessage = new Timechart({
  juttleEnv: {
    now: new Date()
  },
  _jut_time_bounds: [{
      last: "20m"
  }],
  params: {
      valueField: "<b>value</b>"
  }
});

document.querySelector("#timechartWithRuntimeMessage").appendChild(timechartWithRuntimeMessage.visuals[0]);

timechartWithRuntimeMessage.setDimensions(null, document.body.clientWidth, 500);

var timechartWithRuntimeMessageData = [
    {time: new Date(Date.now() - 10000), host: 'A', "<b>value</b>": 'A'}
];

timechartWithRuntimeMessage.consume(timechartWithRuntimeMessageData);
timechartWithRuntimeMessage.consume_eof();



var timechartWithRuntimeMessage = new Timechart({
  juttleEnv: {
    now: new Date()
  },
  _jut_time_bounds: [{
      last: "20m"
  }],
  params: {
      valueField: "<b>value</b>"
  }
});

document.querySelector("#timechartWithRuntimeMessage").appendChild(timechartWithRuntimeMessage.visuals[0]);

timechartWithRuntimeMessage.setDimensions(null, document.body.clientWidth, 500);

var timechartWithRuntimeMessageData = [
    {time: new Date(Date.now() - 10000), host: 'A', "<b>value</b>": 'A'}
];

timechartWithRuntimeMessage.consume(timechartWithRuntimeMessageData);
timechartWithRuntimeMessage.consume_eof();



try {
    var timechartWithParamError = new Timechart({
      juttleEnv: {
        now: new Date()
      },
      _jut_time_bounds: [{
          last: "20m"
      }],
      params: {
          valueField: 10,
          someUnknownField: 20
      }
    });
} catch(e) {
    console.log(e);
}


var Barchart = JuttleViz.Barchart;

var barchart = new Barchart({
  juttleEnv: {
    now: new Date()
  },
  params: {
      color: "green",
      negativeColor: "pink"
  }
});

document.querySelector("#barchart").appendChild(barchart.visuals[0]);

barchart.setDimensions(null, 800, 500);

var barchartData = [
    {time: new Date(1000), host: "HOST A", value: 1},
    {time: new Date(1000), host: "HOST B", value: -2},
];

barchart.consume(barchartData);



var Piechart = JuttleViz.Piechart;

var piechart = new Piechart({
  juttleEnv: {
    now: new Date()
  }
});

document.querySelector("#piechart").appendChild(piechart.visuals[0]);

piechart.setDimensions(null, 800, 500);

var piechartData = [
    {time: new Date(1000), host: "HOST A", value: 1},
    {time: new Date(1000), host: "HOST B", value: 2},
];

piechart.consume(piechartData);



var Scatterchart = JuttleViz.Scatterchart;

var scatterchart = new Scatterchart({
  juttleEnv: {
    now: new Date()
  }
});

document.querySelector("#scatterchart").appendChild(scatterchart.visuals[0]);

scatterchart.setDimensions(null, 800, 500);

var scatterchartData = [
    {time: new Date(1000), host: "HOST A", x: 1, y: 1},
    {time: new Date(1000), host: "HOST B", x: 2, y: 2},
];

scatterchart.consume(scatterchartData);

var Less = JuttleViz.Less;

var less = new Less({
  juttleEnv: {
    now: new Date()
  }
});

document.querySelector("#less").appendChild(less.visuals[0]);

less.setDimensions(null, 800, 500);

var lessData = [
    {time: new Date(1000), message: "this is the first line"},
    {time: new Date(1000), message: "this is the second line"}
];

less.consume(lessData);


var Tile = JuttleViz.Tile;

var tile = new Tile({
    juttleEnv: {
        now: new Date()
    },
    params: {
        levelField: 'level'
    }
});

document.querySelector("#tile").appendChild(tile.visuals[0]);

tile.setDimensions(null, 800, 500);

var tileData = [
    {time: new Date(1000), value: 100, level: 'warning'}
];

tile.consume(tileData);


var File = JuttleViz.File;

var file = new File({
  juttleEnv: {
    now: new Date()
  }
});

document.querySelector("#file").appendChild(file.visuals[0]);

//   file.setDimensions(null, 800, 500);

var fileData = [
    {time: new Date(1000), value: 100}
];

file.consume(fileData);
file.consume_eof();
