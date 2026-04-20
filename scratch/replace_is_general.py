import os
import re

directories = ['d:/Projects/postiz-app/apps', 'd:/Projects/postiz-app/libraries']

pattern1 = re.compile(r"isGeneral\s*\?\s*['\"](\s*)Postiz['\"]\s*:\s*['\"](\s*)Gitroom['\"]")
pattern2 = re.compile(r"isGeneral\s*\?\s*['\"](\s*)Gitroom['\"]\s*:\s*['\"](\s*)Postiz['\"]")

count = 0
for d in directories:
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                new_content = pattern1.sub(r"'\1LightCircle'", content)
                new_content = pattern2.sub(r"'\1LightCircle'", new_content)
                
                if content != new_content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f"Updated {path}")
                    count += 1

print(f"Total files updated: {count}")
