
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
