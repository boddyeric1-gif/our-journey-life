## Resubmit sitemap to Google Search Console

Use the Search Console API via the connector gateway to:

1. **Resubmit the sitemap** — `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` for `https://our-journey.life/sitemap.xml`. This re-queues Google to fetch and re-process it.
2. **Check sitemap status** — `GET /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` to read back `lastSubmitted`, `lastDownloaded`, `isPending`, `warnings`, `errors`, and per-content-type counts (submitted vs indexed).
3. **Spot-check indexing** — run `POST /v1/urlInspection/index:inspect` on the homepage `https://our-journey.life/` to confirm Google sees it as indexable and report coverage state.
4. **Report results** — surface submitted/indexed counts, any warnings or errors, and the homepage inspection verdict. Note that Google's indexing is asynchronous; full re-crawl can take days.

No code changes — this is purely an API operation against the connected Search Console.
