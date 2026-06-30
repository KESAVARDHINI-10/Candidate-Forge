import json
import pytest
from fastapi.testclient import TestClient
from app import (
    app,
    Normalizer,
    Canonicalizer,
    Deduplicator,
    ConflictResolver,
    ATSParser,
    UniversalCandidate,
    CandidateSkill,
    WorkExperience
)

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_normalizer():
    # Test Email
    email, _ = Normalizer.normalize_email("  Alex.Mercer@lever.io  ")
    assert email == "alex.mercer@lever.io"
    
    # Test Phone E.164 formatting
    phone, _ = Normalizer.normalize_phone("+1 415-555-0142")
    assert phone == "+14155550142"

    # Test Company
    company, _ = Normalizer.normalize_company("Google Inc.")
    assert company == "Google Incorporated"

    # Test Date
    date_val, _ = Normalizer.normalize_date("June 2021")
    assert date_val == "2021-06-01"

def test_canonicalizer():
    skills = [
        CandidateSkill(name="React.js", original_name="React.js", confidence=1.0),
        CandidateSkill(name="Python3", original_name="Python3", confidence=1.0)
    ]
    canon_skills = Canonicalizer.canonicalize_skills(skills)
    assert canon_skills[0].name == "React"
    assert canon_skills[0].is_canonical is True
    assert canon_skills[0].category == "Frontend Framework"
    
    assert canon_skills[1].name == "Python"
    assert canon_skills[1].is_canonical is True

    deg = Canonicalizer.canonicalize_degree("B.S. in Computer Science")
    assert deg == "Bachelor of Science"

def test_deduplicator():
    candidate = UniversalCandidate()
    candidate.skills = [
        CandidateSkill(name="React", original_name="React.js", confidence=0.9),
        CandidateSkill(name="React", original_name="ReactJS", confidence=0.7)
    ]
    candidate.experience = [
        WorkExperience(company="Google LLC", role="Software Engineer", description="Dev"),
        WorkExperience(company="Google LLC", role="Software Engineer", description="Fullstack")
    ]
    
    cleaned = Deduplicator.deduplicate(candidate)
    assert len(cleaned.skills) == 1
    assert len(cleaned.experience) == 1
    assert "Fullstack" in cleaned.experience[0].description

def test_conflict_resolver():
    ats = UniversalCandidate()
    ats.personal_info.full_name = "Alex Mercer"
    ats.personal_info.emails = ["alex@lever.io"]

    pdf = UniversalCandidate()
    pdf.personal_info.full_name = "Alex M. Mercer"
    pdf.personal_info.emails = ["alex@gmail.com"]

    sources = {"ats_json": ats, "resume_pdf": pdf}
    merged, logs = ConflictResolver.resolve(sources)

    # ATS weight is higher (0.95 vs 0.75), full_name should resolve to "Alex Mercer"
    assert merged.personal_info.full_name == "Alex Mercer"
    
    # Emails lists combined
    assert "alex@lever.io" in merged.personal_info.emails
    assert "alex@gmail.com" in merged.personal_info.emails
    assert len(logs) == 1

def test_transform_api():
    ats_content = json.dumps({
        "name": "Jane Doe",
        "email": "jane@lever.io",
        "skills": ["React.js", "Docker"]
    })
    
    files = {
        "ats_json": ("ats.json", ats_content, "application/json"),
        "recruiter_notes": ("notes.txt", b"Jane Doe\nJane Doe is a Developer based in SF.", "text/plain")
    }
    
    config = {
        "include_confidence": True,
        "include_provenance": True,
        "normalize_skills": True,
        "missing_values": "null",
        "selected_fields": ["full_name", "emails", "skills", "location"]
    }
    
    response = client.post("/transform", files=files, data={"config": json.dumps(config)})
    if response.status_code != 200:
        print("API ERROR DETAILS:", response.text)
    assert response.status_code == 200
    
    payload = response.json()
    assert "candidates" in payload
    assert "batch_metadata" in payload
    assert len(payload["candidates"]) == 1
    
    cand = payload["candidates"][0]
    assert "canonical_json" in cand
    assert "confidence" in cand
    assert "provenance" in cand
    
    canonical = cand["canonical_json"]
    assert canonical["personal_info"]["full_name"] == "Jane Doe"
    assert "jane@lever.io" in canonical["personal_info"]["emails"]
    
    skills_names = [s["name"] for s in canonical["skills"]]
    assert "React" in skills_names
    assert "Docker" in skills_names

def test_nested_custom_json_parsing():
    nested_json = {
        "candidate": {
            "name": "KESAVARDHINI C",
            "contact": {
                "email": "kesavardhinichandran10@gmail.com",
                "phone": "+919342366267",
                "location": {
                    "city": "Theni",
                    "country": "India"
                },
                "linkedin": "https://linkedin.com/in/kesavardhini"
            }
        },
        "education": [
            {
                "degree": "Bachelor of Technology",
                "specialization": "Information Technology",
                "institution": "Karpagam College of Engineering",
                "start_year": "2023",
                "end_year": "2027",
                "cgpa": 9.15
            }
        ]
    }
    
    parsed = ATSParser.parse(nested_json)
    assert parsed.personal_info.full_name == "KESAVARDHINI C"
    assert "kesavardhinichandran10@gmail.com" in parsed.personal_info.emails
    assert "+919342366267" in parsed.personal_info.phones
    assert "Theni" in parsed.personal_info.location
    assert "India" in parsed.personal_info.location
    assert "https://linkedin.com/in/kesavardhini" in parsed.personal_info.links
    
    assert len(parsed.education) == 1
    edu = parsed.education[0]
    assert edu.degree == "Bachelor of Technology"
    assert edu.institution == "Karpagam College of Engineering"
    assert edu.major == "Information Technology"
    assert edu.graduation_date == "2027"

def test_dictionary_skills_and_personal_info_unwrapping():
    nested_json = {
        "personal_info": {
            "name": "KESAVARDHINI C",
            "email": "kesavardhinichandran10@gmail.com",
            "phone": "+919342366267",
            "location": "Theni, India"
        },
        "skills": {
            "programmingLanguages": ["Python", "Java"],
            "webTechnologies": ["HTML", "CSS", "JS"]
        }
    }
    
    parsed = ATSParser.parse(nested_json)
    assert parsed.personal_info.full_name == "KESAVARDHINI C"
    assert "kesavardhinichandran10@gmail.com" in parsed.personal_info.emails
    assert "+919342366267" in parsed.personal_info.phones
    assert parsed.personal_info.location == "Theni, India"
    
    skills_names = [s.name for s in parsed.skills]
    assert "Python" in skills_names
    assert "Java" in skills_names
    assert "HTML" in skills_names
    assert "CSS" in skills_names
    assert "JS" in skills_names
    assert "programmingLanguages" not in skills_names
    assert "webTechnologies" not in skills_names
