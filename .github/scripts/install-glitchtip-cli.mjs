import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const VERSION = "1.0.0";
const CRATE_URL = `https://static.crates.io/crates/glitchtip-cli/glitchtip-cli-${VERSION}.crate`;
const CRATE_SHA256 = "8ca61cf0817e85ccedb6c378e725e896dbf76d18bfa89fd1476f38c6bb882906";
const PATCH_PATH = fileURLToPath(
  new URL("../patches/glitchtip-cli-1.0.0-chunk-upload.patch", import.meta.url),
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

const workspace = await mkdtemp(join(tmpdir(), "glitchtip-cli-"));

try {
  const response = await fetch(CRATE_URL, {
    headers: { "user-agent": "VoiceTypr release workflow" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${CRATE_URL}: HTTP ${response.status}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  const actualSha256 = createHash("sha256").update(archive).digest("hex");
  if (actualSha256 !== CRATE_SHA256) {
    throw new Error(
      `glitchtip-cli crate checksum mismatch: expected ${CRATE_SHA256}, got ${actualSha256}`,
    );
  }

  const archivePath = join(workspace, `glitchtip-cli-${VERSION}.crate`);
  await writeFile(archivePath, archive);
  run("tar", ["-xzf", archivePath, "-C", workspace], workspace);

  const sourcePath = join(workspace, `glitchtip-cli-${VERSION}`);
  run("git", ["apply", "--check", PATCH_PATH], sourcePath);
  run("git", ["apply", PATCH_PATH], sourcePath);
  run("cargo", ["install", "--path", sourcePath, "--locked", "--force"], sourcePath);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
