const { routes } = require("../data/routes.js")

const cache = {}
const CACHE_TTL = 30 * 60 * 1000

function getMRRequired(program, airlinePoints){

const rates={
"Avios (Iberia / BA)":5/4,
"Flying Blue":3/2,
"Emirates Skywards":5/2,
"Singapore KrisFlyer":3/2,
"ITA Volare":1
}

const rate=rates[program]||1
return Math.ceil(airlinePoints*rate)

}

function estimatePoints(region){

if(region==="Europa") return 15000
if(region==="Nord America") return 35000
if(region==="Asia") return 45000
if(region==="Medio Oriente") return 40000

return 45000

}

module.exports = async function handler(req,res){

try{

const {from,maxMR,date}=req.query

const parsedMaxMR=parseInt(maxMR)

const key=process.env.AMADEUS_API_KEY
const secret=process.env.AMADEUS_API_SECRET

const tokenResponse=await fetch(
"https://test.api.amadeus.com/v1/security/oauth2/token",
{
method:"POST",
headers:{"Content-Type":"application/x-www-form-urlencoded"},
body:`grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
}
)

const tokenData=await tokenResponse.json()
const accessToken=tokenData.access_token

async function discoverDestinations(origin){

const response=await fetch(
`https://test.api.amadeus.com/v1/shopping/flight-destinations?origin=${origin}`,
{headers:{Authorization:`Bearer ${accessToken}`}}
)

const data=await response.json()

if(!data.data) return []

return data.data.slice(0,15)

}

const discovered=await discoverDestinations(from)

const staticRoutes=routes.filter(r=>r.from===from)

const dynamicRoutes=discovered.map(d=>({

from:from,

destinationCode:d.destination,
destination:d.destination,

region:"Unknown",

program:"Flying Blue",

cabin:"Economy",

points:45000,

taxes:200,

difficulty:2

}))

const filtered=[...staticRoutes,...dynamicRoutes]

async function getCashRange(origin,destination){

const cacheKey=`${origin}-${destination}`
const now=Date.now()

if(cache[cacheKey]&&(now-cache[cacheKey].timestamp<CACHE_TTL)){
return cache[cacheKey].data
}

let dates=[]

if(date){
dates=[date]
}else{

const today=new Date()

for(let i=1;i<=3;i++){

const future=new Date(today)
future.setDate(today.getDate()+i*20)

dates.push(future.toISOString().split("T")[0])

}

}

const prices=await Promise.all(dates.map(async(d)=>{

const response=await fetch(
`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${d}&adults=1&max=3`,
{headers:{Authorization:`Bearer ${accessToken}`}}
)

const data=await response.json()

if(data.data&&data.data.length>0){
return Math.min(...data.data.map(f=>parseFloat(f.price.total)))
}

return null

}))

const valid=prices.filter(p=>p!==null)

if(valid.length===0) return null

const min=Math.min(...valid)
const max=Math.max(...valid)
const avg=valid.reduce((a,b)=>a+b,0)/valid.length

const result={min,max,average:avg}

cache[cacheKey]={timestamp:now,data:result}

return result

}

const enriched=await Promise.all(filtered.map(async(route)=>{

const cashData=await getCashRange(route.from,route.destinationCode)

const points=route.points||estimatePoints(route.region)

const mrRequired=getMRRequired(route.program,points)

const mrMissing=mrRequired-parsedMaxMR

let value=0

if(cashData&&cashData.average){
value=((cashData.average-route.taxes)/points)*100
}

return{

...route,

destination:route.destination||route.destinationCode,

points,

mrRequired,

mrMissing,

estimatedValue:value.toFixed(2),

cashMin:cashData?cashData.min.toFixed(2):"N/A",

cashMax:cashData?cashData.max.toFixed(2):"N/A",

cashAverage:cashData?cashData.average:0

}

}))

enriched.sort((a,b)=>parseFloat(b.estimatedValue)-parseFloat(a.estimatedValue))

const bookable=enriched.filter(r=>r.mrMissing<=0)

const almost=enriched.filter(r=>r.mrMissing>0&&r.mrMissing<=20000)

const future=enriched.filter(r=>r.mrMissing>20000)

return res.status(200).json({

sections:{
bookable,
almost,
future
}

})

}catch(error){

return res.status(500).json({
error:"Errore interno server",
details:error.message
})

}

}
