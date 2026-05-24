"""
Fix mojibake in TSX/TS source files.
UTF-8 bytes were read as Windows-1252, re-saved as UTF-8.
Fix: encode corrupted string back to cp1252 bytes, decode as UTF-8.
ASCII-only characters pass through unchanged (same in all encodings).
"""
import os
import sys

AFFECTED = [
    r"app\admin\challenges\page.tsx",
    r"app\admin\events\page.tsx",
    r"app\admin\page.tsx",
    r"app\admin\players\page.tsx",
    r"app\api\admin\generate-challenge\route.ts",
    r"app\api\ranked\cancel\route.ts",
    r"app\api\ranked\submit\route.ts",
    r"app\auth\login\page.tsx",
    r"app\auth\signup\page.tsx",
    r"app\dashboard\page.tsx",
    r"app\how-to-play\page.tsx",
    r"app\leaderboard\page.tsx",
    r"app\play\[challengeId]\page.tsx",
    r"app\play\page.tsx",
    r"app\profile\[username]\page.tsx",
    r"app\profile\page.tsx",
    r"app\shop\page.tsx",
    r"app\support\page.tsx",
    r"app\tokens\page.tsx",
]

BASE = os.path.dirname(os.path.abspath(__file__))

def fix_mojibake(text):
    """Re-encode cp1252 mojibake back to proper UTF-8 string."""
    try:
        return text.encode('cp1252').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        # Partial fix: go char by char, fix what we can
        result = []
        i = 0
        while i < len(text):
            fixed = False
            for length in [4, 3, 2]:
                end = i + length
                if end <= len(text):
                    chunk = text[i:end]
                    try:
                        decoded = chunk.encode('cp1252').decode('utf-8')
                        # Only accept if it changed something (i.e. was actually mojibake)
                        if decoded != chunk:
                            result.append(decoded)
                            i = end
                            fixed = True
                            break
                    except (UnicodeDecodeError, UnicodeEncodeError):
                        pass
            if not fixed:
                result.append(text[i])
                i += 1
        return ''.join(result)

changed = 0
for rel_path in AFFECTED:
    full_path = os.path.join(BASE, rel_path)
    if not os.path.exists(full_path):
        print(f"MISSING: {rel_path}")
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        original = f.read()

    fixed = fix_mojibake(original)

    if fixed == original:
        print(f"OK (no change): {rel_path}")
    else:
        # Write back as UTF-8 without BOM
        with open(full_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(fixed)
        changed += 1
        print(f"FIXED: {rel_path}")

print(f"\nDone. {changed} file(s) updated.")
