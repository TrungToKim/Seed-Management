import re, os
from langchain_community.document_loaders import PyPDFLoader
from database import get_db, init_db, Plant, PlantDetail

PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pdf', 'Thong_tin_duoc_lieu.pdf')

def parse_pdf():
    loader = PyPDFLoader(PDF_PATH)
    docs = loader.load()
    return '\n'.join(doc.page_content for doc in docs)

def parse_entries(text):
    lines = text.split('\n')
    entries = []
    current = None
    header_skip = True
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if header_skip:
            if line.startswith('1 '):
                header_skip = False
            else:
                continue
        m = re.match(r'^(\d+)\s+(.*)', line)
        if m:
            if current:
                entries.append(current)
            current = {'num': int(m.group(1)), 'lines': [m.group(2)]}
        elif current:
            current['lines'].append(line)
    if current:
        entries.append(current)
    return entries

KNOWN_FAMILIES = sorted([
    'Asteraceae', 'Rubiaceae', 'Lamiaceae', 'Simaroubaceae', 'Stemonaceae',
    'Orchidaceae', 'Apiaceae', 'Brassicaceae', 'Liliaceae', 'Trilliaceae',
    'Scrophulariaceae', 'Fabaceae', 'Campanulaceae', 'Dicksoniaceae',
    'Polygonaceae', 'Polypodiaceae', 'Dioscoreaceae', 'Menispermaceae',
    'Moraceae',
], key=len, reverse=True)

def extract_plant_info(num, lines):
    raw = ' '.join(lines)
    raw = raw.replace(' \u2013 ', ' - ').replace('\u2013', '-')
    raw = re.sub(r'\s+', ' ', raw).strip()
    raw = re.sub(r'STT Tên Dược Liệu Tên Khoa Học & HọCông Dụng Liều Lượng Lưu Ý\s*', '', raw).strip()

    common_name = ''
    scientific_name = ''
    family = ''
    description = ''

    if ' - ' in raw:
        before, after = raw.split(' - ', 1)
        after = after.strip()

        sci_pattern = r'([A-Z][a-z]+(?:\s+[a-z]+)+(?:\s*\([^)]+\))*(?:\s+(?:ex\s+)?[A-Z][a-z]+\.)*(?:\s+f\.\s*[A-Z]\.\s*[A-Z]\.?\w*\.?)*(?:\s+[A-Z]\.\s*[A-Z]\.?\w*\.?)*(?:\s+[A-Z][a-z]+\.[^-\s]*)*(?:\s+spp\.?)?)'
        sci_match = re.search(sci_pattern, before)
        if sci_match:
            scientific_name = sci_match.group(1).strip()
            common_name = before[:sci_match.start()].strip()
        else:
            before_no_paren = re.sub(r'\([^)]*\)', '', before).strip()
            sci_match2 = re.search(r'([A-Z][a-z]+(?:\s+[a-z]+)+)', before_no_paren)
            if sci_match2:
                idx = before.index(sci_match2.group(1)[:max(3, len(sci_match2.group(1))-2)])
                scientific_name = before[idx:].strip()
                common_name = before[:idx].strip()
            else:
                common_name = before

        family_found = None
        for f in KNOWN_FAMILIES:
            if after.startswith(f):
                family_found = f
                break

        if family_found:
            family = family_found
            description = after[len(family_found):].strip()
            if description and not description[0].isalpha():
                description = description[1:].strip()
        else:
            m = re.match(r'^([A-Z][a-z]+)', after)
            if m:
                family = m.group(1)
                description = after[m.end():].strip()
                if description and not description[0].isalpha():
                    description = description[1:].strip()
            else:
                description = after
    else:
        sci_pattern = r'([A-Z][a-z]+(?:\s+[a-z]+)+(?:\s*\([^)]+\))*(?:\s+(?:ex\s+)?[A-Z][a-z]+\.)*(?:\s+f\.\s*[A-Z]\.\s*[A-Z]\.?\w*\.?)*(?:\s+[A-Z]\.\s*[A-Z]\.?\w*\.?)*(?:\s+[A-Z][a-z]+\.[^-\s]*)*(?:\s+spp\.?)?)'
        sci_match = re.search(sci_pattern, raw)
        if sci_match:
            scientific_name = sci_match.group(1).strip()
            common_name = raw[:sci_match.start()].strip()
            description = raw[sci_match.end():].strip()
        else:
            common_name = raw

    common_name = common_name.strip()
    if common_name.endswith('('):
        common_name = common_name[:-1].strip()

    return {
        'common_name': common_name,
        'scientific_name': scientific_name,
        'family': family,
        'description': description,
    }

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'import_log.txt')
    log = open(log_path, 'w', encoding='utf-8')

    log.write("1. Reading PDF...\n")
    text = parse_pdf()

    log.write("2. Parsing data...\n")
    entries = parse_entries(text)
    log.write(f"   Found {len(entries)} plants\n")

    plants_data = []
    for entry in entries:
        info = extract_plant_info(entry['num'], entry['lines'])
        plants_data.append(info)
        log.write(f"   {entry['num']:2d}. [{info['common_name']}] | [{info['scientific_name']}] | [{info['family']}] | [{info['description'][:80]}]\n")

    log.write(f"\n3. Saving to database ({len(plants_data)} plants)...\n")
    init_db()
    db = next(get_db())

    try:
        for info in plants_data:
            if not info['description']:
                info['description'] = 'Thong tin dang cap nhat...'

            plant = Plant(
                common_name=info['common_name'],
                scientific_name=info['scientific_name'] or None,
                family=info['family'] or None,
                description=info['description'],
            )
            db.add(plant)
            db.flush()

            if info['description']:
                db.add(PlantDetail(
                    plant_id=plant.id,
                    section_type='cong_dung',
                    content=info['description'],
                    source_reference='Thong_tin_duoc_lieu.pdf'
                ))

        db.commit()
        log.write("   Done! Import successful.\n")
        print("Import successful!")

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        log.write(f"   ERROR: {e}\n")
        print(f"ERROR: {e}")
    finally:
        db.close()
        log.close()

if __name__ == '__main__':
    main()
