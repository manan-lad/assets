
from scripts.conf import *
import json
import pandas as pd


INDEX_SAVE_DIR = BLOG_BASE_DIR / "index"
INDEX_SAVE_DIR.mkdir(parents=True, exist_ok=True)


def make_blog_index():
    """
    Generates the blog index page.
    """

    meta_data = []
    for meta in BLOG_META.glob("*.json"):
        with open(meta, "r", encoding="utf-8") as f:
            meta_data.append(json.load(f))

    df = pd.DataFrame(meta_data)
    df['created_date'] = pd.to_datetime(df['created_date'], dayfirst=True)
    df = df.sort_values(by='created_date', ascending=False)
    df['created_date'] = df['created_date'].dt.strftime("%d-%m-%Y")

    records = df.to_dict("records")
    print(f"found {len(records)} blog posts !")

    INDEX_SAVE_FILE = INDEX_SAVE_DIR / "index.json"
    with INDEX_SAVE_FILE.open("w") as f:
        json.dump(records, f, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    print("Generating blog index...")
    make_blog_index()
    print("Blog index generated successfully.")


