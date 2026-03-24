export default async function handler(req, res) {

  const { from, dest } = req.query;

  // 🎯 logica Avios (semplificata ma realistica)
  const routes = [
    { from: "MXP", dest: "MAD", points: 15000 },
    { from: "MXP", dest: "LHR", points: 15000 },
    { from: "FCO", dest: "MAD", points: 15000 },
    { from: "FCO", dest: "LHR", points: 15000 }
  ];

  const results = routes
    .filter(r => r.from === from && r.dest === dest)
    .map(r => {

      // prezzo cash stimato medio
      const cash = 90;

      const value = ((cash - 35) / r.points) * 100;

      return {
        ...r,
        cash,
        value: value.toFixed(2),
        taxes: 35
      };
    });

  res.status(200).json(results);
}
