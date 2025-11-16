Dotfiles for ~/.bashrc maintenance

Files created in this repo (you can copy them to your home):
- dotfiles/bashrc_clean -> recommended content for ~/.bashrc
- dotfiles/bashrc_local_template -> optional personal aliases (create at ~/.bashrc_local)

Important: I cannot write directly to your Windows home. Use the commands below in Git Bash / WSL to back up your current file and install the cleaned version.

1) Create a timestamped backup of your current ~/.bashrc

```bash
cp -v ~/.bashrc ~/.bashrc.backup.$(date +%Y%m%d%H%M%S)
ls -l ~/.bashrc.backup.*
```

2) Option A — Overwrite ~/.bashrc by copying the prepared file from repository (safer if you cloned the repo locally):

```bash
# From the repository root
cp -v ./dotfiles/bashrc_clean ~/.bashrc
```

3) Option B — Overwrite by pasting content directly (the here-doc method):

```bash
cat > ~/.bashrc <<'EOF'
# paste the content shown in dotfiles/bashrc_clean here
EOF
```

4) (Optional) Install the local template for personal aliases:

```bash
cp -v ./dotfiles/bashrc_local_template ~/.bashrc_local
# Edit it with your paths
nano ~/.bashrc_local
```

5) Apply the new configuration to the current shell session:

```bash
source ~/.bashrc
```

6) Verify PATH entries and aliases:

```bash
# show PATH split lines
echo "$PATH" | tr ':' '\n' | egrep "/e/Redis|AppData/Local/Yarn/bin" || true
# check aliases
alias | egrep "ydev|agw" || true
```

7) How to restore backup if something goes wrong:

```bash
# pick a backup file from the list and restore
cp -v ~/.bashrc.backup.20251115123456 ~/.bashrc
source ~/.bashrc
```

If you prefer, I can also generate a single shell script in the repo that will perform backup -> install -> source automatically — say the word and I will create it (I will not run it on your machine).