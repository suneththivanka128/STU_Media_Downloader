import os
from PIL import Image, ImageDraw

os.makedirs("extension/icons", exist_ok=True)

def create_icon(size):
    # Create RGBA image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle with vibrant gradient color
    # Outer circle
    margin = max(1, size // 16)
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(30, 41, 59, 255), outline=(99, 102, 241, 255), width=max(1, size // 24))

    # Lightning bolt / Arrow graphic in center
    cx, cy = size / 2, size / 2
    s = size / 32

    # Draw a stylized download arrow + lightning accent
    # Arrow stem & point
    arrow = [
        (cx - 3 * s, cy - 8 * s),
        (cx + 3 * s, cy - 8 * s),
        (cx + 3 * s, cy + 1 * s),
        (cx + 7 * s, cy + 1 * s),
        (cx, cy + 8 * s),
        (cx - 7 * s, cy + 1 * s),
        (cx - 3 * s, cy + 1 * s),
    ]
    draw.polygon(arrow, fill=(56, 189, 248, 255))

    # Base tray
    tray_w = size * 0.6
    tray_y = cy + 9 * s
    draw.rectangle([cx - tray_w / 2, tray_y, cx + tray_w / 2, tray_y + max(2, 2 * s)], fill=(129, 140, 248, 255))

    # Lightning bolt highlight
    bolt = [
        (cx + 2 * s, cy - 6 * s),
        (cx + 6 * s, cy - 6 * s),
        (cx + 4 * s, cy - 1 * s),
        (cx + 8 * s, cy - 1 * s),
        (cx + 2 * s, cy + 5 * s),
        (cx + 3.5 * s, cy),
        (cx + 0.5 * s, cy),
    ]
    draw.polygon(bolt, fill=(250, 204, 21, 255))

    img.save(f"extension/icons/icon-{size}.png", "PNG")
    print(f"Generated extension/icons/icon-{size}.png")

for sz in [16, 48, 128]:
    create_icon(sz)
