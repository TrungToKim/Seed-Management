# -*- coding: utf-8 -*-
import re

_DIACRITIC_MAP = {
    "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
    "ă": "a", "ắ": "a", "ằ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
    "â": "a", "ấ": "a", "ầ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
    "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
    "ê": "e", "ế": "e", "ề": "e", "ể": "e", "ễ": "e", "ệ": "e",
    "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
    "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
    "ô": "o", "ố": "o", "ồ": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
    "ơ": "o", "ớ": "o", "ờ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
    "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
    "ư": "u", "ứ": "u", "ừ": "u", "ử": "u", "ữ": "u", "ự": "u",
    "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
    "đ": "d",
}

def strip_diacritics(text: str) -> str:
    return "".join(_DIACRITIC_MAP.get(ch, ch) for ch in (text or "").lower())

def match_score(query: str, target: str) -> float:
    if not query or not target:
        return 0.0

    q_clean = strip_diacritics(query).strip()
    t_clean = strip_diacritics(target).strip()
    
    if not q_clean or not t_clean:
        return 0.0

    # Exact or substring match (ignoring diacritics)
    if q_clean in t_clean:
        if t_clean == q_clean:
            return 100.0
        if t_clean.startswith(q_clean):
            return 80.0
        return 50.0
        
    # Word-by-word match: how many query words are found in the target
    q_tokens = [t for t in q_clean.split() if len(t) >= 2]
    if not q_tokens:
        q_tokens = q_clean.split()
        if not q_tokens:
            return 0.0
            
    t_tokens = t_clean.split()
    
    matched_count = 0
    for qt in q_tokens:
        if any(qt in tt for tt in t_tokens):
            matched_count += 1
            
    if matched_count > 0:
        return (matched_count / len(q_tokens)) * 40.0
        
    return 0.0

def score_plant(plant, query_str: str) -> float:
    score_name = match_score(query_str, getattr(plant, "common_name", "") or "")
    score_sci = match_score(query_str, getattr(plant, "scientific_name", "") or "")
    score_other = match_score(query_str, getattr(plant, "other_names", "") or "")
    score_family = match_score(query_str, getattr(plant, "family", "") or "")
    score_parts = match_score(query_str, getattr(plant, "used_parts", "") or "")
    
    tag_names = " ".join([t.tag_name for t in getattr(plant, "tags", [])]) if getattr(plant, "tags", None) else ""
    score_tags = match_score(query_str, tag_names)
    
    score_desc = match_score(query_str, getattr(plant, "description", "") or "")
    
    # Weightings: common_name > sci_name > other_names > family/parts/tags > description
    return (score_name * 3.0) + (score_sci * 2.5) + (score_other * 2.0) + (score_family * 1.5) + (score_parts * 1.5) + (score_tags * 1.5) + (score_desc * 0.5)
