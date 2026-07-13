# Auditoría de conversión del catálogo FMD

Fecha: 11/07/2026  
Estado: arquitectura congelada, sin cambios visuales ni deploy  
Flujo aprobado: Banda -> Diseño -> Prenda -> Tipo de estampa -> Talle -> Color -> Entrega -> Pedido

## Veredicto ejecutivo

El catálogo todavía no cumple de forma uniforme la regla "una entrada por diseño".

Los problemas no son de estética. Provienen de que la interfaz sigue exponiendo de forma indirecta cómo están guardados los datos:

- en algunos casos una entrada abre muchos artes;
- en otros, un mismo arte aparece repetido por prenda;
- el selector de prenda depende del mock que está activo;
- los dorsos se buscan en toda la card de datos y no solamente en el diseño abierto;
- el catálogo general muestra dos precios exactos en vez de un único "Desde $...".

No conviene seguir agregando excepciones por banda. La corrección debe ocurrir en un único modelo de presentación compartido.

## Hallazgos globales

### P0 - La unidad visible no es siempre un diseño

- Megadeth usa una ruta especial que agrupa varios artes de un producto en una entrada.
- Slayer mantiene cards contenedoras como `Slayer FMD Originals`, con 29 mocks dentro.
- Iron Maiden, Metallica, EPICA y Rhapsody pueden mostrar el mismo concepto varias veces cuando existe en más de una prenda.

Resultado: el cliente no puede anticipar si al tocar una entrada abrirá un diseño, una prenda o una colección.

### P0 - La prenda depende del mock activo

`getAvailableModalGarments()` devuelve una única prenda cuando reconoce que la imagen activa es remera, hoodie o buzo. Por eso el modal no funciona todavía como configurador de diseño: funciona como configurador del mock que se abrió.

En cards contenedoras, cambiar de imagen puede cambiar silenciosamente la prenda disponible. Eso invierte el flujo aprobado: la prenda termina dependiendo del carrusel.

### P0 - Los dorsos no están aislados por diseño

El catálogo agrupa algunos frentes y dorsos al construir la card visible, pero el modal ejecuta `getDorsoVariants(currentProduct)` sobre todas las variantes del producto original.

Ejemplos:

- `Rust in Peace` contiene varios frentes y seis imágenes detectadas como dorso.
- `Ride the Lightning` contiene dos conceptos con sus dorsos.

Al abrir un arte concreto, el selector puede ofrecer dorsos pertenecientes a otro arte del mismo producto. Además, si el usuario navega hasta una imagen de dorso, el código y el nombre del pedido pueden tomar el índice del dorso como variante principal.

### P1 - Precio incorrecto para el contexto

El catálogo general usa `formatPreciosDual()` y muestra precio frontal y doble en cada card.

La regla aprobada requiere:

- catálogo por banda: `Desde $37.000`;
- vidriera específica de hoodie: precios de hoodie;
- vidriera específica de buzo: precios de buzo;
- modal: precio actualizado por prenda y estampa.

La vidriera de abrigos ya tiene precios contextuales correctos. El catálogo general no.

### P1 - Regreso al catálogo incompleto

Al cerrar el modal se restaura la posición de scroll, pero la URL puede conservar `#producto-ID`. Esto ensucia el historial y hace menos predecible el botón Atrás del navegador.

### P1 - Nombres internos y textos dañados

Todavía hay nombres que dependen de limpieza en tiempo de render, por ejemplo `- disenos sugeridos` o `- hoodies sugeridos`. También quedan seis textos con signos `?` incrustados en `products.json`, entre ellos descripciones de Pantera, Sepultura, Iron Maiden y Dio.

## Matriz de los diez casos

| Caso | Entrada por arte | Dorso correcto | Nombre público | Precio/prenda | Selectores y entrega | WhatsApp | Regreso | Resultado |
|---|---|---|---|---|---|---|---|---|
| Megadeth - Rust in Peace (ID 4) | Falla: una entrada puede contener varios frentes | Falla: aparecen dorsos de todo el álbum | Parcial | Falla en catálogo general | Parcial | Riesgo si queda activo un dorso | Parcial | No aprobado |
| Slayer - FMD Originals (ID 7123) | Falla: 29 mocks dentro de una card contenedora | No hay asociación explícita de frente/dorso | Parcial | Depende de la prenda activa | La prenda cambia con el mock | Parcial | Parcial | No aprobado |
| Iron Maiden - Eddie Gaucho (ID 7040) | Falla: el mismo arte aparece una vez por prenda | No aplica | Correcto | Correcto por card, no según regla general | Prenda bloqueada por mock | Correcto | Parcial | No aprobado |
| Metallica - Ride the Lightning (ID 1060) | Falla: conceptos y prendas se duplican | Falla: el modal puede listar ambos dorsos | Hay nombres con riesgo de codificación | Correcto por mock, no según regla general | Prenda bloqueada por mock | Riesgo de código/nombre de dorso | Parcial | No aprobado |
| EPICA (ID 5016) | Falla: Omega y otros conceptos se repiten por prenda | No aplica | Parcialmente repetitivo | Correcto por mock | Prenda bloqueada por mock | Correcto | Parcial | No aprobado |
| Rhapsody (ID 5083) | Falla: varios conceptos se repiten por prenda | No aplica | Correcto | Correcto por mock | Prenda bloqueada por mock | Correcto | Parcial | No aprobado |
| HammerFall (ID 5089) | Pasa: cinco artes generan cinco entradas | No aplica | Correcto en card; revisar título base | Falla: general debería decir `Desde` | Solo hoodie | Correcto | Parcial | Parcial |
| Banda con un diseño - King Diamond (ID 5058) | Pasa | No aplica | Falla en modal: puede conservar `diseños sugeridos` | Falla: general debería decir `Desde` | Remera y cortes claros | Correcto | Parcial | Parcial |
| Abrigo específico - Hoodie Rust in Peace (ID 5062) | Pasa como vidriera específica | No tiene dorso separado | Correcto | Pasa: $52.000 / $59.000 | Hoodie claro | Correcto | Parcial | Aprobado con ajuste de regreso |
| Personalizado - Diego Maradona (ID 5121) | Pasa | Dorso a definir | Correcto | Recargo personalizado aplicado | Remera y cortes claros | Correcto | Parcial | Parcial |

## Lo que actualmente sí funciona

- Talle y color existen como selecciones claras.
- El pedido directo por WhatsApp permite talle, color y dorso como `A confirmar`.
- La entrega exige modalidad y exige código postal solamente para Andreani.
- El mensaje incluye diseño, código, prenda, talle, color, estampa, precio y entrega.
- El modal calcula precios distintos para remera clásica, oversize, chicos, hoodie y buzo.
- La vidriera de abrigos puede mostrar precios exactos según la prenda.

## Corrección técnica recomendada

### 1. Crear una única entidad de presentación `CatalogDesign`

Debe construirse en JavaScript sin modificar todavía `products.json`:

```js
{
  designKey,
  band,
  publicName,
  badges,
  sourcesByGarment,
  frontImages,
  backImages,
  sourceProductIds
}
```

Esta entidad debe agrupar:

- el mismo concepto en remera, hoodie y buzo;
- el frente y dorso correspondientes;
- cards separadas que compartan `designFamilyId`, cuando la evidencia sea segura.

### 2. Un solo render para todas las bandas

Todos los filtros de banda deben producir una lista de `CatalogDesign`. Megadeth, Slayer, Maiden y EPICA no deben tener una regla diferente para decidir qué es una entrada de catálogo.

Las curadurías especiales pueden seguir definiendo orden o destacados, pero no cambiar la unidad de producto visible.

### 3. Modal orientado al diseño

El modal debe abrir un `CatalogDesign` y luego:

1. elegir prenda;
2. mostrar el mock de esa prenda si existe;
3. mantener el arte reconocible si no existe un mock específico;
4. actualizar precio y tabla de medidas;
5. limitar el selector de dorso a los dorsos asociados al diseño;
6. generar el código a partir del frente, nunca del dorso activo.

### 4. Precio por contexto

- Catálogo general: un solo `Desde $37.000`.
- Filtro o vidriera de hoodie: $52.000 / $59.000.
- Filtro o vidriera de buzo: $50.000 / $55.000.
- Modal: `Precio del producto` según selección.

### 5. Estado de navegación

Al cerrar el modal debe restaurarse:

- banda elegida;
- búsqueda y filtros;
- posición de scroll;
- URL del catálogo sin dejar un hash de producto activo.

## Orden de implementación propuesto

1. Construir y probar `CatalogDesign` con los diez casos auditados.
2. Reemplazar el render por banda usando esa entidad compartida.
3. Conectar el modal al diseño y aislar dorsos.
4. Corregir precio `Desde` y navegación de regreso.
5. Ejecutar pruebas de WhatsApp para los diez casos.
6. Recién después realizar la prueba externa con usuarios nuevos.

## Criterio de cierre

El sprint no queda cerrado hasta que los diez recorridos cumplan:

- una entrada reconocible por arte;
- ninguna prenda duplicando el mismo diseño;
- ningún dorso apareciendo como diseño independiente;
- precio coherente con el contexto;
- mensaje de WhatsApp coherente con lo seleccionado;
- regreso al mismo punto del catálogo.

