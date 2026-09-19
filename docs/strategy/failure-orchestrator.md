# Failure Triage Orchestrator

## Objetivo

Ir un paso mas alla del triage local (`docs/strategy/playwright-reporting.md`):
cuando una corrida de Playwright falla contra staging, correr un proceso
headless que junte evidencia de tres fuentes y le pida a Claude una hipotesis
de causa raiz, en vez de dejar que un humano tenga que cruzar manualmente el
reporte de Playwright, los logs del backend y los ultimos cambios de codigo.

Fuentes de evidencia:

1. El triage local ya generado por `TriageReporter` (`summary.json` por test
   fallido: error, metadata E2E, clasificacion heuristica).
2. Logs del backend de staging, filtrados a la ventana de tiempo de la
   corrida.
3. Los ultimos PRs mergeados en `personal-finance-frontend` y
   `personal-finance-api-nodeJS`, por si algo reciente explica la falla.

Corre en GitHub Actions, sin infraestructura propia (no AWS). Ver la
discusion de por que en el historial del repo/PR que introdujo esto; en
resumen: valida la logica del agente primero con lo que ya existe (secrets de
Actions), migra a algo mas robusto (GitHub App, Step Functions) solo si esto
demuestra valor y necesita correr con mas frecuencia o mas permisos.

## Arquitectura

```text
workflow_run (PR Checks | Staging Destructive) termina en failure
  │
  ▼
.github/workflows/triage-orchestrator.yml
  │
  ├─ download-artifact: triage-*  (generado por TriageReporter, subido por
  │   los workflows de test)              → triage-input/
  │
  ├─ ssh (key restringida)  → docker logs del backend     → orchestrator-context/backend-logs.txt
  │
  ├─ gh pr list (PAT fine-grained)  → PRs recientes FE/BE   → orchestrator-context/*-prs.json
  │
  ├─ scripts/triage-orchestrator.mjs
  │     arma un prompt por corrida con las 3 fuentes y llama a la API de
  │     Claude → triage-input/<testRunId>/orchestrator-summary.md
  │
  └─ upload-artifact: triage-root-cause-<runId>
```

Nada de esto se commitea al repo: `triage/` es local/CI-only (ver
`.gitignore`), y el resultado final queda como artifact de la corrida del
orchestrator, descargable desde GitHub Actions.

## Secrets requeridos

| Secret | Para que | Alcance |
| --- | --- | --- |
| `TRIAGE_SSH_KEY` | Leer logs del backend de staging por SSH | Key dedicada, restringida por `command=` a un unico comando de lectura. **No** es la misma que `SERVER_SSH_KEY` del deploy. |
| `TRIAGE_SSH_USER` | Usuario SSH asociado a esa key | Usuario nuevo y de baja fricción de revocar, separado del usuario de deploy. |
| `CROSS_REPO_READ_TOKEN` | Leer PRs mergeados de frontend y backend | Fine-grained PAT, solo lectura, scoped a los 3 repos. |
| `ANTHROPIC_API_KEY` | Llamar a la API de Claude | Key de cuenta de Anthropic. **Pendiente** (ver estado abajo). |

`SERVER_HOST` se reutiliza del secret que ya existe para el deploy (mismo
servidor, no hace falta duplicarlo).

### Estado actual (2026-09-18)

- `TRIAGE_SSH_KEY` / `TRIAGE_SSH_USER`: cargados y verificados con datos
  reales (la metadata E2E ya aparece en `docker logs finanzas-api-test` en
  producción de staging).
- `CROSS_REPO_READ_TOKEN`: cargado y probado trayendo PRs reales de los 3
  repos.
- `ANTHROPIC_API_KEY`: **pendiente a propósito.** El plan Pro de Claude no
  incluye acceso a la API (son productos separados, con facturación propia
  en `console.anthropic.com`). Se decidió no darlo de alta todavía; mientras
  tanto el orchestrator sigue funcionando en modo dry-run automáticamente
  (`scripts/triage-orchestrator.mjs` cae a dry-run cuando no encuentra esta
  key), así que no bloquea nada. Se evaluó tambien usar otro proveedor
  (OpenAI/Gemini) como alternativa mas barata para probar — sigue abierto,
  `callClaude()` esta aislado en una sola funcion para que el cambio de
  proveedor sea chico el dia que se decida.

Si alguno de estos secrets no esta configurado, los pasos correspondientes
degradan con gracia (log de "no configurado" en vez de romper el job), asi
que este flujo se puede activar de forma incremental.

## Runbook de setup

### 1. SSH key restringida para logs

En tu maquina (no en el server):

```bash
ssh-keygen -t ed25519 -f triage_agent_key -C "triage-orchestrator" -N ""
```

En el servidor Hetzner, como el usuario que va a recibir la conexion (puede
ser un usuario nuevo dedicado, o el mismo usuario de deploy si preferis no
crear uno nuevo, pero **no reutilices su authorized_keys sin la restriccion
de comando**):

```bash
# confirmar el nombre real del contenedor de la API antes de fijarlo:
docker ps --filter "name=finanzas" --format "{{.Names}}"
```

Agregar a `~/.ssh/authorized_keys` de ese usuario, en una sola linea (con el
nombre de contenedor confirmado arriba en lugar de `<API_CONTAINER_NAME>`):

```text
command="docker logs <API_CONTAINER_NAME> --since 30m 2>&1",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... triage-orchestrator
```

La parte `command="..."` es lo que importa: fuerza ese comando exacto sin
importar que pida el cliente SSH. Aunque la key se filtre, no se puede abrir
una shell ni correr otro comando con ella.

Guardar como secrets en GitHub (`Settings > Secrets and variables >
Actions`):

- `TRIAGE_SSH_KEY`: contenido de `triage_agent_key` (la privada).
- `TRIAGE_SSH_USER`: el usuario usado arriba.

Borrar la copia local de la key privada una vez cargada como secret.

### 2. Fine-grained PAT para leer PRs

En GitHub: `Settings > Developer settings > Personal access tokens >
Fine-grained tokens > Generate new token`.

- Resource owner: tu cuenta (`ftrabucco`).
- Repository access: **solo** `personal-finance-test-automation`,
  `personal-finance-frontend`, `personal-finance-api-nodeJS`.
- Permissions: `Contents: Read-only`, `Pull requests: Read-only`. Nada mas.
- Expiration: la mas corta que te resulte comoda de renovar (90 dias es un
  buen default).

Guardar el token como secret `CROSS_REPO_READ_TOKEN`.

### 3. Anthropic API key

Guardar como secret `ANTHROPIC_API_KEY`.

## Como probarlo

Sin secrets, localmente, con datos de ejemplo (no llama a la API real):

```bash
TRIAGE_INPUT_DIR=./algun-fixture/triage-input \
TRIAGE_CONTEXT_DIR=./algun-fixture/orchestrator-context \
TRIAGE_DRY_RUN=true \
npm run triage:orchestrate
```

Esto escribe el prompt armado en `orchestrator-summary.md` en vez de llamar a
Claude, util para revisar que el contexto que se junta tiene sentido.

Con los secrets ya cargados, se puede disparar manualmente contra una corrida
vieja sin esperar a que falle una nueva:

```bash
gh workflow run "Failure Triage Orchestrator" -f run_id=<id de una corrida fallida de PR Checks o Staging Destructive>
```

## Limitaciones conocidas

- La ventana de logs del backend es fija (`--since 30m` en el ejemplo)
  porque el comando esta forzado en el servidor por seguridad; no se puede
  parametrizar por request sin bajar esa restriccion.
- El diagnostico de Claude es una hipotesis de primera pasada: cita
  evidencia, pero sigue necesitando confirmacion humana antes de tratarlo
  como veredicto o de abrir un issue.
- No crea issues ni comenta PRs automaticamente todavia (a proposito, ver
  `automation-backlog.md`: eso queda para cuando haya confianza en la calidad
  del diagnostico).
- Cada corrida con fallas cuesta una llamada a la API de Claude por
  `testRunId`; si el volumen de fallas crece mucho, conviene revisar costo
  antes de bajar el trigger a algo mas frecuente que "por corrida fallida".

## Proximos pasos posibles

- Migrar `CROSS_REPO_READ_TOKEN` a una GitHub App cuando esto corra seguido
  y valga la pena la mejor higiene de secrets/auditoria (token de vida
  corta, identidad de bot propia).
- Publicar el `orchestrator-summary.md` como comentario en el PR relevante,
  con aprobacion manual.
- Si el volumen o la complejidad de orquestacion crecen mas alla de lo que
  GitHub Actions maneja comodo, migrar el trigger/runtime a AWS (Step
  Functions/Lambda) manteniendo la misma logica de `scripts/triage-orchestrator.mjs`.
