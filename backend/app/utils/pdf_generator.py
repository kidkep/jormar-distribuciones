import io
import os
from fpdf import FPDF

LOGO_PATH = os.path.join(os.path.dirname(__file__), "logo.png")

GOLD = (196, 152, 40)
GOLD_DARK = (150, 112, 25)
DARK = (40, 40, 40)
LIGHT = (248, 249, 250)
MID_GRAY = (230, 230, 230)


class JormarPDF(FPDF):
    def header(self):
        # Barra superior dorada
        self.set_fill_color(*GOLD)
        self.rect(0, 0, 210, 3, "F")
        self.rect(0, 207, 210, 3, "F")

        # Logo centrado
        if os.path.exists(LOGO_PATH):
            self.image(LOGO_PATH, x=80, w=50)
            self.ln(30)

        y0 = self.get_y()

        # Nombre de la empresa
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(*GOLD_DARK)
        self.cell(0, 9, "JORMAR DISTRIBUCIONES", new_x="LMARGIN", new_y="NEXT", align="C")

        # Datos legales
        self.set_font("Helvetica", "", 9)
        self.set_text_color(90, 90, 90)
        self.cell(0, 5, "NIT 931814237 - Mariquita, Tolima  |  Comercializacion de EPP", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 6, "", new_x="LMARGIN", new_y="NEXT")

        # Línea doble decorativa
        self.set_draw_color(*GOLD)
        self.set_line_width(1.1)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_draw_color(*GOLD)
        self.set_line_width(0.3)
        self.line(12, self.get_y() + 1.4, 198, self.get_y() + 1.4)
        self.set_y(self.get_y() + 6)

    def footer(self):
        if self.page_no() == 0:
            return
        self.set_y(-16)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 5, "JORMAR DISTRIBUCIONES - Gracias por su preferencia", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 5, f"Pagina {self.page_no()}", align="C")

    def add_document_info(self, rows):
        """Dibuja una caja con los datos del documento (numero, fecha, cliente...)."""
        self.set_fill_color(*LIGHT)
        self.set_draw_color(*MID_GRAY)
        self.set_line_width(0.4)
        self.set_text_color(*DARK)
        self.set_font("Helvetica", "", 9.5)

        # Encabezado de filas de info
        # Se dibujan en dos columnas: etiqueta (izq) y valor
        start_y = self.get_y() + 1
        line_h = 6.2
        x_label = 12
        x_value = 52
        w_label = 38

        def draw_row(i, label, value, bold=False):
            y = start_y + i * line_h
            self.set_xy(x_label, y)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(120, 120, 120)
            self.cell(w_label, line_h, label, align="L")
            self.set_xy(x_value, y)
            self.set_font("Helvetica", "B" if bold else "", 9)
            self.set_text_color(*DARK)
            self.cell(0, line_h, value, align="L")

        for i, (label, value) in enumerate(rows):
            draw_row(i, label, value)

        box_h = len(rows) * line_h + 4
        self.set_y(start_y + len(rows) * line_h + 2)

    def add_impactes(self, subtotal, discount, total):
        self.ln(4)
        x0 = 110
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*DARK)
        self.set_x(x0)
        self.cell(85, 6, "Subtotal:", new_x="RIGHT", align="L")
        self.cell(0, 6, f"$ {subtotal:,.0f}", new_x="LMARGIN", new_y="NEXT", align="R")
        if discount > 0:
            self.set_x(x0)
            self.cell(85, 6, "Descuento:", new_x="RIGHT", align="L")
            self.cell(0, 6, f"- $ {discount:,.0f}", new_x="LMARGIN", new_y="NEXT", align="R")

        # Caja destacada para el total
        self.set_x(x0 - 3)
        self.set_fill_color(*GOLD)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 11.5)
        y = self.get_y() + 1
        self.set_xy(x0 - 3, y)
        self.rect(x0 - 3, y, 101, 10, "F")
        self.set_xy(x0, y + 1)
        self.cell(82, 8, "TOTAL", align="L")
        self.cell(0, 8, f"$ {total:,.0f}", align="R")
        self.set_text_color(*DARK)
        self.set_y(y + 13)

    def add_item_table(self, headers, col_widths, items, get_row):
        header_x = 10
        self.set_x(header_x)
        self.set_fill_color(*GOLD_DARK)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
        self.ln()

        self.set_text_color(*DARK)
        self.set_font("Helvetica", "", 9)
        self.set_draw_color(*MID_GRAY)
        for idx, item in enumerate(items):
            row = get_row(item)
            # Filas alternadas
            if idx % 2 == 0:
                self.set_fill_color(*LIGHT)
                fill = True
            else:
                self.set_fill_color(255, 255, 255)
                fill = True
            self.set_x(header_x)
            self.set_text_color(*DARK)
            for i, val in enumerate(row):
                align = "R" if i >= 2 else ("C" if i == 0 else "")
                self.cell(col_widths[i], 7, val, border=1, fill=fill, align=align)
            self.ln()

    def add_footer_text(self, text):
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(90, 90, 90)
        self.cell(0, 6, text, new_x="LMARGIN", new_y="NEXT", align="C")


def _document_info_rows(pairs):
    return [(k, v) for k, v in pairs if v]


def generate_invoice_pdf_bytes(sale) -> bytes:
    pdf = JormarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    sale_date = sale.sale_date.strftime("%d/%m/%Y %H:%M") if sale.sale_date else ""
    client_name = sale.client_name or (sale.client.name if sale.client else "Consumidor Final")
    client_doc = sale.client.document_number if sale.client else ""
    payment_labels = {
        "efectivo": "Efectivo", "nequi": "Nequi", "bancolombia": "Bancolombia",
        "bogota": "Banco de Bogota", "credito": "Credito",
    }

    # Titulo del documento
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*GOLD_DARK)
    pdf.cell(0, 8, f"REMISION {sale.invoice_number}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_text_color(*DARK)
    pdf.ln(2)

    info = [
        ("Fecha", sale_date),
        ("Cliente", client_name),
        ("Documento", client_doc),
        ("Metodo de pago", payment_labels.get(sale.payment_method, sale.payment_method)),
        ("Direccion", getattr(sale, "delivery_address", "") or None),
        ("Entregado por", getattr(sale, "delivered_by", "") or None),
    ]
    pdf.add_document_info(_document_info_rows(info))
    pdf.ln(5)

    col_widths = [16, 80, 24, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]

    def get_row(item):
        product = item.product
        product_name = product.name if product else f"Producto #{item.product_id}"
        sku = product.sku if product else ""
        label = f"{sku} - {product_name}" if sku else product_name
        item_sub = float(item.unit_price) * item.quantity
        return [
            str(item.quantity),
            label[:40],
            f"${item.unit_price:,.0f}",
            f"${item_sub:,.0f}",
            f"${float(item.total_price):,.0f}",
        ]

    pdf.add_item_table(headers, col_widths, sale.items, get_row)
    pdf.add_impactes(float(sale.subtotal), float(sale.discount), float(sale.total))
    pdf.add_footer_text("Gracias por su compra!")

    return pdf.output()


def generate_quote_pdf_bytes(quote) -> bytes:
    pdf = JormarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    quote_date = quote.quote_date.strftime("%d/%m/%Y") if quote.quote_date else ""
    client_name = quote.client_name or (quote.client.name if quote.client else "Sin cliente")
    client_doc = quote.client.document_number if quote.client else ""
    status_labels = {"borrador": "Borrador", "enviada": "Enviada", "aceptada": "Aceptada", "rechazada": "Rechazada"}

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*GOLD_DARK)
    pdf.cell(0, 8, f"COTIZACION {quote.quote_number}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_text_color(*DARK)
    pdf.ln(2)

    info = [
        ("Fecha", quote_date),
        ("Validez", quote.valid_until.strftime("%d/%m/%Y") if quote.valid_until else None),
        ("Cliente", client_name),
        ("Documento", client_doc),
        ("Estado", status_labels.get(quote.status, quote.status)),
        ("Notas", quote.notes or None),
    ]
    pdf.add_document_info(_document_info_rows(info))
    pdf.ln(5)

    col_widths = [16, 80, 24, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]

    def get_row(item):
        product = item.product
        product_name = product.name if product else f"Producto #{item.product_id}"
        sku = product.sku if product else ""
        label = f"{sku} - {product_name}" if sku else product_name
        item_sub = float(item.unit_price) * item.quantity
        return [
            str(item.quantity),
            label[:40],
            f"${item.unit_price:,.0f}",
            f"${item_sub:,.0f}",
            f"${float(item.total_price):,.0f}",
        ]

    pdf.add_item_table(headers, col_widths, quote.items, get_row)
    pdf.add_impactes(float(quote.subtotal), float(quote.discount), float(quote.total))
    pdf.add_footer_text("Gracias por su preferencia!")

    return pdf.output()


def generate_purchase_order_pdf_bytes(order) -> bytes:
    pdf = JormarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    order_date = order.order_date.strftime("%d/%m/%Y") if order.order_date else ""
    supplier_name = order.supplier_name or (order.supplier.name if order.supplier else "Sin proveedor")
    status_labels = {"borrador": "Borrador", "enviada": "Enviada", "recibida": "Recibida", "cancelada": "Cancelada"}

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*GOLD_DARK)
    pdf.cell(0, 8, f"SOLICITUD DE PEDIDO {order.order_number}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_text_color(*DARK)
    pdf.ln(2)

    info = [
        ("Fecha", order_date),
        ("Fecha esperada", order.expected_date.strftime("%d/%m/%Y") if order.expected_date else None),
        ("Proveedor", supplier_name),
        ("Estado", status_labels.get(order.status, order.status)),
        ("Notas", order.notes or None),
    ]
    pdf.add_document_info(_document_info_rows(info))
    pdf.ln(5)

    col_widths = [16, 80, 24, 35, 35]
    headers = ["Cant", "Producto", "P. Unit", "Subtotal", "Total"]

    def get_row(item):
        product = item.product
        product_name = product.name if product else f"Producto #{item.product_id}"
        sku = product.sku if product else ""
        label = f"{sku} - {product_name}" if sku else product_name
        item_sub = float(item.unit_price) * item.quantity
        return [
            str(item.quantity),
            label[:40],
            f"${item.unit_price:,.0f}",
            f"${item_sub:,.0f}",
            f"${float(item.total_price):,.0f}",
        ]

    pdf.add_item_table(headers, col_widths, order.items, get_row)
    pdf.add_impactes(float(order.subtotal), float(order.discount), float(order.total))
    pdf.add_footer_text(f"Solicitud: {order.order_number}")

    return pdf.output()
