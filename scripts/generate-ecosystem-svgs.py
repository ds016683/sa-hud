#!/usr/bin/env python3
"""Generate ecosystem SVGs for SA-HUD Ecosystem tab.

Outputs:
  public/ecosystem/org-chart.svg   -- Discord org chart, 9 parents + children
  public/ecosystem/domain-map.svg  -- bots placed by domain

Run: python3 scripts/generate-ecosystem-svgs.py
"""
from __future__ import annotations
import math
import os
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "ecosystem"
OUT.mkdir(parents=True, exist_ok=True)

# TH brand palette
NAVY = "#002C77"
SKY = "#009DE0"
GOLD = "#FF8C00"          # Sovereign-Architect accent (Lumen + Vela)
GREEN = "#00968F"
RED = "#EF4E45"
AMBER = "#FFBE00"
PANEL_BG = "#FFFFFF"
PAGE_BG = "#F7F9FC"
BORDER = "#E2E8F0"
TEXT = "#002C77"
TEXT_MUTED = "#334E85"
TEXT_DIM = "#6B8CBE"

# Discord-category color tagging for parents (per spec)
CAT_COLOR = {
    "core":     GOLD,       # lumen, vela (Sovereign-Architect class)
    "ops":      "#2D6CDF",
    "clients":  "#7C3AED",
    "creative": "#DB2777",
    "growth":   "#10B981",
    "strategy": "#0EA5E9",
    "safety":   RED,
    "finance":  "#92400E",
}

# Spec-defined parent → sub-agent map (verbatim)
PARENTS = [
    ("lumen",               "Lumen",                 "core",     ["lumen", "lumen-th"]),
    ("vela",                "Vela",                  "core",     ["vela"]),
    ("mr-cco",              "Mr. CCO",               "clients",  ["mr-mma", "mr-achp", "mr-pomegranate", "mr-purple"]),
    ("mr-coo",              "Mr. COO",               "ops",      ["mr-harvest", "mr-pulse", "mr-task"]),
    ("chief-creative-bot",  "Chief Creative",        "creative", ["mr-hfma", "mr-wellness", "mr-diablo", "mr-tcoc", "mr-baseball"]),
    ("chief-growth-bot",    "Chief Growth",          "growth",   ["mr-relationship"]),
    ("chief-strategy-bot",  "Chief Strategy",        "strategy", ["mr-framework", "mr-strategist"]),
    ("safety-net-bot",      "Safety Net",            "safety",   ["mr-snmi", "mr-snh"]),
    ("mr-ledger",           "Mr. Ledger",            "finance",  ["mr-ledger-personal", "mr-ledger-th"]),
]

# Domain map placement: which functional bucket each bot lives in.
# Domains: Strategy / Client Work / Ops / Growth / Personal / Safety / Finance
DOMAIN_LAYOUT = {
    "Strategy":     ["lumen", "chief-strategy-bot", "mr-framework", "mr-strategist"],
    "Client Work":  ["mr-cco", "mr-mma", "mr-achp", "mr-pomegranate", "mr-purple", "chief-creative-bot", "mr-hfma", "mr-wellness", "mr-diablo", "mr-tcoc", "mr-baseball"],
    "Ops":          ["mr-coo", "mr-harvest", "mr-pulse", "mr-task"],
    "Growth":       ["chief-growth-bot", "mr-relationship"],
    "Personal":     ["vela", "lumen-th"],
    "Safety":       ["safety-net-bot", "mr-snmi", "mr-snh"],
    "Finance":      ["mr-ledger", "mr-ledger-personal", "mr-ledger-th"],
}

# Tag every bot as parent or sub for sizing
PARENT_IDS = {p[0] for p in PARENTS}


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def label_for(slug: str) -> str:
    # pretty label fallback
    for p in PARENTS:
        if p[0] == slug:
            return p[1]
        if slug in p[3]:
            # sub-agent: keep slug
            return slug
    return slug


def node(cx: float, cy: float, slug: str, color: str, is_parent: bool, accent: bool = False) -> str:
    r = 38 if is_parent else 22
    stroke = GOLD if accent else NAVY
    stroke_w = 3 if accent else 1.5
    fill = color
    label = label_for(slug)
    label_y = cy + r + 16 if is_parent else cy + r + 12
    font_size = 13 if is_parent else 11
    weight = 700 if is_parent else 500
    return f'''  <g id="bot-{slug}" class="clickable" data-slug="{slug}" data-kind="{'parent' if is_parent else 'sub'}">
    <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" />
    <text x="{cx:.1f}" y="{cy+4:.1f}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="{font_size-2}" font-weight="700" fill="white">{esc(slug.replace('chief-','').replace('-bot','').replace('mr-','')[:6].upper())}</text>
    <text x="{cx:.1f}" y="{label_y:.1f}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="{font_size}" font-weight="{weight}" fill="{TEXT}">{esc(label)}</text>
  </g>'''


def line(x1: float, y1: float, x2: float, y2: float, color: str = BORDER) -> str:
    return f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="1.5" />'


def legend(x: float, y: float, items: list[tuple[str, str]]) -> str:
    parts = [f'<g id="legend" transform="translate({x},{y})">']
    parts.append(f'<rect x="-12" y="-22" width="220" height="{24*len(items)+24}" rx="8" fill="{PANEL_BG}" stroke="{BORDER}" />')
    parts.append(f'<text x="0" y="-4" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">LEGEND</text>')
    for i, (label, color) in enumerate(items):
        cy = i * 24 + 14
        parts.append(f'<circle cx="8" cy="{cy}" r="7" fill="{color}" stroke="{NAVY}" stroke-width="1" />')
        parts.append(f'<text x="24" y="{cy+4}" font-family="Arial,Helvetica,sans-serif" font-size="12" fill="{TEXT}">{esc(label)}</text>')
    parts.append('</g>')
    return "\n  ".join(parts)


# ─── Org Chart ───────────────────────────────────────────────────────────
def build_org_chart() -> str:
    W, H = 1600, 1100
    # Layout: 9 parents on a grid 3x3-ish, sub-agents fanned below each.
    # Manual placement so it reads well.
    parent_pos = {
        "lumen":              (260,  220),
        "vela":               (1340, 220),
        "mr-coo":             (260,  580),
        "mr-cco":             (800,  220),
        "chief-creative-bot": (800,  580),
        "chief-growth-bot":   (1340, 580),
        "chief-strategy-bot": (260,  900),
        "safety-net-bot":     (800,  900),
        "mr-ledger":          (1340, 900),
    }
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" preserveAspectRatio="xMidYMid meet">']
    svg.append(f'<rect width="{W}" height="{H}" fill="{PAGE_BG}"/>')
    # Title
    svg.append(f'<text x="40" y="50" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="{TEXT}">Lumen OS — Discord Org Chart</text>')
    svg.append(f'<text x="40" y="74" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{TEXT_MUTED}">9 parent bots · color-coded by Discord category · click any node for profile</text>')

    # Draw connections first (under nodes)
    for slug, label, cat, subs in PARENTS:
        px, py = parent_pos[slug]
        n = len(subs)
        if n == 0:
            continue
        # Fan subs in an arc below the parent (or above if near bottom)
        below = py < H - 220
        radius = 130 if n > 2 else 95
        spread = min(140, 30 + n * 18)  # degrees of arc spread (half-angle)
        # Center angle: down (90deg) or up (-90deg)
        center_deg = 90 if below else -90
        # spread degrees half-width
        if n == 1:
            angles = [center_deg]
        else:
            angles = [center_deg - spread + (2 * spread) * i / (n - 1) for i in range(n)]
        for sub, ang in zip(subs, angles):
            rad = math.radians(ang)
            sx = px + radius * math.cos(rad)
            sy = py + radius * math.sin(rad)
            # don't draw a self-line for parent==sub (lumen/vela)
            if sub != slug:
                svg.append(line(px, py, sx, sy, CAT_COLOR[cat] + "55" if False else BORDER))
            # stash position
            parent_pos[f"__sub__{slug}__{sub}"] = (sx, sy)

    # Draw parent and sub nodes
    for slug, label, cat, subs in PARENTS:
        px, py = parent_pos[slug]
        accent = (cat == "core")
        svg.append(node(px, py, slug, CAT_COLOR[cat], is_parent=True, accent=accent))
        for sub in subs:
            if sub == slug:
                continue  # parent IS the agent (vela/lumen self)
            sx, sy = parent_pos[f"__sub__{slug}__{sub}"]
            svg.append(node(sx, sy, sub, CAT_COLOR[cat], is_parent=False, accent=(sub == "vela")))

    # Legend
    legend_items = [
        ("Core (Sovereign-Architect)", GOLD),
        ("Operations", CAT_COLOR["ops"]),
        ("Clients", CAT_COLOR["clients"]),
        ("Creative", CAT_COLOR["creative"]),
        ("Growth", CAT_COLOR["growth"]),
        ("Strategy", CAT_COLOR["strategy"]),
        ("Safety Net", CAT_COLOR["safety"]),
        ("Finance", CAT_COLOR["finance"]),
    ]
    svg.append(legend(W - 250, 110, legend_items))
    svg.append('</svg>')
    return "\n".join(svg)


# ─── Domain Map ──────────────────────────────────────────────────────────
def build_domain_map() -> str:
    W, H = 1600, 1100
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" preserveAspectRatio="xMidYMid meet">']
    svg.append(f'<rect width="{W}" height="{H}" fill="{PAGE_BG}"/>')
    svg.append(f'<text x="40" y="50" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="{TEXT}">Lumen OS — Domain Map</text>')
    svg.append(f'<text x="40" y="74" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="{TEXT_MUTED}">Bots grouped by function. Hubs are parent bots; satellites are sub-agents.</text>')

    # 7 domains in a 4+3 grid
    domain_order = ["Strategy", "Client Work", "Ops", "Growth", "Personal", "Safety", "Finance"]
    # 4 across top, 3 across bottom
    top_row = domain_order[:4]
    bot_row = domain_order[4:]
    cell_w = W / 4
    top_y = 220
    bot_y = 680
    cell_h = 420

    # Color per domain — same family as org chart but tied to domain semantics
    DOMAIN_COLOR = {
        "Strategy":    CAT_COLOR["strategy"],
        "Client Work": CAT_COLOR["clients"],
        "Ops":         CAT_COLOR["ops"],
        "Growth":      CAT_COLOR["growth"],
        "Personal":    GOLD,
        "Safety":      CAT_COLOR["safety"],
        "Finance":     CAT_COLOR["finance"],
    }

    def draw_domain(name: str, cx: float, cy: float):
        bots = DOMAIN_LAYOUT[name]
        color = DOMAIN_COLOR[name]
        # Domain frame
        svg.append(f'<rect x="{cx-cell_w/2+20}" y="{cy-cell_h/2+20}" width="{cell_w-40}" height="{cell_h-40}" rx="14" fill="{PANEL_BG}" stroke="{color}" stroke-width="2" stroke-opacity="0.35"/>')
        svg.append(f'<text x="{cx}" y="{cy-cell_h/2+50}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="{color}" letter-spacing="2">{esc(name.upper())}</text>')
        # Split bots: parents (hubs) vs subs
        parents_here = [b for b in bots if b in PARENT_IDS]
        subs_here = [b for b in bots if b not in PARENT_IDS]
        # Place parents in a row near the top of the cell
        if parents_here:
            row_y = cy - cell_h/2 + 130
            n = len(parents_here)
            for i, p in enumerate(parents_here):
                x = cx - (cell_w/2 - 80) + (cell_w - 160) * (i + 0.5) / n
                accent = (p in ("lumen", "vela"))
                svg.append(node(x, row_y, p, color, is_parent=True, accent=accent))
        # Subs below in a grid
        if subs_here:
            sub_top = cy - cell_h/2 + 230 if parents_here else cy - cell_h/2 + 120
            cols = min(3, max(1, len(subs_here)))
            for i, s in enumerate(subs_here):
                row = i // cols
                col = i % cols
                row_count = math.ceil(len(subs_here) / cols)
                x = cx - (cell_w/2 - 80) + (cell_w - 160) * (col + 0.5) / cols
                y = sub_top + row * 85
                accent = (s == "vela")
                svg.append(node(x, y, s, color, is_parent=False, accent=accent))

    for i, d in enumerate(top_row):
        cx = cell_w * (i + 0.5)
        draw_domain(d, cx, top_y + cell_h/2 - 40)

    # bottom row: 3 cells, center across full width
    bcell_w = W / 3
    for i, d in enumerate(bot_row):
        cx = bcell_w * (i + 0.5)
        # shift draw_domain to use bcell_w
        bots = DOMAIN_LAYOUT[d]
        color = DOMAIN_COLOR[d]
        cy = bot_y + cell_h/2 - 60
        svg.append(f'<rect x="{cx-bcell_w/2+30}" y="{cy-cell_h/2+20}" width="{bcell_w-60}" height="{cell_h-40}" rx="14" fill="{PANEL_BG}" stroke="{color}" stroke-width="2" stroke-opacity="0.35"/>')
        svg.append(f'<text x="{cx}" y="{cy-cell_h/2+50}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="700" fill="{color}" letter-spacing="2">{esc(d.upper())}</text>')
        parents_here = [b for b in bots if b in PARENT_IDS]
        subs_here = [b for b in bots if b not in PARENT_IDS]
        if parents_here:
            row_y = cy - cell_h/2 + 130
            n = len(parents_here)
            for i2, p in enumerate(parents_here):
                x = cx - (bcell_w/2 - 100) + (bcell_w - 200) * (i2 + 0.5) / n
                accent = (p in ("lumen", "vela"))
                svg.append(node(x, row_y, p, color, is_parent=True, accent=accent))
        if subs_here:
            sub_top = cy - cell_h/2 + 230 if parents_here else cy - cell_h/2 + 120
            cols = min(3, max(1, len(subs_here)))
            for i2, s in enumerate(subs_here):
                row = i2 // cols
                col = i2 % cols
                x = cx - (bcell_w/2 - 100) + (bcell_w - 200) * (col + 0.5) / cols
                y = sub_top + row * 85
                accent = (s == "vela")
                svg.append(node(x, y, s, color, is_parent=False, accent=accent))

    svg.append('</svg>')
    return "\n".join(svg)


def main():
    org = build_org_chart()
    dom = build_domain_map()
    (OUT / "org-chart.svg").write_text(org)
    (OUT / "domain-map.svg").write_text(dom)
    print(f"wrote {OUT/'org-chart.svg'} ({len(org)} bytes)")
    print(f"wrote {OUT/'domain-map.svg'} ({len(dom)} bytes)")


if __name__ == "__main__":
    main()
