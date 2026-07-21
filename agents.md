# Investment Management Frontend - Agents Context

This document serves as a memory and context file for any AI agents working on this project. It outlines the architecture, data sources, user preferences, and features built into the **Fund Opportunities Dashboard**.

## Tech Stack
*   **Frontend Framework**: React (built with Vite)
*   **Styling**: Pure vanilla CSS (`App.css`) with premium dark mode aesthetics (glassmorphism, tailored accent colors: emerald for profits/discounts, crimson for losses/premiums).
*   **Backend/Database**: Supabase (PostgreSQL + Edge Functions).
*   **Client Library**: `@supabase/supabase-js`.

## Data Architecture
The dashboard aggregates data in-memory from four primary Supabase sources:
1.  **`view_mf_summary_analytics`**: Provides the base universe of mutual funds, including symbols (`MF`), `adjusted_nav`, `discount_premium_adjusted`, and `mf_ltp`.
2.  **`raw_marketdepth_nepseapi_new`**: Contains the raw, live market depth JSON arrays (`buy_market_depth` and `sell_market_depth`) scraped by Edge Functions. We parse these arrays on the frontend to extract `highestBid`, `highestBidQty`, `lowestAsk`, and `lowestAskQty`.
3.  **`wiki_profit_loss_analysis`**: Contains portfolio data like `quantity`, `wacc_rate`, `overall_profit_loss_percent`, `overall_profit_loss_amount`, and `updated_at` (used for the global "Last synced" timestamp).
4.  **`wiki_average`**: Provides historical 5-day moving averages (`vwap_avg_5d` and `volume_avg_5d`).

*Important Data Join Rule*: Symbols are matched by aggressively normalizing strings using `.trim().toUpperCase()` to prevent mismatches caused by trailing spaces in different tables.

## Key Features
*   **Dynamic Tabs**: 
    *   **Buy Opportunities**: Focused on funds with steep discounts. Filterable by `Max Discount`.
    *   **Sell & Portfolio**: Focused on currently held funds. Filterable by `Min P/L %` and `Min Quantity`. Provides custom insights (My WACC, Market Bid, Est. Profit).
    *   **Settings**: Controls for Edge Functions.
*   **TMS Integration**: Generates dynamic URLs to Nepse TMS (`https://tms43.nepsetms.com.np/tms/me/memberclientorderentry...`) pre-filled with the symbol, transaction type (Buy/Sell), quantity (default 1000 for Buy, actual holding for Sell), and exact order book prices.
*   **Edge Function Sync**: 
    *   The `sync-market-depth` Edge Function can be triggered manually from the UI or on an automated schedule (e.g., every 1/5/15 minutes) using `setInterval` in `App.jsx`.
    *   *Critical Note*: The Edge Function must explicitly handle `OPTIONS` requests and return CORS headers, or the browser will block the `POST` request.
*   **Persistent Preferences**: All user filters, sort preferences, and auto-sync intervals are saved in `localStorage`.
*   **Timezone**: All dates are forced to Nepali time (`Asia/Kathmandu`, GMT+05:45).

## Design Rules (User Preferences)
*   **Do not use placeholders**: Always use real data or write logic to handle missing data gracefully.
*   **Currency**: Use `Rs.` instead of `$`.
*   **Layout**: Keep it single-column (`1fr`) on the web for density and ease of reading.
*   **Code Structure**: Avoid Tailwind CSS. Use clean, scoped CSS in `App.css`.

## Common Issues & Troubleshooting
1.  **"Failed to send a request to the Edge Function"**: This is almost always a CORS error. Ensure the Deno Edge function returns `Access-Control-Allow-Origin: *` for `OPTIONS` requests.
2.  **Missing Market Depth Data**: If the UI shows `Rs. 0.00` and `-` quantities, the `raw_marketdepth_nepseapi_new` table likely doesn't have an entry for that symbol, or the sync Edge Function timed out/failed to scrape Nepse.
3.  **Missing `import.meta.env` in Scripts**: Standalone `.cjs` or `.mjs` scripts run via Node.js will fail if they import `supabase.js` because Vite's `import.meta.env` is undefined in pure Node. Use `dotenv` or hardcoded keys for backend debugging scripts.
