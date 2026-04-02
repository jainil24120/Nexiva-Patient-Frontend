import { useState, useRef, useCallback } from "react";
import Tesseract from "tesseract.js";
import { FiUpload, FiCheck, FiX, FiLoader, FiAlertTriangle, FiShield, FiImage, FiRefreshCw, FiCamera } from "react-icons/fi";
import "./AadhaarVerify.css";

// ── Aadhaar Verhoeff checksum validation ──
const verhoeffTable = {
  d: [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ],
  p: [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
  ],
  inv: [0,4,3,2,1,5,6,7,8,9],
};

function isValidAadhaar(num) {
  const digits = num.replace(/\s/g, "");
  if (!/^\d{12}$/.test(digits)) return false;
  let c = 0;
  const arr = digits.split("").reverse().map(Number);
  for (let i = 0; i < arr.length; i++) {
    c = verhoeffTable.d[c][verhoeffTable.p[i % 8][arr[i]]];
  }
  return c === 0;
}

// ── Preprocess image for better OCR using canvas ──
function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");

      // Scale up small images for better OCR
      const scale = Math.max(1, 1500 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");

      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Apply sharpening and contrast boost
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Increase contrast (stretch histogram)
        let val = ((gray - 128) * 1.5) + 128;
        val = Math.max(0, Math.min(255, val));

        // Binarize with adaptive threshold for cleaner text
        const out = val > 140 ? 255 : 0;

        data[i] = out;
        data[i + 1] = out;
        data[i + 2] = out;
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.src = URL.createObjectURL(file);
  });
}

// ── Extract fields from OCR text (improved) ──
function extractAadhaarData(rawText) {
  // Clean up OCR artifacts
  const text = rawText
    .replace(/[|{}[\]]/g, "")
    .replace(/\s+/g, " ");

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const result = { aadhaarNumber: "", name: "", dob: "", gender: "", rawText: rawText };

  // ── Aadhaar number: find exactly 12 digits, skip VID (16 digits) ──
  // Aadhaar = 12 digits in 4-4-4 groups. VID = 16 digits in 4-4-4-4 groups.
  // We must ensure we pick the 12-digit number, NOT a subset of the 16-digit VID.

  // First, remove VID lines so they don't interfere
  const textWithoutVid = rawText
    .replace(/VID\s*[:=]?\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/gi, "")   // VID : 1234 5678 9012 3456
    .replace(/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/g, (match, offset, str) => {
      // Remove any 16-digit groups (4 groups of 4) — these are VIDs
      const digits = match.replace(/\s/g, "");
      return digits.length === 16 ? "" : match;
    });

  // Now search for exactly 12 digits (3 groups of 4)
  const aadhaarPatterns = [
    // 4-space-4-space-4 (standard Aadhaar format) — must NOT be followed by another 4-digit group
    /(\d{4})[\s](\d{4})[\s](\d{4})(?!\s*\d)/,
    // 4-separator-4-separator-4
    /(\d{4})[\s.\-](\d{4})[\s.\-](\d{4})(?!\s*\d)/,
    // 4-4-4 with optional single space
    /(\d{4})\s?(\d{4})\s?(\d{4})(?!\s*\d)/,
    // 12 continuous digits
    /(?<!\d)(\d{12})(?!\d)/,
  ];

  for (const pattern of aadhaarPatterns) {
    const match = textWithoutVid.match(pattern);
    if (match) {
      let num;
      if (match[2]) {
        num = (match[1] + match[2] + match[3]).replace(/\D/g, "");
      } else {
        num = match[1].replace(/\D/g, "");
      }
      if (num.length === 12) {
        result.aadhaarNumber = num;
        break;
      }
    }
  }

  // Fallback: if still not found, search in original text but skip anything near "VID"
  if (!result.aadhaarNumber) {
    const allMatches = [...rawText.matchAll(/(\d{4})\s(\d{4})\s(\d{4})/g)];
    for (const m of allMatches) {
      const num = (m[1] + m[2] + m[3]).replace(/\D/g, "");
      if (num.length !== 12) continue;
      // Check the text ~20 chars before this match for "VID"
      const before = rawText.substring(Math.max(0, m.index - 20), m.index);
      if (/vid/i.test(before)) continue;
      // Check there's no 4th digit group right after
      const after = rawText.substring(m.index + m[0].length, m.index + m[0].length + 6);
      if (/^\s*\d{4}/.test(after)) continue;
      result.aadhaarNumber = num;
      break;
    }
  }

  // ── DOB: multiple formats ──
  const dobPatterns = [
    // DD/MM/YYYY or DD-MM-YYYY (with keyword prefixes in English, Hindi, Gujarati, etc.)
    /(?:DOB|D\.?O\.?B\.?|Date\s*of\s*Birth|Birth|[Jj]anm|જન્મ\s*તારીખ|जन्म\s*तिथि)\s*[:\-\/]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i,
    // Standalone DD/MM/YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    // Year of Birth: YYYY
    /(?:Year\s*of\s*Birth|YOB)\s*[:\-]?\s*(\d{4})/i,
  ];

  for (const pattern of dobPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      if (match[3] && match[2] && match[1]) {
        // DD/MM/YYYY format
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        const year = match[3];
        if (parseInt(year) > 1900 && parseInt(year) < 2025 && parseInt(month) <= 12 && parseInt(day) <= 31) {
          result.dob = `${year}-${month}-${day}`;
          break;
        }
      } else if (match[1] && !match[2]) {
        // Year only
        const year = match[1];
        if (parseInt(year) > 1900 && parseInt(year) < 2025) {
          result.dob = `${year}`;
          break;
        }
      }
    }
  }

  // ── Gender detection ──
  // Check FEMALE first (because "MALE" is a substring of "FEMALE")
  // Use flexible matching: don't rely solely on \b, also match after /, space, newline, etc.

  const femaleRegex = /(?:^|[\s\/,\-:])(?:FEMALE|Female|female|Fema[il]e|महिला|स्त्री|સ્ત્રી|મહિલા|பெண்|స్త్రీ|মহিলা)(?:$|[\s\/,\-:])/m;
  const maleRegex = /(?:^|[\s\/,\-:])(?:MALE|Male|male|Ma[il]e|पुरुष|पुरूष|પુરુષ|પુરૂષ|ஆண்|పురుషుడు|পুরুষ)(?:$|[\s\/,\-:])/m;
  const transgenderRegex = /(?:^|[\s\/,\-:])(?:Transgender|TRANSGENDER)(?:$|[\s\/,\-:])/mi;

  if (femaleRegex.test(rawText)) {
    result.gender = "female";
  } else if (maleRegex.test(rawText)) {
    result.gender = "male";
  } else if (transgenderRegex.test(rawText)) {
    result.gender = "other";
  } else {
    // Last resort: simple substring search (OCR might mangle boundaries)
    const upper = rawText.toUpperCase();
    if (upper.includes("FEMALE")) result.gender = "female";
    else if (upper.includes("MALE")) result.gender = "male";
  }

  // ── Name extraction (improved multi-strategy) ──
  // Aadhaar layout: regional name (line 1) → English name (line 2) → DOB → Gender
  // We want the ENGLISH name specifically.

  const skipWordsEng = new Set([
    "government", "india", "aadhaar", "unique", "authority", "identification",
    "enrolment", "enrollment", "uidai", "help", "www", "vid", "download",
    "maadhaar", "resident", "issue", "date", "birth", "year", "dob",
    "address", "father", "husband", "son", "daughter", "wife", "mother",
    "male", "female", "other", "transgender", "to", "of", "the", "is",
    "your", "this", "has", "been", "generated", "number",
  ]);

  // Helper: check if a line is purely English letters/spaces (a name-like line)
  function isEnglishNameLine(line) {
    const cleaned = line.replace(/[^a-zA-Z\s.]/g, "").trim();
    if (cleaned.length < 3) return null;
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 1 || words.length > 5) return null;
    if (words.some(w => skipWordsEng.has(w.toLowerCase()))) return null;
    // Must have at least one capitalized word (proper name)
    if (!words.some(w => /^[A-Z]/.test(w))) return null;
    return cleaned;
  }

  // Helper: check if a line contains regional/non-Latin script (Hindi, Gujarati, Tamil, etc.)
  function hasRegionalScript(line) {
    // Devanagari, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Odia, Gurmukhi
    return /[\u0900-\u097F\u0A80-\u0AFF\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0B00-\u0B7F\u0A00-\u0A7F]/.test(line);
  }

  // Helper: check if a line is a DOB/gender line
  function isDobOrGenderLine(line) {
    const lower = line.toLowerCase();
    return /dob|d\.o\.b|date.*birth|birth|janm|जन्म|તારીખ/.test(lower) ||
           /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/.test(line) ||
           /\b(male|female|MALE|FEMALE|पुरुष|महिला|પુરુષ|સ્ત્રી)\b/i.test(line);
  }

  let nameCandidate = "";
  let allEnglishNames = [];

  // Strategy 1 (BEST): Find the English name line that appears BEFORE or ON the DOB line.
  // Aadhaar cards always have: [Regional Name] → [English Name] → [DOB/Gender]
  // So the English name is the last English-only name-like line before DOB.
  let dobLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isDobOrGenderLine(lines[i])) {
      dobLineIndex = i;
      break;
    }
  }

  // Collect all English name candidates
  for (let i = 0; i < lines.length; i++) {
    const name = isEnglishNameLine(lines[i]);
    if (name) {
      allEnglishNames.push({ name, index: i });
    }
  }

  if (dobLineIndex > 0 && allEnglishNames.length > 0) {
    // Pick the English name closest to (but before) the DOB line
    const beforeDob = allEnglishNames.filter(n => n.index < dobLineIndex);
    if (beforeDob.length > 0) {
      // Take the last one (closest to DOB = the actual English name, not header text)
      nameCandidate = beforeDob[beforeDob.length - 1].name;
    }
  }

  // Strategy 2: If DOB wasn't found or no English name before it,
  // look for English line right after a regional-script line (bilingual pair pattern)
  if (!nameCandidate) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (hasRegionalScript(lines[i])) {
        const nextEnglish = isEnglishNameLine(lines[i + 1]);
        if (nextEnglish) {
          nameCandidate = nextEnglish;
          break;
        }
      }
    }
  }

  // Strategy 3: Line after "Name:" keyword
  if (!nameCandidate) {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes("name") && lower.includes(":")) {
        const afterColon = lines[i].split(":").slice(1).join(":").trim();
        const cleaned = afterColon.replace(/[^a-zA-Z\s.]/g, "").trim();
        if (cleaned.length >= 2) {
          nameCandidate = cleaned;
          break;
        }
        // Check next line
        if (i + 1 < lines.length) {
          const nextClean = isEnglishNameLine(lines[i + 1]);
          if (nextClean) { nameCandidate = nextClean; break; }
        }
      }
    }
  }

  // Strategy 4: Just take the first valid English name-like line (fallback)
  if (!nameCandidate && allEnglishNames.length > 0) {
    nameCandidate = allEnglishNames[0].name;
  }

  // Strategy 5: For fully regional-language cards, grab the regional name
  if (!nameCandidate) {
    for (let i = 0; i < lines.length; i++) {
      if (!hasRegionalScript(lines[i])) continue;
      const regional = lines[i].trim();
      // Skip common card text in various scripts
      if (/भारत|सरकार|आधार|पुरुष|महिला|जन्म|ભારત|સરકાર|આધાર|પુરુષ|સ્ત્રી|તારીખ|மாரி|ஆதார்/.test(regional)) continue;
      if (regional.length >= 3) {
        nameCandidate = regional;
        break;
      }
    }
  }

  result.name = nameCandidate;

  return result;
}

// ── Fuzzy match utility (improved with Levenshtein) ──
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim().replace(/\s+/g, " ");
  b = b.toLowerCase().trim().replace(/\s+/g, " ");
  if (a === b) return 1;

  // Word-level matching
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  let wordMatches = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb) { wordMatches++; break; }
      // Allow 1-2 char difference (OCR errors)
      if (wa.length > 2 && wb.length > 2 && levenshtein(wa, wb) <= 2) { wordMatches += 0.7; break; }
      // Substring match
      if (wa.length > 3 && wb.length > 3 && (wa.includes(wb) || wb.includes(wa))) { wordMatches += 0.8; break; }
    }
  }
  const wordSim = wordMatches / Math.max(wordsA.length, wordsB.length);

  // Character-level Levenshtein similarity
  const maxLen = Math.max(a.length, b.length);
  const charSim = maxLen > 0 ? 1 - (levenshtein(a, b) / maxLen) : 0;

  // Return best of both
  return Math.max(wordSim, charSim);
}

// Compare DOB with flexibility
function dobMatch(extracted, filled) {
  if (!extracted || !filled) return { match: false, reason: "Not detected" };

  const filledClean = filled.split("T")[0]; // YYYY-MM-DD

  // Exact match
  if (extracted === filledClean) return { match: true, reason: "Exact match" };

  // Year-only match (some cards show only year of birth)
  if (extracted.length === 4) {
    const filledYear = filledClean.split("-")[0];
    if (extracted === filledYear) return { match: true, reason: "Year matches" };
    return { match: false, reason: `Year: ${extracted} vs ${filledYear}` };
  }

  // Check if day/month might be swapped (DD/MM vs MM/DD confusion)
  const [ey, em, ed] = extracted.split("-");
  const [fy, fm, fd] = filledClean.split("-");
  if (ey === fy && em === fd && ed === fm) {
    return { match: true, reason: "Match (day/month order)" };
  }

  return { match: false };
}

// ── Main Component ──
export default function AadhaarVerify({ formData, onVerified }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const fileRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setExtracted(null);
    setComparison(null);
  };

  const runOCR = useCallback(async (usePreprocess = false) => {
    if (!image) return;
    setScanning(true);
    setProgress(0);
    setError("");
    setComparison(null);
    setExtracted(null);

    try {
      // On retry, try with preprocessing for better results
      const imageToScan = usePreprocess ? await preprocessImage(image) : image;

      const result = await Tesseract.recognize(imageToScan, "eng+hin", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const ocrText = result.data.text;
      const data = extractAadhaarData(ocrText);
      setExtracted(data);
      setScanCount(prev => prev + 1);

      // Compare with form data
      const comp = {};

      // Aadhaar number
      const formAadhaar = (formData.aadharNumber || formData.aadharcard_no || "").replace(/\s/g, "");
      if (formAadhaar) {
        if (data.aadhaarNumber) {
          comp.aadhaarNumber = {
            extracted: data.aadhaarNumber,
            filled: formAadhaar,
            match: data.aadhaarNumber === formAadhaar,
            valid: isValidAadhaar(data.aadhaarNumber),
          };
        } else {
          comp.aadhaarNumber = {
            extracted: "",
            filled: formAadhaar,
            match: false,
            valid: false,
            notDetected: true,
          };
        }
      }

      // Name
      const formName = formData.fullName || formData.name || "";
      if (formName) {
        if (data.name) {
          const sim = similarity(data.name, formName);
          comp.name = {
            extracted: data.name,
            filled: formName,
            match: sim >= 0.5,
            similarity: Math.round(sim * 100),
          };
        } else {
          comp.name = {
            extracted: "",
            filled: formName,
            match: false,
            similarity: 0,
            notDetected: true,
          };
        }
      }

      // DOB
      const formDob = formData.dob || formData.dateOfBirth || "";
      if (formDob) {
        if (data.dob) {
          const dobResult = dobMatch(data.dob, formDob);
          comp.dob = {
            extracted: data.dob,
            filled: formDob.split("T")[0],
            match: dobResult.match,
            reason: dobResult.reason,
          };
        } else {
          comp.dob = {
            extracted: "",
            filled: formDob.split("T")[0],
            match: false,
            notDetected: true,
          };
        }
      }

      // Gender
      const formGender = (formData.gender || "").toLowerCase();
      if (formGender) {
        if (data.gender) {
          comp.gender = {
            extracted: data.gender,
            filled: formGender,
            match: data.gender === formGender,
          };
        } else {
          comp.gender = {
            extracted: "",
            filled: formGender,
            match: false,
            notDetected: true,
          };
        }
      }

      setComparison(comp);

      // Overall verification
      const fields = Object.values(comp);
      const detected = fields.filter(f => !f.notDetected);
      const matchCount = detected.filter(f => f.match).length;
      const totalDetected = detected.length;
      const isVerified = totalDetected > 0 && matchCount >= Math.max(1, totalDetected - 1);

      if (onVerified) {
        onVerified({
          verified: isVerified,
          matchCount,
          totalFields: fields.length,
          totalDetected,
          comparison: comp,
          extractedData: data,
        });
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Failed to scan the image. Please try a clearer photo.");
    } finally {
      setScanning(false);
    }
  }, [image, formData, onVerified]);

  const handleScan = () => runOCR(false);

  const handleRetry = () => runOCR(true); // Retry with preprocessing

  const handleNewImage = () => {
    setImage(null);
    setImagePreview(null);
    setExtracted(null);
    setComparison(null);
    setError("");
    setScanCount(0);
    if (fileRef.current) fileRef.current.value = "";
    if (onVerified) onVerified(null);
    // Open file picker after a tick
    setTimeout(() => fileRef.current?.click(), 100);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setExtracted(null);
    setComparison(null);
    setError("");
    setScanCount(0);
    if (fileRef.current) fileRef.current.value = "";
    if (onVerified) onVerified(null);
  };

  const overallStatus = comparison
    ? (() => {
        const fields = Object.values(comparison);
        const detected = fields.filter(f => !f.notDetected);
        const matchCount = detected.filter(f => f.match).length;
        if (detected.length === 0) return "mismatch";
        if (matchCount === detected.length) return "verified";
        if (matchCount >= detected.length - 1) return "partial";
        return "mismatch";
      })()
    : null;

  return (
    <div className="aadhaar-verify">
      <div className="av-header">
        <FiShield size={18} />
        <span>Aadhaar Verification</span>
        <span className="av-badge">Frontend Only</span>
      </div>

      <p className="av-desc">
        Upload your Aadhaar card photo to verify details. The image is processed locally in your browser and is <strong>never uploaded</strong> to any server.
      </p>

      {/* Hidden file input (always present for retry) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageSelect}
      />

      {/* Upload Area */}
      {!imagePreview ? (
        <div className="av-upload-area" onClick={() => fileRef.current?.click()}>
          <FiImage size={32} />
          <p>Click to upload Aadhaar card image</p>
          <span>JPG, PNG - Max 10MB</span>
        </div>
      ) : (
        <div className="av-preview-area">
          <div className="av-preview-img-wrap">
            <img src={imagePreview} alt="Aadhaar preview" className="av-preview-img" />
            <button className="av-remove-btn" onClick={handleRemoveImage} title="Remove">
              <FiX size={14} />
            </button>
          </div>

          {/* Scan / Retry buttons */}
          {!scanning && (
            <div className="av-action-buttons">
              {!extracted ? (
                <button className="av-scan-btn" onClick={handleScan}>
                  <FiUpload size={14} /> Scan & Verify
                </button>
              ) : (
                <>
                  <button className="av-retry-btn" onClick={handleRetry}>
                    <FiRefreshCw size={14} /> Try Again
                  </button>
                  <button className="av-newimg-btn" onClick={handleNewImage}>
                    <FiCamera size={14} /> Upload New Image
                  </button>
                </>
              )}
            </div>
          )}

          {/* Progress */}
          {scanning && (
            <div className="av-progress">
              <div className="av-progress-bar">
                <div className="av-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="av-progress-text">
                <FiLoader className="av-spin" size={14} />
                {scanCount > 0 ? "Re-scanning with enhanced processing..." : "Scanning..."} {progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="av-error">
          <FiAlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className={`av-results av-results--${overallStatus}`}>
          <div className="av-results-header">
            {overallStatus === "verified" && <><FiCheck size={16} /> <span>All details verified</span></>}
            {overallStatus === "partial" && <><FiAlertTriangle size={16} /> <span>Partially verified (OCR may have minor errors)</span></>}
            {overallStatus === "mismatch" && <><FiX size={16} /> <span>Details mismatch - please check your entries</span></>}
          </div>

          <div className="av-comparison-grid">
            {comparison.aadhaarNumber && (
              <ComparisonRow
                label="Aadhaar Number"
                extracted={comparison.aadhaarNumber.notDetected ? null : comparison.aadhaarNumber.extracted.replace(/(\d{4})/g, "$1 ").trim()}
                filled={comparison.aadhaarNumber.filled.replace(/(\d{4})/g, "$1 ").trim()}
                match={comparison.aadhaarNumber.match}
                notDetected={comparison.aadhaarNumber.notDetected}
                extra={comparison.aadhaarNumber.notDetected ? null : (comparison.aadhaarNumber.valid ? "Checksum valid" : "Checksum invalid")}
                extraOk={comparison.aadhaarNumber.valid}
              />
            )}
            {comparison.name && (
              <ComparisonRow
                label="Name"
                extracted={comparison.name.notDetected ? null : comparison.name.extracted}
                filled={comparison.name.filled}
                match={comparison.name.match}
                notDetected={comparison.name.notDetected}
                extra={comparison.name.notDetected ? null : `${comparison.name.similarity}% match`}
                extraOk={comparison.name.match}
              />
            )}
            {comparison.dob && (
              <ComparisonRow
                label="Date of Birth"
                extracted={comparison.dob.notDetected ? null : comparison.dob.extracted}
                filled={comparison.dob.filled}
                match={comparison.dob.match}
                notDetected={comparison.dob.notDetected}
                extra={comparison.dob.reason}
                extraOk={comparison.dob.match}
              />
            )}
            {comparison.gender && (
              <ComparisonRow
                label="Gender"
                extracted={comparison.gender.notDetected ? null : comparison.gender.extracted}
                filled={comparison.gender.filled}
                match={comparison.gender.match}
                notDetected={comparison.gender.notDetected}
              />
            )}
          </div>

          {overallStatus !== "verified" && (
            <div className="av-tips">
              <p className="av-tips-title">Tips for better results:</p>
              <ul className="av-tips-list">
                <li>Use a clear, well-lit photo of the front side</li>
                <li>Avoid glare, shadows, or blurry images</li>
                <li>Crop the image to just the Aadhaar card</li>
                <li>Click "Try Again" to re-scan with enhanced processing</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonRow({ label, extracted, filled, match, extra, extraOk, notDetected }) {
  return (
    <div className={`av-comp-row ${notDetected ? "av-comp-row--notfound" : match ? "av-comp-row--match" : "av-comp-row--mismatch"}`}>
      <div className="av-comp-icon">
        {notDetected ? <FiAlertTriangle size={14} /> : match ? <FiCheck size={14} /> : <FiX size={14} />}
      </div>
      <div className="av-comp-content">
        <p className="av-comp-label">{label}</p>
        <div className="av-comp-values">
          <span className="av-comp-val"><strong>Card:</strong> {notDetected ? "Could not detect" : (extracted || "Not detected")}</span>
          <span className="av-comp-val"><strong>Form:</strong> {filled || "Not filled"}</span>
        </div>
        {extra && (
          <span className={`av-comp-extra ${extraOk ? "av-comp-extra--ok" : "av-comp-extra--warn"}`}>
            {extra}
          </span>
        )}
      </div>
    </div>
  );
}
