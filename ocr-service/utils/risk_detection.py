def detect_nsf(description):
    nsf_keywords = [
        "nsf",
        "non sufficient funds",
        "insufficient funds",
        "overdraft",
        "returned item",
        "return fee"
    ]

    desc = str(description).lower()

    for word in nsf_keywords:
        if word in desc:
            return True

    return False


def calculate_risk_level(
    avg_revenue,
    avg_debits,
    nsf_count,
    funding_detected
):
    risk_score = 0

    if avg_revenue < 15000:
        risk_score += 30

    debit_ratio = avg_debits / avg_revenue if avg_revenue > 0 else 0

    if debit_ratio > 0.85:
        risk_score += 30

    if nsf_count >= 3:
        risk_score += 25

    if funding_detected:
        risk_score += 15

    if risk_score < 30:
        risk_level = "Low Risk"
    elif risk_score < 60:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"

    return risk_score, risk_level


def generate_notes(
    total_revenue,
    total_debits,
    total_cash_flow,
    nsf_count,
    funding_detected,
    funders=None,
    withholding_rate=0
):

    notes = []

    # Revenue
    if total_revenue >= 100000:
        notes.append(
            "Strong monthly revenue detected."
        )
    else:
        notes.append(
            "Monthly revenue is on the lower side."
        )

    # Cash Flow
    if total_cash_flow > 0:
        notes.append(
            "Positive cash flow detected."
        )
    else:
        notes.append(
            "Negative cash flow detected."
        )

    # NSF
    if nsf_count > 0:
        notes.append(
            f"{nsf_count} NSF / overdraft transactions detected."
        )
    else:
        notes.append(
            "No NSF activity detected."
        )

    # Existing Funding
    if funding_detected:

        if funders:
            notes.append(
                "Existing funding detected from: "
                + ", ".join(funders)
            )
        else:
            notes.append(
                "Existing funding detected."
            )

    else:
        notes.append(
            "No existing funding detected."
        )

    # Withholding Rate
    notes.append(
        f"Estimated withholding rate: {withholding_rate:.2f}%"
    )

    return notes