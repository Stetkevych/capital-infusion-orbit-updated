import pandas as pd


FUNDING_COMPANY_KEYWORDS = {
    "SCALE FUNDING": [
        "SCALE FUNDING",
        "SCALE FUNDING ACH",
        "SCALE FUNDING - ACH",
        "SCALE"
    ],

    "LG FUNDING": [
        "LG FUNDING",
        "LG FUNDING LLC"
    ],

    "EBF HOLDINGS": [
        "EBF HOLDINGS",
        "EBF"
    ],

    "EMINENT FUNDING": [
        "EMINENT FUNDING",
        "EMINENT"
    ],

    "EMS HOLDINGS": [
        "EMS HOLDINGS",
        "EMS"
    ],

    "CFGMS": [
        "CFGMS"
    ],

    "NMEF": [
        "NMEF",
        "NMEF 2023-A"
    ],

    "GLOBAL MERCHANT": [
        "GLOBAL MER",
        "GBL MERCHANT",
        "GLOBAL MERCHANT"
    ],

    "FORA FINANCIAL": [
        "FORA",
        "FORA FINANCIAL"
    ],

    "ONDECK": [
        "ONDECK",
        "ON DECK"
    ],

    "KAPITUS": [
        "KAPITUS"
    ],

    "RAPID FINANCE": [
        "RAPID FINANCE"
    ],

    "FORWARD FINANCING": [
        "FORWARD FINANCING",
        "FORWARD"
    ],

    "SHOPIFY CAPITAL": [
        "SHOPIFY CAPITAL"
    ],

    "STRIPE CAPITAL": [
        "STRIPE CAPITAL"
    ],

    "PAYPAL WORKING CAPITAL": [
        "PAYPAL WORKING CAPITAL",
        "PAYPAL CAPITAL"
    ],

    "AMAZON LENDING": [
        "AMAZON LENDING"
    ],

    "TOAST CAPITAL": [
        "TOAST CAPITAL"
    ],

    "CLOVER CAPITAL": [
        "CLOVER CAPITAL"
    ],

    "SQUARE CAPITAL": [
        "SQUARE CAPITAL",
        "SQ CAPITAL"
    ],

    "BLUEVINE": [
        "BLUEVINE"
    ],

    "FUNDBOX": [
        "FUNDBOX"
    ],

    "CLEARCO": [
        "CLEARCO"
    ]
}


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


def detect_company(description, keyword_dict):
    clean_description = clean_text(description)

    for company_name, keywords in keyword_dict.items():
        for keyword in keywords:
            clean_keyword = clean_text(keyword)

            if clean_keyword in clean_description:
                return company_name

    return ""


def detect_existing_funding(description):
    detected_funding = detect_company(
        description,
        FUNDING_COMPANY_KEYWORDS
    )

    if detected_funding:
        return True, detected_funding

    return False, ""


def detect_funding_companies(df):
    funding_rows = []

    if df.empty:
        return pd.DataFrame(), False, []

    for _, row in df.iterrows():
        description = str(row.get("Description", ""))
        credit = float(row.get("Credit", 0) or 0)

        if credit <= 0:
            continue

        detected_funding = detect_company(
            description,
            FUNDING_COMPANY_KEYWORDS
        )

        if detected_funding:
            new_row = row.copy()
            new_row["Funding Company"] = detected_funding
            funding_rows.append(new_row)

    funding_rows = pd.DataFrame(funding_rows)

    funding_detected = not funding_rows.empty

    funding_companies = []

    if funding_detected:
        funding_companies = sorted(
            funding_rows["Funding Company"]
            .dropna()
            .unique()
            .tolist()
        )

    return funding_rows, funding_detected, funding_companies