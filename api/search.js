const { routes } = require("../data/routes.js");

const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

function getMRRequired(program, airlinePoints) {
  const rates = {
    "Avios (Iberia / BA)": 5 / 4,
    "Flying Blue": 3 / 2,
    "Emirates Skywards": 5 / 2,
    "Singapore KrisFlyer": 3 / 2,
    "ITA Volare": 1
  };
  return Math.ceil(airlinePoints * (rates[program] || 1));
}

// 🎯 fallback realistico
function getFallbackValue(route) {
  const regionBase = {
    "Europa": 0.6,
    "Nord America": 0.8,
    "Asia": 1.2,
    "Medio Oriente": 0.7
  };

  const cabinMultiplier = {
    "Economy": 1,
    "Premium Economy": 1.4,
    "Business": 2.2,
    "First": 3
  };

  return (regionBase[route.region] || 0.7) * (cabinMultiplier[route.cabin] || 1);
}

// 🌤 miglior mese
function getBestMonth(route) {
  const map = {
    "Europa": "Aprile - Giugno",
    "Nord America": "Settembre - Novembre",
    "Asia": "Gennaio - Marzo",
    "Medio Oriente": "Novembre - Febbraio"
  };
  return map[route.region] || "Tutto l’anno";
}

module.exports = async function handler(req, res) {

  try {

    const { from, maxMR, cabin, date, monthlyMR } = req.query;

    const parsedMaxMR = parseInt(maxMR);
    const parsedMonthly = parseInt(monthlyMR) || 0;

    const origins =
      from === "IT"
        ? ["MXP", "FCO", "VCE", "BLQ", "NAP"]
        : [from];

    let filtered = routes.filter(r => origins.includes(r.from));

    if (cabin && cabin !== "all") {
      filtered = filtered.filter(r => r.cabin === cabin);
    }

    // 🔐 token Amadeus
    const tokenRes = await fetch(
      "https://test.api.amadeus.com/v1/security/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${process.env.AMADEUS_API_KEY}&client_secret=${process.env.AMADEUS_API_SECRET}`
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    async function getCash(origin, destination, cabin) {

      const cacheKey = `${origin}-${destination}-${cabin}-${date}`;
      const now = Date.now();

      if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
        return cache[cacheKey].data;
      }

      try {

        const res = await fetch(
          `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&adults=1&max=3`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const data = await res.json();

        if (!data.data || data.data.length === 0) return null;

        const prices = data.data.map(f => parseFloat(f.price.total));
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

        return { average: avg };

      } catch {
        return null;
      }
    }

    let enriched = await Promise.all(
      filtered.map(async route => {

        const cash = await getCash(
          route.from,
          route.destinationCode,
          route.cabin
        );

        const mrRequired = getMRRequired(route.program, route.points);
        const mrMissing = Math.max(0, mrRequired - parsedMaxMR);

        let monthsNeeded = null;
        if (mrMissing > 0 && parsedMonthly > 0) {
          monthsNeeded = Math.ceil(mrMissing / parsedMonthly);
        }

        let value = 0;

        if (cash) {
          value = ((cash.average - route.taxes) / route.points) * 100;
        } else {
          value = getFallbackValue(route);
        }

        if (value < 0) value = 0;
        if (value > 5) value = 5;

        const valueScore = Math.min(100, value * 50);
        const budgetScore = mrMissing === 0 ? 100 : 40;

        let futureBonus = 0;
        if (monthsNeeded !== null && monthsNeeded <= 3) futureBonus = 10;
        if (monthsNeeded !== null && monthsNeeded <= 6) futureBonus = 5;

        const opportunityScore =
          valueScore * 0.7 +
          budgetScore * 0.3 +
          futureBonus;

        return {
          ...route,
          cashAverage: cash ? cash.average.toFixed(2) : null,
          estimatedValue: value.toFixed(2),
          opportunityScore: Math.round(opportunityScore),
          mrRequired,
          mrMissing,
          monthsNeeded,
          bestMonth: getBestMonth(route)
        };

      })
    );

    // 🔥 rimuove duplicati (stessa destinazione → tiene miglior valore)
    const unique = {};

    enriched.forEach(r => {
      const key = r.destination + "-" + r.cabin;
      if (!unique[key] || parseFloat(r.estimatedValue) > parseFloat(unique[key].estimatedValue)) {
        unique[key] = r;
      }
    });

    enriched = Object.values(unique);

    const bestValue = Math.max(...enriched.map(r => parseFloat(r.estimatedValue)));

    enriched.forEach(r => {
      r.valuePercent = bestValue > 0
        ? Math.round((parseFloat(r.estimatedValue) / bestValue) * 100)
        : 0;
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
