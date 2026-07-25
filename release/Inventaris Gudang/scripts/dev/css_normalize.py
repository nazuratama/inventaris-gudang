#!/usr/bin/env python3
"""One-off CSS normalization sweep for the Inventaris Gudang UI overhaul."""
import re
from pathlib import Path

STYLES = Path(__file__).resolve().parents[2] / "frontend" / "styles"
FILES = ["base.css", "layout.css", "components.css", "pages.css", "animations.css", "responsive.css"]

def sub(pattern, repl, text, flags=0):
    return re.sub(pattern, repl, text, flags=flags)

def normalize(text: str) -> str:
    # 1. Drop simple var() fallbacks (tokens.css always loads first).
    text = sub(r"var\(--shadow-xs, 0 1px 2px rgb\(24 36 45 / 6%\)\)", "var(--shadow-xs)", text)
    text = sub(r"var\(--shadow-xs, 0 1px 2px rgba\(24, 36, 45, 0\.06\)\)", "var(--shadow-xs)", text)
    text = sub(r"var\(--shadow-md, 0 10px 28px rgba\(24, 36, 45, 0\.12\)\)", "var(--shadow-md)", text)
    text = sub(r"var\(--([a-z0-9-]+),\s*[^()]+\)", r"var(--\1)", text)

    # 2. Font weights -> {400, 600, 700, 800}.
    for old, new in [("650", "600"), ("720", "700"), ("750", "700"), ("760", "700"), ("780", "800")]:
        text = sub(rf"font-weight:\s*{old}\b", f"font-weight: {new}", text)

    # 3. Font sizes -> type scale tokens.
    size_map = {
        "2xs": ["0.62", "0.64", "0.65", "0.66", "0.67", "0.68", "0.69"],
        "xs": ["0.7", "0.72", "0.74", "0.75"],
        "sm": ["0.76", "0.78", "0.8"],
        "base": ["0.82", "0.84", "0.86", "0.88"],
        "md": ["0.9", "0.95"],
        "lg": ["1.05", "1.1", "1.12", "1"],
        "xl": ["1.15", "1.2", "1.25", "1.3", "1.35"],
        "2xl": ["1.5", "1.7"],
        "display": ["2"],
    }
    for token, values in size_map.items():
        for value in values:
            text = sub(
                rf"font-size:\s*{re.escape(value)}rem\b",
                f"font-size: var(--text-{token})",
                text,
            )

    # 4. Border radius -> radius scale tokens.
    radius_map = {
        "xs": ["0.3", "0.35"],
        "sm": ["0.4", "0.45", "0.5"],
        "md": ["0.55", "0.6", "0.65"],
        "lg": ["0.7", "0.75", "0.8", "0.85"],
        "xl": ["0.9", "0.95", "1.05", "1.1", "1"],
    }
    for token, values in radius_map.items():
        for value in values:
            text = sub(
                rf"border-radius:\s*{re.escape(value)}rem\b",
                f"border-radius: var(--radius-{token})",
                text,
            )

    # 5. Hardcoded hex colors -> tokens.
    hex_map = [
        (r"#e6ebf0\b", "var(--color-border-soft)"),
        (r"#e8edf2\b", "var(--color-border-soft)"),
        (r"#edf0f4\b", "var(--color-border-soft)"),
        (r"#e1e7eb\b", "var(--color-border)"),
        (r"#ffffff\b", "var(--color-surface)"),
        (r"#fff\b", "var(--color-surface)"),
        (r"#f7fafb\b", "var(--color-surface-muted)"),
        (r"#fbfcfd\b", "var(--color-surface-muted)"),
        (r"#f8fafb\b", "var(--color-surface-muted)"),
        (r"#f7f9fb\b", "var(--color-surface-muted)"),
        (r"#f4f7f9\b", "var(--color-surface-muted)"),
        (r"#f6f9fb\b", "var(--color-surface-muted)"),
        (r"#f3f6f8\b", "var(--color-surface-strong)"),
        (r"#cde0e8\b", "var(--color-selection)"),
    ]
    for pattern, repl in hex_map:
        text = sub(pattern, repl, text, flags=re.IGNORECASE)

    # 6. Settings rhythm tokens -> roomier, on-scale values.
    settings_map = [
        (r"--settings-section-gap:\s*0\.4rem", "--settings-section-gap: 0.625rem"),
        (r"--settings-option-gap:\s*0\.28rem", "--settings-option-gap: 0.375rem"),
        (r"--settings-option-height:\s*1\.95rem", "--settings-option-height: 2.125rem"),
        (r"--settings-col-gap:\s*0\.55rem", "--settings-col-gap: 0.75rem"),
        (r"--settings-label-size:\s*0\.72rem", "--settings-label-size: 0.75rem"),
        (r"--settings-value-size:\s*0\.78rem", "--settings-value-size: 0.8125rem"),
        (r"--settings-row-radius:\s*0\.55rem", "--settings-row-radius: var(--radius-sm)"),
        (r"--settings-body-pad-x:\s*0\.65rem", "--settings-body-pad-x: 0.875rem"),
        (r"--settings-body-pad-y:\s*0\.5rem", "--settings-body-pad-y: 0.625rem"),
    ]
    for pattern, repl in settings_map:
        text = sub(pattern, repl, text)

    return text

for name in FILES:
    path = STYLES / name
    original = path.read_text(encoding="utf-8")
    updated = normalize(original)
    path.write_text(updated, encoding="utf-8")
    print(f"{name}: {'updated' if updated != original else 'unchanged'}")
