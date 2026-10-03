"""PDF renderer tests: structure, content and unicode handling."""

from io import BytesIO

from pypdf import PdfReader

from app.services.report_pdf import render_report_pdf
from tests.test_report_data import _report
from tests.test_scoring import make_facility


def _text(pdf: bytes) -> str:
    return "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)


def _pdf(facilities, categories, address=None):
    data = _report(facilities, categories)
    if address:
        data.address = address
    return data, render_report_pdf(data)


def test_renders_valid_multi_page_pdf():
    data, pdf = _pdf(
        [make_facility("schools", 0.4, name="Ponsonby Primary"), make_facility("gps", 9.0)],
        ["schools", "gps"],
    )
    assert pdf.startswith(b"%PDF")
    assert len(PdfReader(BytesIO(pdf)).pages) >= 2
    assert len(pdf) < 2_000_000


def test_summary_contains_address_scores_and_coverage():
    data, pdf = _pdf([make_facility("schools", 0.4)], ["schools"])
    text = _text(pdf)
    assert "Address Intelligence Report" in text
    assert "1 Queen St, Auckland" in text
    assert f"{data.overall:.0f}" in text
    assert f"coverage {data.coverage}" in text
    assert "Top strengths" in text and "Biggest gaps" in text


def test_category_sections_show_breakup_and_hint():
    data, pdf = _pdf([make_facility("gps", 9.0)], ["gps"])
    text = _text(pdf)
    gp = next(f for f in data.facilities if f.facility_type == "gps")
    assert "Proximity (nearest facility)" in text
    assert "Density (how many nearby)" in text
    assert "Adds to score" in text
    assert gp.hint and gp.hint.split(";")[0] in text.replace("\n", " ")


def test_unscored_categories_say_not_scored_not_zero():
    _, pdf = _pdf([make_facility("schools", 0.4)], ["schools"])
    assert "Not scored" in _text(pdf)


def test_no_categories_overall_missing_message():
    _, pdf = _pdf([], [])
    assert "no overall score" in _text(pdf)


def test_macrons_and_unicode_address_survive():
    _, pdf = _pdf(
        [make_facility("schools", 0.4)],
        ["schools"],
        address="12 Whakarewarewa Rd, Rotorua — Ōtūmoetai ā ē ī",
    )
    assert "Ōtūmoetai" in _text(pdf)


def test_markup_in_names_is_escaped():
    _, pdf = _pdf([make_facility("schools", 0.4)], ["schools"], address="<b>1 & 2</b> Street")
    assert "<b>1 & 2</b> Street" in _text(pdf)


def test_very_long_address_does_not_break_rendering():
    _, pdf = _pdf(
        [make_facility("schools", 0.4)],
        ["schools"],
        address="Unit " + "very long street name " * 40,
    )
    assert pdf.startswith(b"%PDF")


# --- Map, appendix and methodology (story: appendix pages) -----------------


def _many(n):
    return [make_facility("bus_stops", 0.2 + i * 0.01, name=f"Stop {i}") for i in range(n)]


def test_methodology_sources_attribution_version_and_timestamp():
    data, pdf = _pdf([make_facility("schools", 0.4)], ["schools"])
    text = _text(pdf)
    assert "Methodology & data sources" in text
    for needle in ("LINZ NZ Addresses", "OpenStreetMap contributors", "CC BY 4.0", "ODbL 1.0"):
        assert needle in text
    assert "UTC" in text and "v" + data.app_version in text


def test_methodology_lists_analysis_warnings():
    data = _report([make_facility("schools", 0.4)], ["schools"])
    data.warnings = ["OSRM unavailable, used straight-line distances"]
    text = _text(render_report_pdf(data))
    assert "OSRM unavailable" in text


def test_appendix_lists_every_facility_grouped():
    _, pdf = _pdf(
        [
            make_facility("schools", 0.4, name="Ponsonby Primary"),
            make_facility("gps", 1.0, name="City GP"),
        ],
        ["schools", "gps"],
    )
    text = _text(pdf)
    assert "Facility appendix" in text
    assert "Ponsonby Primary" in text and "City GP" in text


def test_appendix_paginates_hundreds_of_facilities():
    _, small = _pdf(_many(5), ["bus_stops"])
    _, big = _pdf(_many(600), ["bus_stops"])
    pages = len(PdfReader(BytesIO(big)).pages)
    assert pages > len(PdfReader(BytesIO(small)).pages) + 5
    text = _text(big)
    assert "Stop 0" in text and "Stop 599" in text


def test_zero_facilities_renders_map_and_appendix_placeholders():
    _, pdf = _pdf([], ["schools"])
    text = _text(pdf)
    assert "No facilities were found" in text
    assert "No facilities to list" in text


def test_map_failure_falls_back_without_failing_report(monkeypatch):
    from app.services import report_sections

    def boom(_data):
        raise RuntimeError("plot failed")

    monkeypatch.setattr(report_sections, "build_map_drawing", boom)
    _, pdf = _pdf([make_facility("schools", 0.4)], ["schools"])
    text = _text(pdf).replace("\n", " ")
    assert "map could not be drawn" in text
    assert "Facility appendix" in text


def test_map_plots_only_facilities_inside_radius():
    from app.services.report_sections import build_map_drawing

    data = _report([make_facility("schools", 0.4), make_facility("schools", 0.5)], ["schools"])
    data.features[0].lat, data.features[0].lon = data.lat + 0.001, data.lon  # ~110 m, inside
    data.features[1].lat, data.features[1].lon = data.lat + 5.0, data.lon  # ~550 km, outside
    _, plotted = build_map_drawing(data)
    assert plotted == 1
