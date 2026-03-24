let data = [];

export default async function handler(req, res){

  const routes = [
    { from: "MXP", to: "JFK" },
    { from: "MXP", to: "NRT" },
    { from: "FCO", to: "DXB" }
  ];

  routes.forEach(r=>{

    const points = Math.floor(Math.random()*30000)+40000;

    data.push({
      from: r.from,
      to: r.to,
      date: "2026-05-15",
      points,
      timestamp: new Date()
    });

  });

  res.status(200).json({
    success:true,
    data
  });
}
