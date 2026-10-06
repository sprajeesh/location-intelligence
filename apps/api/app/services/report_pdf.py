"""PDF renderer for the address intelligence report (ReportLab / platypus).

`render_report_pdf` is synchronous and CPU-bound; callers on the event loop must
run it in a thread (see the report job runner).
"""

from collections.abc import Callable
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Rect
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.services.report_data import CategoryBreakup, FacilityBreakup, ReportData

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
FONT = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"

# Mirrors apps/web/src/styles/tokens.ts (primary / semantic scales).
PRIMARY = colors.HexColor("#007198")
PRIMARY_DARK = colors.HexColor("#004963")
PRIMARY_TINT = colors.HexColor("#E8F9FF")
INK = colors.HexColor("#0F2A35")
MUTED = colors.HexColor("#5B6B73")
RULE = colors.HexColor("#D5DEE2")
GOOD = colors.HexColor("#059669")
FAIR = colors.HexColor("#B45309")
POOR = colors.HexColor("#B91C1C")
HINT_BG = colors.HexColor("#FFFBEB")
HINT_BORDER = colors.HexColor("#FCD34D")

GOOD_MIN = 70.0
FAIR_MIN = 50.0

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

_fonts_registered = False


def _register_fonts() -> None:
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont(FONT, str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFontFamily(
        FONT, normal=FONT, bold=FONT_BOLD, italic=FONT, boldItalic=FONT_BOLD
    )
    _fonts_registered = True


def _styles() -> dict[str, ParagraphStyle]:
    base = ParagraphStyle("base", fontName=FONT, fontSize=9, leading=13, textColor=INK)
    return {
        "base": base,
        "title": ParagraphStyle("title", parent=base, fontName=FONT_BOLD, fontSize=22, leading=27),
        "address": ParagraphStyle(
            "address", parent=base, fontSize=12, leading=16, textColor=PRIMARY_DARK
        ),
        "meta": ParagraphStyle("meta", parent=base, fontSize=8, textColor=MUTED),
        "h1": ParagraphStyle(
            "h1",
            parent=base,
            fontName=FONT_BOLD,
            fontSize=15,
            leading=19,
            textColor=PRIMARY_DARK,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "h2": ParagraphStyle("h2", parent=base, fontName=FONT_BOLD, fontSize=11, leading=14),
        "small": ParagraphStyle("small", parent=base, fontSize=8, leading=11, textColor=MUTED),
        "cell": ParagraphStyle("cell", parent=base, fontSize=8.5, leading=11),
        "cell_b": ParagraphStyle(
            "cell_b", parent=base, fontName=FONT_BOLD, fontSize=8.5, leading=11
        ),
        "hint": ParagraphStyle(
            "hint", parent=base, fontSize=8.5, leading=12, textColor=colors.HexColor("#78350F")
        ),
        "big": ParagraphStyle(
            "big",
            parent=base,
            fontName=FONT_BOLD,
            fontSize=34,
            leading=38,
            alignment=1,
        ),
        "center_small": ParagraphStyle(
            "center_small", parent=base, fontSize=8, alignment=1, textColor=MUTED
        ),
    }


def _band(score: float | None) -> tuple[colors.Color, str]:
    if score is None:
        return MUTED, "Not scored"
    if score >= GOOD_MIN:
        return GOOD, "Good"
    if score >= FAIR_MIN:
        return FAIR, "Fair"
    return POOR, "Low"


def _hex(colour: colors.Color) -> str:
    return "#" + colour.hexval()[2:]


def _fmt(score: float | None) -> str:
    return "–" if score is None else f"{score:.0f}"


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text), style)


class ScoreBar(Flowable):
    """Horizontal 0-100 bar, coloured by score band."""

    def __init__(self, score: float | None, width: float, height: float = 6) -> None:
        super().__init__()
        self.score, self.width, self.height = score, width, height

    def wrap(self, *_: float) -> tuple[float, float]:
        return self.width, self.height

    def draw(self) -> None:
        d = Drawing(self.width, self.height)
        d.add(Rect(0, 0, self.width, self.height, fillColor=RULE, strokeColor=None))
        if self.score:
            fill = _band(self.score)[0]
            width = self.width * min(max(self.score, 0), 100) / 100
            d.add(Rect(0, 0, width, self.height, fillColor=fill, strokeColor=None))
        d.drawOn(self.canv, 0, 0)


# --------------------------------------------------------------------------- #
# Sections
# --------------------------------------------------------------------------- #


def _summary_section(data: ReportData, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    mode = "walking" if data.distance_mode.startswith("walk") else "driving"
    out: list[Flowable] = [
        _p("Address Intelligence Report", st["title"]),
        Spacer(1, 3),
        _p(data.address, st["address"]),
        Spacer(1, 2),
        _p(
            f"Generated {data.generated_at:%d %b %Y} · {data.radius_km:g} km radius · "
            f"{mode} distances · coverage {data.coverage}",
            st["meta"],
        ),
        Spacer(1, 10),
    ]

    colour, label = _band(data.overall)
    overall_cell = [
        Paragraph(
            f'<font color="{_hex(colour)}">{_fmt(data.overall)}</font>',
            st["big"],
        ),
        _p(f"Overall score · {label}", st["center_small"]),
    ]
    cat_cells = []
    for cat in data.categories:
        c, band = _band(cat.score)
        cat_cells.append(
            [
                Paragraph(f'<font color="{_hex(c)}">{_fmt(cat.score)}</font>', st["h1"]),
                _p(cat.label, st["cell_b"]),
                _p(band, st["small"]),
            ]
        )
    per_row = 3
    grid_rows = [cat_cells[i : i + per_row] for i in range(0, len(cat_cells), per_row)]
    for row in grid_rows:
        row.extend([""] * (per_row - len(row)))
    grid_w = CONTENT_W - 50 * mm
    rows = [[overall_cell, *grid_rows[0]]] if grid_rows else [[overall_cell]]
    rows += [["", *r] for r in grid_rows[1:]]
    summary = Table(rows, colWidths=[50 * mm, *([grid_w / per_row] * per_row)])
    summary.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, RULE),
                ("SPAN", (0, 0), (0, -1)),
                ("BACKGROUND", (0, 0), (0, -1), PRIMARY_TINT),
                ("LINEAFTER", (0, 0), (-2, -1), 0.4, RULE),
                ("LINEBELOW", (1, 0), (-1, -2), 0.4, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    out += [summary, Spacer(1, 12)]

    if data.overall is None:
        out.append(
            _p(
                "No categories were scored for this address, so there is no overall score.",
                st["base"],
            )
        )
        out.append(Spacer(1, 8))

    def _bullets(title: str, items: list[FacilityBreakup]) -> list[Flowable]:
        flow: list[Flowable] = [_p(title, st["h2"]), Spacer(1, 3)]
        if not items:
            flow.append(_p("None", st["small"]))
        for f in items:
            flow.append(_p(f"{f.label} — {_fmt(f.score)} / 100", st["cell"]))
        return flow

    two_col = Table(
        [[_bullets("Top strengths", data.strengths), _bullets("Biggest gaps", data.gaps)]],
        colWidths=[CONTENT_W / 2] * 2,
    )
    two_col.setStyle(
        TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)])
    )
    out.append(two_col)

    if data.warnings:
        out += [Spacer(1, 10), _p("Data notes", st["h2"]), Spacer(1, 3)]
        out += [_p(f"• {w}", st["small"]) for w in data.warnings]
    return out


def _breakup_table(f: FacilityBreakup, st: dict[str, ParagraphStyle]) -> Table:
    rows: list[list[Paragraph]] = [
        [_p(h, st["cell_b"]) for h in ("Factor", "Sub-score", "Weight", "Adds to score")]
    ]
    if f.proximity_score is not None and f.density_score is not None:
        prox_w = f.proximity_weight or 0.0
        dens_w = f.density_weight or 0.0
        rows.append(
            [
                _p("Proximity (nearest facility)", st["cell"]),
                _p(f"{f.proximity_score:.1f}", st["cell"]),
                _p(f"{prox_w:.0%}", st["cell"]),
                _p(f"{f.proximity_contribution or 0:.1f}", st["cell"]),
            ]
        )
        rows.append(
            [
                _p("Density (how many nearby)", st["cell"]),
                _p(f"{f.density_score:.1f}", st["cell"]),
                _p(f"{dens_w:.0%}", st["cell"]),
                _p(f"{f.density_contribution or 0:.1f}", st["cell"]),
            ]
        )
    rows.append(
        [
            _p("Facility score", st["cell_b"]),
            _p("", st["cell"]),
            _p("", st["cell"]),
            _p(_fmt(f.score), st["cell_b"]),
        ]
    )
    table = Table(
        rows, colWidths=[CONTENT_W * 0.46, CONTENT_W * 0.18, CONTENT_W * 0.16, CONTENT_W * 0.20]
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_TINT),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, PRIMARY),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def _facility_block(f: FacilityBreakup, st: dict[str, ParagraphStyle]) -> Flowable:
    colour, band = _band(f.score)
    hexcol = _hex(colour)
    header = Table(
        [
            [
                _p(f.label, st["h2"]),
                Paragraph(
                    f'<font color="{hexcol}"><b>{_fmt(f.score)}</b> / 100 · {band}</font>',
                    st["cell"],
                ),
            ]
        ],
        colWidths=[CONTENT_W * 0.6, CONTENT_W * 0.4],
    )
    header.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    parts: list[Flowable] = [header, Spacer(1, 2), ScoreBar(f.score, CONTENT_W), Spacer(1, 4)]

    if f.status != "scored":
        parts.append(
            _p("Not scored — this facility type was not checked for this address.", st["small"])
        )
    else:
        nearest = (
            "none found"
            if f.nearest_km is None
            else f"{f.nearest_km:.2f} km" + (f" by {f.leg}" if f.leg else "")
        )
        meta = f"Nearest: {nearest} · {f.count} found · {f.weight_in_category_pct:.0f}% of category"
        if f.decay_km is not None:
            meta += f" · decay {f.decay_km:g} km"
        parts += [_p(meta, st["small"]), Spacer(1, 3), _p(f.explanation, st["cell"]), Spacer(1, 4)]
        parts.append(_breakup_table(f, st))
        if f.hint:
            hint = Table([[_p(f.hint, st["hint"])]], colWidths=[CONTENT_W])
            hint.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), HINT_BG),
                        ("BOX", (0, 0), (-1, -1), 0.6, HINT_BORDER),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            parts += [Spacer(1, 4), hint]
    parts.append(Spacer(1, 12))
    return KeepTogether(parts)


def _category_section(cat: CategoryBreakup, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    colour, band = _band(cat.score)
    hexcol = _hex(colour)
    out: list[Flowable] = [
        Paragraph(
            f"{escape(cat.label)} "
            f'<font size="10" color="{hexcol}">· {_fmt(cat.score)} / 100 ({band})</font>',
            st["h1"],
        ),
    ]
    if cat.status == "scored":
        out.append(
            _p(f"Contributes {cat.weight_in_overall_pct:.0f}% of the overall score.", st["small"])
        )
    else:
        out.append(_p("Not scored — none of this category's facilities were checked.", st["small"]))
    out += [Spacer(1, 6)]
    out += [_facility_block(f, st) for f in cat.facilities if f.status == "scored"]
    unchecked = [f.label for f in cat.facilities if f.status != "scored"]
    if unchecked and cat.status == "scored":
        out.append(_p("Not checked for this address: " + ", ".join(unchecked) + ".", st["small"]))
        out.append(Spacer(1, 10))
    return out


# --------------------------------------------------------------------------- #
# Document
# --------------------------------------------------------------------------- #

SectionBuilder = Callable[[ReportData, dict[str, ParagraphStyle]], list[Flowable]]


def _page_chrome(data: ReportData):
    def draw(canvas, doc) -> None:
        canvas.saveState()
        canvas.setFillColor(PRIMARY)
        canvas.rect(0, PAGE_H - 6 * mm, PAGE_W, 6 * mm, stroke=0, fill=1)
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        footer = f"Location Intelligence · {data.address[:70]}"
        canvas.drawString(MARGIN, 10 * mm, footer)
        canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    return draw


def render_report_pdf(
    data: ReportData, extra_sections: list[SectionBuilder] | None = None
) -> bytes:
    _register_fonts()
    st = _styles()
    buf = BytesIO()
    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=18 * mm,
        title=f"Address Intelligence Report — {data.address}",
        author="Location Intelligence",
        subject="Address intelligence report",
    )
    frame = Frame(
        MARGIN,
        18 * mm,
        CONTENT_W,
        PAGE_H - MARGIN - 18 * mm,
        id="body",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_page_chrome(data))])

    story: list[Flowable] = _summary_section(data, st)
    story.append(PageBreak())
    for i, cat in enumerate(data.categories):
        if i:
            story.append(CondPageBreak(70 * mm))
        story += _category_section(cat, st)
    if extra_sections is None:
        from app.services.report_sections import DEFAULT_SECTIONS  # avoids an import cycle

        extra_sections = DEFAULT_SECTIONS
    for builder in extra_sections:
        story.append(PageBreak())
        story += builder(data, st)

    doc.build(story)
    return buf.getvalue()
