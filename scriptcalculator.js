// PREDICT-1deg beta coefficients, means for centering, and baseline survival
// Source: Pylypchuk et al. 2018, The Lancet, Table 3
const COEF = {
  female: {
    age: 0.0756412,
    maori: 0.3910183,
    pacific: 0.2010224,
    indian: 0.1183427,
    asian: -0.28551,
    nzdep: 0.1080795,
    exSmoker: 0.087476,
    smoker: 0.6226384,
    familyHistory: 0.0445534,
    afib: 0.8927126,
    diabetes: 0.5447632,
    sbp: 0.0136606,
    tchdl: 0.1226753,
    bpMed: 0.339925,
    lipidMed: -0.0593798,
    antiMed: 0.1172496,
    ageDiabetes: -0.0222549,
    ageSbp: -0.0004425,
    bpMedSbp: -0.004313,
    meanAge: 56.13665,
    meanNzdep: 2.990826,
    meanSbp: 129.0173,
    meanTcHdl: 3.726268,
    baselineSurvival: 0.983169213058
  },
  male: {
    age: 0.0675532,
    maori: 0.2899054,
    pacific: 0.1774195,
    indian: 0.2902049,
    asian: -0.3975687,
    nzdep: 0.0794903,
    exSmoker: 0.0753246,
    smoker: 0.5058041,
    familyHistory: 0.1326587,
    afib: 0.5880131,
    diabetes: 0.5597023,
    sbp: 0.0163778,
    tchdl: 0.1283758,
    bpMed: 0.2947634,
    lipidMed: -0.0537314,
    antiMed: 0.0934141,
    ageDiabetes: -0.020235,
    ageSbp: -0.0004184,
    bpMedSbp: -0.0053077,
    meanAge: 51.79953,
    meanNzdep: 2.972793,
    meanSbp: 129.1095,
    meanTcHdl: 4.38906,
    baselineSurvival: 0.974755526232
  }
};

// Cancer-type composite hazard ratios.
// Source: Strongman et al. 2019, The Lancet, Figure 1 (adjusted HRs for
// coronary artery disease, stroke, and heart failure/cardiomyopathy, averaged
// across sexes where both reported).
const CANCER_HR = {
  none:        { label: "None / prefer not to say", hr: 1.00 },
  breast:      { label: "Breast", hr: 1.01 },
  prostate:    { label: "Prostate", hr: 1.07 },
  melanoma:    { label: "Melanoma", hr: 1.03 },
  colorectal:  { label: "Colorectal", hr: 1.06 },
  bladder:     { label: "Bladder", hr: 1.11 },
  cervix:      { label: "Cervical", hr: 0.99 },
  uterine:     { label: "Uterine", hr: 1.08 },
  ovarian:     { label: "Ovarian", hr: 1.57 },
  kidney:      { label: "Kidney", hr: 1.49 },
  lung:        { label: "Lung", hr: 1.80 },
  liver:       { label: "Liver", hr: 1.54 },
  stomach:     { label: "Stomach", hr: 1.17 },
  oesophageal: { label: "Oesophageal", hr: 1.76 },
  oral:        { label: "Oral cavity", hr: 1.13 },
  pancreas:    { label: "Pancreatic", hr: 1.36 },
  thyroid:     { label: "Thyroid", hr: 0.93 },
  nhl:         { label: "Non-Hodgkin lymphoma", hr: 1.56 },
  leukaemia:   { label: "Leukaemia", hr: 1.44 },
  myeloma:     { label: "Multiple myeloma", hr: 2.22 },
  cns:         { label: "Brain / CNS", hr: 2.96 },
  other:       { label: "Other / not listed", hr: 1.25 }
};

function calculatePredict1(inputs) {
  const c = inputs.sex === "male" ? COEF.male : COEF.female;

  let sum = 0;
  sum += c.age * (inputs.age - c.meanAge);

  if (inputs.ethnicity === "maori") sum += c.maori;
  if (inputs.ethnicity === "pacific") sum += c.pacific;
  if (inputs.ethnicity === "indian") sum += c.indian;
  if (inputs.ethnicity === "asian") sum += c.asian;
  // european is reference, contributes 0

  sum += c.nzdep * (inputs.deprivation - c.meanNzdep);

  if (inputs.smoking === "ex") sum += c.exSmoker;
  if (inputs.smoking === "current") sum += c.smoker;

  if (inputs.familyHistory) sum += c.familyHistory;
  if (inputs.afib) sum += c.afib;
  if (inputs.diabetes) sum += c.diabetes;

  sum += c.sbp * (inputs.sbp - c.meanSbp);
  sum += c.tchdl * (inputs.tchdl - c.meanTcHdl);

  if (inputs.bpMed) sum += c.bpMed;
  if (inputs.lipidMed) sum += c.lipidMed;
  if (inputs.antiMed) sum += c.antiMed;

  // Interaction terms
  if (inputs.diabetes) {
    sum += c.ageDiabetes * (inputs.age - c.meanAge);
  }
  sum += c.ageSbp * (inputs.age - c.meanAge) * (inputs.sbp - c.meanSbp);
  if (inputs.bpMed) {
    sum += c.bpMedSbp * (inputs.sbp - c.meanSbp);
  }

  const risk = (1 - Math.pow(c.baselineSurvival, Math.exp(sum))) * 100;
  return risk;
}

function formatPercent(value) {
  return value.toFixed(1) + "%";
}

// Clamp a numeric input to [min, max] and show an inline error if out of range
function validateNumericInput(el, min, max, label) {
  const raw = el.value.trim();
  const errorId = el.id + "-error";
  let errorEl = document.getElementById(errorId);

  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.id = errorId;
    errorEl.className = "field-error";
    el.parentNode.insertBefore(errorEl, el.nextSibling);
  }

  if (raw === "") {
    errorEl.textContent = "";
    el.setCustomValidity("");
    return;
  }

  const value = parseFloat(raw);

  if (isNaN(value)) {
    errorEl.textContent = label + " must be a number.";
    el.setCustomValidity(errorEl.textContent);
    return;
  }

  if (value < min || value > max) {
    // Clamp the value
    el.value = Math.min(Math.max(value, min), max);
    errorEl.textContent = label + " must be between " + min + " and " + max;
    el.setCustomValidity("");
  } else {
    errorEl.textContent = "";
    el.setCustomValidity("");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("riskForm");
  const resultSection = document.getElementById("result");
  const baseRiskEl = document.getElementById("baseRisk");
  const adjRiskEl = document.getElementById("adjRisk");
  const resultNoteEl = document.getElementById("resultNote");

  // Validate on blur (when user leaves the field), not while typing
  document.getElementById("age").addEventListener("blur", function () {
    validateNumericInput(this, 18, 99, "Age");
  });
  document.getElementById("sbp").addEventListener("blur", function () {
    validateNumericInput(this, 80, 220, "Systolic blood pressure");
  });
  document.getElementById("tchdl").addEventListener("blur", function () {
    validateNumericInput(this, 1, 15, "TC/HDL ratio");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Run validation on all numeric fields before calculating
    validateNumericInput(document.getElementById("age"), 18, 99, "Age");
    validateNumericInput(document.getElementById("sbp"), 80, 220, "Systolic blood pressure");
    validateNumericInput(document.getElementById("tchdl"), 1, 15, "TC/HDL ratio");

    const inputs = {
      age: parseFloat(document.getElementById("age").value),
      sex: document.getElementById("sex").value,
      ethnicity: document.getElementById("ethnicity").value,
      deprivation: parseFloat(document.getElementById("deprivation").value),
      smoking: document.getElementById("smoking").value,
      familyHistory: document.getElementById("familyHistory").checked,
      afib: document.getElementById("afib").checked,
      diabetes: document.getElementById("diabetes").checked,
      sbp: parseFloat(document.getElementById("sbp").value),
      tchdl: parseFloat(document.getElementById("tchdl").value),
      bpMed: document.getElementById("bpMed").checked,
      lipidMed: document.getElementById("lipidMed").checked,
      antiMed: document.getElementById("antiMed").checked
    };

    const cancerType = document.getElementById("cancerType").value;

    if (!inputs.sex || !inputs.ethnicity || isNaN(inputs.deprivation) ||
        !inputs.smoking || isNaN(inputs.age) || isNaN(inputs.sbp) || isNaN(inputs.tchdl)) {
      alert("Please complete all required fields.");
      return;
    }

    const baseRisk = calculatePredict1(inputs);
    const cancerInfo = CANCER_HR[cancerType] || CANCER_HR.none;
    const adjustedRisk = Math.min(baseRisk * cancerInfo.hr, 100);

    baseRiskEl.textContent = formatPercent(baseRisk);
    adjRiskEl.textContent = formatPercent(adjustedRisk);

    if (cancerType === "none") {
      resultNoteEl.textContent = "No cancer history adjustment applied.";
    } else {
      resultNoteEl.textContent =
        cancerInfo.label + " history applies an estimated " + cancerInfo.hr.toFixed(2) +
        "\u00d7 adjustment, based on pooled UK cohort data (Strongman et al., 2019).";
    }

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
