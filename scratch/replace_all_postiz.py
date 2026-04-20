import os
import re

directories = ['d:/Projects/postiz-app/apps', 'd:/Projects/postiz-app/libraries']

patterns = [
    (re.compile(r"isGeneralServerSide\(\)\s*\?\s*['\"](\s*)Postiz(?: Calendar)?['\"]\s*:\s*['\"](?:.*)['\"]"), r"'\1LightCircle'"),
    (re.compile(r"isGeneralServerSide\(\)\s*\?\s*['\"](\s*)Postiz(?:.*)['\"]\s*:\s*['\"](?:.*)['\"]"), r"'\1LightCircle'"),
    (re.compile(r"\$\{isGeneralServerSide\(\)\s*\?\s*['\"](\s*)Postiz['\"]\s*:\s*['\"](?:.*)['\"]\}"), r"LightCircle"),
    (re.compile(r"isGeneral\s*\?\s*['\"](\s*)Postiz['\"]\s*:\s*['\"](?:.*)['\"]"), r"'\1LightCircle'"),
    (re.compile(r"isGeneral\s*\?\s*t\('([^']*)',\s*'([^']*)'\)\s*:\s*t\('([^']*)',\s*'([^']*)'\)"), lambda m: f"t('{m.group(1)}', '{m.group(2)}')"),
]

simple_replacements = [
    ('Postiz', 'LightCircle'),
    ('postiz', 'lightcircle'),
    ('POSTIZ', 'LIGHTCIRCLE')
]

count = 0
for d in directories:
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith(('.tsx', '.ts', '.json', '.html')):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    try:
                        content = file.read()
                    except:
                        continue
                
                new_content = content
                for pattern, repl in patterns:
                    new_content = pattern.sub(repl, new_content)
                
                for old, new in simple_replacements:
                    new_content = new_content.replace(old, new)
                
                if content != new_content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f"Updated {path}")
                    count += 1

print(f"Total files updated: {count}")
