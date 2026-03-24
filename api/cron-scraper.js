import fs from "fs";

export default async function handler(req, res){

  const routes = [
    { from: "MXP", to: "JFK" },
    { from: "MXP", to: "NRT" },
    { from: "FCO", to: "DXB" }
  ];

  let data = [];

  try{
    data = JSON.parse(fs.readFileSync("./data/awards.json"));
  }catch{}

  // 🔥 simulazione (poi mettiamo scraping vero)
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

  fs.writeFileSync("./data/awards.json", JSON.stringify(data, null, 2));

  res.status(200).json({success:true, added:routes.length});
}
