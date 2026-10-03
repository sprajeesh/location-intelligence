"""Map, facility appendix and methodology sections of the report PDF."""

import logging
import math
from collections import defaultdict

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, LongTable, Paragraph, Spacer, TableStyle

from app.services.report_data import ReportData, ReportFeature
from app.services.report_pdf import (
    CONTENT_W,
    FONT,
    FONT_BOLD,
    INK,
    MUTED,
    PRIMARY,
    PRIMARY_DARK,
    PRIMARY_TINT,
    RULE,
    SectionBuilder,
    _p,
)

logger = logging.getLogger(__name__)

EARTH_KM_PER_DEG = 111.32
MAP_SIZE = CONTENT_W

SOURCES = [
    ("LINZ NZ Addresses", "Address search and geocoding", "CC BY 4.0"),
    (
        "OpenStreetMap contributors",
        "Nearby facilities such as schools and bus stops",
        "ODbL 1.0",
    ),
    ("OSRM routing on OpenStreetMap data", "Walking and driving distances", "ODbL 1.0"),
    ("Wikidata", "Extra detail on some facilities", "CC0 1.0"),
]
ATTRIBUTION = (
    "Contains data sourced from Land Information New Zealand (LINZ) under CC BY 4.0. "
    "© OpenStreetMap contributors. Location Intelligence is an independent service and is "
    "not endorsed by LINZ, OpenStreetMap or Wikidata."
)


def _offset_km(data: ReportData, f: ReportFeature) -> tuple[float, float]:
    """East/north offset (km) of a feature from the address (local equirectangular)."""
    dx = (f.lon - data.lon) * math.cos(math.radians(data.lat)) * EARTH_KM_PER_DEG
    dy = (f.lat - data.lat) * EARTH_KM_PER_DEG
    return dx, dy


def _hex(colour: str) -> colors.Color:
    try:
        return colors.HexColor(colour)
    except (ValueError, TypeError):
        return MUTED


def build_map_drawing(data: ReportData) -> tuple[Drawing, int]:
    """Plan view of facilities around the address. Returns (drawing, plotted_count).

    Self-contained vector plot (no tile/network calls), so it can't fail on a
    third-party outage and needs no map-tile attribution beyond the data licences.
    """
    extent = max(data.radius_km, 0.1)
    size = MAP_SIZE
    d = Drawing(size, size)
    d.add(Rect(0, 0, size, size, fillColor=PRIMARY_TINT, strokeColor=RULE, strokeWidth=0.6))
    cx = cy = size / 2
    scale = (size / 2 - 10) / extent  # points per km

    for frac in (0.5, 1.0):
        d.add(
            Circle(cx, cy, extent * frac * scale, fillColor=None, strokeColor=RULE, strokeWidth=0.6)
        )
        d.add(
            String(
                cx + 3,
                cy + extent * frac * scale + 2,
                f"{extent * frac:g} km",
                fontName=FONT,
                fontSize=6.5,
                fillColor=MUTED,
            )
        )
    d.add(Line(cx, 4, cx, size - 4, strokeColor=RULE, strokeWidth=0.3))
    d.add(Line(4, cy, size - 4, cy, strokeColor=RULE, strokeWidth=0.3))
    d.add(String(cx - 3, size - 11, "N", fontName=FONT_BOLD, fontSize=8, fillColor=MUTED))

    plotted = 0
    for f in data.features:
        dx, dy = _offset_km(data, f)
        if math.hypot(dx, dy) > extent * 1.0001:
            continue
        d.add(
            Circle(
                cx + dx * scale,
                cy + dy * scale,
                2.6,
                fillColor=_hex(f.color),
                strokeColor=colors.white,
                strokeWidth=0.5,
            )
        )
        plotted += 1

    d.add(Circle(cx, cy, 5, fillColor=PRIMARY_DARK, strokeColor=colors.white, strokeWidth=1.2))
    return d, plotted


def _legend(data: ReportData, st: dict[str, ParagraphStyle]) -> Flowable:
    seen: dict[str, tuple[str, str]] = {}
    for f in data.features:
        seen.setdefault(f.category, (f.label, f.color))
    d = Drawing(CONTENT_W, 14 * (math.ceil(len(seen) / 3) + 1))
    d.add(Circle(6, d.height - 8, 4, fillColor=PRIMARY_DARK, strokeColor=None))
    d.add(String(14, d.height - 11, "Address", fontName=FONT, fontSize=8, fillColor=INK))
    for i, (label, colour) in enumerate(seen.values()):
        col, row = i % 3, i // 3 + 1
        x, y = col * CONTENT_W / 3 + 6, d.height - 8 - 14 * row
        d.add(Circle(x, y, 3.5, fillColor=_hex(colour), strokeColor=None))
        d.add(String(x + 8, y - 3, label, fontName=FONT, fontSize=8, fillColor=INK))
    return d


def map_section(data: ReportData, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    out: list[Flowable] = [_p("Facility map", st["h1"])]
    try:
        drawing, plotted = build_map_drawing(data)
    except Exception:  # noqa: BLE001 - a plot failure must never fail the whole report
        logger.exception("Report map rendering failed; falling back to the facility table")
        return out + [
            _p(
                "The map could not be drawn for this report. "
                "All facilities are listed in the appendix.",
                st["base"],
            )
        ]

    if not data.features:
        return out + [_p("No facilities were found within range of this address.", st["base"])]

    out += [
        _p(
            f"Plan view centred on the address, showing {plotted} of {len(data.features)} "
            f"facilities within {data.radius_km:g} km. Facilities beyond the radius are listed "
            "in the appendix only.",
            st["small"],
        ),
        Spacer(1, 6),
        drawing,
        Spacer(1, 6),
        _legend(data, st),
    ]
    return out


def appendix_section(data: ReportData, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    out: list[Flowable] = [_p("Facility appendix", st["h1"])]
    if not data.features:
        return out + [_p("No facilities to list.", st["base"])]

    grouped: dict[str, list[ReportFeature]] = defaultdict(list)
    for f in data.features:
        grouped[f.category].append(f)

    for features in grouped.values():
        rows: list[list[Paragraph]] = [
            [
                _p(f"{features[0].label} ({len(features)})", st["cell_b"]),
                _p("Distance", st["cell_b"]),
            ]
        ]
        for f in features:
            dist = "–" if f.distance_km is None else f"{f.distance_km:.2f} km"
            rows.append([_p(f.name, st["cell"]), _p(dist, st["cell"])])
        table = LongTable(rows, colWidths=[CONTENT_W * 0.82, CONTENT_W * 0.18], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_TINT),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        out += [table, Spacer(1, 10)]
    return out


def methodology_section(data: ReportData, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    steps = [
        (
            "Facility score (0–100)",
            "Each facility type blends two sub-scores. Proximity decays smoothly with the "
            "distance to the nearest facility (score = 100 × e^(−distance ÷ decay)). Density "
            "adds up a decayed weight for every facility in range and saturates, so a few "
            "nearby options score well without needing dozens. The two are mixed using the "
            "weights shown on each facility.",
        ),
        (
            "Walking vs driving",
            "Most facility types use one travel mode. Railway stations are scored both ways "
            "and the better proximity result is used.",
        ),
        (
            "Category and overall score",
            "A category is the weighted average of its scored facility types; the overall "
            "score is the weighted average of scored categories. Anything not checked is left "
            "out and the remaining weights are rescaled, so it never counts as zero.",
        ),
        (
            "Improvement hints",
            f"Any facility scoring below {data.low_score_threshold:g} gets a hint. It is "
            "worked out by re-running the same formula with one hypothetical change (a "
            "facility at a typical range) and reporting the points it would add.",
        ),
    ]
    out: list[Flowable] = [_p("Methodology & data sources", st["h1"])]
    for title, body in steps:
        out += [_p(title, st["h2"]), Spacer(1, 2), _p(body, st["base"]), Spacer(1, 8)]

    rows = [[_p(h, st["cell_b"]) for h in ("Source", "Used for", "Licence")]]
    rows += [[_p(a, st["cell"]), _p(b, st["cell"]), _p(c, st["cell"])] for a, b, c in SOURCES]
    table = LongTable(rows, colWidths=[CONTENT_W * 0.38, CONTENT_W * 0.42, CONTENT_W * 0.20])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_TINT),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
                ("LINEABOVE", (0, 0), (-1, 0), 0.8, PRIMARY),
            ]
        )
    )
    out += [_p("Data sources", st["h2"]), Spacer(1, 3), table, Spacer(1, 6)]
    out += [_p(ATTRIBUTION, st["small"]), Spacer(1, 10)]

    if data.warnings:
        out += [_p("Warnings from this analysis", st["h2"]), Spacer(1, 3)]
        out += [_p(f"• {w}", st["small"]) for w in data.warnings]
        out.append(Spacer(1, 8))

    out.append(
        _p(
            f"Generated {data.generated_at:%d %b %Y %H:%M} UTC · Location Intelligence "
            f"v{data.app_version}",
            st["small"],
        )
    )
    return out


DEFAULT_SECTIONS: list[SectionBuilder] = [map_section, appendix_section, methodology_section]
