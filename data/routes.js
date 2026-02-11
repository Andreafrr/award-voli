export const routes = [

  // EUROPA
  {
    from: "MXP",
    region: "Europa",
    destination: "Madrid",
    program: "Avios (Iberia / BA)",
    cabin: "Economy",
    points: 15000,
    taxes: 35,
    cashMin: 80,
    cashMax: 180,
    bestSeason: "Tutto l’anno",
    difficulty: 1,
    estimatedValue: 1.8
  },
  {
    from: "FCO",
    region: "Europa",
    destination: "Parigi",
    program: "Flying Blue",
    cabin: "Economy",
    points: 12000,
    taxes: 40,
    cashMin: 90,
    cashMax: 200,
    bestSeason: "Primavera / Autunno",
    difficulty: 1,
    estimatedValue: 1.9
  },

  // USA
  {
    from: "MXP",
    region: "Nord America",
    destination: "New York",
    program: "Flying Blue",
    cabin: "Economy",
    points: 35000,
    taxes: 180,
    cashMin: 550,
    cashMax: 900,
    bestSeason: "Ottobre - Marzo",
    difficulty: 2,
    estimatedValue: 2.4
  },
  {
    from: "FCO",
    region: "Nord America",
    destination: "Boston",
    program: "ITA Volare",
    cabin: "Economy",
    points: 40000,
    taxes: 120,
    cashMin: 500,
    cashMax: 850,
    bestSeason: "Gennaio - Aprile",
    difficulty: 2,
    estimatedValue: 2.2
  },

  // MEDIO ORIENTE
  {
    from: "MXP",
    region: "Medio Oriente",
    destination: "Dubai",
    program: "Emirates Skywards",
    cabin: "Economy",
    points: 45000,
    taxes: 250,
    cashMin: 450,
    cashMax: 750,
    bestSeason: "Novembre - Marzo",
    difficulty: 2,
    estimatedValue: 1.7
  },

  // ASIA
  {
    from: "FCO",
    region: "Asia",
    destination: "Singapore",
    program: "Singapore KrisFlyer",
    cabin: "Economy",
    points: 50000,
    taxes: 180,
    cashMin: 650,
    cashMax: 1100,
    bestSeason: "Febbraio - Maggio",
    difficulty: 3,
    estimatedValue: 2.8
  },
  {
    from: "MXP",
    region: "Asia",
    destination: "Tokyo",
    program: "Flying Blue",
    cabin: "Economy",
    points: 45000,
    taxes: 200,
    cashMin: 600,
    cashMax: 1000,
    bestSeason: "Gennaio - Marzo",
    difficulty: 2,
    estimatedValue: 2.6
  }

];
