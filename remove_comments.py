import re
from pathlib import Path

files = ["index.html", "index.css", "index.js"]


def strip_html_comments(text):
    return re.sub(r'<!--([\s\S]*?)-->', '', text)


def strip_js_css_comments(text):
    out = []
    i = 0
    n = len(text)
    state = 'normal'
    quote = None
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ''
        if state == 'normal':
            if ch == '/' and nxt == '/':
                i += 2
                while i < n and text[i] != '\n':
                    i += 1
                continue
            if ch == '/' and nxt == '*':
                i += 2
                while i < n and not (text[i] == '*' and i + 1 < n and text[i + 1] == '/'):
                    i += 1
                i += 2
                continue
            if ch in ('"', "'", '`'):
                state = 'string'
                quote = ch
                out.append(ch)
                i += 1
                continue
            if ch == '\\':
                out.append(ch)
                i += 1
                if i < n:
                    out.append(text[i])
                    i += 1
                continue
            out.append(ch)
            i += 1
        else:
            out.append(ch)
            if ch == '\\':
                i += 1
                if i < n:
                    out.append(text[i])
                    i += 1
                continue
            if ch == quote:
                state = 'normal'
                quote = None
            i += 1
    return ''.join(out)

for fname in files:
    path = Path(fname)
    text = path.read_text(encoding='utf-8')
    new_text = strip_html_comments(text) if fname.endswith('.html') else strip_js_css_comments(text)
    path.write_text(new_text, encoding='utf-8')
    print(f'{fname} cleaned')
