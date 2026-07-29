from app.services.search_service import expand_query, _build_search_params


def test_expands_known_domain_term():
    result = expand_query("leaking tap")
    assert "leak" in result
    assert "fitting" in result


def test_passes_through_unknown_query_unchanged():
    result = expand_query("random unrelated query")
    assert result == "random unrelated query"


def test_original_query_always_preserved_in_expansion():
    result = expand_query("blocked drain in bathroom")
    assert result.startswith("blocked drain in bathroom")


def test_build_search_params_serializes_bool_as_lowercase_string_not_python_repr():
    # apps/api's QueryProductsDto checks the literal string 'true'/'false'
    # (see its @Transform) — Python's str(True) is 'True' (capital T),
    # which would silently fail that check if sent as-is.
    params = _build_search_params("pipe", None, 1, 24, None, None, True, None, None)
    assert params["inStockOnly"] == "true"

    params_false = _build_search_params("pipe", None, 1, 24, None, None, False, None, None)
    assert params_false["inStockOnly"] == "false"


def test_build_search_params_omits_unset_filters_entirely():
    params = _build_search_params("pipe", None, 1, 24, None, None, None, None, None)
    assert "inStockOnly" not in params
    assert "minPrice" not in params
    assert "maxPrice" not in params
    assert "brand" not in params


def test_build_search_params_includes_every_filter_when_provided():
    params = _build_search_params("pipe", "cat-1", 1, 24, 50.0, 200.0, True, "price_asc", "Cobra")
    assert params == {
        "search": "pipe",
        "page": 1,
        "pageSize": 24,
        "categoryId": "cat-1",
        "minPrice": 50.0,
        "maxPrice": 200.0,
        "inStockOnly": "true",
        "sortBy": "price_asc",
        "brand": "Cobra",
    }
