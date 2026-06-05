import fetch from 'node-fetch';

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const baseUrl = `https://baza-777-default-rtdb.europe-west1.firebasedatabase.app/members.json?auth=${DB_SECRET}`;

async function main() {
    const res = await fetch(baseUrl);
    const data = await res.json();
    
    // Check person 14
    console.log("Person 14 Family Status:");
    if (data["14"]) {
        console.log(data["14"]["02_OSOBYSTE"]["5_povna_simya"]);
        console.log("Partner ID:", data["14"]["02_OSOBYSTE"]["partner_id"]);
        console.log("raw:", data["14"]["02_OSOBYSTE"]);
    } else {
        console.log("Person 14 not found in firebase");
    }

    // Check person 144
    console.log("Person 144 Family:");
    if (data["144"]) {
        console.log("Partner ID:", data["144"]["02_OSOBYSTE"]["partner_id"]);
    }
}
main();
