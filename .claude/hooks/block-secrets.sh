#!/usr/bin/env bash
# PreToolUse フック: 鍵の形をした文字列が、ファイルやコミットに入るのを止める(plan/001 手順4)。
# 「API キー」などの単語ではなく、実際の鍵の形だけに反応させる。exit 2 で止め、標準エラーの内容が Claude に返る。
set -euo pipefail

PATTERN='sb_secret_[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")

block() {
  echo "秘密の情報(API キー、秘密鍵、JWT)の形をした文字列が含まれているため止めました: $1" >&2
  echo "このリポジトリは公開されています。鍵は .env.local(git の管理外)に置き、コードからは環境変数で読んでください。" >&2
  exit 2
}

case "$tool" in
  Write|Edit)
    path=$(jq -r '.tool_input.file_path // ""' <<<"$input")
    case "$(basename "$path")" in .env*) exit 0 ;; esac
    text=$(jq -r '.tool_input.content // .tool_input.new_string // ""' <<<"$input")
    if grep -qE "$PATTERN" <<<"$text"; then block "$path"; fi
    ;;
  Bash)
    cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
    if [[ "$cmd" == *"git commit"* ]]; then
      if git -C "${CLAUDE_PROJECT_DIR:-.}" diff --cached -U0 | grep '^+' | grep -qE "$PATTERN"; then
        block "ステージ済みの変更"
      fi
    fi
    ;;
esac
exit 0
