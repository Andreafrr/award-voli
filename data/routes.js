const routes = [

  // EUROPA
  {
    from: "MXP",
    destinationCode: "MAD",
    region: "Europa",
    destination: "Madrid",
    program: "Avios (Iberia / BA)",
    cabin: "Economy",
    points: 15000,
    taxes: 35,
    bestSeason: "Tutto l’anno",
    difficulty: 1,
    estimatedValue: 1.8
  },
  {
    from: "FCO",
    destinationCode: "CDG",
    region: "Europa",
    destination: "Parigi",
    program: "Flying Blue",
    cabin: "Economy",
    points: 12000,
    taxes: 40,
    bestSeason: "Primavera / Autunno",
    difficulty: 1,
    estimatedValue: 1.9
  },

  // USA
  {
    from: "MXP",
    destinationCode: "JFK",
    region: "Nord America",
    destination: "New York",
    program: "Flying Blue",
    cabin: "Economy",
    points: 35000,
    taxes: 180,
    bestSeason: "Ottobre - Marzo",
    difficulty: 2,
    estimatedValue: 2.4
  },
  {
    from: "FCO",
    destinationCode: "BOS",
    region: "Nord America",
    destination: "Boston",
    program: "ITA Volare",
    cabin: "Economy",
    points: 40000,
    taxes: 120,
    bestSeason: "Gennaio - Aprile",
    difficulty: 2,
    estimatedValue: 2.2
  },

  // MEDIO ORIENTE
  {
    from: "MXP",
    destinationCode: "DXB",
    region: "Medio Oriente",
    destination: "Dubai",
    program: "Emirates Skywards",
    cabin: "Economy",
    points: 45000,
    taxes: 250,
    bestSeason: "Novembre - Marzo",
    difficulty: 2,
    estimatedValue: 1.7
  },

  // ASIA
  {
    from: "FCO",
    destinationCode: "SIN",
    region: "Asia",
    destination: "Singapore",
    program: "Singapore KrisFlyer",
    cabin: "Economy",
    points: 50000,
    taxes: 180,
    bestSeason: "Febbraio - Maggio",
    difficulty: 3,
    estimatedValue: 2.8
  },
  {
    from: "MXP",
    destinationCode: "NRT",
    region: "Asia",
    destination: "Tokyo",
    program: "Flying Blue",
    cabin: "Economy",
    points: 45000,
    taxes: 200,
    bestSeason: "Gennaio - Marzo",
    difficulty: 2,
    estimatedValue: 2.6
  }

];
module.exports = { routes };
