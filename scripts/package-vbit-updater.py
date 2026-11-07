"""Build the small receiver updater download using only the Python standard library."""
from pathlib import Path
import argparse, zipfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    archive.write(root/'scripts/update-teletext.py','update.py')
    archive.write(root/'docs/VBIT-UPDATER-README.md','README.md')
print('Built live VBIT updater package')
