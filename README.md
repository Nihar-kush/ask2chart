# Ask2Chart

Ask2Chart is a browser tool for exploring CSV files. It gives you a place to look through the data, make a chart, and check the numbers behind it. Your CSV stays on your device, and saved datasets and dashboards are kept in your browser.

Built with React and TypeScript.

## Features 

- **Explore CSVs.** Open large CSV files in Data Explorer, sort and filter the rows, and resize columns to read longer values.
- **Build charts.** In Chart Studio, choose which columns to group by, what to measure, and which rows to include.
- **AI Assistant.** Ask questions about your CSV in your own words, like “Which product category brought in the most revenue?”
- **Check the results.** Review the result rows, then open **How this was calculated** to see the grouping, filters, and SQL behind the chart.
- **Save and export.** Pin charts to a dashboard, download a chart as a PNG, or export the result rows as a CSV.

## Run locally

With Node.js 24 installed, run these commands from the project folder.

```sh
npm ci
npm run dev
```

To make a production build, run `npm run build`.
