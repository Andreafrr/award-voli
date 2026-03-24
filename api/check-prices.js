let savedTrips = [];

export default async function handler(req, res) {

  try {

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

    for (const trip of savedTrips) {

      const response = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${trip.origin}&destinationLocationCode=${trip.destCode}&adults=1&max=3`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const data = await response.json();

      if (!data.data || data.data.length === 0) continue;

      const prices = data.data.map(f => parseFloat(f.price.total));
      const newPrice = Math.min(...prices);

      // 🎯 nuova value
      const newValue = ((newPrice - 100) / 50000) * 100;

      let sendEmail = false;
      let reason = "";

      // 🔥 prezzo sceso
      if (newPrice < trip.price * 0.85) {
        sendEmail = true;
        reason = "Prezzo sceso";
      }

      // 🔥 valore migliorato
      if (newValue > trip.value * 1.2) {
        sendEmail = true;
        reason = "Valore migliorato";
      }

      if (sendEmail) {

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Viaggi <onboarding@resend.dev>",
            to: trip.email,
            subject: `🔥 ${reason} per ${trip.destination}`,
            html: `
              <h2>Ottima notizia ✈️</h2>
              <p>${trip.destination}</p>
              <p>Prezzo: €${newPrice}</p>
            `
          })
        });

      }

    }

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

}
