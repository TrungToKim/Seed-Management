# -*- coding: utf-8 -*-
"""
All-in-one script to initialize and seed a new PostgreSQL database (Neon, Supabase, etc.)
with all required tables, 30 medical plants, tags, admin account, packages, and vector embeddings.

Usage:
    python scripts/seed_new_db.py [OPTIONAL_DATABASE_URL]
If OPTIONAL_DATABASE_URL is not provided, it will read from DB_URL or DATABASE_URL in .env
"""
import os
import sys
import argparse

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# Pre-defined list of 30 medical plants with accurate data
PLANTS_DATA = [
    {
        "common_name": "Actiso",
        "scientific_name": "Cynara scolymus",
        "family": "Asteraceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt, giải độc gan, lợi mật, hạ cholesterol máu, hỗ trợ tiêu hóa kém. Liều lượng: 10-20g (khô) hoặc 50g (tươi)/ngày.",
        "search_name": "Cynara scolymus",
    },
    {
        "common_name": "Ba kích",
        "scientific_name": "Morinda officinalis",
        "family": "Rubiaceae",
        "tag": "Bổ can thận, mạnh gân cốt",
        "description": "Bổ thận dương, mạnh gân cốt, trị liệt dương, di tinh, đau mỏi lưng gối, phong thấp. Liều lượng: 8-16g/ngày.",
        "search_name": "Morinda officinalis",
    },
    {
        "common_name": "Bạc hà",
        "scientific_name": "Mentha arvensis",
        "family": "Lamiaceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Phát tán phong nhiệt, chữa cảm mạo, ngạt mũi, nhức đầu, viêm họng, đau răng. Liều lượng: 4-8g/ngày. Lưu ý: Cho vào sau khi sắc thuốc, không sắc lâu.",
        "search_name": "Mentha arvensis",
    },
    {
        "common_name": "Bách bệnh",
        "scientific_name": "Eurycoma longifolia",
        "family": "Simaroubaceae",
        "tag": "Bổ can thận, mạnh gân cốt",
        "description": "Chữa sốt, tiêu hóa kém, đau lưng mỏi gối, cải thiện sinh lý nam giới, tăng cường thể lực. Liều lượng: 4-12g/ngày.",
        "search_name": "Eurycoma longifolia",
    },
    {
        "common_name": "Bách bộ",
        "scientific_name": "Stemona tuberosa Lour.",
        "family": "Stemonaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Nhuận phế chỉ khái (đặc trị ho lâu ngày, ho gà, viêm phế quản mãn tính), tẩy giun đũa, giun kim, diệt chấy rận. Liều lượng: 6-12g/ngày.",
        "search_name": "Stemona tuberosa",
    },
    {
        "common_name": "Bạch cập",
        "scientific_name": "Bletilla striata (Thunb.) Reichb.",
        "family": "Orchidaceae",
        "tag": "Hoạt huyết, tiêu thũng",
        "description": "Thu liễm, cầm máu (chữa ho ra máu, nôn ra máu, chảy máu dạ dày), làm lành vết loét, sinh cơ. Liều lượng: 4-12g/ngày. Lưu ý: Kỵ Ô đầu, không được phối hợp.",
        "search_name": "Bletilla striata",
    },
    {
        "common_name": "Bạch chỉ",
        "scientific_name": "Angelica dahurica (Fisch. ex Hoffm.) Benth.",
        "family": "Apiaceae",
        "tag": "Khu phong, trừ thấp",
        "description": "Tán phong trừ thấp, thông khiếu chỉ thống, giảm đau đầu trán, chữa viêm xoang, trị mụn nhọt sưng mủ. Liều lượng: 4-12g/ngày.",
        "search_name": "Angelica dahurica",
    },
    {
        "common_name": "Bạch giới tử",
        "scientific_name": "Sinapis alba",
        "family": "Brassicaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Ôn phế khoát đàm, chỉ khái (trị ho nhiều đờm loãng lạnh, hen suyễn khó thở), tiêu thũng giảm đau. Liều lượng: 3-9g/ngày.",
        "search_name": "Sinapis alba",
    },
    {
        "common_name": "Bạch hoa xà thiệt thảo",
        "scientific_name": "Hedyotis diffusa Willd.",
        "family": "Rubiaceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt giải độc, lợi niệu tiêu thũng, tiêu ung tán kết, hỗ trợ điều trị viêm nhiễm, u bướu. Liều lượng: 15-60g/ngày.",
        "search_name": "Hedyotis diffusa",
    },
    {
        "common_name": "Bách hợp",
        "scientific_name": "Lilium spp",
        "family": "Liliaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Nhuận phế chỉ khái, thanh tâm an thần (trị ho khan, ho ra máu, suy nhược thần kinh, mất ngủ, bồn chồn). Liều lượng: 12-30g/ngày.",
        "search_name": "Lilium",
    },
    {
        "common_name": "Bạch truật",
        "scientific_name": "Atractylodes macrocephala Koidz.",
        "family": "Asteraceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Kiện tỳ ích khí, táo thấp lợi thủy, cố biểu chỉ hãn (cầm mồ hôi trộm), an thai. Liều lượng: 6-12g/ngày.",
        "search_name": "Atractylodes macrocephala",
    },
    {
        "common_name": "Bán chi liên",
        "scientific_name": "Scutellaria barbata D. Don.",
        "family": "Lamiaceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt giải độc, tiêu sưng giảm đau, thông kinh hoạt lạc, hỗ trợ điều trị ung thư, u bướu, viêm gan. Liều lượng: 15-30g/ngày.",
        "search_name": "Scutellaria barbata",
    },
    {
        "common_name": "Bảy lá một hoa",
        "scientific_name": "Paris polyphylla",
        "family": "Trilliaceae",
        "tag": "Hoạt huyết, tiêu thũng",
        "description": "Thanh nhiệt giải độc, tiêu thũng chỉ thống, chữa rắn độc cắn, mụn nhọt, sưng viêm tuyến vú, ung thũng. Liều lượng: 4-12g/ngày.",
        "search_name": "Paris polyphylla",
    },
    {
        "common_name": "Bồ bồ",
        "scientific_name": "Adenosma indianum (Lour.) Merr.",
        "family": "Scrophulariaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Giải cảm, thanh nhiệt, hóa thấp, kích thích tiêu hóa, chữa chứng sốt do thời tiết, viêm gan vàng da. Liều lượng: 10-20g/ngày.",
        "search_name": "Adenosma indianum",
    },
    {
        "common_name": "Bồ công anh",
        "scientific_name": "Lactuca indica",
        "family": "Asteraceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt giải độc, tiêu viêm, tán kết thông sữa, trị tắc tia sữa, viêm tuyến vú, mụn nhọt đinh độc. Liều lượng: 20-40g tươi hoặc 10-20g khô/ngày.",
        "search_name": "Lactuca indica",
    },
    {
        "common_name": "Bồ kết",
        "scientific_name": "Gleditsia australis",
        "family": "Fabaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Thông khiếu, tiêu đờm, sát trùng, trị ho suyễn tắc nghẽn đờm dãi, ngạt mũi, trúng phong đờm tắc. Liều lượng: 3-6g/ngày. Phụ nữ có thai kiêng dùng.",
        "search_name": "Gleditsia australis",
    },
    {
        "common_name": "Cam thảo",
        "scientific_name": "Glycyrrhiza uralensis",
        "family": "Fabaceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Bổ tỳ vị ích khí, nhuận phế chỉ khái, thanh nhiệt giải độc, điều hòa tính vị các vị thuốc khác. Liều lượng: 2-12g/ngày. Không dùng kéo dài liều cao.",
        "search_name": "Glycyrrhiza uralensis",
    },
    {
        "common_name": "Cát cánh",
        "scientific_name": "Platycodon grandiflorum (Jacq.) A.DC.",
        "family": "Campanulaceae",
        "tag": "Hóa đàm, chỉ khái",
        "description": "Tuyên phế, khử đàm khai thông hầu họng, bài nùng (trị ho có đờm đặc, viêm họng, khản tiếng, viêm amidan). Liều lượng: 3-9g/ngày.",
        "search_name": "Platycodon grandiflorus",
    },
    {
        "common_name": "Cát sâm",
        "scientific_name": "Callerya speciosa (Champ.)",
        "family": "Fabaceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Bổ khí ích tỳ, sinh tân nhuận phế, chỉ khái, trị cơ thể suy nhược, kém ăn, ho khan lâu ngày. Liều lượng: 12-20g/ngày.",
        "search_name": "Callerya speciosa",
    },
    {
        "common_name": "Câu đằng",
        "scientific_name": "Uncaria rhynchophylla",
        "family": "Rubiaceae",
        "tag": "Khu phong, trừ thấp",
        "description": "Bình can tức phong, thanh nhiệt, trị cao huyết áp, hoa mắt chóng mặt, đau đầu, trẻ em sốt cao co giật. Liều lượng: 12-16g/ngày. Sắc thuốc sau, không sắc quá 15 phút.",
        "search_name": "Uncaria rhynchophylla",
    },
    {
        "common_name": "Cẩu tích",
        "scientific_name": "Cibotium barometz (L.) J. Sm.",
        "family": "Dicksoniaceae",
        "tag": "Bổ can thận, mạnh gân cốt",
        "description": "Bổ can thận, mạnh gân xương cốt, trừ phong thấp, chữa đau lưng mỏi gối, đi lại khó khăn, phong hàn thấp tý. Liều lượng: 10-20g/ngày.",
        "search_name": "Cibotium barometz",
    },
    {
        "common_name": "Cốt khí củ",
        "scientific_name": "Reynoutria japonica Houtt.",
        "family": "Polygonaceae",
        "tag": "Hoạt huyết, tiêu thũng",
        "description": "Hoạt huyết thông kinh, chỉ thống trừ ứ, trị phong tê thấp đau nhức, chấn thương huyết ứ. Liều lượng: 10-20g/ngày. Phụ nữ mang thai không dùng.",
        "search_name": "Reynoutria japonica",
    },
    {
        "common_name": "Cốt toái bổ",
        "scientific_name": "Drynaria fortunei (Kuntze ex Mett.) J. Sm.",
        "family": "Polypodiaceae",
        "tag": "Bổ can thận, mạnh gân cốt",
        "description": "Bổ thận, làm liền gân cốt, tiếp cốt chỉ thống, trị đau lưng gối, thận hư ù tai, răng lung lay, chấn thương gãy xương. Liều lượng: 10-20g/ngày.",
        "search_name": "Drynaria fortunei",
    },
    {
        "common_name": "Củ mài (Hoài sơn)",
        "scientific_name": "Dioscorea persimilis",
        "family": "Dioscoreaceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Bổ tỳ vị, ích phế tư thận, sinh tân, chữa tiêu chảy mạn tính, tỳ hư kém ăn, đái tháo đường, suy nhược cơ thể. Liều lượng: 10-30g/ngày.",
        "search_name": "Dioscorea persimilis",
    },
    {
        "common_name": "Cúc hoa vàng",
        "scientific_name": "Chrysanthemum indicum",
        "family": "Asteraceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt giải độc, tán phong dương, sáng mắt (minh mục), chữa đau đầu, hoa mắt, mắt đỏ sưng đau, cao huyết áp. Liều lượng: 6-12g/ngày.",
        "search_name": "Chrysanthemum indicum",
    },
    {
        "common_name": "Đảng sâm",
        "scientific_name": "Codonopsis javanica (Blume.) Hook.",
        "family": "Campanulaceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Bổ trung ích khí, sinh tân dưỡng huyết, chữa cơ thể suy nhược mệt mỏi, tỳ vị hư yếu, ăn uống kém, thiếu máu. Liều lượng: 10-30g/ngày.",
        "search_name": "Codonopsis pilosula",
    },
    {
        "common_name": "Dành dành",
        "scientific_name": "Gardenia jasminoides J. Ellis.",
        "family": "Rubiaceae",
        "tag": "Thanh nhiệt, giải độc",
        "description": "Thanh nhiệt tả hỏa, lợi thấp lương huyết, trị sốt cao bứt rứt, viêm gan vàng da, chảy máu cam, tiểu ra máu. Liều lượng: 8-16g/ngày.",
        "search_name": "Gardenia jasminoides",
    },
    {
        "common_name": "Dâu tằm",
        "scientific_name": "Morus alba",
        "family": "Moraceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Quả (tang thầm) bổ can thận, dưỡng huyết sáng mắt; Lá (tang diệp) sơ tán phong nhiệt, trị cảm mạo ho khan. Liều lượng: 10-20g/ngày.",
        "search_name": "Morus alba",
    },
    {
        "common_name": "Đậu ván trắng",
        "scientific_name": "Lablab purpureus (L.)",
        "family": "Fabaceae",
        "tag": "Bổ khí, dưỡng huyết",
        "description": "Kiện tỳ hóa thấp, tiêu thử giải độc, chữa tiêu chảy mạn, nôn mửa do nhiệt ẩm mùa hè, giải độc rượu và thức ăn. Liều lượng: 10-30g/ngày.",
        "search_name": "Lablab purpureus",
    },
    {
        "common_name": "Dây đau xương",
        "scientific_name": "Tinospora sinensis (Lour.) Merr.",
        "family": "Menispermaceae",
        "tag": "Khu phong, trừ thấp",
        "description": "Khu phong trừ thấp, thư cân hoạt lạc, chữa phong tê thấp, đau nhức gân xương khớp, chân tay tê bại. Liều lượng: 10-12g/ngày.",
        "search_name": "Tinospora sinensis",
    },
]

TAG_CATEGORY = "Công dụng"
TAGS = [
    "Thanh nhiệt, giải độc",
    "Bổ khí, dưỡng huyết",
    "Bổ can thận, mạnh gân cốt",
    "Hóa đàm, chỉ khái",
    "Khu phong, trừ thấp",
    "Hoạt huyết, tiêu thũng",
]


def fetch_wikipedia_image(query, lang="vi", timeout=10):
    import urllib.parse
    import urllib.request
    import json
    url = (
        f"https://{lang}.wikipedia.org/w/api.php"
        f"?action=query&titles={urllib.parse.quote(query)}"
        f"&prop=pageimages&format=json&pithumbsize=600&redirects=1"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SeedManagementBot/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                return thumb
    except Exception:
        pass
    return None


def get_image_for_plant(plant_info):
    candidates = [
        plant_info.get("search_name"),
        plant_info.get("scientific_name"),
        plant_info.get("common_name"),
    ]
    for c in candidates:
        if not c:
            continue
        for lang in ("vi", "en"):
            img = fetch_wikipedia_image(c, lang=lang)
            if img:
                return img
    return None


def main():
    parser = argparse.ArgumentParser(description="Seed new database for Web Seed Management")
    parser.add_argument("db_url", nargs="?", default=None, help="Database URL (postgresql://...)")
    parser.add_argument("--skip-embeddings", action="store_true", help="Skip generating AI vector embeddings")
    args = parser.parse_args()

    db_url = args.db_url or os.getenv("PROD_DB_URL") or os.getenv("DB_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] Database URL not provided!")
        print("Please pass the URL as an argument or set DB_URL / PROD_DB_URL in your .env file:")
        print("  python scripts/seed_new_db.py 'postgresql://user:pass@host:port/dbname?sslmode=require'")
        sys.exit(1)

    # Format URL for SQLAlchemy
    clean_url = db_url.strip().strip("'").strip('"')
    if clean_url.startswith("postgres://"):
        sqlalchemy_url = clean_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif clean_url.startswith("postgresql://"):
        sqlalchemy_url = clean_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        sqlalchemy_url = clean_url

    print("=" * 65)
    print(">>> KHOI TAO VA NAP DU LIEU CO SO DU LIEU MOI")
    print("=" * 65)
    try:
        from urllib.parse import urlparse
        p = urlparse(clean_url)
        masked_host = f"{p.username}:***@{p.hostname}:{p.port or 5432}{p.path}"
        print(f"[*] Target DB: {masked_host}")
    except Exception:
        print("[*] Target DB configured")

    os.environ["DB_URL"] = sqlalchemy_url
    os.environ["DATABASE_URL"] = sqlalchemy_url

    import app.database
    app.database.SQLALCHEMY_URL = sqlalchemy_url
    app.database.engine = None
    app.database.SessionLocal = None

    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from app.database import (
        Base,
        Plant,
        PlantDetail,
        Tag,
        PlantTag,
        User,
        Package,
        SystemSetting,
        migrate_db,
        ensure_default_packages,
        ensure_default_settings,
        ensure_primary_admin,
    )

    print("\n[1/5] Kiem tra ket noi va kich hoat extension vector...")
    engine = create_engine(
        sqlalchemy_url,
        connect_args={"connect_timeout": 15},
        pool_pre_ping=True,
    )
    Session = sessionmaker(bind=engine)

    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            print("  -> Da kich hoat extension 'vector' (pgvector) thanh cong.")
        except Exception as e:
            print(f"  [!] Luu y: khong the kich hoat vector extension: {e}")

    print("\n[2/5] Tao cau truc bang va chay migrations...")
    Base.metadata.create_all(bind=engine)
    migrate_db()
    ensure_default_packages()
    ensure_default_settings()
    ensure_primary_admin()
    print("  -> Toan bo cau hinh bang, packages, settings va tai khoan admin da san sang.")

    print("\n[3/5] Nap danh muc The (Tags) cong dung...")
    db = Session()
    tag_map = {}
    try:
        for t_name in TAGS:
            tag_obj = db.query(Tag).filter(Tag.tag_name == t_name).first()
            if not tag_obj:
                tag_obj = Tag(category=TAG_CATEGORY, tag_name=t_name)
                db.add(tag_obj)
                db.flush()
            tag_map[t_name] = tag_obj
        db.commit()
        print(f"  -> Da nap {len(tag_map)} the cong dung.")

        print("\n[4/5] Nap 30 cay thuoc va gan the cong dung...")
        created_count = 0
        updated_count = 0

        for item in PLANTS_DATA:
            plant = db.query(Plant).filter(Plant.common_name == item["common_name"]).first()
            is_new = False
            if not plant:
                plant = Plant(
                    common_name=item["common_name"],
                    scientific_name=item["scientific_name"],
                    family=item["family"],
                    description=item["description"],
                )
                db.add(plant)
                db.flush()
                is_new = True
                created_count += 1
            else:
                plant.scientific_name = item["scientific_name"]
                plant.family = item["family"]
                plant.description = item["description"]
                updated_count += 1

            # PlantDetail
            detail = db.query(PlantDetail).filter(PlantDetail.plant_id == plant.id).first()
            if not detail:
                detail = PlantDetail(
                    plant_id=plant.id,
                    section_type="cong_dung",
                    content=item["description"],
                    source_reference="Thong_tin_duoc_lieu.pdf",
                )
                db.add(detail)
            else:
                detail.content = item["description"]

            # PlantTag
            target_tag = tag_map.get(item["tag"])
            if target_tag and target_tag not in plant.tags:
                plant.tags.append(target_tag)

            # Image URL: fetch if missing
            if not plant.image_url:
                print(f"    + Lay anh cho '{plant.common_name}'...", end=" ", flush=True)
                img = get_image_for_plant(item)
                if img:
                    plant.image_url = img
                    print(f"OK")
                else:
                    print("Khong tim thay")

            db.commit()

        print(f"  -> Hoan tat nap cay thuoc: Tao moi {created_count}, Cap nhat {updated_count}.")
    finally:
        db.close()

    # Step 5: Vector Embeddings
    print("\n[5/5] Tao Vector Embeddings cho AI Chatbot (pgvector)...")
    if args.skip_embeddings:
        print("  -> Bo qua theo yeu cau (--skip-embeddings).")
    elif not os.getenv("GOOGLE_API_KEY"):
        print("  [!] Khong tim thay GOOGLE_API_KEY trong .env. Bo qua buoc tao vector embeddings.")
        print("      Sau khi them GOOGLE_API_KEY, ban co the chay: python scripts/ingest.py")
    else:
        try:
            from langchain_postgres import PGVector
            from langchain_core.documents import Document
            from app.chat_service import get_embeddings, COLLECTION_NAME

            db = Session()
            plants = db.query(Plant).all()
            docs = []
            for plant in plants:
                text_content = f"Ten: {plant.common_name}\n"
                if plant.scientific_name:
                    text_content += f"Ten khoa hoc: {plant.scientific_name}\n"
                if plant.family:
                    text_content += f"Ho: {plant.family}\n"
                if plant.description:
                    text_content += f"Mo ta: {plant.description}\n"
                details = db.query(PlantDetail).filter(PlantDetail.plant_id == plant.id).all()
                for detail in details:
                    text_content += f"\n{detail.section_type}: {detail.content}"
                docs.append(Document(
                    page_content=text_content,
                    metadata={"source": f"DB: {plant.common_name}", "plant_id": plant.id}
                ))
            db.close()

            print(f"  -> Dang nap {len(docs)} tai lieu vao collection '{COLLECTION_NAME}'...")
            embeddings = get_embeddings()
            PGVector.from_documents(
                documents=docs,
                embedding=embeddings,
                collection_name=COLLECTION_NAME,
                connection=sqlalchemy_url,
                use_jsonb=True,
            )
            print(f"  -> Da tao Vector Embeddings thanh cong cho {len(docs)} cay thuoc!")
        except Exception as ex:
            print(f"  [!] Loi khi nap embeddings: {ex}")
            print("      Ban co the chay rieng 'python scripts/ingest.py' sau.")

    # Verification summary
    print("\n" + "=" * 65)
    print(">>> TONG KET KIEM TRA DATABASE")
    print("=" * 65)
    with engine.connect() as conn:
        plant_count = conn.execute(text("SELECT COUNT(*) FROM plants")).scalar()
        tag_count = conn.execute(text("SELECT COUNT(*) FROM tags")).scalar()
        link_count = conn.execute(text("SELECT COUNT(*) FROM plant_tags")).scalar()
        img_count = conn.execute(text("SELECT COUNT(*) FROM plants WHERE image_url IS NOT NULL AND image_url != ''")).scalar()
        user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        pkg_count = conn.execute(text("SELECT COUNT(*) FROM packages")).scalar()
        print(f"  [+] Bang plants:          {plant_count} cay thuoc ({img_count} cay co anh)")
        print(f"  [+] Bang tags:            {tag_count} the")
        print(f"  [+] Bang plant_tags:      {link_count} lien ket cong dung")
        print(f"  [+] Bang users:           {user_count} tai khoan")
        print(f"  [+] Bang packages:        {pkg_count} goi dich vu")
    print("\n>>> KHOI TAO DATABASE THANH CONG! SAN SANG CHAY BACKEND.")
    print("=" * 65)


if __name__ == "__main__":
    main()
