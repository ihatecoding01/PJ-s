import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const validTermsPath = path.join(rootDir, 'PERSON3 PERCY', 'tests', 'fixtures', 'sample_terms.json');
const validTerms = JSON.parse(fs.readFileSync(validTermsPath, 'utf8'));

// Invalid terms document: invalid client address, missing milestones, negative penalty
const invalidTerms = {
  schemaVersion: "1.0",
  title: "Broken Contract",
  client: "invalid-not-hex",
  freelancer: "0x2222222222222222222222222222222222222222",
  totalAmount: "-5.0",
  paymentMode: "INVALID_MODE",
  milestones: []
};

console.log("=== SEAM 2.3: AGREEMENT TERMS SCHEMA VALIDATION ===");

// 1. Test Suzan's Frontend Validator (termsToChain)
console.log("\n--- Testing Suzan's Frontend Validator (termsToChain) ---");
const suzanModuleUrl = pathToFileURL(path.join(rootDir, 'PERSON4 SUZAN', 'src', 'lib', 'termsToChain.js')).href;
const { termsToChain } = await import(suzanModuleUrl);

let suzanValidPass = false;
try {
  const result = termsToChain(validTerms);
  if (result.args && result.args.length === 13) {
    suzanValidPass = true;
    console.log("✓ Suzan validator: VALID terms ACCEPTED (args count: 13)");
  }
} catch (e) {
  console.error("✗ Suzan validator rejected valid terms:", e.message);
}

let suzanInvalidPass = false;
try {
  termsToChain(invalidTerms);
  console.error("✗ Suzan validator ACCEPTED invalid terms when it should fail!");
} catch (e) {
  suzanInvalidPass = true;
  console.log("✓ Suzan validator: INVALID terms REJECTED as expected:", e.message);
}

// 2. Test Jonah's Backend Validator (agreementTermsSchema)
console.log("\n--- Testing Jonah's Backend Validator (agreementTermsSchema) ---");
const jonahModuleUrl = pathToFileURL(path.join(rootDir, 'PERSON2 JONAH', 'backend', 'src', 'modules', 'agreements', 'agreement.schema.ts')).href;
const { agreementTermsSchema } = await import(jonahModuleUrl);

const dhruvValidResult = agreementTermsSchema.safeParse(validTerms);
const dhruvValidPass = dhruvValidResult.success;
if (dhruvValidPass) {
  console.log("✓ Jonah validator: VALID terms ACCEPTED");
} else {
  console.error("✗ Jonah validator rejected valid terms:", dhruvValidResult.error);
}

const dhruvInvalidResult = agreementTermsSchema.safeParse(invalidTerms);
const dhruvInvalidPass = !dhruvInvalidResult.success;
if (dhruvInvalidPass) {
  console.log("✓ Jonah validator: INVALID terms REJECTED as expected:", dhruvInvalidResult.error?.issues[0]?.message);
} else {
  console.error("✗ Jonah validator ACCEPTED invalid terms when it should fail!");
}

// 3. Test Percy's Python Service Validator
console.log("\n--- Testing Percy's Python Validator (validate_agreement_terms & AgreementTerms) ---");
const pyExecutable = path.join(rootDir, 'PERSON3 PERCY', 'venv', 'Scripts', 'python.exe');

const pyRunner = path.join(rootDir, 'scripts', 'test_py_terms.py');
const pyRunnerCode = `
import json, sys, os
sys.path.insert(0, r"""${path.join(rootDir, 'PERSON3 PERCY')}""")
from app.services.validator import validate_agreement_terms
from app.models.terms import AgreementTerms

with open(r"""${validTermsPath}""", "r") as f:
    valid_data = json.load(f)

invalid_data = ${JSON.stringify(invalidTerms)}

# Test valid
sanitized, errors, warnings = validate_agreement_terms(valid_data)
try:
    model_obj = AgreementTerms.model_validate(valid_data)
    valid_ok = len(errors) == 0
except Exception as e:
    valid_ok = False

# Test invalid
_, invalid_errors, _ = validate_agreement_terms(invalid_data)
try:
    AgreementTerms.model_validate(invalid_data)
    invalid_ok = False
except Exception:
    invalid_ok = len(invalid_errors) > 0

print(f"YASHDEEP_VALID:{valid_ok}")
print(f"YASHDEEP_INVALID:{invalid_ok}")
`;

fs.writeFileSync(pyRunner, pyRunnerCode, 'utf8');

let yashdeepValidPass = false;
let yashdeepInvalidPass = false;

try {
  const pyOutput = execSync(`"${pyExecutable}" "${pyRunner}"`, {
    cwd: path.join(rootDir, 'PERSON3 PERCY'),
    encoding: 'utf8'
  });
  yashdeepValidPass = pyOutput.includes("YASHDEEP_VALID:True");
  yashdeepInvalidPass = pyOutput.includes("YASHDEEP_INVALID:True");
  console.log("✓ Yashdeep validator: VALID terms:", yashdeepValidPass ? "ACCEPTED" : "FAILED");
  console.log("✓ Yashdeep validator: INVALID terms:", yashdeepInvalidPass ? "REJECTED as expected" : "FAILED");
} catch (e) {
  console.error("✗ Yashdeep validator execution failed:", e.message);
} finally {
  if (fs.existsSync(pyRunner)) fs.unlinkSync(pyRunner);
}

console.log("\n=== SUMMARY OF SEAM 2.3 ===");
const allAgree = suzanValidPass && suzanInvalidPass && dhruvValidPass && dhruvInvalidPass && yashdeepValidPass && yashdeepInvalidPass;
console.log(`All three implementations agree on valid and invalid documents: ${allAgree ? "YES (PASS)" : "NO (FAIL)"}`);

if (!allAgree) {
  process.exit(1);
}
