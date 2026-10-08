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
        config = ROOT / "home/private_dot_config/opencode"
        for name in ("captain", "pilot", "pilot-gemini", "xo"):
            self.assertFalse((config / "agents" / f"{name}.md").exists())
        for name in ("schedule-burn", "plot-trajectory", "test-audit"):
            self.assertFalse((config / "skill" / name).exists())
        self.assertFalse((ROOT / "home/private_dot_config/orbit").exists())

    def test_personal_config_is_parseable(self):
        config = json.loads((ROOT / "home/private_dot_config/opencode/opencode.json").read_text())
        self.assertEqual(config["$schema"], "https://opencode.ai/config.json")
        self.assertEqual(config["mcp"]["context7"]["headers"]["CONTEXT7_API_KEY"], "{env:CONTEXT7_API_KEY}")
        self.assertIn("ES_API_KEY", config["mcp"]["elastic"]["command"])
        json.loads((ROOT / "home/private_dot_config/opencode/tui.json").read_text())
        json.loads((ROOT / "home/dot_codex/hooks.json").read_text())

    def test_zsh_syntax(self):
        if not shutil.which("zsh"):
            self.skipTest("zsh not installed")
        for name in ("dot_zshrc", "dot_zshenv", "dot_zimrc"):
            result = subprocess.run(["zsh", "-n", str(ROOT / "home" / name)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    @unittest.skipUnless(CHEZMOI, "Set CHEZMOI to a chezmoi executable for isolated apply tests")
    def test_platform_templates_and_retired_plugins(self):
        for platform, arch in (("darwin", "arm64"), ("linux", "amd64")):
            with self.subTest(platform=platform), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                home = root / "home"
                retired = home / ".config/nvim/lua/plugins/scratch.lua"
                retired.parent.mkdir(parents=True)
                retired.write_text("return {}\n")
                command = [str(CHEZMOI), "--source", str(ROOT), "--destination", str(home),
                           "--persistent-state", str(root / "state.boltdb"),
                           "--cache", str(root / "cache"), "--config", str(root / "config.toml"),
                           "--override-data", json.dumps({"chezmoi": {"os": platform, "arch": arch,
                                                                     "homeDir": str(home)}}),
                           "--no-tty", "apply"]
                result = subprocess.run(command, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertFalse(retired.exists())
                self.assertEqual((home / ".config").stat().st_mode & 0o777, 0o700)
                self.assertEqual((home / ".config/gh").stat().st_mode & 0o777, 0o700)
                options = (home / ".config/nvim/lua/config/options.lua").read_text()
                herdr = tomllib.loads((home / ".config/herdr/config.toml").read_text())
                self.assertTrue(os.access(home / ".config/herdr/navigate.sh", os.X_OK))
                tmux = (home / ".tmux.conf").read_text()
                navigator = (home / ".config/nvim/lua/plugins/vim-tmux-navigator.lua").read_text()
                for key in ("M-m", "M-n", "M-e", "M-i"):
                    self.assertIn(f"bind-key -n {key} run", tmux)
                    self.assertIn(f"bind-key -T copy-mode-vi {key} select-pane", tmux)
                    self.assertIn(f'"<{key}>"', navigator)
                btop = (home / ".config/btop/btop.conf").read_text()
                self.assertIn('shown_boxes = "cpu mem proc"', btop)
                if platform == "darwin":
                    self.assertNotIn("osc52", options)
                    self.assertIn('vim.opt.clipboard = "unnamedplus"', options)
                    self.assertEqual(herdr["theme"]["name"], "catppuccin-latte")
                    self.assertEqual(len(herdr["keys"]["command"]), 8)
                    self.assertIn("/opt/homebrew/bin", tmux)
                    self.assertIn("terminal_sync = True", btop)
                    lazygit = home / "Library/Application Support/lazygit/config.yml"
                    self.assertEqual((home / "Library").stat().st_mode & 0o777, 0o700)
                    self.assertEqual((home / "Library/Application Support").stat().st_mode & 0o777, 0o700)
                    self.assertFalse((home / ".config/lazygit/config.yml").exists())
                    self.assertIn("pbcopy", lazygit.read_text())
                else:
                    self.assertIn('require("vim.ui.clipboard.osc52")', options)
                    self.assertNotIn("theme", herdr)
                    self.assertEqual(len(herdr["keys"]["command"]), 6)
                    self.assertNotIn("/opt/homebrew", tmux)
                    self.assertIn(str(home / ".local/bin"), tmux)
                    self.assertNotIn("terminal_sync", btop)
                    lazygit = home / ".config/lazygit/config.yml"
                    self.assertFalse((home / "Library").exists())
                    self.assertNotIn("pbcopy", lazygit.read_text())
                self.assertIn("{{text}}", lazygit.read_text())
                self.assertNotIn("base64 -w", lazygit.read_text())
                lock = json.loads((home / ".config/nvim/lazy-lock.json").read_text())
                for plugin in ("codecompanion.nvim", "scratch.nvim", "zen-mode.nvim", "op.nvim", "supermaven-nvim"):
                    self.assertNotIn(plugin, lock)

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
