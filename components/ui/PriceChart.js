import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function PriceChart({ symbol, currentPrice }) {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('7'); // 7 days default
  const [loading, setLoading] = useState(true);

  // Map symbols to CoinGecko IDs
  const coinGeckoMap = {
    'WETH': 'ethereum',
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether'
  };

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const coinId = coinGeckoMap[symbol?.toUpperCase()] || 'ethereum';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${timeframe}`
      );
      const data = await response.json();

      if (data.prices) {
        const labels = data.prices.map(price =>
          new Date(price[0]).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        );
        const prices = data.prices.map(price => price[1]);

        setChartData({
          labels: labels,
          datasets: [
            {
              label: `${symbol} Price (USD)`,
              data: prices,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.1,
              pointRadius: 1,
              pointHoverRadius: 5,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      // Fallback to mock data
      const mockLabels = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const mockPrices = Array.from({length: 7}, () =>
        parseFloat(currentPrice) + (Math.random() - 0.5) * parseFloat(currentPrice) * 0.1
      );

      setChartData({
        labels: mockLabels,
        datasets: [
          {
            label: `${symbol} Price (USD)`,
            data: mockPrices,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 5,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory();
  }, [symbol, timeframe]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          callback: function(value) {
            return '$' + value.toFixed(2);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{symbol} Price Chart</h3>
          <p className="text-sm text-gray-600">Current: ${parseFloat(currentPrice).toFixed(2)}</p>
        </div>
        <div className="flex space-x-2">
          {['1', '7', '30'].map(days => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeframe === days
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Unable to load chart data
          </div>
        )}
      </div>
    </div>
  );
}