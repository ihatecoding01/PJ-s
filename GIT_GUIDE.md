# Git Commands Cheatsheet & Guide

A step-by-step reference guide for daily Git operations: pulling, adding, committing, pushing, branching, and troubleshooting.

---

## 🚀 1. The Standard Daily Workflow

When working on a team project, follow this order to avoid conflicts:

```bash
# 1. Check current status
git status

# 2. Get latest changes from the team before making changes
git pull origin main

# 3. Make your code changes...

# 4. Check what you changed
git status
git diff

# 5. Stage your changes
git add .

# 6. Commit with a meaningful message
git commit -m "feat: describe what you built or changed"

# 7. Push to GitHub
git push origin main
```

---

## 📥 2. Pulling Changes (`git pull`, `git fetch`)

Use these commands to download the latest code from GitHub to your local machine.

| Command | What it does |
| :--- | :--- |
| `git pull` | Fetches and merges updates from the tracked remote branch into your current branch |
| `git pull origin main` | Explicitly pulls and merges updates from branch `main` on `origin` |
| `git fetch` | Downloads new commits from remote without merging them into your code |
| `git fetch origin` | Fetches all branches and tags from `origin` |
| `git pull --rebase origin main` | Pulls remote commits and puts your local commits cleanly on top (avoids merge commit spam) |

---

## ➕ 3. Staging / Adding Files (`git add`)

Before committing, you need to tell Git which files to include.

| Command | What it does |
| :--- | :--- |
| `git add .` | Stages **all** modified and new files in the current folder and subfolders |
| `git add -A` or `git add --all` | Stages all changes across the entire repository (including deletions) |
| `git add "PERSON2 DHRUV"` | Stages everything inside the `PERSON2 DHRUV` directory |
| `git add path/to/file.ts` | Stages only that specific file |
| `git reset <file>` | **Unstages** a file (keeps changes in working directory) |
| `git restore --staged <file>` | Modern way to unstage a staged file |

---

## 💾 4. Committing Changes (`git commit`)

Saves your staged snapshot into the local Git history.

| Command | What it does |
| :--- | :--- |
| `git commit -m "your message"` | Commits all staged changes with a single-line message |
| `git commit -am "your message"` | Adds and commits all modified tracked files in one command |
| `git commit --amend -m "new message"` | Updates the message of your very last commit (before pushing) |
| `git commit --amend --no-edit` | Adds forgotten staged files to the last commit without changing the message |

---

## 📤 5. Pushing Changes (`git push`)

Uploads your local commits to the remote repository (GitHub).

| Command | What it does |
| :--- | :--- |
| `git push` | Pushes current branch commits to its default tracked upstream branch |
| `git push origin main` | Pushes commits on the `main` branch to remote `origin` |
| `git push -u origin <branch-name>` | Pushes a new branch to remote and sets upstream tracking (`-u`) |
| `git push origin --all` | Pushes all local branches to the remote |
| `git push origin --tags` | Pushes all Git tags |

---

## 🌿 6. Branches (`git branch`, `git checkout`, `git switch`)

Isolate features, bug fixes, or individual person work onto separate branches.

| Command | What it does |
| :--- | :--- |
| `git branch` | Lists all local branches (* marks current branch) |
| `git branch -a` | Lists local and remote branches |
| `git branch <branch-name>` | Creates a new branch without switching to it |
| `git switch <branch-name>` | Switches to an existing branch |
| `git checkout -b <branch-name>` | Creates and immediately switches to a new branch |
| `git switch -c <branch-name>` | Modern syntax to create and switch to a branch |
| `git merge <branch-name>` | Merges specified branch into your currently checked-out branch |
| `git branch -d <branch-name>` | Deletes a local branch (if already merged) |
| `git branch -D <branch-name>` | Force deletes a local branch |

---

## 🔍 7. Viewing Status & History (`git status`, `git log`, `git diff`)

Inspect what has changed and the history of the repo.

| Command | What it does |
| :--- | :--- |
| `git status` | Shows staged, unstaged, and untracked files |
| `git status -s` | Shows a short, compact status summary |
| `git diff` | Shows line-by-line differences of unstaged changes |
| `git diff --staged` | Shows line-by-line differences of staged changes (what's about to be committed) |
| `git log` | Displays full commit history |
| `git log --oneline -n 10` | Shows the last 10 commits on single lines |
| `git log --graph --oneline --all` | Visual graph of all branches and commits |

---

## ⏪ 8. Stashing & Undoing (`git stash`, `git restore`, `git reset`)

Handle work-in-progress or discard unwanted changes.

| Command | What it does |
| :--- | :--- |
| `git stash` | Temporarily shelves modified files so you have a clean working directory |
| `git stash pop` | Restores the shelved changes and removes them from the stash list |
| `git stash list` | Lists all stashed entries |
| `git restore <file>` | Discards local uncommitted changes to a file (reverts to last commit) |
| `git restore .` | Discards all uncommitted changes across the entire workspace |
| `git reset --soft HEAD~1` | Undoes the last commit but **keeps** your changes staged |
| `git reset --mixed HEAD~1` | Undoes the last commit and leaves changes unstaged |
| `git reset --hard HEAD~1` | ⚠️ Undoes the last commit and **destroys** all changes |

---

## 🤝 9. Common Team Scenarios

### Scenario A: Team member pushed new code while you were working
```powershell
# 1. Stash your uncommitted work
git stash

# 2. Pull remote updates
git pull origin main

# 3. Re-apply your work
git stash pop

# 4. Resolve any conflicts if needed, then commit and push
git add .
git commit -m "feat: updated my feature"
git push origin main
```

### Scenario B: Working specifically on Person 2 folder
```powershell
# Check what changed in Person 2
git status

# Stage only Person 2 folder
git add "PERSON2 DHRUV"

# Commit
git commit -m "feat(person2): implement feature update"

# Push to main
git push origin main
```
