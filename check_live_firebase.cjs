const fs = require('fs');

async function main() {
  const url = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app/members.json?auth=CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data) {
    console.log("No data returned from Firebase RTDB!");
    return;
  }
  
  const keys = Object.keys(data);
  console.log("Firebase RTDB total members:", keys.length);
  
  let activeTotal = 0;
  let activeWithOpika = 0;
  let activeWith4Opika = 0;
  let activeWithNoOpika = 0;
  
  keys.forEach(id => {
    const m = data[id];
    if (!m) return;
    const struct = m["04_STRUCTURA"] || {};
    const vybuv = m["06_VYBUTTYA"] || {};
    
    const id_vybuttya = Number(vybuv["id_vybuttya"] || vybuv["id_vybyttya"] || m["id_vybuttya"] || 0);
    const isActive = id_vybuttya === 0;
    
    if (isActive) {
      activeTotal++;
      const opika = struct["opika"];
      const opika4 = struct["4_opika"];
      
      if (opika) {
        activeWithOpika++;
      } else if (opika4) {
        activeWith4Opika++;
      } else {
        activeWithNoOpika++;
      }
    }
  });
  
  console.log("Active total:", activeTotal);
  console.log("Active with 'opika' field:", activeWithOpika);
  console.log("Active with '4_opika' field (legacy):", activeWith4Opika);
  console.log("Active with NO opika / caretaker:", activeWithNoOpika);
}

main().catch(err => console.error(err));
