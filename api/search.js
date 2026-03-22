const { routes } = require("../data/routes.js")

const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

function getMRRequired(program, airlinePoints) {
  const conversionRates = {
    "Avios (Iberia / BA)": 5 / 4,
    "Flying Blue": 3 / 2,
    "Emirates Skywards": 5 / 2,
    "Singapore KrisFlyer": 3 / 2,
    "ITA Volare": 1
  };

  return Math.ceil(airlinePoints * (conversionRates[program] || 1));
}

module.exports = async function handler(req, res) {

  try {

    const { from, maxMR, cabin, date, monthlyMR } = req.query;

    const parsedMaxMR = parseInt(maxMR);
    const parsedMonthly = parseInt(monthlyMR) || 0;

    const filtered = from === "ALL"
      ? routes
      : routes.filter(r => r.from === from);

    const key = process.env.AMADEUS_API_KEY;
    const secret = process.env.AMADEUS_API_SECRET;

    const tokenRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    async function getCash(origin, destination, cabin) {

      const cacheKey = `${origin}-${destination}-${cabin}-${date}`;
      const now = Date.now();

      if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
        return cache[cacheKey].data;
      }

      try {

        const cabinMap = {
          "Economy": "ECONOMY",
          "Business": "BUSINESS",
          "First": "FIRST"
        };

        const travelClass = cabinMap[cabin] || "ECONOMY";

        const res = await fetch(
          `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&travelClass=${travelClass}&max=3`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const data = await res.json();

        if (!data.data || data.data.length === 0) return null;

        const prices = data.data.map(f => parseFloat(f.price.total));
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

        const result = { average: avg };

        cache[cacheKey] = { timestamp: now, data: result };

        return result;

      } catch {
        return null;
      }
    }

    const enriched = await Promise.all(filtered.map(async (route) => {

      const cash = await getCash(route.from, route.destinationCode, route.cabin);

      const mrRequired = getMRRequired(route.program, route.points);
      const mrMissing = Math.max(0, mrRequired - parsedMaxMR);

      // 🧠 CALCOLO MESI
      let monthsNeeded = null;

      if (mrMissing > 0 && parsedMonthly > 0) {
        monthsNeeded = Math.ceil(mrMissing / parsedMonthly);
      }

      let value = 0;

      if (cash) {
        value = ((cash.average - route.taxes) / route.points) * 100;
      }

      if (!cash) value = 0.2;

      const valueScore = Math.min(100, value * 60);

      let difficultyScore = 70;
      if (route.difficulty === 1) difficultyScore = 100;
      if (route.difficulty === 3) difficultyScore = 40;

      const budgetScore = mrMissing === 0 ? 100 : 40;

      // 🔥 BONUS FUTURO
      let futureBonus = 0;
      if (monthsNeeded !== null && monthsNeeded <= 3) futureBonus = 10;
      if (monthsNeeded !== null && monthsNeeded <= 6) futureBonus = 5;

      let opportunityScore = (
        valueScore * 0.7 +
        difficultyScore * 0.15 +
        budgetScore * 0.15
      ) + futureBonus;

      if (opportunityScore < 10) opportunityScore = 10;

      return {
        ...route,
        cashAverage: cash ? cash.average.toFixed(2) : null,
        estimatedValue: value.toFixed(2),
        opportunityScore: Math.round(opportunityScore),
        mrRequired,
        mrMissing,
        monthsNeeded
      };

    }));

    const bestValue = Math.max(...enriched.map(r => parseFloat(r.estimatedValue)));

    enriched.forEach(r => {
      const val = parseFloat(r.estimatedValue) || 0;
      r.valuePercent = bestValue > 0 ? Math.round((val / bestValue) * 100) : 0;
      r.isBestValue = val === bestValue;
    });

    enriched.sort((a, b) => b.opportunityScore - a.opportunityScore);

    const bookable = enriched.filter(r => r.mrMissing === 0);
    const almost = enriched.filter(r => r.monthsNeeded !== null && r.monthsNeeded <= 6);
    const future = enriched.filter(r => r.monthsNeeded === null || r.monthsNeeded > 6);

    res.status(200).json({
      sections: { bookable, almost, future }
    });

  } catch (error) {
    res.status(500).json({
      error: "Errore server",
      details: error.message
    });
  }
};
