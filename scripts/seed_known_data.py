"""Seed the database with published Zamzam chemical compositions and Quranic archaeological sites.

Loads enriched chemistry data from data/reference/manual_compositions.json.
Idempotent: skips if seed data already exists.
"""

import json
import os
import sys
import uuid
from datetime import datetime

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

sys.path.insert(0, ".")
from api.config import settings
from api.database import Base
from api.models import ChemicalAnalysis, ArchaeologicalSite

# Published Zamzam chemical compositions
# Sources: Bhardwaj 2023 (BJSTR), Donia & Mortada 2021 (Heliyon)
ZAMZAM_CHEMISTRY = [
    # Major elements
    {"element": "Ca", "value": 93.0, "unit": "mg/L"},
    {"element": "Mg", "value": 42.0, "unit": "mg/L"},
    {"element": "Na", "value": 210.0, "unit": "mg/L"},
    {"element": "F", "value": 0.74, "unit": "mg/L"},
    {"element": "Li", "value": 0.012, "unit": "mg/L"},
    # Trace elements (very low — safe)
    {"element": "As", "value": 0.006, "unit": "µg/L"},
    {"element": "Pb", "value": 0.0005, "unit": "µg/L"},
    {"element": "Cd", "value": 0.001, "unit": "µg/L"},
    # Physical parameters
    {"element": "pH", "value": 7.95, "unit": "-"},
    {"element": "TDS", "value": 813.0, "unit": "mg/L"},
]

# Quranic archaeological sites
ARCHAEOLOGICAL_SITES = [
    {
        "name_en": "Mecca (Makkah)",
        "name_ar": "مكة المكرمة",
        "quranic_name": "Bakkah / Makkah",
        "surah_refs": "3:96, 48:24",
        "latitude": 21.4225,
        "longitude": 39.8262,
        "modern_location": "Mecca, Saudi Arabia",
        "country": "Saudi Arabia",
        "evidence_status": "confirmed",
        "description": "Site of the Kaaba and Zamzam well. Continuously inhabited sacred city.",
    },
    {
        "name_en": "Medina (Al-Madinah)",
        "name_ar": "المدينة المنورة",
        "quranic_name": "Yathrib",
        "surah_refs": "33:13",
        "latitude": 24.4672,
        "longitude": 39.6112,
        "modern_location": "Medina, Saudi Arabia",
        "country": "Saudi Arabia",
        "evidence_status": "confirmed",
        "description": "City of the Prophet. Archaeological layers confirm pre-Islamic habitation.",
    },
    {
        "name_en": "Mount Sinai (Jabal Musa)",
        "name_ar": "جبل موسى / الطور",
        "quranic_name": "Tur Sina",
        "surah_refs": "95:2, 23:20, 28:29",
        "latitude": 28.5394,
        "longitude": 33.9753,
        "modern_location": "Sinai Peninsula, Egypt",
        "country": "Egypt",
        "evidence_status": "partial",
        "description": "Traditional identification. Multiple candidate locations exist.",
    },
    {
        "name_en": "Madain Salih (Al-Hijr)",
        "name_ar": "مدائن صالح / الحجر",
        "quranic_name": "Al-Hijr",
        "surah_refs": "15:80-84, 7:73-79",
        "latitude": 26.7875,
        "longitude": 37.9531,
        "modern_location": "Al-Ula, Saudi Arabia",
        "country": "Saudi Arabia",
        "evidence_status": "confirmed",
        "description": "UNESCO site. Nabataean tombs, identified with Thamud people. Rock-cut facades.",
        "archaeological_refs": "Healey 1993, Nehmé 2017",
    },
    {
        "name_en": "Sodom (Tall el-Hammam candidate)",
        "name_ar": "سدوم",
        "quranic_name": "Qawm Lut",
        "surah_refs": "11:77-83, 15:61-77, 29:28-35",
        "latitude": 31.8403,
        "longitude": 35.6706,
        "modern_location": "Jordan Valley, Jordan",
        "country": "Jordan",
        "evidence_status": "investigation",
        "description": "Tall el-Hammam excavation shows MBA destruction layer consistent with cosmic airburst (Bunch et al. 2021).",
        "archaeological_refs": "Collins 2007, Bunch 2021",
    },
    {
        "name_en": "Iram of the Pillars (Ubar/Shisr)",
        "name_ar": "إرم ذات العماد",
        "quranic_name": "Iram dhat al-Imad",
        "surah_refs": "89:6-8",
        "latitude": 18.2564,
        "longitude": 53.6542,
        "modern_location": "Shisr, Dhofar, Oman",
        "country": "Oman",
        "evidence_status": "partial",
        "description": "Identified via SPOT satellite imagery (JPL/Clapp 1992). Frankincense trade outpost. Sinkhole collapse.",
        "archaeological_refs": "Clapp 1998, Zarins 1992",
    },
    {
        "name_en": "Marib Dam (Saba)",
        "name_ar": "سد مأرب",
        "quranic_name": "Saba",
        "surah_refs": "34:15-17",
        "latitude": 15.3881,
        "longitude": 45.2747,
        "modern_location": "Marib, Yemen",
        "country": "Yemen",
        "evidence_status": "confirmed",
        "description": "Ancient dam ruins confirmed. Kingdom of Sheba. Flood event (Sayl al-Arim) archaeologically attested.",
        "archaeological_refs": "Glaser 1897, Schmidt 1988",
    },
    {
        "name_en": "Al-Aqsa / Temple Mount",
        "name_ar": "المسجد الأقصى",
        "quranic_name": "Al-Masjid Al-Aqsa",
        "surah_refs": "17:1",
        "latitude": 31.7761,
        "longitude": 35.2354,
        "modern_location": "Jerusalem, Palestine",
        "country": "Palestine",
        "evidence_status": "confirmed",
        "description": "Sacred precinct. Continuous archaeological record from Bronze Age to present.",
    },
    {
        "name_en": "Ebla (Tell Mardikh)",
        "name_ar": "إيبلا",
        "quranic_name": None,
        "surah_refs": None,
        "latitude": 35.7983,
        "longitude": 36.7983,
        "modern_location": "Tell Mardikh, Syria",
        "country": "Syria",
        "evidence_status": "confirmed",
        "description": "Ebla tablets (1975) reference cities also mentioned in Genesis/Quran. Cross-reference source.",
        "archaeological_refs": "Pettinato 1976, Matthiae 1977",
    },
    {
        "name_en": "Pharaoh's body (Cairo Museum)",
        "name_ar": "جثة فرعون",
        "quranic_name": "Fir'awn",
        "surah_refs": "10:90-92",
        "latitude": 30.0478,
        "longitude": 31.2336,
        "modern_location": "Egyptian Museum, Cairo, Egypt",
        "country": "Egypt",
        "evidence_status": "investigation",
        "description": "Merneptah or Ramesses II mummy. Bucaille (1981) study on salt preservation consistent with drowning.",
        "archaeological_refs": "Bucaille 1981",
    },
    {
        "name_en": "Midian (Al-Bad')",
        "name_ar": "مدين",
        "quranic_name": "Madyan",
        "surah_refs": "7:85-93, 28:22-28",
        "latitude": 28.5667,
        "longitude": 36.5833,
        "modern_location": "Al-Bad', Tabuk, Saudi Arabia",
        "country": "Saudi Arabia",
        "evidence_status": "partial",
        "description": "Caves of Shu'ayb (Jethro). Rock-cut tombs and wells. Saudi archaeological surveys confirm ancient settlement.",
    },
    {
        "name_en": "Al-Ahqaf",
        "name_ar": "الأحقاف",
        "quranic_name": "Al-Ahqaf",
        "surah_refs": "46:21",
        "latitude": 19.0,
        "longitude": 52.0,
        "modern_location": "Rub' al-Khali / Dhofar border area",
        "country": "Oman/Yemen",
        "evidence_status": "unlocated",
        "description": "Sand dunes region associated with 'Ad people. Exact location debated. Satellite prospection target.",
    },
]


def seed_chemistry_from_json(session: Session) -> int:
    """Load all chemistry data from manual_compositions.json."""
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "reference", "manual_compositions.json")
    with open(json_path) as f:
        data = json.load(f)

    count = 0
    for source_entry in data["sources"]:
        for element, vals in source_entry["elements"].items():
            analysis = ChemicalAnalysis(
                id=uuid.uuid4(),
                sample_source=source_entry["sample_source"],
                element=element,
                value=vals["value"],
                unit=vals["unit"],
                analytical_method=source_entry["method"],
                sample_location=source_entry["sample_location"],
                publication_doi=source_entry.get("doi"),
                publication_year=source_entry["year"],
                source="paper" if source_entry.get("doi") else "label",
                notes=source_entry["citation"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(analysis)
            count += 1
    return count


def seed_archaeological_sites(session: Session) -> int:
    count = 0
    for site_data in ARCHAEOLOGICAL_SITES:
        site = ArchaeologicalSite(
            id=uuid.uuid4(),
            name_en=site_data["name_en"],
            name_ar=site_data.get("name_ar"),
            quranic_name=site_data.get("quranic_name"),
            surah_refs=site_data.get("surah_refs"),
            latitude=site_data.get("latitude"),
            longitude=site_data.get("longitude"),
            modern_location=site_data.get("modern_location"),
            country=site_data.get("country"),
            evidence_status=site_data["evidence_status"],
            description=site_data.get("description"),
            archaeological_refs=site_data.get("archaeological_refs"),
            geojson={
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [site_data["longitude"], site_data["latitude"]],
                },
                "properties": {"name": site_data["name_en"]},
            }
            if site_data.get("latitude")
            else None,
            source="literature",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(site)
        count += 1
    return count


def main():
    engine = create_engine(settings.database_url_sync)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Check if enriched chemistry data already loaded (look for multiple sources)
        chem_sources = session.execute(
            select(func.count(func.distinct(ChemicalAnalysis.sample_source)))
        ).scalar()
        sites_count_existing = session.execute(
            select(func.count()).select_from(ArchaeologicalSite).where(
                ArchaeologicalSite.source == "literature",
            )
        ).scalar()

        chem_count = 0
        sites_count = 0

        # Re-seed chemistry if we only have old data (1 source = bhardwaj only)
        if chem_sources <= 1:
            # Clear old seed data and re-seed from enriched JSON
            session.query(ChemicalAnalysis).filter(
                ChemicalAnalysis.source.in_(["paper", "label"])
            ).delete(synchronize_session=False)
            chem_count = seed_chemistry_from_json(session)
        else:
            print(f"Enriched chemistry data already loaded ({chem_sources} sources), skipping.")

        if sites_count_existing == 0:
            sites_count = seed_archaeological_sites(session)
        else:
            print(f"Archaeological sites already exist ({sites_count_existing} rows), skipping.")

        if chem_count or sites_count:
            session.commit()

        if chem_count:
            print(f"Seeded {chem_count} chemical analyses from {chem_sources} sources")
        if sites_count:
            print(f"Seeded {sites_count} archaeological sites")


if __name__ == "__main__":
    main()
