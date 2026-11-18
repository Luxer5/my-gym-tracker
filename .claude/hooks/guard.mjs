// Hook PreToolUse: pide confirmación antes de desplegar y no deja editar el lockfile a mano.
// Recibe por stdin el JSON de la herramienta y responde con una decisión de permisos.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    return; // sin datos: no decide nada
  }
  const tool = data.tool_name ?? '';
  const args = data.tool_input ?? {};

  const decide = (permissionDecision, permissionDecisionReason) =>
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision,
          permissionDecisionReason,
        },
      }),
    );

  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(args.command ?? '');
    if (/\bfirebase(\.cmd)?\s+deploy\b/i.test(cmd)) {
      decide('ask', 'Despliegue al proyecto real de Firebase: confirma antes de ejecutarlo.');
    } else if (/\bgit\s+push\b/i.test(cmd) && /\bmain\b/.test(cmd)) {
      decide('ask', 'Un push a main publica la web en Netlify: confirma antes.');
    }
    return;
  }

  // MCP de Firebase: desplegar o escribir en el proyecto real (no en el emulador)
  if (tool.startsWith('mcp__firebase__')) {
    if (/deploy|delete|update|add|set|create|send/i.test(tool.slice('mcp__firebase__'.length))) {
      decide('ask', 'Cambio en el proyecto real de Firebase: confirma antes de ejecutarlo.');
    }
    return;
  }

  const file = String(args.file_path ?? '');
  if (/(^|[\\/])package-lock\.json$/i.test(file)) {
    decide('deny', 'package-lock.json no se edita a mano: usa npm install / npm uninstall.');
  }
});
