import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileJson, FileSpreadsheet, FileText, Globe, Check, AlertTriangle, 
  Settings, Play, Loader2, Copy, Download, Search, CheckCircle, RefreshCw, 
  ChevronDown, ChevronUp, Github, Sun, Moon, Info, X
} from 'lucide-react';
import axios from 'axios';

// =====================================================================
// FRONTEND CONSTANTS
// =====================================================================

const API_BASE = 'http://127.0.0.1:8000';

const PIPELINE_STAGES = [
  "Reading Sources",
  "Parsing Documents",
  "Creating Canonical Candidate Model",
  "Assessing Data Quality",
  "Normalizing Values",
  "Extracting Entities",
  "Canonicalizing Entities",
  "Removing Duplicates",
  "Resolving Conflicts",
  "Calculating Confidence",
  "Tracking Provenance",
  "Validating Schema",
  "Generating JSON"
];

export default function App() {
  // Theme and UI States
  const [darkMode, setDarkMode] = useState(true);
  const [configExpanded, setConfigExpanded] = useState(false);

  // File Upload State
  const [files, setFiles] = useState({
    ats_json: [],
    recruiter_csv: [],
    resume_pdf: [],
    resume_docx: [],
    recruiter_notes: []
  });
  
  const [notesText, setNotesText] = useState("");
  const [useNotesFile, setUseNotesFile] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);

  // Validation Check
  const [isValid, setIsValid] = useState(false);

  // Configuration settings
  const [config, setConfig] = useState({
    include_confidence: true,
    include_provenance: true,
    normalize_skills: true,
    normalize_phones: true,
    normalize_dates: true,
    normalize_companies: true,
    normalize_degrees: true,
    missing_values: 'null', // 'null' | 'omit' | 'error'
    selected_fields: [
      "full_name", "emails", "phones", "skills", "experience", 
      "education", "projects", "links", "location", "headline"
    ]
  });

  // Pipeline Execution State
  // 'idle' | 'processing' | 'success' | 'error'
  const [runState, setRunState] = useState('idle'); 
  const [activeStep, setActiveStep] = useState(-1);
  const [transformResult, setTransformResult] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isReapplyingConfig, setIsReapplyingConfig] = useState(false);
  const [resultsConfigExpanded, setResultsConfigExpanded] = useState(false);
  const [resultViewMode, setResultViewMode] = useState('json'); // 'json' | 'table' | 'portfolio'

  // JSON Viewer state
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedKeys, setCollapsedKeys] = useState({});

  // File Inputs references
  const fileInputs = {
    ats_json: useRef(null),
    recruiter_csv: useRef(null),
    resume_pdf: useRef(null),
    resume_docx: useRef(null),
    recruiter_notes: useRef(null)
  };

  // Check validation requirements
  useEffect(() => {
    const hasStructured = files.ats_json.length > 0 || files.recruiter_csv.length > 0;
    const hasUnstructured = 
      files.resume_pdf.length > 0 || 
      files.resume_docx.length > 0 || 
      (useNotesFile ? files.recruiter_notes.length > 0 : notesText.trim() !== "") || 
      githubUrl.trim() !== "";
      
    setIsValid(hasStructured && hasUnstructured);
  }, [files, notesText, githubUrl, useNotesFile]);

  // Dark mode trigger
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle file select
  const handleFileChange = (key, fileList) => {
    if (!fileList || fileList.length === 0) return;
    const addedFiles = Array.from(fileList);
    setFiles(prev => ({ 
      ...prev, 
      [key]: [...prev[key], ...addedFiles]
    }));
  };

  const removeFile = (key, idx) => {
    setFiles(prev => ({ 
      ...prev, 
      [key]: prev[key].filter((_, i) => i !== idx) 
    }));
    if (fileInputs[key].current) fileInputs[key].current.value = "";
  };

  // Handle Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, key) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFileChange(key, e.dataTransfer.files);
    }
  };

  // Submit / Transform Action
  const handleGenerate = async () => {
    if (!isValid) return;
    
    setRunState('processing');
    setActiveStep(0);
    setErrorDetails(null);
    setTransformResult(null);
    setSelectedCandidateIndex(0);

    // Timeline Simulation Hook (for gorgeous UI progress timeline)
    const runSimulation = () => {
      return new Promise((resolve) => {
        let step = 0;
        const interval = setInterval(() => {
          step++;
          if (step < PIPELINE_STAGES.length - 2) { // Simulate up to resolving/confidence
            setActiveStep(step);
          } else {
            clearInterval(interval);
            resolve();
          }
        }, 180);
      });
    };

    // Construct form payload
    const formData = new FormData();
    files.ats_json.forEach(f => formData.append('ats_json', f));
    files.recruiter_csv.forEach(f => formData.append('recruiter_csv', f));
    files.resume_pdf.forEach(f => formData.append('resume_pdf', f));
    files.resume_docx.forEach(f => formData.append('resume_docx', f));
    
    if (useNotesFile) {
      files.recruiter_notes.forEach(f => formData.append('recruiter_notes', f));
    } else if (notesText.trim()) {
      formData.append('recruiter_notes_str', notesText);
    }
    
    if (githubUrl.trim()) {
      formData.append('github_url', githubUrl);
    }
    
    formData.append('config', JSON.stringify(config));

    try {
      // Start simulator parallel with network fetch
      const simPromise = runSimulation();
      
      const apiResponse = await axios.post(`${API_BASE}/transform`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log("AXIOS BACKEND RESPONSE DATA:", apiResponse.data);
      if (apiResponse.data && apiResponse.data.candidates) {
        apiResponse.data.candidates.forEach((cand, cIdx) => {
          console.log(`CANDIDATE ${cIdx} CANONICAL JSON:`, cand.canonical_json);
          console.log(`CANDIDATE ${cIdx} PERSONAL_INFO:`, cand.canonical_json?.personal_info);
          console.log(`CANDIDATE ${cIdx} FULL_NAME:`, cand.canonical_json?.personal_info?.full_name);
        });
      }
      
      await simPromise; // Wait for simulator to catch up
      
      // Successfully finished all stages
      setActiveStep(PIPELINE_STAGES.length - 2);
      setTimeout(() => {
        setActiveStep(PIPELINE_STAGES.length - 1);
        setTimeout(() => {
          setTransformResult(apiResponse.data);
          setRunState('success');
        }, 150);
      }, 150);
      
    } catch (err) {
      console.error(err);
      let details = "An unexpected error occurred in the transformation engine.";
      let step_failed = "Transformation Engine";
      
      if (err.response && err.response.data && err.response.data.detail) {
        details = err.response.data.detail;
      }
      
      // Determine which stage likely failed based on error message
      if (details.includes("ATS")) step_failed = "Parsing Documents";
      else if (details.includes("GitHub")) step_failed = "Reading Sources";
      else if (details.includes("PDF") || details.includes("DOCX")) step_failed = "Reading Sources";
      else if (details.includes("projection")) step_failed = "Validating Schema";
      
      // Set failed active step
      const failIndex = PIPELINE_STAGES.indexOf(step_failed);
      setActiveStep(failIndex !== -1 ? failIndex : 4);
      
      setErrorDetails({
        stage: step_failed,
        reason: details,
        fix: getSuggestedFix(details)
      });
      
      setTimeout(() => {
        setRunState('error');
      }, 300);
    }
  };

  const reapplyConfig = async (latestConfig) => {
    if (!isValid || !transformResult) return;
    
    setIsReapplyingConfig(true);
    
    const formData = new FormData();
    files.ats_json.forEach(f => formData.append('ats_json', f));
    files.recruiter_csv.forEach(f => formData.append('recruiter_csv', f));
    files.resume_pdf.forEach(f => formData.append('resume_pdf', f));
    files.resume_docx.forEach(f => formData.append('resume_docx', f));
    
    if (useNotesFile) {
      files.recruiter_notes.forEach(f => formData.append('recruiter_notes', f));
    } else if (notesText.trim()) {
      formData.append('recruiter_notes_str', notesText);
    }
    
    if (githubUrl.trim()) {
      formData.append('github_url', githubUrl);
    }
    
    formData.append('config', JSON.stringify(latestConfig));

    try {
      const apiResponse = await axios.post(`${API_BASE}/transform`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log("AXIOS BACKEND RESPONSE DATA (REAPPLIED):", apiResponse.data);
      setTransformResult(apiResponse.data);
    } catch (err) {
      console.error(err);
      let details = "An unexpected error occurred in the transformation engine.";
      if (err.response && err.response.data && err.response.data.detail) {
        details = err.response.data.detail;
      }
      alert("Error applying configuration: " + details);
    } finally {
      setIsReapplyingConfig(false);
    }
  };

  const updateConfig = (updater) => {
    setConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      // Check if we have active files and are on the success screen
      if (runState === 'success') {
        reapplyConfig(next);
      }
      return next;
    });
  };

  const getSuggestedFix = (detailMsg) => {
    const msg = detailMsg.toLowerCase();
    if (msg.includes("github")) {
      return "Verify your internet connectivity and ensure the GitHub profile URL is correct. Alternatively, check API rate-limits.";
    }
    if (msg.includes("ats json")) {
      return "Ensure your ATS export is correctly formatted. Supported keys include name, email, phones, positions, and schools.";
    }
    if (msg.includes("structured source")) {
      return "Please check that you have uploaded at least one structured JSON/CSV file and one unstructured resume/notes file.";
    }
    if (msg.includes("projection")) {
      return "An output projection mapping constraint failed. Verify your output configurations and field requirements.";
    }
    return "Check that your files are not corrupted and comply with standard text formats (utf-8).";
  };

  // Field selection toggler
  const toggleField = (field) => {
    updateConfig(prev => {
      const selected = prev.selected_fields.includes(field)
        ? prev.selected_fields.filter(f => f !== field)
        : [...prev.selected_fields, field];
      return { ...prev, selected_fields: selected };
    });
  };

  // Copy to clipboard helper
  const copyToClipboard = () => {
    if (!transformResult || !transformResult.candidates[selectedCandidateIndex]) return;
    const json = transformResult.candidates[selectedCandidateIndex].canonical_json;
    const jsonStr = JSON.stringify(json, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download selected JSON file
  const downloadJson = () => {
    if (!transformResult || !transformResult.candidates[selectedCandidateIndex]) return;
    const json = transformResult.candidates[selectedCandidateIndex].canonical_json;
    const jsonStr = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canonical_candidate_${json.candidate_id || 'profile'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download all batch JSON profiles
  const downloadBatchJson = () => {
    if (!transformResult || !transformResult.candidates) return;
    const batchJson = transformResult.candidates.map(c => c.canonical_json);
    const jsonStr = JSON.stringify(batchJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canonical_candidates_batch.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExport = async (format) => {
    if (!transformResult) return;
    const configByFormat = {
      json: { endpoint: '/export/json', filename: 'candidates_full_result.json', mime: 'application/json' },
      pdf: { endpoint: '/export/pdf', filename: 'candidates_profiles.pdf', mime: 'application/pdf' },
      csv: { endpoint: '/export/csv', filename: 'candidates_summary.csv', mime: 'text/csv' },
      excel: { endpoint: '/export/excel', filename: 'candidates_summary.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    };
    const exportConfig = configByFormat[format];
    if (!exportConfig) return;
    const response = await axios.post(`${API_BASE}${exportConfig.endpoint}`, transformResult, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: exportConfig.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportConfig.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const asArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  };

  const flattenValues = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(flattenValues);
    if (typeof value === 'object') return Object.values(value).flatMap(flattenValues);
    return [String(value)];
  };

  const formatValue = (value) => flattenValues(value).join(', ');

  const normalizeSkill = (skill) => {
    if (typeof skill === 'string') {
      return { name: skill, confidence: 1 };
    }
    return {
      ...skill,
      name: skill?.name || skill?.skill || 'Unnamed skill',
      confidence: Number.isFinite(skill?.confidence) ? skill.confidence : 1
    };
  };

  const normalizeExperience = (experience) => ({
    ...experience,
    role: experience?.role || experience?.title || '',
    company: experience?.company || '',
    start_date: experience?.start_date || experience?.start || '',
    end_date: experience?.end_date || experience?.end || '',
    description: experience?.description || experience?.summary || ''
  });

  const normalizeEducation = (education) => ({
    ...education,
    institution: education?.institution || education?.school || '',
    degree: education?.degree || '',
    major: education?.major || education?.field || '',
    graduation_date: education?.graduation_date || education?.end_year || education?.end || ''
  });

  const normalizeProject = (project) => ({
    ...project,
    name: project?.name || project?.title || '',
    description: project?.description || project?.summary || '',
    technologies: asArray(project?.technologies),
    url: project?.url || project?.link || ''
  });

  const normalizeCandidateView = (candidate) => {
    const json = candidate?.canonical_json || {};
    const personal = json.personal_info || {};

    return {
      full_name: personal.full_name || json.full_name || json.name || candidate?.candidate_name || '',
      headline: personal.headline || json.headline || '',
      emails: asArray(personal.emails || json.emails),
      phones: asArray(personal.phones || json.phones),
      location: formatValue(personal.location || json.location),
      links: flattenValues(personal.links || json.links),
      skills: asArray(json.skills).map(normalizeSkill).slice(0, 80),
      experience: asArray(json.experience).map(normalizeExperience).slice(0, 40),
      education: asArray(json.education).map(normalizeEducation).slice(0, 40),
      projects: asArray(json.projects).map(normalizeProject).slice(0, 40)
    };
  };

  const selectedCandidate = transformResult?.candidates?.[selectedCandidateIndex] || null;
  const selectedJson = selectedCandidate?.canonical_json || {};
  const selectedProfile = normalizeCandidateView(selectedCandidate);
  const selectedTrust = selectedCandidate?.trust_analysis || null;
  const trustSections = Object.entries(selectedTrust?.section_scores || {});
  const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
  const formatLabel = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const sectionFormulaText = (data) => {
    const reliability = Number(data?.source_reliability) || 0;
    const agreement = Number(data?.source_agreement_ratio) || 0;
    const freshness = Number(data?.freshness_score) || 0;
    const completeness = Number(data?.completeness_ratio) || 0;
    const semantic = Number(data?.semantic_match_quality) || 0;
    const score = reliability * 0.35 + agreement * 0.25 + freshness * 0.15 + completeness * 0.15 + semantic * 0.10;
    return `Formula: (${formatPercent(reliability)} x 35%) + (${formatPercent(agreement)} x 25%) + (${formatPercent(freshness)} x 15%) + (${formatPercent(completeness)} x 15%) + (${formatPercent(semantic)} x 10%) = ${formatPercent(score)}.`;
  };
  const trustFormulaText = selectedTrust
    ? `Formula: sum(section score x section weight). Current trust = ${formatPercent(selectedTrust.overall_trust_score)}. Section weights: skills 25%, experience 25%, education 15%, projects 15%, contact 10%, links/profile 10%.`
    : '';
  const matchFormulaText = selectedTrust
    ? `Formula: (Trust ${formatPercent(selectedTrust.overall_trust_score)} x 70%) + (JD/fit score x 30%). If no JD is provided, trust is reused for the fit component. Current match = ${formatPercent(selectedTrust.overall_match_score)}.`
    : '';
  const FormulaHint = ({ text }) => (
    <span className="relative inline-flex group align-middle ml-1">
      <Info size={12} className="text-blue-400 cursor-help" />
      <span className="pointer-events-none absolute z-50 hidden group-hover:block right-0 top-5 w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] leading-4 text-gray-200 shadow-xl font-mono normal-case tracking-normal">
        {text}
      </span>
    </span>
  );
  const renderHighlightedJson = () => {
    if (!transformResult || !transformResult.candidates[selectedCandidateIndex]) return null;
    const json = transformResult.candidates[selectedCandidateIndex].canonical_json;
    console.log("JSON VIEWER INPUT:", json);
    console.log("JSON VIEWER PERSONAL INFO:", json?.personal_info);
    console.log("JSON VIEWER FULL NAME:", json?.personal_info?.full_name);
    const jsonStr = JSON.stringify(json, null, 2);
    const lines = jsonStr.split('\n');

    return lines.map((line, idx) => {
      // Basic syntax highlighting tags
      let renderedLine = line;
      let isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Match keys
      renderedLine = renderedLine.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)/g, 
        '<span class="text-blue-400 font-medium">$1</span>$3'
      );
      
      // Match values
      renderedLine = renderedLine.replace(
        /(:\s*)("(?:\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(,)?$/g, 
        '$1<span class="text-amber-300">$2</span>$3'
      );
      
      // Match numbers
      renderedLine = renderedLine.replace(
        /(:\s*)(\d+(?:\.\d+)?)(,)?$/g, 
        '$1<span class="text-violet-400 font-mono">$2</span>$3'
      );

      // Match booleans
      renderedLine = renderedLine.replace(
        /(:\s*)(true|false)(,)?$/g, 
        '$1<span class="text-emerald-400">$2</span>$3'
      );

      return (
        <div 
          key={idx} 
          className={`flex select-text px-4 font-mono text-sm leading-6 ${isMatch ? 'bg-blue-500/20 text-white font-bold ring-1 ring-blue-500/50' : 'text-gray-300'}`}
        >
          <span className="w-10 select-none pr-3 text-right text-gray-600">{idx + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: renderedLine }} />
        </div>
      );
    });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0b0f19] text-gray-200' : 'bg-slate-50 text-slate-800'} font-sans`}>
      
      {/* =====================================================================
          HEADER / NAVBAR
          ===================================================================== */}
      <header className={`border-b ${darkMode ? 'border-slate-800 bg-[#0d1424]/90' : 'border-slate-200 bg-white/90'} sticky top-0 z-50 backdrop-blur`}>
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1 rounded-lg text-sm">⚡</span>
              CandidateForge
            </h1>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-0.5`}>
              Convert multiple candidate sources into one trusted canonical profile.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className={`p-2 rounded-lg border ${darkMode ? 'border-slate-800 hover:bg-slate-800 text-gray-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'} transition-all`}
            >
              <Github size={18} />
            </a>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border ${darkMode ? 'border-slate-800 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-blue-600'} transition-all`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8 space-y-8">
        
        {/* =====================================================================
            MAIN FLOW VIEWS (IDLE, PROCESSING, SUCCESS, ERROR)
            ===================================================================== */}
        
        {runState === 'idle' && (
          <>
            {/* =====================================================================
                SECTION 2: UPLOAD SOURCES
                ===================================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>1.</span> Upload Sources
                </h2>
                <span className="text-xs text-gray-500 font-mono">
                  At least 1 structured + 1 unstructured source required
                </span>
              </div>

              {/* Grid of Upload Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. ATS JSON */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'ats_json')}
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    files.ats_json.length > 0 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                      <FileJson size={24} />
                    </div>
                    {files.ats_json.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <Check size={14} /> {files.ats_json.length} Structured
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2.5 flex-1 overflow-y-auto max-h-[85px] pr-1">
                    <h3 className="font-semibold text-sm">ATS JSON</h3>
                    {files.ats_json.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {files.ats_json.map((f, index) => (
                          <div key={index} className="flex items-center justify-between text-[11px] bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 gap-1">
                            <span className="truncate flex-1 font-mono">{f.name}</span>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile('ats_json', index); }}
                              className="text-red-400 hover:text-red-300 font-bold px-1 select-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                        Lever, Greenhouse, Workday formats
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    <label className="text-xs text-blue-500 font-medium hover:underline cursor-pointer">
                      Add File(s)
                      <input 
                        type="file" 
                        ref={fileInputs.ats_json}
                        onChange={(e) => handleFileChange('ats_json', e.target.files)}
                        accept=".json" 
                        multiple
                        className="hidden" 
                      />
                    </label>
                    {files.ats_json.length > 0 && (
                      <button onClick={() => setFiles(p => ({ ...p, ats_json: [] }))} className="text-xs text-red-400 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Recruiter CSV */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'recruiter_csv')}
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    files.recruiter_csv.length > 0 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                      <FileSpreadsheet size={24} />
                    </div>
                    {files.recruiter_csv.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <Check size={14} /> {files.recruiter_csv.length} Structured
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2.5 flex-1 overflow-y-auto max-h-[85px] pr-1">
                    <h3 className="font-semibold text-sm">Recruiter CSV</h3>
                    {files.recruiter_csv.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {files.recruiter_csv.map((f, index) => (
                          <div key={index} className="flex items-center justify-between text-[11px] bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 gap-1">
                            <span className="truncate flex-1 font-mono">{f.name}</span>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile('recruiter_csv', index); }}
                              className="text-red-400 hover:text-red-300 font-bold px-1 select-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                        Column standard format mappings
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    <label className="text-xs text-blue-500 font-medium hover:underline cursor-pointer">
                      Add File(s)
                      <input 
                        type="file" 
                        ref={fileInputs.recruiter_csv}
                        onChange={(e) => handleFileChange('recruiter_csv', e.target.files)}
                        accept=".csv" 
                        multiple
                        className="hidden" 
                      />
                    </label>
                    {files.recruiter_csv.length > 0 && (
                      <button onClick={() => setFiles(p => ({ ...p, recruiter_csv: [] }))} className="text-xs text-red-400 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Resume PDF */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'resume_pdf')}
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    files.resume_pdf.length > 0 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                      <FileText size={24} />
                    </div>
                    {files.resume_pdf.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <Check size={14} /> {files.resume_pdf.length} Unstructured
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2.5 flex-1 overflow-y-auto max-h-[85px] pr-1">
                    <h3 className="font-semibold text-sm">Resume PDF</h3>
                    {files.resume_pdf.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {files.resume_pdf.map((f, index) => (
                          <div key={index} className="flex items-center justify-between text-[11px] bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 gap-1">
                            <span className="truncate flex-1 font-mono">{f.name}</span>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile('resume_pdf', index); }}
                              className="text-red-400 hover:text-red-300 font-bold px-1 select-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                        Standard candidate resume file
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    <label className="text-xs text-blue-500 font-medium hover:underline cursor-pointer">
                      Add File(s)
                      <input 
                        type="file" 
                        ref={fileInputs.resume_pdf}
                        onChange={(e) => handleFileChange('resume_pdf', e.target.files)}
                        accept=".pdf" 
                        multiple
                        className="hidden" 
                      />
                    </label>
                    {files.resume_pdf.length > 0 && (
                      <button onClick={() => setFiles(p => ({ ...p, resume_pdf: [] }))} className="text-xs text-red-400 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Resume DOCX */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'resume_docx')}
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    files.resume_docx.length > 0 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                      <FileText size={24} />
                    </div>
                    {files.resume_docx.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <Check size={14} /> {files.resume_docx.length} Unstructured
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2.5 flex-1 overflow-y-auto max-h-[85px] pr-1">
                    <h3 className="font-semibold text-sm">Resume DOCX</h3>
                    {files.resume_docx.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {files.resume_docx.map((f, index) => (
                          <div key={index} className="flex items-center justify-between text-[11px] bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 gap-1">
                            <span className="truncate flex-1 font-mono">{f.name}</span>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); removeFile('resume_docx', index); }}
                              className="text-red-400 hover:text-red-300 font-bold px-1 select-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                        Microsoft Word documents
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    <label className="text-xs text-blue-500 font-medium hover:underline cursor-pointer">
                      Add File(s)
                      <input 
                        type="file" 
                        ref={fileInputs.resume_docx}
                        onChange={(e) => handleFileChange('resume_docx', e.target.files)}
                        accept=".docx" 
                        multiple
                        className="hidden" 
                      />
                    </label>
                    {files.resume_docx.length > 0 && (
                      <button onClick={() => setFiles(p => ({ ...p, resume_docx: [] }))} className="text-xs text-red-400 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. Recruiter Notes */}
                <div 
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    (useNotesFile ? files.recruiter_notes.length > 0 : notesText.trim() !== "")
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <FileText size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setUseNotesFile(!useNotesFile)}
                        className="text-[10px] text-gray-500 underline uppercase tracking-wider hover:text-gray-300"
                      >
                        {useNotesFile ? 'Enter text' : 'Upload files'}
                      </button>
                      {(useNotesFile ? files.recruiter_notes.length > 0 : notesText.trim() !== "") && (
                        <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                          <Check size={14} /> Unstructured
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 w-full flex-1 overflow-y-auto max-h-[85px] pr-1">
                    <h3 className="font-semibold text-sm">Recruiter Notes</h3>
                    {useNotesFile ? (
                      files.recruiter_notes.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {files.recruiter_notes.map((f, index) => (
                            <div key={index} className="flex items-center justify-between text-[11px] bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 gap-1">
                              <span className="truncate flex-1 font-mono">{f.name}</span>
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); removeFile('recruiter_notes', index); }}
                                className="text-red-400 hover:text-red-300 font-bold px-1 select-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                          Recruiter interview txt comments
                        </p>
                      )
                    ) : (
                      <textarea 
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Type recruiter feedback comments (delimit multiple using '---')..."
                        rows={2}
                        className={`text-xs w-full px-2 py-1 rounded border mt-1 outline-none resize-none ${
                          darkMode ? 'bg-slate-900 border-slate-700 text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    {useNotesFile ? (
                      <label className="text-xs text-blue-500 font-medium hover:underline cursor-pointer">
                        Add File(s)
                        <input 
                          type="file" 
                          ref={fileInputs.recruiter_notes}
                          onChange={(e) => handleFileChange('recruiter_notes', e.target.files)}
                          accept=".txt" 
                          multiple
                          className="hidden" 
                        />
                      </label>
                    ) : (
                      <span className="text-[10px] text-gray-500">Freeform feedback details</span>
                    )}
                    {useNotesFile && files.recruiter_notes.length > 0 && (
                      <button onClick={() => setFiles(p => ({ ...p, recruiter_notes: [] }))} className="text-xs text-red-400 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 6. GitHub URL */}
                <div 
                  className={`border rounded-card p-5 relative flex flex-col justify-between h-[180px] ${
                    githubUrl.trim() !== ""
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : (darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm')
                  } hover:border-blue-500/40 transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Globe size={24} />
                    </div>
                    {githubUrl.trim() !== "" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <Check size={14} /> Unstructured
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 w-full flex-1">
                    <h3 className="font-semibold text-sm">GitHub Profiles</h3>
                    <textarea 
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="Links (comma or newline separated)..."
                      rows={2}
                      className={`text-xs w-full px-2 py-1 rounded border mt-1 outline-none resize-none ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/20 select-none">
                    <span className="text-[10px] text-gray-500">Auto-crawls links</span>
                  </div>
                </div>

              </div>
            </section>

            {/* =====================================================================
                SECTION 3: OUTPUT CONFIGURATION
                ===================================================================== */}
            <section className={`border rounded-card overflow-hidden ${darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm'}`}>
              <button 
                onClick={() => setConfigExpanded(!configExpanded)}
                className={`w-full px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-all`}
              >
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-blue-500" />
                  <span className="font-semibold text-sm">2. Output Configuration</span>
                </div>
                {configExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {configExpanded && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Normalizers & Metadata */}
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Normalizations & Metadata</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.include_confidence}
                            onChange={(e) => updateConfig({ include_confidence: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Include Confidence
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.include_provenance}
                            onChange={(e) => updateConfig({ include_provenance: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Include Provenance
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.normalize_skills}
                            onChange={(e) => updateConfig({ normalize_skills: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Normalize Skills
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.normalize_phones}
                            onChange={(e) => updateConfig({ normalize_phones: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Normalize Phones
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.normalize_dates}
                            onChange={(e) => updateConfig({ normalize_dates: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Normalize Dates
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.normalize_companies}
                            onChange={(e) => updateConfig({ normalize_companies: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Normalize Companies
                        </label>
                        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={config.normalize_degrees}
                            onChange={(e) => updateConfig({ normalize_degrees: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          Normalize Degrees
                        </label>
                      </div>
                    </div>

                    {/* Missing Values Strategy */}
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Missing Values Behavior</h4>
                      <div className="flex gap-6 items-center">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="missing_values" 
                            value="null"
                            checked={config.missing_values === 'null'}
                            onChange={(e) => updateConfig({ missing_values: e.target.value })}
                            className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          null value
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="missing_values" 
                            value="omit"
                            checked={config.missing_values === 'omit'}
                            onChange={(e) => updateConfig({ missing_values: e.target.value })}
                            className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          omit field
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="missing_values" 
                            value="error"
                            checked={config.missing_values === 'error'}
                            onChange={(e) => updateConfig({ missing_values: e.target.value })}
                            className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                          />
                          raise error
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* Output Fields Selector */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Target Output Fields</h4>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        "full_name", "emails", "phones", "skills", "experience", 
                        "education", "projects", "links", "location", "headline"
                      ].map((field) => {
                        const isSel = config.selected_fields.includes(field);
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleField(field)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                              isSel 
                                ? 'bg-blue-600 text-white shadow' 
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {field.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </section>

            {/* =====================================================================
                SECTION 4: GENERATE BUTTON
                ===================================================================== */}
            <div className="flex flex-col items-center pt-4">
              <button
                onClick={handleGenerate}
                disabled={!isValid}
                className={`flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm shadow-lg transition-all ${
                  isValid
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-gray-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <Play size={16} fill={isValid ? '#fff' : 'none'} />
                Generate Canonical JSON
              </button>
              
              {!isValid && (
                <p className="text-xs text-amber-500/80 mt-3 flex items-center gap-1.5">
                  <Info size={14} /> Please upload at least one structured source (ATS/CSV) and one unstructured source (PDF/DOCX/Notes/GitHub).
                </p>
              )}
            </div>
          </>
        )}

        {/* =====================================================================
            SECTION 5: PROCESSING STATUS (TIMELINE)
            ===================================================================== */}
        {runState === 'processing' && (
          <section className={`border rounded-card p-8 max-w-[680px] mx-auto ${
            darkMode ? 'bg-[#121826] border-slate-800' : 'bg-white border-slate-200 shadow-lg'
          } space-y-6`}>
            
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <div className="flex flex-col">
                <h3 className="font-bold text-base">Running Transformation Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">Merging source files, tracking confidence and standardizing values...</p>
              </div>
            </div>

            {/* Timelines Step Flow */}
            <div className="relative pl-6 space-y-4 border-l border-slate-800 ml-3">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isFinished = idx < activeStep;
                const isActive = idx === activeStep;
                
                return (
                  <div key={stage} className="relative flex items-center justify-between">
                    {/* Circle Bullet */}
                    <div className={`absolute -left-[30px] rounded-full w-5 h-5 flex items-center justify-between text-[10px] border transition-all ${
                      isFinished 
                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold' 
                        : (isActive 
                            ? 'bg-blue-600 border-blue-600 text-white animate-pulse' 
                            : 'bg-[#121826] border-slate-800 text-gray-500')
                    }`}>
                      {isFinished ? (
                        <Check className="mx-auto" size={12} strokeWidth={3} />
                      ) : (
                        <span className="mx-auto font-mono">{idx + 1}</span>
                      )}
                    </div>

                    <span className={`text-xs transition-all ${
                      isFinished ? 'text-emerald-500 font-medium' : (isActive ? 'text-blue-500 font-bold' : 'text-gray-500')
                    }`}>
                      {stage}
                    </span>

                    {isActive && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-mono">
                        RUNNING
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 6: RESULT SHOWCASING
            ===================================================================== */}
        {runState === 'success' && transformResult && (
          <div className="space-y-6">
            
            {/* 6.1 Success Summary Card */}
            <div className={`border rounded-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              darkMode ? 'bg-[#121826] border-slate-800' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-emerald-500">Batch Ingestion Completed Successfully</h3>
                  <div className="flex items-center gap-2 pt-1.5">
                    <span className="text-xs text-gray-400 font-mono">View Profile:</span>
                    <select
                      value={selectedCandidateIndex}
                      onChange={(e) => setSelectedCandidateIndex(Number(e.target.value))}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-none cursor-pointer ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
                      }`}
                    >
                      {transformResult.candidates.map((c, idx) => (
                        <option key={idx} value={idx}>
                          {c.candidate_name} ({Math.round(c.confidence.overall_score * 100)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Selected Candidate Confidence Progress Bar */}
              {transformResult.candidates[selectedCandidateIndex] && (
                <div className="flex items-center gap-6 min-w-[220px]">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-450 inline-flex items-center">Match Quality <FormulaHint text={matchFormulaText || "Overall profile confidence from section scores."} /></span>
                      <span className="font-bold text-blue-400">
                        {Math.round(transformResult.candidates[selectedCandidateIndex].confidence.overall_score * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${transformResult.candidates[selectedCandidateIndex].confidence.overall_score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="text-right border-l border-slate-800 pl-6 hidden md:block select-none">
                <div className="text-[10px] text-gray-500 font-mono">TOTAL CANDIDATES</div>
                <div className="text-base font-bold text-blue-500 font-mono">{transformResult.batch_metadata.total_candidates} Profiles</div>
                <div className="text-[10px] text-gray-600 font-mono mt-1">IN {transformResult.batch_metadata.generation_time_ms} ms</div>
              </div>
            </div>

            {/* Trust Analysis */}
            {selectedTrust && (
              <section className={`border rounded-card p-6 space-y-6 ${
                darkMode ? 'bg-[#121826] border-slate-800' : 'bg-white border-slate-200 shadow-md'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <Info size={18} className="text-blue-500" />
                      <h3 className="font-bold text-lg">AI Candidate Trust Analysis</h3>
                    </div>
                    <p className={`text-sm leading-6 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      {selectedTrust.candidate_summary}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono">
                        Source: {selectedTrust.most_reliable_source || 'N/A'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/70 text-gray-300 text-xs font-mono">
                        Conflict Ratio: {formatPercent(selectedTrust.ratios?.conflict_ratio)}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/70 text-gray-300 text-xs font-mono">
                        Missing Ratio: {formatPercent(selectedTrust.ratios?.missing_information_ratio)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[390px]">
                    <div className="border border-slate-800 rounded-card p-3 bg-slate-950/30">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold inline-flex items-center">Trust <FormulaHint text={trustFormulaText} /></div>
                      <div className="text-2xl font-black text-blue-400 font-mono mt-1">{formatPercent(selectedTrust.overall_trust_score)}</div>
                    </div>
                    <div className="border border-slate-800 rounded-card p-3 bg-slate-950/30">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold inline-flex items-center">Match <FormulaHint text={matchFormulaText} /></div>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{formatPercent(selectedTrust.overall_match_score)}</div>
                    </div>
                    <div className="border border-slate-800 rounded-card p-3 bg-slate-950/30">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Action</div>
                      <div className={`text-sm font-black mt-2 ${
                        selectedTrust.recommendation === 'Recommended' ? 'text-emerald-400' :
                        selectedTrust.recommendation === 'Needs Review' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {selectedTrust.recommendation}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="xl:col-span-2 space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Section Confidence Formula</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {trustSections.map(([section, data]) => (
                        <div key={section} className="border border-slate-800 rounded-card p-4 bg-slate-950/25 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold">{formatLabel(section)}</span>
                            <span className="font-mono text-blue-400 font-bold inline-flex items-center">{formatPercent(data.score)} <FormulaHint text={sectionFormulaText(data)} /></span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: formatPercent(data.score) }} />
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-gray-400">
                            <span>Reliability {formatPercent(data.source_reliability)}</span>
                            <span>Agreement {formatPercent(data.source_agreement_ratio)}</span>
                            <span>Freshness {formatPercent(data.freshness_score)}</span>
                            <span>Completeness {formatPercent(data.completeness_ratio)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-slate-800 rounded-card p-4 bg-slate-950/25">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mb-3">Strengths</h4>
                      <div className="space-y-2">
                        {(selectedTrust.strengths || []).map((item, idx) => (
                          <div key={idx} className="flex gap-2 text-xs text-gray-300 leading-5">
                            <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border border-slate-800 rounded-card p-4 bg-slate-950/25">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-amber-400 mb-3">Risks & Review Points</h4>
                      <div className="space-y-2">
                        {(selectedTrust.risks || []).map((item, idx) => (
                          <div key={idx} className="flex gap-2 text-xs text-gray-300 leading-5">
                            <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="border border-slate-800 rounded-card p-4 bg-slate-950/25">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500 mb-3">Source Reliability</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedTrust.source_reliability_scores || {}).map(([source, score]) => (
                        <div key={source} className="flex items-center justify-between gap-4 text-xs font-mono">
                          <span className="text-gray-300 truncate">{source}</span>
                          <span className="text-blue-400 font-bold">{formatPercent(score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-card p-4 bg-slate-950/25">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500 mb-3">Missing & Conflicting Information</h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {(selectedTrust.missing_information || []).slice(0, 6).map((item, idx) => (
                        <div key={`missing-${idx}`} className="text-xs text-gray-400 font-mono">Missing: {item}</div>
                      ))}
                      {(selectedTrust.inconsistencies || []).slice(0, 4).map((item, idx) => (
                        <div key={`conflict-${idx}`} className="text-xs text-amber-300 font-mono">
                          Conflict: {item.field_name} resolved by {item.resolution_method}
                        </div>
                      ))}
                      {(!selectedTrust.missing_information?.length && !selectedTrust.inconsistencies?.length) && (
                        <div className="text-xs text-gray-400">No missing or conflicting information detected.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 font-mono border-t border-slate-800 pt-3">
                  {selectedTrust.scoring_notes?.section_formula}. Freshness uses {selectedTrust.scoring_notes?.freshness_formula}.
                </div>
              </section>
            )}
            {/* Runtime Output Configuration */}
            <div className={`border rounded-card overflow-hidden ${
              darkMode ? 'border-slate-800 bg-[#121826]' : 'border-slate-200 bg-white shadow-sm'
            }`}>
              <button 
                type="button"
                onClick={() => setResultsConfigExpanded(!resultsConfigExpanded)}
                className={`w-full px-6 py-4 flex items-center justify-between border-b ${
                  darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'
                } transition-all`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={18} className="text-blue-500" />
                  <span className="font-semibold text-sm">Configure Output Projection (Runtime Refresh)</span>
                  {isReapplyingConfig && (
                    <span className="flex items-center gap-1.5 text-xs text-blue-400 font-mono animate-pulse">
                      <Loader2 size={12} className="animate-spin" /> Updating...
                    </span>
                  )}
                </div>
                {resultsConfigExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {resultsConfigExpanded && (
                <div className="p-6 space-y-6">
                  {/* Missing Values Strategy */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Missing Values Behavior</h4>
                    <div className="flex gap-6 items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="results_missing_values" 
                          value="null"
                          checked={config.missing_values === 'null'}
                          onChange={(e) => updateConfig({ missing_values: e.target.value })}
                          className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                        />
                        null value
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="results_missing_values" 
                          value="omit"
                          checked={config.missing_values === 'omit'}
                          onChange={(e) => updateConfig({ missing_values: e.target.value })}
                          className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                        />
                        omit field
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="results_missing_values" 
                          value="error"
                          checked={config.missing_values === 'error'}
                          onChange={(e) => updateConfig({ missing_values: e.target.value })}
                          className="text-blue-600 focus:ring-0 bg-slate-900 w-4 h-4"
                        />
                        raise error
                      </label>
                    </div>
                  </div>

                  {/* Output Fields Selector */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-500">Target Output Fields</h4>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        "full_name", "emails", "phones", "skills", "experience", 
                        "education", "projects", "links", "location", "headline"
                      ].map((field) => {
                        const isSel = config.selected_fields.includes(field);
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleField(field)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                              isSel 
                                ? 'bg-blue-600 text-white shadow' 
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            {field.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            {/* View Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 select-none">
              <button
                type="button"
                onClick={() => setResultViewMode('json')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  resultViewMode === 'json' 
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/20' 
                    : 'bg-slate-800/60 text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                }`}
              >
                <FileJson size={14} /> JSON View
              </button>
              <button
                type="button"
                onClick={() => setResultViewMode('table')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  resultViewMode === 'table' 
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/20' 
                    : 'bg-slate-800/60 text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet size={14} /> Tabular View
              </button>
              <button
                type="button"
                onClick={() => setResultViewMode('portfolio')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  resultViewMode === 'portfolio' 
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/20' 
                    : 'bg-slate-800/60 text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                }`}
              >
                <Globe size={14} /> Portfolio View
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-800 rounded-card bg-[#121826] px-4 py-3 select-none">
              <div>
                <div className="text-sm font-bold text-gray-100">Download Result</div>
                <div className="text-[11px] text-gray-500 font-mono">JSON, PDF, CSV, and Excel exports include candidate scores and trust analysis.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadExport('json')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-gray-200 transition-all">
                  <Download size={14} /> JSON
                </button>
                <button type="button" onClick={() => downloadExport('pdf')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-gray-200 transition-all">
                  <Download size={14} /> PDF
                </button>
                <button type="button" onClick={() => downloadExport('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-gray-200 transition-all">
                  <Download size={14} /> CSV
                </button>
                <button type="button" onClick={() => downloadExport('excel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all">
                  <Download size={14} /> Excel
                </button>
              </div>
            </div>
            {/* 6.2 High-Fidelity JSON Code Viewer */}
            {resultViewMode === 'json' && (
              <div className={`border rounded-card overflow-hidden flex flex-col ${
                darkMode ? 'bg-[#070a13] border-slate-800' : 'bg-slate-900 border-slate-900 shadow-xl'
              }`}>
                
                {/* Header toolbar */}
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/70 select-none">
                  
                  {/* File summary */}
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs font-mono text-gray-400 ml-2">
                      {transformResult.candidates[selectedCandidateIndex] 
                        ? `canonical_${transformResult.candidates[selectedCandidateIndex].candidate_id}.json` 
                        : 'profile.json'}
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="flex-1 max-w-[280px] relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search JSON content keys/values..."
                      className="w-full text-xs bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-gray-300 outline-none focus:border-blue-500/70 transition-all font-mono"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-300">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Toolbar Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-gray-300 transition-all cursor-pointer"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={downloadJson}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-gray-355 transition-all cursor-pointer"
                      title="Download Canonical JSON of selected candidate"
                    >
                      <Download size={14} />
                      Download Selected
                    </button>
                    <button
                      onClick={downloadBatchJson}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
                      title="Download Combined Batch JSON array"
                    >
                      <Download size={14} />
                      Download Batch ({transformResult.candidates.length})
                    </button>
                    <button
                      onClick={() => {
                        setRunState('idle');
                        setTransformResult(null);
                        setSearchQuery("");
                        setSelectedCandidateIndex(0);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-gray-300 transition-all cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      Reset
                    </button>
                  </div>

                </div>

                {/* Code Area */}
                <div className="py-4 overflow-y-auto max-h-[500px] select-text">
                  {renderHighlightedJson()}
                </div>

              </div>
            )}

            {/* 6.3 Tabular View */}
            {resultViewMode === 'table' && (
              <div className={`border rounded-card p-6 space-y-8 ${
                darkMode ? 'bg-[#121826] border-slate-800 text-gray-200' : 'bg-white border-slate-200 shadow-md text-slate-850'
              }`}>
                {/* Personal Info Tabular */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-base font-bold text-blue-500">Personal Information</h3>
                    <button
                      onClick={() => {
                        setRunState('idle');
                        setTransformResult(null);
                        setSelectedCandidateIndex(0);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:underline"
                    >
                      <RefreshCw size={10} /> Reset
                    </button>
                  </div>
                  <table className="w-full text-sm font-mono border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold w-1/4 text-gray-400">Full Name</td>
                        <td className="py-2.5 text-white">{selectedProfile.full_name || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold text-gray-400">Headline</td>
                        <td className="py-2.5 text-white">{selectedProfile.headline || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold text-gray-400">Emails</td>
                        <td className="py-2.5 text-white">{selectedProfile.emails?.join(', ') || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold text-gray-400">Phones</td>
                        <td className="py-2.5 text-white">{selectedProfile.phones?.join(', ') || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold text-gray-400">Location</td>
                        <td className="py-2.5 text-white">{selectedProfile.location || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2.5 font-bold text-gray-400">Links</td>
                        <td className="py-2.5 text-white">
                          {selectedProfile.links?.map((l, i) => (
                            <a key={i} href={l} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mr-3 font-sans block sm:inline">
                              {l}
                            </a>
                          )) || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Skills Tabular */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-blue-500 border-b border-slate-800 pb-2">Skills</h3>
                  {selectedProfile.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.skills.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 border border-slate-700 rounded-lg text-xs">
                          <span className="font-semibold text-white">{s.name}</span>
                          <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">{(s.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No skills extracted.</p>
                  )}
                </div>

                {/* Experience Tabular */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-blue-500 border-b border-slate-800 pb-2">Work Experience</h3>
                  {selectedProfile.experience?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-gray-400 text-xs font-mono">
                            <th className="py-2 font-bold w-1/4">Role</th>
                            <th className="py-2 font-bold w-1/4">Company</th>
                            <th className="py-2 font-bold w-1/6">Dates</th>
                            <th className="py-2 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProfile.experience.map((exp, idx) => (
                            <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                              <td className="py-3 font-semibold text-white pr-2 align-top">{exp.role || 'N/A'}</td>
                              <td className="py-3 text-gray-300 pr-2 align-top">{exp.company || 'N/A'}</td>
                              <td className="py-3 text-gray-400 font-mono text-xs align-top">
                                {exp.start_date || 'N/A'} - {exp.end_date || 'Present'}
                              </td>
                              <td className="py-3 text-gray-300 text-xs leading-5 align-top whitespace-pre-wrap">{exp.description || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No work experience extracted.</p>
                  )}
                </div>

                {/* Education Tabular */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-blue-500 border-b border-slate-800 pb-2">Education</h3>
                  {selectedProfile.education?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-gray-400 text-xs font-mono">
                            <th className="py-2 font-bold w-1/3">Institution</th>
                            <th className="py-2 font-bold w-1/4">Degree</th>
                            <th className="py-2 font-bold w-1/4">Major</th>
                            <th className="py-2 font-bold">Graduation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProfile.education.map((edu, idx) => (
                            <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                              <td className="py-3 font-semibold text-white pr-2">{edu.institution || 'N/A'}</td>
                              <td className="py-3 text-gray-300 pr-2">{edu.degree || 'N/A'}</td>
                              <td className="py-3 text-gray-300 pr-2">{edu.major || 'N/A'}</td>
                              <td className="py-3 text-gray-450 font-mono text-xs">{edu.graduation_date || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No education entries extracted.</p>
                  )}
                </div>

                {/* Projects Tabular */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-blue-500 border-b border-slate-800 pb-2">Projects</h3>
                  {selectedProfile.projects?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-gray-400 text-xs font-mono">
                            <th className="py-2 font-bold w-1/4">Project Name</th>
                            <th className="py-2 font-bold w-1/3">Technologies</th>
                            <th className="py-2 font-bold">Description / URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProfile.projects.map((proj, idx) => (
                            <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                              <td className="py-3 font-semibold text-white pr-2 align-top">{proj.name || 'N/A'}</td>
                              <td className="py-3 pr-2 align-top">
                                <div className="flex flex-wrap gap-1">
                                  {proj.technologies?.map((tech, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                                      {tech}
                                    </span>
                                  )) || 'N/A'}
                                </div>
                              </td>
                              <td className="py-3 align-top">
                                <p className="text-xs text-gray-300 leading-5">{proj.description || 'N/A'}</p>
                                {proj.url && (
                                  <a href={proj.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs block mt-1.5 font-mono">
                                    {proj.url}
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No projects extracted.</p>
                  )}
                </div>
              </div>
            )}

            {/* 6.4 Portfolio View */}
            {resultViewMode === 'portfolio' && (
              <div className={`border rounded-card overflow-hidden shadow-2xl ${
                darkMode ? 'bg-[#0f1422] border-slate-800 text-gray-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {/* Hero Banner Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white relative">
                  <div className="space-y-3 max-w-[80%] relative z-10">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-extrabold tracking-tight">
                        {selectedProfile.full_name || 'Unnamed Candidate'}
                      </h2>
                      <button
                        onClick={() => {
                          setRunState('idle');
                          setTransformResult(null);
                          setSelectedCandidateIndex(0);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg transition-all"
                      >
                        <RefreshCw size={10} /> Reset
                      </button>
                    </div>
                    {selectedProfile.headline && (
                      <p className="text-lg text-blue-200 font-medium">
                        {selectedProfile.headline}
                      </p>
                    )}
                    {selectedProfile.location && (
                      <div className="flex items-center gap-1.5 text-sm text-blue-150">
                        <Globe size={14} />
                        <span>{selectedProfile.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Confidence Score Floating Badge */}
                  <div className="absolute right-8 top-8 bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center select-none">
                    <div className="text-[10px] text-blue-300 font-mono font-bold tracking-wider uppercase">Match Quality</div>
                    <div className="text-3xl font-black text-white font-mono mt-1">
                      {Math.round(transformResult.candidates[selectedCandidateIndex].confidence.overall_score * 100)}%
                    </div>
                  </div>
                </div>

                {/* Sub-Header Contact Info strip */}
                <div className="px-8 py-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap gap-6 text-sm text-gray-400">
                  {selectedProfile.emails?.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-mono">
                      <span className="text-blue-500">✉</span>
                      <span className="text-gray-300">{email}</span>
                    </div>
                  ))}
                  {selectedProfile.phones?.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-mono">
                      <span className="text-blue-500">📞</span>
                      <span className="text-gray-300">{phone}</span>
                    </div>
                  ))}
                  {selectedProfile.links?.map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:underline">
                      <span>🔗</span>
                      <span className="truncate max-w-[180px]">{link}</span>
                    </a>
                  ))}
                </div>

                {/* Main Body Grid */}
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column - Core stats and Skills */}
                  <div className="space-y-6 lg:col-span-1">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-blue-450 border-b border-slate-800 pb-2 mb-4">Core Skills</h3>
                      {selectedProfile.skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.skills.map((s, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-slate-905 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3 w-full">
                              <span className="font-semibold text-gray-250">{s.name}</span>
                              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                {(s.confidence * 100).toFixed(0)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No skills cataloged.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Experience & Education */}
                  <div className="space-y-8 lg:col-span-2">
                    
                    {/* Experience Timeline */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-blue-455 border-b border-slate-800 pb-2 mb-6">Work Experience</h3>
                      {selectedProfile.experience?.length > 0 ? (
                        <div className="space-y-6 relative border-l border-slate-800 ml-2 pl-6">
                          {selectedProfile.experience.map((exp, idx) => (
                            <div key={idx} className="relative space-y-1.5">
                              {/* Timeline dot */}
                              <div className="absolute -left-[31px] top-1 bg-blue-600 rounded-full w-2.5 h-2.5 border border-[#0f1422]" />
                              
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h4 className="text-base font-bold text-white">{exp.role}</h4>
                                <span className="text-xs text-blue-400 font-mono bg-blue-500/5 border border-blue-500/10 px-2.5 py-0.5 rounded-lg">
                                  {exp.start_date || 'N/A'} - {exp.end_date || 'Present'}
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-gray-300">
                                {exp.company}
                              </div>
                              <p className="text-xs leading-5 text-gray-400 whitespace-pre-wrap pt-1">
                                {exp.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No professional background details.</p>
                      )}
                    </div>

                    {/* Education section */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-blue-455 border-b border-slate-800 pb-2 mb-4">Education</h3>
                      {selectedProfile.education?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedProfile.education.map((edu, idx) => (
                            <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1">
                              <div className="text-xs text-blue-400 font-mono">{edu.graduation_date || 'N/A'}</div>
                              <h4 className="text-sm font-bold text-white">{edu.institution}</h4>
                              <p className="text-xs text-gray-300 font-medium">
                                {edu.degree} {edu.major ? `in ${edu.major}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No education credentials listed.</p>
                      )}
                    </div>

                    {/* Projects section */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-bold text-blue-455 border-b border-slate-800 pb-2 mb-4">Featured Projects</h3>
                      {selectedProfile.projects?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedProfile.projects.map((proj, idx) => (
                            <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between h-full space-y-3">
                              <div className="space-y-1.5">
                                <h4 className="text-sm font-bold text-white">{proj.name}</h4>
                                <p className="text-xs text-gray-450 leading-5">{proj.description}</p>
                              </div>
                              <div className="space-y-2">
                                {proj.technologies?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {proj.technologies.map((tech, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-350 rounded text-[9px] font-mono border border-slate-700/60">
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {proj.url && (
                                  <a href={proj.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px] font-mono block">
                                    {proj.url}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No featured projects listed.</p>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            )} </div>

          </div>
        )}

        {/* =====================================================================
            SECTION 7: ERROR CARD HANDLER
            ===================================================================== */}
        {runState === 'error' && errorDetails && (
          <section className={`border rounded-card p-6 max-w-[620px] mx-auto ${
            darkMode ? 'bg-red-950/10 border-red-900/40 text-red-100' : 'bg-red-50 border-red-200 text-red-950'
          } space-y-4`}>
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-red-500">Pipeline Ingestion Failed</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Failed at step: <span className="underline font-bold">{errorDetails.stage}</span></p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-slate-800 space-y-2">
              <div className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Reason:</div>
              <p className="text-sm font-mono text-red-400/90 leading-6">{errorDetails.reason}</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-1 text-slate-300">
              <div className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">Suggested Fix:</div>
              <p className="text-xs leading-5">{errorDetails.fix}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw size={14} /> Retry Ingestion
              </button>
              <button 
                onClick={() => setRunState('idle')}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 text-xs font-bold transition-all cursor-pointer"
              >
                Back to Upload
              </button>
            </div>

          </section>
        )}

      </main>

      {/* =====================================================================
          FOOTER
          ===================================================================== */}
      <footer className={`border-t ${darkMode ? 'border-slate-800 bg-[#0d1424]/40 text-gray-500' : 'border-slate-200 bg-slate-100 text-slate-400'} py-6 text-center text-xs mt-12`}>
        <div className="mx-auto max-w-[1100px] px-6">
          <p>© 2026 CandidateForge Ingestion Engine Assignment.</p>
        </div>
      </footer>

    </div>
  );
}
