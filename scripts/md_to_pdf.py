#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
将 Markdown 调研报告转换为带样式的 PDF。
使用 reportlab + Noto Sans SC 中文字体。
"""
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


# 注册中文字体
FONT_PATH = Path(r"C:\Windows\Fonts\NotoSansSC-Regular.otf")
FONT_BOLD_PATH = Path(r"C:\Windows\Fonts\NotoSansSC-Bold.otf")

if not FONT_PATH.exists():
    # 尝试 NotoSansSC-VF
    FONT_PATH = Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf")
    FONT_BOLD_PATH = FONT_PATH

pdfmetrics.registerFont(TTFont("NotoSansSC", str(FONT_PATH)))
pdfmetrics.registerFont(TTFont("NotoSansSC-Bold", str(FONT_BOLD_PATH)))

# 注册字体家族
from reportlab.pdfbase.pdfmetrics import registerFontFamily

registerFontFamily(
    "NotoSansSC",
    normal="NotoSansSC",
    bold="NotoSansSC-Bold",
    italic="NotoSansSC",
    boldItalic="NotoSansSC-Bold",
)


# ===== 样式定义 =====
styles = getSampleStyleSheet()


def make_style(name, **kwargs):
    if name in styles.byName:
        return styles[name]
    return ParagraphStyle(name=name, **kwargs)


title_style = ParagraphStyle(
    "CustomTitle",
    parent=styles["Title"],
    fontName="NotoSansSC-Bold",
    fontSize=24,
    leading=32,
    textColor=colors.HexColor("#1a1a1a"),
    spaceAfter=20,
    alignment=1,  # center
)

h1_style = ParagraphStyle(
    "CustomH1",
    parent=styles["Heading1"],
    fontName="NotoSansSC-Bold",
    fontSize=20,
    leading=28,
    textColor=colors.HexColor("#1f4e79"),
    spaceBefore=18,
    spaceAfter=10,
    borderPadding=(4, 0, 4, 0),
)

h2_style = ParagraphStyle(
    "CustomH2",
    parent=styles["Heading2"],
    fontName="NotoSansSC-Bold",
    fontSize=16,
    leading=22,
    textColor=colors.HexColor("#2e74b5"),
    spaceBefore=14,
    spaceAfter=8,
)

h3_style = ParagraphStyle(
    "CustomH3",
    parent=styles["Heading3"],
    fontName="NotoSansSC-Bold",
    fontSize=13,
    leading=18,
    textColor=colors.HexColor("#3a8fbe"),
    spaceBefore=10,
    spaceAfter=6,
)

h4_style = ParagraphStyle(
    "CustomH4",
    parent=styles["Heading4"],
    fontName="NotoSansSC-Bold",
    fontSize=11,
    leading=16,
    textColor=colors.HexColor("#555555"),
    spaceBefore=8,
    spaceAfter=4,
)

body_style = ParagraphStyle(
    "CustomBody",
    parent=styles["BodyText"],
    fontName="NotoSansSC",
    fontSize=10,
    leading=16,
    textColor=colors.HexColor("#222222"),
    spaceAfter=6,
    firstLineIndent=0,
)

blockquote_style = ParagraphStyle(
    "CustomBlockquote",
    parent=body_style,
    leftIndent=18,
    rightIndent=18,
    fontSize=9.5,
    textColor=colors.HexColor("#555555"),
    spaceBefore=4,
    spaceAfter=8,
    borderColor=colors.HexColor("#cccccc"),
    borderWidth=0,
    borderPadding=(0, 8, 0, 8),
)

code_style = ParagraphStyle(
    "CustomCode",
    parent=body_style,
    fontName="NotoSansSC",
    fontSize=9,
    backColor=colors.HexColor("#f4f4f4"),
    borderColor=colors.HexColor("#dddddd"),
    borderWidth=0.5,
    borderPadding=(4, 6, 4, 6),
    leftIndent=0,
    rightIndent=0,
)


# ===== Markdown 解析 =====
def md_inline_to_html(text):
    """将 Markdown 行内语法转换为 HTML"""
    # 转义 HTML
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # 加粗 **text**
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # 斜体 *text*（避免与加粗冲突）
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    # 行内代码 `text`
    text = re.sub(r"`(.+?)`", r'<font face="Courier" size="9">\1</font>', text)
    # 链接 [text](url) - PDF 中链接不易处理，简化为文本
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<font color="#2e74b5"><u>\1</u></font>', text)
    return text


def parse_table(lines, idx):
    """解析 Markdown 表格，返回 (table_data, end_idx)"""
    table_lines = []
    while idx < len(lines) and lines[idx].strip().startswith("|"):
        table_lines.append(lines[idx].strip())
        idx += 1

    if len(table_lines) < 2:
        return None, idx

    # 解析表头
    def split_row(row):
        cells = [c.strip() for c in row.strip("|").split("|")]
        return cells

    headers = split_row(table_lines[0])
    # 跳过分隔行
    data_rows = [split_row(line) for line in table_lines[2:]]

    return (headers, data_rows), idx


def render_table(headers, rows):
    """将表格数据渲染为 reportlab Table"""
    # 准备数据
    header_data = [Paragraph(md_inline_to_html(h), h4_style) for h in headers]
    body_data = []
    for row in rows:
        body_data.append([Paragraph(md_inline_to_html(cell), body_style) for cell in row])

    data = [header_data] + body_data

    # 列宽：平均分配，但根据内容自适应
    n_cols = len(headers)
    available_width = 17 * cm
    col_width = available_width / n_cols

    tbl = Table(data, colWidths=[col_width] * n_cols, repeatRows=1)
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2e74b5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (-1, 0), "NotoSansSC-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fafafa")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#fafafa"), colors.white]),
                ("FONTSIZE", (0, 1), (-1, -1), 8.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 1), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
            ]
        )
    )
    return tbl


def render_horizontal_rule():
    """渲染水平分隔线"""
    return Spacer(1, 6)


def parse_markdown_to_flowables(md_text):
    """将 Markdown 文本转换为 reportlab flowables"""
    lines = md_text.split("\n")
    flowables = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # 空行
        if not stripped:
            flowables.append(Spacer(1, 4))
            i += 1
            continue

        # 分隔线
        if re.match(r"^-{3,}$|^\*{3,}$|^_{3,}$", stripped):
            flowables.append(render_horizontal_rule())
            i += 1
            continue

        # 标题
        if stripped.startswith("# "):
            text = stripped[2:].strip()
            flowables.append(Paragraph(md_inline_to_html(text), title_style))
            flowables.append(Spacer(1, 10))
            i += 1
            continue
        if stripped.startswith("## "):
            text = stripped[3:].strip()
            flowables.append(Paragraph(md_inline_to_html(text), h1_style))
            i += 1
            continue
        if stripped.startswith("### "):
            text = stripped[4:].strip()
            flowables.append(Paragraph(md_inline_to_html(text), h2_style))
            i += 1
            continue
        if stripped.startswith("#### "):
            text = stripped[5:].strip()
            flowables.append(Paragraph(md_inline_to_html(text), h3_style))
            i += 1
            continue
        if stripped.startswith("##### "):
            text = stripped[6:].strip()
            flowables.append(Paragraph(md_inline_to_html(text), h4_style))
            i += 1
            continue

        # 表格
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s\-:|]+\|", lines[i + 1].strip()):
            table_data, new_idx = parse_table(lines, i)
            if table_data:
                headers, rows = table_data
                flowables.append(render_table(headers, rows))
                flowables.append(Spacer(1, 6))
                i = new_idx
                continue

        # 代码块
        if stripped.startswith("```"):
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code_text = "<br/>".join(code_lines)
            flowables.append(Paragraph(code_text, code_style))
            flowables.append(Spacer(1, 4))
            continue

        # 引用
        if stripped.startswith(">"):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            quote_text = "<br/>".join(quote_lines)
            flowables.append(Paragraph(md_inline_to_html(quote_text), blockquote_style))
            continue

        # 无序列表
        if re.match(r"^[-*+]\s+", stripped):
            list_items = []
            while i < len(lines) and (re.match(r"^[-*+]\s+", lines[i].strip()) or (list_items and lines[i].strip() and not lines[i].strip().startswith("#"))):
                if re.match(r"^[-*+]\s+", lines[i].strip()):
                    item_text = re.sub(r"^[-*+]\s+", "", lines[i].strip())
                    list_items.append(item_text)
                elif list_items and lines[i].strip() and not lines[i].strip().startswith("#"):
                    # continuation
                    list_items[-1] += " " + lines[i].strip()
                i += 1
                if i < len(lines) and not lines[i].strip():
                    break
            for item in list_items:
                flowables.append(Paragraph("• " + md_inline_to_html(item), body_style))
            flowables.append(Spacer(1, 4))
            continue

        # 有序列表
        if re.match(r"^\d+\.\s+", stripped):
            list_items = []
            while i < len(lines) and (re.match(r"^\d+\.\s+", lines[i].strip()) or (list_items and lines[i].strip() and not lines[i].strip().startswith("#"))):
                if re.match(r"^\d+\.\s+", lines[i].strip()):
                    item_text = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                    list_items.append(item_text)
                elif list_items and lines[i].strip() and not lines[i].strip().startswith("#"):
                    list_items[-1] += " " + lines[i].strip()
                i += 1
                if i < len(lines) and not lines[i].strip():
                    break
            for idx, item in enumerate(list_items, 1):
                flowables.append(Paragraph(f"{idx}. " + md_inline_to_html(item), body_style))
            flowables.append(Spacer(1, 4))
            continue

        # 普通段落
        para_lines = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not is_special_line(lines[i]):
            para_lines.append(lines[i].strip())
            i += 1
        para_text = " ".join(para_lines)
        flowables.append(Paragraph(md_inline_to_html(para_text), body_style))
        flowables.append(Spacer(1, 2))

    return flowables


def is_special_line(line):
    """判断是否为特殊行（标题、表格、列表等）"""
    stripped = line.strip()
    if not stripped:
        return True
    if stripped.startswith("#"):
        return True
    if stripped.startswith(">"):
        return True
    if stripped.startswith("```"):
        return True
    if re.match(r"^[-*+]\s+", stripped):
        return True
    if re.match(r"^\d+\.\s+", stripped):
        return True
    if stripped.startswith("|"):
        return True
    if re.match(r"^-{3,}$|^\*{3,}$|^_{3,}$", stripped):
        return True
    return False


# ===== 页眉页脚 =====
def header_footer(canvas, doc):
    canvas.saveState()
    # 页眉
    canvas.setFont("NotoSansSC", 8)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(2 * cm, A4[1] - 1.2 * cm, "千人公司无代码平台落地调研报告")
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, "v1.0 · 2026-06")
    canvas.line(2 * cm, A4[1] - 1.5 * cm, A4[0] - 2 * cm, A4[1] - 1.5 * cm)
    # 页脚
    canvas.drawCentredString(
        A4[0] / 2,
        1.2 * cm,
        f"— 第 {doc.page} 页 —",
    )
    canvas.restoreState()


# ===== 主函数 =====
def convert_md_to_pdf(md_path, pdf_path):
    md_text = Path(md_path).read_text(encoding="utf-8")
    flowables = parse_markdown_to_flowables(md_text)

    doc = BaseDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="千人公司无代码平台落地调研报告",
        author="WorkBuddy",
    )

    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
    )

    template = PageTemplate(id="default", frames=frame, onPage=header_footer)
    doc.addPageTemplates([template])

    doc.build(flowables)
    print(f"PDF generated: {pdf_path}")


if __name__ == "__main__":
    md_file = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\admin\.workbuddy\workspace\files\54088\3489c2cc-aff9-4f95-9ba7-71c03ab46c06\千人公司无代码平台落地调研报告.md"
    pdf_file = sys.argv[2] if len(sys.argv) > 2 else md_file.replace(".md", ".pdf")
    convert_md_to_pdf(md_file, pdf_file)