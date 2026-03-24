let savedTrips = [];

export default function handler(req, res) {

  if (req.method === "POST") {

    const { email, destination, origin, destCode, cabin, price, value } = req.body;

    savedTrips.push({
      email,
      destination,
      origin,
      destCode,
      cabin,
      price,
      value,
      createdAt: new Date()
    });

    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    return res.status(200).json(savedTrips);
  }

}
