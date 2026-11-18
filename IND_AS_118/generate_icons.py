from PIL import Image, ImageDraw, ImageFont
import os

def create_icons():
    os.makedirs('icons', exist_ok=True)

    def draw_app_icon(size):
        # Create image with dark navy slate background
        img = Image.new('RGBA', (size, size), (15, 23, 42, 255))
        draw = ImageDraw.Draw(img)

        # Rounded rectangle background
        pad = int(size * 0.06)
        radius = int(size * 0.22)
        draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=radius, fill=(30, 41, 59, 255), outline=(56, 189, 248, 200), width=int(size * 0.02))

        # Financial chart bars
        center_x = size // 2
        center_y = size // 2

        bar_width = int(size * 0.12)
        bar_gap = int(size * 0.06)
        base_y = int(size * 0.72)

        bars = [
            (center_x - int(bar_width * 1.5 + bar_gap), int(size * 0.28), (56, 189, 248, 255)),  # Sky blue
            (center_x - int(bar_width * 0.5), int(size * 0.40), (16, 185, 129, 255)),            # Emerald green
            (center_x + int(bar_width * 0.5 + bar_gap), int(size * 0.52), (245, 158, 11, 255))  # Amber
        ]

        for x_start, bar_h, color in bars:
            y_start = base_y - bar_h
            draw.rounded_rectangle([x_start, y_start, x_start + bar_width, base_y], radius=int(bar_width * 0.3), fill=color)

        # Gold upward arrow / line
        arrow_pts = [
            (center_x - int(bar_width * 1.8), base_y - int(size * 0.15)),
            (center_x - int(bar_width * 0.2), base_y - int(size * 0.35)),
            (center_x + int(bar_width * 1.6), base_y - int(size * 0.52))
        ]
        draw.line(arrow_pts, fill=(251, 191, 36, 255), width=max(2, int(size * 0.035)))

        return img

    icon192 = draw_app_icon(192)
    icon192.save('icons/icon-192.png', 'PNG')

    icon512 = draw_app_icon(512)
    icon512.save('icons/icon-512.png', 'PNG')

    icon_apple = draw_app_icon(180)
    icon_apple.save('icons/apple-touch-icon.png', 'PNG')

    # Also create a crisp SVG favicon
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0f172a"/>
  <rect x="6" y="6" width="88" height="88" rx="18" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <rect x="22" y="44" width="12" height="28" rx="3" fill="#38bdf8"/>
  <rect x="44" y="32" width="12" height="40" rx="3" fill="#10b981"/>
  <rect x="66" y="20" width="12" height="52" rx="3" fill="#f59e0b"/>
  <polyline points="20,58 48,42 76,22" fill="none" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
</svg>"""
    with open('icons/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(svg_content)

    print("Icons generated successfully!")

if __name__ == '__main__':
    create_icons()
