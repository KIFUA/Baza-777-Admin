const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const settingsCode = `
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

function getSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {
    return {
      mondayEmails: "",
      wednesdayEmails: "",
      mondayTelegramIds: "",
      wednesdayTelegramIds: "",
      botToken: "",
      appPassword: ""
    };
  }
}

app.get("/api/settings/notifications", (req, res) => {
  res.json(getSettings());
});

app.post("/api/settings/notifications", (req, res) => {
  const settings = req.body;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  res.json({ success: true });
});

`;

const newContent = content.replace('app.get("/api/health",', settingsCode + 'app.get("/api/health",');
fs.writeFileSync('server.ts', newContent);

const cronInitCode = `
  await ensureInitialSync();

  initBirthdayCron(getBirthdaysForThisWeek, getSettings);
`;

const finalContent = fs.readFileSync('server.ts', 'utf8').replace('  await ensureInitialSync();', cronInitCode);
fs.writeFileSync('server.ts', finalContent);

