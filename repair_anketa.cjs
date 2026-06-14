const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repairPythonCode = `
import zipfile
import os

def repair_xlsx(src_path, dst_path):
    print(f"Repairing {src_path} -> {dst_path}")
    try:
        with zipfile.ZipFile(src_path, 'r') as zin:
            with zipfile.ZipFile(dst_path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    try:
                        data = zin.read(item.filename)
                        zout.writestr(item, data)
                    except Exception as e:
                        print(f"  Error reading/writing {item.filename}: {e}")
        print("  Successfully repaired.")
        return True
    except Exception as e:
        print(f"  Failed to repair {src_path}: {e}")
        return False

# Repair anketa.xlsx
repair_xlsx('/app/applet/tablyci/anketa.xlsx', '/app/applet/tablyci/anketa_repaired.xlsx')
# Repair z_1.xlsx
repair_xlsx('/app/applet/tablyci/z_1.xlsx', '/app/applet/tablyci/z_1_repaired.xlsx')
`;

fs.writeFileSync('/app/applet/repair.py', repairPythonCode, 'utf8');

try {
  console.log('Running python repair script...');
  const out = execSync('python3 /app/applet/repair.py', { encoding: 'utf8' });
  console.log('Python Output:\n', out);

  // If successfully repaired, backup original and replace!
  if (fs.existsSync('/app/applet/tablyci/anketa_repaired.xlsx')) {
    const origSize = fs.statSync('/app/applet/tablyci/anketa.xlsx').size;
    const repSize = fs.statSync('/app/applet/tablyci/anketa_repaired.xlsx').size;
    console.log(`anketa.xlsx: original size = ${origSize}, repaired size = ${repSize}`);
    
    fs.renameSync('/app/applet/tablyci/anketa.xlsx', '/app/applet/tablyci/anketa.xlsx.bak');
    fs.renameSync('/app/applet/tablyci/anketa_repaired.xlsx', '/app/applet/tablyci/anketa.xlsx');
    console.log('Replaced anketa.xlsx with repaired version.');
  }

  if (fs.existsSync('/app/applet/tablyci/z_1_repaired.xlsx')) {
    const origSize = fs.statSync('/app/applet/tablyci/z_1.xlsx').size;
    const repSize = fs.statSync('/app/applet/tablyci/z_1_repaired.xlsx').size;
    console.log(`z_1.xlsx: original size = ${origSize}, repaired size = ${repSize}`);
    
    fs.renameSync('/app/applet/tablyci/z_1.xlsx', '/app/applet/tablyci/z_1.xlsx.bak');
    fs.renameSync('/app/applet/tablyci/z_1_repaired.xlsx', '/app/applet/tablyci/z_1.xlsx');
    console.log('Replaced z_1.xlsx with repaired version.');
  }

} catch (err) {
  console.error('Error during repair:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout);
  if (err.stderr) console.log('Stderr:', err.stderr);
}
