import { useState, useEffect } from 'react';

export default function CurrentPrice({ symbol, onPriceUpdate }) {
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map symbols to CoinGecko IDs
  const coinGeckoMap = {
    'WETH': 'ethereum',
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether'
  };

  const fetchCurrentPrice = async () => {
    try {
      const coinId = coinGeckoMap[symbol?.toUpperCase()] || 'ethereum';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();

      if (data[coinId]) {
        const currentPrice = data[coinId].usd;
        const priceChange = data[coinId].usd_24h_change;

        setPrice(currentPrice);
        setChange24h(priceChange);

        // Notify parent component of price update
        if (onPriceUpdate) {
          onPriceUpdate(currentPrice);
        }
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
      // Fallback to default
      setPrice(1);
      setChange24h(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPrice();

    // Update price every 30 seconds
    const interval = setInterval(fetchCurrentPrice, 30000);

    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
      </div>
    );
  }

  const isPositive = change24h >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const changeIcon = isPositive ? '↗' : '↘';

  return (
    <div className="flex items-center space-x-3">
      <div>
        <div className="text-2xl font-bold text-gray-800">
          ${price ? price.toFixed(price > 10 ? 2 : 4) : '0.00'}
        </div>
        <div className="text-xs text-gray-500">USD</div>
      </div>
      {change24h !== null && (
        <div className={`flex items-center space-x-1 ${changeColor}`}>
          <span className="text-sm font-medium">
            {changeIcon} {Math.abs(change24h).toFixed(2)}%
          </span>
          <div className="text-xs text-gray-500">24h</div>
        </div>
      )}
    </div>
  );
}