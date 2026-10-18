# Translator Software — Especificación (v4)

> Derivado de las notas de diseño de Obsidian y de las capturas de Figma.
> **Integrado:** lista de proyectos (filtros, progreso, crear proyecto), detalle de proyecto, detalle de sección (con mover items y añadir contenido), editor de traducciones, glosario (overview, categoría, detalle, edición, historial y comparación) y ajustes de miembros.
> **Sin diseño en las capturas:** Notifications, Assigned to me, Comments, General settings y Workspace projects.
> **Figma manda sobre las capturas.** Según el autor, Figma está actualizado y algunas capturas pueden ser una versión anterior. Cuando una pantalla tenga varias versiones o haya dudas, hay que preguntar y comprobarlo en Figma (ver decisión resuelta 20).
> Las partes marcadas como **[Propuesta]** son decisiones de alcance o de modelo que no estaban en las notas ni en el diseño y deben validarse.
> Los textos de la interfaz del diseño están en inglés; se mantienen tal cual en esta spec.

## 1. Visión

### Por qué existe

Proyecto de desarrollo personal para diseñar un software desde cero, mejorar la forma de diseñar y hacer algo con un significado concreto. Es también un proyecto de portfolio que, a futuro, se publicará como **open source**.

### Qué es

Una herramienta de traducción de videojuegos. Por cómo está planteada, se puede extrapolar a otros medios (libros, películas, series).

### Problema

Las traducciones de videojuegos sufren por falta de contexto, de tiempo y de conocimiento del mundo del juego.

### Solución

Unir en un mismo sitio:

- La **parte visual** que acompaña a los diálogos (la escena del juego).
- El **conocimiento asociado** al juego, en forma de glosario por proyecto: historia, localizaciones, personajes, lore.
- **Trabajo en equipo** con supervisión de compañeros (peer review).

## 2. Alcance por fases **[Propuesta]**

### v1 — Showcase (local, un solo usuario)

Prioridad: que el flujo completo se vea pulido y fiel al diseño de Figma. No tiene que ser perfecta.

- Gestión de proyectos: lista con búsqueda, filtros, popover de progreso y ordenación; crear proyecto.
- Detalle de proyecto: overview, secciones colapsables con progreso, progreso por idioma.
- Detalle de sección: lista de content items con búsqueda, filtro por estado, selección múltiple y mover items; añadir contenido (imágenes).
- **Entrada del texto original mediante OCR** sobre las imágenes. El texto detectado se puede **editar** al hacer clic, con una etiqueta "edited".
- Editor de traducciones completo según el diseño (ver 5.4), con comentarios en hilos y glosario integrado.
- Glosario por proyecto, solo con **entradas Markdown simplificadas**: overview, filtro por categoría, detalle, edición, historial y comparación de versiones.
- **Export to code:** exportación de las traducciones a un archivo JSON. CSV también previsto (ubicación en la interfaz sin definir).
- Ajustes > Miembros, **solo local**: ver, buscar, filtrar, cambiar categoría y quitar miembros; "Invite members" crea un miembro con estado _Invited_ sin enviar correos reales.
- Persistencia local. Usuarios y roles **simulados** con un selector de usuario actual, para poder mostrar la vista de manager y de worker sin backend.
- Proyecto de ejemplo incluido, con contenido propio, libre o de dominio público (ver decisión abierta 9).

### v2 — Equipos

- Backend, autenticación, invitaciones por email reales.
- Permisos reales (managers / workers, visibilidad de proyectos).
- Notificaciones y sincronización.
- Traducción con IA con revisión humana obligatoria (requisito de las notas; **el editor diseñado no tiene interfaz para ello**).
- Importación de formatos adicionales (PO, XLIFF).

### Futuro

- Vistas Kanban y Timeline en gestión de proyectos.
- Otros medios además de videojuegos.

**Requisito de arquitectura:** el acceso a datos debe estar detrás de una interfaz (repositorio/servicio) para poder sustituir la persistencia local por un backend en v2 sin reescribir la UI.

## 3. Modelo de dominio (borrador)

Jerarquía: **Workspace > Project > Section > Content item > Image**. Cada imagen tiene **un bloque de texto**, y la traducción se hace por imagen e idioma.

> Terminología del diseño: una _Section_ es un acto ("Act 1 - World introduction") y un _Content item_ es lo que cuelga de ella ("Bomber mission"). Un content item agrupa una o varias imágenes ordenadas ("01 / 02"). El texto "Images in this section" del editor se refiere al content item y debería corregirse.

- **Workspace**: miembros y proyectos.
- **User / Member**: nombre, email, avatar (o iniciales), categoría (`manager` | `worker`), sub-team (ver decisión abierta 4), estado (`active` | `invited`; al quitar a alguien, sus traducciones se conservan).
- **Project**: nombre (obligatorio), identificador (ej. `FFVII-GEN-2025`), fecha de lanzamiento (en el diseño, un trimestre: "Q3 2025"), **idioma original** (por proyecto; ej. un juego en japonés traducido a otros idiomas), idiomas de destino (sin incluir el original), plataformas (Playstation, Xbox, PC, Switch; cada una con color propio), **uno o varios managers**, miembros, prioridad, estado, palabras totales, glosario propio.
- **Section**: nombre, descripción, orden, progreso (%), estado. Muestra los managers y la prioridad del proyecto **[Propuesta: se heredan]**.
- **Content item**: nombre, **tipo** (en el diseño, "Mission dialogue" y "Character dialogue"), estado, progreso, nº de palabras, nº de idiomas, última actualización (quién y cuándo), imágenes ordenadas, nota para traductores.
- **Image**: archivo, título corto ("Station rendezvous"), orden dentro del content item y su **bloque de texto original**: texto (por OCR, editable), hablante (_speaker_), tipo (ej. "Dialogue"), nota de contexto (ej. "After the reactor escape"), nº de caracteres, y la marca **edited** si el texto se ha modificado respecto al OCR.
- **Translation**: por imagen e idioma; texto, estado, autor, fecha de última edición, revisor (peer review), marca de IA pendiente de revisión humana (v2). El hablante se hereda del original y es de solo lectura.
- **TranslatorNote**: instrucción de estilo asociada al content item o a la imagen.
- **CommentThread**: pertenece a una imagen; idioma, categoría (ej. "Terminology"), estado (`open` | `resolved`), quién lo resolvió, respuestas, menciones con `@`.
- **GlossaryCategory**: Characters, Factions, Locations, Lore y las que se creen con "New category".
- **GlossaryEntry** (por proyecto, **solo tipo Markdown**): título, descripción corta (se muestra en tarjetas y en el editor), categoría, tags libres, imágenes, contenido en Markdown con enlaces internos y referencias, contador de visitas. **Sin** campos de traducción por idioma ni estado de aprobación.
- **GlossaryVersion**: versión guardada de una entrada: contenido, autor, fecha y hora.

**Prioridad:** `Urgent`, `High`, `Medium`, `Low`, `None` (de mayor a menor).
**Estados:** `Not started`, `In progress`, `Under Review`, `Completed`.

## 4. Navegación

Dos niveles:

- **General:** Projects, Notifications, Assigned to me, Comments, Settings. Avatar de usuario abajo a la izquierda.
- **Ajustes:** "← Back to translation space", General settings, Members, Workspace projects.

El **glosario es por proyecto**: se accede desde la tarjeta _Glossary_ de los detalles de proyecto y de sección, y desde _Full glossary_ en el editor. No es un elemento de la navegación general.

> Algunas capturas (lista de proyectos con filtros y el glosario) muestran la **navegación antigua** (Projects, Glossary). Lo vigente es lo descrito aquí; en las pantallas del glosario el elemento activo debe ser _Projects_.

**Sin diseño:** Notifications, Assigned to me, Comments, General settings y Workspace projects. **[Propuesta]** en v1 no se construyen; sus entradas de navegación se ocultan o quedan desactivadas (decisión abierta 6).

Requisitos:

- Diferenciar entre "ningún proyecto seleccionado" y "proyecto seleccionado".
- Búsqueda general entre los proyectos del usuario.
- Los managers ven de un vistazo todos los proyectos, su progreso, quién trabaja en ellos y si hay peticiones pendientes.

## 5. Pantallas

### 5.1 Lista de proyectos ("List of projects")

- **Cabecera:** título y botón **Add project**.
- **Barra:** botón de filtros (icono de ajustes, resaltado con un círculo cuando está activo) y buscador "Search projects".
- **Tabla** con columnas _Name, Platforms, Manager, Members, Priority, Status_:
  - Plataformas como chips con punto de color (Playstation azul, Xbox verde, PC azul claro, Switch rojo).
  - Manager(s) y miembros como avatares apilados.
  - Prioridad como icono: Urgent (rombo con exclamación), High (3 barras), Medium (2), Low (1), None (guion).
  - Estado como icono: Not started (círculo discontinuo), In progress (círculo parcial amarillo), Under Review (círculo naranja con "!"), Completed (círculo verde con check).
  - Hover resalta la fila; clicar abre el detalle del proyecto (5.2).
  - **Progreso por idioma:** al pasar el ratón sobre el icono de estado aparece un popover "Progress" con una barra y un % por idioma (en el diseño, con bandera: English, Spanish, Japanese, Chinese, Italian, Portuguese, German).
- **Filtros:** el menú tiene cinco categorías con submenú de casillas:
  - _Platforms:_ Playstation, Xbox, PC, Switch.
  - _Managers_ y _Workers:_ personas con avatar.
  - _Priority:_ Urgent, High, Medium, Low, None (con icono).
  - _Status:_ Not started, **In progress**, Under Review, Completed (con icono). La captura que dice "Started" es una versión anterior.
  - Los filtros aplicados aparecen como **chips quitables** bajo la barra ("Status is Not Started ×", "Manager is James Fielden ×") con **Clear all filters**.
  - Varios filtros se combinan entre sí (el resultado cumple todos). **[Propuesta]** Varias casillas dentro de una categoría = cualquiera de ellas.
  - No hay filtro por etiquetas de proyecto (género, etc.).
- **Ordenación** (según las notas; el diseño no muestra indicadores): al hacer hover en el encabezado aparece una flecha en las columnas ordenables.
  - Nombre (por defecto): empieza en A-Z; clicar de nuevo alterna A-Z / Z-A.
  - Prioridad: de mayor a menor (Urgent → None).
  - Status: In progress > Under Review > Not started > Completed.

**Add new project (modal)**

- Título "Add new project" y subtítulo "Set up the project, platforms and people."
- _Project name_ (obligatorio, `*`).
- _Platforms:_ chips seleccionables con check; ayuda "Select all platforms this project supports."
- _Manager:_ desplegable con avatar. **Debe permitir varios managers** (la captura muestra selección única; Figma está actualizado según el autor).
- _Team members:_ chips con avatar y `×`, contador "N added" y "+ Add team members".
- _Priority:_ None, Low, Medium, High, Urgent.
- **Idioma original** e **idiomas del proyecto**: decididos, pero la captura no los muestra (diseño por confirmar en Figma). **[Propuesta]** idioma original obligatorio; idiomas de destino opcionales (también se añaden después con _Add language_).
- Acciones: **Cancel** y **Create project**. Al crearlo, se coloca según el orden activo de la lista.

### 5.2 Detalle de proyecto

Layout de dos columnas. Existen dos versiones de la captura: en una, la lista de items de _Section Progress_ se desborda por la derecha y oculta los porcentajes. Se considera un fallo de maquetación; la versión con porcentajes visibles es la de referencia.

**Cabecera**

- Nombre del proyecto, badge de estado, pastilla de progreso (ej. _33% translated_), subtítulo ("Section-based translation progress").
- Botón **Export to code** arriba a la derecha: descarga un archivo JSON con las traducciones.

**Columna izquierda**

- **Overview**: badge de prioridad (_Urgent_), plataformas, manager(s) y miembros (avatares), Project ID, Release Date, Word Count. La etiqueta dice "Manager" aunque puede haber varios.
- **Section Progress**: botón _Add section_. Cada sección es colapsable y muestra nombre, % de completado y un indicador circular (parcial; discontinuo si _Not started_). Al expandirla, lista sus content items con nombre, badge de estado y barra de progreso con color según estado (verde Completed, naranja Under Review, amarillo In progress). Sin desglose por idioma. Clicar una sección abre su vista de detalle (5.3).

**Columna derecha**

- **Glossary**: tarjeta con descripción y enlace al glosario del proyecto.
- **Languages Progress**: contador ("6 languages"), lista de idiomas con porcentaje y badge de estado, y botón _Add language_.

### 5.3 Detalle de sección

- **Breadcrumb:** `← All sections > Act 1 - World introduction`, con el identificador del proyecto a la derecha. Bajo la cabecera del proyecto (nombre, estado, % traducido).
- **Tarjeta de sección:** nombre, % de completado con indicador circular, descripción, contadores (content items, palabras, idiomas), managers (avatares) y prioridad.
- **Glossary:** misma tarjeta que en el detalle de proyecto.
- **Content items** (con contador) y botón primario **+ Add**:
  - Buscador "Search content in this section..." y filtro "All statuses".
  - **Selección múltiple** con casillas. Con selección aparece "N items selected", **Clear selection** y **Move to section**.
  - Cada fila: casilla, nombre, badge de estado, % y barra de progreso (color según estado), subtítulo con tipo, palabras e idiomas ("Mission dialogue · 6,400 words · 6 languages"), avatar de quien lo actualizó por última vez con "Updated 2h ago" y una flecha que abre el editor (5.4).
  - Pie: "Showing all N items" y "Translation progress across all languages".
- **Languages Progress:** misma tarjeta que en el proyecto, sin el botón _Add language_.
- **Move to section (popover):** lista de los items seleccionados, desplegable "Destination section", aviso "Translations and item progress will be kept." y botones **Cancel** y "Move N items".

**Add content to section (modal, tres estados)**

- Zonas: _Image ordering_ ("Click on uploaded images to add them. Drag horizontally to set order."; vacío: "Selected images will appear here"), _Image preview_ ("Preview images by hovering on them") e _Image selector_ ("Drag images here", con botón "+" para buscar archivos).
- Estados: sin imágenes; imágenes subidas sin seleccionar (miniaturas a la derecha, vista previa al hacer hover); imágenes seleccionadas (aparecen arriba con un número que es su **orden** en la traducción y se reordenan arrastrando).
- **Lo que el diseño no muestra:** botón de confirmar o cancelar, campo para el **nombre** y el **tipo** del content item, título de cada imagen y estado del OCR (decisión abierta 3).

### 5.4 Editor de traducciones ("Translation workspace")

Layout de tres columnas.

**Cabecera**

- Nombre del proyecto, badge de estado, etiqueta "Translation workspace".
- Indicador de guardado automático ("All changes saved") y botón primario **Submit for review**, que actúa sobre la **sección** (decisión resuelta 17). Aunque el botón está en el editor del content item, afecta a la sección que lo contiene.
- Breadcrumb: `← All sections > Act 1 - World introduction > Bomber mission`, e identificador del proyecto a la derecha.

**Columna izquierda — contexto**

- **Source image**: contador "01 / 02", la imagen de la escena, nombre de archivo, zoom (100%) y pantalla completa.
- **Source text**: idioma original ("English · Read only"), hablante, texto original y metadatos (tipo, nota de contexto, nº de caracteres). **El texto se puede editar al hacer clic** (acción pequeña, aún sin diseñar) y, si se modifica, aparece la etiqueta **edited**. **[Propuesta]** la misma acción cubre texto, hablante, tipo y contexto.
- **Images in this section** (debería decir "item"): miniaturas con número, título y marca _Current_ / _Next_, y botones _Previous image_ / _Next image_.

**Columna central — traducción**

- **Translations**: cuadrícula de tarjetas por idioma con icono de estado y contador "x/N translated". La tarjeta seleccionada se resalta. Ayuda: "Select a language to edit its translation."
- **Editor del idioma seleccionado**: selector de idioma, badge de estado, _Speaker_ (heredado, bloqueado), área de texto, contador de caracteres y líneas, aviso "N glossary match", "Edited by you · Just now" y botón primario **Mark translated**.
- **Comparación entre idiomas**: debajo del editor aparecen tarjetas de otros idiomas con selector de idioma, estado, texto, autor y fecha, y la acción _Edit French_. Es comparación visual, no edición colaborativa.
- **Nota para traductores** al pie.
- Los contadores de caracteres y líneas (frente a los del original) son la única ayuda para saber si el texto cabe; no hay previsualización sobre la escena (ver sección 8).

**Columna derecha — conocimiento y conversación**

- **Glossary**: enlace _Full glossary_, buscador (en el diseño, rellenado con "Sector 8"), contador de resultados y entradas coincidentes. **El panel del diseño muestra "término → traducción", guía de uso y estado _Approved_, que ya no existen**: debe adaptarse para mostrar la entrada Markdown (título, descripción corta y tags). **[Propuesta]** una coincidencia ("N glossary match") es una entrada cuyo título aparece en el texto original o en la traducción.
- **Comments** (ámbito: la imagen actual): pestañas _Open · N_ y _Resolved · N_, filtro por idioma; hilos con etiqueta de idioma y categoría, autor, hora, respuestas, _Reply to thread_, _Resolve_; en resueltos, "Resolved by …", _View thread_ y _Reopen_; compositor con `@` para mencionar, selector de idioma y botón _Comment_.

**Estados de una traducción**: Not started → In progress → (Mark translated) → Under Review → Completed. **[Propuesta]** _Submit for review_ pasa a _Under Review_ las traducciones marcadas como traducidas de la sección, y un manager las pasa a _Completed_. El diseño muestra los estados, pero no las transiciones (decisión abierta 1).

### 5.5 Glosario (por proyecto, solo entradas Markdown)

**Overview** (título "<Proyecto> - Glossary", con icono)

- Botón **+ New entry**, buscador "Search terms", chips de categoría (Characters, Factions, Locations, Lore) y **New category**.
- Una sección por categoría con **View all »** y una fila de tres tarjetas (según las notas, las más vistas). Tarjeta: título, descripción y tags.
- **Filtro por categoría:** el chip seleccionado se resalta, "New category" pasa a **Clear filters** y se muestra la cuadrícula completa de esa categoría en tres columnas.

**Detalle de entrada**

- Flecha de volver, título y acción **Edit entry**.
- Galería de imágenes, tags y cuerpo en Markdown renderizado, con enlaces internos a otras entradas y referencias numeradas. La página hace scroll. La sintaxis de los enlaces internos no está definida.
- "Simplificadas" (decisión del autor): se descartan los campos de traducción y de aprobación. **[Propuesta]** el resto de la entrada (imágenes, tags, referencias) se mantiene como en el diseño.

**Edición de entrada**

- "Edit entry - <nombre>" con **Discard changes** / **Save changes**.
- Editor Markdown "en vivo" (se ve la sintaxis de los títulos), tags con **+ Tag** e imágenes incrustadas.
- Panel **Version history** a la derecha: "Current Version" y versiones anteriores con fecha, hora y autor.

**Comparación de versiones** — hay **dos diseños** y falta confirmar cuál es el vigente en Figma:

- **A. Página "Compare versions"** con **Go back** y **Restore version**: dos columnas, _Current Version_ (punto verde) y la versión del historial (punto gris). Los cambios se resaltan sobre la columna actual: añadido en azul `#353967`; eliminado tachado sobre `#272729`; barra lateral en los bloques modificados.
- **B. Modal "Older Version"** sobre la pantalla de edición, con punto naranja, fecha y hora, **Restore version** y cierre `×`. Muestra la versión antigua con el texto eliminado tachado sobre un bloque resaltado.

### 5.6 Ajustes — Miembros

- Página "Settings" con navegación lateral: "← Back to translation space", General settings, **Members**, Workspace projects. Este formato es la base para el resto de páginas de ajustes.
- **Team Members** con contador ("6 members") y botón primario **Invite members to workspace**.
- Búsqueda por nombre o email, y filtros _All categories_ y _All sub-teams_.
- Tabla: casilla de selección (también en el encabezado), _Member_ (iniciales, nombre y email), _Category_ (desplegable Manager / Worker), _Sub-team_ (desplegable), _Status_ (Active / Invited) y _Actions_ (**Remove**).
- Pie: "Showing all N members" y "5 active · 1 invitation pending".
- Leyenda: **Manager** "Manages members, sub-teams and translation reviews."; **Worker** "Translates and edits content assigned to their team."; "Removing a member keeps their existing translations."
- Los workers solo ven aquello en lo que participan; los managers ven todo (en v1, simulado).
- **Conflicto:** la columna y el filtro _Sub-team_ contradicen la decisión de dejar los sub-equipos fuera de alcance (decisión abierta 4).

## 6. Reglas de negocio y vocabulario

- **Estados (canónicos):** `Not started`, `In progress`, `Under Review`, `Completed`. Orden al ordenar por status: In progress > Under Review > Not started > Completed.
- **Prioridades (canónicas):** `Urgent`, `High`, `Medium`, `Low`, `None`.
- **Progreso [Propuesta]:** el de un content item = traducciones completadas ÷ (imágenes × idiomas de destino), "across all languages"; el de una sección = media de sus items; el del proyecto = media de sus secciones; el de un idioma = traducciones completadas de ese idioma ÷ total de imágenes. Los porcentajes del diseño son datos de ejemplo, no requisitos.
- El idioma original **no** cuenta como idioma de destino.
- Mover un content item a otra sección conserva sus traducciones y su progreso.
- Quitar a un miembro conserva sus traducciones.

## 7. Decisiones

### Resueltas

1. **Origen del texto:** OCR sobre la imagen.
2. **Previsualización sobre la escena:** descartada (ver sección 8). La ayuda para saber si el texto cabe son los contadores de caracteres y líneas.
3. **Comparación de traducciones:** tarjetas de idiomas bajo el editor, visual; no colaborativa.
4. **Prioridad:** Urgent, High, Medium, Low, None.
5. **Language progress:** panel con % y estado por idioma, contador y botón _Add language_; en la lista, popover de progreso por idioma.
6. **Sub-equipos por idioma:** fuera de alcance (pero ver conflicto en 5.6).
7. **Formatos:** exportación JSON y CSV; importación de PO/XLIFF en v2.
8. **Textos por imagen:** una imagen = un bloque de texto.
9. **Idioma original:** configurable por proyecto. English como idioma de destino en el ejemplo es un fallo del diseño de muestra.
10. **Export to code:** exporta un archivo JSON con las traducciones.
11. **Datos de ejemplo incoherentes:** son datos de relleno.
12. **Glosario por proyecto**, accesible desde los detalles de proyecto y de sección y desde el editor.
13. **Glosario solo con entradas Markdown simplificadas:** se eliminan el término → traducción por idioma y el estado _Approved_.
14. **Texto original editable al hacer clic**, con etiqueta "edited"; sin paso de revisión imagen por imagen.
15. **Modal de crear proyecto** incluye idioma original (y los idiomas del proyecto).
16. **Filtro de estado:** "In progress". **Varios managers** por proyecto.
17. **Submit for review** actúa sobre la sección.
18. **Terminología:** Section (acto) > Content item > Image.
19. **Progreso en la lista:** popover por idioma al pasar el ratón sobre el estado.
20. **Figma es la fuente de verdad visual y puede ser más reciente que las capturas.** Claude Code debe conectarse al MCP de Figma y **preguntar cada vez** cuál es la versión vigente cuando haya varias versiones de una pantalla.

### Abiertas — bloquean el modelo o el flujo

1. **Transiciones de revisión.** Qué cambia el estado de una traducción (_Mark translated_, _Submit for review_ a nivel de sección), quién pasa a _Completed_ y dónde se muestra el revisor (las notas piden mostrar quién tradujo y quién revisó; el diseño solo muestra al autor). Ver la propuesta en 5.4.
2. **Metadatos del texto original.** El OCR no detecta hablante, tipo ni nota de contexto. **[Propuesta]** que la acción de editar el texto original los cubra también.
3. **Modal "Add content to section" incompleto.** No tiene confirmar/cancelar, nombre ni tipo del content item, título de las imágenes ni estado del OCR (progreso, errores, texto vacío).
4. **Sub-teams.** Ajustes > Miembros tiene columna y filtro _Sub-team_ ("Manages members, sub-teams…", "content assigned to their team"), pero se decidió dejarlos fuera. O se quitan de Figma, o se mantienen como asignación de idioma del worker.
5. **Esquema del JSON de "Export to code"** (qué incluye: ¿solo traducciones completadas?, ¿idiomas elegibles?, claves) y dónde se exporta el CSV.
6. **Páginas de navegación sin diseño:** Notifications, Assigned to me, Comments, General settings, Workspace projects. **[Propuesta]** quedan fuera de v1.
7. **Panel de glosario del editor.** Rediseñar para mostrar la entrada Markdown (título, descripción corta, tags) y definir qué es una coincidencia.
8. **Comparación de versiones del glosario:** elegir entre la página A y el modal B (ver 5.5).
9. **Contenido de demostración.** No hay juego propio. Opciones en discusión: mundo ficticio con arte CC0, obra de dominio público como universo del glosario, o un juego de código abierto con licencia compatible. Hasta decidirlo, usar contenido ficticio propio.

### Abiertas — menores

- **Release Date** como trimestre ("Q3 2025"): modelar como trimestre o texto libre.
- **Etiqueta "Manager"** en el overview con varios managers: pasar a "Managers".
- **Etiquetas de proyecto** (género, etc.) de las notas: no aparecen en ningún diseño.
- **Nombres:** "Not-started" con guion en Languages Progress; "Started" en el filtro anterior.
- **Detalles de diseño:** "88" y "100" sin "%" en una versión del detalle de proyecto; "Images in this section" por "item"; erratas en los datos de ejemplo del glosario; línea blanca suelta en la fila de Lucas Moreau de Ajustes.
- **Banderas** para representar idiomas en el popover de progreso: confirmar que se mantienen.
- **Tipos de content item** ("Mission dialogue", "Character dialogue"): ¿lista cerrada o libre?
- **Icono del proyecto** junto al título del glosario: ¿campo del proyecto?
- **Cuántas tarjetas de comparación** caben a la vez en el editor.
- **Permisos de edición del texto original** (propuesta: managers).

## 8. Fuera de alcance en v1

Autenticación real, invitaciones por email reales, notificaciones, sincronización entre usuarios, traducción con IA, vistas Kanban y Timeline, importación de PO/XLIFF, páginas sin diseño (ver sección 4), y **previsualización del texto traducido sobre la imagen del juego**: la herramienta no puede reescribir el texto dentro de la escena sin renderizarlo con la fuente y el cuadro del propio juego, así que no se plantea ni como futuro.

## 9. Referencias de diseño

Copiar las capturas de Attachments a `docs/design/` con nombres descriptivos. Hay capturas duplicadas: usar una de cada.

| Pantalla                                                           | Archivo sugerido                     | Notas                                    |
| ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------- |
| Lista de proyectos (navegación nueva)                              | `proyectos-lista.png`                | Vigente                                  |
| Lista de proyectos (navegación antigua)                            | `proyectos-lista-nav-antigua.png`    | Secundaria                               |
| Progreso por idioma (popover)                                      | `proyectos-progreso-popover.png`     |                                          |
| Filtros: aplicados, Status, Workers, Platforms, Managers, Priority | `proyectos-filtros-*.png`            | Status dice "Started": versión anterior  |
| Menú de filtros (versión anterior)                                 | `proyectos-filtros-menu-antiguo.png` | Secundaria                               |
| Crear proyecto                                                     | `proyecto-crear.png`                 | Falta idioma original y varios managers  |
| Detalle de proyecto                                                | `proyecto-detalle.png`               | Usar la versión con porcentajes visibles |
| Detalle de sección                                                 | `seccion-detalle.png`                |                                          |
| Mover a otra sección (popover)                                     | `seccion-mover-items.png`            |                                          |
| Añadir contenido (3 estados)                                       | `seccion-anadir-contenido.png`       |                                          |
| Editor de traducciones                                             | `editor.png`                         |                                          |
| Glosario overview                                                  | `glosario-overview.png`              | Navegación antigua                       |
| Glosario filtrado por categoría                                    | `glosario-categoria-locations.png`   |                                          |
| Glosario detalle                                                   | `glosario-detalle.png`               |                                          |
| Glosario edición e historial                                       | `glosario-edicion.png`               |                                          |
| Glosario comparación A (página)                                    | `glosario-comparacion-a.png`         |                                          |
| Glosario comparación B (modal)                                     | `glosario-comparacion-b.png`         |                                          |
| Ajustes — Miembros                                                 | `ajustes-miembros.png`               |                                          |

> **Derechos de autor:** las capturas usan imágenes y textos de Final Fantasy VII (escena del juego, arte de personajes, artículos del glosario) y nombres de otros juegos. Para un repositorio público conviene sustituirlos por contenido propio, libre o de dominio público en `docs/design/` y en los datos de demostración (decisión abierta 9).
