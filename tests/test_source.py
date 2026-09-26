"""Apply only to a temporary home. Never source the interactive configuration."""
import os
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[1]
CHEZMOI = os.environ.get("CHEZMOI") or shutil.which("chezmoi")


class SourceTests(unittest.TestCase):
    def test_no_application_state_or_install_hooks(self):
        source = ROOT / "home"
        forbidden_names = {"auth.json", "account.json", "hosts.yml", ".DS_Store"}
        for path in source.rglob("*"):
            relative = path.relative_to(source)
            self.assertFalse(path.is_symlink(), str(relative))
            name = path.name
            while name.startswith(("private_", "readonly_", "executable_", "literal_")):
                name = name.split("_", 1)[1]
            self.assertNotIn(name.removesuffix(".tmpl"), forbidden_names)
            self.assertFalse(path.name.startswith(("run_", "run_once_", "run_onchange_")), str(relative))
            self.assertNotIn("node_modules", relative.parts)
            self.assertFalse(any(part.startswith("dot_ssh") for part in relative.parts))
            self.assertNotIn(path.suffix, {".db", ".sqlite", ".pfx", ".pem", ".zwc", ".pdf"})

    def test_orbit_definitions_have_one_owner(self):
        config = ROOT / "home/dot_config/opencode"
        for name in ("captain", "pilot", "pilot-gemini", "xo"):
            self.assertFalse((config / "agents" / f"{name}.md").exists())
        for name in ("schedule-burn", "plot-trajectory", "test-audit"):
            self.assertFalse((config / "skill" / name).exists())
        self.assertFalse((ROOT / "home/dot_config/orbit").exists())

    def test_personal_config_is_parseable(self):
        config = json.loads((ROOT / "home/dot_config/opencode/opencode.json").read_text())
        self.assertEqual(config["$schema"], "https://opencode.ai/config.json")
        self.assertEqual(config["mcp"]["context7"]["headers"]["CONTEXT7_API_KEY"], "{env:CONTEXT7_API_KEY}")
        self.assertIn("ES_API_KEY", config["mcp"]["elastic"]["command"])
        json.loads((ROOT / "home/dot_config/opencode/tui.json").read_text())
        json.loads((ROOT / "home/dot_codex/hooks.json").read_text())

    def test_zsh_syntax(self):
        if not shutil.which("zsh"):
            self.skipTest("zsh not installed")
        for name in ("dot_zshrc", "dot_zshenv", "dot_zimrc"):
            result = subprocess.run(["zsh", "-n", str(ROOT / "home" / name)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    @unittest.skipUnless(CHEZMOI, "Set CHEZMOI to a chezmoi executable for isolated apply tests")
    def test_isolated_apply_is_idempotent_and_preserves_unmanaged_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            home = root / "home"
            home.mkdir()
            (home / ".config/gh").mkdir(parents=True)
            unmanaged = home / ".config/gh/hosts.yml"
            unmanaged.write_text("test fixture, not a credential\n")
            (home / ".config/opencode/agents").mkdir(parents=True)
            orbit_agent = home / ".config/opencode/agents/captain.md"
            orbit_agent.write_text("Orbit installer owns this fixture\n")
            (home / ".codex").mkdir()
            codex_auth = home / ".codex/auth.json"
            codex_auth.write_text('{"fixture": true}\n')
            environment = dict(os.environ, HOME=str(home), XDG_CONFIG_HOME=str(root / "config"),
                               XDG_CACHE_HOME=str(root / "cache"), XDG_DATA_HOME=str(root / "data"))
            command = [str(CHEZMOI), "--source", str(ROOT), "--destination", str(home),
                       "--persistent-state", str(root / "chezmoi-state.boltdb"),
                       "--cache", str(root / "chezmoi-cache"), "--config", str(root / "chezmoi.toml"),
                       "--no-tty"]
            result = subprocess.run(command + ["--dry-run", "apply"], capture_output=True, text=True, env=environment)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((home / ".zshrc").exists())
            for _ in range(2):
                result = subprocess.run(command + ["apply"], capture_output=True, text=True, env=environment)
                self.assertEqual(result.returncode, 0, result.stderr)
            result = subprocess.run(command + ["verify"], capture_output=True, text=True, env=environment)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(unmanaged.read_text(), "test fixture, not a credential\n")
            self.assertEqual(orbit_agent.read_text(), "Orbit installer owns this fixture\n")
            self.assertEqual(codex_auth.read_text(), '{"fixture": true}\n')
            codex_config = tomllib.loads((home / ".codex/config.toml").read_text())
            self.assertIn(str(home), codex_config["projects"])
            self.assertIn(str(home / "developer/api/main"), codex_config["projects"])
            self.assertEqual((home / ".codex/config.toml").stat().st_mode & 0o777, 0o600)
            self.assertTrue(os.access(home / "developer/utils/start_backend.sh", os.X_OK))
            self.assertTrue((home / "developer/utils/remove_scratch_file.sh").is_file())
            self.assertTrue((home / ".config/opencode/skill/medoma-platform/SKILL.md").is_file())
            self.assertFalse((home / ".config/opencode/skill/schedule-burn").exists())
            self.assertFalse((home / ".config/opencode/package-lock.json").exists())
            self.assertTrue((home / ".config/nvim/lazy-lock.json").is_file())
            self.assertTrue((home / ".tmux.conf").is_file())
            self.assertFalse((home / "README.md").exists())
            self.assertFalse((home / "tests").exists())


if __name__ == "__main__":
    unittest.main()
