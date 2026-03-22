const { routes } = require("../data/routes.js");

module.exports = async function handler(req, res) {

  try {

    const { from, maxMR, date } = req.query;

    if (!from || !maxMR) {
      return res.status(400).json({ error: "Parametri mancanti" });
    }

    const parsedMaxMR = parseInt(maxMR);

    // supporto IT (tutti aeroporti)
    const origins = from === "IT"
      ? ["MXP", "FCO", "VCE", "BLQ", "NAP"]
      : [from];

    const filtered = routes.filter(r => origins.includes(r.from));

    // token Amadeus
    const tokenResponse = await fetch(
      "https://test.api.amadeus.com/v1/security/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=client_credentials&client_id=${process.env.AMADEUS_API_KEY}&client_secret=${process.env.AMADEUS_API_SECRET}`
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 👉 funzione date flessibili
    function getDates(baseDate) {

      const dates = [];

      const base = baseDate ? new Date(baseDate) : new Date();

      for (let i = -2; i <= 2; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }

      return dates;
    }

    async function getCashPrice(origin, destination) {

      const dates = getDates(date);

      const prices = [];

      for (const d of dates) {

        const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${d}&adults=1&max=3`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const data = await response.json();

        if (data.data && data.data.length > 0) {
          prices.push(
            Math.min(...data.data.map(f => parseFloat(f.price.total)))
          );
        }

      }

      if (prices.length === 0) return null;

      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

      return {
        average: avg
      };
    }

    const enriched = await Promise.all(filtered.map(async route => {

      const cash = await getCashPrice(route.from, route.destinationCode);

      const mrRequired = Math.ceil(route.points * 1.5);
      const mrMissing = Math.max(0, mrRequired - parsedMaxMR);

      let value = 0;

      if (cash) {
        value = ((cash.average - route.taxes) / route.points) * 100;
      }

      return {
        ...route,
        cashAverage: cash ? cash.average.toFixed(2) : "N/A",
        estimatedValue: value.toFixed(2),
        mrRequired,
        mrMissing
      };

    }));

    // best value
    const bestValue = Math.max(...enriched.map(r => parseFloat(r.estimatedValue)));

    enriched.forEach(r => {

      const val = parseFloat(r.estimatedValue);

      r.valuePercent = bestValue > 0
        ? Math.round((val / bestValue) * 100)
        : 0;

    });

    // ordinamento
    enriched.sort((a, b) => b.valuePercent - a.valuePercent);

    const bookable = enriched.filter(r => r.mrMissing === 0);
    const almost = enriched.filter(r => r.mrMissing > 0 && r.mrMissing < 20000);
    const future = enriched.filter(r => r.mrMissing >= 20000);

    // 🔥 best deals globali
    const bestDeals = [...enriched]
      .filter(r => parseFloat(r.estimatedValue) > 0)
      .slice(0, 5);

    return res.status(200).json({
      sections: { bookable, almost, future },
      bestDeals
    });

  } catch (error) {

    return res.status(500).json({
      error: "Errore server",
      details: error.message
    });

  }
};
