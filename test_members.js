import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/members');
    console.log("Status of local /api/members:", res.status);
    const data = await res.json();
    console.log("Total members returned:", data.length);
    if (data.length > 0) {
      console.log("Sample member:", data[0]);
    }
  } catch (err) {
    console.error("Error fetching local members:", err);
  }
}
main();
