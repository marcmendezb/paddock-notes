# Paddock Notes — Marca para implementar

> Resumen operativo del brandboard v3 (noviembre de 2026) para el código. La fuente de verdad es [brandboard/](brandboard/): `Brandboard Paddock Notes.dc.html`, los tokens en `brandboard/tokens/globals.css` y los logos en `brandboard/assets/logo/`.
> `Identidad Paddock Notes.dc.html` es la versión 2 (símbolo anterior, la «p» como marcador). Manda la v3.

## 1. Idea

**Eslogan:** «La Fórmula 1, explicada con datos.» (en inglés, «Formula 1, explained with data.»). Es el de Paddock Notes en todas partes: pie de página, etiqueta del logo y metadatos. Se escribe así, con «Fórmula 1» completo y punto final.

**La cota del dibujo técnico:** una línea de medida entre dos marcas con el valor escrito encima. Sirve para la cuenta atrás (el hueco hasta la salida), para anotar un tramo en un gráfico o un undercut en una estrategia. "Notes" es el gesto: el valor escrito sobre la medida.

## 2. Logo

- Símbolo: ligadura «pn» de un solo grosor, inclinada 12°, con un cuadrado lima como punto final. Retícula de 48, trazo de 6, arcos de radio 7.
- El logo vive **sobre negro**. Sobre blanco va entero en negro, sin lima.
- Versiones (SVG con texto en trazados): horizontal, vertical, compacta, wordmark y símbolo, cada una en `-sobre-negro`, `-blanco` y `-negro`.
- Cabecera móvil: versión compacta a 24 px de alto. Por debajo de 24 px, solo el símbolo.
- Área de respeto: la altura de la x del símbolo a cada lado.
- **Prohibido:** lima sobre blanco, invertir colores, estirar o comprimir, redondear el punto.
- Favicon (`brandboard/favicon.svg`) y avatares, siempre sobre negro.

## 3. Color

- Negro y lima, con lila como acento puntual. Proporción: negro 80 %, blanco roto y grises 16 %, lima 3 %, lila 1 %.
- **La lima y la lila solo aparecen sobre negro**, y solo marcan lo que hay que mirar: cifras clave, notas, cotas y estado activo. Nunca como fondo amplio, degradado ni brillo.
- Lima y lila nunca en el mismo elemento ni en el logo. Única excepción, decidida por el autor: la vuelta animada del logo al pasar por encima (o al enfocarlo) va en lila; el punto sigue en lima.
- **Cabecera y hero siempre en negro**, también en modo claro: atributo `data-surface="ink"`.
- En modo claro: fondo `#FFFFFF`, texto `#0A0A0A`, secundario `#5A5A5A`, acento negro; lila oscura `#6A3FC8` como acento secundario.
- `--line` es solo para bordes y rejillas, nunca para texto.
- **Nada de filetes de un solo lado** en color o más gruesos que el resto (franja lateral, superior o inferior que marca un bloque). Para destacar: fondo (negro o gris), borde completo de 1 px, un pictograma o nada.

Los tokens se copian tal cual de `brandboard/tokens/globals.css` a `apps/web/app/globals.css`.

## 4. Tipografía

- **Archivo** (SIL OFL), variable en peso y ancho, **alojada en el propio sitio** (la CSP no permite Google Fonts, ver `seguridad.md` §4.1).
- Dos anchos: semicondensada (`font-stretch: 87.5%`) para titulares, cifras grandes y logo; normal (100 %) para texto, interfaz y tablas.
- Texto: 400, 17/27 px, máximo 68 caracteres por línea (`--measure`).
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en tablas, tiempos y cuenta atrás.
- Sin mayúsculas espaciadas ni monoespaciada.

| Token | px | Peso · ancho | Uso |
|---|---|---|---|
| `--step-count` | 44–112 | 600 · 87,5 | Cuenta atrás |
| `--step-5` | 40–80 | 700 · 87,5 | Nombre del GP |
| `--step-4` | 36–56 | 700 · 87,5 | Título de artículo |
| `--step-3` | 28–36 | 700 · 87,5 | h2 |
| `--step-2` | 26 | 700 · 87,5 | h3, secciones de la home |
| `--step-1` | 21 | 400 · 100 | Entradilla |
| `--step-0` | 17 | 400 · 100 | Texto |
| `--step--1` | 15 | 400–600 · 100 | Interfaz, tablas, notas |
| `--step--2` | 13 | 400–500 · 100 | Ejes, pies de gráfico |

## 5. Gráficos

| Elemento | Regla |
|---|---|
| Series categóricas | Seis (`--data-1` a `--data-6`), cada una con marcador y trazo propios: círculo/continuo, cuadrado/guion largo, triángulo/punteado, rombo/guion-punto, aspa/guion corto, anillo/continuo fino. Ninguna combinación reproduce la librea de un equipo |
| Secuencial | `--seq-1` a `--seq-7`: velocidad sobre el mapa, acelerador, degradación |
| Divergente | `--div-loss-*` (pierde tiempo, lila) ↔ `--div-mid` ↔ `--div-gain-*` (gana tiempo); el signo + o − va siempre junto al color |
| Ejes | Solo la línea de cero o de base; la unidad una vez, en el último valor ("4,3 km") |
| Rejilla | Horizontal, 1 px en `--line`, entre tres y cinco líneas; sin rejilla vertical salvo límites de sector en discontinua |
| Etiquetas | Directas al final de cada serie en lugar de leyenda; 13 px, cifras tabulares, color secundario |
| Grosor | Series 2 px; protagonista 3 px; referencias 1 px; marcadores de 8 px cada N puntos |
| Notas | La firma de la marca: Archivo 600 en `--accent`, ancladas con un punto de 9 px con halo del fondo; un tramo se marca con la cota (línea de 2 px con remates). Máximo dos notas por gráfico, de doce palabras como mucho, en presente |
| Estado vacío | Se conserva el marco del gráfico en discontinua y una nota de una frase dice por qué no hay datos y cuándo los habrá. Sin ilustraciones |

## 6. Voz

Coincide con [contenido.md](contenido.md) §2. Cinco reglas del brandboard: el porqué antes que el qué · el dato en lugar del adjetivo · una idea por frase · la jerga se explica una vez · decimos lo que no sabemos.

## 7. Aplicaciones de referencia

- `brandboard/Home.dc.html`: home con cabecera y hero en negro, cuenta atrás como cota, horario local del circuito y del visitante, top 5 de pilotos y un gráfico de ejemplo de la zona técnica.
- `brandboard/OG Post-carrera.dc.html`: imagen de 1200×630 con titular a la izquierda y un gráfico con sus dos notas a la derecha. Campos variables: titular, entradilla, ronda, gráfico y notas.

## 8. Decisiones abiertas del brandboard

El brandboard v2 dejaba preguntas para el autor. Las que ya resuelven los documentos:

| Pregunta | Respuesta |
|---|---|
| Hora de salida: ¿local del circuito y del visitante, o solo la del visitante? | Las dos: la del visitante en primer plano y la del circuito en segundo (NUC-03) |
| Idioma por defecto y URL con idioma | Español por defecto; rutas `/es` y `/en` (TRA-10, TRA-11) |
| Dominio | `paddocknotes.dev` propuesto (D-20) |
| Nombres reales de pilotos y equipos en tablas | Sí, como texto y sin colores ni logos (`contenido.md` §1.7) |

Siguen abiertas para el autor: el usuario en redes sociales y la confirmación final de la lima `#C6F432` (que no recuerde a ninguna escudería).
