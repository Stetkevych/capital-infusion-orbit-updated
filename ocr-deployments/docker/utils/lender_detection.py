import pandas as pd
import re


# ==================================================
# STRICT WORD-BOUNDARY MATCHING
# Prevents:
# PAR -> PARK / PARKING / PARKWAY
# ==================================================

def keyword_matches(clean_description, clean_keyword):

    pattern = r"\b" + re.escape(clean_keyword) + r"\b"

    return re.search(pattern, clean_description) is not None


# ==================================================
# MCA LENDER KEYWORDS
# ==================================================

LENDER_KEYWORDS = {

    # =========================
    # A
    # =========================

    "ACH CAPITAL": [
        "ACH CAPITAL"
    ],

    "AFFIRM": [
        "AFFIRM",
        "AFFIRM PAY",
        "AFFIRM COM",
        "AFFIRM COM PAYME"
    ],

    # =========================
    # B
    # =========================

    "BALBOA CAPITAL": [
        "BALBOA",
        "BALBOA CAPITAL"
    ],

    "BITTY ADVANCE": [
        "BITTY",
        "BITTY ADVANCE",
        "MCA SAVINGS"
    ],

    "BLUEVINE": [
        "BLUEVINE"
    ],

    "BREAKOUT CAPITAL": [
        "BREAKOUT",
        "BREAKOUT CAPITAL"
    ],

    # =========================
    # C
    # =========================

    "CAN CAPITAL": [
        "CAN CAPITAL",
        "CANCAP"
    ],

    "CAPITAL INFUSION": [
        "CAP INFUSION",
        "CAPITAL INFUSION"
    ],

    "CFGMS": [
        "CFGMS",
        "LCM",
        "LCM 1823095",
        "MC 844 662 3467"
    ],

    "CHANNEL PARTNERS":[
        "CHANNEL PARTNERS",
        "LENDING SERVICES"
    ],

    "CLEARCO": [
        "CLEARCO"
    ],

    "CREDIBLY": [
        "CREDIBLY",
        "RETAIL CAPITAL"
    ],

    # =========================
    # D
    # =========================

    "DAILY FUNDING": [
        "DAILY FUNDING",
        "DAILYFUNDING"
    ],

    "DE LAGE LANDEN": [
        "DE LAGE LANDEN",
        "DELAGELANDEN",
        "DIRECT DEB DELAGELANDEN"
    ],

    "DELTA": [
        "DELTA",
        "FUNDRY"
    ],

    # =========================
    # E
    # =========================

    "EBF HOLDINGS": [
        "EBF",
        "EBF DEBIT",
        "EBF HOLDINGS",
        "HOLDINGS EBF"
    ],

    "ELEVATED FUNDING": [
        "ELEVATED",
        "ELEVATED FUNDING"
    ],

    "EMINENT FUNDING": [
        "EMINENT",
        "3329001101",
        "EMINENT FUNDING"
    ],

    "EMS HOLDINGS": [
        "EMS",
        "EMS HOLDINGS"
    ],

    "EVEREST BUSINESS FUNDING": [
        "EVEREST",
        "EBFUNDING",
        "EVEREST BUSINESS FUNDING"
    ],

    "EXPANSION CAPITAL": [
        "EXP CAPITAL",
        "EXPANSION CAPITAL",
        "ECG LLC"
    ],

    # =========================
    # F
    # =========================

    "FORA FINANCIAL": [
        "FORA",
        "FORA FINANCIAL"
    ],

    "FORWARD FINANCING": [
        "FORWARD",
        "FORWARD FINANCING"
    ],

    "FUNDBOX": [
        "FUNDBOX"
    ],

    "FUNDATION": [
        "FUNDATION"
    ],

    "FUNDWORKS": [
        "FW CAPITAL",
        "FWCAPITAL",
        "FUNDWORKS",
        "FUND WORKS",
        "THE FUNDWORKS",
        "THE FUND WORKS",
        "FUNDWORK",
        "FUND WORK",
        "FUNDOWRK",
        "FUNDOWRKS",
        "FUND WRKS",
        "FUNDWK",
        "ACH FUNDWORKS",
        "FUNDWORKS LLC",
        "THE FUNDWORKS LLC"
    ],

    # =========================
    # G
    # =========================

    "GLOBAL MERCHANT": [
        "EDI PYMNTS",
        "GBL MERCHANT",
        "GLOBAL MER",
        "GLOBAL MER EDI",
        "GLOBAL MERCHANT",
        "WALL"
    ],

    "GREENBOX CAPITAL": [
        "GREENBOX",
        "GREENBOX CAPITAL"
    ],

    "GFE": [
        "GFE",
        "UFCE",
        "UNITED FIRST",
        "GLOBAL FUNDING"
    ],

    # =========================
    # H
    # =========================

    "HEADWAY CAPITAL": [
        "HEADWAY",
        "HEADWAY CAPITAL"
    ],

    "HOUSE":[
        "HOUSE",
        "MRBIZCAP"
    ],

    # =========================
    # I
    # =========================

    "IDEA FINANCIAL": [
        "IDEAFINANCIAL",
        "IDEA FINANCIAL"
    ],

    "IOU FINANCIAL": [
        "IOU",
        "IOU FINANCIAL"
    ],

    "IRUKA":[
        "IRUKA",
        "J&G",
        "ICG",
    ],


    # =========================
    # J
    # =========================

    "JRW CAPITAL":[
        "JRW CAPITAL,"
        "JR CAPITAL LLC"
    ],


    # =========================
    # K
    # =========================

    "KABBAGE": [
        "KABBAGE"
    ],

    "KAPITUS": [
        "KAPITUS",
        "STRATEGIC FUNDING"
    ],

    # =========================
    # L
    # =========================
    
    "LENDINI": [
        "LENDINI",
        "FUNDING METRICS"
    ],

    "LG FUNDING": [
        "LG FUNDING",
        "LG FUNDING LLC"
    ],

    "LIBERTAS FUNDING": [
        "LIBERTAS",
        "LIBERTAS FUNDING"
    ],

    "LOANME": [
        "LOAN ME",
        "LOANME"
    ],

    # =========================
    # M
    # =========================

    "MUDFLAP": [
        "MUDFLAP"
    ],

    # =========================
    # N
    # =========================

    "NATIONAL FUNDING": [
        "NATIONAL FUNDING"
    ],

    "NMEF": [
        "NMEF",
        "NMEF 2023 A"
    ],

    # =========================
    # O
    # =========================

    "ONDECK": [
        "ON DECK",
        "ONDECK",
        "ENOVA"
    ],

    # =========================
    # P
    # =========================

    "PAR FUNDING": [
        "PAR",
        "PAR FUNDING"
    ],

    "PAYABILITY": [
        "PAYABILITY"
    ],

    "PAYPAL WORKING CAPITAL": [
        "PAYPAL CAPITAL",
        "PAYPAL WORKING CAPITAL"
    ],

    # =========================
    # Q
    # =========================

    "QUARTERSPOT": [
        "QUARTER SPOT",
        "QUARTERSPOT"
    ],

    # =========================
    # R
    # =========================

    "RAPID FINANCE": [
        "RAPIDFINANCE",
        "RAPID FINANCE",
        "RAPID",
        "SBFS"
    ],

    "RELIANT FUNDING": [
        "RELIANT",
        "RELIANT FUNDING"
    ],

    # =========================
    # S
    # =========================


    "SHEAVES":[
        "SHEAVES",
        "3201961 ONTARRIO INC",
        "11302078 CANADA LTD"
    ],

    "SHOPIFY CAPITAL": [
        "SHOPIFYCAPITAL",
        "SHOPIFY CAPITAL"
    ],

    "SMARTPAY": [
        "SMARTPAY",
        "SMARTPAY SOL"
    ],

    "SPECIALTY":[
        "SPECIALTY",
        "ASCENTRA VENTURE"
    ],

    "SQUARE CAPITAL": [
        "SQ CAPITAL",
        "SQUARE CAPITAL"
    ],

    # =========================
    # T
    # =========================

    "TORRO": [
        "TORRO"
    ],

    # =========================
    # V
    # =========================

    "VELOCITY CAPITAL": [
        "VELOCITY",
        "VELOCITY CAPITAL"
    ],

    # =========================
    # Y
    # =========================

    "YELLOWSTONE CAPITAL": [
        "YELLOWSTONE",
        "YELLOWSTONE CAPITAL"
    ],

    # =========================
    # #
    # =========================

    "2M7":[
        "2M7",
        "URAL LINK"
    ],
    

}


# ==================================================
# SUSPICIOUS / FALSE MCA FLAGS
# These DO NOT count as lender debits.
# They only go to a suspicious table.
# ==================================================

FALSE_LENDER_FLAG_KEYWORDS = [

    "SQ",
    "SQUARE",
    "PAYPAL",
    "PAY PAL",
    "STRIPE",
    "VENMO",
    "ZELLE",
    "CASHAPP",
    "SHOPIFY",
    "CARD PURCHASE",
    "POS",
    "DEBIT CARD",
    "PURCHASE AUTHORIZED",
    "CLOVER",
    "TOAST",
]


# ==================================================
# CLEAN TEXT
# ==================================================

def clean_text(text):

    text = str(text).upper().strip()

    text = (
        text
        .replace("-", " ")
        .replace("_", " ")
        .replace(".", " ")
        .replace(",", " ")
        .replace("*", " ")
        .replace("#", " ")
        .replace("/", " ")
        .replace("\\", " ")
    )

    return " ".join(text.split())


# ==================================================
# CLEAN MONEY VALUE
# ==================================================

def clean_money_value(value):

    if value is None or pd.isna(value):
        return 0.0

    value = str(value).strip()

    value = (
        value
        .replace("$", "")
        .replace("+", "")
        .replace(" ", "")
    )

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

    except Exception:
        return 0.0


# ==================================================
# DETECT MCA COMPANY
# ==================================================

def detect_company(description, keyword_dict):

    clean_description = clean_text(description)

    for lender_name, keywords in keyword_dict.items():

        for keyword in keywords:

            clean_keyword = clean_text(keyword)

            # STRICT WORD MATCHING
            if keyword_matches(clean_description, clean_keyword):

                return lender_name, clean_keyword

    return "", ""


# ==================================================
# SUSPICIOUS FALSE MCA FLAGGING
# ==================================================

def is_suspicious_false_lender(description):

    clean_description = clean_text(description)

    for keyword in FALSE_LENDER_FLAG_KEYWORDS:

        clean_keyword = clean_text(keyword)

        if keyword_matches(clean_description, clean_keyword):

            return True, clean_keyword

    return False, ""


# ==================================================
# GET LENDER DEBITS
# ==================================================

def get_lender_debits(df, total_revenue):

    lender_rows = []

    if df.empty:
        return pd.DataFrame(), 0.0, 0.0

    for _, row in df.iterrows():

        try:

            description = " ".join([
                str(value)
                for value in row.values
                if pd.notna(value)
            ])

            detected_lender, matched_keyword = detect_company(
                description,
                LENDER_KEYWORDS
            )

            if not detected_lender:
                continue

            amount = clean_money_value(
                row.get("Amount", 0)
            )

            debit = clean_money_value(
                row.get("Debit", 0)
            )

            if debit > 0:
                lender_debit_amount = debit

            elif amount < 0:
                lender_debit_amount = abs(amount)

            else:
                continue

            new_row = row.copy()

            new_row["Detected Lender"] = detected_lender
            new_row["Matched Keyword"] = matched_keyword
            new_row["Lender Debit Amount"] = lender_debit_amount

            lender_rows.append(new_row)

        except Exception as e:
            print(f"Lender detection error: {e}")
            continue

    lender_rows = pd.DataFrame(lender_rows)

    lender_debit_total = (
        lender_rows["Lender Debit Amount"].sum()
        if not lender_rows.empty
        else 0.0
    )

    withholding_rate = (
        lender_debit_total / total_revenue * 100
        if total_revenue > 0
        else 0.0
    )

    return lender_rows, lender_debit_total, withholding_rate


# ==================================================
# GET FLAGGED / SUSPICIOUS MCA ROWS
# ==================================================

def get_flagged_suspicious_mcas(df):

    flagged_rows = []

    if df.empty:
        return pd.DataFrame()

    for _, row in df.iterrows():

        try:

            description = " ".join([
                str(value)
                for value in row.values
                if pd.notna(value)
            ])

            is_flagged, matched_keyword = (
                is_suspicious_false_lender(description)
            )

            if not is_flagged:
                continue

            new_row = row.copy()

            new_row["Flag Reason"] = (
                "Possible False MCA / Payment Processor"
            )

            new_row["Matched Flag Keyword"] = matched_keyword

            flagged_rows.append(new_row)

        except Exception as e:
            print(f"Suspicious MCA flag error: {e}")
            continue

    return pd.DataFrame(flagged_rows)