import os
files = [
    'd:/Projects/postiz-app/.env.example',
    'd:/Projects/postiz-app/docker-compose.yaml',
    'd:/Projects/postiz-app/docker-compose.dev.yaml',
    'd:/Projects/postiz-app/railway.toml'
]
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('POSTIZ_', 'LIGHTCIRCLE_')
        content = content.replace('postiz', 'lightcircle')
        content = content.replace('Postiz', 'LightCircle')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
    except Exception as e:
        print(f"Failed to process {f}: {e}")
