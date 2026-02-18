import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const certDir = path.join(root, 'certs');
const certFile = path.join(certDir, 'localhost.pem');
const keyFile = path.join(certDir, 'localhost-key.pem');
const force = process.argv.includes('--force');

function log(msg) {
  process.stdout.write(msg + '\n');
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  return r.status === 0;
}

function ensureDir() {
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
}

function alreadyOk() {
  return fs.existsSync(certFile) && fs.existsSync(keyFile);
}

function hasCommand(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

function looksLikeMkcertCert() {
  if (!fs.existsSync(certFile)) return false;
  if (!hasCommand('openssl')) return false;
  const r = spawnSync('openssl', ['x509', '-in', certFile, '-noout', '-issuer'], { encoding: 'utf8' });
  const out = String(r.stdout || '');
  return /mkcert/i.test(out);
}

function tryMkcert() {
  if (!hasCommand('mkcert')) return false;
  log('✓ mkcert encontrado. A gerar certificados...');
  ensureDir();
  // Instala a CA local (pode pedir password dependendo do sistema).
  // Sem isto, o browser vai avisar "Not Secure" (cert não confiável).
  run('mkcert', ['-install']);
  return run('mkcert', [
    '-key-file',
    keyFile,
    '-cert-file',
    certFile,
    'localhost',
    '127.0.0.1',
    '::1',
  ]);
}

function tryOpenSSL() {
  if (!hasCommand('openssl')) return false;
  log('✓ openssl encontrado. A gerar certificado self-signed (dev)...');
  ensureDir();

  const cnf = path.join(certDir, 'openssl.localhost.cnf');
  const conf = `
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
IP.1  = 127.0.0.1
IP.2  = ::1
`.trimStart();

  fs.writeFileSync(cnf, conf, 'utf8');

  return run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '365',
    '-keyout',
    keyFile,
    '-out',
    certFile,
    '-config',
    cnf,
  ]);
}

if (alreadyOk() && !force) {
  if (hasCommand('mkcert') && !looksLikeMkcertCert()) {
    log('ℹ️  Certificados HTTPS já existem em ./certs/, mas não parecem ser do mkcert.');
    log('   Para regenerar com mkcert:');
    log('   - rm -rf certs/');
    log('   - node scripts/ensure-https.mjs --force');
    process.exit(0);
  }

  if (!hasCommand('mkcert') && !looksLikeMkcertCert()) {
    log('ℹ️  Certificados HTTPS já existem em ./certs/, mas parecem ser self-signed.');
    log('   Isso pode causar aviso de "Not secure" no browser.');
    log('   Para usar mkcert (recomendado), instala mkcert e regenera:');
    log('   - sudo apt install -y mkcert libnss3-tools && mkcert -install');
    log('   - rm -rf certs/');
    log('   - npm run dev:https');
    process.exit(0);
  }

  log('✓ HTTPS certs já existem em ./certs/');
  process.exit(0);
}

log('ℹ️  A preparar HTTPS local para o Vite…');

if (tryMkcert()) {
  log('✓ Certificados gerados com mkcert.');
  process.exit(0);
}

if (tryOpenSSL()) {
  log('✓ Certificados gerados com openssl.');
  log('ℹ️  Nota: alguns browsers podem mostrar aviso de certificado (self-signed). mkcert é recomendado.');
  process.exit(0);
}

log('\n✗ Não foi possível gerar certificados HTTPS automaticamente.');
log('Instala uma das opções e tenta de novo:');
log('- mkcert (recomendado)  → https://github.com/FiloSottile/mkcert');
log('- openssl (fallback)    → via pacotes do sistema');
log('\nDica (Debian/Ubuntu):');
log('  sudo apt update');
log('  sudo apt install -y mkcert libnss3-tools');
log('  mkcert -install');
process.exit(1);

