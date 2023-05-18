const fs = require("fs");
const { SMA } = require("technicalindicators");

function readCandleDataFromFile(filePath) {
  const rawData = fs.readFileSync(filePath, "utf8");
  const candles = JSON.parse(rawData);
  return candles;
}

// Read the data from file
const fileNames = ["BHEL_10000_15m_1674445500000.dat"];
const allCandles = fileNames
  .map((fileName) => readCandleDataFromFile(fileName))
  .flat();

function calculateSMA(data, period) {
  const input = {
    values: data.map((candle) => candle.close),
    period: period,
  };

  const result = SMA.calculate(input);
  return result;
}

function backtest(candleData, initialBalance) {
  const smaPeriod = 10; // You can adjust this value as per your requirement
  let balance = initialBalance;
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let profit = 0;

  const smaValues = calculateSMA(candleData, smaPeriod);
  const trades = [];

  for (let i = smaPeriod; i < candleData.length; i++) {
    const currentCandle = candleData[i];
    const prevCandle = candleData[i - 1];
    const currentSMA = smaValues[i - 1]; // Modified line: Use i - 1 for currentSMA

    if (
      prevCandle.close < prevCandle.open &&
      currentCandle.close > currentSMA
    ) {
      // Buy signal
      const entryTime = new Date(currentCandle.openTime).toLocaleString();
      const entryPrice = currentCandle.close;
      const size = currentCandle.volume;
      const entryTradeValue = entryPrice * size;

      balance -= entryTradeValue;
      totalTrades++;
      winningTrades++;

      trades.push({
        entryTime,
        entryPrice,
        size,
        entryTradeValue,
        exitTime: null,
        exitPrice: null,
        exitTradeValue: null,
        tradeType: "Buy",
      });
    } else if (
      prevCandle.close > prevCandle.open &&
      currentCandle.close < currentSMA
    ) {
      // Sell signal
      const exitTime = new Date(currentCandle.closeTime).toLocaleString();
      const exitPrice = currentCandle.close;
      const size = currentCandle.volume;
      const exitTradeValue = exitPrice * size;

      balance += exitTradeValue;
      totalTrades++;
      losingTrades++;

      trades.push({
        entryTime: null,
        entryPrice: null,
        size: null,
        entryTradeValue: null,
        exitTime,
        exitPrice,
        exitTradeValue,
        tradeType: "Sell",
      });
    } else {
      trades.push({ tradeType: "Hold" });
    }
  }

  const endingBalance = balance;
  const successRate = winningTrades / totalTrades;

  return {
    trades,
    balance,
    profit: endingBalance - initialBalance,
    totalTrades,
    winningTrades,
    losingTrades,
    startingBalance: initialBalance,
    endingBalance,
    successRate,
  };
}

const initialBalance = 500000;
const result = backtest(allCandles, initialBalance);
console.log(result);
