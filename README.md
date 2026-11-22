# Ask2Chart

Ask2Chart is a browser tool for exploring CSV files. It gives you a place to look through the data, make a chart, and check the numbers behind it. Your CSV stays on your device, and saved datasets and dashboards are kept in your browser.

Built with React and TypeScript.

## Features

- Open a CSV in **Data Explorer**. Sort the rows, filter by a column, or resize columns to read longer values.
- Build a chart in **Chart Studio** by choosing what to group, measure, and filter.
- Ask the **Assistant** a question in your own words, like “Which product category brought in the most revenue?”
- Open **How this was calculated** to see the grouping, filters, and SQL behind a chart.
- Pin charts to a dashboard, download a chart as a PNG, or export the result rows as a CSV.

## Run locally

With Node.js 24 installed, run these commands from the project folder.

```sh
npm ci
npm run dev
```

To make a production build, run `npm run build`.
