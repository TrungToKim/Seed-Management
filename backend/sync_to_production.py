# -*- coding: utf-8 -*-
"""Sync tags + image_url tu DB local (.env) sang DB production (Render)."""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_URL = os.getenv("DB_URL")
PROD_DB_URL = os.getenv("PROD_DB_URL")

if not DB_URL:
    sys.exit("DB_URL not set")
if not PROD_DB_URL:
    sys.exit("PROD_DB_URL not set. Add it to .env (never hardcode credentials).")


def main():
    local = DB_URL.replace("postgresql://", "postgresql+psycopg2://")
    prod = PROD_DB_URL.replace("postgresql://", "postgresql+psycopg2://")

    local_eng = create_engine(local, connect_args={"connect_timeout": 15})
    prod_eng = create_engine(prod, connect_args={"connect_timeout": 15})

    # 1) Read local tags
    with local_eng.connect() as c:
        local_tags = c.execute(text("SELECT category, tag_name FROM tags ORDER BY id")).fetchall()
        local_links = c.execute(text(
            "SELECT pt.plant_id, t.tag_name FROM plant_tags pt JOIN tags t ON t.id = pt.tag_id"
        )).fetchall()
        local_images = c.execute(text("SELECT id, image_url FROM plants WHERE image_url IS NOT NULL AND image_url != ''")).fetchall()

    print(f"Local: {len(local_tags)} tags, {len(local_links)} links, {len(local_images)} images")

    # 2) Write to production
    with prod_eng.begin() as c:
        # clear old tags/links
        c.execute(text("DELETE FROM plant_tags"))
        c.execute(text("DELETE FROM tags"))

        # create tags -> tag_id map
        tag_ids = {}
        for category, tag_name in local_tags:
            rid = c.execute(
                text("INSERT INTO tags (category, tag_name) VALUES (:c, :t) RETURNING id"),
                {"c": category, "t": tag_name},
            ).scalar()
            tag_ids[tag_name] = rid

        # create plant_tags
        for plant_id, tag_name in local_links:
            c.execute(
                text("INSERT INTO plant_tags (plant_id, tag_id) VALUES (:p, :t)"),
                {"p": plant_id, "t": tag_ids[tag_name]},
            )

        # update image_url
        for plant_id, image_url in local_images:
            c.execute(
                text("UPDATE plants SET image_url = :u WHERE id = :p"),
                {"u": image_url, "p": plant_id},
            )

    # 3) Verify
    with prod_eng.connect() as c:
        tags = c.execute(text("SELECT COUNT(*) FROM tags")).scalar()
        links = c.execute(text("SELECT COUNT(*) FROM plant_tags")).scalar()
        imgs = c.execute(text("SELECT COUNT(*) FROM plants WHERE image_url IS NOT NULL AND image_url != ''")).scalar()
        print(f"Production now: {tags} tags, {links} links, {imgs} images")
    print("Done.")

 
if __name__ == "__main__":
    main()
