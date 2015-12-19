---
title: file | Juttle Language Reference
---

file 
====

Save the program's output to a JSON file in your browser's downloads
directory.

``` 
view file -filename filename
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-filename` | The file name to use for the output. No path information is supported; the file is saved in the downloads directory configured for your browser.  |  No; the default is 'output.json'

_Example: Emit one point and output it to a local JSON file_

```
{!docs/examples/charts/output_to_file.juttle!}
```

