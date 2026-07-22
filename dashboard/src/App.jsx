import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, BarChart2, Loader2, AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from './supabase';
import './App.css';



const FundCard = ({ fund, activeTab }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const tradeUrl = `${fund.tmsBaseUrl}&transaction=${activeTab === 'buy' ? 'Buy' : 'Sell'}&quantity=${activeTab === 'sell' && fund.myQty > 0 ? fund.myQty : 1000}&price=${activeTab === 'buy' ? (fund.myBid || fund.lowestAsk || fund.price) : (fund.myAsk || fund.highestBid || fund.price)}`;
  
  return (
    <div className={`fund-card glass-card ${fund.flash || ""}`} onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
      <div className="fund-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href={tradeUrl} target="_blank" rel="noopener noreferrer" className="tms-buy-btn" title={`Trade ${fund.symbol} on TMS`} onClick={(e) => e.stopPropagation()}>
            {fund.symbol}
            <ArrowRight size={16} />
          </a>
        </div>
        <button className="expand-btn" onClick={() => setIsExpanded(!isExpanded)} title="Toggle Details">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>

      <div className="primary-metrics-grid">
        <div className="metric-box">
          <div className="metric-label">LTP (Market)</div>
          <div className="metric-value">Rs. {fund.price.toFixed(2)}</div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Discount @ LTP</div>
          <div className={`metric-badge ${fund.discount < 0 ? 'badge-good' : 'badge-bad'}`}>
            {fund.discount.toFixed(2)}%
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Discount @ Highest Bid</div>
          <div className={`metric-badge ${(fund.highestBidDiscount || 0) < 0 ? 'badge-good' : 'badge-bad'}`}>
            {(fund.highestBidDiscount || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className={`fund-details ${isExpanded ? 'expanded' : ''}`} style={{ display: isExpanded ? 'block' : 'none', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        
        {/* Core Secondary Metrics */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span className="fund-ticker">Adj NAV: Rs. {fund.nav.toFixed(2)}</span>
          {fund.myQty > 0 && <span className="fund-ticker">Holding: {fund.myQty} units</span>}
          {fund.vwap5d > 0 && <span className="fund-ticker" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>5D VWAP: Rs. {fund.vwap5d.toFixed(2)}</span>}
          {fund.vol5d > 0 && <span className="fund-ticker" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>5D Vol: {fund.vol5d.toLocaleString()}</span>}
        </div>

        {/* New Analytics Section */}
        <div className="analytics-section">
          <h4>Analytics & Allocation</h4>
          <div className="analytics-grid">
            <div className="analytics-item">
              <span>Total Assets:</span>
              <strong>{fund.totalAssetsCount || '-'}</strong>
            </div>
            <div className="analytics-item">
              <span>Cap Market (%):</span>
              <strong>{fund.capitalMarket ? (fund.capitalMarket * 100).toFixed(2) + '%' : '-'}</strong>
            </div>
            <div className="analytics-item">
              <span>Non-Cap Market (%):</span>
              <strong>{fund.nonCapitalMarket ? (fund.nonCapitalMarket * 100).toFixed(2) + '%' : '-'}</strong>
            </div>
            <div className="analytics-item">
              <span>Cap Market Discount:</span>
              <strong>{fund.discountPremiumCapMarket ? fund.discountPremiumCapMarket.toFixed(2) + '%' : '-'}</strong>
            </div>
            <div className="analytics-item">
              <span>Nav Date (SS):</span>
              <strong>{fund.navMonthSharesansar || '-'}</strong>
            </div>
            <div className="analytics-item">
              <span>Monthly Nav Date:</span>
              <strong>{fund.monthlyNavMonth || fund.navMonthRaw || '-'}</strong>
            </div>
          </div>
        </div>

        {/* Sell Tab Specific PNL */}
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
            </div>
            <div>
              <div style={{ color: 'var(--color-destructive)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>TOP ASK</div>
              <div className="depth-row monospace-data">
                <span style={{ color: 'var(--color-destructive)' }}>Rs. {fund.lowestAsk.toFixed(2)}</span>
                <span style={{ color: '#94a3b8' }}>{fund.lowestAskQty || '-'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

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
            
            const navVal = safeNum(depth.adjusted_nav ?? fund.adjusted_nav);
            const highestBidDiscount = navVal > 0 ? ((safeNum(highestBid) - navVal) / navVal) * 100 : 0;
            return {
              id: symbol || Math.random().toString(),
              symbol: symbol || 'Unknown',
              nav: navVal,
              price: safeNum(depth.ltp ?? fund.mf_ltp),
              discount: safeNum(depth.discount_at_ltp ?? fund.discount_premium_adjusted),
              
              highestBid: safeNum(highestBid),
              highestBidQty: safeNum(highestBidQty),
              lowestAsk: safeNum(lowestAsk),
              lowestAskQty: safeNum(lowestAskQty),
              
              highestBidDiscount: highestBidDiscount,
  
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

              tmsBaseUrl: tmsBaseUrl,
              
              // New secondary details
              totalAssetsCount: fund.total_assets_count,
              navMonthRaw: fund['nav month raw'],
              navMonthSharesansar: fund['nav month sharesansar'],
              monthlyNavMonth: fund['Monthly Nav Month'],
              capitalMarket: fund.Capital_Market,
              nonCapitalMarket: fund.Non_Capital_Market,
              discountPremiumCapMarket: fund.discount_premium_cap_market
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


  // Setup Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:raw_marketdepth')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raw_marketdepth_nepseapi_new' },
        (payload) => {
          const newData = payload.new;
          if (!newData || !newData.symbol) return;
          
          const symbol = newData.symbol.trim().toUpperCase();
          
          setFunds(prevFunds => {
            const index = prevFunds.findIndex(f => f.symbol === symbol);
            if (index === -1) return prevFunds; // Not in our list

            const safeNum = (val) => (val === null || val === undefined || isNaN(val)) ? 0 : Number(val);
            
            const buyDepth = newData.buy_market_depth || [];
            const sellDepth = newData.sell_market_depth || [];
            
            const highestBid = buyDepth.length > 0 ? buyDepth[0].orderBookOrderPrice : 0;
            const highestBidQty = buyDepth.length > 0 ? buyDepth[0].quantity : 0;
            const lowestAsk = sellDepth.length > 0 ? sellDepth[0].orderBookOrderPrice : 0;
            const lowestAskQty = sellDepth.length > 0 ? sellDepth[0].quantity : 0;

            const updatedFund = { ...prevFunds[index] };
            
            // Only update if there's an actual change in the crucial numbers to trigger less re-renders
            const oldPrice = updatedFund.price;
            const newPrice = safeNum(newData.ltp ?? updatedFund.price);
            
            if (oldPrice !== newPrice) {
               updatedFund.flash = newPrice > oldPrice ? 'flash-up' : 'flash-down';
            } else {
               // Also check bid/ask changes
               if (updatedFund.highestBid !== highestBid || updatedFund.lowestAsk !== lowestAsk) {
                   updatedFund.flash = 'flash-update';
               }
            }
            
            // Clear flash after 1s
            if (updatedFund.flash) {
               setTimeout(() => {
                 setFunds(currentFunds => {
                   const cIndex = currentFunds.findIndex(cf => cf.symbol === symbol);
                   if (cIndex === -1) return currentFunds;
                   const newArr = [...currentFunds];
                   newArr[cIndex] = { ...newArr[cIndex], flash: null };
                   return newArr;
                 });
               }, 1000);
            }

            const navVal = safeNum(newData.adjusted_nav ?? updatedFund.nav);
            updatedFund.price = newPrice;
            updatedFund.nav = navVal;
            updatedFund.discount = safeNum(newData.discount_at_ltp ?? updatedFund.discount);
            
            updatedFund.highestBid = safeNum(highestBid);
            updatedFund.highestBidQty = safeNum(highestBidQty);
            updatedFund.lowestAsk = safeNum(lowestAsk);
            updatedFund.lowestAskQty = safeNum(lowestAskQty);
            updatedFund.highestBidDiscount = navVal > 0 ? ((safeNum(highestBid) - navVal) / navVal) * 100 : 0;

            // Retain myBid, myAsk, etc if provided in new data
            if (newData.my_bid !== undefined) updatedFund.myBid = safeNum(newData.my_bid);
            if (newData.my_ask !== undefined) updatedFund.myAsk = safeNum(newData.my_ask);

            const newArr = [...prevFunds];
            newArr[index] = updatedFund;
            return newArr;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Process data based on active tab, filters, and sort
  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    
    funds.forEach(f => {
      if (f.myQty > 0 && f.wacc > 0) {
        totalInvested += (f.myQty * f.wacc);
        totalCurrent += (f.myQty * f.highestBid); // Using highest bid for immediate liquidation value
      }
    });

    const profitLoss = totalCurrent - totalInvested;
    const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    
    return { totalInvested, totalCurrent, profitLoss, profitLossPct };
  }, [funds]);
  
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

      {/* Hero Dashboard */}
      <div className="hero-dashboard glass-card">
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Liquidation Value (Top Bid)</div>
          <div className="monospace-data" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-foreground)', textShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
            Rs. {portfolioSummary.totalCurrent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Unrealized P/L</div>
          <div className={`monospace-data ${portfolioSummary.profitLoss < 0 ? 'badge-bad' : 'badge-good'}`} style={{ fontSize: '1.5rem', padding: '0.5rem 1.25rem', borderRadius: '8px', display: 'inline-block', fontWeight: 700, border: '1px solid' }}>
            {portfolioSummary.profitLoss > 0 ? '+' : ''}{portfolioSummary.profitLossPct.toFixed(2)}%
          </div>
        </div>
      </div>

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
            <FundCard key={fund.id} fund={fund} activeTab={activeTab} />
          ))}
        </main>
      )}
      </>
      )}
    </div>
  );
}

export default App;
