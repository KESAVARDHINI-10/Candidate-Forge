# Eightfold Candidate Transformation System

A production-quality Multi-Source Candidate Transformation System that converts multiple structured and unstructured candidate sources into a single trusted Canonical Candidate JSON profile.

This system is built as a focused, minimal developer tool with zero admin dashboards, charts, or unnecessary navigation. The hero is the backend transformation pipeline.

## ⚡ Transformation Pipeline Stages

The backend processes ingestion across **13 distinct stages**:
1. **Reading Sources**: Reads file streams (ATS JSON, Recruiter CSV, Resume PDF, DOCX, Notes, GitHub URL).
2. **Parsing Documents**: Standardizes file inputs into text or lists.
3. **Creating Canonical Candidate Model**: Maps tokens into Pydantic models.
4. **Assessing Data Quality**: Checks field completeness and formatting.
5. **Normalizing Values**: Standardizes emails (lowercasing), phones (E.164), dates (ISO-8601), and locations.
6. **Extracting Entities**: Runs regex rules to pull candidate fields from plain text.
7. **Canonicalizing Entities**: Matches skills and degrees against dictionaries using `rapidfuzz` string similarity.
8. **Removing Duplicates**: Merges duplicate records inside individual source files.
9. **Resolving Conflicts**: Merges multiple files based on source reliability weights (ATS JSON > Recruiter CSV > Resumes > Notes > GitHub), logging conflict events.
10. **Calculating Confidence**: Computes section-level and overall match scores.
11. **Tracking Provenance**: Maps every field to its source file, method, and confidence score.
12. **Validating Schema**: Projects the candidate dictionary according to configuration settings and checks validity against the JSON Schema.
13. **Generating JSON**: Builds the final clean JSON payload.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v3, Axios, Lucide React icons, Context-like configurations.
- **Backend**: FastAPI, Python, PyMuPDF (`pymupdf`), `python-docx`, `rapidfuzz` (fuzzy matching), `pandas`, `dateparser`, `phonenumbers`, `jsonschema`.

---

## 🚀 Quick Start Instructions

### 1. Run Backend Server
Ensure Python 3.11+ is installed.

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload
```
The backend API documentation is available at `http://localhost:8000/docs`.

### 2. Run Frontend Server
Ensure Node.js 18+ is installed.

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

### 3. Run Automated Tests
Run pytest from the project root:

```bash
pytest backend/test_app.py
```

---

## 📂 Project Structure

- `backend/app.py`: Consolidated transformation pipeline, models, and FastAPI endpoint.
- `backend/test_app.py`: Unit and integration test assertions.
- `backend/requirements.txt`: Python package requirements.
- `backend/candidate_schema.json`: Standalone candidate JSON Schema.
- `frontend/src/App.jsx`: SPA dashboard with custom syntax-highlighting JSON viewer, timeline, and uploads.
- `sample_inputs/`: Mock files to try out (ATS JSON, Recruiter CSV, Recruiter Notes).
- `sample_outputs/`: The expected canonical output layout.
