with open("apps/web/src/app/(dashboard)/home/page.tsx", "r") as f:
    content = f.read()

content = content.replace("[] as any[].filter", "([] as any[]).filter")
content = content.replace("const topMatches = getTopMatches(4)", "const topMatches = [] as any[]")
content = content.replace("const topMatches = getTopMatches()", "const topMatches = [] as any[]")

with open("apps/web/src/app/(dashboard)/home/page.tsx", "w") as f:
    f.write(content)

