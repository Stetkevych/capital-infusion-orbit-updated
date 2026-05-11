import pandas as pd

from utils.funding_detection import detect_existing_funding
from utils.risk_detection import detect_nsf


def clean_amount(value):
    if pd.isna(value) or value == "":
        return 0.0

    value = str(value).strip()
    value = value.replace("$", "")
    value = value.replace(",", "")
    value = value.replace("(", "")
    value = value.replace(")", "")
    value = value.replace(" ", "")

    try:
        return float(value)
    except:
        return 0.0


def is_debit_description(description):
    desc = str(description).lower()

    debit_keywords = [
        "debit",
        "withdrawal",
        "withdraw",
        "purchase",
        "pos",
        "atm",
        "check",
        "payment",
        "ach debit",
        "fee",
        "charge",
        "payroll",
        "transfer out",
        "zelle payment",
        "cash app",
        "square capital",
        "loan payment",
        "mca",
        "funding payment",
        "returned item",
        "overdraft"
    ]

    return any(word in desc for word in debit_keywords)


def is_credit_description(description):
    desc = str(description).lower()

    credit_keywords = [
        "deposit",
        "credit",
        "ach credit",
        "merchant deposit",
        "stripe",
        "square deposit",
        "paypal deposit",
        "transfer in",
        "zelle deposit"
    ]

    return any(word in desc for word in credit_keywords)


def prepare_dataframe(df):
    df.columns = [col.strip().lower() for col in df.columns]

    possible_date_cols = ["date", "transaction date", "posted date"]
    possible_desc_cols = ["description", "details", "transaction", "memo"]
    possible_amount_cols = ["amount", "transaction amount"]
    possible_debit_cols = ["debit", "debits", "withdrawal", "withdrawals", "money out"]
    possible_credit_cols = ["credit", "credits", "deposit", "deposits", "money in"]

    date_col = next((col for col in possible_date_cols if col in df.columns), None)
    desc_col = next((col for col in possible_desc_cols if col in df.columns), None)
    amount_col = next((col for col in possible_amount_cols if col in df.columns), None)
    debit_col = next((col for col in possible_debit_cols if col in df.columns), None)
    credit_col = next((col for col in possible_credit_cols if col in df.columns), None)

    if not date_col:
        return pd.DataFrame()

    if not desc_col:
        df["description"] = ""
        desc_col = "description"

    clean_df = pd.DataFrame()
    clean_df["Date"] = pd.to_datetime(df[date_col], errors="coerce")
    clean_df["Description"] = df[desc_col].astype(str)

    # Best case: statement/export has separate Debit and Credit columns
    if debit_col or credit_col:
        clean_df["Debit"] = df[debit_col].apply(clean_amount).abs() if debit_col else 0.0
        clean_df["Credit"] = df[credit_col].apply(clean_amount).abs() if credit_col else 0.0
        clean_df["Amount"] = clean_df["Credit"] - clean_df["Debit"]

    # Common OCR/CSV case: one amount column, all numbers positive
    elif amount_col:
        clean_df["Amount"] = df[amount_col].apply(clean_amount).abs()
        clean_df["Debit"] = 0.0
        clean_df["Credit"] = 0.0

        for index, row in clean_df.iterrows():
            amount = abs(row["Amount"])
            desc = row["Description"]

            if is_debit_description(desc):
                clean_df.at[index, "Debit"] = amount
            elif is_credit_description(desc):
                clean_df.at[index, "Credit"] = amount
            else:
                # Default unknown positive transactions to debit
                # because many OCR bank statements show withdrawals as positive
                clean_df.at[index, "Debit"] = amount

        clean_df["Amount"] = clean_df["Credit"] - clean_df["Debit"]

    else:
        return pd.DataFrame()

    clean_df = clean_df.dropna(subset=["Date"])

    clean_df["Month"] = clean_df["Date"].dt.strftime("%B %Y")

    clean_df["Type"] = clean_df.apply(
        lambda row: "Debit" if row["Debit"] > 0 else "Credit",
        axis=1
    )

    clean_df["NSF Flag"] = clean_df["Description"].apply(detect_nsf)

    funding_results = clean_df["Description"].apply(detect_existing_funding)
    clean_df["Funding Detected"] = funding_results.apply(lambda x: x[0])
    clean_df["Funded By"] = funding_results.apply(lambda x: x[1])

    return clean_df


def create_monthly_summary(df):
    monthly = df.groupby("Month").agg(
        Monthly_Revenue=("Credit", "sum"),
        Monthly_Debits=("Debit", "sum"),
        Transaction_Count=("Amount", "count"),
        NSF_Count=("NSF Flag", "sum")
    ).reset_index()

    monthly["Monthly_Cash_Flow"] = (
        monthly["Monthly_Revenue"] - monthly["Monthly_Debits"]
    )

    monthly["Withholding_Rate"] = monthly.apply(
        lambda row: (row["Monthly_Debits"] / row["Monthly_Revenue"]) * 100
        if row["Monthly_Revenue"] > 0 else 0,
        axis=1
    )

    return monthly