const { routes } = require("../data/routes.js");

// Cache in memoria
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minuti

function getMRRequired(program, airlinePoints) {
  const conversionRates = {
    "Avios (Iberia / BA)": 5 / 4,
    "Flying Blue": 3 / 2,
    "Emirates Skywards": 5 / 2,
    "Singapore KrisFlyer": 3 / 2,
    "ITA Volare": 1
  };

  const rate = conversionRates[program] || 1;
  return Math.ceil(airlinePoints * rate);
}

module.exports = async function handler(req, res) {

  try {

    const { from, maxMR } = req.query;

    if (!from || !maxMR) {
      return res.status(400).json({ error: "Parametri mancanti" });
    }

    const parsedMaxMR = parseInt(maxMR);

    const filtered = routes.filter(r => r.from === from);

    const key = process.env.AMADEUS_API_KEY;
    const secret = process.env.AMADEUS_API_SECRET;

    const tokenResponse = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ error: "Token Amadeus non ottenuto" });
    }

    async function getCashRange(origin, destination) {

      const cacheKey = `${origin}-${destination}`;
      const now = Date.now();

      if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
        return cache[cacheKey].data;
      }

      const today = new Date();
      const dates = [];

      for (let i = 1; i <= 2; i++) {
        const future = new Date(today);
        future.setDate(today.getDate() + i * 20);
        dates.push(future.toISOString().split("T")[0]);
      }

      const pricePromises = dates.map(async (date) => {

        const flightResponse = await fetch(
          `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&max=3`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );

        const flightData = await flightResponse.json();

        if (flightData.data && flightData.data.length > 0) {
          return Math.min(
            ...flightData.data.map(f => parseFloat(f.price.total))
          );
        }

        return null;
      });

      const results = await Promise.all(pricePromises);
      const prices = results.filter(p => p !== null);

      if (prices.length === 0) return null;

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

      const summary = { min, max, average: avg };

      cache[cacheKey] = {
        timestamp: now,
        data: summary
      };

      return summary;
    }

    const enriched = await Promise.all(filtered.map(async (route) => {

      const cashData = await getCashRange(route.from, route.destinationCode);

      const mrRequired = getMRRequired(route.program, route.points);
      const mrMissing = mrRequired - parsedMaxMR;
      const gapRatio = mrMissing > 0 ? mrMissing / mrRequired : 0;

      if (!cashData) {
        return {
          ...route,
          opportunityScore: 0,
          mrRequired,
          mrMissing: mrMissing > 0 ? mrMissing : 0,
          gapRatio
        };
      }

      const value = ((cashData.average - route.taxes) / route.points) * 100;

      // Value score continuo
      let valueScore = Math.min(100, value * 50);

      // Difficulty
      let difficultyScore = 70;
      if (route.difficulty === 1) difficultyScore = 100;
      if (route.difficulty === 2) difficultyScore = 70;
      if (route.difficulty === 3) difficultyScore = 40;

      // Budget penalty AGGRESSIVO
      let budgetScore = 100;

      if (mrMissing > 0) {
        budgetScore = Math.max(5, 100 - (gapRatio * 180));
      }

// 🌍 Long Haul Bonus leggero
let longHaulBonus = 0;

if (route.region === "Asia") longHaulBonus = 8;
if (route.region === "Nord America") longHaulBonus = 6;
if (route.region === "Medio Oriente") longHaulBonus = 4;

// Score finale
const opportunityScore = (
  valueScore * 0.7 +
  difficultyScore * 0.15 +
  budgetScore * 0.15
) + longHaulBonus;

      return {
        ...route,
        cashMin: cashData.min.toFixed(2),
        cashMax: cashData.max.toFixed(2),
        cashAverage: cashData.average.toFixed(2),
        estimatedValue: value.toFixed(2),
        opportunityScore: Math.round(opportunityScore),
        mrRequired,
        mrMissing: mrMissing > 0 ? mrMissing : 0,
        gapRatio
      };
    }));

    enriched.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // 🎯 Separazione sezioni
    const bookable = enriched.filter(r => r.mrMissing === 0);
    const almost = enriched.filter(r => r.mrMissing > 0 && r.gapRatio <= 0.25);
    const future = enriched.filter(r => r.gapRatio > 0.25);

    return res.status(200).json({
      from,
      maxMR,
      sections: {
        bookable,
        almost,
        future
      }
    });

  } catch (error) {

    return res.status(500).json({
      error: "Errore interno server",
      details: error.message
    });
  }
};
