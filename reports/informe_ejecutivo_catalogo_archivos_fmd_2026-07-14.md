# Informe ejecutivo: catálogo y Archivos FMD

Fecha: 14/07/2026  
Alcance: estado local actual del catálogo, páginas públicas adyacentes, modelo comercial, experiencia de compra y próximos pasos.  
Fuente: `data/products.json`, `CatalogDesign`, configuración de Archivos FMD, sitemap, home y lógica compartida de carrito/modal.

## Resumen ejecutivo

Sí: actualmente FMD tiene **tres bandas con página dedicada**:

1. **Megadeth**: `/megadeth/`
2. **Slayer**: `/slayer/`
3. **Nightwish**: `/nightwish/`

Estas páginas no son catálogos separados. Son tres instancias del mismo motor, filtradas por banda y configuradas desde una fuente compartida.

La plataforma contiene hoy:

- **319 registros fuente públicos** en `products.json`.
- **650 diseños únicos visibles** después de normalizar productos, variantes y prendas mediante `CatalogDesign`.
- **62 bandas o líneas** representadas.
- **3 Archivos FMD dedicados**, que reúnen 325 diseños: exactamente el **50% del catálogo normalizado**.
- Home general con directorio de bandas, curadurías, promociones y acceso al catálogo.
- Modal, precios, talles, carrito, entrega y cierre por WhatsApp compartidos entre home y archivos.

La conclusión principal es que FMD ya no funciona como una simple lista de productos. Tiene la base de una plataforma de archivos por banda. El próximo desafío no es sumar más capas a la home, sino mejorar tres cosas: **medición del embudo, cobertura visual de prendas y selección comercial de los próximos archivos**.

## Cómo leer las cifras

Hay que separar dos conceptos:

- **Prenda disponible para comprar**: por política comercial, todos los diseños pueden adaptarse a remera, hoodie o buzo.
- **Mockup disponible**: existe una imagen real de ese diseño aplicada a esa prenda.

Las columnas de remera, hoodie y buzo de este informe cuentan diseños que poseen un mockup específico. No limitan lo que el cliente puede pedir.

Cuando no existe mockup de la prenda elegida, el modal conserva una imagen de referencia estable y aclara que el diseño se adapta a la prenda seleccionada. El precio, la tabla de talles y el mensaje de WhatsApp sí cambian según la elección.

## Presencia digital actual

| Página | Función | Estado SEO |
|---|---|---|
| `/` | Home, directorio de bandas y catálogo general | Title, description, canonical, Open Graph y GA4 |
| `/megadeth/` | Archivo Megadeth | Metadata propia, canonical y Open Graph |
| `/slayer/` | Archivo Slayer | Metadata propia, canonical y Open Graph |
| `/nightwish/` | Archivo Nightwish | Metadata propia, canonical y Open Graph |

El sitemap contiene estas cuatro URLs con fecha de actualización 14/07/2026. No hay otras páginas de banda declaradas como URLs públicas independientes.

Los archivos dedicados aceptan parámetros UTM sin alterar su funcionamiento. El parámetro funcional `prenda` permite abrir una categoría concreta.

## Estado de los tres Archivos FMD

| Archivo | Diseños únicos | Con mock de remera | Con mock de hoodie | Con mock de buzo | Con mocks en las 3 prendas | Organización |
|---|---:|---:|---:|---:|---:|---|
| Megadeth | 267 | 235 (88%) | 29 (11%) | 14 (5%) | 4 (1,5%) | 18 álbumes/etapas + colecciones editoriales |
| Slayer | 38 | 32 (84%) | 15 (39%) | 13 (34%) | 8 (21%) | Orden cronológico curado |
| Nightwish | 20 | 20 (100%) | 11 (55%) | 7 (35%) | 6 (30%) | Orden cronológico curado |

### Megadeth

Es el archivo insignia y representa por sí solo el 41% de todos los diseños del catálogo. Tiene filtros editoriales para Álbumes, Vic Rattlehead, Dave Mustaine, Tours y Originales FMD, además de buscador y orden discográfico.

Su fortaleza es la profundidad. Su debilidad actual es visual: la mayoría de los diseños tiene mock de remera, pero una fracción pequeña posee mock específico de hoodie o buzo. No hace falta producir físicamente nuevas prendas; conviene crear o priorizar mockups de abrigo para los diseños con mayor demanda.

### Slayer

Tiene 38 diseños únicos, buen orden cronológico y una cobertura de abrigo considerablemente mejor que Megadeth. Ocho diseños ya muestran las tres prendas. Es un archivo equilibrado para campañas de invierno y una buena referencia para futuras migraciones.

### Nightwish

Tiene 20 diseños, todos con remera y más de la mitad con hoodie. Es el archivo proporcionalmente más completo de los tres. La incorporación de Angels Fall First dejó el orden cronológico actualizado y reforzó la cobertura de prendas.

## Inventario por banda

La siguiente tabla muestra diseños únicos y cobertura visual por prenda. No es inventario físico.

| Banda | Diseños | Remera | Hoodie | Buzo |
|---|---:|---:|---:|---:|
| Megadeth | 267 | 235 | 29 | 14 |
| Slayer | 38 | 32 | 15 | 13 |
| Iron Maiden | 37 | 31 | 5 | 4 |
| Pantera | 30 | 27 | 7 | 0 |
| AC/DC | 25 | 23 | 4 | 0 |
| Metallica | 20 | 11 | 11 | 1 |
| Nightwish | 20 | 20 | 11 | 7 |
| Avenged Sevenfold | 13 | 10 | 0 | 0 |
| Rhapsody | 12 | 10 | 5 | 3 |
| Angra | 11 | 11 | 0 | 0 |
| Kreator | 11 | 11 | 0 | 0 |
| Dream Theater | 10 | 2 | 9 | 0 |
| Blind Guardian | 9 | 9 | 0 | 0 |
| EPICA | 9 | 9 | 3 | 2 |
| Helloween | 9 | 9 | 0 | 0 |
| Tarja Turunen | 9 | 8 | 4 | 2 |
| Evanescence | 8 | 8 | 0 | 0 |
| Sepultura | 8 | 1 | 8 | 0 |
| Ozzy Osbourne | 7 | 7 | 3 | 2 |
| Personalizados | 7 | 7 | 0 | 0 |
| Anthrax | 6 | 6 | 0 | 0 |
| Deep Purple | 5 | 5 | 0 | 0 |
| Devin Townsend | 5 | 5 | 0 | 0 |
| Dio | 5 | 5 | 0 | 0 |
| HammerFall | 5 | 0 | 5 | 0 |
| Stratovarius | 5 | 5 | 0 | 0 |
| Black Sabbath | 4 | 3 | 2 | 0 |
| Def Leppard | 4 | 4 | 0 | 0 |
| Gojira | 4 | 4 | 0 | 0 |
| Testament | 4 | 4 | 0 | 0 |
| Guns N' Roses | 3 | 3 | 0 | 0 |
| Manowar | 3 | 0 | 3 | 0 |
| Tourniquet | 3 | 3 | 3 | 0 |
| Cacophony | 2 | 2 | 0 | 0 |
| Jason Becker | 2 | 2 | 0 | 0 |
| Motorhead | 2 | 2 | 0 | 0 |
| Sodom | 2 | 2 | 0 | 0 |
| WASP | 2 | 2 | 0 | 0 |
| Alice in Chains | 1 | 1 | 0 | 0 |
| Almafuerte | 1 | 1 | 0 | 0 |
| Amon Amarth | 1 | 1 | 0 | 0 |
| Andre Matos | 1 | 1 | 0 | 0 |
| Aphex Twin | 1 | 1 | 0 | 0 |
| Black Label Society | 1 | 1 | 1 | 0 |
| Death | 1 | 1 | 1 | 0 |
| Down | 1 | 1 | 0 | 0 |
| Exodus | 1 | 0 | 1 | 0 |
| Flema | 1 | 1 | 0 | 0 |
| Hawthorne | 1 | 1 | 0 | 0 |
| Hermetica | 1 | 1 | 0 | 0 |
| Judas Priest | 1 | 1 | 0 | 0 |
| Kanonenfieber | 1 | 1 | 0 | 0 |
| King Diamond | 1 | 1 | 0 | 0 |
| Lethal | 1 | 1 | 0 | 0 |
| Nirvana | 1 | 1 | 0 | 0 |
| Primal Fear | 1 | 1 | 0 | 0 |
| Rammstein | 1 | 1 | 0 | 0 |
| Ramones | 1 | 1 | 0 | 0 |
| Saltatio Mortis | 1 | 1 | 0 | 0 |
| Sundenrausch | 1 | 1 | 0 | 0 |
| Symphony X | 1 | 1 | 0 | 0 |
| Wintersun | 1 | 1 | 0 | 0 |

## Experiencia de compra actual

El recorrido objetivo ya está representado en el sistema:

**Banda -> Diseño -> Prenda -> Variante de remera -> Estampa -> Talle -> Color -> Entrega -> Pedido**

### Catálogo general

- El usuario puede buscar o elegir una banda.
- Las bandas con Archivo FMD abren su URL dedicada.
- Las demás bandas se muestran dentro del mismo catálogo mediante filtros.
- Cada card de diseño muestra imagen, banda, nombre público, precio desde y acceso al modal.
- La unidad visible es el diseño, no la prenda ni una colección contenedora.

### Archivos por banda

- Solo muestran productos de la banda elegida.
- Separan visualmente Hoodies, Buzos y Remeras.
- El mock de la card corresponde a la categoría seleccionada cuando existe.
- Nightwish y Slayer abren por defecto en Hoodies; Megadeth abre en Remeras.
- Megadeth agrega filtros editoriales para manejar su volumen sin crear secciones gigantes.

### Modal compartido

- Galería del diseño.
- Prenda principal: Remera, Hoodie o Buzo.
- Para remera: hombre clásica, mujer clásica, oversize unisex o niño.
- Estampa frontal o doble.
- Dorsos históricos cuando corresponde.
- Talle y tabla adecuada a la prenda/corte.
- Color.
- Forma de entrega y código postal para Andreani.
- Precio actualizado.
- Carrito o pedido por WhatsApp.

La imagen activa no debe cambiar silenciosamente la prenda, el código o el precio. El código de pedido se conserva desde el diseño principal.

## Precios y promociones vigentes en el sistema

### Precios base

| Prenda | Frontal | Doble |
|---|---:|---:|
| Remera clásica | $37.000 | $44.000 |
| Remera oversize | $40.000 | $47.000 |
| Remera niño | $32.000 | $35.000 |
| Hoodie | $52.000 | $59.000 |
| Buzo cuello redondo | $50.000 | $55.000 |

Los personalizados suman $5.000 por diseño. En remeras y buzos existen precios personalizados derivados de ese adicional.

### Promociones automáticas del carrito

- **2 prendas**: envío gratis a punto de retiro Andreani. A domicilio se abona la diferencia.
- **Abrigo + remera**: hoodie + remera clásica hasta $99.000; buzo + remera clásica hasta $95.000. Oversize: $102.000 o $98.000 respectivamente. La lógica nunca cobra el combo si el precio normal configurado resulta menor.
- **3 prendas**: envío gratis a domicilio.
- **3 prendas de abrigo**: 10% OFF sobre el importe descontable + envío gratis a domicilio.
- **4 prendas o más**: 15% OFF sobre el importe descontable + envío gratis a domicilio.
- Las promociones no se acumulan.
- El adicional de personalizados no recibe descuento.

La campaña temporal de Nightwish desde una prenda no está publicada ni automatizada en el catálogo; se comunica y aplica manualmente por WhatsApp.

## Arquitectura técnica

El flujo compartido es:

`products.json -> CatalogDesign -> configuración del Archivo FMD -> render compartido -> modal -> carrito/WhatsApp`

Fortalezas:

- Una sola fuente de productos.
- Una sola card por diseño.
- Sin duplicación del mismo arte por prenda.
- Prendas comprables separadas de mockups disponibles.
- Precios, talles, modal, carrito, entrega y WhatsApp compartidos.
- Archivos creados por configuración, no por una nueva lógica por banda.
- Sitemap y metadatos propios por archivo.
- Documento de arquitectura v1 disponible.

Deuda heredada:

- La home todavía conserva código de recorridos históricos para Megadeth, Slayer, Maiden y EPICA. No debe copiarse en futuros archivos.
- Hay componentes y textos antiguos que pueden retirarse progresivamente, pero solo después de confirmar que el motor compartido conserva los recorridos comerciales.
- El repositorio local tiene cambios pendientes; este informe describe el estado de trabajo actual y no certifica por sí solo qué revisión exacta está publicada en producción.

## Medición actual

La web tiene Google Analytics 4 y registra `whatsapp_click`. Eso permite observar una conversión final aproximada, pero todavía no explica dónde se pierde el usuario.

Faltan eventos de embudo homogéneos para:

- selección de banda;
- búsqueda y búsquedas sin resultado;
- apertura de diseño;
- selección de prenda;
- selección de estampa;
- agregado al carrito;
- inicio de checkout por WhatsApp;
- archivo de origen;
- uso de mock real o vista de referencia.

Sin esos datos, elegir la próxima banda únicamente por cantidad de diseños puede ser engañoso.

## Diagnóstico comercial

### Lo que FMD ya resolvió

- Transición de catálogo Megadeth-first a marca multi-banda.
- Archivo amplio sin necesidad de stock físico.
- Experiencia específica por banda sin duplicar el sistema.
- Personalización como capacidad transversal.
- Cierre directo por WhatsApp con pedido estructurado.
- Promociones aplicadas desde el carrito.

### Riesgos actuales

1. **Volumen sin jerarquía**: 650 diseños son una fortaleza solo si el usuario encuentra algo rápido.
2. **Cobertura visual desigual**: todos los diseños se pueden pedir en tres prendas, pero la falta de mock exacto puede reducir confianza, especialmente en invierno.
3. **Dependencia de intuición**: no existe todavía medición completa para decidir qué archivo o mock genera más ventas.
4. **Concentración**: Megadeth representa 41% de los diseños. Es una ventaja de autoridad, pero puede seguir condicionando la percepción general si no se equilibran los accesos.
5. **Mantenimiento editorial**: cronologías, nombres públicos y asociaciones de prendas requieren disciplina al cargar nuevos diseños.
6. **Código heredado**: seguir agregando excepciones a la home volvería a aumentar fricción y deuda técnica.

## Recomendación para dirección

### Decisión inmediata

No rediseñar nuevamente la home ni abrir varios archivos a la vez. Primero estabilizar y medir los tres actuales.

### Próximo Archivo FMD

Hay dos candidatos distintos según el objetivo:

| Objetivo | Candidato | Motivo |
|---|---|---|
| Venta de invierno inmediata | **Metallica** | 20 diseños y 11 con mock de hoodie; mejor base visual de abrigo entre las bandas grandes sin archivo |
| Profundidad estructural y autoridad | **Iron Maiden** | 37 diseños, tercer archivo más grande del catálogo y marca global fuerte |

Recomendación ejecutiva: **Metallica primero durante invierno; Iron Maiden después**. Si los datos de consultas o ventas contradicen esta prioridad, debe prevalecer el comportamiento real.

### Qué no conviene hacer

- No crear una landing aislada con lógica propia.
- No sumar filtros o metadata que ninguna interfaz use.
- No llenar la home con todos los archivos.
- No crear mocks para los 650 diseños de manera indiscriminada.
- No comunicar conteos internos en lugares donde perjudiquen la percepción de bandas pequeñas.

### Qué sí conviene hacer

1. Instrumentar el embudo mínimo de GA4.
2. Publicar y estabilizar el estado actual cuando pase QA.
3. Medir 2 a 4 semanas por archivo, banda, prenda y diseño.
4. Crear mocks de hoodie/buzo para los diseños más abiertos o consultados.
5. Lanzar Metallica mediante la misma configuración compartida.
6. Lanzar Iron Maiden después, sin excepciones en el motor.
7. Mantener el catálogo general como archivo completo y los Archivos FMD como recorridos curados.

## KPIs recomendados

- Sesiones por Archivo FMD.
- Porcentaje que abre al menos un diseño.
- Tiempo hasta abrir el primer diseño.
- Uso del buscador y búsquedas sin resultado.
- Distribución de prenda elegida.
- Conversión modal -> carrito.
- Conversión modal -> WhatsApp.
- Conversión carrito -> WhatsApp.
- Diseños con más aperturas y consultas.
- Tasa de uso de vista de referencia por falta de mock.
- Ticket promedio y promoción aplicada.
- Pedidos iniciados por home, archivo dedicado o enlace de campaña.

## Plan sugerido de 30 días

### Semana 1: estabilización

- QA de home, tres archivos, modal, carrito y WhatsApp.
- Confirmar que producción refleja el mismo estado del repositorio aprobado.
- Incorporar eventos mínimos de embudo sin alterar el diseño.

### Semana 2: campaña y observación

- Enviar tráfico diferenciado a Nightwish, Slayer y Megadeth con UTM.
- Observar qué diseños, prendas y archivos llevan a WhatsApp.
- Registrar consultas que no logra resolver el catálogo.

### Semana 3: mejora visual dirigida

- Crear mockups de abrigo solamente para los diseños con señal comercial.
- Corregir búsquedas sin resultado, nombres ambiguos y orden editorial si aparecen problemas reales.

### Semana 4: siguiente archivo

- Decidir Metallica o Iron Maiden con datos.
- Darlo de alta mediante configuración y el motor compartido.
- Comparar su conversión contra los tres archivos existentes.

## Veredicto

FMD tiene hoy una base sólida y diferenciada: **650 diseños, 62 bandas y tres archivos dedicados que concentran la mitad del catálogo**. El sistema ya es escalable, pero todavía no está en una etapa donde “más páginas” sea automáticamente mejor.

El siguiente salto no es cantidad. Es convertir la navegación y el cierre por WhatsApp en un embudo medible, utilizar esa información para decidir qué mostrar y expandir los Archivos FMD sin volver a fragmentar la arquitectura.
