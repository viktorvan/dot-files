"""Apply only to a temporary home. Never source the interactive configuration."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
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
            self.assertNotIn(path.name, forbidden_names)
            self.assertFalse(path.name.startswith(("run_", "run_once_", "run_onchange_")), str(relative))
            self.assertNotIn("node_modules", relative.parts)
            self.assertFalse(any(part.startswith("dot_ssh") for part in relative.parts))
            self.assertNotIn(path.suffix, {".db", ".sqlite", ".pfx", ".pem", ".zwc"})

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
            self.assertTrue((home / ".config/nvim/lazy-lock.json").is_file())
            self.assertTrue((home / ".tmux.conf").is_file())
            self.assertFalse((home / "README.md").exists())
            self.assertFalse((home / "tests").exists())


if __name__ == "__main__":
    unittest.main()
