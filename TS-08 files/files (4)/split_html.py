import os

input_file = "C:/Lakshya TS-08/TS-08 files/files (4)/forest-rights-ledger (1).html"
output_dir = "C:/Lakshya TS-08/TS-08 files/files (4)/"

with open(input_file, 'r', encoding='utf-8') as f:
    text = f.read()

style_start = text.find('<style>')
style_end = text.find('</style>')
css = text[style_start + 7:style_end]

script_start = text.rfind('<script>')
script_end = text.rfind('</script>')
js = text[script_start + 8:script_end]

html_start = text.find('<body>') + 6
html_end = script_start
html_content = text[html_start:html_end].strip()

new_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VanAdhikar — Community Forest Rights Ledger</title>
<link href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<link rel="stylesheet" href="style.css">
</head>
<body>
{html_content}
<script src="app.js"></script>
</body>
</html>"""

with open(os.path.join(output_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(new_html)

with open(os.path.join(output_dir, 'style.css'), 'w', encoding='utf-8') as f:
    f.write(css)

with open(os.path.join(output_dir, 'app.js'), 'w', encoding='utf-8') as f:
    f.write(js)

print('Split complete.')
