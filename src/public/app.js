document.addEventListener('DOMContentLoaded', () => {
    const walletInput = document.getElementById('wallet-address');
    const trackBtn = document.getElementById('track-btn');
    const statsBody = document.getElementById('stats-body');
    const lastUpdatedSpan = document.getElementById('last-updated');

    // Get wallet from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const initialWallet = urlParams.get('wallet');
    
    if (initialWallet) {
        walletInput.value = initialWallet;
        fetchStats(initialWallet);
    }

    trackBtn.addEventListener('click', () => {
        const wallet = walletInput.value.trim();
        if (wallet) {
            // Update URL without reloading
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('wallet', wallet);
            window.history.pushState({}, '', newUrl);
            
            fetchStats(wallet);
        }
    });

    // Auto refresh every 2 seconds if wallet is selected
    setInterval(() => {
        const wallet = walletInput.value.trim();
        if (wallet) {
            fetchStats(wallet);
        }
    }, 2000);

    async function fetchStats(wallet) {
        try {
            // Add cache busting
            const response = await fetch(`/api/stats?wallet=${wallet}&t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch data');
            
            const data = await response.json();
            renderTable(data);
            
            const now = new Date();
            lastUpdatedSpan.textContent = now.toLocaleTimeString();
        } catch (error) {
            console.error('Error:', error);
            // Don't clear table on temporary error, maybe show toast
        }
    }

    function renderTable(data) {
        if (data.length === 0) {
            statsBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 40px;">No trades found for this wallet.</td></tr>`;
            return;
        }

        statsBody.innerHTML = data.map(item => {
            const firstTradeDate = new Date(item.firstTrade.timestamp);
            const dateStr = firstTradeDate.toLocaleDateString();
            const timeStr = firstTradeDate.toLocaleTimeString();
            
            const sideClass = item.firstTrade.side === 'BUY' ? 'dot-green' : 'dot-red';
            const sideTextClass = item.firstTrade.side === 'BUY' ? 'text-green' : 'text-red';
            const sideText = item.firstTrade.side === 'BUY' ? 'Up' : 'Down'; // Mimicking image "Up" logic if Buy=Yes? Actually keeping simple
            
            // Image Logic: "Up" + Green Dot probably means "Bought YES" or "Sold NO"?
            // Let's stick to explicit Side
            
            return `
                <tr>
                    <td>
                        <span class="market-name">${escapeHtml(item.market)}</span>
                        <a href="https://polymarket.com" target="_blank" class="market-link">View on Polymarket →</a>
                    </td>
                    <td>${item.trades}</td>
                    <td>
                        <div class="first-trade-info">
                            <div><span class="side-dot ${sideClass}"></span><span class="price-tag">$${item.firstTrade.price.toFixed(2)}</span></div>
                            <div class="trade-meta ${sideTextClass}">${item.firstTrade.side} • ${item.firstTrade.size} shares</div>
                            <div class="trade-meta">${dateStr}, ${timeStr}</div>
                        </div>
                    </td>
                    <td class="text-green">${item.yesAvg > 0 ? '$' + item.yesAvg.toFixed(2) : '-'}</td>
                    <td class="text-red">${item.noAvg > 0 ? '$' + item.noAvg.toFixed(2) : '-'}</td>
                    <td class="text-blue">$${(item.yesAvg + item.noAvg).toFixed(2)}</td>
                    <td>
                        <div>${Math.round(item.yesShares)}</div>
                        <div class="share-value">($${item.yesVolume.toFixed(2)})</div>
                    </td>
                    <td>
                        <div>${Math.round(item.noShares)}</div>
                        <div class="share-value">($${item.noVolume.toFixed(2)})</div>
                    </td>
                    <td>${item.avgTime}s</td>
                </tr>
            `;
        }).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});