import { execSync } from "child_process";

try {
  console.log("=== Git commits affecting db_cache.json ===");
  const log = execSync("git log --oneline -n 20 -- db_cache.json", { encoding: "utf8" });
  console.log(log);

  console.log("\n=== Checking git diff for access_dostup changes ===");
  // Search the git commit logs for "access_dostup" in db_cache.json
  const diff = execSync("git log -S \"access_dostup\" --oneline", { encoding: "utf8" });
  console.log(diff);

  // Let's print the previous version of db_cache.json before the last commit where it changed,
  // or let's search git show HEAD:db_cache.json or HEAD~1:db_cache.json etc. for "password".
  for (let i = 0; i < 15; i++) {
    try {
      console.log(`Checking HEAD~${i}:db_cache.json...`);
      const content = execSync(`git show HEAD~${i}:db_cache.json`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
      if (content.includes("access_dostup") && content.includes("Бурчак") && content.includes("Скіцко")) {
         console.log(`  -> FOUND candidates in HEAD~${i}!`);
         // Parse it and look at access_dostup
         const parsed = JSON.parse(content);
         if (parsed.access_dostup && parsed.access_dostup.length > 1) {
            console.log(`  -> Found ${parsed.access_dostup.length} users! First few:`, parsed.access_dostup.slice(0, 3));
         }
      }
    } catch (e) {
      console.log(`  HEAD~${i} search error: ${e.message}`);
    }
  }

} catch (err) {
  console.error("Git execution failed:", err.message);
}
