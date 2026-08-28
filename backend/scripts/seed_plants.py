# -*- coding: utf-8 -*-
"""Seed tags (Cong dung) va image_url cho cac cay thuoc trong database."""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import time
import urllib.parse
import urllib.request

from app import database

TAG_CATEGORY = "Công dụng"
TAGS = [
    "Thanh nhiệt, giải độc",
    "Bổ khí, dưỡng huyết",
    "Bổ can thận, mạnh gân cốt",
    "Hóa đàm, chỉ khái",
    "Khu phong, trừ thấp",
    "Hoạt huyết, tiêu thũng",
]

# plant id -> tag name (nhom cong dung)
PLANT_TAGS = {
    4: "Thanh nhiệt, giải độc",       # Actiso
    5: "Bổ can thận, mạnh gân cốt",    # Ba kich
    6: "Thanh nhiệt, giải độc",        # Bac ha
    7: "Bổ can thận, mạnh gân cốt",    # Bach benh
    8: "Hóa đàm, chỉ khái",            # Bach bo
    9: "Hoạt huyết, tiêu thũng",       # Bach cap
    10: "Khu phong, trừ thấp",         # Bach chi
    11: "Hóa đàm, chỉ khái",           # Bach gioi tu
    12: "Thanh nhiệt, giải độc",       # Bach hoa xa thiet thao
    13: "Hóa đàm, chỉ khái",           # Bach hop
    14: "Bổ khí, dưỡng huyết",         # Bach truat
    15: "Thanh nhiệt, giải độc",       # Ban chi lien
    16: "Hoạt huyết, tiêu thũng",      # Bay la mot hoa
    17: "Hóa đàm, chỉ khái",           # Bo bo
    18: "Thanh nhiệt, giải độc",       # Bo cong anh
    19: "Hóa đàm, chỉ khái",           # Bo ket
    20: "Bổ khí, dưỡng huyết",         # Cam thao
    21: "Hóa đàm, chỉ khái",           # Cat canh
    22: "Bổ khí, dưỡng huyết",         # Cat sam
    23: "Khu phong, trừ thấp",         # Cau dang
    24: "Bổ can thận, mạnh gân cốt",   # Cau tich
    25: "Hoạt huyết, tiêu thũng",      # Cot khi cu
    26: "Bổ can thận, mạnh gân cốt",   # Cot toai bo
    27: "Bổ khí, dưỡng huyết",         # Cu mai
    28: "Thanh nhiệt, giải độc",       # Cuc hoa vang
    29: "Bổ khí, dưỡng huyết",         # Dang sam
    30: "Thanh nhiệt, giải độc",       # Danh danh
    31: "Bổ khí, dưỡng huyết",         # Dau tam
    32: "Bổ khí, dưỡng huyết",         # Dau van trang
    33: "Khu phong, trừ thấp",         # Day dau xuong
}

# plant id -> candidate search names for images (scientific first, then vietnamese)
IMAGE_SEARCH = {
    4: ["Cynara scolymus", "Actiso"],
    5: ["Morinda officinalis", "Ba kich"],
    6: ["Mentha arvensis", "Bac ha"],
    7: ["Eurycoma longifolia", "Bach benh"],
    8: ["Stemona tuberosa", "Bach bo"],
    9: ["Bletilla striata", "Bach cap"],
    10: ["Angelica dahurica", "Bach chi"],
    11: ["Sinapis alba", "Bach gioi tu"],
    12: ["Hedyotis diffusa", "Bach hoa xa thiet thao"],
    13: ["Lilium", "Bach hop"],
    14: ["Atractylodes macrocephala", "Bach truat"],
    15: ["Scutellaria barbata", "Ban chi lien"],
    16: ["Paris polyphylla", "Bay la mot hoa"],
    17: ["Adenosma indianum", "Adenosma", "Bo bo"],
    18: ["Lactuca indica", "Indian lettuce", "Bo cong anh"],
    19: ["Gleditsia australis", "Gleditsia", "Bo ket"],
    20: ["Glycyrrhiza uralensis", "Glycyrrhiza", "Cam thao"],
    21: ["Platycodon grandiflorus", "Balloon flower", "Cat canh"],
    22: ["Millettia speciosa", "Callerya speciosa", "Cat sam"],
    23: ["Uncaria rhynchophylla", "Uncaria", "Cau dang"],
    24: ["Cibotium barometz", "Scythian lamb", "Cau tich"],
    25: ["Reynoutria japonica", "Cot khi cu"],
    26: ["Drynaria fortunei", "Cot toai bo"],
    27: ["Dioscorea persimilis", "Dioscorea", "Cu mai"],
    28: ["Chrysanthemum indicum", "Cuc hoa vang"],
    29: ["Codonopsis pilosula", "Codonopsis", "Dang sam"],
    30: ["Gardenia jasminoides", "Gardenia", "Danh danh"],
    31: ["Morus alba", "White mulberry", "Dau tam"],
    32: ["Lablab purpureus", "Hyacinth bean", "Dau van trang"],
    33: ["Tinospora sinensis", "Tinospora", "Day dau xuong"],
}


def wikipedia_image(query, lang="vi", retries=2):
    """Return thumbnail URL for a plant name from Wikipedia, or None."""
    url = (
        f"https://{lang}.wikipedia.org/w/api.php"
        f"?action=query&titles={urllib.parse.quote(query)}"
        f"&prop=pageimages&format=json&pithumbsize=600&redirects=1"
    )
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SeedManagementBot/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    return thumb
            return None
        except Exception as exc:
            sys.stderr.write(f"  retry ({query}): {exc}\n")
            time.sleep(3)
    return None


def fetch_image(names, delay=2.5):
    """Try candidate names across languages, respecting rate limits."""
    for query in names:
        for lang in ("vi", "en"):
            print(f"    querying '{query}' [{lang}]...")
            found = wikipedia_image(query, lang=lang)
            time.sleep(delay)
            if found:
                return found
    return None


def main():
    eng = database.get_engine()
    if eng is None:
        sys.exit("DB_URL not set")
    db = database.SessionLocal()

    # 1) Reset old tags, then create new tags
    db.query(database.PlantTag).delete()
    db.query(database.Tag).delete()
    db.commit()

    tag_objs = {}
    for name in TAGS:
        tag = database.Tag(category=TAG_CATEGORY, tag_name=name)
        db.add(tag)
        db.flush()
        tag_objs[name] = tag

    # 2) Assign tags to plants
    for plant_id, tag_name in PLANT_TAGS.items():
        plant = db.query(database.Plant).filter(database.Plant.id == plant_id).first()
        tag = tag_objs[tag_name]
        if plant and tag not in plant.tags:
            plant.tags.append(tag)

    # 3) Fetch images
    for plant_id, names in IMAGE_SEARCH.items():
        plant = db.query(database.Plant).filter(database.Plant.id == plant_id).first()
        if not plant:
            continue
        if plant.image_url:
            print(f"[{plant_id}] {plant.common_name}: keep existing")
            continue
        found = fetch_image(names)
        if found:
            plant.image_url = found
            print(f"  -> {found}")
        else:
            print(f"  !! no image found")
        db.commit()

    db.commit()
    db.close()
    print("Done.")


if __name__ == "__main__":
    main()
