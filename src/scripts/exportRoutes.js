const fs = require('fs');
const path = require('path');

/**
 * Exporte une liste "statique" des routes Express définies dans src/routes/*.routes.js
 * (basé sur un parsing simple des appels router.METHOD('/path', ...)).
 *
 * Limites:
 * - Ne détecte pas les routes construites dynamiquement (template strings, concat, etc.)
 * - Ne détecte pas automatiquement les préfixes montés dans d'autres fichiers (on les calcule ici)
 */

const projectRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.join(projectRoot, 'src');
const routesDir = path.join(srcRoot, 'routes');

const METHOD_RE = /router\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2\s*,/gi;
const USE_RE = /router\.use\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*([^\)]+)\)/gi;
const REQUIRE_ASSIGN_RE = /const\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"`])([^'"`]+)\2\s*\)\s*;?/g;

function normalizePath(p) {
  if (!p) return '';
  // ensure leading slash
  if (!p.startsWith('/')) p = `/${p}`;
  // remove trailing slash (except root)
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function joinPaths(a, b) {
  a = normalizePath(a);
  b = normalizePath(b);
  if (a === '/') a = '';
  return normalizePath(`${a}${b}`);
}

function parseRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];

  // map: variableName -> requirePath
  const requireMap = {};
  REQUIRE_ASSIGN_RE.lastIndex = 0;
  let ra;
  while ((ra = REQUIRE_ASSIGN_RE.exec(content)) !== null) {
    requireMap[ra[1]] = ra[3];
  }

  METHOD_RE.lastIndex = 0;
  let m;
  while ((m = METHOD_RE.exec(content)) !== null) {
    routes.push({ method: m[1].toUpperCase(), path: normalizePath(m[3]) });
  }

  USE_RE.lastIndex = 0;
  const mounts = [];
  let u;
  while ((u = USE_RE.exec(content)) !== null) {
    const mountPath = normalizePath(u[2]);
    const target = u[3].trim();

    // cas: router.use('/x', require('./y'))
    const directReq = target.match(/require\(\s*(['"`])([^'"`]+)\1\s*\)/);
    if (directReq) {
      mounts.push({ mountPath, modulePath: directReq[2] });
      continue;
    }

    // cas: router.use('/x', myRoutes)
    const varName = target.match(/^([A-Za-z_$][\w$]*)$/);
    if (varName && requireMap[varName[1]]) {
      mounts.push({ mountPath, modulePath: requireMap[varName[1]] });
    }
  }

  return { routes, mounts };
}

function resolveRequire(fromFile, reqPath) {
  // only handle local requires
  if (!reqPath.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), reqPath);
  const candidates = [
    `${base}.js`,
    `${base}.cjs`,
    path.join(base, 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function collectAllRoutes(entryFile, prefix) {
  const { routes, mounts } = parseRoutesFromFile(entryFile);
  const out = [];

  for (const r of routes) {
    out.push({ method: r.method, path: joinPaths(prefix, r.path), file: path.relative(projectRoot, entryFile).replace(/\\/g, '/') });
  }

  for (const mount of mounts) {
    const resolved = resolveRequire(entryFile, mount.modulePath);
    if (!resolved) continue;
    const childPrefix = joinPaths(prefix, mount.mountPath);
    out.push(...collectAllRoutes(resolved, childPrefix));
  }

  return out;
}

function main() {
  // Dans ce projet: app.use('/api', routes) où routes = ./routes/index.routes
  // On fixe donc le préfixe /api et on parse index.routes.js et ses sous-mounts.
  const entry = path.join(routesDir, 'index.routes.js');
  if (!fs.existsSync(entry)) {
    throw new Error(`Fichier introuvable: ${entry}`);
  }

  const routes = collectAllRoutes(entry, '/api')
    .sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

  const payload = {
    generatedAt: new Date().toISOString(),
    basePath: '/api',
    count: routes.length,
    routes,
  };

  const outFile = path.join(projectRoot, 'routes.json');
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`OK: ${routes.length} routes exportées vers ${outFile}`);
}

main();
