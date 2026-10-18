# Translator Software

Herramienta de traducción de videojuegos que une la parte visual (escenas del juego) con el conocimiento del mundo (glosario por proyecto) y el trabajo en equipo con peer review. El texto original de cada escena entra mediante OCR sobre las imágenes.

Es un proyecto de portfolio que a futuro será **open source**. La v1 es un showcase local, de un solo usuario, fiel al diseño de Figma. No tiene que ser perfecta, pero sí estar limpia y bien organizada.

## Fuentes de verdad

- **Figma** (vía MCP): verdad **visual** y la más reciente. Estructura de pantallas, componentes, colores, tipografías, espaciados y textos de interfaz. Los frames vigentes están en la sección ordenada del archivo.
- **`docs/SPEC.md`**: verdad de **comportamiento** y de modelo de datos (qué hace cada acción, estados, reglas, decisiones). Léelo antes de empezar cualquier tarea.
- **`docs/design/`**: capturas del diseño. Son respaldo y referencia rápida; **pueden ser versiones anteriores a Figma**. La tabla de correspondencia está al final de `SPEC.md`.
- **Versiones del diseño:** antes de construir cada pantalla, consulta el frame en Figma y **pregunta al usuario cuál es la versión vigente** si hay varias versiones (por ejemplo, el detalle de proyecto, el menú de filtros o la comparación de versiones del glosario) o si captura y Figma no coinciden. No asumas que una captura es la última.
- Si Figma y la spec se contradicen, o algo está ambiguo, **pregunta y deja la decisión anotada** en `docs/DECISIONS.md`; no asumas en silencio.
- Algunas capturas muestran la **navegación antigua** (Projects, Glossary). La vigente está en la sección 4 de `SPEC.md`.

## Alcance actual

- Trabaja solo en lo marcado como **v1** en `SPEC.md`.
- Usuarios, roles y permisos se simulan con un selector de usuario actual. No implementes autenticación, backend, envío real de invitaciones ni notificaciones. Ajustes > Miembros se construye solo en local.
- El texto detectado por OCR se **edita al hacer clic** y muestra la etiqueta "edited" si cambia. No construyas un paso de revisión imagen por imagen.
- **No** implementes la traducción con IA ni la previsualización del texto traducido sobre la imagen (está descartada, no es "para más adelante").
- **No** construyas las páginas sin diseño (Notifications, Assigned to me, Comments, General settings, Workspace projects) ni los sub-teams, hasta que se resuelvan las decisiones abiertas 4 y 6 de `SPEC.md`.
- No construyas pantallas ni funciones que no estén en el diseño ni en la spec. Hay flujos sin diseñar (el modal "Add content to section" no tiene confirmar ni nombre del item, la acción de editar el texto original, el estado del OCR): propón la solución y espera confirmación.

## Vocabulario canónico

- Jerarquía: Workspace > Project > Section (un acto) > Content item > Image. Una imagen = un bloque de texto; la traducción se hace por imagen e idioma.
- Estados: `Not started`, `In progress`, `Under Review`, `Completed`. Si una captura dice "Started", úsalo como `In progress`.
- Prioridades: `Urgent`, `High`, `Medium`, `Low`, `None`.
- Un proyecto tiene **uno o varios managers**, un **idioma original** (no cuenta como idioma de destino) e idiomas de destino.
- **Submit for review** actúa sobre la sección, aunque el botón esté en el editor de un content item.
- El glosario es **por proyecto**, solo con **entradas Markdown simplificadas** (sin traducción por idioma ni estado "Approved"), y no es un elemento de la navegación general.
- Usa los textos de interfaz del diseño tal cual (en inglés) y añade siempre su traducción al español: la interfaz está disponible en inglés y español.

## Arquitectura

- El acceso a datos va **siempre** detrás de una interfaz (repositorio/servicio). La UI nunca toca directamente el almacenamiento. Objetivo: poder cambiar la persistencia local por un backend en v2 sin reescribir la UI.
- **Export to code** descarga un archivo **JSON** con las traducciones; también se prevé CSV. Los formatos se implementan como adaptadores separados para que otras personas puedan añadir más (PO, XLIFF en v2). El esquema del JSON está por definir: propónlo y espera confirmación.
- El OCR debe estar detrás de una interfaz propia (proveedor intercambiable) y su resultado debe poder corregirse a mano. Guarda la posición de cada cuadro de texto si el proveedor la ofrece, aunque la v1 no la use.
- Piensa en la app como web, aunque luego se empaquete como escritorio.

## Stack

Decidido (ver `docs/DECISIONS.md`): SPA **local-first** desplegada en Vercel, preparada para un backend.
- TypeScript estricto + React 19 + Vite + React Router. Alias `@/` → `src/`.
- Estilos: Tailwind CSS v4. Los tokens semánticos de `src/styles/tokens.css` (tema oscuro de Figma y claro propuesto) se exponen como utilidades (`bg-surface`, `text-text-secondary`…). **Nunca** pongas colores sueltos en los componentes.
- Primitivas accesibles: Radix UI (`radix-ui`). Iconos de Figma en `src/assets/icons` como componentes SVG (`?react`) con `currentColor`.
- i18n: i18next. **Interfaz en inglés y español**: cada texto va por clave en `src/i18n/locales/{en,es}.json` (un test verifica que tengan las mismas claves). El contenido de los proyectos no se traduce.
- Temas claro y oscuro (`data-theme` en `<html>`), con el interruptor en el menú del avatar.
- Datos (desde la fase 1): interfaces de repositorio + Dexie (IndexedDB) + TanStack Query. `VITE_DATA_SOURCE=local|remote`. La UI (`src/features`, `src/ui`) no puede importar implementaciones de almacenamiento (regla de ESLint).
- Tests: Vitest + Testing Library. Lint: ESLint + Prettier (Prettier no toca los `.md` ni `docs/`).

## Convenciones

- Código, nombres de variables, commits y comentarios en inglés.
- Componentes pequeños y reutilizables. Usa las variables de color y tipografía del diseño en lugar de valores sueltos (por ejemplo, en la comparación de versiones del glosario: añadido `#353967`, eliminado tachado sobre `#272729`).
- Escribe tests para la lógica de dominio (progreso, ordenación, filtros, estados, mover items, versiones del glosario, exportación).
- Datos de demostración: contenido propio, libre o de dominio público. **Nunca** textos, capturas ni arte de juegos comerciales en el repo ni en la demo (las capturas de diseño usan material de Final Fantasy VII: no lo copies a los datos de ejemplo). Hasta que se decida el mundo de demostración (decisión abierta 9), usa contenido ficticio. Mantén los datos **coherentes entre pantallas**: los porcentajes y estados del diseño son relleno, no requisitos.
- Mantén `docs/DECISIONS.md` actualizado con las decisiones técnicas importantes y su motivo.

## Flujo de trabajo

1. Lee `docs/SPEC.md` y consulta los frames de Figma relevantes (por enlace al frame, pantalla a pantalla). Pregunta por la versión vigente si hay dudas.
2. En modo plan, devuelve una arquitectura y una lista de fases. Espera mi confirmación.
3. Construye por fases verticales y completas, en este orden sugerido: modelo de datos y capa de acceso, lista de proyectos y crear proyecto, detalle de proyecto y de sección, flujo de imágenes con OCR, editor de traducciones, glosario, ajustes de miembros, exportación.
4. Después de cada fase, deja la app ejecutable y actualiza este archivo si cambian los comandos.
5. Si algo de la especificación es ambiguo (ver "Decisiones abiertas" en `SPEC.md`), pregunta en vez de asumir.

## Comandos

- Instalar: `npm install`
- Desarrollo: `npm run dev` (http://localhost:5173)
- Tests: `npm test` (o `npm run test:watch`)
- Lint: `npm run lint` · Formato: `npm run format` · Tipos: `npm run typecheck`
- Build: `npm run build` (salida en `dist/`) · Previsualizar: `npm run preview`
