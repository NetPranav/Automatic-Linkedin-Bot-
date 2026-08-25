import re
html = open('feed_html.txt', encoding='utf-8').read()
matches = re.findall(r'<[^>]*aria-label="[^"]*post[^"]*"[^>]*>', html, re.IGNORECASE)
for m in set(matches):
    print("Match:", m)
