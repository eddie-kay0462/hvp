"""Strip the white background and soft drop shadows from the hero mockup."""

from PIL import Image, ImageDraw

SRC = "frontend/public/hero-mockup.png"
DST = "frontend/public/hero-mockup.png"

img = Image.open(SRC).convert("RGBA")
w, h = img.size

# Floodfill from each corner with a wide threshold so connected near-white +
# soft drop-shadow pixels become transparent. This preserves interior whites
# of the phone screens because they are not connected to the outer region.
seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
for seed in seeds:
    ImageDraw.floodfill(img, seed, (255, 255, 255, 0), thresh=55)

# Second pass: for any pixel that is now still light gray *and* nearly opaque,
# soften by reducing alpha proportionally to brightness. This removes any
# residual halo at the phone borders without eating the bezels.
pixels = img.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        brightness = (r + g + b) / 3
        if brightness > 235:
            # remove residual light-gray pixels entirely
            pixels[x, y] = (r, g, b, 0)
        elif brightness > 220:
            # gentle taper
            new_a = int(a * (235 - brightness) / 15)
            pixels[x, y] = (r, g, b, new_a)

img.save(DST, "PNG", optimize=True)
print("done", img.size, "saved to", DST)
