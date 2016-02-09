# Juttle Visualization Library

JuttleViz is the chart library used by [Juttle Engine](http://www.github.com/juttle/juttle-engine) to render the visual outputs of [Juttle](http://www.github.com/juttle/juttle) programs.

## Basic Usage
To use use one of these visualizations in your Juttle, use the `view` keyword followed by a particular view name.

```
... | view <view> [view-parameters]
```

If your program doesn't specify an output, the default is `view table`.

## Available Views
View | Description | Image
---- | ----------- | -----
[barchart](charts/barchart.md) | Display the output as vertical or horizontal bars for comparing different categories of data. | ![screenshot](images/screenshots/thumbnail/view_barchart.png "barchart screenshot")
[events](charts/events.md) | Overlay events as markers on top of a time chart.  | ![screenshot](images/screenshots/thumbnail/view_events.png "events screenshot")
[file](charts/file.md) | Not a visual view. Download the data to a local file. | N/A
[less](charts/less.md) | Navigate the data in a manner similar to the UNIX `less` command. | ![screenshot](images/screenshots/thumbnail/view_less.png "less screenshot")
[text](charts/text.md) | Display the output in raw text, CSV or JSON format. | ![screenshot](images/screenshots/thumbnail/view_text.png "text screenshot")
[piechart](charts/piechart.md) | Render data as a pie or donut chart. | ![screenshot](images/screenshots/thumbnail/view_piechart.png "piechart screenshot")
[scatterchart](charts/scatterchart.md) | Plot data points as individual dots across two axes sourced from the data fields. | ![screenshot](images/screenshots/thumbnail/view_scatterchart.png "scatterchart screenshot")
[table](charts/table.md) | Display the output as text in rows and columns. This is the default output if no other is specified. | ![screenshot](images/screenshots/thumbnail/view_table.png "table screenshot")
[tile](charts/tile.md) | Render a metric tile displaying exactly one value.  | ![screenshot](images/screenshots/thumbnail/view_tile3.png "tile screenshot")
[timechart](charts/timechart.md) | Create a time series chart. Time charts support multiple series and can be combined with `view events`  | ![screenshot](images/screenshots/thumbnail/view_timechart.png "timechart screenshot")

## Controlling Layout
A program can have multiple view sinks. You can customize the positioning of a particular view by passing `-row` and `-col` parameters to each sink.

For example, if you wanted to layout 4 tables in a 2x2 grid, the juttle would be
```
emit -limit 1
| (
  view table -title 'upper left' -row 1 -col 1;
  view table -title 'upper right' -row 1 -col 2;
  view table -title 'lower left' -row 2 -col 2;
  view table -title 'lower right' -row 2 -col 2;
)
```

## Defining View Parameters

Parameters for a view can be specified individually,
or as object literals using the `-options` parameter (`-o` for short).

Individually specified parameters are shown in the syntax reference for each view.
A simple example with individual parameters looks like this:

```
... | view barchart
        -title "CPU usage"
        -value value
```

The example above can also be expressed with object literals like this:

```
... | view barchart -options { title: "CPU usage", value: value }
```

The two formats can also be combined, like this:

```
... | view barchart
        -title "CPU usage"
        -o { value: value }
```

If you've worked with JavaScript, the `-options` method will look familiar. It
provides additional flexibility by allowing you to store parameters as
vars or consts, like this:

```
const timechartOptions = {
title: 'Average CPU Usage'
};
... | view timechart -options timechartOptions
```

They can also be defined in a module and referenced in another program:

```
// module "standards"
export const cpu_chart_params = {
  series: [ { field: 'cpu', color: 'blue', label: 'cpu usage', unit: 'percent' } ],
  ...
};

// main program:
import "standards" as standards;
... | view timechart
        -options standards.cpu_chart_params
        -title "cpu usage"
```

:information_source: `Note:` If a parameter is specified more
than once, the last instance overrides any previous instances. For
example, both of these imaginary programs produce a time chart whose
title is "the real title":

```
... | view timechart
        -title "ignored"
        -o { title: "the real title" }
... | view timechart
        -o { title: "not the title" }
        -title "the real title"
```
