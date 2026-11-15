# Slayer: recorridos de compra

- Las tarjetas de Argentina 2026 y el destacado Reign in Blood en vista doble abren una combinacion preseleccionada.
- Recorrido corto: prenda, color/talle, resumen y agregar. Cambiar dorso o estampa vuelve al configurador completo.
- Las fichas abiertas desde la grilla siguen con los cuatro pasos habituales.
- Se conserva el mismo carrito, los precios y los codigos de frente/dorso.

## Medicion

Se reutiliza `trackCatalogEvent` y el `gtag` existente. Filtrar `page_path` por `/slayer/`.

Eventos:
- `design_open`: apertura de ficha, con `entry_source` y `purchase_route`.
- `purchase_step_view`: paso visible (`garment`, `color_size`, `print_back`, `review`). No repite el mismo paso por validaciones fallidas.
- `purchase_step_blocked`: falta una eleccion; informa el campo, no su valor.
- `combination_customize`: el visitante decide cambiar la estampa de una doble.
- `add_to_cart`, `cart_open`, `whatsapp_click`: eventos existentes, ahora con contexto del recorrido en Slayer.
- `purchase_modal_close`: paso al cerrar y si se agrego al carrito durante esa apertura.

`purchase_route`: `combination` o `custom`.
`entry_source`: `argentina_2026`, `launch_double`, `launch_front`, `ediciones_3d` o `catalog`.
El contexto de carrito/WhatsApp describe la ultima ficha, no atribuye todas las prendas de un pedido mixto a esa ruta.

Comparar usuarios por paso en una exploracion de embudo de GA4, separando ambas rutas. Para segmentar por estos parametros puede ser necesario registrarlos como dimensiones personalizadas en GA4.
Cerrar una ficha no demuestra abandono; puede volver. Los cierres de pestana no se registran como cierre de modal.
Un clic a WhatsApp no prueba mensaje enviado ni pago. No se emite un evento `purchase`.
No se agregan nombres, telefono, direccion ni texto del pedido a los eventos.

Las pruebas locales comprueban la emision de eventos. La recepcion en la propiedad de GA4 y los informes requieren comprobacion posterior a publicar; no se verificaron desde la cuenta de Analytics.
