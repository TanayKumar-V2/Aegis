import httpx

from app.config import settings


async def get_rxcui(drug_name: str) -> str | None:
    """
    Resolve a drug name (e.g. 'Metformin') to its RxNorm ingredient-level
    concept ID (RxCUI). We specifically request TTY=IN (ingredient) results
    so interaction checks compare active ingredients, not specific branded
    formulations of the same drug.
    """
    url = f"{settings.rxnorm_base_url}/rxcui.json"
    params = {"name": drug_name, "search": "1"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, httpx.TimeoutException):
        return None

    id_group = data.get("idGroup", {})
    rxcui_list = id_group.get("rxnormId")

    if not rxcui_list:
        return None

    if len(rxcui_list) > 1:
        ingredient_rxcui = await _find_ingredient_level(client_timeout=5.0, candidates=rxcui_list)
        if ingredient_rxcui:
            return ingredient_rxcui

    return rxcui_list[0]


async def _find_ingredient_level(client_timeout: float, candidates: list[str]) -> str | None:
    filter_url_template = settings.rxnorm_base_url + "/rxcui/{rxcui}/filter.json"

    async with httpx.AsyncClient(timeout=client_timeout) as client:
        for rxcui in candidates:
            try:
                response = await client.get(
                    filter_url_template.format(rxcui=rxcui),
                    params={"propName": "TTY", "propValues": "IN PIN"},
                )
                response.raise_for_status()
                data = response.json()
            except (httpx.HTTPError, httpx.TimeoutException):
                continue

            if data.get("rxnormdata", {}).get("rxcui"):
                return rxcui

    return None