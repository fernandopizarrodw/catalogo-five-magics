# Sprint 3.3 - Exportación y recuperación

## Dónde se guardan los cambios

El tablero guarda cada edición automáticamente en `localStorage` del navegador.

- Clave: `fmd-sprint3-3-curation`
- Archivo: `sprint3_3_curatorial_board.html`

Los cambios permanecen mientras:

- se abra el mismo archivo local;
- se use el mismo navegador y perfil;
- no se borren los datos del sitio/localStorage;
- no se presione `BORRAR CAMBIOS LOCALES`.

Regenerar o actualizar el HTML no borra el estado guardado.

## Opciones de exportación

1. `DESCARGAR CSV CORREGIDO`
2. `COPIAR CSV AL PORTAPAPELES`
3. `MOSTRAR CSV MANUAL`
4. `DESCARGAR RESPALDO JSON`

## Recuperación manual desde DevTools

Abrir la consola del navegador sobre el tablero y ejecutar:

```js
localStorage.getItem('fmd-sprint3-3-curation')
```

Esto devuelve un JSON con todas las correcciones guardadas.

Para copiar ese respaldo:

```js
copy(localStorage.getItem('fmd-sprint3-3-curation'))
```

No ejecutar `localStorage.clear()` ni borrar la clave hasta confirmar que el CSV o JSON fue exportado correctamente.
