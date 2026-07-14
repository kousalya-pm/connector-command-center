// Canned per-connector sample records + the AI's first-draft classification rule.
// Mirrors Fleak's OCSF Mapper pattern: AI proposes a rule from a sample,
// forced into structured output, shown in an editable dual view before it governs real data.

export const SAMPLES = {
  'amazon-s3': {
    sample: {
      key: 'claims/2026/patient_intake_04412.pdf',
      bucket: 'meridian-claims',
      contentPreview: 'Patient: J. Alvarez  DOB: 03/14/1979  SSN: 512-**-****  Diagnosis: ...',
      sizeBytes: 812_400,
    },
    suggestedRule: {
      classification: 'PII + PHI',
      confidence: 0.94,
      matchedPatterns: ['SSN (masked)', 'Date of Birth', 'Diagnosis code (ICD-10)'],
      policy: 'restrict-external-share, mask-ssn, retain-90d',
      expression:
        `case
  contains($.contentPreview, "SSN") => classify("PII")
  contains($.contentPreview, "Diagnosis") => classify("PHI")
  default => classify("UNCLASSIFIED")`,
    },
  },
  'sharepoint': {
    sample: {
      key: '/Finance/Contracts/vendor_agreement_acme_2026.docx',
      site: 'Finance Team Site',
      contentPreview: 'This Master Services Agreement ("Agreement") is entered into by and between...',
      sizeBytes: 240_100,
    },
    suggestedRule: {
      classification: 'Confidential — Contract',
      confidence: 0.88,
      matchedPatterns: ['Contract language', 'Vendor name entity', 'Effective date'],
      policy: 'restrict-external-share, legal-hold-eligible',
      expression:
        `case
  contains($.contentPreview, "Agreement") => classify("CONTRACT")
  contains($.key, "/Finance/") => classify("FINANCIAL")
  default => classify("UNCLASSIFIED")`,
    },
  },
  default: {
    sample: {
      key: 'sample-record-001',
      contentPreview: 'Generic record content used for rule preview...',
      sizeBytes: 4096,
    },
    suggestedRule: {
      classification: 'Unclassified',
      confidence: 0.52,
      matchedPatterns: ['No strong signal in sample'],
      policy: 'default-retention',
      expression:
        `case
  default => classify("UNCLASSIFIED")`,
    },
  },
};

export function sampleForConnector(connectorId) {
  return SAMPLES[connectorId] || SAMPLES.default;
}
