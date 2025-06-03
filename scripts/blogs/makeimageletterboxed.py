from scripts.conf import *
import json
import pandas as pd
from PIL import Image, ImageOps


"""
python -m scripts.blogs.makeimageletterboxed.py
"""


IMAGES_PATH = Path(r"C:\Users\nagen\Desktop\assets\stash\cyberpunk-2077-a-cautionary-tale")
print(f">> {IMAGES_PATH} {IMAGES_PATH.exists()}")

OUT_DIR = BLOG_BASE_DIR / "images"


def create_letterbox_thumbnail(image, size):
    # Create a thumbnail while maintaining aspect ratio
    image.thumbnail(size, Image.LANCZOS)
    
    # Add padding to create the letterbox effect
    letterbox_image = ImageOps.pad(image, size, color=(0, 0, 0))  # Black padding
    
    return letterbox_image



images_meta = []
letterbox_size = (1024, 1024)
for image in IMAGES_PATH.glob("*.png"):
    img = Image.open(image)
    
    letterbox_img = None
    if img.size != letterbox_size:
        letterbox_img = create_letterbox_thumbnail(img, letterbox_size)

    images_meta.append({
        "img": img,
        "path": str(image),
        "size": img.size,
        "letterbox": letterbox_img
    })


df = pd.DataFrame(images_meta)
print(df[["size", "img"]].groupby("size").count().reset_index().to_dict("records"))

# saving
OUT_DIR = OUT_DIR / IMAGES_PATH.stem
OUT_DIR.mkdir(exist_ok=True)

for rec in df.to_dict("records"):
    print(f"saving image: {rec['path']}")
    name = Path(rec['path']).name
    if rec['letterbox']:
        rec['letterbox'].save(OUT_DIR / name)
    else:
        rec['img'].save(OUT_DIR / name)
    # break

