import fetch from 'node-fetch';

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const baseUrl = `https://baza-777-default-rtdb.europe-west1.firebasedatabase.app/members.json?auth=${DB_SECRET}`;

async function healMarriages() {
    console.log("Fetching members...");
    const res = await fetch(baseUrl);
    const data = await res.json();
    
    let updates = {};
    let fixCount = 0;

    for (const [key, member] of Object.entries(data)) {
        if (!member || !member["02_OSOBYSTE"] || !member["02_OSOBYSTE"]["4_shlyub_history"]) continue;
        
        let history = member["02_OSOBYSTE"]["4_shlyub_history"];
        if (!Array.isArray(history)) continue;

        if (history.length > 1) {
            // Find duplicates or empty ones
            // We want to keep real links.
            let valid = history.filter(h => h.podruzhzhya_id || h.podrujya_id);
            let noLink = history.filter(h => !h.podruzhzhya_id && !h.podrujya_id && h.status !== 'неодруж.' && h.status !== 'неодр.');
            
            if (valid.length > 0) {
                // If we have at least one valid, and we had multiple, just take the valid ones.
                // If there are multiple valid? Keep them all. 
                // But if valid.length == 1 and history.length > 1? We can reduce history to just `valid`.
                if (valid.length !== history.length) {
                    updates[`${key}/02_OSOBYSTE/4_shlyub_history`] = valid;
                    fixCount++;
                    console.log(`Fixing member ${key} (${member['01_PIB']}): keeping ${valid.length} valid marriage(s) out of ${history.length} total.`);
                }
            } else if (history.length > 1) {
               // all are invalid, just take the last one
               updates[`${key}/02_OSOBYSTE/4_shlyub_history`] = [history[history.length - 1]];
               fixCount++;
               console.log(`Fixing member ${key} (${member['01_PIB']}): all empty, taking last.`);
            }
        }
    }

    if (fixCount > 0) {
        console.log(`Sending PATCH request with ${fixCount} fixes...`);
        const patchRes = await fetch(baseUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const patchResult = await patchRes.json();
        console.log("PATCH status:", patchRes.status);
    } else {
        console.log("No marriage fixes needed.");
    }
}

healMarriages().catch(console.error);
