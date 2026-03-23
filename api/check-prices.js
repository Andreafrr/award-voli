let savedTrips = [];

export default async function handler(req, res) {

  for (const trip of savedTrips) {

    // 🔥 simulazione calo prezzo
    const newPrice = Math.random() * 500;

    if (newPrice < trip.price) {

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Viaggi <onboarding@resend.dev>",
          to: trip.email,
          subject: `🔥 Prezzo sceso per ${trip.destination}`,
          html: `
            <h2>Ottima notizia ✈️</h2>
            <p>Il prezzo per ${trip.destination} è sceso!</p>
          `
        })
      });

    }

  }

  res.status(200).json({ success: true });

}
