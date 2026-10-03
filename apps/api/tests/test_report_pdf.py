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
