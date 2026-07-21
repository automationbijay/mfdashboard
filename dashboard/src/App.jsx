import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, BarChart2, Loader2, AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Helper for localStorage
  const getSavedPref = (key, defaultVal) => {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved : defaultVal;
  };

  // UI State
  const [activeTab, setActiveTab] = useState(() => getSavedPref('mf_activeTab', 'buy'));
  const [showFilters, setShowFilters] = useState(() => getSavedPref('mf_showFilters', 'false') === 'true');
  
  // Filter & Sort State
  const [sortBy, setSortBy] = useState(() => getSavedPref('mf_sortBy', 'discount_desc'));
  const [minDiscount, setMinDiscount] = useState(() => getSavedPref('mf_minDiscount', ''));
  const [minPnl, setMinPnl] = useState(() => getSavedPref('mf_minPnl', ''));
  const [minQty, setMinQty] = useState(() => getSavedPref('mf_minQty', ''));
  const [autoSyncInterval, setAutoSyncInterval] = useState(() => Number(getSavedPref('mf_autoSyncInterval', '0')));

  // Edge Function State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        { data: analyticsData, error: err1 },
        { data: askBidData, error: err2 },
        { data: pnlData, error: err3 },
        { data: avgData, error: err4 }
      ] = await Promise.all([
        supabase.from('view_mf_summary_analytics').select('*'),
        supabase.from('raw_marketdepth_nepseapi_new').select('*'),
        supabase.from('wiki_profit_loss_analysis').select('*'),
        supabase.from('wiki_average').select('*')
      ]);

      if (err1) throw err1;
      if (err2) throw err2;
      if (err3) throw err3;
      if (err4) throw err4;

      if (pnlData && pnlData.length > 0 && pnlData[0].updated_at) {
        const latest = pnlData.reduce((max, current) => {
          return new Date(current.updated_at) > new Date(max) ? current.updated_at : max;
        }, pnlData[0].updated_at);
        setLastSyncedAt(new Date(latest));
      } else {
        setLastSyncedAt(new Date()); // fallback
      }

      const baseData = analyticsData || [];
        
        const mergedFunds = baseData.map(fund => {
          const originalSymbol = fund.MF || '';
          const symbol = originalSymbol.trim().toUpperCase();
          
          const depth = (askBidData || []).find(ab => ab.symbol && ab.symbol.trim().toUpperCase() === symbol) || {};
          const pnl = (pnlData || []).find(p => p.symbol && p.symbol.trim().toUpperCase() === symbol) || {};
          const avg = (avgData || []).find(a => a.symbol && a.symbol.trim().toUpperCase() === symbol) || {};

          const safeNum = (val) => (val === null || val === undefined || isNaN(val)) ? 0 : Number(val);
          
          const buyDepth = depth.buy_market_depth || [];
          const sellDepth = depth.sell_market_depth || [];
          
          const highestBid = buyDepth.length > 0 ? buyDepth[0].orderBookOrderPrice : 0;
          const highestBidQty = buyDepth.length > 0 ? buyDepth[0].quantity : 0;
          
          const lowestAsk = sellDepth.length > 0 ? sellDepth[0].orderBookOrderPrice : 0;
          const lowestAskQty = sellDepth.length > 0 ? sellDepth[0].quantity : 0;

            // Construct TMS Trade URL
            // Default transaction to Buy, but the button might dynamically change based on tab if needed
            // Here we provide a base URL which we can further customize during render based on the active tab
            const tmsBaseUrl = `https://tms43.nepsetms.com.np/tms/me/memberclientorderentry?symbol=${symbol}&market=continuous`;
            
            return {
              id: symbol || Math.random().toString(),
              symbol: symbol || 'Unknown',
              nav: safeNum(depth.adjusted_nav ?? fund.adjusted_nav),
              price: safeNum(depth.ltp ?? fund.mf_ltp),
              discount: safeNum(depth.discount_at_ltp ?? fund.discount_premium_adjusted),
              
              highestBid: safeNum(highestBid),
              highestBidQty: safeNum(highestBidQty),
              lowestAsk: safeNum(lowestAsk),
              lowestAskQty: safeNum(lowestAskQty),
  
              myBid: safeNum(depth.my_bid),
              myBidDiscount: safeNum(depth.my_bid_discount_premium),
              myAsk: safeNum(depth.my_ask),
              myAskDiscount: safeNum(depth.my_ask_discount_premium),
              myQty: safeNum(depth.my_quantity || pnl.quantity),
              wacc: safeNum(depth.wacc_rate || pnl.wacc_rate),
  
              pnlTotalPercent: pnl.overall_profit_loss_percent !== undefined && pnl.overall_profit_loss_percent !== null ? safeNum(pnl.overall_profit_loss_percent) : null,
              pnlTotalAmount: pnl.overall_profit_loss_amount !== undefined && pnl.overall_profit_loss_amount !== null ? safeNum(pnl.overall_profit_loss_amount) : null,
              
              vwap5d: safeNum(avg.vwap_avg_5d || depth.vwap_avg_5d),
              vol5d: safeNum(avg.volume_avg_5d || depth.volume_avg_5d),

              tmsBaseUrl: tmsBaseUrl
            };
        });

        setFunds(mergedFunds);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || 'Failed to fetch data from Supabase');
      } finally {
        setLoading(false);
      }
  };

  const handleSyncMarketDepth = async () => {
    if (isSyncing) return; // Prevent concurrent syncs
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-market-depth');
      if (error) throw error;
      setSyncResult({ type: 'success', msg: 'Market depth synchronized successfully.' });
      await fetchData();
    } catch (err) {
      setSyncResult({ type: 'error', msg: err.message || 'Failed to sync market depth.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep a stable ref to the sync function for the interval
  const syncRef = React.useRef(handleSyncMarketDepth);
  useEffect(() => {
    syncRef.current = handleSyncMarketDepth;
  });

  // Setup auto-sync interval
  useEffect(() => {
    if (autoSyncInterval <= 0) return;
    const intervalId = setInterval(() => {
      syncRef.current();
    }, autoSyncInterval * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [autoSyncInterval]);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('mf_activeTab', activeTab);
    localStorage.setItem('mf_showFilters', showFilters.toString());
    localStorage.setItem('mf_sortBy', sortBy);
    localStorage.setItem('mf_minDiscount', minDiscount);
    localStorage.setItem('mf_minPnl', minPnl);
    localStorage.setItem('mf_minQty', minQty);
    localStorage.setItem('mf_autoSyncInterval', autoSyncInterval.toString());
  }, [activeTab, showFilters, sortBy, minDiscount, minPnl, minQty, autoSyncInterval]);

  useEffect(() => {
    fetchData();
  }, []);

  // Process data based on active tab, filters, and sort
  const processedFunds = useMemo(() => {
    let filtered = [...funds];

    // Basic Tab Filter
    if (activeTab === 'buy') {
      // For buy, we might only want to show things we don't own heavily, or just everything for exploring
      // But typically we filter by minimum discount if requested
      if (minDiscount !== '') {
        // e.g. minDiscount = -5 means we want funds with at least -5% discount (meaning <= -5)
        // Wait, discount is usually negative. Let's filter if fund.discount <= target
        const target = Number(minDiscount);
        filtered = filtered.filter(f => f.discount <= target);
      }
    } else if (activeTab === 'sell') {
      // For sell, typically we only care about what we own
      filtered = filtered.filter(f => f.myQty > 0 || f.pnlTotalAmount !== null);
      
      if (minPnl !== '') {
        const target = Number(minPnl);
        filtered = filtered.filter(f => f.pnlTotalPercent !== null && f.pnlTotalPercent >= target);
      }

      if (minQty !== '') {
        const targetQty = Number(minQty);
        filtered = filtered.filter(f => f.myQty >= targetQty);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'discount_desc':
          return a.discount - b.discount; // smaller (more negative) first
        case 'discount_asc':
          return b.discount - a.discount;
        case 'pnl_desc':
          const pnlA = a.pnlTotalPercent || 0;
          const pnlB = b.pnlTotalPercent || 0;
          return pnlB - pnlA; // higher PnL first
        case 'pnl_asc':
          const pnlA2 = a.pnlTotalPercent || 0;
          const pnlB2 = b.pnlTotalPercent || 0;
          return pnlA2 - pnlB2; // lower PnL first
        default:
          return 0;
      }
    });

    return filtered;
  }, [funds, activeTab, sortBy, minDiscount, minPnl, minQty]);

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1 className="title">Fund Opportunities</h1>
          <p className="subtitle">
            Mutual funds tracking & market depth analytics
            {lastSyncedAt && (
              <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--color-accent)' }}>
                Last synced: {lastSyncedAt.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'medium' })}
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={handleSyncMarketDepth}
          disabled={isSyncing}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: isSyncing ? 'not-allowed' : 'pointer',
            opacity: isSyncing ? 0.5 : 1,
            color: 'var(--color-secondary)',
            padding: '0.5rem',
            borderRadius: '50%',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => !isSyncing && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseOut={(e) => !isSyncing && (e.currentTarget.style.background = 'transparent')}
          title="Sync Market Depth"
        >
          <RefreshCw size={28} className={isSyncing ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'buy' ? 'active' : ''}`}
          onClick={() => { setActiveTab('buy'); setSortBy('discount_desc'); }}
        >
          Buy Opportunities
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sell' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sell'); setSortBy('pnl_desc'); }}
        >
          Sell & Portfolio
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); }}
        >
          Settings
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="settings-panel" style={{ backgroundColor: 'var(--color-muted)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Edge Functions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Sync Market Depth</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Manually trigger the Supabase Edge Function to fetch the latest market depth data.</p>
              <button 
                className="buy-btn" 
                onClick={handleSyncMarketDepth} 
                disabled={isSyncing}
                style={{ width: '100%', opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }}
              >
                {isSyncing ? <Loader2 size={18} className="animate-spin" /> : 'Trigger Sync'}
              </button>
              {syncResult && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: syncResult.type === 'success' ? 'var(--color-accent)' : 'var(--color-destructive)', backgroundColor: syncResult.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)', border: `1px solid ${syncResult.type === 'success' ? 'var(--color-accent)' : 'var(--color-destructive)'}` }}>
                  {syncResult.msg}
                </div>
              )}
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--color-border)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Auto-Sync Interval</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>Automatically trigger the sync in the background while this app is open.</p>
                <select 
                  className="sort-select" 
                  style={{ width: '100%' }}
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                >
                  <option value={0}>Off (Manual Only)</option>
                  <option value={1}>Every 1 minute</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Controls: Filter & Sort */}
      <div className="controls-bar">
        <div className="controls-top">
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
            Filters {showFilters ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          
          <select 
            className="sort-select" 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="discount_desc">Highest Discount First</option>
            <option value="discount_asc">Lowest Discount First</option>
            {activeTab === 'sell' && (
              <>
                <option value="pnl_desc">Highest P/L % First</option>
                <option value="pnl_asc">Lowest P/L % First</option>
              </>
            )}
          </select>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="expanded-filters">
            {activeTab === 'buy' ? (
              <div className="filter-group">
                <label>Max Discount (e.g. -5 for -5% or more)</label>
                <input 
                  type="number" 
                  className="filter-input" 
                  placeholder="-5.0"
                  value={minDiscount}
                  onChange={e => setMinDiscount(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="filter-group">
                  <label>Min P/L % (e.g. 10)</label>
                  <input 
                    type="number" 
                    className="filter-input" 
                    placeholder="10.0"
                    value={minPnl}
                    onChange={e => setMinPnl(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Min Quantity (Units)</label>
                  <input 
                    type="number" 
                    className="filter-input" 
                    placeholder="1000"
                    value={minQty}
                    onChange={e => setMinQty(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="filter-group">
              <label>Clear Filters</label>
              <button 
                className="filter-toggle" 
                style={{justifyContent: 'center'}}
                onClick={() => { setMinDiscount(''); setMinPnl(''); setMinQty(''); }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Loader2 size={48} color="var(--color-secondary)" className="animate-spin" />
        </div>
      ) : error ? (
        <div style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid var(--color-destructive)', padding: '2rem', borderRadius: '8px', color: 'var(--color-destructive)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={24} />
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Connection Error</h3>
            <p>{error}</p>
          </div>
        </div>
      ) : processedFunds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          No funds match your current filters.
        </div>
      ) : (
        <main className="fund-list">
          {processedFunds.map(fund => (
            <div key={fund.id} className="fund-card">
              <div className="fund-header">
                <div>
                  <div className="fund-name monospace-data">{fund.symbol}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {fund.myQty > 0 && <span className="fund-ticker">Holding: {fund.myQty} units</span>}
                    {fund.vwap5d > 0 && <span className="fund-ticker" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>5D VWAP: Rs. {fund.vwap5d.toFixed(2)}</span>}
                    {fund.vol5d > 0 && <span className="fund-ticker" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>5D Vol: {fund.vol5d.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="discount-badge monospace-data" style={{ color: fund.discount < 0 ? 'var(--color-accent)' : 'var(--color-destructive)', borderColor: fund.discount < 0 ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)', backgroundColor: fund.discount < 0 ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)' }}>
                  {fund.discount.toFixed(2)}%
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">LTP (Market)</div>
                  <div className="stat-value monospace-data">Rs. {fund.price.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Adjusted NAV</div>
                  <div className="stat-value monospace-data">Rs. {fund.nav.toFixed(2)}</div>
                </div>
              </div>

              {activeTab === 'sell' && fund.myQty > 0 && fund.wacc > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(() => {
                    const estProfitAmt = (fund.highestBid - fund.wacc) * fund.myQty;
                    const estProfitPct = ((fund.highestBid - fund.wacc) / fund.wacc) * 100;
                    const isProfitable = estProfitAmt >= 0;
                    const insightColor = isProfitable ? 'var(--color-accent)' : 'var(--color-destructive)';
                    const insightBg = isProfitable ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)';
                    
                    return (
                      <div style={{ backgroundColor: insightBg, padding: '1rem', borderRadius: '8px', border: `1px solid ${insightColor}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <div className="stat-label" style={{ color: insightColor }}>My WACC</div>
                            <div className="stat-value monospace-data" style={{ fontSize: '1rem', color: insightColor }}>
                              Rs. {fund.wacc.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="stat-label" style={{ color: insightColor }}>Market Bid</div>
                            <div className="stat-value monospace-data" style={{ fontSize: '1rem', color: insightColor }}>
                              Rs. {fund.highestBid.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="stat-label" style={{ color: insightColor }}>Est. Profit</div>
                            <div className="stat-value monospace-data" style={{ fontSize: '1.1rem', color: insightColor }}>
                              Rs. {estProfitAmt.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', borderTop: `1px dashed ${insightColor}`, paddingTop: '0.5rem', opacity: 0.9 }}>
                          <strong>Insight:</strong> If you sell {fund.myQty} units at the current highest bid of Rs. {fund.highestBid.toFixed(2)}, you will {isProfitable ? 'gain' : 'lose'} <strong>{Math.abs(estProfitPct).toFixed(2)}%</strong> against your WACC.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="market-depth">
                <h4><BarChart2 size={16}/> Market Depth</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem' }}>
                  <div>
                    <div style={{ color: 'var(--color-accent)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>TOP BID</div>
                    <div className="depth-row monospace-data">
                      <span style={{ color: '#94a3b8' }}>{fund.highestBidQty || '-'}</span>
                      <span style={{ color: 'var(--color-accent)' }}>Rs. {fund.highestBid.toFixed(2)}</span>
                    </div>
                    {fund.myBid > 0 && (
                      <div className="depth-row monospace-data" style={{ borderTop: '1px dashed var(--color-accent)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                          My Target <span style={{ color: fund.myBidDiscount < 0 ? 'var(--color-accent)' : 'var(--color-destructive)' }}>({fund.myBidDiscount > 0 ? '+' : ''}{fund.myBidDiscount.toFixed(2)}%)</span>
                        </span>
                        <span style={{ color: 'var(--color-accent)' }}>Rs. {fund.myBid.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-destructive)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>TOP ASK</div>
                    <div className="depth-row monospace-data">
                      <span style={{ color: 'var(--color-destructive)' }}>Rs. {fund.lowestAsk.toFixed(2)}</span>
                      <span style={{ color: '#94a3b8' }}>{fund.lowestAskQty || '-'}</span>
                    </div>
                    {fund.myAsk > 0 && (
                      <div className="depth-row monospace-data" style={{ borderTop: '1px dashed var(--color-destructive)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                        <span style={{ color: 'var(--color-destructive)' }}>Rs. {fund.myAsk.toFixed(2)}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                          My Target <span style={{ color: fund.myAskDiscount < 0 ? 'var(--color-accent)' : 'var(--color-destructive)' }}>({fund.myAskDiscount > 0 ? '+' : ''}{fund.myAskDiscount.toFixed(2)}%)</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <a 
                href={`${fund.tmsBaseUrl}&transaction=${activeTab === 'buy' ? 'Buy' : 'Sell'}&quantity=${activeTab === 'sell' && fund.myQty > 0 ? fund.myQty : 1000}&price=${activeTab === 'buy' ? (fund.myBid || fund.lowestAsk || fund.price) : (fund.myAsk || fund.highestBid || fund.price)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="buy-btn"
                style={{ backgroundColor: activeTab === 'buy' ? 'var(--color-primary)' : 'var(--color-destructive)' }}
              >
                Trade on TMS <ArrowRight size={18} />
              </a>
            </div>
          ))}
        </main>
      )}
      </>
      )}
    </div>
  );
}

export default App;
