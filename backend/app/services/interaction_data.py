"""
Curated high-severity drug interaction dataset for demo/MVP purposes.

This is intentionally a small, hand-picked set of well-documented,
clinically significant interactions — not an exhaustive database.
A production version of Aegis would license a commercial interaction
database (e.g. First Databank, Multum) rather than rely on a static list.
Each entry is keyed by ingredient-level RxCUI pairs (order doesn't matter —
we check both directions when matching).
"""

INTERACTION_PAIRS = [
    {
        "rxcui_a": "11289",   # Warfarin
        "rxcui_b": "5640",    # Ibuprofen
        "severity": "severe",
        "description": "Combining Warfarin with Ibuprofen significantly increases the risk of serious bleeding.",
    },
    {
        "rxcui_a": "11289",   # Warfarin
        "rxcui_b": "161",     # Acetaminophen (high-dose, sustained use)
        "severity": "moderate",
        "description": "Regular Acetaminophen use with Warfarin can enhance its blood-thinning effect and raise bleeding risk.",
    },
    {
        "rxcui_a": "6809",    # Metformin
        "rxcui_b": "3443",    # Iodinated contrast media (used in imaging)
        "severity": "severe",
        "description": "Metformin combined with iodinated contrast dye can increase the risk of kidney injury and lactic acidosis.",
    },
    {
        "rxcui_a": "36567",   # Lisinopril (ACE inhibitor)
        "rxcui_b": "8591",    # Potassium supplements
        "severity": "moderate",
        "description": "ACE inhibitors like Lisinopril combined with potassium supplements can cause dangerously high potassium levels.",
    },
    {
        "rxcui_a": "6135",    # Isocarboxazid (MAOI)
        "rxcui_b": "36437",   # Sertraline (SSRI)
        "severity": "severe",
        "description": "Combining an MAOI with an SSRI carries a serious risk of serotonin syndrome, a potentially life-threatening condition.",
    },
]


def find_interaction(rxcui_a: str, rxcui_b: str) -> dict | None:
    """
    Check if two RxCUIs form a known interacting pair, in either order.
    Returns the interaction dict if found, else None.
    """
    for pair in INTERACTION_PAIRS:
        if {pair["rxcui_a"], pair["rxcui_b"]} == {rxcui_a, rxcui_b}:
            return pair
    return None