import os
from decimal import Decimal
from fpdf import FPDF

INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "invoices")


def ensure_invoices_dir():
    os.makedirs(INVOICES_DIR, exist_ok=True)


def generate_invoice_pdf(sale) -> str:
    ensure_invoices_dir()
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "JORMAR DISTRIBUCIONES", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "NIT 901692067 - Mariquita, Tolima", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 6, "Comercializacion de EPP", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)

    # Line separator
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)

    # Invoice info
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"FACTURA: {sale.invoice_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    sale_date = sale.sale_date.strftime("%d/%m/%Y %H:%M") if sale.sale_date else ""
    pdf.cell(0, 6, f"Fecha: {sale_date}", new_x="LMARGIN", new_y="NEXT")

    client_name = sale.client.name if sale.client else "Consumidor Final"
    client_doc = sale.client.document_number if sale.client else ""
    pdf.cell(0, 6, f"Cliente: {client_name}", new_x="LMARGIN", new_y="NEXT")
    if client_doc:
        pdf.cell(0, 6, f"Documento: {client_doc}", new_x="LMARGIN", new_y="NEXT")

    payment_labels = {
        "efectivo": "Efectivo",
        "nequi": "Nequi",
        "bancolombia": "Bancolombia",
        "bogota": "Banco de Bogota",
        "credito": "Credito",
    }
    pdf.cell(0, 6, f"Metodo de pago: {payment_labels.get(sale.payment_method, sale.payment_method)}", new_x="LMARGIN", new_y="NEXT")

    if getattr(sale, "delivery_address", None):
        pdf.cell(0, 6, f"Direccion de entrega: {sale.delivery_address}", new_x="LMARGIN", new_y="NEXT")
    if getattr(sale, "delivered_by", None):
        pdf.cell(0, 6, f"Entregado por: {sale.delivered_by}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    # Table header
    pdf.set_fill_color(50, 50, 50)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    col_widths = [18, 62, 25, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
    pdf.ln()

    # Table rows
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 9)
    for item in sale.items:
        product_name = item.product.name if item.product else f"Producto #{item.product_id}"
        pdf.cell(col_widths[0], 7, str(item.quantity), border=1, align="C")
        pdf.cell(col_widths[1], 7, product_name[:35], border=1)
        pdf.cell(col_widths[2], 7, f"${item.unit_price:,.0f}", border=1, align="R")
        item_sub = float(item.unit_price) * item.quantity
        pdf.cell(col_widths[3], 7, f"${item_sub:,.0f}", border=1, align="R")
        pdf.cell(col_widths[4], 7, f"${float(item.total_price):,.0f}", border=1, align="R")
        pdf.ln()

    pdf.ln(5)

    # Totals
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(130, 7, "Subtotal:", align="R")
    pdf.cell(50, 7, f"${float(sale.subtotal):,.0f}", align="R")
    pdf.ln()

    if float(sale.discount) > 0:
        pdf.cell(130, 7, "Descuento:", align="R")
        pdf.cell(50, 7, f"-${float(sale.discount):,.0f}", align="R")
        pdf.ln()

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(130, 8, "TOTAL:", align="R")
    pdf.cell(50, 8, f"${float(sale.total):,.0f}", align="R")
    pdf.ln(10)

    # Footer
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, "Gracias por su compra!", new_x="LMARGIN", new_y="NEXT", align="C")

    filename = f"{sale.invoice_number}.pdf"
    filepath = os.path.join(INVOICES_DIR, filename)
    pdf.output(filepath)
    return filepath
