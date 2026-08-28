import io
import os
from fpdf import FPDF

LOGO_PATH = os.path.join(os.path.dirname(__file__), "logo.png")


class JormarPDF(FPDF):
    def header(self):
        if os.path.exists(LOGO_PATH):
            self.image(LOGO_PATH, x=80, w=50)
            self.ln(32)
        self.set_font("Helvetica", "B", 18)
        self.cell(0, 10, "JORMAR DISTRIBUCIONES", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, "NIT 931814237 - Mariquita, Tolima", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 6, "Comercializacion de EPP", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(5)
        self.set_draw_color(0, 0, 0)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def add_item_table(self, headers, col_widths, items, get_row):
        self.set_fill_color(50, 50, 50)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
        self.ln()
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "", 9)
        for item in items:
            row = get_row(item)
            for i, val in enumerate(row):
                align = "R" if i >= 2 else ("C" if i == 0 else "")
                self.cell(col_widths[i], 7, val, border=1, align=align)
            self.ln()

    def add_totals(self, subtotal, discount, total):
        self.ln(5)
        self.set_font("Helvetica", "B", 10)
        self.cell(130, 7, "Subtotal:", align="R")
        self.cell(50, 7, f"${subtotal:,.0f}", align="R")
        self.ln()
        if discount > 0:
            self.cell(130, 7, "Descuento:", align="R")
            self.cell(50, 7, f"-${discount:,.0f}", align="R")
            self.ln()
        self.set_font("Helvetica", "B", 12)
        self.cell(130, 8, "TOTAL:", align="R")
        self.cell(50, 8, f"${total:,.0f}", align="R")
        self.ln(10)

    def add_footer_text(self, text):
        self.set_font("Helvetica", "I", 9)
        self.cell(0, 6, text, new_x="LMARGIN", new_y="NEXT", align="C")


def generate_invoice_pdf_bytes(sale) -> bytes:
    pdf = JormarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"REMISION: {sale.invoice_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    sale_date = sale.sale_date.strftime("%d/%m/%Y %H:%M") if sale.sale_date else ""
    pdf.cell(0, 6, f"Fecha: {sale_date}", new_x="LMARGIN", new_y="NEXT")

    client_name = sale.client_name or (sale.client.name if sale.client else "Consumidor Final")
    client_doc = sale.client.document_number if sale.client else ""
    pdf.cell(0, 6, f"Cliente: {client_name}", new_x="LMARGIN", new_y="NEXT")
    if client_doc:
        pdf.cell(0, 6, f"Documento: {client_doc}", new_x="LMARGIN", new_y="NEXT")

    payment_labels = {
        "efectivo": "Efectivo", "nequi": "Nequi", "bancolombia": "Bancolombia",
        "bogota": "Banco de Bogota", "credito": "Credito",
    }
    pdf.cell(0, 6, f"Metodo de pago: {payment_labels.get(sale.payment_method, sale.payment_method)}", new_x="LMARGIN", new_y="NEXT")

    if getattr(sale, "delivery_address", None):
        pdf.cell(0, 6, f"Direccion de entrega: {sale.delivery_address}", new_x="LMARGIN", new_y="NEXT")
    if getattr(sale, "delivered_by", None):
        pdf.cell(0, 6, f"Entregado por: {sale.delivered_by}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    col_widths = [18, 62, 25, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]

    def get_row(item):
        product_name = item.product.name if item.product else f"Producto #{item.product_id}"
        item_sub = float(item.unit_price) * item.quantity
        return [
            str(item.quantity),
            product_name[:35],
            f"${item.unit_price:,.0f}",
            f"${item_sub:,.0f}",
            f"${float(item.total_price):,.0f}",
        ]

    pdf.add_item_table(headers, col_widths, sale.items, get_row)
    pdf.add_totals(float(sale.subtotal), float(sale.discount), float(sale.total))
    pdf.add_footer_text("Gracias por su compra!")

    return pdf.output()


def generate_quote_pdf_bytes(quote) -> bytes:
    pdf = JormarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"COTIZACION: {quote.quote_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    quote_date = quote.quote_date.strftime("%d/%m/%Y") if quote.quote_date else ""
    pdf.cell(0, 6, f"Fecha: {quote_date}", new_x="LMARGIN", new_y="NEXT")

    if quote.valid_until:
        valid_date = quote.valid_until.strftime("%d/%m/%Y")
        pdf.cell(0, 6, f"Validez hasta: {valid_date}", new_x="LMARGIN", new_y="NEXT")

    client_name = quote.client_name or (quote.client.name if quote.client else "Sin cliente")
    client_doc = quote.client.document_number if quote.client else ""
    pdf.cell(0, 6, f"Cliente: {client_name}", new_x="LMARGIN", new_y="NEXT")
    if client_doc:
        pdf.cell(0, 6, f"Documento: {client_doc}", new_x="LMARGIN", new_y="NEXT")

    status_labels = {"borrador": "Borrador", "enviada": "Enviada", "aceptada": "Aceptada", "rechazada": "Rechazada"}
    pdf.cell(0, 6, f"Estado: {status_labels.get(quote.status, quote.status)}", new_x="LMARGIN", new_y="NEXT")

    if quote.notes:
        pdf.cell(0, 6, f"Notas: {quote.notes}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    col_widths = [18, 62, 25, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]

    def get_row(item):
        product_name = item.product.name if item.product else f"Producto #{item.product_id}"
        item_sub = float(item.unit_price) * item.quantity
        return [
            str(item.quantity),
            product_name[:35],
            f"${item.unit_price:,.0f}",
            f"${item_sub:,.0f}",
            f"${float(item.total_price):,.0f}",
        ]

    pdf.add_item_table(headers, col_widths, quote.items, get_row)
    pdf.add_totals(float(quote.subtotal), float(quote.discount), float(quote.total))
    pdf.add_footer_text("Gracias por su preferencia!")

    return pdf.output()
