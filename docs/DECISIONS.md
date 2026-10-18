# Decisiones

Registro de decisiones técnicas y de diseño con su motivo. Las decisiones de producto viven en `SPEC.md` (sección 7); aquí se anota cómo se aplican y lo que se decide durante la construcción.

## Stack y despliegue

### D1. React + TypeScript + Vite, SPA local-first (2026-10-18)
- **Decisión:** SPA con React 19, TypeScript estricto, Vite y React Router. Se descartan Next.js y SvelteKit.
- **Motivo:** es el ecosistema más popular para atraer contribuciones, se publica como sitio estático (Vercel) y se empaqueta como escritorio sin cambios. Hay librerías maduras para OCR (Tesseract.js), Markdown (CodeMirror 6) y drag & drop (dnd-kit). Next.js solo aportaría si el backend viviera en la misma app ya en v1.

### D2. Demo local-first, preparada para backend (2026-10-18)
- **Decisión:** la demo pública guarda los datos en el navegador (IndexedDB): cada visitante tiene su sandbox, sembrado en la primera carga y reseteable. No hay base de datos compartida.
- **Motivo:** una base de datos compartida en una demo pública acaba vandalizada, y exige auth, límites y costes. La preparación para backend se garantiza con:
  - repositorios async con IDs UUID y `createdAt`/`updatedAt`/`createdBy`; la UI no combina stores;
  - dominio puro (sin APIs del navegador), reutilizable en un servidor;
  - interruptor `VITE_DATA_SOURCE=local|remote` (`local` por defecto);
  - regla de ESLint que impide a `src/features` y `src/ui` importar implementaciones de almacenamiento.
- **v2:** el adaptador de referencia será **Supabase** (open source y self-hostable: Postgres, auth, storage, realtime). Quien haga fork puede implementar las mismas interfaces contra su propia API.

### D3. Estilos con Tailwind v4 + tokens semánticos (2026-10-18)
- **Decisión:** los colores y fuentes de Figma se definen como variables CSS semánticas en `src/styles/tokens.css` y se exponen a Tailwind con `@theme inline`. Los componentes solo usan esas utilidades.
- **Motivo:** permite el tema claro sin tocar componentes y mantiene la fidelidad a las variables de Figma (cada token anota su variable de origen).
- **Fuentes:** Inter (cuerpo) y Roboto (títulos), autoalojadas con `@fontsource-variable` para que la app funcione sin conexión y como escritorio.
- **Iconos:** los SVG de Figma se guardan tal cual en `src/assets/icons`; solo se cambia el color fijo por `currentColor` para que sigan el tema.

### D4. Interfaz en inglés y español (2026-10-18)
- **Decisión:** i18next con `en` (por defecto y respaldo) y `es`. Se detecta el idioma del navegador y la elección se guarda en localStorage. Las claves están tipadas y un test exige que ambos idiomas tengan las mismas claves.
- **Alcance:** solo los textos de la interfaz. El contenido de los proyectos (textos originales, glosario) no se traduce con i18n.

### D5. Tema claro y oscuro (2026-10-18)
- **Decisión:** el tema oscuro sale de Figma. El claro es una **propuesta** sin diseño: mismos tokens semánticos con valores propios (pendiente de revisión del autor). Por defecto sigue `prefers-color-scheme`; un script en `index.html` aplica el tema antes del primer pintado.
- **Ajustes del tema claro:** el texto en color de acento usa un amarillo oscuro (`--accent-text`) para mantener el contraste, y el color de plataforma PC se oscurece porque el azul claro original no se ve sobre blanco.

### D6. Menú de usuario en el avatar (2026-10-18) — *propuesta, sin diseño*
- **Decisión:** el avatar de abajo a la izquierda abre un menú con **Tema** (System / Light / Dark) e **Idioma** (English / Español). En la fase 1 se le añade el selector de usuario actual simulado.
- **Motivo:** el avatar ya existe en el diseño y no tiene función asignada; así no se añaden elementos nuevos a la navegación.

## Diseño (versiones vigentes y huecos)

### D7. Comparación de versiones del glosario: página A (2026-10-18)
- **Decisión:** se usa la página "Compare versions" (frame `370:6934`), no el modal "Older Version" (`370:6687`).
- **Motivo:** solo la vista lado a lado muestra lo **añadido** (`#353967`) y lo **eliminado** (tachado sobre `#272729`); para decidir un *Restore* hay que ver ambos sentidos. Se abre desde el *Version history* y *Go back* vuelve a la edición.

### D8. Add new project: managers e idiomas (2026-10-18)
- **Decisión:** Figma no está actualizado. Se añaden **Managers** (selección múltiple con chips de avatar, como *Team members*), **Original language \*** (desplegable obligatorio) y **Target languages** (chips como *Platforms*, opcional, sin el idioma original).

### D9. Overview del glosario (2026-10-18)
- **Decisión:** se usan los textos de Figma, "Create new category" y "Add entry". La vista de lista A-Z (el conmutador del diseño) se diseña con el autor durante la fase del glosario.

### D10. Sin sub-teams (2026-10-18) — resuelve la decisión abierta 4
- **Decisión:** se quitan la columna y el filtro *Sub-team* de Ajustes > Miembros, y no hay campo en el modelo. Los textos de la leyenda que los nombran se ajustarán con el autor.

### D11. Navegación sin diseño desactivada (2026-10-18) — *propuesta para la decisión abierta 6*
- **Decisión:** Notifications, Assigned to me, Comments, General settings y Workspace projects se muestran **desactivadas** (con el tooltip "Not available yet") y no tienen ruta.

### D12. Detalle de proyecto (2026-10-18)
- **Decisión:** frame `370:10566`, con los porcentajes visibles. Se añade el "%" que falta en "88" y "100".

### D13. Acento amarillo solo donde lo usa el diseño (2026-10-18)
- **Observación:** el editor y Ajustes usan botones primarios amarillos (`Main/Accent`); el resto de pantallas usa botones neutros. Se respeta tal cual.

## Herramientas

### D15. Prettier no formatea la documentación (2026-10-18)
- **Decisión:** `.prettierignore` excluye `*.md`, `docs/` y `src/assets/`.
- **Motivo:** se mantiene el formato que escribe el autor. Una primera pasada de Prettier solo había añadido líneas en blanco bajo los títulos de `CLAUDE.md` y `SPEC.md`, sin cambiar el contenido.

### D14. Límite del MCP de Figma (2026-10-18)
- **Observación:** el plan Starter de Figma limita las llamadas al MCP. Las URLs de assets descargados no consumen llamadas. Para cada fase conviene pedir el contexto de diseño solo de los nodos necesarios.

## Pendientes

Decisiones que siguen abiertas, con la fase en la que bloquean:

| Tema | Bloquea | Estado |
|---|---|---|
| Licencia del repositorio | Publicación open source | Sin decidir (no se declara ninguna en `package.json`) |
| Capturas de `docs/design/` (arte de FFVII) | Repo público | Excluidas de git (D16); sustituir por material propio si se quieren versionar |
| Revisión del tema claro (D5) | — | Propuesta, pendiente de revisión del autor |
| Menú de usuario en el avatar (D6) | — | Propuesta, pendiente de confirmación |
| Páginas sin diseño (SPEC abierta 6) | — | Propuesta D11: desactivadas |
| Modal "Add content to section" incompleto (SPEC abierta 3) | Fase 4 | Se propondrá antes de la fase |
| Transiciones de revisión (SPEC abierta 1) | Fase 5 | Se propondrá antes de la fase |
| Panel de glosario del editor (SPEC abierta 7) | Fase 5 | Se propondrá antes de la fase |
| Vista de lista A-Z del glosario (D9) | Fase 6 | Se diseña con el autor durante la fase |
| Sintaxis de enlaces internos del glosario (propuesta `[[Título]]`) | Fase 6 | Por confirmar |
| Leyenda de Miembros sin sub-teams (D10) | Fase 7 | Texto por confirmar |
| Esquema JSON de Export to code y ubicación del CSV (SPEC abierta 5) | Fase 8 | Se propondrá antes de la fase |
| Contenido de demostración (SPEC abierta 9) | Fase 1 (seed) | Contenido ficticio propio hasta decidirlo |

### D16. Las capturas de diseño no se versionan (2026-10-18)
- **Decisión:** `docs/design/` está en `.gitignore`. Las capturas siguen en local como referencia, pero no entran en el repositorio.
- **Motivo:** contienen arte y textos de Final Fantasy VII. `CLAUDE.md` prohíbe material de juegos comerciales en el repo, y si entraran en un commit quedarían en el historial aunque se borraran después.
