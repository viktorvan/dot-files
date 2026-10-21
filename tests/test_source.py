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
        forbidden_names = {"auth.json", "account.json", "hosts.yml", "service.json", ".DS_Store"}
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

    def test_personal_config_is_parseable(self):
        config = json.loads((ROOT / "home/private_dot_config/opencode/opencode.json").read_text())
        self.assertEqual(config["$schema"], "https://opencode.ai/config.json")
        self.assertEqual(config["default_agent"], "build")
        servers = config["mcp"]["servers"]
        self.assertEqual(servers["context7"]["headers"]["CONTEXT7_API_KEY"], "{env:CONTEXT7_API_KEY}")
        self.assertIn("ES_API_KEY", servers["elastic"]["command"])
        cli = json.loads((ROOT / "home/private_dot_config/opencode/private_cli.json").read_text())
        self.assertEqual(cli["$schema"], "https://opencode.ai/v2/cli.json")

    def test_zsh_syntax(self):
        if not shutil.which("zsh"):
            self.skipTest("zsh not installed")
        for name in ("dot_zshrc", "dot_zshenv", "dot_zimrc"):
            result = subprocess.run(["zsh", "-n", str(ROOT / "home" / name)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    @unittest.skipUnless(CHEZMOI, "Set CHEZMOI to a chezmoi executable for isolated apply tests")
    def test_platform_templates_and_retired_plugins(self):
        for platform, arch in (("darwin", "arm64"), ("linux", "amd64")):
            with self.subTest(platform=platform), tempfile.TemporaryDirectory(dir="/tmp/opencode") as temporary:
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
                agents = home / ".config/opencode/agents"
                self.assertEqual({path.stem for path in agents.glob("*.md")}, {"captain", "pilot", "xo"})
                self.assertFalse((home / ".config/opencode/tui.json").exists())
                self.assertTrue((home / ".config/opencode/commands/quick-fix.md").is_file())
                for skill in ("plot-trajectory", "schedule-burn", "test-audit"):
                    self.assertTrue((home / ".config/opencode/skill" / skill / "SKILL.md").is_file())
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
                    self.assertFalse((home / ".config/orbit").exists())
                    self.assertNotIn("osc52", options)
                    self.assertIn('vim.opt.clipboard = "unnamedplus"', options)
                    self.assertEqual(herdr["theme"]["name"], "catppuccin-latte")
                    self.assertEqual(len(herdr["keys"]["command"]), 9)
                    self.assertIn("/opt/homebrew/bin", tmux)
                    self.assertIn("terminal_sync = True", btop)
                    lazygit = home / "Library/Application Support/lazygit/config.yml"
                    self.assertEqual((home / "Library").stat().st_mode & 0o777, 0o700)
                    self.assertEqual((home / "Library/Application Support").stat().st_mode & 0o777, 0o700)
                    self.assertFalse((home / ".config/lazygit/config.yml").exists())
                    self.assertIn("pbcopy", lazygit.read_text())
                else:
                    orbit = tomllib.loads((home / ".config/orbit/config.toml").read_text())
                    self.assertEqual(orbit["database"]["path"], str(home / ".local/share/orbit/orbit-v2.db"))
                    self.assertEqual(orbit["waypoints"]["sequence"],
                                     ["refinement", "spike", "implementation", "review"])
                    self.assertTrue(herdr["ui"]["confirm_close"])
                    pr_command = next(item["command"] for item in herdr["keys"]["command"]
                                      if item["key"] == "prefix+alt+p")
                    self.assertIn("gh pr list", pr_command)
                    self.assertIn('require("vim.ui.clipboard.osc52")', options)
                    self.assertNotIn("theme", herdr)
                    self.assertEqual(len(herdr["keys"]["command"]), 10)
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
        with tempfile.TemporaryDirectory(dir="/tmp/opencode") as temporary:
            root = Path(temporary)
            home = root / "home"
            home.mkdir()
            (home / ".config/gh").mkdir(parents=True)
            unmanaged = home / ".config/gh/hosts.yml"
            unmanaged.write_text("test fixture, not a credential\n")
            (home / ".config/opencode/agents").mkdir(parents=True)
            unmanaged_agent = home / ".config/opencode/agents/local-fixture.md"
            unmanaged_agent.write_text("Unmanaged local agent fixture\n")
            service = home / ".config/opencode/service.json"
            service.write_text('{"password": "test-fixture-not-a-credential"}\n')
            (home / ".codex").mkdir()
            codex_auth = home / ".codex/auth.json"
            codex_auth.write_text('{"fixture": true}\n')
            codex_config = home / ".codex/config.toml"
            codex_config.write_text('model = "local-fixture"\n')
            codex_hooks = home / ".codex/hooks.json"
            codex_hooks.write_text('{"hooks": {}}\n')
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
            self.assertEqual(unmanaged_agent.read_text(), "Unmanaged local agent fixture\n")
            self.assertEqual(service.read_text(), '{"password": "test-fixture-not-a-credential"}\n')
            self.assertEqual(codex_auth.read_text(), '{"fixture": true}\n')
            self.assertEqual(codex_config.read_text(), 'model = "local-fixture"\n')
            self.assertEqual(codex_hooks.read_text(), '{"hooks": {}}\n')
            self.assertTrue(os.access(home / "developer/utils/start_backend.sh", os.X_OK))
            self.assertTrue((home / "developer/utils/remove_scratch_file.sh").is_file())
            self.assertTrue((home / ".config/opencode/skill/medoma-platform/SKILL.md").is_file())
            self.assertTrue((home / ".config/opencode/skill/schedule-burn/SKILL.md").is_file())
            self.assertFalse((home / ".config/opencode/package-lock.json").exists())
            self.assertTrue((home / ".config/nvim/lazy-lock.json").is_file())
            self.assertTrue((home / ".tmux.conf").is_file())
            self.assertFalse((home / "README.md").exists())
            self.assertFalse((home / "tests").exists())


if __name__ == "__main__":
    unittest.main()
