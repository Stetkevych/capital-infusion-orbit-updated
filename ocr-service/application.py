from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
import pdfplumber
import io

from utils.calculations import prepare_dataframe
from utils.risk_detection import calculate_risk_level, generate_notes
from utils.lender_detection import get_lender_debits, LENDER_KEYWORDS, detect_company

application = Flask(__name__)
CORS(application)

EXCLUDED_REVENUE_WORDS = ["transfer from shares", "refund", "reversal"]
CHECKING_SECTION_KEYWORDS = ["checking", "checking account", "business plus ckg", "business plus ckf", "business plus checking", "business plus", "ckg"]
SAVINGS_SECTION_KEYWORDS = ["savings", "business savings"]

NORMALIZATION_MAP = {
    "DIRECT DEPOSIT": "DEPOSIT", "INTERAC TRANSFER": "TRANSFER", "WIRE IN": "TRANSFER",
    "POS PURCHASE": "PURCHASE", "ATM WITHDRAWAL": "WITHDRAWAL", "PREAUTHORIZED DEBIT": "PREAUTHORIZED DEBIT",
    "SERVICE FEE": "FEE", "NSF FEE": "NSF", "ONLINE TRANSFER": "TRANSFER", "WIRE TRANSFER": "TRANSFER",
    "OVERDRAFT": "OVERDRAFT", "INTEREST": "INTEREST"
}


def clean_money(value):
    if value is None:
        return 0.0
    value = str(value).strip().replace("$", "").replace("+", "").replace(" ", "")
    negative = False
    if value.startswith("(") and value.endswith(")"):
        negative = True
        value = value.replace("(", "").replace(")", "")
    if value.endswith("-"):
        negative = True
        value = value[:-1]
    if value.startswith("-"):
        negative = True
        value = value[1:]
    if "," in value and "." not in value:
        value = value.replace(",", ".")
    else:
        value = value.replace(",", "")
    try:
        amount = float(value)
        return -amount if negative else amount
    except:
        return 0.0


def fix_spaced_ocr_text(text):
    lines = text.split("\n")
    fixed_lines = []
    for line in lines:
        tokens = line.split(" ")
        if len(tokens) > 4 and all(len(t) <= 2 for t in tokens if t):
            fixed_lines.append("".join(tokens))
        else:
            fixed_lines.append(line)
    return "\n".join(fixed_lines)


def normalize_transaction_text(text):
    normalized = str(text).upper()
    for old, new in NORMALIZATION_MAP.items():
        normalized = normalized.replace(old, new)
    return normalized


def extract_pdf_text_with_pdfplumber(file_bytes):
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
    except Exception as e:
        print(f"pdfplumber extraction failed: {e}")
    return text


def extract_statement_summary(text):
    credits_amount = 0.0
    debits_amount = 0.0
    credit_count = 0
    debit_count = 0
    text = str(text).replace("\n", " ").replace("|", " ").replace("\t", " ")
    text = re.sub(r"\s+", " ", text)
    text = fix_spaced_ocr_text(text)

    patterns = [
        ("credit", r"(\d+)\s+Deposits/Credits\s+([\d,]+\.\d{2})"),
        ("debit", r"(\d+)\s+Checks/Debits\s+([\d,]+\.\d{2})"),
        ("credit", r"Deposits and other credits\s+([\d,]+\.\d{2})"),
        ("debit", r"Withdrawals and other debits\s+([\d,]+\.\d{2})"),
        ("credit", r"Deposits/Credits\s+([\d,]+\.\d{2})"),
        ("debit", r"Checks/Debits\s+([\d,]+\.\d{2})"),
        ("credit", r"(\d+)\s+Credit\(s\)\s+This\s+Period\s+\$?([\d,]+\.\d{2})"),
        ("debit", r"(\d+)\s+Debit\(s\)\s+This\s+Period\s+\$?([\d,]+\.\d{2})"),
    ]

    for kind, pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                count = int(match[0]) if str(match[0]).isdigit() else 0
                amount = clean_money(match[1])
            else:
                count = 0
                amount = clean_money(match)
            if kind == "credit" and amount > credits_amount:
                credits_amount = amount
                credit_count = count
            if kind == "debit" and amount > debits_amount:
                debits_amount = amount
                debit_count = count

    return {"credits_amount": credits_amount, "debits_amount": debits_amount, "credit_count": credit_count, "debit_count": debit_count}


def extract_pdf_summary_direct(file_bytes):
    credits_amount = 0.0
    debits_amount = 0.0
    credit_count = 0
    debit_count = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            raw_text = page.extract_text() or ""
            fixed_text = fix_spaced_ocr_text(raw_text)
            for line in fixed_text.split("\n"):
                clean_line = re.sub(r"\s+", " ", line).strip()
                upper_line = clean_line.upper()
                amounts = re.findall(r"\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}", clean_line)
                count_match = re.match(r"^(\d+)", clean_line)
                if "DEPOSITS/CREDITS" in upper_line and amounts:
                    credits_amount = clean_money(amounts[0])
                    credit_count = int(count_match.group(1)) if count_match else 0
                if "CHECKS/DEBITS" in upper_line and amounts:
                    debits_amount = clean_money(amounts[0])
                    debit_count = int(count_match.group(1)) if count_match else 0
                if "DEPOSITS AND OTHER CREDITS" in upper_line and amounts and credits_amount == 0:
                    credits_amount = clean_money(amounts[0])
                if "WITHDRAWALS AND OTHER DEBITS" in upper_line and amounts and debits_amount == 0:
                    debits_amount = clean_money(amounts[0])

    return {"credits_amount": credits_amount, "debits_amount": debits_amount, "credit_count": credit_count, "debit_count": debit_count}


def parse_universal_bank_rows(text):
    rows = []
    lines = text.split("\n")
    current_account_type = "checking"
    row_pattern = re.compile(
        r"^(\d{1,2}/\d{1,2}(?:/\d{2,4})?)\s+(.*?)\s+(-?\$?[\d,\s]+\.\d{2})(?:\s+(-?\$?[\d,\s]+\.\d{2}))?(?:\s+(-?\$?[\d,\s]+\.\d{2}))?$",
        re.IGNORECASE
    )
    debit_keywords = ["DEBIT", "WITHDRAWAL", "PAYMENT", "CHECK", "POS", "EFT", "FEE", "CHARGE", "LEASE", "DIRECT DBT", "DIRECT DEB"]

    for line in lines:
        line = line.strip()
        if not line:
            continue
        lower_line = line.lower()
        if any(k in lower_line for k in CHECKING_SECTION_KEYWORDS):
            current_account_type = "checking"
            continue
        if any(k in lower_line for k in SAVINGS_SECTION_KEYWORDS):
            current_account_type = "savings"
            continue
        if current_account_type != "checking":
            continue
        match = row_pattern.match(line)
        if not match:
            continue
        date = match.group(1)
        description = match.group(2).strip()
        nums = [x for x in match.groups()[2:] if x]
        cleaned_nums = [clean_money(x) for x in nums]
        upper_desc = description.upper()
        debit = 0.0
        credit = 0.0
        if len(cleaned_nums) >= 2:
            amount = cleaned_nums[0]
            if amount < 0 or any(w in upper_desc for w in debit_keywords):
                debit = abs(amount)
            else:
                credit = abs(amount)
        elif len(cleaned_nums) == 1:
            amount = cleaned_nums[0]
            if amount < 0 or any(w in upper_desc for w in debit_keywords):
                debit = abs(amount)
            else:
                credit = abs(amount)
        rows.append({"Date": date, "Description": description, "Debit": debit, "Credit": credit, "Amount": credit - debit})

    return pd.DataFrame(rows)


def fallback_lender_detection_from_text(text):
    rows = []
    for line in text.split("\n"):
        detected_lender, matched_keyword = detect_company(line, LENDER_KEYWORDS)
        if not detected_lender:
            continue
        amounts = re.findall(r"-?\$?\d{1,3}(?:,\d{3})*\.\d{2}|-?\$?\d+\.\d{2}", line)
        for amt in amounts:
            amount = clean_money(amt)
            if amount != 0:
                rows.append({"Detected Lender": detected_lender, "Matched Keyword": matched_keyword, "Lender Debit Amount": abs(amount)})
                break
    return rows, sum(r["Lender Debit Amount"] for r in rows)


@application.route("/", methods=["GET"])
@application.route("/health", methods=["GET"])
def health():
    return "OK", 200


@application.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "files" not in request.files:
            return jsonify({"error": "No files uploaded"}), 400

        files = request.files.getlist("files")
        results = []
        all_lenders = []

        for f in files:
            file_bytes = f.read()
            filename = f.filename.lower()

            if filename.endswith(".csv"):
                raw_df = pd.read_csv(io.BytesIO(file_bytes))
                text = ""
            elif filename.endswith((".xlsx", ".xls")):
                raw_df = pd.read_excel(io.BytesIO(file_bytes))
                text = ""
            elif filename.endswith(".pdf"):
                text = extract_pdf_text_with_pdfplumber(file_bytes)
                text = fix_spaced_ocr_text(text)
                text = normalize_transaction_text(text)
                raw_df = parse_universal_bank_rows(text)
                file_summary = extract_pdf_summary_direct(file_bytes)
                if file_summary["credits_amount"] == 0:
                    file_summary = extract_statement_summary(text)
            else:
                continue

            # Prepare dataframe
            temp_df = prepare_dataframe(raw_df) if not raw_df.empty else pd.DataFrame()

            # Get summary values
            if filename.endswith(".pdf"):
                file_revenue = file_summary.get("credits_amount", 0)
                file_credits = file_summary.get("credits_amount", 0)
                file_debits = file_summary.get("debits_amount", 0)
            else:
                file_revenue = temp_df["Credit"].sum() if not temp_df.empty and "Credit" in temp_df.columns else 0
                file_credits = file_revenue
                file_debits = temp_df["Debit"].sum() if not temp_df.empty and "Debit" in temp_df.columns else 0

            # Lender detection
            lender_rows = []
            lender_total = 0.0
            if text:
                lender_rows, lender_total = fallback_lender_detection_from_text(text)
            if lender_total == 0 and not raw_df.empty:
                lender_df, lender_total, _ = get_lender_debits(raw_df, file_revenue)
                if not lender_df.empty:
                    lender_rows = lender_df[["Detected Lender", "Matched Keyword", "Lender Debit Amount"]].to_dict("records")

            all_lenders.extend(lender_rows)
            withholding = (lender_total / file_revenue * 100) if file_revenue > 0 else 0

            # NSF detection
            nsf_count = int(temp_df["NSF Flag"].sum()) if not temp_df.empty and "NSF Flag" in temp_df.columns else 0
            funding_detected = bool(temp_df["Funding Detected"].any()) if not temp_df.empty and "Funding Detected" in temp_df.columns else False

            results.append({
                "statement": f.filename,
                "revenue": round(file_revenue, 2),
                "credits": round(file_credits, 2),
                "debits": round(file_debits, 2),
                "lender_debits": round(lender_total, 2),
                "withholding_rate": round(withholding, 2),
                "nsf_count": nsf_count,
                "funding_detected": funding_detected,
            })

        # Aggregate
        total_revenue = sum(r["revenue"] for r in results)
        total_debits = sum(r["debits"] for r in results)
        total_lender = sum(r["lender_debits"] for r in results)
        total_nsf = sum(r["nsf_count"] for r in results)
        any_funding = any(r["funding_detected"] for r in results)
        cash_flow = total_revenue - total_debits
        withholding_rate = (total_lender / total_revenue * 100) if total_revenue > 0 else 0

        risk_score, risk_level = calculate_risk_level(total_revenue, total_debits, total_nsf, any_funding)
        notes = generate_notes(total_revenue, total_debits, cash_flow, total_nsf, any_funding, [], withholding_rate)

        return jsonify({
            "statements": results,
            "summary": {
                "total_revenue": round(total_revenue, 2),
                "total_credits": round(sum(r["credits"] for r in results), 2),
                "total_debits": round(total_debits, 2),
                "total_lender_debits": round(total_lender, 2),
                "cash_flow": round(cash_flow, 2),
                "withholding_rate": round(withholding_rate, 2),
                "nsf_count": total_nsf,
                "funding_detected": any_funding,
                "risk_score": round(risk_score, 1),
                "risk_level": risk_level,
                "notes": notes,
            },
            "lenders": all_lenders,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    application.run(host="0.0.0.0", port=8080)

