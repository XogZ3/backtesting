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
  const prices = data.map((entry) => entry.close);

  // Calculate the SMA using the SMA indicator from the technicalindicators package
  const smaResult = SMA.calculate({ period: period, values: prices });

  return smaResult;
}

function tradingStrategy(data) {
  const signals = [];
  const movingAverage = calculateSMA(data, 10);

  for (let i = 0; i < data.length; i++) {
    if (data[i].close > movingAverage[i]) {
      signals.push(1);
    } else if (data[i].close < movingAverage[i]) {
      signals.push(-1);
    } else {
      signals.push(0);
    }
  }

  return signals;
}

function simulateStrategy(data, signals, startingBalance) {
  let numTrades = 0;
  let profit = 0;
  let position = 0;
  let endingBalance = startingBalance;
  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let trades = [];

  for (let i = 0; i < data.length; i++) {
    if (signals[i] === 1 && position === 0) {
      position = 1;
      numTrades++;
      const entryTrade = {
        entryTimestamp: new Date(data[i].openTime).toLocaleString(),
        entryPrice: data[i].open,
        size: 1,
        action: "Buy",
      };
      trades.push(entryTrade);
      profit -= data[i].open;
    } else if (signals[i] === -1 && position === 1) {
      position = 0;
      numTrades++;
      const exitTrade = {
        exitTimestamp: new Date(data[i].closeTime).toLocaleString(),
        exitPrice: data[i].close,
        size: 1,
        action: "Sell",
      };
      trades[trades.length - 1] = {
        ...trades[trades.length - 1],
        ...exitTrade,
      };
      profit += data[i].close;
    } else if (signals[i] === -1 && position === 0) {
      position = -1;
      numTrades++;
      const entryTrade = {
        entryTimestamp: new Date(data[i].openTime).toLocaleString(),
        entryPrice: data[i].open,
        size: 1,
        action: "Sell Short",
      };
      trades.push(entryTrade);
      profit += data[i].open;
    } else if (signals[i] === 1 && position === -1) {
      position = 0;
      numTrades++;
      const exitTrade = {
        exitTimestamp: new Date(data[i].closeTime).toLocaleString(),
        exitPrice: data[i].close,
        size: 1,
        action: "Buy to Cover",
      };
      trades[trades.length - 1] = {
        ...trades[trades.length - 1],
        ...exitTrade,
      };
      profit -= data[i].close;
    }

    if (signals[i] !== 0) {
      totalTrades++;
      if (profit > 0) {
        winningTrades++;
      } else if (profit < 0) {
        losingTrades++;
      }
    }
  }

  if (position === 1) {
    profit += data[data.length - 1].close;
  } else if (position === -1) {
    profit -= data[data.length - 1].close;
  }

  endingBalance += profit;
  const closingBalance = startingBalance + profit;
  const hitRate = (winningTrades / totalTrades) * 100;

  return {
    trades: trades,
    startingBalance: startingBalance,
    endingBalance: endingBalance,
    closingBalance: closingBalance,
    totalTrades: totalTrades,
    winningTrades: winningTrades,
    losingTrades: losingTrades,
    hitRate: hitRate.toFixed(2),
    profit: profit,
  };
}

const signals = tradingStrategy(allCandles);
const startingBalance = 10000;
const results = simulateStrategy(allCandles, signals, startingBalance);

console.log(results);
