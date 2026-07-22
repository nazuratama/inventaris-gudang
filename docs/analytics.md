# Analytics

Analytics runs entirely on localhost against SQLite and uses the bundled Apache
ECharts asset. No analytics data is sent to an external service.

Final charts:

1. Highest–Lowest Incoming and Outgoing Items
2. Incoming and Outgoing Stock Trend
3. Stock Composition by Category
4. Stock Composition by Location
5. Fast- and Slow-Moving Items
6. Stock Hierarchy Map
7. Movement by Category
8. Daily Activity Heatmap
9. Stock Risk Status Funnel
10. Current Stock vs Minimum
11. Outgoing Item Pareto
12. Monthly Net Flow
13. Stock Health Index

Settings control visibility, ordering, the featured chart, date range,
aggregation, labels, chart height, animation, stock thresholds, caching, and
exports. Drill-down uses only products, categories, and locations; suppliers,
batches, and expiration risk are not part of the final product.

The Trend chart imports the shared date formatter from the formatting module
instead of relying on a global function. Failed requests render a retryable
error state rather than stopping the Analytics or Dashboard page.
